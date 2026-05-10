// Hours & charge calculations for UK film crew (BECTU-style defaults).
// All times in "HH:mm". Wrap may cross midnight (next day).

export const DAY_TYPES = ["shoot", "travel", "prep", "rig", "rehearsal", "hold", "rest"] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  shoot: "Shoot",
  travel: "Travel",
  prep: "Prep",
  rig: "Rig",
  rehearsal: "Rehearsal",
  hold: "Hold",
  rest: "Rest",
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
};

export type DayEntry = {
  id: string;
  date: string;           // YYYY-MM-DD
  dayType: DayType;
  location?: string;
  call: string;           // scheduled call from call sheet, "07:00"
  actualStart?: string;   // actual on-set start time (e.g. pre-call "06:30")
  wrap: string;           // scheduled wrap "20:30" (may be next-day)
  actualWrap?: string;    // actual wrap time if it ran past scheduled wrap (drives OT)
  mealMinutes: number;    // unpaid meal break
  travelMinutes: number;
  isNight?: boolean;      // night-shoot flag → night premium
  perDiem?: boolean;      // claim per-diem for this day
  shootingOT?: boolean;   // when true, first `shootingOTMinutes` (per-entry override or rates default) after basic count at 2× then 1.5×; otherwise all OT is 1.5×
  shootingOTMinutes?: number; // per-entry override of how many minutes count at 2× when shootingOT is on
  consecutiveDay?: number; // 1 (standard), 6 (6th day), 7 (7th day)
  notes?: string;
  expenses?: Expense[];
};

// Multiplier applied to the day's pay (basic + OT) per day type.
// 1.0 = full rate, 0.5 = half rate, 0 = unpaid hold, etc.
export type DayTypeRates = Record<DayType, number>;

export const DEFAULT_DAY_TYPE_RATES: DayTypeRates = {
  shoot: 1,
  travel: 0.5,
  prep: 1,
  rig: 1,
  rehearsal: 0.75,
  hold: 0.5,
  rest: 0,
};

export type RateConfig = {
  dayRate: number;          // £ flat day rate; if > 0, used in place of basic-hours × hourly
  basicHours: number;       // contracted basic per day (BECTU: 10h on 5-day week, 11h on 6-day)
  isRunningLunch: boolean;  // if true, meals are not deducted (Running Lunch)
  hourlyRate: number;       // £ hourly rate (used for OT and when day rate = 0)
  shootingOTMinutes: number; // minutes after basic paid at 2× when entry.shootingOT is on; remainder reverts to 1.5×
  shootingOTDefault: boolean; // default value for the per-entry shootingOT toggle
  otMultiplier: number;     // e.g. 1.5 for basic OT
  otFlatRate?: number;      // £ specific flat rate per hour of OT (overrides multiplier)
  ot2Multiplier: number;    // e.g. 2.0 for shooting OT
  ot2FlatRate?: number;     // £ specific flat rate per hour of shooting OT
  ot15Hours: number;        // legacy / kept for backwards compat — no longer drives the 2× window
  preCallRate: number;      // multiplier for time worked before call sheet call (BECTU: 1.5x typical)
  nightPremium: number;     // £ flat per night-shoot day
  nightStart: string;       // night window start "20:00"
  nightEnd: string;         // night window end "07:00"
  perDiem: number;          // £ per-diem amount per claimed day (BECTU rec ~£45)
  vatRate: number;          // 0.20
  kitRentalPerDay?: number; // optional
  dayRates?: Record<number, number>; // Exact day rates by basic hours (e.g., { 10: 563, 11: 678 })
  dayTypeRates: DayTypeRates;
  // BECTU framework — editable
  turnaroundHours: number;       // minimum rest between wrap and next call (BECTU: 11)
  brokenTurnaroundFee: number;   // £ flat fee charged when turnaround breached
  sixthDayMultiplier: number;    // 6th consecutive day pay multiplier (BECTU: 1.5)
  seventhDayMultiplier: number;  // 7th consecutive day (BECTU: 2.0)
  weeklyHoursCap: number;        // info only — anything above flagged
};

