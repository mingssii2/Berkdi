import { useState } from 'react';
import { useStore, ExpenseItem } from '../store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { FileText, MapPin, Calendar, DollarSign, Clock, FolderKanban, X, Car } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';

interface ItemDetailModalProps {
  item: ExpenseItem | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
}

export default function ItemDetailModal({ item, isOpen, onClose, canEdit = false }: ItemDetailModalProps) {
  const { projects, updateItemStatus } = useStore();
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();

  if (!item) return null;

  const project = projects.find(p => p.id === item.projectCodeId);

  const handleDelete = () => {
    updateItemStatus(item.id, 'deleted');
    toast.success('ลบรายการแล้ว');
    setIsDeleteDialogOpen(false);
    onClose();
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    waiting: 'bg-orange-100 text-orange-800',
    ceo_pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    paid: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    deleted: 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    draft: 'ร่าง',
    waiting: 'รอหัวหน้าอนุมัติ',
    ceo_pending: 'รอ CEO อนุมัติ',
    approved: 'อนุมัติแล้ว',
    paid: 'จ่ายแล้ว',
    rejected: 'ไม่อนุมัติ',
    deleted: 'ลบแล้ว',
  };

  const hasImageOrCard = item.type === 'travel' || item.receiptUrl;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`${hasImageOrCard ? "sm:max-w-[800px]" : "sm:max-w-[500px]"} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">รายละเอียดรายการ</DialogTitle>
              <Badge className={statusColors[item.status as keyof typeof statusColors]} variant="outline">
                {statusLabels[item.status as keyof typeof statusLabels]}
              </Badge>
            </div>
            <DialogDescription>
              {item.type === 'travel' ? 'ค่าเดินทาง' : 'ค่าใช้จ่ายอื่นๆ'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className={hasImageOrCard ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid gap-4"}>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FolderKanban className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">โครงการ</p>
                    <p className="text-sm text-muted-foreground">{project?.code} - {project?.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">วันที่</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.date), 'dd MMM yyyy', { locale: th })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {item.type === 'travel' ? <Car className="h-5 w-5 text-muted-foreground mt-0.5" /> : <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />}
                  <div className="w-full">
                    <p className="text-sm font-medium">รายละเอียด</p>
                    <p className="text-sm text-muted-foreground">
                      {item.type === 'travel' ? `ค่าเดินทาง ${item.origin} -> ${item.destination}` : item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">จำนวนเงิน</p>
                    <p className="text-lg font-bold text-green-600">฿{item.amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-4 border-t">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      สร้างเมื่อ: {format(new Date(item.createdAt), 'dd MMM yyyy HH:mm', { locale: th })}
                    </p>
                  </div>
                </div>
              </div>

              {hasImageOrCard && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">ภาพหลักฐาน</p>
                  <div 
                    className="rounded-md overflow-hidden border w-full bg-gray-50 cursor-zoom-in relative group flex items-center justify-center h-[300px]"
                    onClick={() => setIsImageExpanded(true)}
                  >
                    {item.type === 'travel' ? (
                      <div className="w-full h-full flex flex-col">
                        {/* Header */}
                        <div className="bg-[#1e5b99] text-white p-3 flex justify-between items-start shrink-0">
                          <div>
                            <h3 className="font-bold text-sm leading-tight">บริษัท โพรเมซส์ จำกัด</h3>
                            <p className="text-blue-100 text-xs">หลักฐานค่าเดินทาง</p>
                          </div>
                        </div>

                        {/* Map Area */}
                        <div className="relative flex-1 bg-[#d4e1e1] w-full overflow-hidden">
                          {item.receiptUrl ? (
                            <img src={item.receiptUrl} alt="Map Route" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <MapPin className="w-8 h-8 opacity-50" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-[#1e5b99] text-white text-[10px] font-bold px-2 py-1 rounded-md">
                            {item.distance} กม.
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-3 space-y-2 text-xs bg-white shrink-0">
                          <div className="flex justify-between border-b pb-1 border-slate-100">
                            <span className="text-slate-500">วันที่:</span>
                            <span className="font-medium text-slate-800">{format(new Date(item.date), 'dd MMM yyyy', { locale: th })}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1 border-slate-100">
                            <span className="text-slate-500">เส้นทาง:</span>
                            <span className="font-medium text-[#1e5b99] text-right max-w-[70%] truncate">{item.origin} {'->'} {item.destination}</span>
                          </div>
                          <div className="flex justify-between pb-1">
                            <span className="text-slate-500">ระยะทาง:</span>
                            <span className="font-medium text-[#1e5b99]">{item.distance} กม. (7 บาท/กม.)</span>
                          </div>
                        </div>

                        {/* Footer Total */}
                        <div className="bg-[#e8e6e1] p-3 flex justify-between items-center shrink-0">
                          <span className="text-lg font-bold text-[#1e5b99]">฿{item.amount.toLocaleString()}</span>
                          <div className="text-right text-[8px] text-slate-400 font-mono leading-tight">
                            <p>ref: EXP-{format(new Date(item.createdAt), 'yyyy-MM')}-{item.id.substring(1, 5)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img src={item.receiptUrl} alt="Evidence" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-medium bg-black/60 px-4 py-2 rounded-full text-sm flex items-center gap-2">
                        คลิกเพื่อขยาย
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between">
            {canEdit && (item.status === 'draft' || item.status === 'waiting') ? (
              <>
                <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>ลบรายการ</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>ปิด</Button>
                  <Button onClick={() => {
                    onClose();
                    navigate(`/claims/new?type=${item.type}&edit=${item.id}`);
                  }}>แก้ไข</Button>
                </div>
              </>
            ) : (
              <Button className="w-full sm:w-auto" onClick={onClose}>ปิด</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบรายการ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expanded Image Overlay */}
      {isImageExpanded && hasImageOrCard && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setIsImageExpanded(false)}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); setIsImageExpanded(false); }}
          >
            <X className="h-6 w-6" />
          </Button>
          
          {item.type === 'travel' ? (
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-[#1e5b99] text-white p-5 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-xl leading-tight">บริษัท โพรเมซส์ จำกัด</h3>
                  <p className="text-blue-100 text-sm">หลักฐานค่าเดินทาง</p>
                </div>
              </div>

              {/* Map Area */}
              <div className="relative h-64 bg-[#d4e1e1] w-full overflow-hidden">
                {item.receiptUrl ? (
                  <img src={item.receiptUrl} alt="Map Route" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <MapPin className="w-12 h-12 opacity-50" />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-[#1e5b99] text-white text-sm font-bold px-3 py-1.5 rounded-md shadow-md">
                  {item.distance} กม.
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4 text-sm">
                <div className="flex justify-between border-b pb-3 border-slate-100">
                  <span className="text-slate-500">วันที่:</span>
                  <span className="font-medium text-slate-800">{format(new Date(item.date), 'dd MMMM yyyy', { locale: th })}</span>
                </div>
                <div className="flex justify-between border-b pb-3 border-slate-100">
                  <span className="text-slate-500">ต้นทาง:</span>
                  <span className="font-medium text-[#1e5b99] text-right max-w-[70%]">{item.origin}</span>
                </div>
                <div className="flex justify-between border-b pb-3 border-slate-100">
                  <span className="text-slate-500">ปลายทาง:</span>
                  <span className="font-medium text-[#1e5b99] text-right max-w-[70%]">{item.destination}</span>
                </div>
                <div className="flex justify-between border-b pb-3 border-slate-100">
                  <span className="text-slate-500">ระยะทาง:</span>
                  <span className="font-medium text-[#1e5b99]">{item.distance} กม.</span>
                </div>
                <div className="flex justify-between border-b pb-3 border-slate-100">
                  <span className="text-slate-500">โครงการ:</span>
                  <span className="font-medium text-[#1e5b99]">{project?.name || project?.code}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500">อัตรา:</span>
                  <span className="font-medium text-[#1e5b99]">7 บาท/กม.</span>
                </div>
              </div>

              {/* Footer Total */}
              <div className="bg-[#e8e6e1] p-6 flex justify-between items-center">
                <span className="text-3xl font-bold text-[#1e5b99]">฿{item.amount.toLocaleString()}</span>
                <div className="text-right text-xs text-slate-400 font-mono leading-tight">
                  <p>ref: EXP-{format(new Date(item.createdAt), 'yyyy-MM')}-{item.id.substring(1, 5)}</p>
                </div>
              </div>
            </div>
          ) : (
            <img 
              src={item.receiptUrl} 
              alt="Evidence Expanded" 
              className="max-w-full max-h-full object-contain" 
              referrerPolicy="no-referrer" 
            />
          )}
        </div>
      )}
    </>
  );
}
