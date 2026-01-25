import * as z from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Shop } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

const shopSchema = z.object({
    name: z.string().min(3, 'Shop name must be at least 3 characters'),
    address: z.string().min(5, 'Address is required'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    email: z.string().email('Invalid email address'),
    gstNumber: z.string().optional(),
});

type ShopFormValues = z.infer<typeof shopSchema>;

export default function ShopSettingsPage() {
    const { userData } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<ShopFormValues>({
        resolver: zodResolver(shopSchema),
    });

    useEffect(() => {
        const fetchShop = async () => {
            if (userData?.shopId) {
                const docRef = doc(db, 'shops', userData.shopId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Shop;
                    setValue('name', data.name);
                    setValue('address', data.address);
                    setValue('phone', data.phone);
                    setValue('email', data.email);
                    setValue('gstNumber', data.gstNumber);
                }
            }
        };
        fetchShop();
    }, [userData, setValue]);

    const onSubmit = async (data: ShopFormValues) => {
        if (!userData?.shopId) {
            toast.error('No Shop ID associated with your account');
            return;
        }

        setIsLoading(true);
        setSuccessMessage('');
        try {
            const shopRef = doc(db, 'shops', userData.shopId);
            await setDoc(
                shopRef,
                {
                    ...data,
                    updatedAt: Timestamp.now(),
                    // If it's a new doc, we might want createdAt, usually handled by checking existence first or server rules
                    // For simplicity, we just merge or overwrite
                },
                { merge: true },
            );
            setSuccessMessage('Shop details updated successfully!');
        } catch (error) {
            console.error('Error updating shop:', error);
            alert('Failed to update shop details.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='max-w-2xl mx-auto'>
            <h2 className='text-3xl font-bold tracking-tight mb-6'>Settings</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Shop Profile</CardTitle>
                    <CardDescription>Manage your business details for billing and reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    {successMessage && <div className='bg-green-100 text-green-800 p-3 rounded mb-4 text-sm font-medium'>{successMessage}</div>}
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                        <div className='grid gap-2'>
                            <Label htmlFor='name'>Shop Name</Label>
                            <Input id='name' {...register('name')} placeholder='My Retail Store' />
                            {errors.name && <p className='text-red-500 text-xs'>{errors.name.message}</p>}
                        </div>

                        <div className='grid gap-2'>
                            <Label htmlFor='address'>Address</Label>
                            <Input id='address' {...register('address')} placeholder='123 Main St, City' />
                            {errors.address && <p className='text-red-500 text-xs'>{errors.address.message}</p>}
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div className='grid gap-2'>
                                <Label htmlFor='phone'>Phone</Label>
                                <Input id='phone' {...register('phone')} placeholder='9876543210' />
                                {errors.phone && <p className='text-red-500 text-xs'>{errors.phone.message}</p>}
                            </div>

                            <div className='grid gap-2'>
                                <Label htmlFor='email'>Email</Label>
                                <Input id='email' {...register('email')} placeholder='contact@shop.com' />
                                {errors.email && <p className='text-red-500 text-xs'>{errors.email.message}</p>}
                            </div>
                        </div>

                        <div className='grid gap-2'>
                            <Label htmlFor='gstNumber'>GST Number (Optional)</Label>
                            <Input id='gstNumber' {...register('gstNumber')} placeholder='22AAAAA0000A1Z5' />
                        </div>

                        <div className='flex justify-end pt-4'>
                            <Button type='submit' disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
