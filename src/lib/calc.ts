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
  consecutiveDay?: number; // 1-7 within the working week (6th/7th trigger premiums)
  notes?: string;
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
  hourlyRate: number;       // £ hourly rate (used for OT and when day rate = 0)
  shootingOTMinutes: number; // minutes after basic paid at 2× when entry.shootingOT is on; remainder reverts to 1.5×
  shootingOTDefault: boolean; // default value for the per-entry shootingOT toggle
  ot15Hours: number;        // legacy / kept for backwards compat — no longer drives the 2× window
  preCallRate: number;      // multiplier for time worked before call sheet call (BECTU: 1.5x typical)
  nightPremium: number;     // £ flat per night-shoot day
  nightStart: string;       // night window start "20:00"
  nightEnd: string;         // night window end "07:00"
  perDiem: number;          // £ per-diem amount per claimed day (BECTU rec ~£45)
  vatRate: number;          // 0.20
  kitRentalPerDay?: number; // optional
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
  hourlyRate: 35,
  shootingOTMinutes: 60,
  shootingOTDefault: false,
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
  // Pre-call is handled entirely separately, so standard worked hours start at 'call'.
  const startStr = entry.call;
  const endStr = entry.actualWrap && /^\d{2}:\d{2}$/.test(entry.actualWrap) ? entry.actualWrap : entry.wrap;
  const start = toMinutes(startStr);
  let end = toMinutes(endStr);
  if (end <= start) end += 24 * 60; // crossed midnight
  
  // Meal deduction
  // Running lunch: If basic hours is 10, we ignore meal minutes as they are worked.
  const isRunningLunch = rates?.basicHours === 10;
  const meal = isRunningLunch ? 0 : (entry.mealMinutes || 0);
  
  const worked = end - start - meal;
  return Math.max(0, worked / 60);
}

/** Hours worked before the official call sheet call time (pre-call). */
export function preCallHours(entry: DayEntry): number {
  if (!entry.actualStart || !/^\d{2}:\d{2}$/.test(entry.actualStart)) return 0;
  const call = toMinutes(entry.call);
  const actual = toMinutes(entry.actualStart);
  // Only count if actual is earlier than call on the same day.
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
  consecutiveMultiplier: number;
  dayTypeMultiplier: number;
  total: number;
};

export const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Heuristic to determine the worked day index (1-7) within a week.
 * Projects usually follow Monday-start ISO weeks.
 */
export function getConsecutiveDay(date: string): number {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  return day === 0 ? 7 : day;
}

export function breakdown(entry: DayEntry, rates: RateConfig): DayBreakdown {
  const workedTotal = workedHours(entry, rates);
  const preCall = preCallHours(entry);
  
  // Pre-call fix: Worked hours from the function includes everything on set.
  // We want to calculate basic/OT from the "post-call" portion, and handle pre-call separately.
  // Actually, usually pre-call adds to the total day. 
  // But the user says "Pre-call is added twice".
  // If we count total hours (including pre-call) for OT, we shouldn't add full pre-call rate on top.
  // We'll calculate the total worked, find OT, then add ONLY the premium (preCallRate - 1) for pre-call hours.
  
  // Minimum paid hours (per user request: "Even if worked less then 10 hours still count a minimum of 10 paid").
  // We use max(rates.basicHours, workedTotal) to ensure they get at least their full basic day if they work less.
  const worked = Math.max(rates.basicHours || 10, workedTotal);
  
  const basic = Math.min(worked, rates.basicHours);
  const overtime = Math.max(0, worked - rates.basicHours);
  // Shooting OT only applies when the entry opts in. Otherwise all OT is 1.5×.
  // Per-entry minutes override the project-default minutes when provided.
  const sotMinutes = entry.shootingOT
    ? Math.max(0, entry.shootingOTMinutes ?? rates.shootingOTMinutes ?? 0)
    : 0;
  const shootingOTHours = sotMinutes / 60;
  const ot2 = Math.min(overtime, shootingOTHours);
  const ot15 = Math.max(0, overtime - shootingOTHours);
  const travelHours = (entry.travelMinutes || 0) / 60;

  const dayTypeMultiplier = rates.dayTypeRates?.[entry.dayType] ?? 1;

  // Consecutive-day premium (BECTU 6th/7th day rules).
  let consecutiveMultiplier = 1;
  const dayIndex = entry.consecutiveDay ?? getConsecutiveDay(entry.date);
  
  if (dayIndex === 6) consecutiveMultiplier = rates.sixthDayMultiplier;
  else if (dayIndex >= 7) consecutiveMultiplier = rates.seventhDayMultiplier;

  const stackedMultiplier = dayTypeMultiplier * consecutiveMultiplier;

  // Day rate (if set) replaces hourly basic pay; pro-rated when worked < basic.
  const rawBasicPay = rates.dayRate > 0
    ? rates.dayRate * (rates.basicHours > 0 ? basic / rates.basicHours : 1)
    : basic * rates.hourlyRate;

  // Pre-call:
  // Paid completely separately from the basic day and standard OT.
  const preCallPay = preCall * rates.hourlyRate * rates.preCallRate * stackedMultiplier;

  const basicPay = rawBasicPay * stackedMultiplier;
  const ot15Pay = ot15 * rates.hourlyRate * 1.5 * stackedMultiplier;
  const ot2Pay = ot2 * rates.hourlyRate * 2 * stackedMultiplier;
  const travelPay = travelHours * rates.hourlyRate * stackedMultiplier;
  const nightPay = entry.isNight ? rates.nightPremium : 0;
  const perDiemPay = entry.perDiem ? rates.perDiem : 0;
  const kitRental = rates.kitRentalPerDay || 0;

  const total = basicPay + ot15Pay + ot2Pay + preCallPay + travelPay + nightPay + perDiemPay + kitRental;
  return { worked, basic, ot15, ot2, preCall, travelHours, basicPay, ot15Pay, ot2Pay, preCallPay, travelPay, nightPay, perDiemPay, kitRental, consecutiveMultiplier, dayTypeMultiplier, total };
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
  subtotal: number;
  vat: number;
  grand: number;
};

export function totals(entries: DayEntry[], rates: RateConfig): Totals {
  const acc: Totals = {
    days: entries.length,
    basicHours: 0, preCallHours: 0, ot15Hours: 0, ot2Hours: 0, travelHours: 0,
    perDiems: 0, perDiemTotal: 0,
    subtotal: 0, vat: 0, grand: 0,
  };
  for (const e of entries) {
    const b = breakdown(e, rates);
    acc.basicHours += b.basic;
    acc.preCallHours += b.preCall;
    acc.ot15Hours += b.ot15;
    acc.ot2Hours += b.ot2;
    acc.travelHours += b.travelHours;
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
