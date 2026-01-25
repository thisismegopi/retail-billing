# Sprint 3: Inventory & Collections

**Phase:** 3
**Estimated Duration:** Week 5
**Status:** Planned
**Prerequisites:** Sprint 2

## Objectives

Complete the full Inventory Management system and implement the Collection module to track payments and outstanding balances.

## 1. Advanced Inventory Management

### Features

- **Product CRUD**: Full Create, Read, Update, Delete for products.
- **Stock Tracking**: Real-time stock updates on sales.
- **Low Stock Alerts**: Visual indicators for items below reorder level.
- **Bulk Operations**: Optional CSV import/export.

### Database Schema Requirements

**Collection: `products`**

```javascript
products/{productId}
{
   ...
   currentStock: number,
   reorderLevel: number,
   wholesalePrice: number,
   retailPrice: number
}
```

**Collection: `stockTransactions`**

- Track history of all movements (Purchase, Sale, Adjustment).

### Tasks

- [ ] Build detailed Product Management Grid.
- [ ] Implement logic to decrement stock upon Bill creation (**Client-side Firestore Transaction**).
    - _Note: Since we are on Free Tier, we cannot use Cloud Functions. Logic must be atomic on client._
- [ ] Create Stock Adjustment screen (for manual corrections).

## 2. Customer Management

### Features

- Customer Directory (searchable).
- Credit Limit tracking.
- Purchase History view.

### Database Schema Requirements

**Collection: `customers`**

```javascript
customers/{customerId}
{
  name: string,
  phone: string,
  creditLimit: number,
  outstandingBalance: number,
  ...
}
```

### Tasks

- [ ] Build Customer List and Add/Edit forms.
- [ ] Implement "Customer Detail" view showing previous bills.

## 3. Collection & Payment Module

### Features

- Accept payments for outstanding bills.
- Ledger view for customers.
- Partial payment handling.

### Database Schema Requirements

**Collection: `collections`**

```javascript
collections/{collectionId}
{
  billId: string,
  customerId: string,
  amount: number,
  paymentMethod: "cash" | "card" | "upi",
  paymentDate: timestamp,
  ...
}
```

### Tasks

- [ ] Update Billing checkout to support "Credit" payment mode (updates customer outstanding).
- [ ] Create "Collect Payment" interface (Select customer -> View Unpaid Bills -> Pay).
- [ ] Update `bills` payment status logic (unpaid -> partial -> paid).

## Definition of Done

- Inventory counts automatically update after sales.
- Can manage full product details.
- Can create customers and sell on credit.
- Can record later payments against credit bills.