export const DEFAULT_RATES: RateConfig = {
  dayRate: 0,
  basicHours: 10,
  isRunningLunch: false,
  hourlyRate: 35,
  shootingOTMinutes: 60,
  shootingOTDefault: false,
  otMultiplier: 1.5,
  ot2Multiplier: 2.0,
  ot15Hours: 2,
  preCallRate: 1.5,
  nightPremium: 100,
  nightStart: "20:00",
  nightEnd: "07:00",
  perDiem: 45,
  vatRate: 0.2,
  kitRentalPerDay: 0,
  dayTypeRates: DEFAULT_DAY_TYPE_RATES,
  turnaroundHours: 11,
  brokenTurnaroundFee: 150,
  sixthDayMultiplier: 1.5,
  seventhDayMultiplier: 2.0,
  weeklyHoursCap: 60,
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function workedHours(entry: DayEntry, rates?: RateConfig): number {
  if (!entry.call || !entry.wrap) return 0;
  
  const call = toMinutes(entry.call);
  let wrap = toMinutes(entry.wrap);
  if (wrap <= call) wrap += 24 * 60;
  
  let actualStart = entry.actualStart && /^\d{2}:\d{2}$/.test(entry.actualStart) ? toMinutes(entry.actualStart) : call;
  if (actualStart > call && actualStart > 12 * 60 && call < 12 * 60) {
    actualStart -= 24 * 60; // actualStart was yesterday (e.g. 23:00 for a 01:00 call)
  }
  
  let actualWrap = entry.actualWrap && /^\d{2}:\d{2}$/.test(entry.actualWrap) ? toMinutes(entry.actualWrap) : wrap;
  if (actualWrap < actualStart && actualWrap < 12 * 60 && actualStart >= 12 * 60) {
    actualWrap += 24 * 60; // actualWrap is next day
  } else if (actualWrap <= actualStart && actualStart - actualWrap < 12 * 60) {
    // If it's just later but doesn't cross midnight threshold dramatically
    actualWrap += 24 * 60; 
  }
  
  // We credit the scheduled day at minimum, plus any pre-call or post-wrap
  const effectiveStart = Math.min(actualStart, call);
  const effectiveWrap = Math.max(actualWrap, wrap);
  
  // Meal deduction
  const isRunningLunch = rates?.isRunningLunch ?? false;
  const meal = isRunningLunch ? 0 : (entry.mealMinutes || 0);
  
  const worked = effectiveWrap - effectiveStart - meal;
  return Math.max(0, worked / 60);
}

/** Hours worked before the official call sheet call time (pre-call). */
export function preCallHours(entry: DayEntry): number {
  if (!entry.actualStart || !/^\d{2}:\d{2}$/.test(entry.actualStart)) return 0;
  const call = toMinutes(entry.call);
  let actual = toMinutes(entry.actualStart);
  
  if (actual > call && actual > 12 * 60 && call < 12 * 60) {
    actual -= 24 * 60; // previous day e.g. 23:00 for a 01:00 call
  }
  
  if (actual >= call) return 0;
  return (call - actual) / 60;
}

export type DayBreakdown = {
  worked: number;
  basic: number;
  ot15: number;
  ot2: number;
  preCall: number;
  travelHours: number;
  basicPay: number;
  ot15Pay: number;
  ot2Pay: number;
  preCallPay: number;
  travelPay: number;
  nightPay: number;
  perDiemPay: number;
  kitRental: number;
  expensesTotal: number;
  consecutiveMultiplier: number;
  dayTypeMultiplier: number;
  total: number;
};

export const fmtDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Heuristic to determine the worked day index (1-7) within a week.
 * Projects usually follow Monday-start ISO weeks.
 */
export function getConsecutiveDay(date: string): number {
  return 1; // Explicit tagging is now required, auto-fallback is disabled
}

export function breakdown(entry: DayEntry, rates: RateConfig): DayBreakdown {
  if (!entry.call || !entry.wrap) {
    return {
      worked: 0, basic: 0, ot15: 0, ot2: 0, preCall: 0, travelHours: 0,
      basicPay: 0, ot15Pay: 0, ot2Pay: 0, preCallPay: 0, travelPay: 0,
      nightPay: 0, perDiemPay: 0, kitRental: 0, expensesTotal: 0,
      consecutiveMultiplier: 0, dayTypeMultiplier: 0, total: 0
    };
  }

  const workedTotal = workedHours(entry, rates);
  const preCall = preCallHours(entry);
  
  // Minimum paid hours
  const worked = Math.max(rates.basicHours || 10, workedTotal);
  
  const basic = Math.min(worked, rates.basicHours);
  const overtime = Math.max(0, worked - rates.basicHours);
  
  // Shooting OT only applies when the entry opts in. Otherwise all OT is 1.5×.
  const sotMinutes = entry.shootingOT
    ? Math.max(0, entry.shootingOTMinutes ?? rates.shootingOTMinutes ?? 0)
    : 0;
  const shootingOTHours = sotMinutes / 60;
  
  // Actually, OT2 is usually up to shootingOTHours, and remainder is OT15.
  const ot2 = Math.min(overtime, shootingOTHours);
  const ot15 = Math.max(0, overtime - shootingOTHours);
  
  const travelHours = (entry.travelMinutes || 0) / 60;

  const dayTypeMultiplier = rates.dayTypeRates?.[entry.dayType] ?? 1;

  // Consecutive-day premium
  let consecutiveMultiplier = 1;
  const dayIndex = entry.consecutiveDay ?? 1;
  
  if (dayIndex === 6) consecutiveMultiplier = rates.sixthDayMultiplier;
  else if (dayIndex >= 7) consecutiveMultiplier = rates.seventhDayMultiplier;

  const stackedMultiplier = dayTypeMultiplier * consecutiveMultiplier;

  const rawBasicPay = rates.dayRate > 0
    ? rates.dayRate * (rates.basicHours > 0 ? basic / rates.basicHours : 1)
    : basic * rates.hourlyRate;

  // PreCall is now just included in regular worked hours and therefore becomes standard overtime.
  // We keep `preCall` variable for timeline visualization, but its pay is 0.
  const preCallPay = 0;

  const basicPay = rawBasicPay * stackedMultiplier;

  const ot1Rate = rates.otFlatRate ?? (rates.hourlyRate * (rates.otMultiplier ?? 1.5));
  const ot2Rate = rates.ot2FlatRate ?? (rates.hourlyRate * (rates.ot2Multiplier ?? 2.0));

  const ot15Pay = ot15 * ot1Rate * stackedMultiplier;
  const ot2Pay = ot2 * ot2Rate * stackedMultiplier;
  const travelPay = travelHours * rates.hourlyRate * stackedMultiplier;
  const nightPay = entry.isNight ? rates.nightPremium : 0;
  const perDiemPay = entry.perDiem ? rates.perDiem : 0;
  const kitRental = rates.kitRentalPerDay || 0;
  
  const expensesTotal = entry.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  const total = basicPay + ot15Pay + ot2Pay + preCallPay + travelPay + nightPay + perDiemPay + kitRental + expensesTotal;
  return { worked, basic, ot15, ot2, preCall, travelHours, basicPay, ot15Pay, ot2Pay, preCallPay, travelPay, nightPay, perDiemPay, kitRental, expensesTotal, consecutiveMultiplier, dayTypeMultiplier, total };
}

export type Totals = {
  days: number;
  basicHours: number;
  preCallHours: number;
  ot15Hours: number;
  ot2Hours: number;
  travelHours: number;
  perDiems: number;
  perDiemTotal: number;
  expensesTotal: number;
  kitRental: number;
  subtotal: number;
  vat: number;
  grand: number;
};

export function totals(entries: DayEntry[], rates: RateConfig): Totals {
  const acc: Totals = {
    days: entries.length,
    basicHours: 0, preCallHours: 0, ot15Hours: 0, ot2Hours: 0, travelHours: 0,
    perDiems: 0, perDiemTotal: 0, expensesTotal: 0, kitRental: 0,
    subtotal: 0, vat: 0, grand: 0,
  };
  for (const e of entries) {
    const b = breakdown(e, rates);
    acc.basicHours += b.basic;
    acc.preCallHours += b.preCall;
    acc.ot15Hours += b.ot15;
    acc.ot2Hours += b.ot2;
    acc.travelHours += b.travelHours;
    acc.expensesTotal += b.expensesTotal;
    acc.kitRental += b.kitRental;
    acc.subtotal += b.total;
    if (e.perDiem) {
      acc.perDiems += 1;
      acc.perDiemTotal += b.perDiemPay;
    }
  }
  acc.vat = acc.subtotal * rates.vatRate;
  acc.grand = acc.subtotal + acc.vat;
  return acc;
}

export const fmtGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);

export const fmtHours = (n: number) => (n || 0).toFixed(2);
