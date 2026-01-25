export function generateBillNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
    return `BILL-${year}${month}${day}-${random}`;
}

export function calculateBillTotals(items: Array<{ totalAmount: number }>, discount: number, taxRate: number) {
    const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
    const taxAmount = ((subtotal - discount) * taxRate) / 100;
    const totalAmount = subtotal - discount + taxAmount;

    return {
        subtotal,
        taxAmount,
        totalAmount,
    };
}

export function generateSKU(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `SKU-${year}${month}${day}${hours}${minutes}${seconds}`;
}
