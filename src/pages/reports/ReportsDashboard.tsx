import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Bill, Customer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function ReportsDashboard() {
    const { userData } = useAuth();
    const [totalSales, setTotalSales] = useState(0);
    const [totalOutstanding, setTotalOutstanding] = useState(0);
    const [billCount, setBillCount] = useState(0);
    const [todaySales, setTodaySales] = useState(0);
    const [salesData, setSalesData] = useState<Array<{ date: string; amount: number }>>([]);

    const fetchMetrics = async () => {
        if (!userData?.shopId) return;

        try {
            // Fetch all bills
            const billsQuery = query(collection(db, 'bills'), where('shopId', '==', userData.shopId), where('billStatus', '==', 'active'));
            const billsSnap = await getDocs(billsQuery);
            const bills = billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Bill);

            // Calculate total sales
            const total = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
            setTotalSales(total);
            setBillCount(bills.length);

            // Calculate today's sales
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayBills = bills.filter(bill => {
                const billDate = bill.billDate?.toDate();
                return billDate && billDate >= today;
            });
            const todayTotal = todayBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
            setTodaySales(todayTotal);

            // Prepare sales chart data (last 7 days)
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                const dayBills = bills.filter(bill => {
                    const billDate = bill.billDate?.toDate();
                    return billDate && billDate >= date && billDate < nextDate;
                });
                const dayTotal = dayBills.reduce((sum, bill) => sum + bill.totalAmount, 0);

                last7Days.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    amount: dayTotal,
                });
            }
            setSalesData(last7Days);

            // Fetch customers with outstanding
            const customersQuery = query(collection(db, 'customers'), where('shopId', '==', userData.shopId));
            const customersSnap = await getDocs(customersQuery);
            const customers = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Customer);
            const outstanding = customers.reduce((sum, customer) => sum + customer.outstandingBalance, 0);
            setTotalOutstanding(outstanding);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        }
    };

    useEffect(() => {
        fetchMetrics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData]);

    return (
        <div className='space-y-6'>
            <h2 className='text-3xl font-bold tracking-tight'>Reports Dashboard</h2>

            {/* Key Metrics */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                <Card>
                    <CardHeader className='pb-2'>
                        <CardDescription>Total Sales</CardDescription>
                        <CardTitle className='text-3xl'>{formatCurrency(totalSales)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className='text-xs text-gray-500'>{billCount} bills</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='pb-2'>
                        <CardDescription>Today's Sales</CardDescription>
                        <CardTitle className='text-3xl'>{formatCurrency(todaySales)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className='text-xs text-gray-500'>Current day</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='pb-2'>
                        <CardDescription>Outstanding</CardDescription>
                        <CardTitle className='text-3xl text-red-600'>{formatCurrency(totalOutstanding)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className='text-xs text-gray-500'>Pending collections</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='pb-2'>
                        <CardDescription>Total Bills</CardDescription>
                        <CardTitle className='text-3xl'>{billCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className='text-xs text-gray-500'>All time</p>
                    </CardContent>
                </Card>
            </div>

            {/* Sales Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
                    <CardDescription>Daily sales overview</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width='100%' height={300}>
                        <BarChart data={salesData}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='date' />
                            <YAxis />
                            <Tooltip formatter={value => formatCurrency(Number(value))} />
                            <Bar dataKey='amount' fill='#3b82f6' />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
