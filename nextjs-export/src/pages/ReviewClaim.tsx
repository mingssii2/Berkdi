'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore, ItemStatus, ExpenseItem } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Car, Camera, CheckCircle2, XCircle, ArrowLeft, CornerUpLeft, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ItemDetailModal from '../components/ItemDetailModal';

export default function ReviewClaim() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { currentUser, claims, items, users, projects, approveClaim, rejectClaim, ceoApproveClaim, ceoReturnClaim } = useStore();
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({});
  const [selectedItem, setSelectedItem] = useState<ExpenseItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!currentUser) return null;

  const role = currentUser.activeRole;
  const claim = claims.find(c => c.id === id);
  if (!claim) return <div className="p-8 text-center">ไม่พบข้อมูล Claim</div>;

  const claimItems = items.filter(i => claim.items.includes(i.id));
  const claimUser = users.find(u => u.id === claim.userId);
  const claimProject = claimItems.length > 0 ? projects.find(p => p.id === claimItems[0].projectCodeId) : null;

  const handleItemDecision = (itemId: string, status: ItemStatus) => {
    setItemStatuses(prev => ({ ...prev, [itemId]: status }));
  };

  const handleApproveAll = () => {
    const newStatuses: Record<string, ItemStatus> = {};
    claimItems.forEach(i => newStatuses[i.id] = 'approved');
    setItemStatuses(newStatuses);
  };

  const handleRejectAll = () => {
    const newStatuses: Record<string, ItemStatus> = {};
    claimItems.forEach(i => newStatuses[i.id] = 'rejected');
    setItemStatuses(newStatuses);
  };

  const handleManagerSubmit = () => {
    const allDecided = claimItems.every(i => itemStatuses[i.id]);
    if (!allDecided) {
      toast.error('กรุณาตรวจสอบทุกรายการ');
      return;
    }
    
    const allRejected = claimItems.every(i => itemStatuses[i.id] === 'rejected');
    if (allRejected) {
      rejectClaim(claim.id, 'ไม่อนุมัติทุกรายการ');
      toast.success('ปฏิเสธ Claim แล้ว');
    } else {
      approveClaim(claim.id, itemStatuses);
      toast.success('อนุมัติ Claim แล้ว');
    }
    router.push('/approvals');
  };

  const handleCeoApprove = () => {
    ceoApproveClaim(claim.id);
    toast.success('CEO อนุมัติแล้ว');
    router.push('/approvals');
  };

  const handleCeoReturn = () => {
    ceoReturnClaim(claim.id, 'ต้องการให้ Manager ตรวจสอบใหม่');
    toast.success('ส่งกลับให้ Manager แล้ว');
    router.push('/approvals');
  };

  const openItemDetail = (item: ExpenseItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">ตรวจสอบ Claim</h1>
        </div>
        <Badge variant={role === 'ceo' ? 'destructive' : 'default'} className="text-sm px-3 py-1">
          {role === 'ceo' ? 'CEO Review' : 'Manager Review'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {claimUser?.name} · รอบบัญชี {claim.periodMonth}
            {claim.isSpecial && (
              <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                กรณีพิเศษ
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            รหัส: {claim.id}
            {claimProject && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">โครงการ: {claimProject.code} - {claimProject.name}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {role === 'manager' && (
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={handleApproveAll} className="text-green-600 border-green-200 hover:bg-green-50">
                <CheckCircle2 className="mr-2 h-4 w-4" /> อนุมัติทั้งหมด
              </Button>
              <Button variant="outline" size="sm" onClick={handleRejectAll} className="text-red-600 border-red-200 hover:bg-red-50">
                <XCircle className="mr-2 h-4 w-4" /> ไม่อนุมัติทั้งหมด
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {claimItems.map((item, index) => {
              const itemProject = projects.find(p => p.id === item.projectCodeId);
              return (
              <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between cursor-pointer" onClick={() => openItemDetail(item)}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-white rounded-full shadow-sm">
                      {item.type === 'travel' ? <Car className="h-5 w-5 text-blue-500" /> : <Camera className="h-5 w-5 text-green-500" />}
                    </div>
                    <div>
                      <p className="font-medium text-lg">
                        {index + 1}. {item.type === 'travel' ? 'ค่าเดินทาง' : item.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.date), 'dd MMM yyyy', { locale: th })} · โครงการ {itemProject?.name || item.projectCodeId}
                      </p>
                      {item.type === 'travel' && (
                        <div className="mt-2 p-3 bg-white rounded border text-sm">
                          <p className="font-medium text-gray-700">📍 Map Proof</p>
                          <p className="text-gray-600">{item.origin} → {item.destination}</p>
                          <p className="text-gray-500">{item.distance} km × ฿7 = ฿{item.amount.toFixed(2)}</p>
                        </div>
                      )}
                      {item.type === 'misc' && (
                        <div className="mt-2 p-3 bg-white rounded border text-sm flex items-center gap-2">
                          <Camera className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">แนบรูปใบเสร็จแล้ว</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-bold text-xl text-blue-700">฿{item.amount.toLocaleString()}</p>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openItemDetail(item); }}>
                      <Eye className="h-4 w-4 text-blue-600 mr-2" /> ดูรายละเอียด
                    </Button>
                  </div>
                </div>

                {role === 'manager' && (
                  <div className="mt-4 pt-4 border-t flex gap-2 justify-end">
                    <Button 
                      variant={itemStatuses[item.id] === 'approved' ? 'default' : 'outline'}
                      className={itemStatuses[item.id] === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => handleItemDecision(item.id, 'approved')}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> อนุมัติ
                    </Button>
                    <Button 
                      variant={itemStatuses[item.id] === 'rejected' ? 'destructive' : 'outline'}
                      onClick={() => handleItemDecision(item.id, 'rejected')}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> ไม่อนุมัติ
                    </Button>
                  </div>
                )}
              </div>
            );
            })}
          </div>

          <div className="pt-6 border-t flex items-center justify-between">
            <p className="text-xl font-medium">ยอดรวมทั้งสิ้น</p>
            <p className="text-3xl font-bold text-blue-600">฿{claim.totalAmount.toLocaleString()}</p>
          </div>

          {role === 'manager' && (
            <Button 
              className="w-full mt-6" 
              size="lg" 
              onClick={handleManagerSubmit}
            >
              ยืนยันผลการตรวจสอบ
            </Button>
          )}

          {role === 'ceo' && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleCeoApprove}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                CEO อนุมัติ
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={handleCeoReturn}
              >
                <CornerUpLeft className="mr-2 h-5 w-5" />
                ส่งกลับ Manager
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ItemDetailModal 
        item={selectedItem} 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        canEdit={false}
      />
    </div>
  );
}
