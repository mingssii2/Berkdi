import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, PresetRoute } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { MapPin, Camera, UploadCloud, CheckCircle2, AlertTriangle, XCircle, Calendar as CalendarIcon, Home, Building, Route, Search, Navigation, ArrowRightLeft, ArrowRight, Plus, ChevronLeft, ChevronRight, Save, Trash2, X } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useJsApiLoader, GoogleMap, DirectionsService, Polyline, Marker, Autocomplete } from '@react-google-maps/api';
import { RoutePickerModal } from '../components/RoutePickerModal';
import { LocationPickerModal } from '../components/LocationPickerModal';
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

type Draft = {
  id: string;
  type: 'travel' | 'misc';
  projectId: string;
  dates: Date[];
  origin: string;
  destination: string;
  originLatLng?: {lat: number, lng: number};
  destLatLng?: {lat: number, lng: number};
  distance: number;
  isManualDistance: boolean;
  isRoundTrip: boolean;
  returnDistance: number;
  isReturnManualDistance: boolean;
  description: string;
  amount: number;
  receiptUrl: string;
};

const createEmptyDraft = (type: 'travel' | 'misc', projectId: string = ''): Draft => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type,
  projectId,
  dates: [new Date()],
  origin: '',
  destination: '',
  distance: 0,
  isManualDistance: false,
  isRoundTrip: false,
  returnDistance: 0,
  isReturnManualDistance: false,
  description: '',
  amount: 0,
  receiptUrl: ''
});

