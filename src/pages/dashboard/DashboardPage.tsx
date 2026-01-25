import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, DollarSign, ExternalLink, FileText, Package, Users, XCircle } from 'lucide-react';
import { Timestamp, collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { Bill } from '@/lib/types';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface DashboardStats {
    todayBillsAmount: number;
    todayBillsCount: number;
    totalCustomers: number;
    totalProducts: number;
}

export default function DashboardPage() {
    const { userData } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        todayBillsAmount: 0,
        todayBillsCount: 0,
        totalCustomers: 0,
        totalProducts: 0,
    });
    const [recentBills, setRecentBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData?.shopId) {
            fetchDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData?.shopId]);

    const fetchDashboardData = async () => {
        if (!userData?.shopId) {
            console.log('No shopId found, userData:', userData);
            return;
        }

        console.log('Fetching dashboard data for shopId:', userData.shopId);

        try {
            setLoading(true);

            // Get today's start and end timestamps
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = Timestamp.fromDate(today);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const todayEnd = Timestamp.fromDate(tomorrow);

            console.log('Today range:', { todayStart: todayStart.toDate(), todayEnd: todayEnd.toDate() });

            // Fetch today's bills
            const billsQuery = query(collection(db, 'bills'), where('shopId', '==', userData.shopId), where('createdAt', '>=', todayStart), where('createdAt', '<', todayEnd));
            const billsSnapshot = await getDocs(billsQuery);
            const todayBills = billsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Bill);

            console.log('Today bills fetched:', todayBills.length, todayBills);

            const todayBillsAmount = todayBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
            const todayBillsCount = todayBills.length;

            // Fetch total customers
            const customersQuery = query(collection(db, 'customers'), where('shopId', '==', userData.shopId), where('isActive', '==', true));
            const customersSnapshot = await getDocs(customersQuery);
            const totalCustomers = customersSnapshot.size;

            console.log('Total customers:', totalCustomers);

            // Fetch total products
            const productsQuery = query(collection(db, 'products'), where('shopId', '==', userData.shopId), where('isActive', '==', true));
            const productsSnapshot = await getDocs(productsQuery);
            const totalProducts = productsSnapshot.size;

            console.log('Total products:', totalProducts);

            // Fetch recent 15 bills
            const recentBillsQuery = query(collection(db, 'bills'), where('shopId', '==', userData.shopId), orderBy('createdAt', 'desc'), limit(15));
            const recentBillsSnapshot = await getDocs(recentBillsQuery);
            const recentBillsData = recentBillsSnapshot.docs.map(
                doc =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    }) as Bill,
            );

            console.log('Recent bills fetched:', recentBillsData.length, recentBillsData);

            setStats({
                todayBillsAmount,
                todayBillsCount,
                totalCustomers,
                totalProducts,
            });
            setRecentBills(recentBillsData);

            console.log('Dashboard data set successfully');
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (bill: Bill) => {
        if (bill.paymentStatus === 'paid') {
            return (
                <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>
                    <CheckCircle className='w-3 h-3' />
                    Paid
                </span>
            );
        } else if (bill.paymentStatus === 'partial') {
            return (
                <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700'>
                    <Clock className='w-3 h-3' />
                    Partial
                </span>
            );
        } else {
            return (
                <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700'>
                    <XCircle className='w-3 h-3' />
                    Pending
                </span>
            );
        }
    };

    const formatDate = (timestamp: Timestamp) => {
        return timestamp.toDate().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center h-64'>
                <div className='text-lg text-muted-foreground'>Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-3xl font-bold'>Dashboard</h1>
                <p className='text-muted-foreground'>Overview of your business today</p>
            </div>

            {/* Statistics Cards */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                        <CardTitle className='text-sm font-medium'>Today's Revenue</CardTitle>
                        <DollarSign className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-bold'>{formatCurrency(stats.todayBillsAmount)}</div>
                        <p className='text-xs text-muted-foreground'>From {stats.todayBillsCount} bills</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                        <CardTitle className='text-sm font-medium'>Today's Bills</CardTitle>
                        <FileText className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-bold'>{stats.todayBillsCount}</div>
                        <p className='text-xs text-muted-foreground'>Total bills created today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                        <CardTitle className='text-sm font-medium'>Total Customers</CardTitle>
                        <Users className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-bold'>{stats.totalCustomers}</div>
                        <p className='text-xs text-muted-foreground'>Active customers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                        <CardTitle className='text-sm font-medium'>Total Products</CardTitle>
                        <Package className='h-4 w-4 text-muted-foreground' />
                    </CardHeader>
                    <CardContent>
                        <div className='text-2xl font-bold'>{stats.totalProducts}</div>
                        <p className='text-xs text-muted-foreground'>Products in inventory</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Bills */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Bills</CardTitle>
                    <CardDescription>Last 15 bills created</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='overflow-x-auto'>
                        <table className='w-full'>
                            <thead>
                                <tr className='border-b'>
                                    <th className='text-left py-3 px-4 font-medium text-sm'>Bill No</th>
                                    <th className='text-left py-3 px-4 font-medium text-sm'>Customer</th>
                                    <th className='text-left py-3 px-4 font-medium text-sm'>Date</th>
                                    <th className='text-right py-3 px-4 font-medium text-sm'>Amount</th>
                                    <th className='text-right py-3 px-4 font-medium text-sm'>Balance</th>
                                    <th className='text-center py-3 px-4 font-medium text-sm'>Status</th>
                                    <th className='text-center py-3 px-4 font-medium text-sm'>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentBills.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className='text-center py-8 text-muted-foreground'>
                                            No bills found
                                        </td>
                                    </tr>
                                ) : (
                                    recentBills.map(bill => (
                                        <tr key={bill.id} className='border-b hover:bg-muted/50'>
                                            <td className='py-3 px-4 font-mono text-sm'>{bill.billNumber}</td>
                                            <td className='py-3 px-4'>{bill.customerName}</td>
                                            <td className='py-3 px-4 text-sm text-muted-foreground'>{formatDate(bill.createdAt)}</td>
                                            <td className='py-3 px-4 text-right font-medium'>{formatCurrency(bill.totalAmount)}</td>
                                            <td className='py-3 px-4 text-right font-medium'>{formatCurrency(bill.balanceAmount)}</td>
                                            <td className='py-3 px-4 text-center'>{getStatusBadge(bill)}</td>
                                            <td className='py-3 px-4 text-center'>
                                                <button
                                                    onClick={() => window.open(`/invoice/${bill.id}`, '_blank')}
                                                    className='text-blue-600 hover:text-blue-800 transition-colors'
                                                    title='View Invoice'
                                                >
                                                    <ExternalLink className='h-4 w-4' />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
