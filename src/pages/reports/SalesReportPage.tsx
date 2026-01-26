import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { Bill } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { exportToCSV } from '@/lib/exportUtils';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function SalesReportPage() {
    const { userData } = useAuth();
    const [bills, setBills] = useState<Bill[]>([]);
    const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalSales, setTotalSales] = useState(0);
    const [totalTax, setTotalTax] = useState(0);
    const [totalProfit, setTotalProfit] = useState(0);

    useEffect(() => {
        fetchBills();
    }, [userData]);

    useEffect(() => {
        applyFilter();
    }, [bills, startDate, endDate]);

    const fetchBills = async () => {
        if (!userData?.shopId) return;

        const q = query(collection(db, 'bills'), where('shopId', '==', userData.shopId), where('billStatus', '==', 'active'));
        const snapshot = await getDocs(q);
        const billList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Bill);
        setBills(billList);
    };

    const applyFilter = () => {
        let filtered = [...bills];

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(bill => {
                const billDate = bill.billDate?.toDate();
                return billDate && billDate >= start;
            });
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(bill => {
                const billDate = bill.billDate?.toDate();
                return billDate && billDate <= end;
            });
        }

        setFilteredBills(filtered);

        const total = filtered.reduce((sum, bill) => sum + bill.totalAmount, 0);
        const tax = filtered.reduce((sum, bill) => sum + bill.taxAmount, 0);
        const profit = filtered.reduce((sum, bill) => sum + (bill.totalProfit || 0), 0);
        setTotalSales(total);
        setTotalTax(tax);
        setTotalProfit(profit);
    };

    const handleExport = () => {
        const exportData = filteredBills.map(bill => ({
            'Bill Number': bill.billNumber,
            Date: bill.billDate?.toDate().toLocaleDateString(),
            Customer: bill.customerName,
            Type: bill.customerType,
            Subtotal: bill.subtotal.toFixed(2),
            Discount: bill.discount.toFixed(2),
            Tax: bill.taxAmount.toFixed(2),
            Total: bill.totalAmount.toFixed(2),
            Profit: (bill.totalProfit || 0).toFixed(2),
            'Payment Status': bill.paymentStatus,
            'Payment Method': bill.paymentMethod,
        }));

        exportToCSV(exportData, `sales-report-${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className='space-y-6'>
            <div className='flex justify-between items-center'>
                <h2 className='text-3xl font-bold tracking-tight'>Sales Reports</h2>
                <Button onClick={handleExport} disabled={filteredBills.length === 0}>
                    Export to CSV
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filter by Date Range</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div className='grid gap-2'>
                            <Label htmlFor='startDate'>Start Date</Label>
                            <Input id='startDate' type='date' value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className='grid gap-2'>
                            <Label htmlFor='endDate'>End Date</Label>
                            <Input id='endDate' type='date' value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary */}
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <Card>
                    <CardHeader className='pb-2'>
                        <CardDescription>Total Sales</CardDescription>
                        <CardTitle className='text-2xl'>{formatCurrency(totalSales)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className='pb-2'>
                        <CardDescription>Total Profit</CardDescription>
                        <CardTitle className='text-2xl text-green-600'>{formatCurrency(totalProfit)}</CardTitle>
                        <p className='text-xs text-muted-foreground mt-1'>{totalSales > 0 ? `${((totalProfit / totalSales) * 100).toFixed(1)}% margin` : '0% margin'}</p>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className='pb-2'>
                        <CardDescription>Total Tax Collected</CardDescription>
                        <CardTitle className='text-2xl'>{formatCurrency(totalTax)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className='pb-2'>
                        <CardDescription>Total Bills</CardDescription>
                        <CardTitle className='text-2xl'>{filteredBills.length}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Bills Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Bill Details</CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredBills.length === 0 ? (
                        <p className='text-gray-500 text-center py-8'>No bills found for the selected date range.</p>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead>
                                    <tr className='border-b'>
                                        <th className='text-left p-2'>Bill #</th>
                                        <th className='text-left p-2'>Date</th>
                                        <th className='text-left p-2'>Customer</th>
                                        <th className='text-right p-2'>Total</th>
                                        <th className='text-right p-2'>Profit</th>
                                        <th className='text-left p-2'>Payment</th>
                                        <th className='text-left p-2'>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBills.map(bill => (
                                        <tr key={bill.id} className='border-b hover:bg-muted/50'>
                                            <td className='p-2 font-medium'>{bill.billNumber}</td>
                                            <td className='p-2'>{bill.billDate?.toDate().toLocaleDateString()}</td>
                                            <td className='p-2'>{bill.customerName}</td>
                                            <td className='p-2 text-right font-semibold'>{formatCurrency(bill.totalAmount)}</td>
                                            <td className='p-2 text-right font-semibold text-green-600'>{formatCurrency(bill.totalProfit || 0)}</td>
                                            <td className='p-2 capitalize'>{bill.paymentMethod}</td>
                                            <td className='p-2'>
                                                <span
                                                    className={`text-xs px-2 py-1 rounded ${
                                                        bill.paymentStatus === 'paid'
                                                            ? 'bg-green-100 text-green-800'
                                                            : bill.paymentStatus === 'partial'
                                                              ? 'bg-yellow-100 text-yellow-800'
                                                              : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {bill.paymentStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
