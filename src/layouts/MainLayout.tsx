import { BarChart3, DollarSign, Folder, LayoutDashboard, LogOut, Package, Settings, ShoppingCart, Users } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';

export default function MainLayout() {
    const { user, userData } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [shopName, setShopName] = useState('Retail Billing');

    useEffect(() => {
        const fetchShopName = async () => {
            if (userData?.shopId) {
                try {
                    const shopDoc = await getDoc(doc(db, 'shops', userData.shopId));
                    if (shopDoc.exists()) {
                        setShopName(shopDoc.data().name || 'Retail Billing');
                    }
                } catch (error) {
                    console.error('Error fetching shop name:', error);
                }
            }
        };
        fetchShopName();
    }, [userData]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/auth/login');
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/billing', label: 'Billing', icon: ShoppingCart },
        { path: '/products', label: 'Products', icon: Package },
        { path: '/categories', label: 'Categories', icon: Folder },
        { path: '/customers', label: 'Customers', icon: Users },
        { path: '/collections', label: 'Collections', icon: DollarSign },
        { path: '/reports', label: 'Reports', icon: BarChart3 },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <SidebarProvider defaultOpen={true}>
            <Sidebar collapsible='icon'>
                <SidebarHeader className='border-b px-6 py-4'>
                    <h2 className='text-lg font-semibold group-data-[state=collapsed]:hidden'>{shopName}</h2>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarMenu>
                            {navItems.map(item => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <SidebarMenuItem key={item.path}>
                                        <SidebarMenuButton asChild isActive={isActive}>
                                            <Link to={item.path}>
                                                <Icon />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter className='border-t p-2'>
                    <div className='flex items-center justify-between gap-2'>
                        <span className='text-sm text-muted-foreground truncate flex-1 group-data-[state=collapsed]:hidden'>{user?.email}</span>
                        <Button variant='ghost' size='icon' onClick={handleLogout} title='Logout' className='shrink-0'>
                            <LogOut className='h-4 w-4' />
                        </Button>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <main className='flex flex-1 flex-col w-full h-screen overflow-hidden'>
                {/* Header */}
                <header className='sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 flex-shrink-0'>
                    <SidebarTrigger className='-ml-1' />
                    <div className='flex-1' />
                    <ThemeToggle />
                    <span className='text-sm text-muted-foreground hidden sm:inline'>{user?.email}</span>
                    <Button variant='outline' size='sm' onClick={handleLogout} className='hidden sm:flex'>
                        <LogOut className='mr-2 h-4 w-4' />
                        Logout
                    </Button>
                </header>

                {/* Main Content */}
                <div className='flex-1 p-4 sm:p-6 overflow-auto'>
                    <Outlet />
                </div>
            </main>
        </SidebarProvider>
    );
}
