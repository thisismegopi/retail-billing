import * as z from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Plus } from 'lucide-react';
import { Timestamp, addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const categoryFormSchema = z.object({
    name: z.string().trim().min(1, 'Category name is required'),
    description: z.string().trim().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoryListPage() {
    const { userData } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema) as any,
        defaultValues: {
            name: '',
            description: '',
        },
    });

    useEffect(() => {
        fetchCategories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData]);

    const fetchCategories = async () => {
        if (!userData?.shopId) return;

        const q = query(collection(db, 'categories'), where('shopId', '==', userData.shopId));
        const snapshot = await getDocs(q);
        const categoryList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Category);
        setCategories(categoryList.sort((a, b) => a.name.localeCompare(b.name)));
    };

    const onSubmit = async (data: CategoryFormValues) => {
        if (!userData?.shopId) {
            toast.error('No Shop ID associated with your account');
            return;
        }

        setIsLoading(true);
        try {
            // Check for duplicate category name
            const nameQuery = query(collection(db, 'categories'), where('shopId', '==', userData.shopId), where('name', '==', data.name));
            const nameSnapshot = await getDocs(nameQuery);

            if (nameSnapshot.docs.length > 0) {
                toast.error('A category with this name already exists');
                setIsLoading(false);
                return;
            }

            await addDoc(collection(db, 'categories'), {
                ...data,
                shopId: userData.shopId,
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            reset();
            setShowForm(false);
            fetchCategories();
            toast.success('Category added successfully!');
        } catch (error) {
            console.error('Error adding category:', error);
            toast.error('Failed to add category');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setShowEditDialog(true);
    };

    const handleUpdate = async (data: CategoryFormValues) => {
        if (!userData?.shopId || !editingCategory?.id) {
            toast.error('No Shop ID or Category ID found.');
            return;
        }

        setIsLoading(true);
        try {
            // Check for duplicate category name, excluding the current category
            const nameQuery = query(collection(db, 'categories'), where('shopId', '==', userData.shopId), where('name', '==', data.name));
            const nameSnapshot = await getDocs(nameQuery);

            const duplicateExists = nameSnapshot.docs.some(doc => doc.id !== editingCategory.id);

            if (duplicateExists) {
                toast.error('A category with this name already exists');
                setIsLoading(false);
                return;
            }

            await updateDoc(doc(db, 'categories', editingCategory.id), {
                name: data.name,
                description: data.description || '',
                updatedAt: Timestamp.now(),
            });
            setShowEditDialog(false);
            setEditingCategory(null);
            fetchCategories();
            toast.success('Category updated successfully!');
        } catch (error) {
            console.error('Error updating category:', error);
            toast.error('Failed to update category');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleActive = async (category: Category) => {
        if (!category.id) return;

        try {
            await updateDoc(doc(db, 'categories', category.id), {
                isActive: !category.isActive,
                updatedAt: Timestamp.now(),
            });
            fetchCategories();
            toast.success(`Category ${category.isActive ? 'deactivated' : 'activated'} successfully!`);
        } catch (error) {
            console.error('Error toggling category status:', error);
            toast.error('Failed to update category status');
        }
    };

    // Filter categories based on search term
    const filteredCategories = categories.filter(category => category.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className='space-y-6'>
            <div className='flex justify-between items-center'>
                <h2 className='text-3xl font-bold tracking-tight'>Categories</h2>
                <Button onClick={() => setShowForm(true)}>
                    <Plus className='mr-2 h-4 w-4' />
                    Add Category
                </Button>
            </div>

            {/* Create Category Form */}
            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Category</CardTitle>
                        <CardDescription>Create a new product category</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor='name'>Category Name *</Label>
                                    <Input id='name' {...register('name')} placeholder='e.g., Electronics' />
                                    {errors.name && <p className='text-sm text-red-600'>{errors.name.message}</p>}
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='description'>Description</Label>
                                    <Input id='description' {...register('description')} placeholder='Optional description' />
                                </div>
                            </div>
                            <div className='flex gap-2'>
                                <Button type='submit' disabled={isLoading}>
                                    {isLoading ? 'Adding...' : 'Add Category'}
                                </Button>
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={() => {
                                        setShowForm(false);
                                        reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Categories List */}
            <Card>
                <CardHeader>
                    <CardTitle>Category List</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Search Bar */}
                    <div className='mb-4'>
                        <Input placeholder='Search categories by name...' value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className='max-w-sm' />
                    </div>

                    {filteredCategories.length === 0 ? (
                        <p className='text-gray-500 text-center py-8'>{searchTerm ? 'No categories found matching your search.' : 'No categories found. Add your first category.'}</p>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead>
                                    <tr className='border-b'>
                                        <th className='text-left p-2'>Name</th>
                                        <th className='text-left p-2'>Description</th>
                                        <th className='text-left p-2'>Status</th>
                                        <th className='text-center p-2'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCategories.map(category => (
                                        <tr key={category.id} className='border-b hover:bg-gray-50'>
                                            <td className='p-2 font-medium'>{category.name}</td>
                                            <td className='p-2 text-sm text-gray-600'>{category.description || '-'}</td>
                                            <td className='p-2'>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {category.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className='p-2 text-center space-x-2'>
                                                <Button variant='ghost' size='sm' onClick={() => handleEdit(category)}>
                                                    <Pencil className='h-4 w-4' />
                                                </Button>
                                                <Button variant='outline' size='sm' onClick={() => handleToggleActive(category)}>
                                                    {category.isActive ? 'Deactivate' : 'Activate'}
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

            {/* Edit Category Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                        <DialogDescription>Update category information</DialogDescription>
                    </DialogHeader>
                    {editingCategory && (
                        <form onSubmit={handleSubmit(handleUpdate)} className='space-y-4'>
                            <div className='space-y-2'>
                                <Label htmlFor='edit-name'>Category Name *</Label>
                                <Input id='edit-name' {...register('name')} defaultValue={editingCategory.name} placeholder='Category name' />
                                {errors.name && <p className='text-sm text-red-600'>{errors.name.message}</p>}
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='edit-description'>Description</Label>
                                <Textarea id='edit-description' {...register('description')} defaultValue={editingCategory.description || ''} placeholder='Optional description' rows={3} />
                            </div>
                            <div className='flex gap-2 justify-end'>
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={() => {
                                        setShowEditDialog(false);
                                        setEditingCategory(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type='submit' disabled={isLoading}>
                                    {isLoading ? 'Updating...' : 'Update Category'}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
