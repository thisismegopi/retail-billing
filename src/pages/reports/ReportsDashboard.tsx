import type { Bill, Customer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface CustomerReport {
    customerId: string | null;
    customerName: string;
    totalBillAmount: number;
    outstandingAmount: number;
    billCount: number;
}

interface CategoryReport {
    categoryId: string;
    categoryName: string;
    totalSales: number;
    quantitySold: number;
}

interface ProductReport {
    productId: string;
    productName: string;
    sku: string;
    totalSales: number;
    quantitySold: number;
    categoryName: string;
}

export default function ReportsDashboard() {
    const { userData } = useAuth();

    // Date range state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Report data state
    const [customerReports, setCustomerReports] = useState<CustomerReport[]>([]);
    const [categoryReports, setCategoryReports] = useState<CategoryReport[]>([]);
    const [productReports, setProductReports] = useState<ProductReport[]>([]);

    // Summary metrics
    const [totalSales, setTotalSales] = useState(0);
    const [totalOutstanding, setTotalOutstanding] = useState(0);
    const [billCount, setBillCount] = useState(0);
    const [totalTax, setTotalTax] = useState(0);

    // Initialize with current month dates
    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
    }, []);

    const calculateReports = useCallback((filteredBills: Bill[], customerList: Customer[]) => {
        // Calculate summary metrics
        const total = filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
        const tax = filteredBills.reduce((sum, bill) => sum + bill.taxAmount, 0);
        const outstanding = customerList.reduce((sum, customer) => sum + customer.outstandingBalance, 0);

        setTotalSales(total);
        setTotalTax(tax);
        setBillCount(filteredBills.length);
        setTotalOutstanding(outstanding);

        // Calculate customer-wise reports
        const customerMap = new Map<string, CustomerReport>();

        filteredBills.forEach(bill => {
            const key = bill.customerId || 'walk-in';
            const existing = customerMap.get(key) || {
                customerId: bill.customerId || null,
                customerName: bill.customerName,
                totalBillAmount: 0,
                outstandingAmount: 0,
                billCount: 0,
            };

            existing.totalBillAmount += bill.totalAmount;
            existing.billCount += 1;
            customerMap.set(key, existing);
        });

        // Add outstanding from customers collection
        customerList.forEach(customer => {
            const existing = customerMap.get(customer.id!);
            if (existing) {
                existing.outstandingAmount = customer.outstandingBalance;
            }
        });

        setCustomerReports(Array.from(customerMap.values()).sort((a, b) => b.totalBillAmount - a.totalBillAmount));

        // Calculate category-wise reports
        const categoryMap = new Map<string, CategoryReport>();

        filteredBills.forEach(bill => {
            bill.items.forEach(item => {
                const key = item.categoryId || 'uncategorized';
                const existing = categoryMap.get(key) || {
                    categoryId: key,
                    categoryName: item.categoryName || 'Uncategorized',
                    totalSales: 0,
                    quantitySold: 0,
                };

                existing.totalSales += item.totalAmount;
                existing.quantitySold += item.quantity;
                categoryMap.set(key, existing);
            });
        });

        setCategoryReports(Array.from(categoryMap.values()).sort((a, b) => b.totalSales - a.totalSales));

        // Calculate product-wise reports
        const productMap = new Map<string, ProductReport>();

        filteredBills.forEach(bill => {
            bill.items.forEach(item => {
                const existing = productMap.get(item.productId) || {
                    productId: item.productId,
                    productName: item.productName,
                    sku: item.sku,
                    totalSales: 0,
                    quantitySold: 0,
                    categoryName: item.categoryName || 'Uncategorized',
                };

                existing.totalSales += item.totalAmount;
                existing.quantitySold += item.quantity;
                productMap.set(item.productId, existing);
            });
        });

        setProductReports(Array.from(productMap.values()).sort((a, b) => b.totalSales - a.totalSales));
    }, []);

    const fetchData = useCallback(async () => {
        if (!userData?.shopId || !startDate || !endDate) return;

        try {
            // Fetch all bills
            const billsQuery = query(collection(db, 'bills'), where('shopId', '==', userData.shopId), where('billStatus', '==', 'active'));
            const billsSnap = await getDocs(billsQuery);
            const allBills = billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Bill);

            // Filter bills by date range
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const filteredBills = allBills.filter(bill => {
                const billDate = bill.billDate?.toDate();
                return billDate && billDate >= start && billDate <= end;
            });

            // Fetch products to get category information
            const productsQuery = query(collection(db, 'products'), where('shopId', '==', userData.shopId));
            const productsSnap = await getDocs(productsQuery);
            const productsMap = new Map<string, { categoryId?: string; categoryName?: string }>();
            productsSnap.docs.forEach(doc => {
                const product = doc.data();
                productsMap.set(doc.id, {
                    categoryId: product.categoryId,
                    categoryName: product.categoryName,
                });
            });

            // Enrich bill items with category information if missing
            const enrichedBills = filteredBills.map(bill => ({
                ...bill,
                items: bill.items.map(item => {
                    // If item already has category info, use it
                    if (item.categoryId && item.categoryName) {
                        return item;
                    }
                    // Otherwise, look it up from products
                    const productInfo = productsMap.get(item.productId);
                    return {
                        ...item,
                        categoryId: productInfo?.categoryId || 'uncategorized',
                        categoryName: productInfo?.categoryName || 'Uncategorized',
                    };
                }),
            }));

            // Fetch customers
            const customersQuery = query(collection(db, 'customers'), where('shopId', '==', userData.shopId));
            const customersSnap = await getDocs(customersQuery);
            const customerList = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Customer);

            // Calculate reports with enriched data
            calculateReports(enrichedBills, customerList);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }, [userData, startDate, endDate, calculateReports]);

    // Fetch data when userData or dates change
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className='space-y-6'>
            <h2 className='text-3xl font-bold tracking-tight'>Reports Dashboard</h2>

            {/* Date Range Filter */}
            <Card>
                <CardHeader>
                    <CardTitle>Date Range Filter</CardTitle>
                    <CardDescription>Select date range to view reports</CardDescription>
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

            {/* Summary Metrics */}
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
                        <CardDescription>Total Tax</CardDescription>
                        <CardTitle className='text-3xl'>{formatCurrency(totalTax)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className='text-xs text-gray-500'>Tax collected</p>
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
                        <p className='text-xs text-gray-500'>In date range</p>
                    </CardContent>
                </Card>
            </div>

            {/* Customer-Wise Report */}
            <Card>
                <CardHeader>
                    <CardTitle>Customer-Wise Report</CardTitle>
                    <CardDescription>Bill amount and outstanding by customer</CardDescription>
                </CardHeader>
                <CardContent>
                    {customerReports.length === 0 ? (
                        <p className='text-gray-500 text-center py-8'>No data available for selected date range</p>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead>
                                    <tr className='border-b'>
                                        <th className='text-left p-2'>Customer</th>
                                        <th className='text-right p-2'>Bill Amount</th>
                                        <th className='text-right p-2'>Outstanding</th>
                                        <th className='text-center p-2'>Bills</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerReports.map((report, index) => (
                                        <tr key={index} className='border-b hover:bg-gray-50'>
                                            <td className='p-2'>{report.customerName}</td>
                                            <td className='p-2 text-right font-semibold'>{formatCurrency(report.totalBillAmount)}</td>
                                            <td className='p-2 text-right text-red-600 font-semibold'>{formatCurrency(report.outstandingAmount)}</td>
                                            <td className='p-2 text-center'>{report.billCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Category-Wise Report */}
            <Card>
                <CardHeader>
                    <CardTitle>Category-Wise Report</CardTitle>
                    <CardDescription>Sales and quantity by category</CardDescription>
                </CardHeader>
                <CardContent>
                    {categoryReports.length === 0 ? (
                        <p className='text-gray-500 text-center py-8'>No data available for selected date range</p>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead>
                                    <tr className='border-b'>
                                        <th className='text-left p-2'>Category</th>
                                        <th className='text-right p-2'>Total Sales</th>
                                        <th className='text-right p-2'>Quantity Sold</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryReports.map((report, index) => (
                                        <tr key={index} className='border-b hover:bg-gray-50'>
                                            <td className='p-2'>{report.categoryName}</td>
                                            <td className='p-2 text-right font-semibold'>{formatCurrency(report.totalSales)}</td>
                                            <td className='p-2 text-right'>{report.quantitySold}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Product-Wise Report */}
            <Card>
                <CardHeader>
                    <CardTitle>Product-Wise Report</CardTitle>
                    <CardDescription>Sales and quantity by product</CardDescription>
                </CardHeader>
                <CardContent>
                    {productReports.length === 0 ? (
                        <p className='text-gray-500 text-center py-8'>No data available for selected date range</p>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead>
                                    <tr className='border-b'>
                                        <th className='text-left p-2'>Product</th>
                                        <th className='text-left p-2'>SKU</th>
                                        <th className='text-left p-2'>Category</th>
                                        <th className='text-right p-2'>Total Sales</th>
                                        <th className='text-right p-2'>Quantity Sold</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productReports.map((report, index) => (
                                        <tr key={index} className='border-b hover:bg-gray-50'>
                                            <td className='p-2'>{report.productName}</td>
                                            <td className='p-2 text-sm text-gray-600'>{report.sku}</td>
                                            <td className='p-2 text-sm'>{report.categoryName}</td>
                                            <td className='p-2 text-right font-semibold'>{formatCurrency(report.totalSales)}</td>
                                            <td className='p-2 text-right'>{report.quantitySold}</td>
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
