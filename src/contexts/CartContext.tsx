import type { BillItem, Product } from '@/lib/types';
import React, { createContext, useCallback, useState } from 'react';

interface CartContextType {
    items: BillItem[];
    customerName: string;
    customerId: string | null;
    customerType: 'retail' | 'wholesale';
    discount: number;
    taxRate: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    addItem: (product: Product, quantity?: number) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    updatePrice: (productId: string, price: number) => void;
    setCustomer: (name: string, type: 'retail' | 'wholesale', customerId?: string | null) => void;
    setDiscount: (discount: number) => void;
    setTaxRate: (rate: number) => void;
    clearCart: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<BillItem[]>([]);
    const [customerName, setCustomerName] = useState('Walk-in');
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>('retail');
    const [discount, setDiscountValue] = useState(0);
    const [taxRate, setTaxRateValue] = useState(0); // Default 0% (no tax)

    const addItem = useCallback(
        (product: Product, quantity = 1) => {
            setItems(prev => {
                const existing = prev.find(item => item.productId === product.id);
                if (existing) {
                    return prev.map(item => (item.productId === product.id ? { ...item, quantity: item.quantity + quantity, totalAmount: (item.quantity + quantity) * item.sellingPrice } : item));
                }
                const sellingPrice = customerType === 'wholesale' && product.wholesalePrice ? product.wholesalePrice : product.retailPrice;
                const newItem: BillItem = {
                    productId: product.id!,
                    productName: product.name,
                    sku: product.sku,
                    categoryId: product.categoryId,
                    categoryName: product.categoryName,
                    quantity,
                    unit: product.unit,
                    costPrice: product.costPrice || 0,
                    sellingPrice,
                    discount: 0,
                    tax: 0,
                    totalAmount: quantity * sellingPrice,
                };
                return [...prev, newItem];
            });
        },
        [customerType],
    );

    const removeItem = useCallback((productId: string) => {
        setItems(prev => prev.filter(item => item.productId !== productId));
    }, []);

    const updateQuantity = useCallback(
        (productId: string, quantity: number) => {
            if (quantity <= 0) {
                removeItem(productId);
                return;
            }
            setItems(prev => prev.map(item => (item.productId === productId ? { ...item, quantity, totalAmount: quantity * item.sellingPrice } : item)));
        },
        [removeItem],
    );

    const updatePrice = useCallback((productId: string, price: number) => {
        setItems(prev => prev.map(item => (item.productId === productId ? { ...item, sellingPrice: price, totalAmount: item.quantity * price } : item)));
    }, []);

    const setCustomer = useCallback((name: string, type: 'retail' | 'wholesale', id: string | null = null) => {
        setCustomerName(name);
        setCustomerType(type);
        setCustomerId(id);
    }, []);

    const setDiscount = useCallback((value: number) => {
        setDiscountValue(value);
    }, []);

    const setTaxRate = useCallback((rate: number) => {
        setTaxRateValue(rate);
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setCustomerName('Walk-in');
        setCustomerId(null);
        setCustomerType('retail');
        setDiscountValue(0);
        setTaxRateValue(0);
    }, []);

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
    const taxAmount = ((subtotal - discount) * taxRate) / 100;
    const totalAmount = subtotal - discount + taxAmount;

    return (
        <CartContext.Provider
            value={{
                items,
                customerName,
                customerId,
                customerType,
                discount,
                taxRate,
                subtotal,
                taxAmount,
                totalAmount,
                addItem,
                removeItem,
                updateQuantity,
                updatePrice,
                setCustomer,
                setDiscount,
                setTaxRate,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};
