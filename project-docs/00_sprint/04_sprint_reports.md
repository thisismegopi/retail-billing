# Sprint 4: Reports & Analytics

**Phase:** 4
**Estimated Duration:** Week 6
**Status:** Planned
**Prerequisites:** Sprint 3

## Objectives

Provide actionable insights through detailed reports on Sales, Inventory, and Customers.

## 1. Reporting Engine

### Features

- Date Range Filtering (Today, Yesterday, Last 7 Days, Custom Range).
- Export capabilities (PDF, Excel/CSV).
- Visual Charts (Sales Trends).

## 2. Report Types

### A. Sales Reports

- **Daily Sales Report**: Total sales, tax collected, payment mode breakdown.
- **Bill-wise Report**: List of all bills with status.
- **Item-wise Sales**: Which items sold the most/least.

### B. Customer Reports

- **Outstanding Report**: List of all customers with pending dues.
- **Customer Sales History**: Top buying customers.

### C. Inventory Reports

- **Stock Valuation**: Value of current inventory (Cost vs Retail).
- **Low Stock Report**: Items needing reorder.
- **Profit Analysis**: Margin calculation (Teaching Cost vs Selling Price).

### Tasks

- [ ] Install Charting library (`recharts` or `chart.js`).
- [ ] Implement `ReportsDashboard` with key metric cards (Total Sales, Total Due).
- [ ] Create specific report views with Tables and Filters.
- [ ] Implement Export to Excel logic.
- [ ] Build Profit Analysis calculation logic.

## Definition of Done

- Dashboard shows accurate real-time metrics.
- All defined reports can be generated and filtered by date.
- Export functionality works.
