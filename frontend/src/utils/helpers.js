/**
 * Galaxy Construction Management System — Utility Helpers
 */

/**
 * Format a number as Indian Rupees (₹) with proper comma grouping.
 * Indian numbering: 1,00,00,000 (crores pattern).
 *
 * @param {number|string} amount - The amount to format.
 * @returns {string} Formatted currency string, e.g. "₹1,23,456.00"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0.00';
  }

  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a date string as "DD MMM YYYY" (e.g. "15 Jun 2026").
 *
 * @param {string|Date} dateString - The date to format.
 * @returns {string} Formatted date string.
 */
export function formatDate(dateString) {
  if (!dateString) return '—';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format a date string as "DD MMM YYYY, HH:mm" (e.g. "15 Jun 2026, 14:30").
 *
 * @param {string|Date} dateString - The date/time to format.
 * @returns {string} Formatted datetime string.
 */
export function formatDateTime(dateString) {
  if (!dateString) return '—';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    const datePart = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const timePart = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${datePart}, ${timePart}`;
  } catch {
    return '—';
  }
}

/**
 * Return a MUI-compatible color for a project status.
 *
 * @param {string} status - The project status value.
 * @returns {string} Hex color code.
 */
export function getStatusColor(status) {
  const colorMap = {
    planning: '#45B7D1',
    active: '#6BCB77',
    on_hold: '#FFD93D',
    completed: '#6C63FF',
    cancelled: '#FF6B6B',
    // Equipment statuses
    available: '#6BCB77',
    in_use: '#45B7D1',
    maintenance: '#FFD93D',
    out_of_service: '#FF6B6B',
    rented: '#6C63FF',
    // Payment statuses
    paid: '#6BCB77',
    pending: '#FFD93D',
    overdue: '#FF6B6B',
    partial: '#45B7D1',
  };

  return colorMap[status?.toLowerCase()] || '#94A3B8';
}

/**
 * Get the MUI color name (for Chip color prop, etc.) for a status.
 *
 * @param {string} status - The project status value.
 * @returns {string} MUI color name.
 */
export function getStatusMuiColor(status) {
  const muiColorMap = {
    planning: 'info',
    active: 'success',
    on_hold: 'warning',
    completed: 'primary',
    cancelled: 'error',
    available: 'success',
    in_use: 'info',
    maintenance: 'warning',
    out_of_service: 'error',
    paid: 'success',
    pending: 'warning',
    overdue: 'error',
  };

  return muiColorMap[status?.toLowerCase()] || 'default';
}

/**
 * Extract initials from a full name.
 *
 * @param {string} name - Full name (e.g. "Karan Sharma").
 * @returns {string} Initials (e.g. "KS"), max 2 characters.
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Truncate text to a maximum length, appending ellipsis if necessary.
 *
 * @param {string} text - The text to truncate.
 * @param {number} maxLength - Maximum allowed length (default: 50).
 * @returns {string} Truncated string.
 */
export function truncateText(text, maxLength = 50) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + '…';
}

/**
 * Format a number in a compact, readable way (e.g. 1.2L, 15Cr).
 *
 * @param {number} num - The number to format.
 * @returns {string} Compact representation.
 */
export function formatCompactNumber(num) {
  if (num === null || num === undefined || isNaN(Number(num))) return '0';

  const n = Math.abs(Number(num));

  if (n >= 1e7) return `${(num / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(num / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `${(num / 1e3).toFixed(1)} K`;
  return num.toString();
}

/**
 * Calculate percentage, safely handling division by zero.
 *
 * @param {number} part - The partial value.
 * @param {number} total - The total value.
 * @param {number} decimals - Number of decimal places (default: 1).
 * @returns {number} The percentage.
 */
export function calculatePercentage(part, total, decimals = 1) {
  if (!total || total === 0) return 0;
  return Number(((part / total) * 100).toFixed(decimals));
}

/**
 * Get a human-readable time-ago string.
 *
 * @param {string|Date} dateString - The reference date.
 * @returns {string} e.g. "2 hours ago", "3 days ago".
 */
export function timeAgo(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
}

/**
 * Download a Blob as a file in the browser.
 *
 * @param {Blob} blob - The blob to download.
 * @param {string} filename - Desired filename.
 */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
