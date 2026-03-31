import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountingDashboard() {
  const { currentUser, claims, users, items, markReadyToPay, markPaid, globalFilterProject, globalFilterPeriod } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('approved');
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);

  if (!currentUser || currentUser.activeRole !== 'accounting') return null;

  // Apply global filters
  const filteredClaims = claims.filter(c => {
    if (globalFilterPeriod !== 'all' && c.periodMonth !== globalFilterPeriod) return false;
    if (globalFilterProject !== 'all') {
      const claimItems = items.filter(i => c.items.includes(i.id));
      if (!claimItems.some(i => i.projectCodeId === globalFilterProject)) return false;
    }
    return true;
  });

  const approvedClaims = filteredClaims.filter(c => ['approved', 'partial_approved', 'ceo_approved'].includes(c.status));
  const readyToPayClaims = filteredClaims.filter(c => c.status === 'ready_to_pay');
  const paidClaims = filteredClaims.filter(c => c.status === 'paid');

  const handleSelect = (id: string) => {
    setSelectedClaims(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (claimsList: any[]) => {
    if (selectedClaims.length === claimsList.length) {
      setSelectedClaims([]);
    } else {
      setSelectedClaims(claimsList.map(c => c.id));
    }
  };

  const handleMarkReadyToPay = () => {
    if (selectedClaims.length === 0) return;
    markReadyToPay(selectedClaims);
    setSelectedClaims([]);
    toast.success('ส่งเข้าคิวรอจ่ายแล้ว');
    setActiveTab('ready_to_pay');
  };

  const handleMarkPaid = () => {
    if (selectedClaims.length === 0) return;
    markPaid(selectedClaims);
    setSelectedClaims([]);
    toast.success('ยืนยันการจ่ายเงินแล้ว');
    setActiveTab('paid');
  };

  const handleExport = (format: 'excel' | 'word') => {
    toast.success(`Exported ${selectedClaims.length} claims to ${format.toUpperCase()}`);
  };

  const renderClaimsTable = (claimsList: any[], actionButton: React.ReactNode) => (
    <div className="space-y-4">
      {selectedClaims.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="font-medium text-blue-800">เลือกแล้ว {selectedClaims.length} รายการ</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="bg-white">
                <Download className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('word')} className="bg-white">
                <Download className="mr-2 h-4 w-4" /> Word
              </Button>
            </div>
          </div>
          {actionButton}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="p-4">
                  <Checkbox 
                    checked={selectedClaims.length === claimsList.length && claimsList.length > 0}
                    onCheckedChange={() => handleSelectAll(claimsList)}
                  />
                </th>
                <th className="px-6 py-3">รหัส Claim</th>
                <th className="px-6 py-3">ผู้ขอเบิก</th>
                <th className="px-6 py-3">รอบบัญชี</th>
                <th className="px-6 py-3">ยอดรวม</th>
                <th className="px-6 py-3">สถานะ</th>
                <th className="px-6 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {claimsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
                </tr>
              ) : (
                claimsList.map(claim => {
                  const user = users.find(u => u.id === claim.userId);
                  return (
                    <tr key={claim.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Checkbox 
                          checked={selectedClaims.includes(claim.id)}
                          onCheckedChange={() => handleSelect(claim.id)}
                        />
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          {claim.id}
                          {claim.isSpecial && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[10px]">
                              กรณีพิเศษ
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{user?.name}</td>
                      <td className="px-6 py-4">{claim.periodMonth}</td>
                      <td className="px-6 py-4 font-bold">฿{claim.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{claim.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/claims/${claim.id}`)}
                          title="ดูรายละเอียด"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">ฝ่ายบัญชี</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 text-center">
            <p className="text-sm font-medium text-blue-800">อนุมัติแล้ว</p>
            <h2 className="text-3xl font-bold text-blue-900">{approvedClaims.length}</h2>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6 text-center">
            <p className="text-sm font-medium text-orange-800">รอจ่าย</p>
            <h2 className="text-3xl font-bold text-orange-900">{readyToPayClaims.length}</h2>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 text-center">
            <p className="text-sm font-medium text-green-800">จ่ายแล้ว</p>
            <h2 className="text-3xl font-bold text-green-900">{paidClaims.length}</h2>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedClaims([]); }} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="approved">อนุมัติแล้ว ({approvedClaims.length})</TabsTrigger>
          <TabsTrigger value="ready_to_pay">รอจ่าย ({readyToPayClaims.length})</TabsTrigger>
          <TabsTrigger value="paid">จ่ายแล้ว ({paidClaims.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="approved" className="mt-4">
          {renderClaimsTable(
            approvedClaims, 
            <Button onClick={handleMarkReadyToPay} className="bg-blue-600 hover:bg-blue-700">ส่งเข้าคิวรอจ่าย →</Button>
          )}
        </TabsContent>

        <TabsContent value="ready_to_pay" className="mt-4">
          {renderClaimsTable(
            readyToPayClaims, 
            <Button onClick={handleMarkPaid} className="bg-orange-600 hover:bg-orange-700">ยืนยันจ่ายเงิน ✓</Button>
          )}
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          {renderClaimsTable(paidClaims, null)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
