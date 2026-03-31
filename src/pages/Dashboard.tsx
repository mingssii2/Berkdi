import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Car, Camera, Clock, CheckCircle2, AlertCircle, Edit } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { currentUser, items, claims, projects, globalFilterProject, globalFilterPeriod } = useStore();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const role = currentUser.activeRole;

  // Apply global filters
  const filteredItems = items.filter(i => {
    if (globalFilterProject !== 'all' && i.projectCodeId !== globalFilterProject) return false;
    if (globalFilterPeriod !== 'all') {
      const itemPeriod = format(new Date(i.date), 'yyyy-MM');
      if (itemPeriod !== globalFilterPeriod) return false;
    }
    return true;
  });

  const filteredClaims = claims.filter(c => {
    if (globalFilterPeriod !== 'all' && c.periodMonth !== globalFilterPeriod) return false;
    if (globalFilterProject !== 'all') {
      const claimItems = items.filter(i => c.items.includes(i.id));
      if (!claimItems.some(i => i.projectCodeId === globalFilterProject)) return false;
    }
    return true;
  });

  // Staff data
  const myFilteredItems = filteredItems.filter(i => i.userId === currentUser.id && i.status !== 'deleted');
  
  // Summary stats based on filtered items
  const totalAmount = myFilteredItems.reduce((sum, item) => sum + item.amount, 0);
  const approvedAmount = myFilteredItems.filter(i => i.status === 'paid' || i.status === 'approved').reduce((sum, item) => sum + item.amount, 0);
  const pendingAmount = myFilteredItems.filter(i => i.status === 'waiting' || i.status === 'ceo_pending').reduce((sum, item) => sum + item.amount, 0);

  // Status counts
  const statusCounts = myFilteredItems.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Recent drafts/incomplete items
  const myDraftItems = myFilteredItems.filter(i => i.status === 'draft').slice(-5);
  
  // Manager data
  const myProjects = projects.filter(p => p.managerId === currentUser.id);
  const myProjectIds = myProjects.map(p => p.id);
  
  const pendingApprovals = filteredClaims.filter(c => {
    if (c.status !== 'waiting') return false;
    const claimItems = items.filter(i => c.items.includes(i.id));
    return claimItems.some(i => myProjectIds.includes(i.projectCodeId));
  });

  // CEO data
  const ceoPending = filteredClaims.filter(c => c.status === 'ceo_pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">ร่าง</span>;
      case 'waiting': return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">รอหัวหน้าอนุมัติ</span>;
      case 'ceo_pending': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">รอ CEO อนุมัติ</span>;
      case 'approved': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">อนุมัติแล้ว</span>;
      case 'paid': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">จ่ายแล้ว</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">ไม่อนุมัติ</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">สวัสดี, {currentUser.name}</h1>
          <p className="text-muted-foreground">รอบบัญชี: {globalFilterPeriod === 'all' ? 'ทั้งหมด' : globalFilterPeriod}</p>
        </div>
      </div>

      {/* Quick Actions - Available to Staff, Manager, CEO */}
      {['staff', 'manager', 'ceo'].includes(role) && (
        <div className="grid grid-cols-2 gap-4">
          <Button 
            className="h-24 flex flex-col gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
            variant="outline"
            onClick={() => navigate('/claims/new?type=travel')}
          >
            <Car className="h-8 w-8" />
            <span className="font-semibold">ค่าเดินทาง</span>
          </Button>
          <Button 
            className="h-24 flex flex-col gap-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
            variant="outline"
            onClick={() => navigate('/claims/new?type=misc')}
          >
            <Camera className="h-8 w-8" />
            <span className="font-semibold">ใบเสร็จ</span>
          </Button>
        </div>
      )}

      {/* Role Specific Content */}
      {role === 'staff' && (
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="mb-4">
                <p className="text-sm font-medium text-blue-800">สรุปยอดเบิก (ตามตัวกรอง)</p>
                <h2 className="text-3xl font-bold text-blue-900">฿{totalAmount.toLocaleString()}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-blue-200 pt-4">
                <div>
                  <p className="text-xs font-medium text-blue-700">Approve แล้ว</p>
                  <p className="text-lg font-bold text-green-600">฿{approvedAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700">รอ Approve</p>
                  <p className="text-lg font-bold text-orange-600">฿{pendingAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">สถานะรายการ (ตามตัวกรอง)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-700">{statusCounts['draft'] || 0}</p>
                  <p className="text-xs text-muted-foreground">Draft</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{(statusCounts['waiting'] || 0) + (statusCounts['ceo_pending'] || 0)}</p>
                  <p className="text-xs text-muted-foreground">Waiting</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{(statusCounts['approved'] || 0) + (statusCounts['paid'] || 0)}</p>
                  <p className="text-xs text-muted-foreground">Approved/Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">รายการ Draft ล่าสุด</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/claims')} className="text-blue-600 h-8">ดูทั้งหมด →</Button>
            </CardHeader>
            <CardContent>
              {myDraftItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">ไม่มีรายการ Draft</p>
              ) : (
                <div className="space-y-4">
                  {myDraftItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {item.type === 'travel' ? <Car className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.type === 'travel' ? 'ค่าเดินทาง' : item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.date), 'dd MMM yyyy')} · {projects.find(p => p.id === item.projectCodeId)?.name || item.projectCodeId}
                          </p>
                          <div className="mt-1">{getStatusBadge(item.status)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">฿{item.amount.toLocaleString()}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/claims/new?type=${item.type}&edit=${item.id}`)}>
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {role === 'manager' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">รอ Approve</p>
                <h2 className="text-3xl font-bold text-orange-900">{pendingApprovals.length} claim</h2>
              </div>
              <Button onClick={() => navigate('/approvals')} className="bg-orange-600 hover:bg-orange-700">ดู Approvals →</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">โครงการของฉัน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {myProjects.map(p => (
                  <span key={p.id} className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
                    {p.code} - {p.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {role === 'ceo' && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">รอ CEO Approve (≥ ฿30,000)</p>
              <h2 className="text-3xl font-bold text-red-900">{ceoPending.length} claim</h2>
            </div>
            <Button onClick={() => navigate('/approvals')} className="bg-red-600 hover:bg-red-700">ดู Approvals →</Button>
          </CardContent>
        </Card>
      )}

      {role === 'accounting' && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4">ไปที่หน้า Dashboard ของฝ่ายบัญชีเพื่อจัดการการจ่ายเงิน</p>
            <Button onClick={() => navigate('/accounting')}>Accounting Dashboard →</Button>
          </CardContent>
        </Card>
      )}

      {role === 'admin' && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4">จัดการระบบ ผู้ใช้ และโครงการ</p>
            <Button onClick={() => navigate('/admin')}>Admin Dashboard →</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
