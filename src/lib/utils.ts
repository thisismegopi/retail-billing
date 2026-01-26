import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format number to Indian currency format with rupee symbol
 * Examples: ₹100, ₹1,000, ₹10,000, ₹1,00,000, ₹10,00,000
 */
export function formatCurrency(amount: number): string {
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(amount);
}

export function formatCurrencyPDF(amount: number): string {
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(amount);
}

/**
 * Format number to Indian number format without currency symbol
 * Examples: 100, 1,000, 10,000, 1,00,000, 10,00,000
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-IN').format(num);
}
