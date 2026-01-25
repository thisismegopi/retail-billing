import { Timestamp } from 'firebase/firestore';

export interface Shop {
    id?: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    gstNumber: string;
    logoUrl?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Category {
    id?: string;
    shopId: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: 'admin' | 'manager' | 'cashier';
    shopId: string;
}

export interface Product {
    id?: string;
    shopId: string;
    name: string;
    sku: string;
    barcode?: string;
    categoryId?: string;
    categoryName?: string;
    retailPrice: number;
    wholesalePrice?: number;
    costPrice?: number;
    currentStock: number;
    unit: string;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface BillItem {
    productId: string;
    productName: string;
    sku: string;
    categoryId?: string;
    categoryName?: string;
    quantity: number;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    discount: number;
    tax: number;
    totalAmount: number;
}

export interface Bill {
    id?: string;
    shopId: string;
    billNumber: string;
    billDate: Timestamp;
    customerId?: string;
    customerName: string;
    customerType: 'retail' | 'wholesale';
    items: BillItem[];
    subtotal: number;
    discount: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: 'paid' | 'partial' | 'unpaid';
    paymentMethod: 'cash' | 'card' | 'upi' | 'credit';
    billStatus: 'active' | 'cancelled' | 'returned';
    createdBy: string;
    createdAt: Timestamp;
}

export interface Customer {
    id?: string;
    shopId: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    customerType: 'retail' | 'wholesale';
    creditLimit: number;
    outstandingBalance: number;
    createdAt: Timestamp;
    isActive: boolean;
}
