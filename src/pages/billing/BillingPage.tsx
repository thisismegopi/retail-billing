import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer, Product } from '@/lib/types';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import CheckoutDialog from '@/components/billing/CheckoutDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';

export default function BillingPage() {
    const { userData } = useAuth();
    const { items, addItem, removeItem, updateQuantity, updatePrice, subtotal, taxAmount, totalAmount, taxRate, discount, setCustomer, setDiscount, setTaxRate } = useCart();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [discountType, setDiscountType] = useState<'none' | 'flat' | 'percentage'>('none');
    const [discountValue, setDiscountValue] = useState<string>('0');
    const [taxEnabled, setTaxEnabled] = useState(false);
    const [taxPercentage, setTaxPercentage] = useState<string>('18');

    useEffect(() => {
        fetchCustomers();
    }, [userData]);

    const fetchCustomers = async () => {
        if (!userData?.shopId) return;

        const q = query(collection(db, 'customers'), where('shopId', '==', userData.shopId), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const customerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Customer);
        setCustomers(customerList);
    };

    const handleCustomerChange = (customerId: string) => {
        setSelectedCustomerId(customerId);
        if (customerId === '') {
            setCustomer('Walk-in', 'retail', null);
        } else {
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                setCustomer(customer.name, customer.customerType, customer.id);
            }
        }
    };

    const searchProducts = async (term: string) => {
        if (!userData?.shopId || !term.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const q = query(collection(db, 'products'), where('shopId', '==', userData.shopId), where('isActive', '==', true));
            const snapshot = await getDocs(q);
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Product);

            // Client-side filter by name or SKU
            const filtered = products.filter(p => p.name.toLowerCase().includes(term.toLowerCase()) || p.sku.toLowerCase().includes(term.toLowerCase()));
            setSearchResults(filtered);
        } catch (error) {
            console.error('Error searching products:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value.trimStart());
        if (value.trim()) {
            searchProducts(value);
        } else {
            setSearchResults([]);
        }
    };

    const handleAddProduct = (product: Product) => {
        addItem(product, 1);
        setSearchTerm('');
        setSearchResults([]);
    };

    const handleDiscountChange = (value: string) => {
        setDiscountValue(value);
        const numValue = parseFloat(value) || 0;

        if (discountType === 'flat') {
            // Flat discount cannot exceed subtotal
            const maxDiscount = subtotal;
            const actualDiscount = Math.min(numValue, maxDiscount);
            setDiscount(actualDiscount);
        } else if (discountType === 'percentage') {
            // Percentage must be between 0-100
            const percentage = Math.max(0, Math.min(100, numValue));
            const discountAmount = (subtotal * percentage) / 100;
            setDiscount(discountAmount);
        } else {
            setDiscount(0);
        }
    };

    const handleDiscountTypeChange = (type: 'none' | 'flat' | 'percentage') => {
        setDiscountType(type);
        setDiscountValue('0');
        setDiscount(0);
    };

    const handleTaxChange = (enabled: boolean) => {
        setTaxEnabled(enabled);
        if (enabled) {
            const percentage = parseFloat(taxPercentage) || 0;
            const clampedPercentage = Math.max(0, Math.min(100, percentage));
            setTaxRate(clampedPercentage);
        } else {
            setTaxRate(0);
        }
    };

    const handleTaxPercentageChange = (value: string) => {
        setTaxPercentage(value);
        const percentage = parseFloat(value) || 0;
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        setTaxRate(clampedPercentage);
    };

    return (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Left: Product Search & Cart */}
            <div className='lg:col-span-2 space-y-4'>
                {/* Customer Selection & Product Search - Combined */}
                <Card>
                    <CardHeader>
                        <CardTitle>Customer & Product Selection</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {/* Customer Selection */}
                            <div className='grid gap-2'>
                                <Label htmlFor='customer'>Select Customer (Optional)</Label>
                                <select
                                    id='customer'
                                    value={selectedCustomerId}
                                    onChange={e => handleCustomerChange(e.target.value)}
                                    className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                                >
                                    <option value=''>Walk-in Customer</option>
                                    {customers.map(customer => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.name} - {customer.phone} ({customer.customerType})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Product Search */}
                            <div className='grid gap-2 relative'>
                                <Label htmlFor='product-search'>Search Products</Label>
                                <Input id='product-search' placeholder='Search by name or SKU...' value={searchTerm} onChange={e => handleSearchChange(e.target.value)} autoComplete='off' />
                                {isSearching && <div className='absolute right-3 top-10 text-sm text-gray-500'>Searching...</div>}

                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className='absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-lg max-h-60 overflow-y-auto z-10'>
                                        {searchResults.map(product => (
                                            <div
                                                key={product.id}
                                                className='p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 flex justify-between items-center'
                                                onClick={() => handleAddProduct(product)}
                                            >
                                                <div>
                                                    <p className='font-medium'>{product.name}</p>
                                                    <p className='text-sm text-muted-foreground'>
                                                        {product.sku} • Stock: {product.currentStock} {product.unit}
                                                    </p>
                                                </div>
                                                <p className='font-semibold'>{formatCurrency(product.retailPrice)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Cart Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cart ({items.length} items)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {items.length === 0 ? (
                            <p className='text-gray-500 text-center py-8'>No items in cart. Search and add products.</p>
                        ) : (
                            <div className='overflow-x-auto'>
                                <table className='w-full'>
                                    <thead>
                                        <tr className='border-b'>
                                            <th className='text-left p-2'>Product</th>
                                            <th className='text-center p-2'>Qty</th>
                                            <th className='text-right p-2'>Price</th>
                                            <th className='text-right p-2'>Total</th>
                                            <th className='text-center p-2'>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(item => (
                                            <tr key={item.productId} className='border-b'>
                                                <td className='p-2'>
                                                    <div>
                                                        <p className='font-medium'>{item.productName}</p>
                                                        <p className='text-xs text-gray-500'>{item.sku}</p>
                                                    </div>
                                                </td>
                                                <td className='p-2'>
                                                    <div className='flex items-center justify-center gap-2'>
                                                        <Button size='sm' variant='outline' onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                                                            <Minus className='h-3 w-3' />
                                                        </Button>
                                                        <Input
                                                            type='number'
                                                            step='any'
                                                            min='0'
                                                            value={item.quantity}
                                                            onChange={e => {
                                                                const newQty = parseFloat(e.target.value) || 0;
                                                                updateQuantity(item.productId, newQty);
                                                            }}
                                                            className='w-20 text-center'
                                                        />
                                                        <Button size='sm' variant='outline' onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                                                            <Plus className='h-3 w-3' />
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className='p-2 text-right'>
                                                    <Input
                                                        type='number'
                                                        step='0.01'
                                                        min='0'
                                                        value={item.sellingPrice}
                                                        onChange={e => {
                                                            const newPrice = parseFloat(e.target.value) || 0;
                                                            updatePrice(item.productId, newPrice);
                                                        }}
                                                        className='w-24 text-right'
                                                    />
                                                </td>
                                                <td className='p-2 text-right font-semibold'>{formatCurrency(item.totalAmount)}</td>
                                                <td className='p-2 text-center'>
                                                    <Button size='sm' variant='destructive' onClick={() => removeItem(item.productId)}>
                                                        <Trash2 className='h-4 w-4' />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right: Summary & Checkout */}
            <div className='space-y-4'>
                <Card>
                    <CardHeader>
                        <CardTitle>Bill Summary</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                        <div className='flex justify-between'>
                            <span>Subtotal:</span>
                            <span className='font-semibold'>{formatCurrency(subtotal)}</span>
                        </div>

                        {/* Discount Section */}
                        <div className='space-y-2 border-t pt-3'>
                            <Label>Discount</Label>
                            <RadioGroup className='mt-2' value={discountType} onValueChange={value => handleDiscountTypeChange(value as 'none' | 'flat' | 'percentage')}>
                                <div className='flex gap-4'>
                                    <div className='flex items-center space-x-2'>
                                        <RadioGroupItem value='none' id='discount-none' />
                                        <Label htmlFor='discount-none' className='font-normal cursor-pointer'>
                                            No Discount
                                        </Label>
                                    </div>
                                    <div className='flex items-center space-x-2'>
                                        <RadioGroupItem value='flat' id='discount-flat' />
                                        <Label htmlFor='discount-flat' className='font-normal cursor-pointer'>
                                            Flat
                                        </Label>
                                    </div>
                                    <div className='flex items-center space-x-2'>
                                        <RadioGroupItem value='percentage' id='discount-percentage' />
                                        <Label htmlFor='discount-percentage' className='font-normal cursor-pointer'>
                                            Percentage
                                        </Label>
                                    </div>
                                </div>
                            </RadioGroup>

                            {discountType !== 'none' && (
                                <div className='flex gap-2 items-center'>
                                    <Input
                                        type='number'
                                        step={discountType === 'flat' ? '0.01' : '1'}
                                        min='0'
                                        max={discountType === 'percentage' ? '100' : undefined}
                                        value={discountValue}
                                        onChange={e => handleDiscountChange(e.target.value)}
                                        placeholder={discountType === 'flat' ? 'Enter amount' : 'Enter %'}
                                        className='flex-1'
                                    />
                                    {discountType === 'percentage' && <span className='text-sm text-gray-500'>%</span>}
                                </div>
                            )}

                            {discount > 0 && (
                                <div className='flex justify-between text-sm'>
                                    <span className='text-gray-600'>Discount Applied:</span>
                                    <span className='font-semibold text-red-600'>-{formatCurrency(discount)}</span>
                                </div>
                            )}
                        </div>

                        {/* Tax Section */}
                        <div className='space-y-2 border-t pt-3'>
                            <Label>Tax</Label>
                            <RadioGroup className='mt-2' value={taxEnabled ? 'tax' : 'no-tax'} onValueChange={value => handleTaxChange(value === 'tax')}>
                                <div className='flex gap-4'>
                                    <div className='flex items-center space-x-2'>
                                        <RadioGroupItem value='no-tax' id='tax-none' />
                                        <Label htmlFor='tax-none' className='font-normal cursor-pointer'>
                                            No Tax
                                        </Label>
                                    </div>
                                    <div className='flex items-center space-x-2'>
                                        <RadioGroupItem value='tax' id='tax-enabled' />
                                        <Label htmlFor='tax-enabled' className='font-normal cursor-pointer'>
                                            Tax
                                        </Label>
                                    </div>
                                </div>
                            </RadioGroup>

                            {taxEnabled && (
                                <div className='flex gap-2 items-center'>
                                    <Input
                                        type='number'
                                        step='1'
                                        min='0'
                                        max='100'
                                        value={taxPercentage}
                                        onChange={e => handleTaxPercentageChange(e.target.value)}
                                        placeholder='Enter tax %'
                                        className='flex-1'
                                    />
                                    <span className='text-sm text-gray-500'>%</span>
                                </div>
                            )}

                            {taxRate > 0 && (
                                <div className='flex justify-between text-sm'>
                                    <span className='text-gray-600'>Tax ({taxRate}%):</span>
                                    <span className='font-semibold text-green-600'>{formatCurrency(taxAmount)}</span>
                                </div>
                            )}
                        </div>

                        <div className='border-t pt-3 flex justify-between text-lg'>
                            <span className='font-bold'>Total:</span>
                            <span className='font-bold text-green-600'>{formatCurrency(totalAmount)}</span>
                        </div>
                        <Button className='w-full mt-4' size='lg' disabled={items.length === 0} onClick={() => setShowCheckout(true)}>
                            Checkout
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <CheckoutDialog open={showCheckout} onOpenChange={setShowCheckout} />
        </div>
    );
}
