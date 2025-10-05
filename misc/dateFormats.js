/*

This file is to format display of dates.
for every use, we can create another display function.

*/

export function formatDateForPortfolio(input) {
    const pad = (n) => String(n).padStart(2, '0');
  
    // Convert any Date/ISO/number to a Date
    const d = new Date(input);
  
    // Convert to Istanbul time (UTC+3). Türkiye doesn't do DST, so +3h is stable.
    const IST_OFFSET_MS = 3 * 60 * 60 * 1000;
    const ist = new Date(d.getTime() + IST_OFFSET_MS);
  
    // Read parts using UTC getters (because we manually shifted the clock)
    const year   = ist.getUTCFullYear();
    const month  = ist.getUTCMonth() + 1;   // 1-12
    const day    = ist.getUTCDate();        // 1-31
    const hours  = ist.getUTCHours();       // 0-23
    const minutes= ist.getUTCMinutes();     // 0-59
  
    // "Now" in Istanbul
    const now = new Date(Date.now() + IST_OFFSET_MS);
    const nYear  = now.getUTCFullYear();
    const nMonth = now.getUTCMonth() + 1;
    const nDay   = now.getUTCDate();
  
    // Helpers to compare calendar days (in Istanbul)
    const asUTCmidnight = (Y, M, D) => Date.UTC(Y, M - 1, D);
    const todayMid = asUTCmidnight(nYear, nMonth, nDay);
    const thatMid  = asUTCmidnight(year, month, day);
    const diffDays = Math.floor((todayMid - thatMid) / 86400000);
  
    const timePart = `🕒 ${pad(hours)}:${pad(minutes)}`;
  
    // Same day → only time
    if (year === nYear && month === nMonth && day === nDay) {
        return timePart;
    }
  
    // Yesterday → "(Yesterday) " + time
    if (diffDays === 1) {
        return `${timePart} (Yesterday)`;
    }

    if (diffDays === 2) {
        return `${timePart} (2 Days ago) `;
    }
  
    // Otherwise → date + time
    return `${timePart} 🗓️ ${pad(day)}.${pad(month)}`;
  }
  

  export function formatDateForTS(date) {
    const d = new Date(date);

    // Shift to UTC+3 (Istanbul time) — Türkiye doesn't do DST, so this is safe
    const ist = new Date(d.getTime() + 3 * 60 * 60 * 1000);

    const day = String(ist.getUTCDate()).padStart(2, '0');
    const month = String(ist.getUTCMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const year = ist.getUTCFullYear();

    const hours = String(ist.getUTCHours()).padStart(2, '0');
    const minutes = String(ist.getUTCMinutes()).padStart(2, '0');

    return `🗓️ ${day}.${month}.${year} 🕒 ${hours}:${minutes}`;
}