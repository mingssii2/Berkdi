import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar as CalendarIcon, MapPin, ArrowRightLeft, CheckCircle2, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

// Mock Google Calendar Events
const mockEvents = [
  { id: 'e1', title: 'ประชุมลูกค้า SCB', date: subDays(new Date(), 1).toISOString(), destination: 'SCB Park Plaza' },
  { id: 'e2', title: 'Site Visit', date: subDays(new Date(), 2).toISOString(), destination: 'CentralWorld' },
  { id: 'e3', title: 'พบลูกค้า PTT', date: subDays(new Date(), 3).toISOString(), destination: 'PTT Head Office' },
];

export default function CalendarImport() {
  const { currentUser, projects, addExpenseItem } = useStore();
  const navigate = useNavigate();
  
  const [events, setEvents] = useState(mockEvents);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentEvent = events[currentIndex];
  
  const [projectId, setProjectId] = useState<string>('');
  const [origin, setOrigin] = useState<string>(currentUser?.officeAddress || '');
  const [destination, setDestination] = useState<string>('');
  const [distance, setDistance] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [originAutocomplete, setOriginAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [destAutocomplete, setDestAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (currentEvent) {
      setDestination(currentEvent.destination);
      setOrigin(currentUser?.officeAddress || '');
      setDistance(0);
      setAmount(0);
    }
  }, [currentEvent, currentUser]);

  const onOriginPlaceChanged = () => {
    if (originAutocomplete !== null) {
      const place = originAutocomplete.getPlace();
      setOrigin(place.formatted_address || place.name || '');
    }
  };

  const onDestPlaceChanged = () => {
    if (destAutocomplete !== null) {
      const place = destAutocomplete.getPlace();
      setDestination(place.formatted_address || place.name || '');
    }
  };

  const calculateRoute = useCallback(() => {
    if (!origin || !destination || !isLoaded) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const distanceInMeters = result.routes[0].legs[0].distance?.value || 0;
          const distKm = distanceInMeters / 1000;
          setDistance(distKm);
          setAmount(distKm * 7); // 7 THB per km
        } else {
          toast.error('ไม่สามารถคำนวณเส้นทางไปได้');
          setDistance(0);
          setAmount(0);
        }
      }
    );
  }, [origin, destination, isLoaded]);

  useEffect(() => {
    if (origin && destination) {
      calculateRoute();
    }
  }, [origin, destination, calculateRoute]);

  const handleSave = () => {
    if (!projectId) {
      toast.error('กรุณาเลือกโครงการ');
      return;
    }
    if (!origin || !destination) {
      toast.error('กรุณาระบุต้นทางและปลายทาง');
      return;
    }
    if (distance <= 0) {
      toast.error('กรุณาคำนวณระยะทาง');
      return;
    }

    addExpenseItem({
      type: 'travel',
      date: currentEvent.date,
      projectCodeId: projectId,
      origin,
      destination,
      distance,
      amount,
      userId: currentUser!.id,
    });

    toast.success('บันทึกค่าเดินทางสำเร็จ');
    
    // Remove current event from list
    const newEvents = events.filter((_, index) => index !== currentIndex);
    setEvents(newEvents);
    
    if (newEvents.length === 0) {
      navigate('/claims');
    } else {
      // Stay at the same index if possible, or go to previous if it was the last item
      if (currentIndex >= newEvents.length) {
        setCurrentIndex(newEvents.length - 1);
      }
    }
  };

  const handleSkip = () => {
    const newEvents = events.filter((_, index) => index !== currentIndex);
    setEvents(newEvents);
    if (newEvents.length === 0) {
      navigate('/claims');
    } else {
      if (currentIndex >= newEvents.length) {
        setCurrentIndex(newEvents.length - 1);
      }
    }
  };

  const handleImportAll = () => {
    if (!projectId) {
      toast.error('กรุณาเลือกโครงการสำหรับรายการทั้งหมด');
      return;
    }

    events.forEach(event => {
      addExpenseItem({
        type: 'travel',
        date: event.date,
        projectCodeId: projectId,
        origin: currentUser?.officeAddress || '',
        destination: event.destination,
        distance: 0,
        amount: 0,
        userId: currentUser!.id,
      });
    });

    toast.success(`นำเข้า ${events.length} รายการสำเร็จ (กรุณาคำนวณระยะทางภายหลัง)`);
    setEvents([]);
    navigate('/claims');
  };

  if (events.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 flex flex-col items-center justify-center h-[60vh]">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">ไม่มีรายการจาก Calendar แล้ว</h2>
        <Button onClick={() => navigate('/claims')}>กลับไปหน้ารายการเบิก</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          นำเข้าจาก Calendar
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImportAll} className="text-blue-600 border-blue-200 hover:bg-blue-50">
            เบิกทั้งหมด ({events.length})
          </Button>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            รายการที่ {currentIndex + 1} / {events.length}
          </div>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-blue-50 p-4 border-b border-blue-100">
          <h2 className="font-semibold text-lg text-blue-900">{currentEvent.title}</h2>
          <p className="text-blue-700 text-sm flex items-center gap-1 mt-1">
            <CalendarIcon className="w-4 h-4" />
            {format(new Date(currentEvent.date), 'dd MMMM yyyy', { locale: th })}
          </p>
        </div>
        
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-700">โครงการ <span className="text-red-500">*</span></Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="เลือกโครงการ" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700">ต้นทาง</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-20" />
                {isLoaded ? (
                  <Autocomplete onLoad={setOriginAutocomplete} onPlaceChanged={onOriginPlaceChanged}>
                    <Input 
                      placeholder="ค้นหาต้นทาง..."
                      className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    />
                  </Autocomplete>
                ) : (
                  <Input 
                    placeholder="ค้นหาต้นทาง..."
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">ปลายทาง</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-20" />
                {isLoaded ? (
                  <Autocomplete onLoad={setDestAutocomplete} onPlaceChanged={onDestPlaceChanged}>
                    <Input 
                      placeholder="ค้นหาปลายทาง..."
                      className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </Autocomplete>
                ) : (
                  <Input 
                    placeholder="ค้นหาปลายทาง..."
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>

          {distance > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ระยะทางรวม</span>
                <span className="font-medium">{distance.toFixed(2)} กิโลเมตร</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">อัตราเบิกจ่าย</span>
                <span className="font-medium">7 บาท / กิโลเมตร</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200">
                <span className="text-slate-800">จำนวนเงินที่เบิกได้</span>
                <span className="text-blue-700">฿{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50 p-4 flex gap-3 border-t border-slate-100">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={handleSkip}>
            <X className="w-4 h-4 mr-2" /> ข้ามรายการนี้
          </Button>
          <Button className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> บันทึกและถัดไป
          </Button>
        </CardFooter>
      </Card>

      <div className="flex justify-between mt-6">
        <Button 
          variant="ghost" 
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(prev => prev - 1)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> ก่อนหน้า
        </Button>
        <Button 
          variant="ghost" 
          disabled={currentIndex === events.length - 1}
          onClick={() => setCurrentIndex(prev => prev + 1)}
        >
          ถัดไป <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
