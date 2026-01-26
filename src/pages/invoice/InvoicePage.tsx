import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Bill } from '@/lib/types';
import { Button } from '@/components/ui/button';
import InvoicePDF from '@/components/invoice/InvoicePDF';
import type { Shop } from '@/lib/types';
import { db } from '@/lib/firebase';

export default function InvoicePage() {
    const { billId } = useParams<{ billId: string }>();
    const [bill, setBill] = useState<Bill | null>(null);
    const [shopDetails, setShopDetails] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchBillData = async () => {
            if (!billId) {
                setError('Bill ID is missing');
                setLoading(false);
                return;
            }

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
                } else {
                    setError('Bill not found');
                }
            } catch (error) {
                console.error('Error fetching bill:', error);
                setError('Failed to load bill');
            } finally {
                setLoading(false);
            }
        };

        fetchBillData();
    }, [billId]);

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-screen bg-background'>
                <div className='text-lg'>Loading invoice...</div>
            </div>
        );
    }

    if (error || !bill) {
        return (
            <div className='flex flex-col items-center justify-center min-h-screen bg-background gap-4'>
                <div className='text-lg text-red-600'>{error || 'Bill not found'}</div>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className='h-screen w-full flex flex-col bg-background'>
            {/* Header with Download Button */}
            <div className='flex items-center justify-between p-4 border-b bg-card'>
                <div>
                    <h1 className='text-xl font-semibold'>Invoice - {bill.billNumber}</h1>
                    <p className='text-sm text-muted-foreground'>View and download your invoice</p>
                </div>
                <div className='flex gap-2'>
                    <Button variant='outline' onClick={() => navigate(-1)}>
                        Back
                    </Button>
                    <PDFDownloadLink document={<InvoicePDF bill={bill} shopDetails={shopDetails} />} fileName={`Invoice-${bill.billNumber}.pdf`}>
                        {({ loading }) => <Button disabled={loading}>{loading ? 'Preparing...' : 'Download PDF'}</Button>}
                    </PDFDownloadLink>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className='flex-1 w-full'>
                <PDFViewer width='100%' height='100%' showToolbar={true}>
                    <InvoicePDF bill={bill} shopDetails={shopDetails} />
                </PDFViewer>
            </div>
        </div>
    );
}
