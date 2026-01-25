import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div className='flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4'>
            <div className='w-full max-w-md'>
                <Outlet />
            </div>
        </div>
    );
}
