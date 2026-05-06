import { RateConfig, DEFAULT_RATES } from "./calc";

export type AgreementCategory = "TV_DRAMA" | "MOTION_PICTURE" | "COMMERCIALS";

export type Band = 
  | "BAND_1" | "BAND_2" | "BAND_3" | "BAND_4" 
  | "INDIE" | "LOW_BUDGET" | "MID_BUDGET" | "MAJOR_FEATURE" 
  | "COMMERCIALS_WEEKDAY";

export const CATEGORY_LABELS: Record<AgreementCategory, string> = {
  TV_DRAMA: "TV Drama / Streaming VOD",
  MOTION_PICTURE: "Motion Picture",
  COMMERCIALS: "Commercials (APA)",
};

export const BAND_LABELS: Record<Band, string> = {
  BAND_1: "Band 1 (<£1m p/h)",
  BAND_2: "Band 2 (<£3m p/h)",
  BAND_3: "Band 3 (<£7m p/h)",
  BAND_4: "Band 4 (£7m+ p/h)",
  INDIE: "Indie Feature (<£4m)",
  LOW_BUDGET: "Low Budget (<£10m)",
  MID_BUDGET: "Mid Budget (<£30m)",
  MAJOR_FEATURE: "Major Feature (£30m+)",
  COMMERCIALS_WEEKDAY: "Commercials (APA)",
};

export const CATEGORY_BANDS: Record<AgreementCategory, Band[]> = {
  TV_DRAMA: ["BAND_1", "BAND_2", "BAND_3", "BAND_4"],
  MOTION_PICTURE: ["INDIE", "LOW_BUDGET", "MID_BUDGET", "MAJOR_FEATURE"],
  COMMERCIALS: ["COMMERCIALS_WEEKDAY"],
};

export type RoleDefinition = {
  name: string;
  rates: Partial<Record<Band, Partial<RateConfig>>>;
};

const createConfig = (baseRate: number, otRate: number, day10: number = 0, day11?: number): Partial<RateConfig> => ({
  hourlyRate: baseRate,
  otFlatRate: otRate,
  ot2FlatRate: otRate, // Using the same flat rate for both typical OT tiers based on PDF
  basicHours: 10,
  isRunningLunch: false,
  dayRate: day10 > 0 ? day10 : 0, // Fallback to day10 if provided
  dayRates: {
    10: day10 > 0 ? day10 : baseRate * 10,
    ...(day11 ? { 11: day11 } : {})
  }
});

