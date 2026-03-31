import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { FolderKanban, Users, Map } from 'lucide-react';

export default function MyProjects() {
  const { currentUser, projects, projectMembers, projectRoutes } = useStore();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const myProjects = projects.filter(p => {
    const isManager = p.managerId === currentUser.id;
    const isMember = projectMembers.some(pm => pm.projectId === p.id && pm.userId === currentUser.id);
    return isManager || isMember;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">โครงการของฉัน</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {myProjects.length === 0 ? (
          <p className="text-muted-foreground">ไม่มีโครงการที่คุณเข้าร่วม</p>
        ) : (
          myProjects.map(project => {
            const memberCount = projectMembers.filter(pm => pm.projectId === project.id).length;
            const routeCount = projectRoutes.filter(pr => pr.projectId === project.id).length;

            return (
              <Card 
                key={project.id} 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/my-projects/${project.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.code}</CardTitle>
                    <Badge variant={project.isPublic ? 'default' : 'secondary'}>
                      {project.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                  <CardDescription>{project.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{memberCount} สมาชิก</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Map className="h-4 w-4" />
                      <span>{routeCount} เส้นทาง</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
