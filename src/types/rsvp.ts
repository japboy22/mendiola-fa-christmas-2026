export type PlayerAgeGroup = "U5" | "U7" | "U9" | "U13" | "U15";
export type RoleOrAgeGroup = PlayerAgeGroup | "Coach";
export type AttendanceStatus = "Attending" | "Not Attending";

export const ROLE_OR_AGE_GROUP_OPTIONS: {
  value: RoleOrAgeGroup;
  label: string;
  shortLabel: string;
  sublabel: string;
  isCoach?: boolean;
}[] = [
  {
    value: "U5",
    label: "U5 Division (Under 5)",
    shortLabel: "U5",
    sublabel: "Grassroots · Born 2021 & younger",
  },
  {
    value: "U7",
    label: "U7 Division (Under 7)",
    shortLabel: "U7",
    sublabel: "Junior · Born 2019–2020",
  },
  {
    value: "U9",
    label: "U9 Division (Under 9)",
    shortLabel: "U9",
    sublabel: "Youth · Born 2017–2018",
  },
  {
    value: "U13",
    label: "U13 Division (Under 13)",
    shortLabel: "U13",
    sublabel: "Senior Youth · Born 2013–2016",
  },
  {
    value: "U15",
    label: "U15 Division (Under 15)",
    shortLabel: "U15",
    sublabel: "Senior · Born 2011–2012",
  },
  {
    value: "Coach",
    label: "Coach / Coaching Staff",
    shortLabel: "Coach",
    sublabel: "Academy Technical & Coaching Staff",
    isCoach: true,
  },
];

export interface ChristmasRsvpRecord {
  id: string;
  timestamp: string;
  roleOrAgeGroup: RoleOrAgeGroup;
  playerName: string;
  attendanceStatus: AttendanceStatus;
  totalPax: number;
  parentName: string;
  companionNames: string;
  contactNumber: string;
  syncedToSheet?: boolean;
}

export interface RsvpGroupBreakdown {
  entries: number;
  attendingEntries: number;
  pax: number;
}

export interface RsvpSummaryStats {
  totalSubmissions: number;
  attendingCount: number;
  notAttendingCount: number;
  totalPax: number;
  playersAttending: number;
  coachesAttending: number;
  byGroup: Record<RoleOrAgeGroup, RsvpGroupBreakdown>;
}

export interface AcademyRosterPlayer {
  fullName: string;
  nickname: string;
  division: PlayerAgeGroup;
  rawAgeGroup: string;
  parentName: string;
  contactNumber: string;
}

export const EVENT_DETAILS = {
  clubName: "Mendiola Football Academy - Bulacan",
  clubTagline: "Est. 1991 · Deux Et Labora",
  eventTitle: "Christmas Party 2026",
  eventSubtitle: "Official Player & Coach Attendance Confirmation",
  dateDisplay: "Tuesday, December 15, 2026",
  shortDate: "December 15, 2026",
  timeDisplay: "3:00 PM",
  isoStart: "2026-12-15T15:00:00+08:00",
  venueName: "Valle Maria Mar",
  venueAddress: "Sta. Cruz, Sta. Maria, Bulacan",
  venueFull: "Valle Maria Mar, Sta. Cruz, Sta. Maria, Bulacan",
  motif: "Red and White Motif",
  spreadsheetId: "1VX3X-TbQQWLm9ntd0mfjD7nNKWwf-7RMH8Vs-y-SD1g",
  spreadsheetUrl:
    "https://docs.google.com/spreadsheets/d/1VX3X-TbQQWLm9ntd0mfjD7nNKWwf-7RMH8Vs-y-SD1g/edit?usp=sharing",
  googleMapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Valle+Maria+Mar+Sta.+Cruz+Sta.+Maria+Bulacan",
  wazeUrl:
    "https://waze.com/ul?q=Valle%20Maria%20Mar%20Sta.%20Cruz%20Sta.%20Maria%20Bulacan&navigate=yes",
} as const;
