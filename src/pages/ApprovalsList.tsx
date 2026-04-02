import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, ItemStatus } from '../store';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { FileText, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ApprovalsList() {
  const { currentUser, claims, projects, users, items, globalFilterProject, globalFilterPeriod, approveClaim, ceoApproveClaim } = useStore();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const role = currentUser.activeRole;

  // Apply global filters and recalculate totals
  const filteredClaims = claims.map(c => {
    let claimItems = items.filter(i => c.items.includes(i.id));
    
    // Filter items by project if global filter is active
    if (globalFilterProject !== 'all') {
      claimItems = claimItems.filter(i => i.projectCodeId === globalFilterProject);
    }
    
    // Calculate new total based on filtered items
    const newTotal = claimItems.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      ...c,
      filteredItems: claimItems,
      displayTotal: newTotal
    };
  }).filter(c => {
    // Remove claims that have no items left after project filter
    if (c.filteredItems.length === 0) return false;
    // Filter by period
    if (globalFilterPeriod !== 'all' && c.periodMonth !== globalFilterPeriod) return false;
    return true;
  });

  let pendingClaims = [];
  
  if (role === 'manager') {
    const myProjectIds = projects.filter(p => p.managerId === currentUser.id).map(p => p.id);
    pendingClaims = filteredClaims.filter(c => {
      if (c.status !== 'waiting') return false;
      // Check if any item in the claim belongs to a project managed by the current user
      return c.filteredItems.some((i: any) => myProjectIds.includes(i.projectCodeId));
    });
  } else if (role === 'ceo') {
    pendingClaims = filteredClaims.filter(c => c.status === 'ceo_pending');
  }

  const handleQuickApprove = (e: React.MouseEvent, claim: any) => {
    e.stopPropagation();
    if (role === 'manager') {
      const newStatuses: Record<string, ItemStatus> = {};
      claim.filteredItems.forEach((i: any) => newStatuses[i.id] = 'approved');
      approveClaim(claim.id, newStatuses);
      toast.success('อนุมัติ Claim แล้ว');
    } else if (role === 'ceo') {
      ceoApproveClaim(claim.id);
      toast.success('CEO อนุมัติแล้ว');
    }
  };

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
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                        {claim.filteredItems.length} รายการ
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 sm:gap-6 mt-4 sm:mt-0">
                    <div className="text-right">
                      <p className="font-bold text-lg">฿{claim.displayTotal.toLocaleString()}</p>
                      <div className="flex items-center justify-end gap-1 text-xs text-orange-600 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>รอตรวจสอบ</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:border-l sm:pl-6 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full sm:w-auto text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                        onClick={(e) => handleQuickApprove(e, claim)}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" /> อนุมัติทั้งหมด
                      </Button>
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
