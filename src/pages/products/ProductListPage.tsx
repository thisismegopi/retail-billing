import * as z from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Category, Product, Shop } from '@/lib/types';
import { Controller, useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timestamp, addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { generateSKU } from '@/lib/billUtils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';

const productFormSchema = z.object({
    name: z.string().trim().min(1, 'Product name is required'),
    sku: z.string().trim().min(1, 'SKU is required'),
    categoryId: z.string().min(1, 'Category is required'),
    retailPrice: z.coerce.number().min(0.01, 'Retail price must be positive'),
    wholesalePrice: z.coerce.number().min(0, 'Wholesale price must be positive').optional(),
    costPrice: z.coerce.number().min(0.01, 'Cost price is required and must be greater than 0'),
    currentStock: z.coerce.number().min(0, 'Stock must be positive'),
    unit: z.string().trim().min(1, 'Unit is required'),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ProductListPage() {
    const { userData } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<string[]>([]); // Default units
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm<ProductFormValues>({
        mode: 'onSubmit', // Only validate on submit to prevent lag
        resolver: zodResolver(productFormSchema) as any,
        defaultValues: {
            sku: generateSKU(),
        },
    });

    const fetchCategories = useCallback(async () => {
        if (!userData?.shopId) return;

        const q = query(collection(db, 'categories'), where('shopId', '==', userData.shopId), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const categoryList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Category);
        setCategories(categoryList.sort((a, b) => a.name.localeCompare(b.name)));
    }, [userData?.shopId]);

    const fetchProducts = useCallback(async () => {
        if (!userData?.shopId) return;

        const q = query(collection(db, 'products'), where('shopId', '==', userData.shopId));
        const snapshot = await getDocs(q);
        const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Product);
        setProducts(productList);
    }, [userData?.shopId]);

    const fetchUnits = useCallback(async () => {
        if (!userData?.shopId) return;

        try {
            const docRef = doc(db, 'shops', userData.shopId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const shopData = docSnap.data() as Shop;
                if (shopData.units && shopData.units.length > 0) {
                    setUnits(shopData.units);
                }
            }
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    }, [userData?.shopId]);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchUnits();
    }, [fetchCategories, fetchProducts, fetchUnits, userData]);

    const onSubmit = useCallback(
        async (data: ProductFormValues) => {
            if (!userData?.shopId) {
                toast.error('No Shop ID associated with your account');
                return;
            }

            setIsLoading(true);
            try {
                // Check for duplicate SKU
                const skuQuery = query(collection(db, 'products'), where('shopId', '==', userData.shopId), where('sku', '==', data.sku));
                const skuSnapshot = await getDocs(skuQuery);

                if (skuSnapshot.docs.length > 0) {
                    toast.error('A product with this SKU already exists');
                    setIsLoading(false);
                    return;
                }

                // Get category name if categoryId is provided
                const categoryName = data.categoryId ? categories.find(c => c.id === data.categoryId)?.name : undefined;

                await addDoc(collection(db, 'products'), {
                    ...data,
                    categoryName,
                    shopId: userData.shopId,
                    isActive: true,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                reset({
                    sku: generateSKU(),
                });
                setShowForm(false);
                fetchProducts();
                toast.success('Product added successfully!');
            } catch (error) {
                console.error('Error adding product:', error);
                toast.error('Failed to add product');
            } finally {
                setIsLoading(false);
            }
        },
        [categories, fetchProducts, reset, userData?.shopId],
    );

    const handleEdit = useCallback(
        (product: Product) => {
            setEditingProduct(product);
            // Reset form with product values
            reset({
                name: product.name,
                sku: product.sku,
                categoryId: product.categoryId || '',
                retailPrice: product.retailPrice,
                wholesalePrice: product.wholesalePrice || 0,
                costPrice: product.costPrice || 0,
                currentStock: product.currentStock,
                unit: product.unit,
            });
            setShowEditDialog(true);
        },
        [reset],
    );

    const handleCloseEditDialog = useCallback(() => {
        setShowEditDialog(false);
        setEditingProduct(null);
        // Reset form to default values
        reset({
            sku: generateSKU(),
        });
    }, [reset]);

    const handleUpdate = useCallback(
        async (data: ProductFormValues) => {
            if (!editingProduct?.id || !userData?.shopId) return;

            setIsLoading(true);
            try {
                // Check for duplicate SKU, excluding the current product
                const skuQuery = query(collection(db, 'products'), where('shopId', '==', userData.shopId), where('sku', '==', data.sku));
                const skuSnapshot = await getDocs(skuQuery);

                const duplicateExists = skuSnapshot.docs.some(doc => doc.id !== editingProduct.id);

                if (duplicateExists) {
                    toast.error('A product with this SKU already exists');
                    setIsLoading(false);
                    return;
                }

                // Get category name if categoryId is provided
                const categoryName = data.categoryId ? categories.find(c => c.id === data.categoryId)?.name : undefined;

                await updateDoc(doc(db, 'products', editingProduct.id), {
                    name: data.name,
                    sku: data.sku,
                    categoryId: data.categoryId || '',
                    categoryName: categoryName || '',
                    retailPrice: data.retailPrice,
                    wholesalePrice: data.wholesalePrice || 0,
                    costPrice: data.costPrice || 0,
                    currentStock: data.currentStock,
                    unit: data.unit,
                    updatedAt: Timestamp.now(),
                });
                setShowEditDialog(false);
                setEditingProduct(null);
                // Reset form to default values
                reset({
                    sku: generateSKU(),
                });
                fetchProducts();
                toast.success('Product updated successfully!');
            } catch (error) {
                console.error('Error updating product:', error);
                toast.error('Failed to update product');
            } finally {
                setIsLoading(false);
            }
        },
        [editingProduct?.id, userData?.shopId, categories, reset, fetchProducts],
    );

    // Filter products based on search term (name, SKU, or category)
    const filteredProducts = products.filter(
        product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.categoryName && product.categoryName.toLowerCase().includes(searchTerm.toLowerCase())),
    );

    return (
        <div className='space-y-6'>
            <div className='flex justify-between items-center'>
                <h2 className='text-3xl font-bold tracking-tight'>Products</h2>
                <Button
                    onClick={() => {
                        if (!showForm) {
                            reset({
                                sku: generateSKU(),
                            });
                        }
                        setShowForm(!showForm);
                    }}
                >
                    {showForm ? 'Cancel' : 'Add Product'}
                </Button>
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Product</CardTitle>
                        <CardDescription>Enter product details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div className='grid gap-2'>
                                    <Label htmlFor='name'>Product Name</Label>
                                    <Input id='name' {...register('name')} placeholder='Product Name' />
                                    {errors.name && <p className='text-red-500 text-xs'>{errors.name.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='sku'>SKU</Label>
                                    <Input id='sku' {...register('sku')} placeholder='SKU-001' />
                                    {errors.sku && <p className='text-red-500 text-xs'>{errors.sku.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='categoryId'>Category *</Label>
                                    <Controller
                                        name='categoryId'
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder='Select Category' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map(category => (
                                                        <SelectItem key={category.id} value={category.id || ''}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.categoryId && <p className='text-red-500 text-xs'>{errors.categoryId.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='retailPrice'>Retail Price</Label>
                                    <Input id='retailPrice' type='number' step='0.01' {...register('retailPrice')} placeholder='0.00' />
                                    {errors.retailPrice && <p className='text-red-500 text-xs'>{errors.retailPrice.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='wholesalePrice'>Wholesale Price (Optional)</Label>
                                    <Input id='wholesalePrice' type='number' step='0.01' {...register('wholesalePrice')} placeholder='0.00' />
                                    {errors.wholesalePrice && <p className='text-red-500 text-xs'>{errors.wholesalePrice.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='costPrice'>Cost Price</Label>
                                    <Input id='costPrice' type='number' step='0.01' {...register('costPrice')} placeholder='0.00' />
                                    {errors.costPrice && <p className='text-red-500 text-xs'>{errors.costPrice.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='currentStock'>Current Stock *</Label>
                                    <Input id='currentStock' type='number' {...register('currentStock')} placeholder='0' />
                                    {errors.currentStock && <p className='text-red-500 text-xs'>{errors.currentStock.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='unit'>Unit *</Label>
                                    <Controller
                                        name='unit'
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder='Select unit' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {units.map(unit => (
                                                        <SelectItem key={unit} value={unit}>
                                                            {unit}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.unit && <p className='text-red-500 text-xs'>{errors.unit.message}</p>}
                                </div>
                            </div>

                            <div className='flex justify-end gap-2 pt-4'>
                                <Button type='button' variant='outline' onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                                <Button type='submit' disabled={isLoading}>
                                    {isLoading ? 'Adding...' : 'Add Product'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Product List</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Search Bar */}
                    <div className='mb-4'>
                        <Input placeholder='Search products by name, SKU, or category...' value={searchTerm} onChange={e => setSearchTerm(e.target.value.trimStart())} className='max-w-sm' />
                    </div>

                    {filteredProducts.length === 0 ? (
                        <p className='text-gray-500 text-center py-8'>{searchTerm ? 'No products found matching your search.' : 'No products found. Add your first product.'}</p>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead>
                                    <tr className='border-b'>
                                        <th className='text-left p-2'>Name</th>
                                        <th className='text-left p-2'>SKU</th>
                                        <th className='text-left p-2'>Category</th>
                                        <th className='text-right p-2'>Cost Price</th>
                                        <th className='text-right p-2'>Retail Price</th>
                                        <th className='text-right p-2'>Retail Profit</th>
                                        {/* <th className='text-right p-2'>Retail Margin</th> */}
                                        <th className='text-right p-2'>Wholesale Price</th>
                                        <th className='text-right p-2'>Wholesale Profit</th>
                                        {/* <th className='text-right p-2'>Wholesale Margin</th> */}
                                        <th className='text-right p-2'>Stock</th>
                                        <th className='text-left p-2'>Unit</th>
                                        <th className='text-center p-2'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(product => {
                                        const costPrice = product.costPrice || 0;
                                        const retailProfit = product.retailPrice - costPrice;
                                        // const retailMargin = product.retailPrice > 0 ? (retailProfit / product.retailPrice) * 100 : 0;
                                        const wholesaleProfit = (product.wholesalePrice || 0) - costPrice;
                                        // const wholesaleMargin = (product.wholesalePrice || 0) > 0 ? (wholesaleProfit / (product.wholesalePrice || 1)) * 100 : 0;

                                        return (
                                            <tr key={product.id} className='border-b hover:bg-muted/50'>
                                                <td className='p-2'>{product.name}</td>
                                                <td className='p-2'>{product.sku}</td>
                                                <td className='p-2 text-sm text-muted-foreground'>{product.categoryName || '-'}</td>
                                                <td className='p-2 text-right'>{formatCurrency(costPrice)}</td>
                                                <td className='p-2 text-right'>{formatCurrency(product.retailPrice)}</td>
                                                <td className='p-2 text-right font-medium text-green-600'>{formatCurrency(retailProfit)}</td>
                                                {/* <td className='p-2 text-right text-sm font-medium text-green-600'>{retailMargin.toFixed(1)}%</td> */}
                                                <td className='p-2 text-right'>{formatCurrency(product.wholesalePrice || 0)}</td>
                                                <td className='p-2 text-right font-medium text-green-600'>{formatCurrency(wholesaleProfit)}</td>
                                                {/* <td className='p-2 text-right text-sm font-medium text-green-600'>{wholesaleMargin.toFixed(1)}%</td> */}
                                                <td className='p-2 text-right'>{product.currentStock}</td>
                                                <td className='p-2'>{product.unit}</td>
                                                <td className='p-2 text-center'>
                                                    <Button size='sm' variant='outline' onClick={() => handleEdit(product)}>
                                                        Edit
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Product Dialog */}
            {editingProduct && (
                <Dialog
                    open={showEditDialog}
                    onOpenChange={open => {
                        if (!open) handleCloseEditDialog();
                    }}
                >
                    <DialogContent className='max-w-2xl'>
                        <DialogHeader>
                            <DialogTitle>Edit Product</DialogTitle>
                            <DialogDescription>Update product details.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(handleUpdate)} className='space-y-4'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-name'>Product Name</Label>
                                    <Input id='edit-name' {...register('name')} />
                                    {errors.name && <p className='text-red-500 text-xs'>{errors.name.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-sku'>SKU</Label>
                                    <Input id='edit-sku' {...register('sku')} />
                                    {errors.sku && <p className='text-red-500 text-xs'>{errors.sku.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-categoryId'>Category *</Label>
                                    <Controller
                                        name='categoryId'
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger id='edit-categoryId'>
                                                    <SelectValue placeholder='Select Category' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map(category => (
                                                        <SelectItem key={category.id} value={category.id || ''}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.categoryId && <p className='text-red-500 text-xs'>{errors.categoryId.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-retailPrice'>Retail Price</Label>
                                    <Input id='edit-retailPrice' type='number' step='0.01' {...register('retailPrice')} />
                                    {errors.retailPrice && <p className='text-red-500 text-xs'>{errors.retailPrice.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-wholesalePrice'>Wholesale Price (Optional)</Label>
                                    <Input id='edit-wholesalePrice' type='number' step='0.01' {...register('wholesalePrice')} />
                                    {errors.wholesalePrice && <p className='text-red-500 text-xs'>{errors.wholesalePrice.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-costPrice'>Cost Price</Label>
                                    <Input id='edit-costPrice' type='number' step='0.01' {...register('costPrice')} />
                                    {errors.costPrice && <p className='text-red-500 text-xs'>{errors.costPrice.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-currentStock'>Current Stock</Label>
                                    <Input id='edit-currentStock' type='number' {...register('currentStock')} />
                                    {errors.currentStock && <p className='text-red-500 text-xs'>{errors.currentStock.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-unit'>Unit</Label>
                                    <Controller
                                        name='unit'
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger id='edit-unit'>
                                                    <SelectValue placeholder='Select unit' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {units.map(unit => (
                                                        <SelectItem key={unit} value={unit}>
                                                            {unit}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.unit && <p className='text-red-500 text-xs'>{errors.unit.message}</p>}
                                </div>
                            </div>

                            <div className='flex justify-end gap-2 pt-4'>
                                <Button type='button' variant='outline' onClick={handleCloseEditDialog}>
                                    Cancel
                                </Button>
                                <Button type='submit' disabled={isLoading}>
                                    {isLoading ? 'Updating...' : 'Update Product'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
