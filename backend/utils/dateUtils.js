/**
 * Date utility functions for consistent date handling
 * PostgreSQL DATE type returns JS Date objects that need careful handling
 * to avoid timezone conversion issues
 */

/**
 * Format a date without timezone conversion
 * PostgreSQL DATE comes as JS Date object at midnight UTC
 * Using getUTC* methods ensures we get the stored date without local timezone shift
 * 
 * @param {Date|string|null} date - Date to format
 * @returns {string|null} - Formatted date string (MM-DD-YYYY) or null
 */
function formatDateLocal(date) {
    if (!date) return null;
    if (typeof date === 'string') {
        const iso = parseApiDateToISO(date);
        if (!iso) return date;
        const [y, m, d] = iso.split("-");
        return `${m}-${d}-${y}`;
    }
    
    // Use UTC methods since PostgreSQL DATE is stored without timezone
    const y = date.getUTCFullYear();
    const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = date.getUTCDate().toString().padStart(2, '0');
    return `${m}-${d}-${y}`;
}

/**
 * Normalize API date input to ISO calendar format (YYYY-MM-DD).
 * Accepts YYYY-MM-DD and MM-DD-YYYY.
 *
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
function parseApiDateToISO(value) {
    if (!value) return null;
    const s = String(value).trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
    if (m) return `${m[3]}-${m[1]}-${m[2]}`;
    return null;
}

/**
 * Create a JavaScript Date object from PostgreSQL DATE and TIME
 * Handles the timezone issue by using UTC methods for the date part
 * 
 * @param {Date|string} pgDate - PostgreSQL DATE (Date object or string)
 * @param {string} timeStr - Time string in HH:MM or HH:MM:SS format
 * @returns {Date} - JavaScript Date object in local time
 */
function createTeeDateTime(pgDate, timeStr) {
    let dateStr;
    if (typeof pgDate === 'string') {
        dateStr = pgDate;
    } else {
        // PostgreSQL DATE - use UTC methods to get the actual stored date
        const y = pgDate.getUTCFullYear();
        const m = (pgDate.getUTCMonth() + 1).toString().padStart(2, '0');
        const d = pgDate.getUTCDate().toString().padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
    }
    return new Date(`${dateStr}T${timeStr}`);
}

module.exports = {
    formatDateLocal,
  createTeeDateTime,
  parseApiDateToISO,
};
