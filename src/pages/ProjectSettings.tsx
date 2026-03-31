import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { ArrowLeft, Users, Map, Trash2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { LocationPickerModal } from '../components/LocationPickerModal';

import { ProjectCombobox } from '../components/ProjectCombobox';

export default function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, projects, users, projectMembers, projectRoutes, addProjectMember, removeProjectMember, addProjectRoute, removeProjectRoute } = useStore();
  
  const [activeTab, setActiveTab] = useState('team');
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // Delete confirmation state
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);
  
  // Route form state
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');

  // Location Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'origin' | 'destination' | null>(null);
  const [originLatLng, setOriginLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (originLatLng && destLatLng && window.google) {
      const service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [originLatLng],
          destinations: [destLatLng],
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status === 'OK' && response && response.rows[0].elements[0].status === 'OK') {
            const distanceInMeters = response.rows[0].elements[0].distance.value;
            setDistance((distanceInMeters / 1000).toFixed(1));
          }
        }
      );
    }
  }, [originLatLng, destLatLng]);

  if (!currentUser) return null;

  const project = projects.find(p => p.id === id);
  if (!project) return <div className="p-8 text-center">ไม่พบข้อมูลโครงการ</div>;

  const isManager = project.managerId === currentUser.id;
  const isMember = projectMembers.some(pm => pm.projectId === project.id && pm.userId === currentUser.id);

  if (!isManager && !isMember) return <div className="p-8 text-center">คุณไม่มีสิทธิ์เข้าถึงโครงการนี้</div>;

  const members = projectMembers.filter(pm => pm.projectId === project.id);
  const routes = projectRoutes.filter(pr => pr.projectId === project.id);

  // Users not yet in the project
  const availableUsers = users.filter(u => !members.some(pm => pm.userId === u.id));

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
          <CardDescription>จัดการสมาชิกและเส้นทางประจำของโครงการ</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" /> สมาชิก ({members.length})</TabsTrigger>
              <TabsTrigger value="routes"><Map className="mr-2 h-4 w-4" /> เส้นทางประจำ ({routes.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="team" className="mt-6 space-y-6">
              {isManager && (
                <div className="flex gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <Label>เพิ่มสมาชิกใหม่</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกพนักงาน..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddMember} disabled={!selectedUserId}>
                    <Plus className="mr-2 h-4 w-4" /> เพิ่ม
                  </Button>
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
                    <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="เช่น บ้าน" />
                    <Button variant="outline" size="icon" onClick={() => openPicker('origin')}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ปลายทาง</Label>
                  <div className="flex gap-2">
                    <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="เช่น ออฟฟิศ" />
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
