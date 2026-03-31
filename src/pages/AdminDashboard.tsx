import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, Project } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Users, Folder, Settings, Edit, Trash2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { currentUser, users, projects, addProject, updateProject, deleteProject } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('projects');

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({
    code: '',
    name: '',
    managerId: '',
    isPublic: false
  });

  if (!currentUser || currentUser.activeRole !== 'admin') return null;

  const handleOpenProjectModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        code: project.code,
        name: project.name,
        managerId: project.managerId,
        isPublic: project.isPublic
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        code: '',
        name: '',
        managerId: '',
        isPublic: false
      });
    }
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = () => {
    if (!projectForm.code || !projectForm.name || !projectForm.managerId) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (editingProject) {
      updateProject(editingProject.id, projectForm);
      toast.success('อัปเดตโครงการ/ทีมสำเร็จ');
    } else {
      addProject(projectForm);
      toast.success('เพิ่มโครงการ/ทีมสำเร็จ');
    }
    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete);
      toast.success('ลบโครงการ/ทีมสำเร็จ');
      setProjectToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
      </div>

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบโครงการ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบโครงการนี้? การกระทำนี้ไม่สามารถยกเลิกได้ และอาจส่งผลกระทบต่อรายการเบิกจ่ายที่เกี่ยวข้อง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700">
              ลบโครงการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="projects"><Folder className="mr-2 h-4 w-4" /> Teams / Projects</TabsTrigger>
          <TabsTrigger value="config"><Settings className="mr-2 h-4 w-4" /> Config</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button>+ Add User</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Roles</th>
                    <th className="px-6 py-3">Manager</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{user.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {user.managerId ? users.find(u => u.id === user.managerId)?.name : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenProjectModal()}>+ Add Team / Project</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Project Code</th>
                    <th className="px-6 py-3">Team / Project Name</th>
                    <th className="px-6 py-3">Manager</th>
                    <th className="px-6 py-3">Visibility</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold">{project.code}</td>
                      <td className="px-6 py-4">{project.name}</td>
                      <td className="px-6 py-4">{users.find(u => u.id === project.managerId)?.name}</td>
                      <td className="px-6 py-4">
                        <Badge variant={project.isPublic ? 'default' : 'secondary'}>
                          {project.isPublic ? 'Public' : 'Private'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="ตั้งค่าโครงการ (ทีม/เส้นทาง)"
                          onClick={() => {
                            navigate(`/my-projects/${project.id}`);
                          }}
                        >
                          <Settings2 className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenProjectModal(project)}>
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setProjectToDelete(project.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>km_rate (฿/km)</Label>
                <Input type="number" defaultValue={7} />
              </div>
              <div className="space-y-2">
                <Label>period_cutoff_day</Label>
                <Input type="number" defaultValue={25} />
              </div>
              <div className="space-y-2">
                <Label>ceo_approval_limit (฿)</Label>
                <Input type="number" defaultValue={30000} />
              </div>
              <div className="space-y-2">
                <Label>special_claim_max_months_back</Label>
                <Input type="number" defaultValue={3} />
              </div>
              <div className="space-y-2">
                <Label>GOOGLE_OFFICE_ADDRESS</Label>
                <Input defaultValue="Promes Co., Ltd. Bangkok" />
              </div>
              <Button className="mt-4">Save Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? 'แก้ไขโครงการ/ทีม' : 'เพิ่มโครงการ/ทีม'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project Code</Label>
              <Input 
                value={projectForm.code} 
                onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })}
                placeholder="เช่น PRJ-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Team / Project Name</Label>
              <Input 
                value={projectForm.name} 
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="เช่น ทีมพัฒนาซอฟต์แวร์"
              />
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select 
                value={projectForm.managerId} 
                onValueChange={(val) => setProjectForm({ ...projectForm, managerId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้จัดการ" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.roles.includes('manager')).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="isPublic" 
                checked={projectForm.isPublic}
                onCheckedChange={(checked) => setProjectForm({ ...projectForm, isPublic: checked as boolean })}
              />
              <Label htmlFor="isPublic" className="font-normal cursor-pointer">
                Public (ทุกคนสามารถเลือกเบิกในโครงการนี้ได้)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveProject}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
