import React, { useState, useEffect } from 'react';
import { useStore, PresetRoute } from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Trash2, MapPin, Home, Building, Search } from 'lucide-react';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { toast } from 'sonner';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];

export default function Settings() {
  const { currentUser, updateUserSettings } = useStore();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [homeAddress, setHomeAddress] = useState(currentUser?.homeAddress || '');
  const [officeAddress, setOfficeAddress] = useState(currentUser?.officeAddress || '');
  const [presetRoutes, setPresetRoutes] = useState<PresetRoute[]>(currentUser?.presetRoutes || []);
  
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteOrigin, setNewRouteOrigin] = useState('');
  const [newRouteDestination, setNewRouteDestination] = useState('');
  const [newRouteDistance, setNewRouteDistance] = useState('');

  // Autocomplete instances
  const [homeAutocomplete, setHomeAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [officeAutocomplete, setOfficeAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [originAutocomplete, setOriginAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [destAutocomplete, setDestAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Location Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'home' | 'office' | 'origin' | 'destination' | null>(null);

  const [originLatLng, setOriginLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (originLatLng && destLatLng && window.google) {
      const service = new google.maps.DirectionsService();
      service.route(
        {
          origin: originLatLng,
          destination: destLatLng,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const distanceInMeters = result.routes[0].legs[0].distance?.value || 0;
            setNewRouteDistance((distanceInMeters / 1000).toFixed(1));
          }
        }
      );
    }
  }, [originLatLng, destLatLng]);

  if (!currentUser) return null;

  const handleSaveAddresses = () => {
    updateUserSettings(currentUser.id, { homeAddress, officeAddress });
    toast.success('บันทึกที่อยู่สำเร็จ');
  };

  const handleAddRoute = () => {
    if (!newRouteName || !newRouteOrigin || !newRouteDestination || !newRouteDistance) return;
    
    const newRoute: PresetRoute = {
      id: `pr_${Date.now()}`,
      name: newRouteName,
      origin: newRouteOrigin,
      destination: newRouteDestination,
      distance: parseFloat(newRouteDistance)
    };
    
    const updatedRoutes = [...presetRoutes, newRoute];
    setPresetRoutes(updatedRoutes);
    updateUserSettings(currentUser.id, { presetRoutes: updatedRoutes });
    
    setNewRouteName('');
    setNewRouteOrigin('');
    setNewRouteDestination('');
    setNewRouteDistance('');
    setOriginLatLng(null);
    setDestLatLng(null);
    toast.success('เพิ่มเส้นทางประจำสำเร็จ');
  };

  const handleRemoveRoute = (id: string) => {
    const updatedRoutes = presetRoutes.filter(r => r.id !== id);
    setPresetRoutes(updatedRoutes);
    updateUserSettings(currentUser.id, { presetRoutes: updatedRoutes });
  };

  const openPicker = (target: 'home' | 'office' | 'origin' | 'destination') => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handleLocationConfirm = (address: string, latLng: { lat: number; lng: number }) => {
    if (pickerTarget === 'home') setHomeAddress(address);
    if (pickerTarget === 'office') setOfficeAddress(address);
    if (pickerTarget === 'origin') {
      setNewRouteOrigin(address);
      setOriginLatLng(latLng);
    }
    if (pickerTarget === 'destination') {
      setNewRouteDestination(address);
      setDestLatLng(latLng);
    }
  };

  const getInitialAddressForPicker = () => {
    if (pickerTarget === 'home') return homeAddress;
    if (pickerTarget === 'office') return officeAddress;
    if (pickerTarget === 'origin') return newRouteOrigin;
    if (pickerTarget === 'destination') return newRouteDestination;
    return '';
  };

  const onHomePlaceChanged = () => {
    if (homeAutocomplete !== null) {
      const place = homeAutocomplete.getPlace();
      if (place.formatted_address) setHomeAddress(place.formatted_address);
      else if (place.name) setHomeAddress(place.name);
    }
  };

  const onOfficePlaceChanged = () => {
    if (officeAutocomplete !== null) {
      const place = officeAutocomplete.getPlace();
      if (place.formatted_address) setOfficeAddress(place.formatted_address);
      else if (place.name) setOfficeAddress(place.name);
    }
  };

  const onOriginPlaceChanged = () => {
    if (originAutocomplete !== null) {
      const place = originAutocomplete.getPlace();
      if (place.formatted_address) setNewRouteOrigin(place.formatted_address);
      else if (place.name) setNewRouteOrigin(place.name);
      
      if (place.geometry?.location) {
        setOriginLatLng({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    }
  };

  const onDestPlaceChanged = () => {
    if (destAutocomplete !== null) {
      const place = destAutocomplete.getPlace();
      if (place.formatted_address) setNewRouteDestination(place.formatted_address);
      else if (place.name) setNewRouteDestination(place.name);
      
      if (place.geometry?.location) {
        setDestLatLng({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">ตั้งค่าส่วนตัว (Settings)</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> ที่อยู่ประจำ</CardTitle>
          <CardDescription>ตั้งค่าที่อยู่บ้านและที่ทำงานเพื่อใช้เป็นค่าเริ่มต้นในการเบิกค่าเดินทาง</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Home className="w-4 h-4" /> ที่อยู่บ้าน</Label>
            <div className="flex gap-2">
              {isLoaded ? (
                <Autocomplete
                  onLoad={setHomeAutocomplete}
                  onPlaceChanged={onHomePlaceChanged}
                  className="flex-1"
                >
                  <Input 
                    value={homeAddress} 
                    onChange={e => setHomeAddress(e.target.value)} 
                    placeholder="เช่น บ้าน — ลาดพร้าว 71 กรุงเทพฯ" 
                    className="w-full"
                  />
                </Autocomplete>
              ) : (
                <Input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="กำลังโหลด..." disabled />
              )}
              <Button variant="outline" size="icon" onClick={() => openPicker('home')}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Building className="w-4 h-4" /> ที่อยู่ที่ทำงาน</Label>
            <div className="flex gap-2">
              {isLoaded ? (
                <Autocomplete
                  onLoad={setOfficeAutocomplete}
                  onPlaceChanged={onOfficePlaceChanged}
                  className="flex-1"
                >
                  <Input 
                    value={officeAddress} 
                    onChange={e => setOfficeAddress(e.target.value)} 
                    placeholder="เช่น สำนักงานใหญ่" 
                    className="w-full"
                  />
                </Autocomplete>
              ) : (
                <Input value={officeAddress} onChange={e => setOfficeAddress(e.target.value)} placeholder="กำลังโหลด..." disabled />
              )}
              <Button variant="outline" size="icon" onClick={() => openPicker('office')}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button onClick={handleSaveAddresses}>บันทึกที่อยู่</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>เส้นทางประจำ (Preset Routes)</CardTitle>
          <CardDescription>บันทึกเส้นทางที่เดินทางบ่อย เพื่อความรวดเร็วในการเบิกและไม่ต้องคำนวณระยะทางใหม่</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* List existing routes */}
          <div className="space-y-3">
            {presetRoutes.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีเส้นทางประจำ</p>
            ) : (
              presetRoutes.map(route => (
                <div key={route.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{route.name}</p>
                    <p className="text-sm text-muted-foreground">{route.origin} → {route.destination}</p>
                    <p className="text-sm font-medium text-blue-600">{route.distance} กม.</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRoute(route.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add new route form */}
          <div className="p-4 border rounded-md bg-muted/30 space-y-4">
            <h3 className="font-medium">เพิ่มเส้นทางใหม่</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ชื่อเส้นทาง</Label>
                <Input value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="เช่น บ้านไปหาลูกค้า A" />
              </div>
              <div className="space-y-2">
                <Label>ระยะทาง (กม.)</Label>
                <Input type="number" value={newRouteDistance} onChange={e => setNewRouteDistance(e.target.value)} placeholder="0.0" disabled />
                <p className="text-xs text-muted-foreground">คำนวณอัตโนมัติจาก Google Maps</p>
              </div>
              <div className="space-y-2">
                <Label>ต้นทาง</Label>
                <div className="flex gap-2">
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={setOriginAutocomplete}
                      onPlaceChanged={onOriginPlaceChanged}
                      className="flex-1"
                    >
                      <Input 
                        value={newRouteOrigin} 
                        onChange={e => setNewRouteOrigin(e.target.value)} 
                        placeholder="ระบุต้นทาง" 
                        className="w-full"
                      />
                    </Autocomplete>
                  ) : (
                    <Input value={newRouteOrigin} onChange={e => setNewRouteOrigin(e.target.value)} placeholder="กำลังโหลด..." disabled />
                  )}
                  <Button variant="outline" size="icon" onClick={() => openPicker('origin')}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>ปลายทาง</Label>
                <div className="flex gap-2">
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={setDestAutocomplete}
                      onPlaceChanged={onDestPlaceChanged}
                      className="flex-1"
                    >
                      <Input 
                        value={newRouteDestination} 
                        onChange={e => setNewRouteDestination(e.target.value)} 
                        placeholder="ระบุปลายทาง" 
                        className="w-full"
                      />
                    </Autocomplete>
                  ) : (
                    <Input value={newRouteDestination} onChange={e => setNewRouteDestination(e.target.value)} placeholder="กำลังโหลด..." disabled />
                  )}
                  <Button variant="outline" size="icon" onClick={() => openPicker('destination')}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <Button onClick={handleAddRoute} className="w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" /> เพิ่มเส้นทาง
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {pickerOpen && (
        <LocationPickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onConfirm={handleLocationConfirm}
          initialAddress={getInitialAddressForPicker()}
        />
      )}
    </div>
  );
}
