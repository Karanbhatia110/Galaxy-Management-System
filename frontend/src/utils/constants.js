/**
 * Galaxy Construction Management System — Application Constants
 */

// ─── Expense Categories ──────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  { value: 'cement', label: 'Cement' },
  { value: 'steel', label: 'Steel' },
  { value: 'sand', label: 'Sand' },
  { value: 'bricks', label: 'Bricks' },
  { value: 'labour', label: 'Labour' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'machinery', label: 'Machinery' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

// ─── Project Statuses ────────────────────────────────────────────────
export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning', color: '#45B7D1' },
  { value: 'active', label: 'Active', color: '#6BCB77' },
  { value: 'on_hold', label: 'On Hold', color: '#FFD93D' },
  { value: 'completed', label: 'Completed', color: '#6C63FF' },
  { value: 'cancelled', label: 'Cancelled', color: '#FF6B6B' },
];

// ─── Document Types ──────────────────────────────────────────────────
export const DOCUMENT_TYPES = [
  { value: 'bills', label: 'Bills' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'drawings', label: 'Drawings' },
  { value: 'site_photos', label: 'Site Photos' },
  { value: 'certificates', label: 'Certificates' },
  { value: 'quotations', label: 'Quotations' },
];

// ─── Equipment Statuses ──────────────────────────────────────────────
export const EQUIPMENT_STATUSES = [
  { value: 'available', label: 'Available', color: '#6BCB77' },
  { value: 'in_use', label: 'In Use', color: '#45B7D1' },
  { value: 'maintenance', label: 'Under Maintenance', color: '#FFD93D' },
  { value: 'out_of_service', label: 'Out of Service', color: '#FF6B6B' },
  { value: 'rented', label: 'Rented', color: '#6C63FF' },
];

// ─── User Roles ──────────────────────────────────────────────────────
export const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'site_manager', label: 'Site Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'client', label: 'Client' },
];

// ─── Payment Methods ─────────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'demand_draft', label: 'Demand Draft' },
];

// ─── Pagination Defaults ─────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
};

// ─── Date Formats ────────────────────────────────────────────────────
export const DATE_FORMATS = {
  DISPLAY: 'DD MMM YYYY',
  DISPLAY_DATETIME: 'DD MMM YYYY, HH:mm',
  INPUT: 'YYYY-MM-DD',
  API: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
};
