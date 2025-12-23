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
 * @returns {string|null} - Formatted date string (YYYY-MM-DD) or null
 */
function formatDateLocal(date) {
    if (!date) return null;
    if (typeof date === 'string') return date; // Already a string
    
    // Use UTC methods since PostgreSQL DATE is stored without timezone
    const y = date.getUTCFullYear();
    const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = date.getUTCDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
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
    createTeeDateTime
};
