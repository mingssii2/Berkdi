'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore, PresetRoute } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { MapPin, Camera, UploadCloud, CheckCircle2, AlertTriangle, XCircle, Calendar as CalendarIcon, Home, Building, Route, Search, Navigation, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useJsApiLoader, GoogleMap, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import { RoutePickerModal } from '../components/RoutePickerModal';
import { ProjectCombobox } from '../components/ProjectCombobox';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { cn } from '../lib/utils';

const libraries: ("places")[] = ["places"];

// Mock Google Calendar Events
const mockCalendarEvents = [
  { id: 'cal1', title: 'Meeting with Client A', location: 'ตึก GMM Grammy', time: '10:00 - 11:30', projectCode: 'BKK', date: new Date(2026, 2, 31) },
  { id: 'cal2', title: 'Site Visit', location: 'สำนักงาน อย. นนทบุรี', time: '14:00 - 16:00', projectCode: 'OPM', date: new Date(2026, 3, 1) },
  { id: 'cal3', title: 'Follow up', location: 'ตึก GMM Grammy', time: '10:00 - 11:30', projectCode: 'BKK', date: new Date(2026, 3, 2) },
];

export default function NewClaim() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'travel';
  const editId = searchParams.get('edit');
  const { currentUser, projects, addExpenseItem, updateItem, items } = useStore();
  const router = useRouter();

  const [projectId, setProjectId] = useState<string>('');
  const [dates, setDates] = useState<Date[]>([new Date()]);
  
  // Travel specific
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [distance, setDistance] = useState<number>(0);
  const [isManualDistance, setIsManualDistance] = useState<boolean>(false);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  
  // Round trip specific
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);
  const [returnDistance, setReturnDistance] = useState<number>(0);
  const [isReturnManualDistance, setIsReturnManualDistance] = useState<boolean>(false);
  const [returnDirectionsResponse, setReturnDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

  // Misc specific
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  useEffect(() => {
    if (editId) {
      const itemToEdit = items.find(item => item.id === editId);
      if (itemToEdit) {
        setProjectId(itemToEdit.projectCodeId);
        setDates([new Date(itemToEdit.date)]);
        if (itemToEdit.type === 'travel') {
          setOrigin(itemToEdit.origin || '');
          setDestination(itemToEdit.destination || '');
          setDistance(itemToEdit.distance || 0);
          setIsManualDistance(true);
        } else {
          setDescription(itemToEdit.description || '');
          setAmount(itemToEdit.amount);
          setReceiptUrl(itemToEdit.receiptUrl || '');
        }
      }
    }
  }, [editId, items]);

  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const calculateRoute = useCallback(() => {
    if (!origin || !destination || !isLoaded || isManualDistance) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
          const distanceInMeters = result.routes[0].legs[0].distance?.value || 0;
          setDistance(distanceInMeters / 1000); // Convert to km
        } else {
          toast.error('ไม่สามารถคำนวณเส้นทางไปได้');
          setDirectionsResponse(null);
          setDistance(0);
        }
      }
    );
  }, [origin, destination, isLoaded, isManualDistance]);

  const calculateReturnRoute = useCallback(() => {
    if (!origin || !destination || !isLoaded || isReturnManualDistance || !isRoundTrip) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: destination,
        destination: origin,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setReturnDirectionsResponse(result);
          const distanceInMeters = result.routes[0].legs[0].distance?.value || 0;
          setReturnDistance(distanceInMeters / 1000); // Convert to km
        } else {
          toast.error('ไม่สามารถคำนวณเส้นทางกลับได้');
          setReturnDirectionsResponse(null);
          setReturnDistance(0);
        }
      }
    );
  }, [origin, destination, isLoaded, isReturnManualDistance, isRoundTrip]);

  useEffect(() => {
    if (origin && destination && !isManualDistance) {
      calculateRoute();
    }
  }, [origin, destination, calculateRoute, isManualDistance]);

  useEffect(() => {
    if (isRoundTrip && origin && destination && !isReturnManualDistance) {
      calculateReturnRoute();
    }
  }, [isRoundTrip, origin, destination, calculateReturnRoute, isReturnManualDistance]);

  const travelAmount = distance * 7; // km * 7
  const returnTravelAmount = returnDistance * 7;
  const totalTravelAmount = travelAmount + (isRoundTrip ? returnTravelAmount : 0);

  const handleSave = () => {
    if (!projectId) {
      toast.error('กรุณาเลือกโครงการ');
      return;
    }
    if (!dates || dates.length === 0) {
      toast.error('กรุณาเลือกวันที่');
      return;
    }

    if (type === 'travel') {
      if (!origin || !destination || distance === 0) {
        toast.error('กรุณาระบุต้นทางและปลายทางให้ถูกต้อง');
        return;
      }
      
      const staticMapUrl = apiKey ? `https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:green|label:A|${encodeURIComponent(origin)}&markers=color:red|label:B|${encodeURIComponent(destination)}&path=color:0x0000ff|weight:5|${encodeURIComponent(origin)}|${encodeURIComponent(destination)}&key=${apiKey}` : undefined;
      const returnStaticMapUrl = apiKey && isRoundTrip ? `https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:green|label:A|${encodeURIComponent(destination)}&markers=color:red|label:B|${encodeURIComponent(origin)}&path=color:0x0000ff|weight:5|${encodeURIComponent(destination)}|${encodeURIComponent(origin)}&key=${apiKey}` : undefined;

      if (editId) {
        updateItem(editId, {
          projectCodeId: projectId,
          amount: travelAmount,
          date: format(dates[0], 'yyyy-MM-dd'),
          origin,
          destination,
          distance,
          receiptUrl: staticMapUrl,
        });
        
        if (isRoundTrip) {
          addExpenseItem({
            userId: currentUser!.id,
            projectCodeId: projectId,
            type: 'travel',
            amount: returnTravelAmount,
            date: format(dates[0], 'yyyy-MM-dd'),
            origin: destination,
            destination: origin,
            distance: returnDistance,
            receiptUrl: returnStaticMapUrl,
          });
        }
        toast.success(`แก้ไขรายการแล้ว`);
      } else {
        dates.forEach(d => {
          const dateStr = format(d, 'yyyy-MM-dd');
          addExpenseItem({
            userId: currentUser!.id,
            projectCodeId: projectId,
            type: 'travel',
            amount: travelAmount,
            date: dateStr,
            origin,
            destination,
            distance,
            receiptUrl: staticMapUrl,
          });

          if (isRoundTrip) {
            addExpenseItem({
              userId: currentUser!.id,
              projectCodeId: projectId,
              type: 'travel',
              amount: returnTravelAmount,
              date: dateStr,
              origin: destination,
              destination: origin,
              distance: returnDistance,
              receiptUrl: returnStaticMapUrl,
            });
          }
        });
        toast.success(`บันทึกรายการแล้ว ${dates.length * (isRoundTrip ? 2 : 1)} รายการ · ฿${(totalTravelAmount * dates.length).toFixed(2)}`);
      }
      
      router.push('/claims');
    } else {
      if (!description || !amount) return;
      
      if (editId) {
        updateItem(editId, {
          projectCodeId: projectId,
          amount,
          date: format(dates[0], 'yyyy-MM-dd'),
          description,
          receiptUrl: receiptUrl || undefined,
        });
        toast.success(`แก้ไขรายการแล้ว`);
      } else {
        dates.forEach(d => {
          const dateStr = format(d, 'yyyy-MM-dd');
          addExpenseItem({
            userId: currentUser!.id,
            projectCodeId: projectId,
            type: 'misc',
            amount,
            date: dateStr,
            description,
            receiptUrl: receiptUrl || undefined,
          });
        });
        toast.success(`บันทึกรายการแล้ว ${dates.length} รายการ · ฿${(amount * dates.length).toFixed(2)}`);
      }
      
      router.push('/claims');
    }
  };

  const handleOcrMock = () => {
    setIsOcrLoading(true);
    setTimeout(() => {
      setDates([new Date(2026, 2, 18)]);
      setDescription('Grab receipt');
      setAmount(350);
      setReceiptUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop');
      setIsOcrLoading(false);
      toast.success('ดึงข้อมูลจากใบเสร็จสำเร็จ');
    }, 1500);
  };

  // Route Picker State
  const [isRoutePickerOpen, setIsRoutePickerOpen] = useState(false);

  const handleRouteConfirm = (route: { origin: string; destination: string; distance: number }) => {
    setOrigin(route.origin);
    setDestination(route.destination);
    setDistance(route.distance);
    setIsManualDistance(true); // We already calculated it in the modal
    
    if (isLoaded) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: route.origin,
          destination: route.destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirectionsResponse(result);
          }
        }
      );
    }
  };

  const groupedEvents = useMemo(() => {
    return mockCalendarEvents.reduce((acc, event) => {
      if (!acc[event.location]) acc[event.location] = [];
      acc[event.location].push(event);
      return acc;
    }, {} as Record<string, typeof mockCalendarEvents>);
  }, []);

  const handleApplyCalendarEventGroup = (location: string, events: typeof mockCalendarEvents) => {
    const project = projects.find(p => p.code === events[0].projectCode);
    if (project) setProjectId(project.id);
    setDestination(location);
    setDates(events.map(e => e.date));
    
    // Auto-fill logic
    const matchingPresets = currentUser?.presetRoutes?.filter(r => r.destination === location) || [];
    if (matchingPresets.length === 1) {
      const route = matchingPresets[0];
      setOrigin(route.origin);
      setDistance(route.distance);
      setIsManualDistance(true);
      setDirectionsResponse(null);
      toast.success(`ใช้เส้นทางประจำอัตโนมัติ: ${route.name}`);
    } else if (currentUser?.homeAddress) {
      // Fallback to home address if no single preset matches
      setOrigin(currentUser.homeAddress);
      setIsManualDistance(false);
      toast.success(`ดึงข้อมูลจากปฏิทิน: ${location}`);
    } else {
      toast.success(`ดึงข้อมูลจากปฏิทิน: ${location}`);
    }
  };

  const handleApplyPresetRoute = (route: PresetRoute) => {
    setIsManualDistance(true);
    setOrigin(route.origin);
    setDestination(route.destination);
    setDistance(route.distance);
    setDirectionsResponse(null);
    toast.success(`ใช้เส้นทางประจำ: ${route.name}`);
  };

  const handleSuggestPick = (type: 'home-dest' | 'home-work' | 'work-home') => {
    setIsManualDistance(false);
    if (type === 'home-dest' && currentUser?.homeAddress && destination) {
      setOrigin(currentUser.homeAddress);
      toast.success('เลือกเส้นทาง บ้าน -> ปลายทาง');
    } else if (type === 'home-work' && currentUser?.homeAddress && currentUser?.officeAddress) {
      setOrigin(currentUser.homeAddress);
      setDestination(currentUser.officeAddress);
      toast.success('เลือกเส้นทาง บ้าน -> ที่ทำงาน');
    } else if (type === 'work-home' && currentUser?.homeAddress && currentUser?.officeAddress) {
      setOrigin(currentUser.officeAddress);
      setDestination(currentUser.homeAddress);
      toast.success('เลือกเส้นทาง ที่ทำงาน -> บ้าน');
    } else {
      toast.error('กรุณาตั้งค่าที่อยู่บ้านและที่ทำงานในหน้าตั้งค่าก่อน');
      router.push('/settings');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          {type === 'travel' ? 'เบิกค่าเดินทาง' : 'เบิกค่าใช้จ่ายอื่นๆ'}
        </h1>
        <Button variant="ghost" className="text-slate-500 hover:text-slate-800" onClick={() => router.back()}>ยกเลิก</Button>
      </div>

      <Card className="shadow-sm rounded-2xl border-slate-200">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-slate-700">โครงการ</Label>
            <ProjectCombobox 
              projects={projects} 
              value={projectId} 
              onChange={setProjectId} 
            />
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700">วันที่ (เลือกได้หลายวัน)</Label>
            <Popover>
              <PopoverTrigger 
                render={
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal rounded-xl h-12 bg-slate-50 border-slate-200",
                      !dates.length && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dates.length > 0 ? (
                      dates.length === 1 ? format(dates[0], "PPP") : `${dates.length} วันที่เลือก`
                    ) : (
                      <span>เลือกวันที่</span>
                    )}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="multiple"
                  selected={dates}
                  onSelect={(d) => setDates(d as Date[])}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-slate-500">แต่ละวันจะถูกแยกเป็น 1 รายการ</p>
          </div>

          {type === 'travel' && (
            <>
              {Object.keys(groupedEvents).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-slate-700 flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> แนะนำจาก Google Calendar</Label>
                  <div className="space-y-2">
                    {(Object.entries(groupedEvents) as [string, typeof mockCalendarEvents][]).map(([location, events]) => (
                      <div 
                        key={location} 
                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                        onClick={() => handleApplyCalendarEventGroup(location, events)}
                      >
                        <div>
                          <p className="font-medium text-sm text-slate-800 flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-blue-500" /> {location}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {events.map(e => format(e.date, 'd MMM')).join(', ')} ({events.length} วัน)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Proj: {events[0].projectCode}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!apiKey && (
                <div className="p-3 bg-yellow-50 text-yellow-800 rounded-xl flex items-start gap-2 text-sm border border-yellow-200">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Missing Google Maps API Key</p>
                    <p>Please add <code className="bg-yellow-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your <code className="bg-yellow-100 px-1 rounded">.env</code> file to enable location search and route calculation.</p>
                  </div>
                </div>
              )}

              {loadError && (
                <div className="p-3 bg-red-50 text-red-800 rounded-xl flex items-start gap-2 text-sm border border-red-200">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Google Maps API Error</p>
                    <p>The provided API key is invalid or restricted. Please ensure Maps JavaScript API, Places API, Geocoding API, and Directions API are enabled in Google Cloud Console.</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-slate-700"><Route className="w-4 h-4" /> เส้นทางแนะนำ (Suggest Pick)</Label>
                  <div className="flex flex-wrap gap-2">
                    {destination && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSuggestPick('home-dest')}
                        className="bg-slate-50 border-slate-200 text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                      >
                        <Home className="w-3 h-3 mr-1" /> บ้าน <ArrowRightLeft className="w-3 h-3 mx-1" /> ปลายทาง
                      </Button>
                    )}
                    {!destination && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSuggestPick('home-work')}
                          className="bg-slate-50 border-slate-200 text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                        >
                          <Home className="w-3 h-3 mr-1" /> บ้าน <ArrowRightLeft className="w-3 h-3 mx-1" /> ที่ทำงาน
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSuggestPick('work-home')}
                          className="bg-slate-50 border-slate-200 text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                        >
                          <Building className="w-3 h-3 mr-1" /> ที่ทำงาน <ArrowRightLeft className="w-3 h-3 mx-1" /> บ้าน
                        </Button>
                      </>
                    )}
                    {currentUser?.presetRoutes && currentUser.presetRoutes.filter(r => !destination || r.destination === destination).map(route => (
                      <Button 
                        key={route.id} 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleApplyPresetRoute(route)}
                        className="bg-slate-50 border-slate-200 text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                      >
                        {route.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-700">เส้นทางเดินทาง</Label>
                  <Card 
                    className="overflow-hidden rounded-2xl border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group" 
                    onClick={() => setIsRoutePickerOpen(true)}
                  >
                    <div className="p-4 flex flex-col gap-4 relative">
                      {/* Vertical line connecting origin and dest */}
                      <div className="absolute left-[27px] top-[40px] bottom-[40px] w-[2px] bg-slate-100 group-hover:bg-blue-100 transition-colors"></div>
                      
                      <div className="flex items-center gap-4">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 z-10 ring-4 ring-white"></div>
                        <div className={`flex-1 text-base font-medium truncate ${origin ? 'text-slate-900' : 'text-slate-400'}`}>
                          {origin || 'ระบุจุดรับ (ต้นทาง)'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 z-10 ring-4 ring-white"></div>
                        <div className={`flex-1 text-base font-medium truncate ${destination ? 'text-slate-900' : 'text-slate-400'}`}>
                          {destination || 'ระบุจุดส่ง (ปลายทาง)'}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-700">ระยะทางขาไป (กม.) - กรอกเองได้หากแผนที่ขัดข้อง</Label>
                  <Input 
                    type="number" 
                    value={distance || ''} 
                    onChange={(e) => {
                      setDistance(parseFloat(e.target.value) || 0);
                      setIsManualDistance(true);
                    }} 
                    className="rounded-xl h-12 bg-slate-50 border-slate-200"
                    placeholder="ระบุระยะทางเป็นกิโลเมตร"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="round-trip" 
                    checked={isRoundTrip} 
                    onCheckedChange={(c) => setIsRoundTrip(!!c)} 
                  />
                  <Label htmlFor="round-trip" className="text-slate-700 font-medium cursor-pointer">
                    เดินทางไป-กลับ (Round trip)
                  </Label>
                </div>

                {isRoundTrip && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <Label className="text-slate-700">ระยะทางขากลับ (กม.)</Label>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-xs text-slate-500 truncate max-w-[120px]">{destination || 'ปลายทาง'}</span>
                      <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-slate-500 truncate max-w-[120px]">{origin || 'ต้นทาง'}</span>
                    </div>
                    <Input 
                      type="number" 
                      value={returnDistance || ''} 
                      onChange={(e) => {
                        setReturnDistance(parseFloat(e.target.value) || 0);
                        setIsReturnManualDistance(true);
                      }} 
                      className="rounded-xl h-12 bg-white border-slate-200"
                      placeholder="ระบุระยะทางขากลับ"
                    />
                  </div>
                )}
              </div>

              {isLoaded && origin && destination && (
                <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-slate-200 mt-4 shadow-sm relative">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: 13.7563, lng: 100.5018 }}
                    zoom={10}
                    options={{ disableDefaultUI: true, gestureHandling: 'none' }}
                  >
                    {directionsResponse && (
                      <DirectionsRenderer 
                        directions={directionsResponse} 
                        options={{
                          polylineOptions: { strokeColor: '#3b82f6', strokeWeight: 4 },
                          suppressMarkers: false
                        }}
                      />
                    )}
                  </GoogleMap>
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-medium text-slate-600">
                    แผนที่สรุปเส้นทางขาไป
                  </div>
                </div>
              )}

              {isLoaded && origin && destination && isRoundTrip && returnDirectionsResponse && (
                <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-slate-200 mt-4 shadow-sm relative">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: 13.7563, lng: 100.5018 }}
                    zoom={10}
                    options={{ disableDefaultUI: true, gestureHandling: 'none' }}
                  >
                    <DirectionsRenderer 
                      directions={returnDirectionsResponse} 
                      options={{
                        polylineOptions: { strokeColor: '#ef4444', strokeWeight: 4 },
                        suppressMarkers: false
                      }}
                    />
                  </GoogleMap>
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-medium text-slate-600">
                    แผนที่สรุปเส้นทางขากลับ
                  </div>
                </div>
              )}

              {totalTravelAmount > 0 && (
                <div className="mt-6 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Navigation className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">ระยะทางรวม {dates.length} วัน</p>
                      <p className="text-xl font-bold text-slate-800">
                        {((distance + (isRoundTrip ? returnDistance : 0)) * dates.length).toFixed(1)} <span className="text-sm font-medium text-slate-500">กม.</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 font-medium">ยอดเบิก (฿7/กม.)</p>
                    <p className="text-2xl font-bold text-blue-600">฿{(totalTravelAmount * dates.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {type === 'misc' && (
            <>
              {receiptUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={receiptUrl} alt="Receipt Preview" className="w-full h-48 object-cover" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-md"
                    onClick={() => setReceiptUrl('')}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 hover:border-blue-300 cursor-pointer transition-all"
                  onClick={handleOcrMock}
                >
                  {isOcrLoading ? (
                    <div className="animate-pulse flex flex-col items-center">
                      <Camera className="h-10 w-10 text-slate-400 mb-3" />
                      <p className="text-sm text-slate-500 font-medium">กำลังอ่านข้อมูลด้วย AI...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                        <UploadCloud className="h-7 w-7 text-blue-600" />
                      </div>
                      <p className="text-base font-medium text-slate-800">ถ่ายรูป / อัปโหลดใบเสร็จ</p>
                      <p className="text-sm text-slate-500 mt-1">ระบบจะดึงข้อมูลให้อัตโนมัติ</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">รายละเอียด</Label>
                  <Input 
                    placeholder="เช่น ค่าทางด่วน, ค่าที่จอดรถ" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="rounded-xl h-12 bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">จำนวนเงิน (บาท)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={amount || ''} 
                    onChange={(e) => setAmount(parseFloat(e.target.value))} 
                    className="rounded-xl h-12 bg-slate-50 border-slate-200 text-lg font-medium"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 md:relative md:bg-transparent md:border-none md:shadow-none md:p-0">
        <div className="max-w-xl mx-auto">
          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-md" 
            onClick={handleSave}
            disabled={type === 'travel' ? (!origin || !destination || distance === 0 || !projectId || !dates.length) : (!description || !amount || !projectId || !dates.length)}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" /> บันทึกรายการ
          </Button>
        </div>
      </div>

      <RoutePickerModal
        isOpen={isRoutePickerOpen}
        onClose={() => setIsRoutePickerOpen(false)}
        onConfirm={handleRouteConfirm}
        initialOrigin={origin}
        initialDestination={destination}
      />
    </div>
  );
}
