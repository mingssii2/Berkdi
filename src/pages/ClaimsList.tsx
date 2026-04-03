import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, ExpenseItem, ExpenseClaim } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { FileText, Car, Camera, Trash2, Eye, Send, AlertTriangle, Edit } from 'lucide-react';
import ItemDetailModal from '../components/ItemDetailModal';
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
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";

import { formatLocationName } from '../lib/utils';

export default function ClaimsList() {
  const { currentUser, items, claims, projects, updateItemStatus, createClaim, globalFilterProject, globalFilterPeriod } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('drafts');
  const [selectedItem, setSelectedItem] = useState<ExpenseItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemsForClaim, setSelectedItemsForClaim] = useState<string[]>([]);

  if (!currentUser) return null;

  // Apply global filters
  const filteredItems = items.filter(i => {
    if (globalFilterProject !== 'all' && i.projectCodeId !== globalFilterProject) return false;
    if (globalFilterPeriod !== 'all') {
      const itemPeriod = format(new Date(i.date), 'yyyy-MM');
      if (itemPeriod !== globalFilterPeriod) return false;
    }
    return true;
  });

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

  const myItems = filteredItems.filter(i => i.userId === currentUser.id && i.claimId === null && i.status !== 'deleted');
  const myClaims = filteredClaims.filter(c => c.userId === currentUser.id);

  const handleAbandon = (id: string) => {
    updateItemStatus(id, 'deleted');
    setSelectedItemsForClaim(prev => prev.filter(itemId => itemId !== id));
  };

  const openItemDetail = (item: ExpenseItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemsForClaim(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemsForClaim.length === myItems.length) {
      setSelectedItemsForClaim([]);
    } else {
      setSelectedItemsForClaim(myItems.map(i => i.id));
    }
  };

  const currentPeriod = format(new Date(), 'yyyy-MM');
  const isSpecialClaim = selectedItemsForClaim.some(id => {
    const item = myItems.find(i => i.id === id);
    return item && format(new Date(item.date), 'yyyy-MM') !== currentPeriod;
  });

  const handleSubmitClaim = () => {
    if (selectedItemsForClaim.length === 0) {
      toast.error('กรุณาเลือกรายการที่ต้องการเบิก');
      return;
    }
    
    createClaim(selectedItemsForClaim, isSpecialClaim);
    setSelectedItemsForClaim([]);
    toast.success(isSpecialClaim ? 'ส่งเบิกกรณีพิเศษ (นอกรอบ) สำเร็จ' : 'ส่งเบิกสำเร็จ');
    setActiveTab('claims');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">รายการเบิกของฉัน</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/claims/new?type=travel')} variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
            <Car className="w-4 h-4 mr-1" /> ค่าเดินทาง
          </Button>
          <Button onClick={() => navigate('/claims/new?type=misc')} variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
            <Camera className="w-4 h-4 mr-1" /> ใบเสร็จ
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drafts">รายการรอส่งเบิก ({myItems.length})</TabsTrigger>
          <TabsTrigger value="claims">บิลที่ส่งแล้ว ({myClaims.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="drafts" className="space-y-4 mt-4">
          {myItems.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-4">
                <Checkbox 
                  checked={selectedItemsForClaim.length === myItems.length && myItems.length > 0}
                  onCheckedChange={handleSelectAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  เลือกทั้งหมด ({selectedItemsForClaim.length}/{myItems.length})
                </label>
              </div>
              <div className="flex gap-2">
                {isSpecialClaim ? (
                  <Button 
                    size="sm" 
                    onClick={handleSubmitClaim}
                    disabled={selectedItemsForClaim.length === 0}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" /> เบิกกรณีพิเศษ (นอกรอบ)
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleSubmitClaim}
                    disabled={selectedItemsForClaim.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="mr-2 h-4 w-4" /> ส่งเบิก
                  </Button>
                )}
              </div>
            </div>
          )}

          {myItems.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                ไม่มีรายการที่รอส่งเบิก
              </CardContent>
            </Card>
          ) : (
            myItems.map(item => {
              const project = projects.find(p => p.id === item.projectCodeId);
              const projectName = project ? project.name : item.projectCodeId;
              return (
              <Card key={item.id} className={selectedItemsForClaim.includes(item.id) ? 'border-blue-300 bg-blue-50/30' : ''}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox 
                      checked={selectedItemsForClaim.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
                    />
                    <div className="p-2 bg-gray-100 rounded-full cursor-pointer" onClick={() => openItemDetail(item)}>
                      {item.type === 'travel' ? <Car className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                    </div>
                    <div className="cursor-pointer" onClick={() => openItemDetail(item)}>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.type === 'travel' ? `ค่าเดินทาง ${formatLocationName(item.origin)} -> ${formatLocationName(item.destination)}` : item.description}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.date), 'dd MMM yyyy')} · โครงการ {projectName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-lg">฿{item.amount.toLocaleString()}</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          navigate(`/claims/new?type=${item.type}&edit=${item.id}`);
                        }}
                        title="แก้ไขรายการ"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger 
                          render={
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => e.stopPropagation()}
                            />
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันการลบรายการ</AlertDialogTitle>
                            <AlertDialogDescription>
                              คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={(e) => { e.stopPropagation(); handleAbandon(item.id); }}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              ลบรายการ
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})
          )}
        </TabsContent>

        <TabsContent value="claims" className="space-y-4 mt-4">
          {myClaims.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                ไม่มีบิลที่ส่งแล้ว
              </CardContent>
            </Card>
          ) : (
            myClaims.map(claim => (
              <Card 
                key={claim.id} 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/claims/${claim.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">รอบบัญชี {claim.periodMonth}</p>
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
                  <div className="text-right">
                    <p className="font-bold text-lg">฿{claim.displayTotal.toLocaleString()}</p>
                    <Badge variant="outline" className={`mt-1 ${
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
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <ItemDetailModal 
        item={selectedItem} 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        canEdit={true}
      />
    </div>
  );
}
