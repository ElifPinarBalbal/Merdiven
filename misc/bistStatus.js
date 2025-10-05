/*

!! IMPORTANT: SHOULD BE UPDATED ON EVERY YEAR'S BEGINNING.
https://borsaistanbul.com/tr/sayfa/143/resmi-tatil-gunleri

This is the main file where we can check if BIST market is open or not.
Also, we can provide 2 additional things as returned result:
1. Remaining minutes till opening.
2. A promise which only resolves at exact time when market opens.

To check if market is open or not, we will follow these steps:
1. TIME: If we are between 9.40 - 18.10.
2. WEEKDAY: If the weekday of now is not Saturday or Sunday.
3. HOLIDAYS: If we are in (full day) holidays or not.
4. HALF-DAYS: If we are in half-days or not.
5. EXTRA-STEP: TradingView's market status check. (Only within 9.56 - 18.24)

*/

let isWSSactive;

import TradingView from '@mathieuc/tradingview';

const fullHolidays = new Set([
  '2025-01-01',
  '2025-03-30',
  '2025-03-31',
  '2025-04-01',
  '2025-04-23',
  '2025-05-01',
  '2025-05-19',
  '2025-06-06',
  '2025-06-07',
  '2025-06-08',
  '2025-06-09',
  '2025-07-15',
  '2025-08-30',
  '2025-10-29',
]);

const halfHolidays = {
  '2025-06-05': '13:00',
  '2025-10-28': '13:00'
};

// Get Istanbul date object with offset
function getIstanbulTime() {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    date,
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: +parts.hour,
    minute: +parts.minute,
    second: +parts.second,
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: new Date(`${parts.year}-${parts.month}-${parts.day}`).getDay() // 0 = Sunday, 6 = Saturday
  };
}

function getIstanbulTimeFromDate(date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    date: new Date(date),
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: +parts.hour,
    minute: +parts.minute,
    second: +parts.second,
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: new Date(`${parts.year}-${parts.month}-${parts.day}`).getDay()
  };
}

function getNextMarketOpenDate(startDate = new Date(), isTradingHours = false) {
    let checkDate = new Date(startDate);
  
    for (let i = 0; i < 30; i++) {
      const future = getIstanbulTimeFromDate(checkDate);
      const isHalfDay = Object.hasOwn(halfHolidays, future.isoDate);
      const isValidDay = !isWeekend(future) && !isFullHoliday(future);
  
      if (isValidDay) {
        const marketOpen = new Date(checkDate);
        (isTradingHours) ?
        marketOpen.setHours(10, 0, 0, 0) :
        marketOpen.setHours(9, 40, 0, 0); // set to 09:40
  
        const now = startDate;
        if (marketOpen.getTime() > now.getTime()) {
          return marketOpen;
        }
      }
  
      // Move to next day
      checkDate.setDate(checkDate.getDate() + 1);
    }
  
    return null; // fallback in case no valid date found
}
  

function isWeekend(t) {
  return t.weekday === 0 || t.weekday === 6;
}

function isFullHoliday(t) {
  return fullHolidays.has(t.isoDate);
}

function isHalfHoliday(t) {
  return Object.prototype.hasOwnProperty.call(halfHolidays, t.isoDate);
}

function isHalfDayClosed(t) {
  const cutoff = halfHolidays[t.isoDate];
  if (!cutoff) return false;

  const [cutoffHour, cutoffMin] = cutoff.split(':').map(Number);
  return t.hour > cutoffHour || (t.hour === cutoffHour && t.minute >= cutoffMin);
}

function isWithinMarketHours(t, isHalfDay = false) {
  const openMins = 9 * 60 + 40;
  const closeMins = isHalfDay ? (12 * 60 + 40) : (18 * 60 + 10);
  const nowMins = t.hour * 60 + t.minute;
  return nowMins >= openMins && nowMins <= closeMins;
}

function isWithinTradingHours(t, isHalfDay = false) {
  const openMins = 10 * 60;
  const closeMins = isHalfDay ? (12 * 60 + 30) : (18 * 60);
  const nowMins = t.hour * 60 + t.minute;
  return nowMins >= openMins && nowMins <= closeMins;
}

export async function isBISTopen({timeoutMs = 15000, isfromWSS = false, promiseWhenOpen = false, extraStep = false} = {}) {

  const istanbulTime = getIstanbulTime();
  const now = new Date();
  let isOpen;
  let isHalfDay = isHalfHoliday(istanbulTime);

  (isWeekend(istanbulTime) || isFullHoliday(istanbulTime) || isHalfDayClosed(istanbulTime)) ?
  isOpen = false : isOpen = true;

  if (isOpen) {

    //let isHalfDay = isHalfHoliday();

    if (!isfromWSS) {
      isOpen = isWithinMarketHours(istanbulTime, isHalfDay);
    } else {
      isOpen = isWithinTradingHours(istanbulTime, isHalfDay);
    }

  }
  
  // The extra step: TradingView market status (should not work if time is not within 10.10 - 18.25)
  let tvTimeOK;
  if (!isHalfDay) {
    ((istanbulTime.hour >= 10 && istanbulTime.minute >= 10) && (istanbulTime.hour <=18 && istanbulTime.minute <= 25)) ? tvTimeOK = true : tvTimeOK = false;
  } else {
    ((istanbulTime.hour >= 10 && istanbulTime.minute >= 10) && (istanbulTime.hour <=12 && istanbulTime.minute <= 55)) ? tvTimeOK = true : tvTimeOK = false;
  }

  if (extraStep && isOpen && (tvTimeOK)) {
    try {
      const client = new TradingView.Client({
        token: process.env.TRADINGVIEW_TOKEN,
        signature: process.env.TRADINGVIEW_SIGNATURE,
      });
  
      const quoteSession = new client.Session.Quote();
      const bistMarket = new quoteSession.Market('BIST:THYAO');
  
      const tvPromise = new Promise((resolve) => {
        let resolved = false;
      
        bistMarket.onData((data) => {
          if (resolved) return; // prevent multiple resolutions
      
          //console.log('📡 Live BIST data received:', data);
          let marketOpen = data.current_session !== 'out_of_session';
      
          resolved = true;
          quoteSession.delete(); // cleanup
          client.end();
          resolve(marketOpen);
        });
      
        // Fallback in case onData is not triggered in time
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            quoteSession.delete(); // cleanup
            client.end();
            resolve(false); // default to false on timeout
          }
        }, timeoutMs);
      });
  
      const tvResult = await tvPromise;
  
      // Override isOpen if TV says false
      if (isOpen && tvResult === false) {
        isOpen = false;
      }
  
    } catch (err) {
      console.log('TradingView step failed:', err);
    }
  }

  // Calculate remaining minutes until market opens
  let dateAtOpen;
  //const testDate = new Date('2025-10-28T07:35:00+00:00'); // UTC equivalent
  if (!isOpen) {
    if (!isfromWSS) {
      dateAtOpen = getNextMarketOpenDate(now);
    } else {
      dateAtOpen = getNextMarketOpenDate(now, true);
    }
  }

  let promise;
  if (promiseWhenOpen) {
    if (isOpen) {
      // Already open, no need to wait
      promise = Promise.resolve();
    } else if (dateAtOpen instanceof Date) {
      const now = new Date();
      const delay = dateAtOpen.getTime() - now.getTime();
  
      if (delay > 0) {
        promise = new Promise(resolve => setTimeout(resolve, delay));
      } else {
        promise = Promise.resolve(); // already passed, fallback
      }
    }
  }

  return {isOpen, dateAtOpen, promise};
  //return {isOpen, remainingMinutes, promise};
  
}