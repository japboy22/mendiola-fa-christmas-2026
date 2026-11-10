import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  EVENT_DETAILS,
  type AttendanceStatus,
  type ChristmasRsvpRecord,
  type RoleOrAgeGroup,
  type RsvpSummaryStats,
} from "@/types/rsvp";

const SPREADSHEET_ID =
  process.env.SPREADSHEET_ID || EVENT_DETAILS.spreadsheetId;

const DEFAULT_APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL?.trim() ||
  "https://script.google.com/macros/s/AKfycbxtTwLXtfwn01JZOdayy5aN_bCYwi_NhbYhrFmCK9T0DTRWcZARylrCQ5D4psm0-VUP/exec";

const WORKSPACE_STORE_PATH = path.join(
  process.cwd(),
  "data",
  "christmas-rsvps.json"
);
const TMP_STORE_PATH = path.join(os.tmpdir(), "mendiola-christmas-rsvps.json");

interface OverlayStore {
  appsScriptUrl?: string;
  records: ChristmasRsvpRecord[];
}

declare global {
  var __mendiolaChristmasStore: OverlayStore | undefined;
}

function getMemoryStore(): OverlayStore {
  if (!globalThis.__mendiolaChristmasStore) {
    globalThis.__mendiolaChristmasStore = {
      appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
      records: [],
    };
  }
  return globalThis.__mendiolaChristmasStore;
}

async function readOverlayStore(): Promise<OverlayStore> {
  const mem = getMemoryStore();
  let raw: string | null = null;
  try {
    raw = await fs.readFile(/* turbopackIgnore: true */ WORKSPACE_STORE_PATH, "utf8");
  } catch {
    try {
      raw = await fs.readFile(/* turbopackIgnore: true */ TMP_STORE_PATH, "utf8");
    } catch {
      raw = null;
    }
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<OverlayStore>;
      const resolved: OverlayStore = {
        appsScriptUrl:
          process.env.GOOGLE_APPS_SCRIPT_URL?.trim() ||
          parsed.appsScriptUrl?.trim() ||
          mem.appsScriptUrl ||
          DEFAULT_APPS_SCRIPT_URL,
        records: Array.isArray(parsed.records) ? parsed.records : [],
      };
      globalThis.__mendiolaChristmasStore = resolved;
      return resolved;
    } catch {
      // Fall through to in-memory store
    }
  }
  return mem;
}

async function writeOverlayStore(store: OverlayStore): Promise<void> {
  globalThis.__mendiolaChristmasStore = store;
  const serialized = JSON.stringify(store, null, 2);
  try {
    await fs.mkdir(path.dirname(WORKSPACE_STORE_PATH), { recursive: true });
    await fs.writeFile(WORKSPACE_STORE_PATH, serialized, "utf8");
    return;
  } catch {
    // Fallback to /tmp in read-only serverless environments (e.g., Vercel)
  }
  try {
    await fs.writeFile(TMP_STORE_PATH, serialized, "utf8");
  } catch {
    // Ignore filesystem errors if /tmp is unavailable
  }
}

export function normalizeRoleOrAgeGroup(raw: string): RoleOrAgeGroup {
  const clean = String(raw || "").trim().toUpperCase();
  if (clean === "COACH" || clean.includes("COACH")) return "Coach";
  if (clean === "U5" || clean === "UNDER 5") return "U5";
  if (clean === "U7" || clean === "UNDER 7") return "U7";
  if (clean === "U9" || clean === "UNDER 9") return "U9";
  if (clean === "U13" || clean === "UNDER 13") return "U13";
  return "U9";
}

export function normalizeAttendanceStatus(raw: string): AttendanceStatus {
  const clean = String(raw || "").trim().toLowerCase();
  if (
    clean === "not attending" ||
    clean === "no" ||
    clean === "declined" ||
    clean === "cannot attend"
  ) {
    return "Not Attending";
  }
  return "Attending";
}

export function recordKey(role: string, name: string): string {
  return `${String(role || "")
    .trim()
    .toLowerCase()}::${String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}`;
}

/**
 * RFC-4180 compliant CSV parser
 */
