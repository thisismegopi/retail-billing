import type { Bill, Customer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Timestamp, addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function CollectionsPage() {
    const { userData } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [unpaidBills, setUnpaidBills] = useState<Bill[]>([]);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchCustomersWithOutstanding();
    }, [userData]);

    const fetchCustomersWithOutstanding = async () => {
        if (!userData?.shopId) return;

        // Fetch all customers for this shop (avoid compound index requirement)
        const q = query(collection(db, 'customers'), where('shopId', '==', userData.shopId));
        const snapshot = await getDocs(q);
        const allCustomers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Customer);

        // Filter client-side for customers with outstanding balance
        const customersWithOutstanding = allCustomers.filter(c => c.outstandingBalance > 0);
        setCustomers(customersWithOutstanding);
    };

    const fetchUnpaidBills = async (customerId: string) => {
        if (!userData?.shopId) return;

        const q = query(collection(db, 'bills'), where('shopId', '==', userData.shopId), where('customerId', '==', customerId), where('paymentStatus', 'in', ['unpaid', 'partial']));
        const snapshot = await getDocs(q);
        const billList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Bill);
        setUnpaidBills(billList);
    };

    const handleCustomerSelect = async (customer: Customer) => {
        setSelectedCustomer(customer);
        await fetchUnpaidBills(customer.id!);
    };

    const handlePaymentSubmit = async () => {
        if (!selectedBill || !selectedCustomer || !paymentAmount) return;

        const amount = parseFloat(paymentAmount);
        if (amount <= 0 || amount > selectedBill.balanceAmount) {
            toast.error('Invalid payment amount');
            return;
        }

        setIsProcessing(true);
        try {
            // Record payment in collections
            await addDoc(collection(db, 'collections'), {
                billId: selectedBill.id,
                customerId: selectedCustomer.id,
                amount,
                paymentMethod,
                paymentDate: Timestamp.now(),
                shopId: userData?.shopId,
            });

            // Update bill
            const newPaidAmount = selectedBill.paidAmount + amount;
            const newBalanceAmount = selectedBill.balanceAmount - amount;
            const newPaymentStatus = newBalanceAmount === 0 ? 'paid' : 'partial';

            await updateDoc(doc(db, 'bills', selectedBill.id!), {
                paidAmount: newPaidAmount,
                balanceAmount: newBalanceAmount,
                paymentStatus: newPaymentStatus,
            });

            // Update customer outstanding
            const newOutstanding = selectedCustomer.outstandingBalance - amount;
            await updateDoc(doc(db, 'customers', selectedCustomer.id!), {
                outstandingBalance: newOutstanding,
            });

            toast.success('Payment recorded successfully!');
            setShowPaymentDialog(false);
            setPaymentAmount('');

            // Refresh data
            await fetchCustomersWithOutstanding();
            if (selectedCustomer.id) {
                await fetchUnpaidBills(selectedCustomer.id);
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error('Failed to record payment');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className='space-y-6'>
            <h2 className='text-3xl font-bold tracking-tight'>Collections & Payments</h2>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                {/* Customers with Outstanding */}
                <Card>
                    <CardHeader>
                        <CardTitle>Customers with Outstanding</CardTitle>
                        <CardDescription>Select a customer to view unpaid bills</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {customers.length === 0 ? (
                            <p className='text-gray-500 text-center py-8'>No customers with outstanding balance.</p>
                        ) : (
                            <div className='space-y-2'>
                                {customers.map(customer => (
                                    <div
                                        key={customer.id}
                                        className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${selectedCustomer?.id === customer.id ? 'bg-blue-50 border-blue-500' : ''}`}
                                        onClick={() => handleCustomerSelect(customer)}
                                    >
                                        <div className='flex justify-between items-center'>
                                            <div>
                                                <p className='font-medium'>{customer.name}</p>
                                                <p className='text-sm text-gray-500'>{customer.phone}</p>
                                            </div>
                                            <p className='font-semibold text-red-600'>{formatCurrency(customer.outstandingBalance)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Unpaid Bills */}
                <Card>
                    <CardHeader>
                        <CardTitle>Unpaid Bills</CardTitle>
                        <CardDescription>{selectedCustomer ? `Bills for ${selectedCustomer.name}` : 'Select a customer to view bills'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!selectedCustomer ? (
                            <p className='text-gray-500 text-center py-8'>Select a customer from the left.</p>
                        ) : unpaidBills.length === 0 ? (
                            <p className='text-gray-500 text-center py-8'>No unpaid bills for this customer.</p>
                        ) : (
                            <div className='space-y-2'>
                                {unpaidBills.map(bill => (
                                    <div key={bill.id} className='p-3 border rounded'>
                                        <div className='flex justify-between items-start mb-2'>
                                            <div>
                                                <p className='font-medium'>{bill.billNumber}</p>
                                                <p className='text-sm text-gray-500'>{bill.billDate?.toDate().toLocaleDateString()}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${bill.paymentStatus === 'unpaid' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {bill.paymentStatus}
                                            </span>
                                        </div>
                                        <div className='flex justify-between items-center text-sm'>
                                            <span>Total: {formatCurrency(bill.totalAmount)}</span>
                                            <span className='font-semibold text-red-600'>Due: {formatCurrency(bill.balanceAmount)}</span>
                                        </div>
                                        <Button
                                            size='sm'
                                            className='w-full mt-2'
                                            onClick={() => {
                                                setSelectedBill(bill);
                                                setPaymentAmount(bill.balanceAmount.toString());
                                                setShowPaymentDialog(true);
                                            }}
                                        >
                                            Collect Payment
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>
                            Bill: {selectedBill?.billNumber} | Due: {formatCurrency(selectedBill?.balanceAmount || 0)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4 py-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='amount'>Payment Amount</Label>
                            <Input id='amount' type='number' step='0.01' value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder='0.00' />
                        </div>

                        <div className='space-y-2'>
                            <Label>Payment Method</Label>
                            <div className='grid grid-cols-3 gap-2'>
                                {(['cash', 'card', 'upi'] as const).map(method => (
                                    <Button key={method} variant={paymentMethod === method ? 'default' : 'outline'} onClick={() => setPaymentMethod(method)} className='capitalize'>
                                        {method}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className='flex gap-2 pt-4'>
                            <Button variant='outline' onClick={() => setShowPaymentDialog(false)} className='flex-1'>
                                Cancel
                            </Button>
                            <Button onClick={handlePaymentSubmit} disabled={isProcessing} className='flex-1'>
                                {isProcessing ? 'Processing...' : 'Record Payment'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
