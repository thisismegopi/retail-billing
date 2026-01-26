import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ChevronLeft, ChevronRight, Clock, DollarSign, FileText, Package, Search, Users, XCircle } from 'lucide-react';
import { DocumentSnapshot, Timestamp, collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { Bill } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import invoiceIcon from '@/assets/icons/pdf.png';
import { useAuth } from '@/hooks/useAuth';

interface DashboardStats {
    todayBillsAmount: number;
    todayBillsCount: number;
    totalCustomers: number;
    totalProducts: number;
}

const BILLS_PER_PAGE = 20;

export default function DashboardPage() {
    const { userData } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        todayBillsAmount: 0,
        todayBillsCount: 0,
        totalCustomers: 0,
        totalProducts: 0,
    });
    const [bills, setBills] = useState<Bill[]>([]);
    const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (userData?.shopId) {
            fetchDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData?.shopId]);

    useEffect(() => {
        // Filter bills based on search term
        if (searchTerm.trim() === '') {
            setFilteredBills(bills);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = bills.filter(bill => bill.billNumber.toLowerCase().includes(term) || bill.customerName.toLowerCase().includes(term));
            setFilteredBills(filtered);
        }
        setCurrentPage(1); // Reset to first page when search changes
    }, [searchTerm, bills]);

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

            // Fetch all bills with pagination (initial load - first 20)
            await fetchBills(true);

            setStats({
                todayBillsAmount,
                todayBillsCount,
                totalCustomers,
                totalProducts,
            });

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

    const fetchBills = async (isInitial = false) => {
        if (!userData?.shopId) return;

        try {
            let billsQuery;

            if (isInitial) {
                // Initial load - get first 20 bills
                billsQuery = query(
                    collection(db, 'bills'),
                    where('shopId', '==', userData.shopId),
                    orderBy('createdAt', 'desc'),
                    limit(BILLS_PER_PAGE + 1), // Fetch one extra to check if there are more
                );
            } else if (lastDoc) {
                // Load next page
                billsQuery = query(collection(db, 'bills'), where('shopId', '==', userData.shopId), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(BILLS_PER_PAGE + 1));
            } else {
                return;
            }

            const billsSnapshot = await getDocs(billsQuery);
            const fetchedBills = billsSnapshot.docs.slice(0, BILLS_PER_PAGE).map(
                doc =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    }) as Bill,
            );

            // Check if there are more bills
            setHasMore(billsSnapshot.docs.length > BILLS_PER_PAGE);

            // Set last document for pagination
            if (billsSnapshot.docs.length > 0) {
                setLastDoc(billsSnapshot.docs[Math.min(BILLS_PER_PAGE - 1, billsSnapshot.docs.length - 1)]);
            }

            if (isInitial) {
                setBills(fetchedBills);
            } else {
                setBills(prev => [...prev, ...fetchedBills]);
            }

            console.log('Bills fetched:', fetchedBills.length);
        } catch (error) {
            console.error('Error fetching bills:', error);
        }
    };

    const handleLoadMore = async () => {
        if (!hasMore) return;
        await fetchBills(false);
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

    // Pagination for filtered results
    const totalPages = Math.ceil(filteredBills.length / BILLS_PER_PAGE);
    const startIndex = (currentPage - 1) * BILLS_PER_PAGE;
    const endIndex = startIndex + BILLS_PER_PAGE;
    const currentBills = filteredBills.slice(startIndex, endIndex);

    const handlePreviousPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        } else if (hasMore && searchTerm === '') {
            // Load more bills from Firebase if at the end and no search active
            handleLoadMore();
        }
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

            {/* All Bills with Pagination */}
            <Card>
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div>
                            <CardTitle>All Bills</CardTitle>
                            <CardDescription>{searchTerm ? `Showing ${filteredBills.length} results` : `Showing ${bills.length} bills`}</CardDescription>
                        </div>
                        <div className='relative w-64'>
                            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                            <Input placeholder='Search by bill number or customer...' value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className='pl-8' />
                        </div>
                    </div>
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
                                    <th className='text-center py-3 px-4 font-medium text-sm'>Invoice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentBills.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className='text-center py-8 text-muted-foreground'>
                                            {searchTerm ? 'No bills found matching your search' : 'No bills found'}
                                        </td>
                                    </tr>
                                ) : (
                                    currentBills.map(bill => (
                                        <tr key={bill.id} className='border-b hover:bg-muted/50'>
                                            <td className='py-3 px-4 font-mono text-sm'>{bill.billNumber}</td>
                                            <td className='py-3 px-4'>{bill.customerName}</td>
                                            <td className='py-3 px-4 text-sm text-muted-foreground'>{formatDate(bill.createdAt)}</td>
                                            <td className='py-3 px-4 text-right font-medium'>{formatCurrency(bill.totalAmount)}</td>
                                            <td className='py-3 px-4 text-right font-medium'>{formatCurrency(bill.balanceAmount)}</td>
                                            <td className='py-3 px-4 text-center'>{getStatusBadge(bill)}</td>
                                            <td className='py-3 px-4 text-center'>
                                                <Link to={`/invoice/${bill.id}`} title='View Invoice'>
                                                    <img src={invoiceIcon} alt='Invoice' className='w-6 h-6' />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredBills.length > 0 && (
                        <div className='flex items-center justify-between mt-4 pt-4 border-t'>
                            <div className='text-sm text-muted-foreground'>
                                Showing {startIndex + 1} to {Math.min(endIndex, filteredBills.length)} of {filteredBills.length} bills
                            </div>
                            <div className='flex gap-2'>
                                <Button variant='outline' size='sm' onClick={handlePreviousPage} disabled={currentPage === 1}>
                                    <ChevronLeft className='h-4 w-4 mr-1' />
                                    Previous
                                </Button>
                                <div className='flex items-center px-3 text-sm'>
                                    Page {currentPage} {searchTerm === '' && hasMore ? '+' : `of ${totalPages}`}
                                </div>
                                <Button variant='outline' size='sm' onClick={handleNextPage} disabled={currentPage >= totalPages && (!hasMore || searchTerm !== '')}>
                                    Next
                                    <ChevronRight className='h-4 w-4 ml-1' />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
