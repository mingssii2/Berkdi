'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Autocomplete } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, MapPin, CheckCircle2 } from 'lucide-react';

const libraries: ("places")[] = ["places"];
const defaultCenter = { lat: 13.7563, lng: 100.5018 }; // Bangkok

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (address: string, latLng: { lat: number; lng: number }) => void;
  initialAddress?: string;
}

export function LocationPickerModal({ isOpen, onClose, onConfirm, initialAddress }: LocationPickerModalProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [address, setAddress] = useState(initialAddress || '');
  const [markerPos, setMarkerPos] = useState(defaultCenter);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const isProgrammaticPan = useRef(false);

  const onLoadMap = useCallback((map: google.maps.Map) => {
    setMap(map);
    if (navigator.geolocation && !initialAddress) {
      navigator.geolocation.getCurrentPosition((position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        isProgrammaticPan.current = true;
        map.panTo(pos);
        map.setZoom(15);
      });
    }
  }, [initialAddress]);

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
        const newAddress = place.formatted_address || place.name || '';
        
        isProgrammaticPan.current = true;
        map?.panTo({ lat, lng });
        map?.setZoom(16);
        setAddress(newAddress);
        setMarkerPos({ lat, lng });
      }
    }
  };

  const onMapIdle = useCallback(() => {
    if (!map) return;
    
    if (isProgrammaticPan.current) {
      isProgrammaticPan.current = false;
      return;
    }

    const center = map.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();

    setMarkerPos({ lat, lng });

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        setAddress(results[0].formatted_address);
      }
    });
  }, [map]);

  const handleConfirm = () => {
    onConfirm(address, markerPos);
    onClose();
  };

  if (!isLoaded) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0 overflow-hidden rounded-[24px]">
        <DialogHeader className="p-5 pb-3 bg-white z-20 shadow-sm">
          <DialogTitle className="text-xl font-bold text-slate-800">เลือกสถานที่</DialogTitle>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-20" />
            <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
              <Input 
                placeholder="ค้นหาสถานที่..." 
                className="pl-10 h-12 rounded-xl bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base relative z-10"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Autocomplete>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative bg-[#e5e3df]">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={defaultCenter}
            zoom={15}
            onLoad={onLoadMap}
            onUnmount={onUnmountMap}
            onIdle={onMapIdle}
            options={{ disableDefaultUI: true, zoomControl: false }}
          />

          {/* Fixed Center Pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10 pb-1">
            <div className="relative flex flex-col items-center animate-bounce-short">
              <div className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md mb-1 whitespace-nowrap bg-blue-600">
                ปักหมุดที่นี่
              </div>
              <MapPin className="w-10 h-10 drop-shadow-lg text-blue-600" fill="currentColor" />
              <div className="w-2 h-2 bg-black/30 rounded-full absolute bottom-0 shadow-sm blur-[1px]"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-20 relative -mt-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <MapPin className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
              <p className="text-sm text-slate-700 font-medium line-clamp-2">
                {address || 'กำลังค้นหาตำแหน่ง...'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="h-14 rounded-xl px-6" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button 
                className="flex-1 h-14 rounded-xl text-lg font-bold bg-blue-600 hover:bg-blue-700" 
                onClick={handleConfirm}
                disabled={!address}
              >
                ยืนยันสถานที่ <CheckCircle2 className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