export const ROLES: RoleDefinition[] = [
  {
    name: "Cinematographer",
    rates: {}
  },
  {
    name: "Camera Operator",
    rates: {
      BAND_1: createConfig(56, 70, 563),
      BAND_2: createConfig(63, 70, 634),
      BAND_3: createConfig(67, 70, 673),
      INDIE: createConfig(57, 82, 565, 678),
      LOW_BUDGET: createConfig(68, 82, 678, 814),
      MID_BUDGET: createConfig(81, 82, 808, 969),
      MAJOR_FEATURE: createConfig(81, 82, 808, 969),
    }
  },
  {
    name: "Steadicam Operator",
    rates: {
      BAND_1: createConfig(81, 81, 808),
      BAND_2: createConfig(98, 98, 981),
      BAND_3: createConfig(98, 98, 981),
      BAND_4: createConfig(98, 98, 981),
      INDIE: createConfig(81, 82, 808, 969),
      LOW_BUDGET: createConfig(98, 82, 981, 1177),
      MID_BUDGET: createConfig(98, 82, 981, 1177),
      MAJOR_FEATURE: createConfig(101, 82, 1010, 1211),
      COMMERCIALS_WEEKDAY: createConfig(93, 93, 927),
    }
  },
  {
    name: "Unit Stills Photographer",
    rates: {
      BAND_1: createConfig(40, 61, 404),
      BAND_2: createConfig(61, 70, 606),
      BAND_3: createConfig(87, 87, 875),
      BAND_4: createConfig(87, 87, 875),
      INDIE: createConfig(61, 82, 606, 727),
      LOW_BUDGET: createConfig(67, 82, 673, 807),
      MID_BUDGET: createConfig(202, 82, 2019, 2422),
      MAJOR_FEATURE: createConfig(269, 82, 2692, 3230),
    }
  },
  {
    name: "Script Supervisor",
    rates: {
      BAND_1: createConfig(45, 68, 453),
      BAND_2: createConfig(48, 70, 478),
      BAND_3: createConfig(50, 70, 503),
      BAND_4: createConfig(50, 70, 503),
      INDIE: createConfig(45, 82, 453, 543),
      LOW_BUDGET: createConfig(54, 82, 538, 646),
      MID_BUDGET: createConfig(57, 82, 565, 678),
      MAJOR_FEATURE: createConfig(57, 82, 565, 678),
      COMMERCIALS_WEEKDAY: createConfig(54, 67, 536),
    }
  },
  {
    name: "Focus Puller / 1st AC",
    rates: {
      BAND_1: createConfig(45, 68, 453),
      BAND_2: createConfig(48, 70, 478),
      BAND_3: createConfig(50, 70, 503),
      BAND_4: createConfig(50, 70, 503),
      INDIE: createConfig(45, 82, 453, 543),
      LOW_BUDGET: createConfig(54, 82, 538, 646),
      MID_BUDGET: createConfig(57, 82, 565, 678),
      MAJOR_FEATURE: createConfig(57, 82, 565, 678),
      COMMERCIALS_WEEKDAY: createConfig(54, 67, 536),
    }
  },
  {
    name: "Clapper Loader / 2nd AC",
    rates: {
      BAND_1: createConfig(34, 51, 339),
      BAND_2: createConfig(40, 60, 402),
      BAND_3: createConfig(41, 62, 415),
      BAND_4: createConfig(41, 62, 415),
      INDIE: createConfig(35, 70, 352, 422),
      LOW_BUDGET: createConfig(38, 75, 377, 453),
      MID_BUDGET: createConfig(41, 82, 415, 498),
      MAJOR_FEATURE: createConfig(41, 82, 415, 498),
      COMMERCIALS_WEEKDAY: createConfig(42, 63, 418),
    }
  },
  {
    name: "DIT (Digital Imaging Technician)",
    rates: {
      BAND_1: createConfig(45, 68, 453),
      BAND_2: createConfig(48, 70, 478),
      BAND_3: createConfig(50, 70, 503),
      BAND_4: createConfig(50, 70, 503),
      INDIE: createConfig(45, 82, 453, 543),
      LOW_BUDGET: createConfig(54, 82, 538, 646),
      MID_BUDGET: createConfig(57, 82, 565, 678),
      MAJOR_FEATURE: createConfig(57, 82, 565, 678),
      COMMERCIALS_WEEKDAY: createConfig(54, 67, 536),
    }
  },
  {
    name: "DIT Assistant",
    rates: {
      BAND_2: createConfig(29, 43, 289),
      BAND_3: createConfig(31, 47, 314),
      BAND_4: createConfig(31, 47, 314),
      LOW_BUDGET: createConfig(30, 60, 302, 362),
      MID_BUDGET: createConfig(33, 65, 327, 392),
      MAJOR_FEATURE: createConfig(35, 70, 352, 422),
    }
  },
  {
    name: "Senior Video Playback Operator",
    rates: {
      BAND_3: createConfig(39, 59, 392),
      BAND_4: createConfig(39, 59, 392),
      MID_BUDGET: createConfig(43, 82, 431, 517),
      MAJOR_FEATURE: createConfig(51, 82, 510, 612),
      COMMERCIALS_WEEKDAY: createConfig(48, 73, 484), // Fix from OCR typo 48 48 48
    }
  },
  {
    name: "Video Playback Operator",
    rates: {
      BAND_2: createConfig(34, 51, 340),
      BAND_3: createConfig(39, 59, 392),
      BAND_4: createConfig(39, 59, 392),
      INDIE: createConfig(33, 65, 327, 392),
      LOW_BUDGET: createConfig(33, 65, 327, 392),
      MID_BUDGET: createConfig(38, 76, 379, 455),
      MAJOR_FEATURE: createConfig(48, 82, 484, 581),
      COMMERCIALS_WEEKDAY: createConfig(38, 56, 376),
    }
  },
  {
    name: "Stereographer",
    rates: {
      BAND_1: createConfig(45, 68, 453),
      BAND_2: createConfig(48, 70, 478),
      BAND_3: createConfig(50, 70, 503),
      BAND_4: createConfig(50, 70, 503),
      INDIE: createConfig(45, 82, 453, 543),
      LOW_BUDGET: createConfig(54, 82, 538, 646),
      MID_BUDGET: createConfig(57, 82, 565, 678),
      MAJOR_FEATURE: createConfig(57, 82, 565, 678),
      COMMERCIALS_WEEKDAY: createConfig(54, 67, 536),
    }
  },
  {
    name: "Stereo Focus Puller",
    rates: {
      BAND_1: createConfig(45, 68, 453),
      BAND_2: createConfig(48, 70, 478),
      BAND_3: createConfig(50, 70, 503),
      BAND_4: createConfig(50, 70, 503),
      INDIE: createConfig(45, 82, 453, 543),
      LOW_BUDGET: createConfig(54, 82, 538, 646),
      MID_BUDGET: createConfig(57, 82, 565, 678),
      MAJOR_FEATURE: createConfig(57, 82, 565, 678),
      COMMERCIALS_WEEKDAY: createConfig(54, 67, 536),
    }
  },
  {
    name: "Convergence Puller",
    rates: {
      BAND_1: createConfig(45, 68, 453),
      BAND_2: createConfig(48, 70, 478),
      BAND_3: createConfig(50, 70, 503),
      BAND_4: createConfig(50, 70, 503),
      INDIE: createConfig(45, 82, 453, 543),
      LOW_BUDGET: createConfig(54, 82, 538, 646),
      MID_BUDGET: createConfig(57, 82, 565, 678),
      MAJOR_FEATURE: createConfig(57, 82, 565, 678),
      COMMERCIALS_WEEKDAY: createConfig(54, 67, 536),
    }
  },
  {
    name: "Specialist Rig Technician",
    rates: {
      BAND_2: createConfig(135, 135, 1346),
    }
  },
  {
    name: "Data Manager",
    rates: {
      BAND_1: createConfig(34, 51, 339),
      BAND_2: createConfig(40, 60, 402),
      BAND_3: createConfig(41, 62, 415),
      BAND_4: createConfig(41, 62, 415),
      INDIE: createConfig(35, 70, 352, 422),
      LOW_BUDGET: createConfig(38, 75, 377, 453),
      MID_BUDGET: createConfig(39, 78, 390, 468),
      MAJOR_FEATURE: createConfig(40, 80, 402, 483),
    }
  },
  {
    name: "Assistant Script Supervisor",
    rates: {
      BAND_1: createConfig(27, 40, 269),
      BAND_2: createConfig(29, 43, 289),
      BAND_3: createConfig(31, 47, 314),
      BAND_4: createConfig(31, 47, 314),
      INDIE: createConfig(27, 54, 269, 323),
      LOW_BUDGET: createConfig(30, 60, 302, 362),
      MID_BUDGET: createConfig(33, 65, 327, 392),
      MAJOR_FEATURE: createConfig(35, 70, 352, 422),
    }
  },
  {
    name: "Camera / Script Supervisor Trainee",
    rates: {
      BAND_1: createConfig(17, 35, 170),
      BAND_2: createConfig(17, 35, 170),
      BAND_3: createConfig(17, 35, 170),
      BAND_4: createConfig(17, 35, 170),
      INDIE: createConfig(17, 34, 170, 204),
      LOW_BUDGET: createConfig(17, 34, 170, 204),
      MID_BUDGET: createConfig(17, 34, 170, 204),
      MAJOR_FEATURE: createConfig(17, 34, 170, 204),
      COMMERCIALS_WEEKDAY: createConfig(30, 45, 303),
    }
  }
];

export const getRateForRole = (roleName: string, category: AgreementCategory, band: Band): Partial<RateConfig> | undefined => {
  const role = ROLES.find(r => r.name === roleName);
  if (!role) return undefined;
  return role.rates[band];
};
