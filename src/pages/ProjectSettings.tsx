import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { ArrowLeft, Users, Map, Trash2, Plus, Search, Check, UserPlus, LayoutDashboard, FileText, Settings, DollarSign, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { ProjectCombobox } from '../components/ProjectCombobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { format } from 'date-fns';

import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];

export default function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, projects, users, projectMembers, projectRoutes, items, claims, globalFilterPeriod, globalFilterUser, addProjectMember, removeProjectMember, addProjectRoute, removeProjectRoute, updateProject } = useStore();
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);
  
  // Route form state
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');

  // Autocomplete instances
  const [originAutocomplete, setOriginAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [destAutocomplete, setDestAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Location Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'origin' | 'destination' | null>(null);
  const [originLatLng, setOriginLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);

  const project = projects.find(p => p.id === id);

  // Config State
  const [configName, setConfigName] = useState(project?.name || '');
  const [configCode, setConfigCode] = useState(project?.code || '');
  const [configIsPublic, setConfigIsPublic] = useState(project?.isPublic || false);
  const [configManagerId, setConfigManagerId] = useState(project?.managerId || '');

  useEffect(() => {
    if (project) {
      setConfigName(project.name);
      setConfigCode(project.code);
      setConfigIsPublic(project.isPublic);
      setConfigManagerId(project.managerId);
    }
  }, [project]);

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
            setDistance((distanceInMeters / 1000).toFixed(1));
          }
        }
      );
    }
  }, [originLatLng, destLatLng]);

  if (!currentUser) return null;

  if (!project) return <div className="p-8 text-center">ไม่พบข้อมูลโครงการ</div>;

  const isManager = project.managerId === currentUser.id;
  const isMember = projectMembers.some(pm => pm.projectId === project.id && pm.userId === currentUser.id);

  useEffect(() => {
    if (project && !isManager && !isMember) {
      toast.error('คุณไม่มีสิทธิ์เข้าถึงโครงการนี้');
      navigate('/my-projects');
    }
  }, [project, isManager, isMember, navigate]);

  if (!isManager && !isMember) return null;

  const members = projectMembers.filter(pm => pm.projectId === project.id);
  const routes = projectRoutes.filter(pr => pr.projectId === project.id);

  // Users not yet in the project
  const availableUsers = users.filter(u => !members.some(pm => pm.userId === u.id));

  const filteredAvailableUsers = availableUsers.filter(u => 
    u.name.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  const handleAddSpecificMember = (userId: string) => {
    addProjectMember(project.id, userId);
    toast.success('เพิ่มสมาชิกแล้ว');
  };

  const handleSaveConfig = () => {
    if (!project) return;
    if (!configName || !configCode || !configManagerId) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    updateProject(project.id, {
      name: configName,
      code: configCode,
      isPublic: configIsPublic,
      managerId: configManagerId,
    });
    toast.success('บันทึกการตั้งค่าแล้ว');
  };

  const handleAddMember = () => {
    if (!selectedUserId || !isManager) return;
    addProjectMember(project.id, selectedUserId);
    setSelectedUserId('');
    toast.success('เพิ่มสมาชิกแล้ว');
  };

  const handleAddRoute = () => {
    if (!origin || !destination || !distance) return;
    addProjectRoute({
      projectId: project.id,
      origin,
      destination,
      distance: parseFloat(distance)
    });
    setOrigin('');
    setDestination('');
    setDistance('');
    setOriginLatLng(null);
    setDestLatLng(null);
    toast.success('เพิ่มเส้นทางแล้ว');
  };

  const handleDeleteMember = () => {
    if (memberToDelete && isManager) {
      removeProjectMember(memberToDelete);
      toast.success('ลบสมาชิกแล้ว');
      setMemberToDelete(null);
    }
  };

  const handleDeleteRoute = () => {
    if (routeToDelete) {
      removeProjectRoute(routeToDelete);
      toast.success('ลบเส้นทางแล้ว');
      setRouteToDelete(null);
    }
  };

  const openPicker = (target: 'origin' | 'destination') => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handleLocationConfirm = (address: string, latLng: { lat: number; lng: number }) => {
    if (pickerTarget === 'origin') {
      setOrigin(address);
      setOriginLatLng(latLng);
    }
    if (pickerTarget === 'destination') {
      setDestination(address);
      setDestLatLng(latLng);
    }
  };

  const getInitialAddressForPicker = () => {
    if (pickerTarget === 'origin') return origin;
    if (pickerTarget === 'destination') return destination;
    return '';
  };

  const onOriginLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setOriginAutocomplete(autocomplete);
  };

  const onDestLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setDestAutocomplete(autocomplete);
  };

  const onOriginPlaceChanged = () => {
    if (originAutocomplete !== null) {
      const place = originAutocomplete.getPlace();
      if (place.formatted_address) {
        setOrigin(place.formatted_address);
      } else if (place.name) {
        setOrigin(place.name);
      }
      
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
      if (place.formatted_address) {
        setDestination(place.formatted_address);
      } else if (place.name) {
        setDestination(place.name);
      }
      
      if (place.geometry?.location) {
        setDestLatLng({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    }
  };

  // Dashboard Data Calculation
  const projectItems = items.filter(item => {
    if (item.projectCodeId !== project.id) return false;
    
    const itemDate = new Date(item.date);
    const itemPeriod = format(itemDate, 'yyyy-MM');
    if (globalFilterPeriod !== 'all' && itemPeriod !== globalFilterPeriod) return false;
    
    if (globalFilterUser !== 'all' && item.userId !== globalFilterUser) return false;
    
    return true;
  });

  const totalAmount = projectItems.reduce((sum, item) => sum + item.amount, 0);
  const draftAmount = projectItems.filter(i => i.status === 'draft').reduce((sum, item) => sum + item.amount, 0);
  const pendingAmount = projectItems.filter(i => ['manager_pending', 'ceo_pending', 'accounting_pending'].includes(i.status)).reduce((sum, item) => sum + item.amount, 0);
  const approvedAmount = projectItems.filter(i => i.status === 'approved').reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex-1 sm:w-64">
            <ProjectCombobox 
              projects={projects} 
              value={project.id} 
              onChange={(newId) => navigate(`/my-projects/${newId}`)} 
            />
          </div>
        </div>
        <Badge variant={project.isPublic ? 'default' : 'secondary'} className="text-sm px-3 py-1">
          {project.isPublic ? 'Public' : 'Private'}
        </Badge>
      </div>

      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสมาชิก</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบสมาชิกออกจากโครงการนี้?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-red-600 hover:bg-red-700">
              ลบสมาชิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!routeToDelete} onOpenChange={(open) => !open && setRouteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบเส้นทาง</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบเส้นทางประจำนี้?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoute} className="bg-red-600 hover:bg-red-700">
              ลบเส้นทาง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>{project.code} - {project.name}</CardTitle>
          <CardDescription>จัดการข้อมูล สมาชิก และเส้นทางประจำของโครงการ</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4 hidden sm:block" /> Dashboard</TabsTrigger>
              <TabsTrigger value="details"><FileText className="mr-2 h-4 w-4 hidden sm:block" /> Details</TabsTrigger>
              <TabsTrigger value="team"><Users className="mr-2 h-4 w-4 hidden sm:block" /> Members</TabsTrigger>
              <TabsTrigger value="routes"><Map className="mr-2 h-4 w-4 hidden sm:block" /> Routes</TabsTrigger>
              <TabsTrigger value="config"><Settings className="mr-2 h-4 w-4 hidden sm:block" /> Config</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">ยอดรวมทั้งหมด</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">฿{totalAmount.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">รอส่งเบิก (Draft)</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-600">฿{draftAmount.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">รออนุมัติ</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">฿{pendingAmount.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">อนุมัติแล้ว</CardTitle>
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">฿{approvedAmount.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">รหัสโครงการ</Label>
                  <p className="text-lg font-medium">{project.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">ชื่อโครงการ</Label>
                  <p className="text-lg font-medium">{project.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">ผู้จัดการโครงการ</Label>
                  <p className="text-lg font-medium">{users.find(u => u.id === project.managerId)?.name || 'ไม่ระบุ'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">สถานะ</Label>
                  <p className="text-lg font-medium">{project.isPublic ? 'Public (ทุกคนเข้าร่วมได้)' : 'Private (เฉพาะสมาชิกที่ได้รับเชิญ)'}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-6 space-y-6">
              {isManager && (
                <div className="flex justify-end">
                  <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                    <DialogTrigger render={<Button />}>
                      <UserPlus className="mr-2 h-4 w-4" /> เพิ่มสมาชิกใหม่
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>เพิ่มสมาชิกใหม่</DialogTitle>
                        <DialogDescription>
                          ค้นหาและเลือกพนักงานเพื่อเพิ่มเข้าโครงการ {project.code}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="ค้นหาชื่อพนักงาน..."
                            className="pl-9"
                            value={searchUserQuery}
                            onChange={(e) => setSearchUserQuery(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="h-[300px] rounded-md border p-2">
                          {filteredAvailableUsers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              ไม่พบพนักงาน
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {filteredAvailableUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                                  <div>
                                    <p className="font-medium text-sm">{user.name}</p>
                                    <div className="flex gap-1 mt-1">
                                      {user.roles.map(role => (
                                        <Badge key={role} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                          {role}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <Button size="sm" variant="outline" onClick={() => handleAddSpecificMember(user.id)}>
                                    เพิ่ม
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3">ชื่อพนักงาน</th>
                      {isManager && <th className="px-6 py-3 text-right">จัดการ</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={isManager ? 2 : 1} className="px-6 py-4 text-center text-muted-foreground">ไม่มีสมาชิก</td>
                      </tr>
                    ) : (
                      members.map(member => {
                        const user = users.find(u => u.id === member.userId);
                        return (
                          <tr key={member.id} className="bg-white border-b last:border-0 hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{user?.name}</td>
                            {isManager && (
                              <td className="px-6 py-4 text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setMemberToDelete(member.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="routes" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>ต้นทาง</Label>
                  <div className="flex gap-2">
                    {isLoaded ? (
                      <Autocomplete
                        onLoad={onOriginLoad}
                        onPlaceChanged={onOriginPlaceChanged}
                        className="flex-1"
                      >
                        <Input 
                          value={origin} 
                          onChange={(e) => setOrigin(e.target.value)} 
                          placeholder="เช่น บ้าน" 
                          className="w-full"
                        />
                      </Autocomplete>
                    ) : (
                      <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="กำลังโหลด..." disabled />
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
                        onLoad={onDestLoad}
                        onPlaceChanged={onDestPlaceChanged}
                        className="flex-1"
                      >
                        <Input 
                          value={destination} 
                          onChange={(e) => setDestination(e.target.value)} 
                          placeholder="เช่น ออฟฟิศ" 
                          className="w-full"
                        />
                      </Autocomplete>
                    ) : (
                      <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="กำลังโหลด..." disabled />
                    )}
                    <Button variant="outline" size="icon" onClick={() => openPicker('destination')}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>ระยะทาง (km)</Label>
                    <Input type="number" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0" disabled />
                    <p className="text-xs text-muted-foreground">คำนวณอัตโนมัติ</p>
                  </div>
                  <Button onClick={handleAddRoute} disabled={!origin || !destination || !distance} className="mb-5">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3">เส้นทาง</th>
                      <th className="px-6 py-3">ระยะทาง</th>
                      <th className="px-6 py-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground">ไม่มีเส้นทางประจำ</td>
                      </tr>
                    ) : (
                      routes.map(route => (
                        <tr key={route.id} className="bg-white border-b last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium">
                            {route.origin} <span className="text-gray-400 mx-2">→</span> {route.destination}
                          </td>
                          <td className="px-6 py-4">{route.distance} km</td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setRouteToDelete(route.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="config" className="mt-6 space-y-6">
              {isManager ? (
                <div className="space-y-4 max-w-xl">
                  <div className="space-y-2">
                    <Label>รหัสโครงการ</Label>
                    <Input value={configCode} onChange={e => setConfigCode(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>ชื่อโครงการ</Label>
                    <Input value={configName} onChange={e => setConfigName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>ผู้จัดการโครงการ</Label>
                    <Select value={configManagerId} onValueChange={setConfigManagerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกผู้จัดการ" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>สถานะการเข้าถึง</Label>
                    <Select value={configIsPublic ? 'public' : 'private'} onValueChange={v => setConfigIsPublic(v === 'public')}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public (ทุกคนเข้าร่วมได้)</SelectItem>
                        <SelectItem value="private">Private (เฉพาะสมาชิกที่ได้รับเชิญ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveConfig} className="mt-4">บันทึกการตั้งค่า</Button>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground border rounded-lg bg-gray-50">
                  เฉพาะผู้จัดการโครงการเท่านั้นที่สามารถแก้ไขการตั้งค่าได้
                </div>
              )}
            </TabsContent>
          </Tabs>
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
