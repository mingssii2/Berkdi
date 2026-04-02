import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore, ExpenseItem } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { FileText, Car, Camera, Send, ArrowLeft, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ItemDetailModal from '../components/ItemDetailModal';

import { formatLocationName } from '../lib/utils';

export default function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, claims, items, projects, submitClaim } = useStore();
  const [selectedItem, setSelectedItem] = useState<ExpenseItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!currentUser) return null;

  const claim = claims.find(c => c.id === id);
  if (!claim) return <div className="p-8 text-center">ไม่พบข้อมูล Claim</div>;

  const claimItems = items.filter(i => claim.items.includes(i.id));
  const allDraftReady = claimItems.every(i => i.status === 'draft');

  const handleSubmit = () => {
    if (!allDraftReady) {
      toast.error('มีรายการที่ยังไม่พร้อมส่ง');
      return;
    }
    submitClaim(claim.id);
    toast.success('ส่ง Claim เรียบร้อยแล้ว', {
      action: { label: 'กลับ', onClick: () => navigate('/claims') }
    });
  };

  const openItemDetail = (item: ExpenseItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">รายละเอียด Claim</h1>
        </div>
        <Badge variant="outline" className={`text-sm px-3 py-1 ${
          claim.status === 'draft' ? 'bg-gray-100 text-gray-800' :
          claim.status === 'waiting' ? 'bg-orange-100 text-orange-800' :
          claim.status === 'ceo_pending' ? 'bg-yellow-100 text-yellow-800' :
          claim.status === 'approved' || claim.status === 'paid' ? 'bg-green-100 text-green-800' :
          claim.status === 'rejected' ? 'bg-red-100 text-red-800' : ''
        }`}>
          {claim.status === 'draft' ? 'ร่าง' :
           claim.status === 'waiting' ? 'รอหัวหน้าอนุมัติ' :
           claim.status === 'ceo_pending' ? 'รอ CEO อนุมัติ' :
           claim.status === 'approved' ? 'อนุมัติแล้ว' :
           claim.status === 'paid' ? 'จ่ายแล้ว' :
           claim.status === 'rejected' ? 'ไม่อนุมัติ' : claim.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รอบบัญชี {claim.periodMonth}</CardTitle>
          <CardDescription>รหัส: {claim.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {claimItems.map((item, index) => {
              const project = projects.find(p => p.id === item.projectCodeId);
              const projectName = project ? project.name : item.projectCodeId;
              return (
              <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors" onClick={() => openItemDetail(item)}>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-gray-100 rounded-full">
                    {item.type === 'travel' ? <Car className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {index + 1}. {item.type === 'travel' ? `ค่าเดินทาง ${formatLocationName(item.origin)} -> ${formatLocationName(item.destination)}` : item.description}
                      </p>
                      {item.status === 'approved' && <Badge className="bg-green-500">อนุมัติ</Badge>}
                      {item.status === 'rejected' && <Badge variant="destructive">ไม่อนุมัติ</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.date), 'dd MMM yyyy', { locale: th })} · โครงการ {projectName}
                    </p>
                    {item.type === 'travel' && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatLocationName(item.origin)} → {formatLocationName(item.destination)} ({item.distance} km)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">฿{item.amount.toLocaleString()}</p>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openItemDetail(item); }}>
                    <Eye className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              </div>
            )})}
          </div>

          <div className="pt-4 border-t flex items-center justify-between">
            <p className="text-lg font-medium">รวมทั้งสิ้น</p>
            <p className="text-2xl font-bold text-blue-600">฿{claim.totalAmount.toLocaleString()}</p>
          </div>

          {claim.status === 'draft' && (
            <Button 
              className="w-full mt-6" 
              size="lg" 
              onClick={handleSubmit}
              disabled={!allDraftReady}
            >
              <Send className="mr-2 h-5 w-5" />
              ส่ง Claim →
            </Button>
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
        canEdit={claim.status === 'draft'}
      />
    </div>
  );
}