export function parseCsv(rawText: string): string[][] {
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\r" && next === "\n") {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      } else {
        current += ch;
      }
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function rsvpToSheetRow(record: ChristmasRsvpRecord): string[] {
  const isCoach = record.roleOrAgeGroup === "Coach";
  return [
    record.timestamp,
    record.roleOrAgeGroup,
    record.playerName,
    record.attendanceStatus,
    String(record.attendanceStatus === "Attending" ? record.totalPax : 0),
    isCoach ? "" : record.parentName,
    isCoach ? "" : record.companionNames,
    record.contactNumber,
    isCoach ? "" : record.potluckNotes,
  ];
}

function parseSheetRows(rows: string[][]): ChristmasRsvpRecord[] {
  const records: ChristmasRsvpRecord[] = [];
  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const timestamp = (r[0] ?? "").trim();
    const rawRole = (r[1] ?? "").trim();
    const playerName = (r[2] ?? "").trim();
    if (!playerName) continue;

    const roleOrAgeGroup = normalizeRoleOrAgeGroup(rawRole);
    const attendanceStatus = normalizeAttendanceStatus(r[3] ?? "Attending");
    const parsedPax = parseInt(String(r[4] ?? "").trim(), 10);
    const totalPax =
      attendanceStatus === "Not Attending"
        ? 0
        : Number.isFinite(parsedPax) && parsedPax > 0
          ? parsedPax
          : 1;

    const isCoach = roleOrAgeGroup === "Coach";

    records.push({
      id: `sheet-${i}-${recordKey(roleOrAgeGroup, playerName)}`,
      timestamp: timestamp || new Date().toISOString(),
      roleOrAgeGroup,
      playerName,
      attendanceStatus,
      totalPax,
      parentName: isCoach ? "" : (r[5] ?? "").trim(),
      companionNames: isCoach ? "" : (r[6] ?? "").trim(),
      contactNumber: (r[7] ?? "").trim(),
      potluckNotes: isCoach ? "" : (r[8] ?? "").trim(),
      syncedToSheet: true,
    });
  }
  return records;
}

