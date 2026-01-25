# Sprint 2: Core Billing Module

**Phase:** 2
**Estimated Duration:** Weeks 3-4
**Status:** Planned
**Prerequisites:** Sprint 1

## Objectives

Develop the main Point of Sale (POS) interface, enabling users to create bills, handle dynamic pricing, and calculate totals with taxes and discounts.

## 1. Product Master (Prerequisite for Billing)

_Note: Full inventory management is Sprint 3, but we need basic product fetching for billing._

- [ ] Create simple Product Form to add test items.
- [ ] Implement Product Search/Lookup functions.

## 2. Billing Interface (POS)

### Features

- **Product Selection**: Search by name/code or scan barcode.
- **Cart Management**: Add/Remove items, update quantities.
- **Dynamic Pricing**: Edit price (if role allows), Apply line-item discount.
- **Customer Selection**: Link bill to existing customer or "Walk-in".
- **Calculations**: Auto-calculate Subtotal, Tax (GST), Discount, and Grand Total.

### Database Schema Requirements

**Collection: `bills`**

```javascript
bills/{billId}
{
  shopId: string,
  billNumber: string, // Auto-generated
  billDate: timestamp,
  customerId: string,
  customerName: string,
  customerType: "retail" | "wholesale",
  items: [
    {
      productId: string,
      productName: string,
      sku: string,
      quantity: number,
      unit: string,
      costPrice: number,
      sellingPrice: number,
      discount: number,
      tax: number,
      totalAmount: number
    }
  ],
  subtotal: number,
  discount: number,
  taxAmount: number,
  totalAmount: number,
  paidAmount: number,
  balanceAmount: number,
  paymentStatus: "paid" | "partial" | "unpaid",
  billStatus: "active" | "cancelled" | "returned",
  createdBy: string,
  createdAt: timestamp
}
```

### Tasks

- [ ] Design Billing Screen Layout (Split view: Search/Cart vs Totals/Actions).
- [ ] Implement Product Search Component (Debounced input).
- [ ] Build Cart State Management (Context or Zustand).
- [ ] Implement Tax & Discount calculation logic.
- [ ] Build Checkout Modal (Finalize amounts, Select Payment Mode).
- [ ] Generate unique Bill Number logic.

## 3. Barcode Integration

- [ ] Integrate `html5-qrcode` or `react-webcam`.
- [ ] Handle scan events to auto-add items to cart.

## 4. Invoice Generation

- [ ] Save Bill to Firestore.
- [ ] Generate Printable Invoice (Thermal/A4 support using `react-to-print`).

## Definition of Done

- User can search/scan products and add to cart.
- Totals, Taxes, and Discounts calculate correctly.
- Bill is saved to Firestore.
- Receipt can be printed.
