import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Bill } from '@/lib/types';
import RobotoBold from '@/assets/fonts/Roboto-Bold.ttf';
import RobotoLight from '@/assets/fonts/Roboto-Light.ttf';
import RobotoMedium from '@/assets/fonts/Roboto-Medium.ttf';
import RobotoRegular from '@/assets/fonts/Roboto-Regular.ttf';
import type { Shop } from '@/lib/types';
import { formatCurrencyPDF } from '@/lib/utils';

// Import font files

// Register custom Roboto font family
Font.register({
    family: 'Roboto',
    fonts: [
        {
            src: RobotoRegular,
            fontWeight: 'normal',
        },
        {
            src: RobotoBold,
            fontWeight: 'bold',
        },
        {
            src: RobotoLight,
            fontWeight: 'light',
        },
        {
            src: RobotoMedium,
            fontWeight: 'medium',
        },
    ],
});

// Define styles for PDF
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Roboto',
    },
    header: {
        marginBottom: 20,
        textAlign: 'center',
        borderBottom: 1,
        paddingBottom: 10,
    },
    shopName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    shopDetails: {
        fontSize: 9,
        color: '#666',
        marginBottom: 2,
    },
    invoiceTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 10,
    },
    billInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottom: 1,
        borderBottomColor: '#eee',
    },
    billInfoColumn: {
        width: '48%',
    },
    billInfoRow: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    label: {
        width: 100,
        fontSize: 9,
        color: '#666',
    },
    value: {
        flex: 1,
        fontSize: 10,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    table: {
        width: '100%',
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottom: 2,
        borderBottomColor: '#333',
        paddingBottom: 5,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: 1,
        borderBottomColor: '#eee',
        paddingVertical: 8,
    },
    col1: { width: '5%' },
    col2: { width: '40%' },
    col3: { width: '15%', textAlign: 'right' },
    col4: { width: '20%', textAlign: 'right' },
    col5: { width: '20%', textAlign: 'right', fontWeight: 'bold' },
    summary: {
        marginLeft: 'auto',
        width: '45%',
        marginTop: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    summaryLabel: {
        fontSize: 10,
        color: '#666',
    },
    summaryValue: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingTop: 8,
        borderTop: 2,
        borderTopColor: '#333',
        marginTop: 5,
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    paymentInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 15,
        borderTop: 1,
        borderTopColor: '#eee',
    },
    paymentColumn: {
        width: '48%',
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    paymentLabel: {
        fontSize: 9,
        color: '#666',
    },
    paymentValue: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    statusPaid: {
        color: '#22c55e',
    },
    statusUnpaid: {
        color: '#ef4444',
    },
    statusPartial: {
        color: '#f59e0b',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 9,
        color: '#666',
        borderTop: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
});

interface InvoicePDFProps {
    bill: Bill;
    shopDetails: Shop | null;
}

export default function InvoicePDF({ bill, shopDetails }: InvoicePDFProps) {
    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        return timestamp.toDate().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getStatusStyle = (status: string) => {
        if (status === 'paid') return styles.statusPaid;
        if (status === 'partial') return styles.statusPartial;
        return styles.statusUnpaid;
    };

    return (
        <Document>
            <Page size='A4' style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.shopName}>{shopDetails?.name || 'Shop'}</Text>
                    {shopDetails?.address && <Text style={styles.shopDetails}>{shopDetails.address}</Text>}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 5 }}>
                        {shopDetails?.phone && <Text style={styles.shopDetails}>Phone: {shopDetails.phone}</Text>}
                        {shopDetails?.email && <Text style={styles.shopDetails}>Email: {shopDetails.email}</Text>}
                    </View>
                    {shopDetails?.gstNumber && <Text style={styles.shopDetails}>GST: {shopDetails.gstNumber}</Text>}
                    <Text style={styles.invoiceTitle}>INVOICE</Text>
                </View>

                {/* Bill Info */}
                <View style={styles.billInfo}>
                    <View style={styles.billInfoColumn}>
                        <View style={styles.billInfoRow}>
                            <Text style={styles.label}>Bill Number:</Text>
                            <Text style={styles.value}>{bill.billNumber}</Text>
                        </View>
                        {bill.customerName && (
                            <View style={styles.billInfoRow}>
                                <Text style={styles.label}>Customer:</Text>
                                <Text style={styles.value}>{bill.customerName}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.billInfoColumn}>
                        <View style={styles.billInfoRow}>
                            <Text style={styles.label}>Date:</Text>
                            <Text style={styles.value}>{formatDate(bill.billDate)}</Text>
                        </View>
                        {bill.customerType && (
                            <View style={styles.billInfoRow}>
                                <Text style={styles.label}>Type:</Text>
                                <Text style={[styles.value, { textTransform: 'capitalize' }]}>{bill.customerType}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    <View style={styles.table}>
                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <Text style={styles.col1}>#</Text>
                            <Text style={styles.col2}>Product</Text>
                            <Text style={styles.col3}>Qty</Text>
                            <Text style={styles.col4}>Price</Text>
                            <Text style={styles.col5}>Amount</Text>
                        </View>

                        {/* Table Rows */}
                        {bill.items.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={styles.col1}>{index + 1}</Text>
                                <Text style={styles.col2}>{item.productName}</Text>
                                <Text style={styles.col3}>
                                    {item.quantity} {item.unit}
                                </Text>
                                <Text style={styles.col4}>{formatCurrencyPDF(item.sellingPrice)}</Text>
                                <Text style={styles.col5}>{formatCurrencyPDF(item.totalAmount)}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Summary */}
                    <View style={styles.summary}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Subtotal:</Text>
                            <Text style={styles.summaryValue}>{formatCurrencyPDF(bill.subtotal)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Discount:</Text>
                            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>-{formatCurrencyPDF(bill.discount)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Tax:</Text>
                            <Text style={styles.summaryValue}>{formatCurrencyPDF(bill.taxAmount)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total:</Text>
                            <Text style={styles.totalValue}>{formatCurrencyPDF(bill.totalAmount)}</Text>
                        </View>
                    </View>
                </View>

                {/* Payment Info */}
                <View style={styles.paymentInfo}>
                    <View style={styles.paymentColumn}>
                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Payment Method:</Text>
                            <Text style={styles.paymentValue}>{bill.paymentMethod}</Text>
                        </View>
                        {bill.balanceAmount > 0 && (
                            <View style={styles.paymentRow}>
                                <Text style={styles.paymentLabel}>Paid Amount:</Text>
                                <Text style={styles.paymentValue}>{formatCurrencyPDF(bill.paidAmount)}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.paymentColumn}>
                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Payment Status:</Text>
                            <Text style={[styles.paymentValue, getStatusStyle(bill.paymentStatus)]}>{bill.paymentStatus}</Text>
                        </View>
                        {bill.balanceAmount > 0 && (
                            <View style={styles.paymentRow}>
                                <Text style={styles.paymentLabel}>Balance Due:</Text>
                                <Text style={[styles.paymentValue, { color: '#ef4444' }]}>{formatCurrencyPDF(bill.balanceAmount)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Thank you for your business!</Text>
                </View>
            </Page>
        </Document>
    );
}
