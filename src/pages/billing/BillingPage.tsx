import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer, Product } from '@/lib/types';
import { Minus, Plus, Trash2 } from 'lucide-react';
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
    const { items, addItem, removeItem, updateQuantity, subtotal, taxAmount, totalAmount, taxRate, discount, setCustomer } = useCart();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

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
        setSearchTerm(value);
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
                                    <div className='absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto z-10'>
                                        {searchResults.map(product => (
                                            <div
                                                key={product.id}
                                                className='p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center'
                                                onClick={() => handleAddProduct(product)}
                                            >
                                                <div>
                                                    <p className='font-medium'>{product.name}</p>
                                                    <p className='text-sm text-gray-500'>
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
                                                        <span className='w-12 text-center'>{item.quantity}</span>
                                                        <Button size='sm' variant='outline' onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                                                            <Plus className='h-3 w-3' />
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className='p-2 text-right'>{formatCurrency(item.sellingPrice)}</td>
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
                        <div className='flex justify-between'>
                            <span>Discount:</span>
                            <span className='font-semibold text-red-600'>-{formatCurrency(discount)}</span>
                        </div>
                        <div className='flex justify-between'>
                            <span>Tax ({taxRate}%):</span>
                            <span className='font-semibold'>{formatCurrency(taxAmount)}</span>
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
