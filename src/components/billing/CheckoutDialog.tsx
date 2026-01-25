import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Timestamp, addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';

import type { Bill } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { generateBillNumber } from '@/lib/billUtils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useState } from 'react';

interface CheckoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CheckoutDialog({ open, onOpenChange }: CheckoutDialogProps) {
    const { user, userData } = useAuth();
    const { items, customerName, customerId, customerType, subtotal, discount, taxAmount, totalAmount, clearCart } = useCart();
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash');
    const [cashTendered, setCashTendered] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Calculate change to return
    const cashAmount = parseFloat(cashTendered) || 0;
    const changeToReturn = cashAmount > totalAmount ? cashAmount - totalAmount : 0;

    const handleCheckout = async () => {
        if (!userData?.shopId || !user) {
            toast.error('User not authenticated');
            return;
        }

        // Validate credit sale BEFORE creating bill
        if (paymentMethod === 'credit') {
            if (!customerId) {
                toast.error('Please select a customer for credit sales');
                return;
            }
        }

        setIsProcessing(true);
        try {
            const billNumber = generateBillNumber();
            const bill: Omit<Bill, 'id'> = {
                shopId: userData.shopId,
                billNumber,
                billDate: Timestamp.now(),
                ...(customerId && { customerId }), // Only include customerId if it exists
                customerName,
                customerType,
                items,
                subtotal,
                discount,
                taxAmount,
                totalAmount,
                paidAmount: paymentMethod === 'credit' ? 0 : totalAmount,
                balanceAmount: paymentMethod === 'credit' ? totalAmount : 0,
                paymentStatus: paymentMethod === 'credit' ? 'unpaid' : 'paid',
                paymentMethod,
                billStatus: 'active',
                createdBy: user.uid,
                createdAt: Timestamp.now(),
            };

            // Save bill
            const billRef = await addDoc(collection(db, 'bills'), bill);

            // Decrement stock for each item (client-side, no transactions for simplicity)
            for (const item of items) {
                const productRef = doc(db, 'products', item.productId);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    const currentStock = productSnap.data().currentStock || 0;
                    await updateDoc(productRef, {
                        currentStock: currentStock - item.quantity,
                    });
                }
            }

            // If credit sale, update customer outstanding
            if (paymentMethod === 'credit') {
                // customerId is guaranteed to exist due to validation above
                const customerRef = doc(db, 'customers', customerId!);
                const customerSnap = await getDoc(customerRef);

                if (customerSnap.exists()) {
                    const currentOutstanding = customerSnap.data().outstandingBalance || 0;
                    await updateDoc(customerRef, {
                        outstandingBalance: currentOutstanding + totalAmount,
                    });
                }
            }

            toast.success(`Bill ${billNumber} created successfully!`);
            clearCart();
            onOpenChange(false);

            // Open invoice in new tab
            window.open(`/invoice/${billRef.id}`, '_blank');
        } catch (error) {
            console.error('Error creating bill:', error);
            toast.error('Failed to create bill. Please try again');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Checkout</DialogTitle>
                    <DialogDescription>Select payment method and confirm the bill.</DialogDescription>
                </DialogHeader>

                <div className='space-y-4 py-4'>
                    <div className='space-y-2'>
                        <Label>Payment Method</Label>
                        <div className='grid grid-cols-2 gap-2'>
                            {(['cash', 'card', 'upi', 'credit'] as const).map(method => (
                                <Button key={method} variant={paymentMethod === method ? 'default' : 'outline'} onClick={() => setPaymentMethod(method)} className='uppercase'>
                                    {method}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Cash Tendered Input - Only show for cash payments */}
                    {paymentMethod === 'cash' && (
                        <div className='space-y-2 border-t pt-4'>
                            <Label htmlFor='cashTendered'>Cash Received</Label>
                            <Input id='cashTendered' type='number' placeholder='Enter amount received' value={cashTendered} onChange={e => setCashTendered(e.target.value)} step='0.01' min='0' />
                            {cashAmount > 0 && (
                                <div className='text-sm space-y-1'>
                                    {cashAmount >= totalAmount ? (
                                        <p className='text-green-600 font-medium'>Change to return: {formatCurrency(changeToReturn)}</p>
                                    ) : (
                                        <p className='text-red-600 font-medium'>Insufficient amount (Short by {formatCurrency(totalAmount - cashAmount)})</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className='border-t pt-4 space-y-2'>
                        <div className='flex justify-between'>
                            <span>Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className='flex justify-between'>
                            <span>Discount:</span>
                            <span className='text-red-600'>-{formatCurrency(discount)}</span>
                        </div>
                        <div className='flex justify-between'>
                            <span>Tax:</span>
                            <span>{formatCurrency(taxAmount)}</span>
                        </div>
                        <div className='flex justify-between font-bold text-lg border-t pt-2'>
                            <span>Total:</span>
                            <span className='text-green-600'>{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>

                    <div className='flex gap-2 pt-4'>
                        <Button variant='outline' onClick={() => onOpenChange(false)} className='flex-1'>
                            Cancel
                        </Button>
                        <Button onClick={handleCheckout} disabled={isProcessing || (paymentMethod === 'cash' && cashAmount < totalAmount)} className='flex-1'>
                            {isProcessing ? 'Processing...' : 'Confirm & Save'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
