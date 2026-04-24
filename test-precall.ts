import { breakdown } from "./src/lib/calc";

const rates = {
  hourlyRate: 10,
  dayRate: 0,
  basicHours: 10,
  preCallRate: 1.5,
  nightPremium: 0,
  perDiem: 0,
  vatRate: 0,
  kitRentalPerDay: 0,
  shootingOTMinutes: 60,
  sixthDayMultiplier: 1.5,
  seventhDayMultiplier: 2.0,
  weeklyHoursCap: 60,
};

const entry = { call: "08:30", actualStart: "07:30", wrap: "20:30", mealMinutes: 0, date: "2023-01-01", id: "1", dayType: "shoot", travelMinutes: 0, isNight: false, perDiem: false, notes: "" };

console.log(breakdown(entry, rates));