async function getServiceAccountAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim();
  const privateKey = process.env
    .GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n")
    .trim();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(privateKey, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google OAuth token error: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function getSyncStatus(): Promise<{
  mode: "apps-script" | "service-account" | "csv-live";
  appsScriptUrl: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
}> {
  const store = await readOverlayStore();
  const appsScriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL?.trim() ||
    store.appsScriptUrl?.trim() ||
    "";

  if (appsScriptUrl) {
    return {
      mode: "apps-script",
      appsScriptUrl,
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetUrl: EVENT_DETAILS.spreadsheetUrl,
    };
  }

  if (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
    process.env.GOOGLE_PRIVATE_KEY?.trim()
  ) {
    return {
      mode: "service-account",
      appsScriptUrl: "",
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetUrl: EVENT_DETAILS.spreadsheetUrl,
    };
  }

  return {
    mode: "csv-live",
    appsScriptUrl: "",
    spreadsheetId: SPREADSHEET_ID,
    spreadsheetUrl: EVENT_DETAILS.spreadsheetUrl,
  };
}

export function computeSummaryStats(
  records: ChristmasRsvpRecord[]
): RsvpSummaryStats {
  const byGroup: RsvpSummaryStats["byGroup"] = {
    U5: { entries: 0, attendingEntries: 0, pax: 0 },
    U7: { entries: 0, attendingEntries: 0, pax: 0 },
    U9: { entries: 0, attendingEntries: 0, pax: 0 },
    U13: { entries: 0, attendingEntries: 0, pax: 0 },
    Coach: { entries: 0, attendingEntries: 0, pax: 0 },
  };

  let attendingCount = 0;
  let notAttendingCount = 0;
  let totalPax = 0;
  let playersAttending = 0;
  let coachesAttending = 0;

  for (const r of records) {
    const groupBucket = byGroup[r.roleOrAgeGroup] ?? byGroup.U9;
    groupBucket.entries += 1;

    if (r.attendanceStatus === "Attending") {
      attendingCount += 1;
      groupBucket.attendingEntries += 1;
      const pax = Math.max(1, r.totalPax || 1);
      groupBucket.pax += pax;
      totalPax += pax;

      if (r.roleOrAgeGroup === "Coach") {
        coachesAttending += 1;
      } else {
        playersAttending += 1;
      }
    } else {
      notAttendingCount += 1;
    }
  }

  return {
    totalSubmissions: records.length,
    attendingCount,
    notAttendingCount,
    totalPax,
    playersAttending,
    coachesAttending,
    byGroup,
  };
}

export async function clearLocalOverlayRecords(): Promise<void> {
  const store = await readOverlayStore();
  store.records = [];
  await writeOverlayStore(store);
}

export async function fetchAllRsvps(): Promise<{
  records: ChristmasRsvpRecord[];
  stats: RsvpSummaryStats;
  syncMode: "apps-script" | "service-account" | "csv-live";
  hasAppsScriptUrl: boolean;
}> {
  const store = await readOverlayStore();
  const status = await getSyncStatus();
  let sheetRecords: ChristmasRsvpRecord[] = [];
  let sheetFetchSucceeded = false;

  // 1. Prefer live Apps Script doGet first (instant, zero CSV cache delay)
  if (status.appsScriptUrl) {
    try {
      const res = await fetch(status.appsScriptUrl, {
        redirect: "follow",
        cache: "no-store",
      });
      if (res.ok) {
        const payload = (await res.json()) as {
          ok?: boolean;
          rows?: string[][];
        };
        if (payload.ok && Array.isArray(payload.rows)) {
          sheetRecords = parseSheetRows(payload.rows);
          sheetFetchSucceeded = true;
        }
      }
    } catch {
      // Fall back to public CSV export
    }
  }

  // 2. Fallback to Google Sheets public CSV export
  if (!sheetFetchSucceeded) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
      const res = await fetch(csvUrl, {
        redirect: "follow",
        cache: "no-store",
      });
      if (res.ok) {
        const text = await res.text();
        if (!text.trim().startsWith("<!DOCTYPE html")) {
          const rows = parseCsv(text);
          sheetRecords = parseSheetRows(rows);
          sheetFetchSucceeded = true;
        }
      }
    } catch (err) {
      console.warn("Google Sheet CSV fetch warning:", err);
    }
  }

  // Merge sheet records with any unsynced local overlay records
  const merged = new Map<string, ChristmasRsvpRecord>();
  for (const r of sheetRecords) {
    merged.set(recordKey(r.roleOrAgeGroup, r.playerName), r);
  }

  let storeChanged = false;
  const remainingLocalRecords: ChristmasRsvpRecord[] = [];

  for (const localRec of store.records) {
    const key = recordKey(localRec.roleOrAgeGroup, localRec.playerName);
    const existingSheet = merged.get(key);
    if (existingSheet) {
      // Sheet already has this entry; keep sheet as source of truth
      remainingLocalRecords.push({ ...localRec, syncedToSheet: true });
    } else if (!localRec.syncedToSheet || !sheetFetchSucceeded) {
      // Keep unsynced local records or all local records if offline
      merged.set(key, localRec);
      remainingLocalRecords.push(localRec);
    } else {
      // Was previously syncedToSheet=true, but removed from Google Sheet -> prune local copy
      storeChanged = true;
    }
  }

  if (storeChanged) {
    store.records = remainingLocalRecords;
    await writeOverlayStore(store);
  }

  const allRecords = Array.from(merged.values()).sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp)
  );

  return {
    records: allRecords,
    stats: computeSummaryStats(allRecords),
    syncMode: status.mode,
    hasAppsScriptUrl: Boolean(status.appsScriptUrl),
  };
}

