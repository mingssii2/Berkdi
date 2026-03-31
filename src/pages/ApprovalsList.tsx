import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { FileText, AlertCircle } from 'lucide-react';

export default function ApprovalsList() {
  const { currentUser, claims, projects, users, items, globalFilterProject, globalFilterPeriod } = useStore();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const role = currentUser.activeRole;

  // Apply global filters
  const filteredClaims = claims.filter(c => {
    if (globalFilterPeriod !== 'all' && c.periodMonth !== globalFilterPeriod) return false;
    if (globalFilterProject !== 'all') {
      const claimItems = items.filter(i => c.items.includes(i.id));
      if (!claimItems.some(i => i.projectCodeId === globalFilterProject)) return false;
    }
    return true;
  });

  let pendingClaims = [];
  
  if (role === 'manager') {
    const myProjectIds = projects.filter(p => p.managerId === currentUser.id).map(p => p.id);
    pendingClaims = filteredClaims.filter(c => {
      if (c.status !== 'waiting') return false;
      // Check if any item in the claim belongs to a project managed by the current user
      const claimItems = items.filter(i => c.items.includes(i.id));
      return claimItems.some(i => myProjectIds.includes(i.projectCodeId));
    });
  } else if (role === 'ceo') {
    pendingClaims = filteredClaims.filter(c => c.status === 'ceo_pending');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">รายการรออนุมัติ</h1>
        <Badge variant={role === 'ceo' ? 'destructive' : 'default'} className="text-sm px-3 py-1">
          {role === 'ceo' ? 'CEO Approval' : 'Manager Approval'}
        </Badge>
      </div>

      <div className="space-y-4">
        {pendingClaims.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              ไม่มีรายการรออนุมัติ
            </CardContent>
          </Card>
        ) : (
          pendingClaims.map(claim => {
            const user = users.find(u => u.id === claim.userId);
            return (
              <Card 
                key={claim.id} 
                className="cursor-pointer hover:bg-gray-50 transition-colors border-l-4 border-l-orange-500"
                onClick={() => navigate(`/approvals/${claim.id}/review`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user?.name} · รอบ {claim.periodMonth}</p>
                        {claim.isSpecial && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[10px]">
                            กรณีพิเศษ
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {claim.items.length} รายการ
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">฿{claim.totalAmount.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>รอตรวจสอบ</span>
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
