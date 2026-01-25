import * as z from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Timestamp, addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Customer } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const customerFormSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    phone: z.string().trim().min(10, 'Phone must be at least 10 digits'),
    email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
    address: z.string().trim().optional(),
    customerType: z.enum(['retail', 'wholesale']),
    creditLimit: z.coerce.number().min(0, 'Credit limit must be positive'),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function CustomerListPage() {
    const { userData } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CustomerFormValues>({
        resolver: zodResolver(customerFormSchema) as any,
        defaultValues: {
            customerType: 'retail',
            creditLimit: 0,
        },
    });

    useEffect(() => {
        fetchCustomers();
    }, [userData]);

    const fetchCustomers = async () => {
        if (!userData?.shopId) return;

        const q = query(collection(db, 'customers'), where('shopId', '==', userData.shopId));
        const snapshot = await getDocs(q);
        const customerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Customer);
        setCustomers(customerList);
    };

    const onSubmit = async (data: CustomerFormValues) => {
        if (!userData?.shopId) {
            toast.error('No Shop ID associated with your account');
            return;
        }

        setIsLoading(true);
        try {
            // Check for duplicate phone number
            const phoneQuery = query(collection(db, 'customers'), where('shopId', '==', userData.shopId), where('phone', '==', data.phone));
            const phoneSnapshot = await getDocs(phoneQuery);

            if (phoneSnapshot.docs.length > 0) {
                toast.error('A customer with this phone number already exists');
                setIsLoading(false);
                return;
            }

            await addDoc(collection(db, 'customers'), {
                ...data,
                shopId: userData.shopId,
                outstandingBalance: 0,
                isActive: true,
                createdAt: Timestamp.now(),
            });
            reset();
            setShowForm(false);
            fetchCustomers();
            toast.success('Customer added successfully!');
        } catch (error) {
            console.error('Error adding customer:', error);
            toast.error('Failed to add customer');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setShowEditDialog(true);
    };

    const handleUpdate = async (data: CustomerFormValues) => {
        if (!userData?.shopId || !editingCustomer?.id) {
            toast.error('No Shop ID or Customer ID found.');
            return;
        }

        setIsLoading(true);
        try {
            // Check for duplicate phone number, excluding the current customer
            const phoneQuery = query(collection(db, 'customers'), where('shopId', '==', userData.shopId), where('phone', '==', data.phone));
            const phoneSnapshot = await getDocs(phoneQuery);

            const duplicateExists = phoneSnapshot.docs.some(doc => doc.id !== editingCustomer.id);

            if (duplicateExists) {
                toast.error('A customer with this phone number already exists');
                setIsLoading(false);
                return;
            }

            await updateDoc(doc(db, 'customers', editingCustomer.id), {
                name: data.name,
                phone: data.phone,
                email: data.email || '',
                address: data.address || '',
                customerType: data.customerType,
                creditLimit: data.creditLimit,
                updatedAt: Timestamp.now(),
            });
            setShowEditDialog(false);
            setEditingCustomer(null);
            fetchCustomers();
            toast.success('Customer updated successfully!');
        } catch (error) {
            console.error('Error updating customer:', error);
            toast.error('Failed to update customer');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='space-y-6'>
            <div className='flex justify-between items-center'>
                <h2 className='text-3xl font-bold tracking-tight'>Customers</h2>
                <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add Customer'}</Button>
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Customer</CardTitle>
                        <CardDescription>Enter customer details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div className='grid gap-2'>
                                    <Label htmlFor='name'>Name</Label>
                                    <Input id='name' {...register('name')} placeholder='Customer Name' />
                                    {errors.name && <p className='text-red-500 text-xs'>{errors.name.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='phone'>Phone</Label>
                                    <Input id='phone' {...register('phone')} placeholder='9876543210' />
                                    {errors.phone && <p className='text-red-500 text-xs'>{errors.phone.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='email'>Email (Optional)</Label>
                                    <Input id='email' {...register('email')} placeholder='customer@example.com' />
                                    {errors.email && <p className='text-red-500 text-xs'>{errors.email.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='customerType'>Type</Label>
                                    <select id='customerType' {...register('customerType')} className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'>
                                        <option value='retail'>Retail</option>
                                        <option value='wholesale'>Wholesale</option>
                                    </select>
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='creditLimit'>Credit Limit</Label>
                                    <Input id='creditLimit' type='number' step='0.01' {...register('creditLimit')} placeholder='0.00' />
                                    {errors.creditLimit && <p className='text-red-500 text-xs'>{errors.creditLimit.message}</p>}
                                </div>

                                <div className='grid gap-2 md:col-span-2'>
                                    <Label htmlFor='address'>Address (Optional)</Label>
                                    <Input id='address' {...register('address')} placeholder='Customer Address' />
                                </div>
                            </div>

                            <div className='flex justify-end gap-2 pt-4'>
                                <Button type='button' variant='outline' onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                                <Button type='submit' disabled={isLoading}>
                                    {isLoading ? 'Adding...' : 'Add Customer'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Customer List</CardTitle>
                </CardHeader>
                <CardContent>
                    {customers.length === 0 ? (
                        <p className='text-gray-500 text-center py-8'>No customers found. Add your first customer.</p>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead>
                                    <tr className='border-b'>
                                        <th className='text-left p-2'>Name</th>
                                        <th className='text-left p-2'>Phone</th>
                                        <th className='text-left p-2'>Type</th>
                                        <th className='text-right p-2'>Credit Limit</th>
                                        <th className='text-right p-2'>Outstanding</th>
                                        <th className='text-center p-2'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map(customer => (
                                        <tr key={customer.id} className='border-b hover:bg-gray-50'>
                                            <td className='p-2'>{customer.name}</td>
                                            <td className='p-2'>{customer.phone}</td>
                                            <td className='p-2 capitalize'>{customer.customerType}</td>
                                            <td className='p-2 text-right'>{formatCurrency(customer.creditLimit)}</td>
                                            <td className='p-2 text-right font-semibold text-red-600'>{formatCurrency(customer.outstandingBalance)}</td>
                                            <td className='p-2 text-center'>
                                                <Button size='sm' variant='outline' onClick={() => handleEdit(customer)}>
                                                    Edit
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

            {/* Edit Customer Dialog */}
            {editingCustomer && (
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className='max-w-2xl'>
                        <DialogHeader>
                            <DialogTitle>Edit Customer</DialogTitle>
                            <DialogDescription>Update customer details.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(handleUpdate)} className='space-y-4'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-name'>Name</Label>
                                    <Input id='edit-name' {...register('name')} defaultValue={editingCustomer.name} />
                                    {errors.name && <p className='text-red-500 text-xs'>{errors.name.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-phone'>Phone</Label>
                                    <Input id='edit-phone' {...register('phone')} defaultValue={editingCustomer.phone} />
                                    {errors.phone && <p className='text-red-500 text-xs'>{errors.phone.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-email'>Email (Optional)</Label>
                                    <Input id='edit-email' {...register('email')} defaultValue={editingCustomer.email || ''} />
                                    {errors.email && <p className='text-red-500 text-xs'>{errors.email.message}</p>}
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-customerType'>Type</Label>
                                    <select
                                        id='edit-customerType'
                                        {...register('customerType')}
                                        defaultValue={editingCustomer.customerType}
                                        className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                                    >
                                        <option value='retail'>Retail</option>
                                        <option value='wholesale'>Wholesale</option>
                                    </select>
                                </div>

                                <div className='grid gap-2'>
                                    <Label htmlFor='edit-creditLimit'>Credit Limit</Label>
                                    <Input id='edit-creditLimit' type='number' step='0.01' {...register('creditLimit')} defaultValue={editingCustomer.creditLimit} />
                                    {errors.creditLimit && <p className='text-red-500 text-xs'>{errors.creditLimit.message}</p>}
                                </div>

                                <div className='grid gap-2 md:col-span-2'>
                                    <Label htmlFor='edit-address'>Address (Optional)</Label>
                                    <Input id='edit-address' {...register('address')} defaultValue={editingCustomer.address || ''} />
                                </div>
                            </div>

                            <div className='flex justify-end gap-2 pt-4'>
                                <Button type='button' variant='outline' onClick={() => setShowEditDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type='submit' disabled={isLoading}>
                                    {isLoading ? 'Updating...' : 'Update Customer'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
