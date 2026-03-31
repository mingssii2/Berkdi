import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Autocomplete, DirectionsRenderer } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, MapPin, Navigation, ArrowRight, CheckCircle2 } from 'lucide-react';

const libraries: ("places")[] = ["places"];
const defaultCenter = { lat: 13.7563, lng: 100.5018 }; // Bangkok

interface RoutePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (route: { origin: string; destination: string; distance: number }) => void;
  initialOrigin?: string;
  initialDestination?: string;
}

type Step = 'origin' | 'destination' | 'preview';

export function RoutePickerModal({ isOpen, onClose, onConfirm, initialOrigin, initialDestination }: RoutePickerModalProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [step, setStep] = useState<Step>('origin');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  
  const [origin, setOrigin] = useState(initialOrigin || '');
  const [originLatLng, setOriginLatLng] = useState<{lat: number, lng: number} | null>(null);
  
  const [destination, setDestination] = useState(initialDestination || '');
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);

  const [distance, setDistance] = useState<number>(0);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const isProgrammaticPan = useRef(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('origin');
      setDirections(null);
      setDistance(0);
      // If we had initial values, we keep them, but we might need to geocode them if we want to show them on map.
      // For simplicity, we start fresh or from Bangkok if no latlng.
    }
  }, [isOpen]);

  const onLoadMap = useCallback((map: google.maps.Map) => {
    setMap(map);
    if (navigator.geolocation && !originLatLng) {
      navigator.geolocation.getCurrentPosition((position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        isProgrammaticPan.current = true;
        map.panTo(pos);
        map.setZoom(15);
      });
    }
  }, [originLatLng]);

  const onUnmountMap = useCallback(() => {
    setMap(null);
  }, []);

  const onLoadAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || '';
        
        isProgrammaticPan.current = true;
        map?.panTo({ lat, lng });
        map?.setZoom(16);

        if (step === 'origin') {
          setOrigin(address);
          setOriginLatLng({ lat, lng });
        } else if (step === 'destination') {
          setDestination(address);
          setDestLatLng({ lat, lng });
        }
      }
    }
  };

  const onMapIdle = useCallback(() => {
    if (!map || step === 'preview') return;
    
    if (isProgrammaticPan.current) {
      isProgrammaticPan.current = false;
      return;
    }

    const center = map.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address;
        if (step === 'origin') {
          setOrigin(address);
          setOriginLatLng({ lat, lng });
        } else if (step === 'destination') {
          setDestination(address);
          setDestLatLng({ lat, lng });
        }
      }
    });
  }, [map, step]);

  const calculateRoute = () => {
    if (!originLatLng || !destLatLng) return;
    
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: originLatLng,
        destination: destLatLng,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          const distanceInMeters = result.routes[0].legs[0].distance?.value || 0;
          setDistance(distanceInMeters / 1000);
          setStep('preview');
        }
      }
    );
  };

  const handleNextStep = () => {
    if (step === 'origin') {
      setStep('destination');
      // Optionally pan map slightly to indicate change, or keep it.
    } else if (step === 'destination') {
      calculateRoute();
    } else if (step === 'preview') {
      onConfirm({ origin, destination, distance });
      onClose();
    }
  };

  const handleBack = () => {
    if (step === 'destination') setStep('origin');
    if (step === 'preview') {
      setStep('destination');
      setDirections(null);
      if (destLatLng) {
        isProgrammaticPan.current = true;
        map?.panTo(destLatLng);
        map?.setZoom(16);
      }
    }
  };

  if (!isLoaded) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0 overflow-hidden rounded-[24px]">
        <DialogHeader className="p-5 pb-3 bg-white z-20 shadow-sm">
          <DialogTitle className="text-xl font-bold text-slate-800">
            {step === 'origin' && 'ระบุจุดรับ (ต้นทาง)'}
            {step === 'destination' && 'ระบุจุดส่ง (ปลายทาง)'}
            {step === 'preview' && 'สรุปเส้นทาง'}
          </DialogTitle>
          
          {step !== 'preview' && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-20" />
              <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
                <Input 
                  placeholder={step === 'origin' ? "ค้นหาต้นทาง..." : "ค้นหาปลายทาง..."}
                  className="pl-10 h-12 rounded-xl bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base relative z-10"
                  value={step === 'origin' ? origin : destination}
                  onChange={(e) => step === 'origin' ? setOrigin(e.target.value) : setDestination(e.target.value)}
                />
              </Autocomplete>
            </div>
          )}
        </DialogHeader>
        
        <div className="flex-1 relative bg-[#e5e3df]">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={defaultCenter}
            zoom={15}
            onLoad={onLoadMap}
            onUnmount={onUnmountMap}
            onIdle={onMapIdle}
            options={{ 
              disableDefaultUI: true, 
              zoomControl: false,
              gestureHandling: step === 'preview' ? 'greedy' : 'auto'
            }}
          >
            {step === 'preview' && directions && (
              <DirectionsRenderer 
                directions={directions} 
                options={{
                  polylineOptions: { strokeColor: '#3b82f6', strokeWeight: 5 },
                  suppressMarkers: false
                }}
              />
            )}
          </GoogleMap>

          {/* Fixed Center Pin for picking locations */}
          {step !== 'preview' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10 pb-1">
              <div className="relative flex flex-col items-center animate-bounce-short">
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md mb-1 whitespace-nowrap ${step === 'origin' ? 'bg-blue-600' : 'bg-red-600'}`}>
                  {step === 'origin' ? 'รับที่นี่' : 'ส่งที่นี่'}
                </div>
                <MapPin className={`w-10 h-10 drop-shadow-lg ${step === 'origin' ? 'text-blue-600' : 'text-red-600'}`} fill="currentColor" />
                <div className="w-2 h-2 bg-black/30 rounded-full absolute bottom-0 shadow-sm blur-[1px]"></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-20 relative -mt-4">
          {step === 'preview' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">ระยะทางรวม</p>
                    <p className="text-2xl font-bold text-slate-800">{distance.toFixed(1)} <span className="text-base font-medium text-slate-500">กม.</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 font-medium">ประมาณการ</p>
                  <p className="text-2xl font-bold text-blue-600">฿{(distance * 7).toFixed(0)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="h-14 rounded-xl px-6" onClick={handleBack}>
                  แก้ไข
                </Button>
                <Button className="flex-1 h-14 rounded-xl text-lg font-bold bg-blue-600 hover:bg-blue-700" onClick={handleNextStep}>
                  ยืนยันเส้นทาง <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <MapPin className={`w-5 h-5 mt-0.5 ${step === 'origin' ? 'text-blue-600' : 'text-red-600'}`} />
                <p className="text-sm text-slate-700 font-medium line-clamp-2">
                  {step === 'origin' ? (origin || 'กำลังค้นหาตำแหน่ง...') : (destination || 'กำลังค้นหาตำแหน่ง...')}
                </p>
              </div>
              <div className="flex gap-3">
                {step === 'destination' && (
                  <Button variant="outline" className="h-14 rounded-xl px-6" onClick={handleBack}>
                    กลับ
                  </Button>
                )}
                <Button 
                  className={`flex-1 h-14 rounded-xl text-lg font-bold ${step === 'origin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`} 
                  onClick={handleNextStep}
                  disabled={step === 'origin' ? !origin : !destination}
                >
                  {step === 'origin' ? 'ยืนยันจุดรับ' : 'ยืนยันจุดส่ง'} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
