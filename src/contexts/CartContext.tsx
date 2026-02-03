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
                    const newQuantity = existing.quantity + quantity;
                    return prev.map(item =>
                        item.productId === product.id
                            ? {
                                  ...item,
                                  quantity: newQuantity,
                                  totalAmount: Math.round(newQuantity * item.sellingPrice * 100) / 100,
                                  totalProfit: Math.round((item.sellingPrice - item.costPrice) * newQuantity * 100) / 100,
                              }
                            : item,
                    );
                }
                const sellingPrice = customerType === 'wholesale' && product.wholesalePrice ? product.wholesalePrice : product.retailPrice;
                const costPrice = product.costPrice;
                const profitPerItem = sellingPrice - costPrice;
                const newItem: BillItem = {
                    productId: product.id!,
                    productName: product.name,
                    sku: product.sku,
                    categoryId: product.categoryId,
                    categoryName: product.categoryName,
                    quantity,
                    unit: product.unit,
                    costPrice,
                    sellingPrice,
                    discount: 0,
                    tax: 0,
                    totalAmount: Math.round(quantity * sellingPrice * 100) / 100,
                    profitPerItem,
                    totalProfit: Math.round(profitPerItem * quantity * 100) / 100,
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
            setItems(prev =>
                prev.map(item => {
                    if (item.productId === productId) {
                        const profitPerItem = item.sellingPrice - item.costPrice;
                        return {
                            ...item,
                            quantity,
                            totalAmount: Math.round(quantity * item.sellingPrice * 100) / 100,
                            totalProfit: Math.round(profitPerItem * quantity * 100) / 100,
                        };
                    }
                    return item;
                }),
            );
        },
        [removeItem],
    );

    const updatePrice = useCallback((productId: string, price: number) => {
        setItems(prev =>
            prev.map(item => {
                if (item.productId === productId) {
                    const profitPerItem = price - item.costPrice;
                    return {
                        ...item,
                        sellingPrice: price,
                        totalAmount: Math.round(item.quantity * price * 100) / 100,
                        profitPerItem,
                        totalProfit: Math.round(profitPerItem * item.quantity * 100) / 100,
                    };
                }
                return item;
            }),
        );
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
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.totalAmount, 0) * 100) / 100;
    const taxAmount = Math.round((((subtotal - discount) * taxRate) / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal - discount + taxAmount) * 100) / 100;

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