export default function NewClaim() {
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') as 'travel' | 'misc') || 'travel';
  const editId = searchParams.get('edit');
  const prefillProjectId = searchParams.get('project') || '';
  
  const { currentUser, projects, addExpenseItem, updateItem, items, projectRoutes } = useStore();
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState<Draft[]>([createEmptyDraft(type, prefillProjectId)]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentDraft = drafts[currentIndex] || drafts[0];

  const updateCurrentDraft = useCallback((updates: Partial<Draft>) => {
    setDrafts(prev => prev.map((d, i) => i === currentIndex ? { ...d, ...updates } : d));
  }, [currentIndex]);

  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [returnDirectionsResponse, setReturnDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'origin' | 'destination'>('origin');
  const [originAutocomplete, setOriginAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [destAutocomplete, setDestAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  useEffect(() => {
    if (editId) {
      const itemToEdit = items.find(item => item.id === editId);
      if (itemToEdit) {
        setDrafts([{
          id: itemToEdit.id,
          type: itemToEdit.type,
          projectId: itemToEdit.projectCodeId,
          dates: [new Date(itemToEdit.date)],
          origin: itemToEdit.origin || '',
          destination: itemToEdit.destination || '',
          distance: itemToEdit.distance || 0,
          isManualDistance: true,
          isRoundTrip: false,
          returnDistance: 0,
          isReturnManualDistance: false,
          description: itemToEdit.description || '',
          amount: itemToEdit.amount,
          receiptUrl: itemToEdit.receiptUrl || ''
        }]);
        setCurrentIndex(0);
      }
    }
  }, [editId, items]);

  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const onOriginPlaceChanged = () => {
    if (originAutocomplete !== null) {
      const place = originAutocomplete.getPlace();
      updateCurrentDraft({ origin: place.formatted_address || place.name || '', isManualDistance: false });
    }
  };

  const onDestPlaceChanged = () => {
    if (destAutocomplete !== null) {
      const place = destAutocomplete.getPlace();
      updateCurrentDraft({ destination: place.formatted_address || place.name || '', isManualDistance: false });
    }
  };

  useEffect(() => {
    setDirectionsResponse(null);
    setReturnDirectionsResponse(null);
  }, [currentIndex]);

  const calculateRoute = useCallback(() => {
    if (!currentDraft.origin || !currentDraft.destination || !isLoaded) return;

    const directionsService = new google.maps.DirectionsService();
    const request: google.maps.DirectionsRequest = {
      origin: currentDraft.originLatLng || currentDraft.origin,
      destination: currentDraft.destLatLng || currentDraft.destination,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(
      request,
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
          if (!currentDraft.isManualDistance) {
            const distanceInMeters = result.routes[0].legs[0].distance?.value || 0;
            updateCurrentDraft({ distance: Math.round(distanceInMeters / 1000) }); // Convert to km and round
          }
        } else {
          setDirectionsResponse(null);
          if (!currentDraft.isManualDistance) {
            toast.error('ไม่สามารถคำนวณเส้นทางไปได้');
            updateCurrentDraft({ distance: 0 });
          }
        }
      }
    );
  }, [currentDraft.origin, currentDraft.destination, currentDraft.originLatLng, currentDraft.destLatLng, isLoaded, currentDraft.isManualDistance, updateCurrentDraft]);

  const calculateReturnRoute = useCallback(() => {
    if (!currentDraft.origin || !currentDraft.destination || !isLoaded || !currentDraft.isRoundTrip) return;

    const directionsService = new google.maps.DirectionsService();
    const request: google.maps.DirectionsRequest = {
      origin: currentDraft.destLatLng || currentDraft.destination,
      destination: currentDraft.originLatLng || currentDraft.origin,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(
      request,
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setReturnDirectionsResponse(result);
          if (!currentDraft.isReturnManualDistance) {
            const distanceInMeters = result.routes[0].legs[0].distance?.value || 0;
            updateCurrentDraft({ returnDistance: Math.round(distanceInMeters / 1000) }); // Convert to km and round
          }
        } else {
          setReturnDirectionsResponse(null);
          if (!currentDraft.isReturnManualDistance) {
            toast.error('ไม่สามารถคำนวณเส้นทางกลับได้');
            updateCurrentDraft({ returnDistance: 0 });
          }
        }
      }
    );
  }, [currentDraft.origin, currentDraft.destination, currentDraft.originLatLng, currentDraft.destLatLng, isLoaded, currentDraft.isReturnManualDistance, currentDraft.isRoundTrip, updateCurrentDraft]);

  useEffect(() => {
    if (currentDraft.origin && currentDraft.destination) {
      calculateRoute();
    }
  }, [currentDraft.origin, currentDraft.destination, calculateRoute]);

  useEffect(() => {
    if (currentDraft.isRoundTrip && currentDraft.origin && currentDraft.destination) {
      calculateReturnRoute();
    }
  }, [currentDraft.isRoundTrip, currentDraft.origin, currentDraft.destination, calculateReturnRoute]);

  const travelAmount = currentDraft.distance * 7; // km * 7
  const returnTravelAmount = currentDraft.returnDistance * 7;
  const totalTravelAmount = travelAmount + (currentDraft.isRoundTrip ? returnTravelAmount : 0);

  const validateDraft = (draft: Draft) => {
    if (!draft.projectId) return 'กรุณาเลือกโครงการ';
    if (!draft.dates || draft.dates.length === 0) return 'กรุณาเลือกวันที่';
    
    if (draft.type === 'travel') {
      if (!draft.origin || !draft.destination || draft.distance === 0) return 'กรุณาระบุต้นทางและปลายทางให้ถูกต้อง';
    } else {
      if (!draft.description || !draft.amount) return 'กรุณาระบุรายละเอียดและจำนวนเงิน';
    }
    return null;
  };

  const saveDraftToStore = (draft: Draft) => {
    const staticMapUrl = apiKey && draft.type === 'travel' ? `https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:green|label:A|${encodeURIComponent(draft.origin)}&markers=color:red|label:B|${encodeURIComponent(draft.destination)}&path=color:0x0000ff|weight:5|${encodeURIComponent(draft.origin)}|${encodeURIComponent(draft.destination)}&key=${apiKey}` : undefined;
    const returnStaticMapUrl = apiKey && draft.type === 'travel' && draft.isRoundTrip ? `https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:green|label:A|${encodeURIComponent(draft.destination)}&markers=color:red|label:B|${encodeURIComponent(draft.origin)}&path=color:0x0000ff|weight:5|${encodeURIComponent(draft.destination)}|${encodeURIComponent(draft.origin)}&key=${apiKey}` : undefined;

    if (editId) {
      updateItem(editId, {
        projectCodeId: draft.projectId,
        amount: draft.type === 'travel' ? (draft.distance * 7) : draft.amount,
        date: format(draft.dates[0], 'yyyy-MM-dd'),
        origin: draft.origin,
        destination: draft.destination,
        distance: draft.distance,
        description: draft.description,
        receiptUrl: draft.type === 'travel' ? staticMapUrl : (draft.receiptUrl || undefined),
      });
      
      if (draft.type === 'travel' && draft.isRoundTrip) {
        addExpenseItem({
          userId: currentUser!.id,
          projectCodeId: draft.projectId,
          type: 'travel',
          amount: draft.returnDistance * 7,
          date: format(draft.dates[0], 'yyyy-MM-dd'),
          origin: draft.destination,
          destination: draft.origin,
          distance: draft.returnDistance,
          receiptUrl: returnStaticMapUrl,
        });
      }
    } else {
      draft.dates.forEach(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        addExpenseItem({
          userId: currentUser!.id,
          projectCodeId: draft.projectId,
          type: draft.type,
          amount: draft.type === 'travel' ? (draft.distance * 7) : draft.amount,
          date: dateStr,
          origin: draft.origin,
          destination: draft.destination,
          distance: draft.distance,
          description: draft.description,
          receiptUrl: draft.type === 'travel' ? staticMapUrl : (draft.receiptUrl || undefined),
        });

        if (draft.type === 'travel' && draft.isRoundTrip) {
          addExpenseItem({
            userId: currentUser!.id,
            projectCodeId: draft.projectId,
            type: 'travel',
            amount: draft.returnDistance * 7,
            date: dateStr,
            origin: draft.destination,
            destination: draft.origin,
            distance: draft.returnDistance,
            receiptUrl: returnStaticMapUrl,
          });
        }
      });
    }
  };

  const handleSaveCurrent = () => {
    const error = validateDraft(currentDraft);
    if (error) {
      toast.error(error);
      return;
    }

    saveDraftToStore(currentDraft);
    toast.success('บันทึกรายการสำเร็จ');

    if (drafts.length === 1) {
      navigate('/claims');
    } else {
      const newDrafts = drafts.filter((_, idx) => idx !== currentIndex);
      setDrafts(newDrafts);
      if (currentIndex >= newDrafts.length) {
        setCurrentIndex(newDrafts.length - 1);
      }
    }
  };

  const handleSaveAll = () => {
    for (let i = 0; i < drafts.length; i++) {
      const error = validateDraft(drafts[i]);
      if (error) {
        setCurrentIndex(i);
        toast.error(`รายการที่ ${i + 1}: ${error}`);
        return;
      }
    }

    drafts.forEach(draft => saveDraftToStore(draft));
    toast.success(`บันทึกสำเร็จทั้งหมด ${drafts.length} รายการ`);
    navigate('/claims');
  };

  const handleAddNew = () => {
    const newDraft = createEmptyDraft(type, currentDraft.projectId);
    setDrafts([...drafts, newDraft]);
    setCurrentIndex(drafts.length);
  };

  const handleRemoveCurrent = () => {
    if (drafts.length === 1) {
      navigate('/claims');
      return;
    }
    const newDrafts = drafts.filter((_, idx) => idx !== currentIndex);
    setDrafts(newDrafts);
    if (currentIndex >= newDrafts.length) {
      setCurrentIndex(newDrafts.length - 1);
    }
  };

  const handleImportCalendar = () => {
    const newDrafts = mockCalendarEvents.map((event, index) => ({
      id: `cal-${Date.now()}-${index}`,
      type: 'travel' as const,
      projectId: projects.find(p => p.code === event.projectCode)?.id || currentDraft.projectId,
      dates: [event.date],
      origin: currentUser?.officeAddress || '',
      destination: event.location,
      distance: 0,
      isManualDistance: false,
      isRoundTrip: false,
      returnDistance: 0,
      isReturnManualDistance: false,
      description: event.title,
      amount: 0,
      receiptUrl: ''
    }));
    
    setDrafts(prev => {
      const isEmpty = prev.length === 1 && !prev[0].projectId && !prev[0].origin && !prev[0].destination && !prev[0].description && prev[0].amount === 0;
      if (isEmpty) {
        return newDrafts;
      }
      return [...prev, ...newDrafts];
    });
    
    toast.success(`นำเข้า ${newDrafts.length} รายการจาก Calendar`);
    if (type !== 'travel') {
      navigate('/claims/new?type=travel');
    }
  };

  const handleOcrMock = () => {
    setIsOcrLoading(true);
    setTimeout(() => {
      updateCurrentDraft({
        dates: [new Date(2026, 2, 18)],
        description: 'Grab receipt',
        amount: 350,
        receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop'
      });
      setIsOcrLoading(false);
      toast.success('ดึงข้อมูลจากใบเสร็จสำเร็จ');
    }, 1500);
  };

  // Route Picker State
  const [isRoutePickerOpen, setIsRoutePickerOpen] = useState(false);

  const handleRouteConfirm = (route: { origin: string; destination: string; distance: number; originLatLng?: {lat: number, lng: number}; destLatLng?: {lat: number, lng: number} }) => {
    updateCurrentDraft({
      origin: route.origin,
      destination: route.destination,
      originLatLng: route.originLatLng,
      destLatLng: route.destLatLng,
      distance: Math.round(route.distance),
      isManualDistance: true
    });
    
    if (isLoaded) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: route.originLatLng || route.origin,
          destination: route.destLatLng || route.destination,
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

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          {type === 'travel' ? 'เบิกค่าเดินทาง' : 'เบิกค่าใช้จ่ายอื่นๆ'}
        </h1>
        <div className="flex gap-2">
          {!editId && type === 'travel' && (
            <Button variant="outline" size="sm" onClick={handleImportCalendar} className="text-blue-600 border-blue-200 hover:bg-blue-50">
              <CalendarIcon className="w-4 h-4 mr-1" /> นำเข้าจาก Calendar
            </Button>
          )}
          <Button variant="ghost" className="text-slate-500 hover:text-slate-800" onClick={() => navigate(-1)}>ยกเลิก</Button>
        </div>
      </div>

      {!editId && drafts.length > 1 && (
        <div className="fixed top-20 right-4 z-40">
          <span className="text-sm font-medium text-slate-600 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-slate-200">
            รายการที่ {currentIndex + 1} / {drafts.length}
          </span>
        </div>
      )}

      {!editId && drafts.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="fixed left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 md:h-12 md:w-12 rounded-full shadow-lg bg-white flex items-center justify-center"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(prev => prev - 1)}
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 md:h-12 md:w-12 rounded-full shadow-lg bg-white flex items-center justify-center"
            disabled={currentIndex === drafts.length - 1}
            onClick={() => setCurrentIndex(prev => prev + 1)}
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
        </>
      )}

      <Card className="shadow-sm rounded-2xl border-slate-200 relative overflow-hidden">
        {drafts.length > 1 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
            <div 
              className="h-full bg-blue-500 transition-all duration-300" 
              style={{ width: `${((currentIndex + 1) / drafts.length) * 100}%` }}
            />
          </div>
        )}
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-slate-700">โครงการ</Label>
            <ProjectCombobox 
              projects={projects} 
              value={currentDraft.projectId} 
              onChange={(val) => updateCurrentDraft({ projectId: val })} 
            />
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700">วันที่ (เลือกได้หลายวัน)</Label>
            <Popover>
              <PopoverTrigger render={
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-12 rounded-xl bg-slate-50 border-slate-200",
                    !currentDraft.dates.length && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                  {currentDraft.dates.length > 0 ? (
                    currentDraft.dates.length === 1 ? format(currentDraft.dates[0], "PPP") : `เลือกแล้ว ${currentDraft.dates.length} วัน`
                  ) : (
                    <span>เลือกวันที่</span>
                  )}
                </Button>
              } />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="multiple"
                  selected={currentDraft.dates}
                  onSelect={(dates) => updateCurrentDraft({ dates: dates as Date[] })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {currentDraft.dates.length > 1 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {currentDraft.dates.map((d, i) => (
                  <div key={i} className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    {format(d, "d MMM yyyy")}
                  </div>
                ))}
              </div>
            )}
          </div>

          {type === 'travel' && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700">เส้นทาง</Label>
                  <Button variant="ghost" size="sm" className="text-blue-600 h-8 px-2" onClick={() => setIsRoutePickerOpen(true)}>
                    <MapPin className="w-4 h-4 mr-1" /> ปักหมุดบนแผนที่
                  </Button>
                </div>
                
                {currentDraft.projectId && projectRoutes.filter(pr => pr.projectId === currentDraft.projectId).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-[-8px]">
                    {projectRoutes.filter(pr => pr.projectId === currentDraft.projectId).map(route => (
                      <Button 
                        key={route.id} 
                        variant="outline" 
                        size="sm" 
                        className="text-xs rounded-full bg-blue-50/50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                        onClick={() => {
                          updateCurrentDraft({
                            origin: route.origin,
                            destination: route.destination,
                            originLatLng: route.originLatLng,
                            destLatLng: route.destLatLng,
                            distance: route.distance,
                            isManualDistance: true
                          });
                        }}
                      >
                        <Route className="w-3 h-3 mr-1" />
                        {route.origin} <ArrowRight className="w-3 h-3 mx-1 text-blue-400" /> {route.destination}
                      </Button>
                    ))}
                  </div>
                )}
                
                <div className="relative space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="absolute left-7 top-10 bottom-10 w-0.5 bg-slate-200 z-0"></div>
                  
                  <div className="relative z-10 flex gap-3">
                    <div className="mt-3 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-slate-500 font-medium">ต้นทาง</Label>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => updateCurrentDraft({ origin: currentUser?.homeAddress || '', isManualDistance: false })} className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors">บ้าน</button>
                          <button type="button" onClick={() => updateCurrentDraft({ origin: currentUser?.officeAddress || '', isManualDistance: false })} className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors">ที่ทำงาน</button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          {isLoaded ? (
                            <Autocomplete onLoad={setOriginAutocomplete} onPlaceChanged={onOriginPlaceChanged}>
                              <Input 
                                placeholder="ค้นหาสถานที่ต้นทาง..."
                                className="h-11 rounded-xl border-slate-200 bg-white pr-8"
                                value={currentDraft.origin}
                                onChange={(e) => updateCurrentDraft({ origin: e.target.value, isManualDistance: false })}
                              />
                            </Autocomplete>
                          ) : (
                            <Input 
                              placeholder="ค้นหาสถานที่ต้นทาง..."
                              className="h-11 rounded-xl border-slate-200 bg-white pr-8"
                              value={currentDraft.origin}
                              onChange={(e) => updateCurrentDraft({ origin: e.target.value, isManualDistance: false })}
                            />
                          )}
                          {currentDraft.origin && (
                            <button type="button" onClick={() => updateCurrentDraft({ origin: '', isManualDistance: false })} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl bg-white" onClick={() => { setPickerType('origin'); setIsLocationPickerOpen(true); }}>
                          <MapPin className="w-4 h-4 text-slate-600" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex gap-3">
                    <div className="mt-3 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-red-600"></div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-slate-500 font-medium">ปลายทาง</Label>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => updateCurrentDraft({ destination: currentUser?.homeAddress || '', isManualDistance: false })} className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors">บ้าน</button>
                          <button type="button" onClick={() => updateCurrentDraft({ destination: currentUser?.officeAddress || '', isManualDistance: false })} className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors">ที่ทำงาน</button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          {isLoaded ? (
                            <Autocomplete onLoad={setDestAutocomplete} onPlaceChanged={onDestPlaceChanged}>
                              <Input 
                                placeholder="ค้นหาสถานที่ปลายทาง..."
                                className="h-11 rounded-xl border-slate-200 bg-white pr-8"
                                value={currentDraft.destination}
                                onChange={(e) => updateCurrentDraft({ destination: e.target.value, isManualDistance: false })}
                              />
                            </Autocomplete>
                          ) : (
                            <Input 
                              placeholder="ค้นหาสถานที่ปลายทาง..."
                              className="h-11 rounded-xl border-slate-200 bg-white pr-8"
                              value={currentDraft.destination}
                              onChange={(e) => updateCurrentDraft({ destination: e.target.value, isManualDistance: false })}
                            />
                          )}
                          {currentDraft.destination && (
                            <button type="button" onClick={() => updateCurrentDraft({ destination: '', isManualDistance: false })} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl bg-white" onClick={() => { setPickerType('destination'); setIsLocationPickerOpen(true); }}>
                          <MapPin className="w-4 h-4 text-slate-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="roundtrip" 
                    checked={currentDraft.isRoundTrip} 
                    onCheckedChange={(checked) => updateCurrentDraft({ isRoundTrip: checked === true })} 
                  />
                  <Label htmlFor="roundtrip" className="text-slate-700 cursor-pointer">เบิกขากลับด้วย (สลับต้นทาง-ปลายทาง)</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">ระยะทางขาไป (กม.)</Label>
                  <Input 
                    type="number" 
                    value={currentDraft.distance || ''} 
                    onChange={(e) => updateCurrentDraft({ distance: Math.round(parseFloat(e.target.value) || 0), isManualDistance: true })}
                    className="rounded-xl h-12 bg-slate-50 border-slate-200"
                  />
                </div>
                {currentDraft.isRoundTrip && (
                  <div className="space-y-2">
                    <Label className="text-slate-700">ระยะทางขากลับ (กม.)</Label>
                    <Input 
                      type="number" 
                      value={currentDraft.returnDistance || ''} 
                      onChange={(e) => updateCurrentDraft({ returnDistance: Math.round(parseFloat(e.target.value) || 0), isReturnManualDistance: true })}
                      className="rounded-xl h-12 bg-slate-50 border-slate-200"
                    />
                  </div>
                )}
              </div>

              {isLoaded && directionsResponse && !currentDraft.isManualDistance && (
                <div className="h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    options={{ disableDefaultUI: true, gestureHandling: 'none' }}
                  >
                    <>
                      <Polyline 
                        path={directionsResponse.routes[0].overview_path} 
                        options={{ strokeColor: '#3b82f6', strokeWeight: 5 }} 
                      />
                      <Marker position={directionsResponse.routes[0].legs[0].start_location} />
                      <Marker position={directionsResponse.routes[0].legs[0].end_location} />
                    </>
                  </GoogleMap>
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-medium text-slate-600">
                    แผนที่สรุปเส้นทางขาไป
                  </div>
                </div>
              )}

              {isLoaded && currentDraft.isRoundTrip && returnDirectionsResponse && !currentDraft.isReturnManualDistance && (
                <div className="h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    options={{ disableDefaultUI: true, gestureHandling: 'none' }}
                  >
                    <>
                      <Polyline 
                        path={returnDirectionsResponse.routes[0].overview_path} 
                        options={{ strokeColor: '#10b981', strokeWeight: 5 }} 
                      />
                      <Marker position={returnDirectionsResponse.routes[0].legs[0].start_location} />
                      <Marker position={returnDirectionsResponse.routes[0].legs[0].end_location} />
                    </>
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
                      <p className="text-sm text-slate-500 font-medium">ระยะทางรวม {currentDraft.dates.length} วัน</p>
                      <p className="text-xl font-bold text-slate-800">
                        {((currentDraft.distance + (currentDraft.isRoundTrip ? currentDraft.returnDistance : 0)) * currentDraft.dates.length).toFixed(0)} <span className="text-sm font-medium text-slate-500">กม.</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 font-medium">ยอดเบิก (฿7/กม.)</p>
                    <p className="text-2xl font-bold text-blue-600">฿{(totalTravelAmount * currentDraft.dates.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {type === 'misc' && (
            <>
              {currentDraft.receiptUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={currentDraft.receiptUrl} alt="Receipt Preview" className="w-full h-48 object-cover" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-md"
                    onClick={() => updateCurrentDraft({ receiptUrl: '' })}
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
                    value={currentDraft.description} 
                    onChange={(e) => updateCurrentDraft({ description: e.target.value })} 
                    className="rounded-xl h-12 bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">จำนวนเงิน (บาท)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={currentDraft.amount || ''} 
                    onChange={(e) => updateCurrentDraft({ amount: parseFloat(e.target.value) })} 
                    className="rounded-xl h-12 bg-slate-50 border-slate-200 text-lg font-medium"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50 p-4 flex flex-col gap-3 border-t border-slate-100">
          {!editId && (
            <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-2" onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" /> เพิ่มรายการใหม่
            </Button>
          )}
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 h-12 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleRemoveCurrent}>
              <Trash2 className="w-4 h-4 mr-2" /> ลบรายการนี้
            </Button>
            <Button className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleSaveCurrent}>
              <Save className="w-4 h-4 mr-2" /> บันทึกรายการนี้
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Fixed Bottom Bar */}
      {!editId && drafts.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 md:relative md:bg-transparent md:border-none md:shadow-none md:p-0">
          <div className="max-w-xl mx-auto">
            <Button 
              className="w-full h-14 rounded-xl text-lg font-bold bg-green-600 hover:bg-green-700 shadow-md" 
              onClick={handleSaveAll}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" /> บันทึกทั้งหมด ({drafts.length} รายการ)
            </Button>
          </div>
        </div>
      )}

      <RoutePickerModal
        isOpen={isRoutePickerOpen}
        onClose={() => setIsRoutePickerOpen(false)}
        onConfirm={handleRouteConfirm}
        initialOrigin={currentDraft.origin}
        initialDestination={currentDraft.destination}
      />

      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        initialAddress={pickerType === 'origin' ? currentDraft.origin : currentDraft.destination}
        onConfirm={(address) => {
          if (pickerType === 'origin') {
            updateCurrentDraft({ origin: address, isManualDistance: false });
          } else {
            updateCurrentDraft({ destination: address, isManualDistance: false });
          }
        }}
      />
    </div>
  );
}
