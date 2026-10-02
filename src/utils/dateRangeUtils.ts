/**
 * Indian Standard Time (IST, Asia/Kolkata, UTC+5:30) Date Utilities
 * Ensures consistent timezone-aware date range calculation and formatting.
 */

export type DateRangePreset =
  | 'Today'
  | 'Yesterday'
  | 'This Week'
  | 'Last Week'
  | 'Last 7 Days'
  | 'Last 30 Days'
  | 'This Month'
  | 'Last Month'
  | 'This Quarter'
  | 'Last Quarter'
  | 'This Year'
  | 'Last Year'
  | 'Custom'
  | 'Custom Range';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

/**
 * Returns current date/time in Asia/Kolkata as a Date object adjusted to IST components
 */
export function getNowInKolkata(): Date {
  const now = new Date();
  const kolkataTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(kolkataTimeString);
}

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD or ISO string to Indian display format: DD MMM YYYY
 */
export function formatDateDisplayIST(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00Z` : dateStr);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats an ISO string to Indian display format with time: DD MMM YYYY, hh:mm A IST
 */
export function formatDateTimeDisplayIST(isoStr?: string | null): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

/**
 * Calculates start and end dates (YYYY-MM-DD) for a given DateRangePreset
 */
export function getDateRangeFromPreset(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = getNowInKolkata();
  const todayStr = formatDateYMD(now);

  switch (preset) {
    case 'Today':
      return {
        preset,
        startDate: todayStr,
        endDate: todayStr,
        label: `Today (${formatDateDisplayIST(todayStr)})`,
      };

    case 'Yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDateYMD(y);
      return {
        preset,
        startDate: yStr,
        endDate: yStr,
        label: `Yesterday (${formatDateDisplayIST(yStr)})`,
      };
    }

    case 'This Week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(now.setDate(diff + 6));
      const startStr = formatDateYMD(monday);
      const endStr = formatDateYMD(sunday);
      return {
        preset,
        startDate: startStr,
        endDate: endStr,
        label: `This Week (${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(endStr)})`,
      };
    }

    case 'Last Week': {
      const day = now.getDay();
      const diff = now.getDate() - day - 6 + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(now.setDate(diff + 6));
      const startStr = formatDateYMD(monday);
      const endStr = formatDateYMD(sunday);
      return {
        preset,
        startDate: startStr,
        endDate: endStr,
        label: `Last Week (${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(endStr)})`,
      };
    }

    case 'Last 7 Days': {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      const startStr = formatDateYMD(d7);
      return {
        preset,
        startDate: startStr,
        endDate: todayStr,
        label: `${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(todayStr)}`,
      };
    }

    case 'Last 30 Days': {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 29);
      const startStr = formatDateYMD(d30);
      return {
        preset,
        startDate: startStr,
        endDate: todayStr,
        label: `${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(todayStr)}`,
      };
    }

    case 'This Month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startStr = formatDateYMD(start);
      const endStr = formatDateYMD(end);
      return {
        preset,
        startDate: startStr,
        endDate: endStr,
        label: `${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(endStr)}`,
      };
    }

    case 'Last Month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const startStr = formatDateYMD(start);
      const endStr = formatDateYMD(end);
      return {
        preset,
        startDate: startStr,
        endDate: endStr,
        label: `${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(endStr)}`,
      };
    }

    case 'This Quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      const startStr = formatDateYMD(start);
      const endStr = formatDateYMD(end);
      return {
        preset,
        startDate: startStr,
        endDate: endStr,
        label: `Q${quarter + 1} (${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(endStr)})`,
      };
    }

    case 'Last Quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const start = new Date(year, lastQuarter * 3, 1);
      const end = new Date(year, lastQuarter * 3 + 3, 0);
      const startStr = formatDateYMD(start);
      const endStr = formatDateYMD(end);
      return {
        preset,
        startDate: startStr,
        endDate: endStr,
        label: `Q${lastQuarter + 1} ${year} (${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(endStr)})`,
      };
    }

    case 'This Year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      const startStr = formatDateYMD(start);
      const endStr = formatDateYMD(end);
      return {
        preset,
        startDate: startStr,
        endDate: endStr,
        label: `${now.getFullYear()} (${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(endStr)})`,
      };
    }

    case 'Last Year': {
      const lastY = now.getFullYear() - 1;
      const start = new Date(lastY, 0, 1);
      const end = new Date(lastY, 11, 31);
      const startStr = formatDateYMD(start);
      const endStr = formatDateYMD(end);
      return {
        preset,
        startDate: startStr,
        endDate: endStr,
        label: `${lastY} (${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(endStr)})`,
      };
    }

    case 'Custom':
    case 'Custom Range': {
      const startStr = customStart || todayStr;
      const endStr = customEnd || todayStr;
      return {
        preset,
        startDate: startStr,
        endDate: endStr,
        label: `${formatDateDisplayIST(startStr)} – ${formatDateDisplayIST(endStr)}`,
      };
    }

    default:
      return {
        preset: 'This Month',
        startDate: todayStr,
        endDate: todayStr,
        label: formatDateDisplayIST(todayStr),
      };
  }
}

/**
 * Checks if a given timestamp/date string falls within [startDate, endDate] inclusive
 * Accepts YYYY-MM-DD or full ISO strings
 */
export function isWithinDateRange(
  recordDateStr?: string | null,
  startDateOrRange?: string | DateRange,
  endDate?: string
): boolean {
  if (!recordDateStr) return false;
  const start = typeof startDateOrRange === 'object' && startDateOrRange !== null ? startDateOrRange.startDate : startDateOrRange;
  const end = typeof startDateOrRange === 'object' && startDateOrRange !== null ? startDateOrRange.endDate : endDate;
  if (!start && !end) return true;

  // Extract YYYY-MM-DD representation in Asia/Kolkata
  let recYmd: string;
  if (recordDateStr.length === 10 && recordDateStr.includes('-')) {
    recYmd = recordDateStr;
  } else {
    try {
      const d = new Date(recordDateStr);
      if (isNaN(d.getTime())) return false;
      const kolkataString = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      recYmd = formatDateYMD(new Date(kolkataString));
    } catch {
      recYmd = recordDateStr.slice(0, 10);
    }
  }

  if (start && recYmd < start) return false;
  if (end && recYmd > end) return false;
  return true;
}

/**
 * Formats a currency number in INR (e.g. 125000 -> ₹1,25,000)
 */
export function formatINR(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}
