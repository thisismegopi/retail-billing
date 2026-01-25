import type { Bill, Shop } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { useParams } from 'react-router-dom';

export default function InvoicePage() {
    const { billId } = useParams<{ billId: string }>();
    const [bill, setBill] = useState<Bill | null>(null);
    const [shopDetails, setShopDetails] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBillData = async () => {
            if (!billId) return;

            try {
                // Fetch bill
                const billDoc = await getDoc(doc(db, 'bills', billId));
                if (billDoc.exists()) {
                    const billData = { id: billDoc.id, ...billDoc.data() } as Bill;
                    setBill(billData);

                    // Fetch shop details
                    const shopDoc = await getDoc(doc(db, 'shops', billData.shopId));
                    if (shopDoc.exists()) {
                        setShopDetails({ id: shopDoc.id, ...shopDoc.data() } as Shop);
                    }
                }
            } catch (error) {
                console.error('Error fetching bill:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBillData();
    }, [billId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='text-lg'>Loading invoice...</div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='text-lg text-red-600'>Bill not found</div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-50 p-8'>
            <div className='max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden'>
                {/* Print Button - Hidden when printing */}
                <div className='p-4 bg-gray-100 border-b print:hidden'>
                    <button onClick={handlePrint} className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'>
                        Print Invoice
                    </button>
                </div>

                {/* Invoice Content */}
                <div className='p-8'>
                    {/* Header */}
                    <div className='text-center mb-8 border-b pb-6'>
                        <h1 className='text-3xl font-bold text-gray-800'>{shopDetails?.name || 'Shop'}</h1>
                        {shopDetails?.address && <p className='text-sm text-gray-600 mt-1'>{shopDetails.address}</p>}
                        <div className='flex justify-center gap-4 mt-2 text-sm text-gray-600'>
                            {shopDetails?.phone && <span>Phone: {shopDetails.phone}</span>}
                            {shopDetails?.email && <span>Email: {shopDetails.email}</span>}
                        </div>
                        {shopDetails?.gstNumber && <p className='text-sm text-gray-600 mt-1'>GST: {shopDetails.gstNumber}</p>}
                        <p className='text-sm font-semibold text-gray-700 mt-3'>INVOICE</p>
                    </div>

                    {/* Bill Info */}
                    <div className='grid grid-cols-2 gap-4 mb-8 pb-4 border-b'>
                        <div>
                            <p className='text-sm text-gray-600'>Bill Number</p>
                            <p className='font-semibold text-lg'>{bill.billNumber}</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-sm text-gray-600'>Date</p>
                            <p className='font-semibold'>
                                {bill.billDate?.toDate().toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </p>
                        </div>
                        {bill.customerName && (
                            <>
                                <div>
                                    <p className='text-sm text-gray-600'>Customer Name</p>
                                    <p className='font-semibold'>{bill.customerName}</p>
                                </div>
                                <div className='text-right'>
                                    <p className='text-sm text-gray-600'>Customer Type</p>
                                    <p className='font-semibold capitalize'>{bill.customerType}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Line Items */}
                    <div className='mb-8'>
                        <h2 className='text-lg font-semibold mb-4'>Items</h2>
                        <table className='w-full'>
                            <thead>
                                <tr className='border-b-2 border-gray-300'>
                                    <th className='text-left py-2 px-2'>#</th>
                                    <th className='text-left py-2 px-2'>Product</th>
                                    <th className='text-right py-2 px-2'>Qty</th>
                                    <th className='text-right py-2 px-2'>Price</th>
                                    <th className='text-right py-2 px-2'>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.items.map((item, index) => (
                                    <tr key={index} className='border-b'>
                                        <td className='py-3 px-2'>{index + 1}</td>
                                        <td className='py-3 px-2'>{item.productName}</td>
                                        <td className='py-3 px-2 text-right'>
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className='py-3 px-2 text-right'>{formatCurrency(item.sellingPrice)}</td>
                                        <td className='py-3 px-2 text-right font-semibold'>{formatCurrency(item.totalAmount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className='flex justify-end mb-8'>
                        <div className='w-64'>
                            <div className='flex justify-between py-2'>
                                <span className='text-gray-600'>Subtotal:</span>
                                <span className='font-semibold'>{formatCurrency(bill.subtotal)}</span>
                            </div>
                            <div className='flex justify-between py-2'>
                                <span className='text-gray-600'>Discount:</span>
                                <span className='font-semibold text-red-600'>-{formatCurrency(bill.discount)}</span>
                            </div>
                            <div className='flex justify-between py-2'>
                                <span className='text-gray-600'>Tax:</span>
                                <span className='font-semibold'>{formatCurrency(bill.taxAmount)}</span>
                            </div>
                            <div className='flex justify-between py-3 border-t-2 border-gray-300'>
                                <span className='text-lg font-bold'>Total:</span>
                                <span className='text-lg font-bold text-green-600'>{formatCurrency(bill.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className='grid grid-cols-2 gap-4 pt-4 border-t'>
                        <div>
                            <p className='text-sm text-gray-600'>Payment Method</p>
                            <p className='font-semibold capitalize'>{bill.paymentMethod}</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-sm text-gray-600'>Payment Status</p>
                            <p className={`font-semibold capitalize ${bill.paymentStatus === 'paid' ? 'text-green-600' : bill.paymentStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'}`}>
                                {bill.paymentStatus}
                            </p>
                        </div>
                        {bill.balanceAmount > 0 && (
                            <>
                                <div>
                                    <p className='text-sm text-gray-600'>Paid Amount</p>
                                    <p className='font-semibold'>{formatCurrency(bill.paidAmount)}</p>
                                </div>
                                <div className='text-right'>
                                    <p className='text-sm text-gray-600'>Balance Due</p>
                                    <p className='font-semibold text-red-600'>{formatCurrency(bill.balanceAmount)}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className='mt-12 pt-4 border-t text-center text-sm text-gray-500'>
                        <p>Thank you for your business!</p>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    @page {
                        margin: 0.5cm;
                    }
                }
            `}</style>
        </div>
    );
}