export async function saveRsvpRecord(
  input: {
    roleOrAgeGroup: RoleOrAgeGroup;
    playerName: string;
    attendanceStatus: AttendanceStatus;
    totalPax: number;
    parentName?: string;
    companionNames?: string;
    contactNumber?: string;
    potluckNotes?: string;
  },
  customAppsScriptUrl?: string
): Promise<{
  record: ChristmasRsvpRecord;
  syncedToSheet: boolean;
  syncMethod: string;
}> {
  const store = await readOverlayStore();
  if (customAppsScriptUrl?.trim()) {
    store.appsScriptUrl = customAppsScriptUrl.trim();
  }

  const isCoach = input.roleOrAgeGroup === "Coach";
  const attendanceStatus = input.attendanceStatus;
  const totalPax =
    attendanceStatus === "Attending"
      ? Math.max(1, Math.min(30, Math.round(Number(input.totalPax) || 1)))
      : 0;

  const nowFormatted = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

  const record: ChristmasRsvpRecord = {
    id: `rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: nowFormatted,
    roleOrAgeGroup: input.roleOrAgeGroup,
    playerName: input.playerName.trim(),
    attendanceStatus,
    totalPax,
    // Enforce Coach rule: no parent/guardian name, companion names, or potluck notes
    parentName: isCoach ? "" : (input.parentName ?? "").trim(),
    companionNames: isCoach ? "" : (input.companionNames ?? "").trim(),
    contactNumber: (input.contactNumber ?? "").trim(),
    potluckNotes: isCoach ? "" : (input.potluckNotes ?? "").trim(),
    syncedToSheet: false,
  };

  const sheetRow = rsvpToSheetRow(record);
  const appsScriptUrl =
    customAppsScriptUrl?.trim() ||
    process.env.GOOGLE_APPS_SCRIPT_URL?.trim() ||
    store.appsScriptUrl?.trim() ||
    "";

  let syncedToSheet = false;
  let syncMethod = "local-overlay";

  // 1. Try Google Apps Script Web App bridge if configured
  if (appsScriptUrl) {
    try {
      const res = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret:
            process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim() ||
            "mendiola-christmas-2026",
          action: "upsertRsvp",
          row: sheetRow,
        }),
        redirect: "follow",
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({ ok: true }))) as {
          ok?: boolean;
        };
        if (data.ok !== false) {
          syncedToSheet = true;
          syncMethod = "apps-script";
        }
      }
    } catch (err) {
      console.warn("Apps Script write warning:", err);
    }
  }

  // 2. Try Google Service Account REST API v4 if configured
  if (
    !syncedToSheet &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
    process.env.GOOGLE_PRIVATE_KEY?.trim()
  ) {
    try {
      const token = await getServiceAccountAccessToken();
      const range = encodeURIComponent("Sheet1!A1");
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [sheetRow] }),
        }
      );
      if (res.ok) {
        syncedToSheet = true;
        syncMethod = "service-account";
      }
    } catch (err) {
      console.warn("Service Account write warning:", err);
    }
  }

  record.syncedToSheet = syncedToSheet;

  // Upsert into local/serverless store
  const key = recordKey(record.roleOrAgeGroup, record.playerName);
  const existingIdx = store.records.findIndex(
    (r) => recordKey(r.roleOrAgeGroup, r.playerName) === key
  );
  if (existingIdx >= 0) {
    store.records[existingIdx] = record;
  } else {
    store.records.unshift(record);
  }
  await writeOverlayStore(store);

  return { record, syncedToSheet, syncMethod };
}

export async function configureAndSyncAppsScript(
  appsScriptUrl: string
): Promise<{
  ok: boolean;
  syncedCount: number;
  message: string;
}> {
  const cleanUrl = appsScriptUrl.trim();
  const store = await readOverlayStore();
  store.appsScriptUrl = cleanUrl;
  await writeOverlayStore(store);

  if (!cleanUrl) {
    return {
      ok: true,
      syncedCount: 0,
      message: "Cleared custom Apps Script URL.",
    };
  }

  const unsynced = store.records.filter((r) => !r.syncedToSheet);
  if (unsynced.length === 0) {
    return {
      ok: true,
      syncedCount: 0,
      message: "Google Apps Script URL connected and ready for live sync.",
    };
  }

  try {
    const rows = unsynced.map(rsvpToSheetRow);
    const res = await fetch(cleanUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret:
          process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim() ||
          "mendiola-christmas-2026",
        action: "batchUpsert",
        rows,
      }),
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        syncedCount: 0,
        message: `Apps Script responded with status ${res.status}. Check that 'Who has access' is set to 'Anyone'.`,
      };
    }

    store.records = store.records.map((r) => ({ ...r, syncedToSheet: true }));
    await writeOverlayStore(store);

    return {
      ok: true,
      syncedCount: unsynced.length,
      message: `Connected and synced ${unsynced.length} RSVP record(s) to Google Sheets!`,
    };
  } catch (err) {
    return {
      ok: false,
      syncedCount: 0,
      message:
        err instanceof Error
          ? err.message
          : "Could not reach the Google Apps Script Web App URL.",
    };
  }
}
