"use client";

import * as React from "react";
import Image from "next/image";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  MapPin,
  Minus,
  Navigation,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Shirt,
  Sparkles,
  Ticket,
  UserCheck,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { SheetSyncModal } from "@/components/sheet-sync-modal";
import { ACADEMY_ROSTER_PLAYERS } from "@/data/roster-players";
import {
  EVENT_DETAILS,
  ROLE_OR_AGE_GROUP_OPTIONS,
  type AttendanceStatus,
  type ChristmasRsvpRecord,
  type RoleOrAgeGroup,
  type RsvpSummaryStats,
} from "@/types/rsvp";
import { cn } from "@/lib/utils";

interface ChristmasRsvpExperienceProps {
  initialRecords: ChristmasRsvpRecord[];
  initialStats: RsvpSummaryStats;
  initialSyncMode: "apps-script" | "service-account" | "csv-live";
  initialHasAppsScriptUrl: boolean;
}

const LOCAL_CACHE_KEY = "mfc_bulacan_christmas_2026_rsvps_v1";

function useEventCountdown(targetIso: string) {
  const [timeLeft, setTimeLeft] = React.useState<{
    days: number;
    hours: number;
    minutes: number;
  }>({ days: 35, hours: 0, minutes: 0 });

  React.useEffect(() => {
    const update = () => {
      const target = new Date(targetIso).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeft({ days, hours, minutes });
    };
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  return timeLeft;
}

function downloadCalendarIcs() {
  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mendiola Football Academy - Bulacan//Christmas Party 2026//EN",
    "BEGIN:VEVENT",
    "UID:mendiola-fa-bulacan-christmas-2026@mendiolafc.ph",
    "DTSTAMP:20261110T000000Z",
    "DTSTART:20261215T070000Z",
    "DTEND:20261215T120000Z",
    "SUMMARY:Mendiola Football Academy - Bulacan Christmas Party 2026",
    "DESCRIPTION:Official Mendiola FA Bulacan Christmas Party! Motif: Red and White. Venue: Valle Maria Mar, Sta. Cruz, Sta. Maria, Bulacan.",
    "LOCATION:Valle Maria Mar\\, Sta. Cruz\\, Sta. Maria\\, Bulacan",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsLines], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Mendiola-FA-Bulacan-Christmas-Party-2026.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ChristmasRsvpExperience({
  initialRecords,
  initialStats,
  initialSyncMode,
  initialHasAppsScriptUrl,
}: ChristmasRsvpExperienceProps) {
  const [activeTab, setActiveTab] = React.useState<"rsvp" | "roster">("rsvp");
  const [records, setRecords] =
    React.useState<ChristmasRsvpRecord[]>(initialRecords);
  const [stats, setStats] = React.useState<RsvpSummaryStats>(initialStats);
  const [syncMode, setSyncMode] = React.useState(initialSyncMode);
  const [hasAppsScriptUrl, setHasAppsScriptUrl] = React.useState(
    initialHasAppsScriptUrl
  );
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Form state
  const [roleOrAgeGroup, setRoleOrAgeGroup] =
    React.useState<RoleOrAgeGroup>("U5");
  const [selectedRosterKey, setSelectedRosterKey] = React.useState<
    string | null
  >(null);
  const [playerName, setPlayerName] = React.useState("");
  const [attendanceStatus, setAttendanceStatus] =
    React.useState<AttendanceStatus>("Attending");
  const [totalPax, setTotalPax] = React.useState<number>(2);
  const [parentName, setParentName] = React.useState("");
  const [companionNames, setCompanionNames] = React.useState("");
  const [contactNumber, setContactNumber] = React.useState("");
  const [potluckNotes, setPotluckNotes] = React.useState("");

  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedRecord, setSubmittedRecord] =
    React.useState<ChristmasRsvpRecord | null>(null);

  // Roster filter state
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const countdown = useEventCountdown(EVENT_DETAILS.isoStart);
  const isCoach = roleOrAgeGroup === "Coach";

  // When switching between Coach and Player age groups, adjust default Pax and clear hidden Coach fields
  const handleSelectRoleOrAgeGroup = (nextRole: RoleOrAgeGroup) => {
    setRoleOrAgeGroup(nextRole);
    setFormError(null);
    if (nextRole === "Coach") {
      setSelectedRosterKey(null);
      setParentName("");
      setCompanionNames("");
      setPotluckNotes("");
      if (attendanceStatus === "Attending" && totalPax > 1) {
        setTotalPax(1);
      }
    } else {
      if (attendanceStatus === "Attending" && totalPax < 1) {
        setTotalPax(2);
      }
    }
  };

  // Roster quick-pick options for the active player division
  const rosterComboboxOptions = React.useMemo<ComboboxOption[]>(() => {
    if (isCoach) return [];
    const divisionMatches = ACADEMY_ROSTER_PLAYERS.filter(
      (p) => p.division === roleOrAgeGroup
    );
    const others = ACADEMY_ROSTER_PLAYERS.filter(
      (p) => p.division !== roleOrAgeGroup
    );
    return [...divisionMatches, ...others].map((p) => ({
      value: p.fullName,
      label: p.fullName,
      sublabel: p.parentName
        ? `Nickname: ${p.nickname} · Parent: ${p.parentName}`
        : `Nickname: ${p.nickname}`,
      badge: p.division,
    }));
  }, [isCoach, roleOrAgeGroup]);

  const handleQuickPickPlayer = (fullNameValue: string | null) => {
    setSelectedRosterKey(fullNameValue);
    if (!fullNameValue) return;
    const found = ACADEMY_ROSTER_PLAYERS.find(
      (p) => p.fullName === fullNameValue
    );
    if (!found) return;

    setPlayerName(found.fullName);
    setRoleOrAgeGroup(found.division);
    if (found.parentName && !parentName) {
      setParentName(found.parentName);
    }
    if (found.contactNumber && !contactNumber) {
      setContactNumber(found.contactNumber);
    }
    setFormError(null);
  };

  const refreshRsvps = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/rsvp", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean;
          records?: ChristmasRsvpRecord[];
          stats?: RsvpSummaryStats;
          syncMode?: "apps-script" | "service-account" | "csv-live";
          hasAppsScriptUrl?: boolean;
        };
        if (data.ok && data.records && data.stats) {
          setRecords(data.records);
          setStats(data.stats);
          if (data.syncMode) setSyncMode(data.syncMode);
          if (typeof data.hasAppsScriptUrl === "boolean") {
            setHasAppsScriptUrl(data.hasAppsScriptUrl);
          }
        }
      }
    } catch {
      // Ignore network error on manual refresh
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setFormError(
        isCoach
          ? "Please enter the Coach's full name."
          : "Please enter the Player's full name."
      );
      return;
    }

    if (!isCoach && !parentName.trim()) {
      setFormError("Please enter the Parent / Guardian name.");
      return;
    }

    if (attendanceStatus === "Attending" && (!totalPax || totalPax < 1)) {
      setFormError("Please enter a valid number of pax (at least 1).");
      return;
    }

    setIsSubmitting(true);

    let savedAppsScriptUrl = "";
    try {
      savedAppsScriptUrl =
        localStorage.getItem("mfc_xmas_apps_script_url") || "";
    } catch {
      // Ignore
    }

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleOrAgeGroup,
          playerName: trimmedName,
          attendanceStatus,
          totalPax: attendanceStatus === "Attending" ? totalPax : 0,
          parentName: isCoach ? "" : parentName.trim(),
          companionNames: isCoach ? "" : companionNames.trim(),
          contactNumber: contactNumber.trim(),
          potluckNotes: isCoach ? "" : potluckNotes.trim(),
          appsScriptUrl: savedAppsScriptUrl,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        record?: ChristmasRsvpRecord;
        records?: ChristmasRsvpRecord[];
        stats?: RsvpSummaryStats;
        syncMode?: "apps-script" | "service-account" | "csv-live";
        hasAppsScriptUrl?: boolean;
      };

      if (!res.ok || !data.ok || !data.record) {
        setFormError(
          data.error || "Could not save your RSVP. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      if (data.records) setRecords(data.records);
      if (data.stats) setStats(data.stats);
      if (data.syncMode) setSyncMode(data.syncMode);
      if (typeof data.hasAppsScriptUrl === "boolean") {
        setHasAppsScriptUrl(data.hasAppsScriptUrl);
      }

      // Persist locally in browser storage as well
      try {
        const raw = localStorage.getItem(LOCAL_CACHE_KEY);
        const existing: ChristmasRsvpRecord[] = raw ? JSON.parse(raw) : [];
        const updated = [
          data.record,
          ...existing.filter(
            (r) =>
              !(
                r.roleOrAgeGroup === data.record!.roleOrAgeGroup &&
                r.playerName.toLowerCase() ===
                  data.record!.playerName.toLowerCase()
              )
          ),
        ];
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }

      setSubmittedRecord(data.record);
      setIsSubmitting(false);
    } catch {
      setFormError(
        "Network error while submitting RSVP. Please check your connection and try again."
      );
      setIsSubmitting(false);
    }
  };

  const handleSaveAppsScriptUrl = async (url: string) => {
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "configureAppsScript",
        appsScriptUrl: url,
      }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      message?: string;
      records?: ChristmasRsvpRecord[];
      stats?: RsvpSummaryStats;
      syncMode?: "apps-script" | "service-account" | "csv-live";
      hasAppsScriptUrl?: boolean;
    };
    if (data.records) setRecords(data.records);
    if (data.stats) setStats(data.stats);
    if (data.syncMode) setSyncMode(data.syncMode);
    if (typeof data.hasAppsScriptUrl === "boolean") {
      setHasAppsScriptUrl(data.hasAppsScriptUrl);
    }
    if (!data.ok) {
      throw new Error(data.message || "Failed to connect Apps Script URL.");
    }
  };

  const handleResetForAnotherPlayer = () => {
    setSubmittedRecord(null);
    setSelectedRosterKey(null);
    setPlayerName("");
    setAttendanceStatus("Attending");
    setTotalPax(isCoach ? 1 : 2);
    setFormError(null);
  };

  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      if (groupFilter !== "all" && r.roleOrAgeGroup !== groupFilter) {
        return false;
      }
      if (statusFilter !== "all" && r.attendanceStatus !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          r.playerName,
          r.roleOrAgeGroup,
          r.parentName,
          r.companionNames,
          r.potluckNotes,
          r.contactNumber,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, groupFilter, statusFilter, searchQuery]);

  const unsyncedCount = React.useMemo(
    () => records.filter((r) => r.syncedToSheet === false).length,
    [records]
  );

  const companionCount =
    !isCoach && attendanceStatus === "Attending"
      ? Math.max(0, totalPax - 1)
      : 0;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FAF8F8] text-zinc-950">
      {/* Top Festive Red & White Ribbon Accent */}
      <div className="h-1.5 w-full bg-[repeating-linear-gradient(45deg,#D91B23,#D91B23_16px,#FFFFFF_16px,#FFFFFF_32px)]" />

      {/* Sticky Club Navigation Header */}
      <header className="sticky top-0 z-30 h-[70px] border-b border-red-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("rsvp")}
            className="flex min-w-0 items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-white p-1 shadow-2xs transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/mendiola-logo.png"
                alt="Mendiola Football Academy - Bulacan Logo"
                width={40}
                height={42}
                style={{ width: "auto" }}
                className="h-9 object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-extrabold tracking-tight text-zinc-950 sm:text-base">
                  Mendiola FA Bulacan
                </span>
                <span className="hidden rounded-md bg-primary px-1.5 py-0.5 font-mono text-[10px] font-bold text-white sm:inline-block">
                  CHRISTMAS 2026
                </span>
              </div>
              <p className="truncate text-[11px] font-medium text-zinc-500 sm:text-xs">
                Christmas Party Attendance · Dec 15, 2026
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <nav
              aria-label="Main sections"
              className="flex items-center gap-1 rounded-xl border border-red-100 bg-red-50/60 p-1"
            >
              <button
                type="button"
                onClick={() => setActiveTab("rsvp")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all sm:px-3.5 sm:text-sm cursor-pointer",
                  activeTab === "rsvp"
                    ? "bg-primary text-white shadow-xs"
                    : "text-zinc-700 hover:bg-white hover:text-zinc-950"
                )}
              >
                <Ticket className="h-3.5 w-3.5" />
                <span>RSVP Form</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("roster")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all sm:px-3.5 sm:text-sm cursor-pointer",
                  activeTab === "roster"
                    ? "bg-zinc-950 text-white shadow-xs"
                    : "text-zinc-700 hover:bg-white hover:text-zinc-950"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Confirmed Pax</span>
                <span className="sm:hidden">Pax</span>
                <span
                  className={cn(
                    "ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold",
                    activeTab === "roster"
                      ? "bg-primary text-white"
                      : "bg-primary/15 text-primary"
                  )}
                >
                  {stats.totalPax}
                </span>
              </button>
            </nav>

            <SheetSyncModal
              syncMode={syncMode}
              hasAppsScriptUrl={hasAppsScriptUrl}
              unsyncedCount={unsyncedCount}
              onAppsScriptSaved={handleSaveAppsScriptUrl}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6 sm:py-10">
        {activeTab === "rsvp" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
            {/* LEFT COLUMN: Official Event Pass, Motif & Venue Details */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
              {/* Red & White Club Invitation Card */}
              <section className="relative overflow-hidden rounded-2xl border border-red-200/80 bg-white shadow-lg">
                {/* Crimson Header Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#D91B23] via-[#C4141C] to-[#8F0D13] px-5 py-6 text-white sm:px-7 sm:py-7">
                  {/* Subtle Diagonal Red & White Crest Pattern */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border-[18px] border-white/10"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-6 bottom-2 h-24 w-24 rounded-full border-[10px] border-white/10"
                  />

                  <div className="relative flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-white/80 bg-white p-2 shadow-xl">
                      <Image
                        src="/mendiola-logo.png"
                        alt="Mendiola Football Club 1991 Official Crest"
                        width={72}
                        height={76}
                        style={{ width: "auto" }}
                        className="h-16 object-contain"
                        priority
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                        <Sparkles className="h-3 w-3" />
                        Deux Et Labora · Est. 1991
                      </span>
                      <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl leading-tight">
                        Mendiola Football Academy - Bulacan
                      </h1>
                      <p className="mt-0.5 text-sm font-semibold text-red-100">
                        Christmas Party 2026 · Attendance Confirmation
                      </p>
                    </div>
                  </div>

                  {/* Countdown Strip */}
                  <div className="mt-6 grid grid-cols-3 gap-2.5 rounded-xl border border-white/20 bg-black/20 p-3 backdrop-blur-xs">
                    <div className="text-center">
                      <div className="font-mono text-xl font-extrabold text-white sm:text-2xl">
                        {countdown.days}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-red-100">
                        Days Left
                      </div>
                    </div>
                    <div className="border-x border-white/15 text-center">
                      <div className="font-mono text-xl font-extrabold text-white sm:text-2xl">
                        {countdown.hours}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-red-100">
                        Hours
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-xl font-extrabold text-white sm:text-2xl">
                        {countdown.minutes}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-red-100">
                        Minutes
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Details Body */}
                <div className="divide-y divide-zinc-100 p-5 sm:p-6">
                  {/* Date & Time */}
                  <div className="flex items-start gap-3.5 pb-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-primary border border-red-100">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Date &amp; Kickoff Time
                      </div>
                      <div className="mt-0.5 text-base font-extrabold text-zinc-950">
                        December 15, 2026 (Tuesday)
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-primary">
                        <Clock className="h-3.5 w-3.5" />
                        <span>3:00 PM Onwards</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={downloadCalendarIcs}
                      className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-bold text-zinc-800 transition hover:border-primary/40 hover:bg-red-50/50 cursor-pointer"
                    >
                      + Calendar
                    </button>
                  </div>

                  {/* Venue */}
                  <div className="py-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-primary border border-red-100">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Event Venue
                        </div>
                        <div className="mt-0.5 text-base font-extrabold text-zinc-950">
                          Valle Maria Mar
                        </div>
                        <div className="mt-0.5 text-sm text-zinc-600">
                          Sta. Cruz, Sta. Maria, Bulacan
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 pl-13.5">
                      <a
                        href={EVENT_DETAILS.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 transition hover:border-primary/40 hover:bg-red-50/40"
                      >
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>Google Maps</span>
                        <ExternalLink className="h-3 w-3 text-zinc-400" />
                      </a>
                      <a
                        href={EVENT_DETAILS.wazeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 transition hover:border-primary/40 hover:bg-red-50/40"
                      >
                        <Navigation className="h-3.5 w-3.5 text-primary" />
                        <span>Open in Waze</span>
                        <ExternalLink className="h-3 w-3 text-zinc-400" />
                      </a>
                    </div>
                  </div>

                  {/* Red & White Motif */}
                  <div className="pt-4">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-gradient-to-r from-red-50/80 via-white to-red-50/40 p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                          <Palette className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-primary">
                            Party Attire &amp; Theme
                          </div>
                          <div className="text-sm font-extrabold text-zinc-950">
                            Red and White Motif
                          </div>
                          <div className="text-xs text-zinc-600">
                            Wear your festive Mendiola Red &amp; Crisp White!
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center -space-x-2">
                        <span
                          title="Mendiola Crimson Red (#D91B23)"
                          className="h-8 w-8 rounded-full bg-[#D91B23] ring-2 ring-white shadow-sm"
                        />
                        <span
                          title="Crisp White (#FFFFFF)"
                          className="h-8 w-8 rounded-full bg-white ring-2 ring-red-200 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Live Headcount Summary Card */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-zinc-950">
                      Live Christmas Party Headcount
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Real-time count by age group &amp; coaching staff
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("roster")}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    View Full List &rarr;
                  </button>
                </div>

                <div className="mt-3.5 grid grid-cols-5 gap-2">
                  {(["U5", "U7", "U9", "U13", "Coach"] as RoleOrAgeGroup[]).map(
                    (grp) => {
                      const bucket = stats.byGroup[grp] ?? {
                        entries: 0,
                        attendingEntries: 0,
                        pax: 0,
                      };
                      const active = roleOrAgeGroup === grp;
                      return (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => handleSelectRoleOrAgeGroup(grp)}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition cursor-pointer",
                            active
                              ? "border-primary bg-red-50/70 text-primary shadow-2xs"
                              : "border-zinc-200 bg-zinc-50/60 text-zinc-800 hover:border-zinc-300"
                          )}
                        >
                          <span className="text-[11px] font-extrabold uppercase">
                            {grp}
                          </span>
                          <span className="mt-0.5 font-mono text-base font-extrabold text-zinc-950">
                            {bucket.pax}
                          </span>
                          <span className="text-[10px] text-zinc-500">pax</span>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-zinc-950 px-3.5 py-2.5 text-xs text-white">
                  <span className="font-semibold text-zinc-300">
                    Total Confirmed Attendance:
                  </span>
                  <span className="font-mono text-sm font-extrabold text-white">
                    {stats.totalPax} Pax ({stats.playersAttending} Players ·{" "}
                    {stats.coachesAttending} Coaches)
                  </span>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Interactive RSVP Confirmation Form or Digital Pass */}
            <div className="lg:col-span-7">
              {submittedRecord ? (
                /* DIGITAL PARTY PASS (CONFIRMATION SCREEN) */
                <div className="overflow-hidden rounded-2xl border-2 border-primary bg-white shadow-xl">
                  <div className="bg-primary px-6 py-6 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                        <CheckCircle2 className="h-4 w-4" />
                        Attendance Recorded
                      </span>
                      <span className="font-mono text-xs font-semibold text-red-100">
                        {submittedRecord.timestamp}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                      {submittedRecord.attendanceStatus === "Attending"
                        ? "See You at the Mendiola Christmas Party!"
                        : "RSVP Response Saved"}
                    </h2>
                    <p className="mt-1 text-sm text-red-100">
                      {submittedRecord.attendanceStatus === "Attending"
                        ? "Your official Christmas Party confirmation pass is ready below."
                        : "Thank you for letting Mendiola Football Academy - Bulacan know."}
                    </p>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Ticket Summary Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/70 via-white to-red-50/30 p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-red-100 pb-4">
                        <div className="flex items-center gap-3.5">
                          <Image
                            src="/mendiola-logo.png"
                            alt="Mendiola FC Crest"
                            width={52}
                            height={54}
                            style={{ width: "auto" }}
                            className="h-13 shrink-0 object-contain"
                          />
                          <div>
                            <span className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 font-mono text-xs font-bold uppercase text-white">
                              {submittedRecord.roleOrAgeGroup === "Coach"
                                ? "COACH"
                                : `${submittedRecord.roleOrAgeGroup} DIVISION`}
                            </span>
                            <h3 className="mt-1 text-xl font-extrabold text-zinc-950 sm:text-2xl">
                              {submittedRecord.playerName}
                            </h3>
                          </div>
                        </div>

                        <div className="rounded-xl border border-red-200 bg-white px-4 py-2 text-center shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Confirmed Pax
                          </div>
                          <div className="font-mono text-2xl font-extrabold text-primary">
                            {submittedRecord.totalPax}
                          </div>
                        </div>
                      </div>

                      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold text-zinc-500">
                            Attendance Status
                          </dt>
                          <dd className="mt-0.5 font-bold text-zinc-950">
                            {submittedRecord.attendanceStatus}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold text-zinc-500">
                            Date &amp; Time
                          </dt>
                          <dd className="mt-0.5 font-bold text-zinc-950">
                            Dec 15, 2026 · 3:00 PM
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-semibold text-zinc-500">
                            Venue &amp; Motif
                          </dt>
                          <dd className="mt-0.5 font-bold text-zinc-950">
                            Valle Maria Mar, Sta. Cruz, Sta. Maria, Bulacan ·{" "}
                            <span className="text-primary">
                              Red &amp; White Motif
                            </span>
                          </dd>
                        </div>

                        {submittedRecord.roleOrAgeGroup !== "Coach" && (
                          <>
                            {submittedRecord.parentName && (
                              <div>
                                <dt className="text-xs font-semibold text-zinc-500">
                                  Parent / Guardian
                                </dt>
                                <dd className="mt-0.5 font-bold text-zinc-950">
                                  {submittedRecord.parentName}
                                </dd>
                              </div>
                            )}
                            {submittedRecord.companionNames && (
                              <div>
                                <dt className="text-xs font-semibold text-zinc-500">
                                  Companion Names
                                </dt>
                                <dd className="mt-0.5 font-bold text-zinc-950">
                                  {submittedRecord.companionNames}
                                </dd>
                              </div>
                            )}
                            {submittedRecord.potluckNotes && (
                              <div className="sm:col-span-2">
                                <dt className="text-xs font-semibold text-zinc-500">
                                  Potluck / Notes
                                </dt>
                                <dd className="mt-0.5 font-bold text-zinc-950">
                                  {submittedRecord.potluckNotes}
                                </dd>
                              </div>
                            )}
                          </>
                        )}
                      </dl>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setSubmittedRecord(null)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50 active:scale-[0.98] cursor-pointer"
                      >
                        Edit This Response
                      </button>
                      <button
                        type="button"
                        onClick={handleResetForAnotherPlayer}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-primary transition hover:bg-red-100 active:scale-[0.98] cursor-pointer"
                      >
                        + Confirm Another Player / Sibling
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("roster")}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] cursor-pointer"
                      >
                        <Users className="h-4 w-4" />
                        <span>View Confirmed Pax</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* MAIN RSVP FORM */
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-md sm:p-8 space-y-6"
                >
                  <div className="border-b border-zinc-100 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-primary border border-red-200">
                        <UserCheck className="h-3.5 w-3.5" />
                        Official RSVP Form
                      </span>
                      <span className="text-xs font-semibold text-zinc-500">
                        Dec 15, 2026 · 3:00 PM
                      </span>
                    </div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
                      Confirm Your Christmas Party Attendance
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      Select your player&apos;s age group (or Coach), enter the
                      specific name, and confirm your total number of pax.
                    </p>
                  </div>

                  {/* STEP 1: AGE GROUP OR COACH */}
                  <div className="space-y-3">
                    <label
                      htmlFor="role-age-group-combobox"
                      className="block text-sm font-extrabold text-zinc-950"
                    >
                      1. Select Age Group or Coach Role
                    </label>

                    {/* Quick Interactive Division Cards */}
                    <div className="grid grid-cols-5 gap-2">
                      {ROLE_OR_AGE_GROUP_OPTIONS.map((opt) => {
                        const selected = roleOrAgeGroup === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              handleSelectRoleOrAgeGroup(opt.value)
                            }
                            className={cn(
                              "flex flex-col items-center justify-center rounded-xl border py-3 px-2 text-center transition-all active:scale-[0.98] cursor-pointer",
                              selected
                                ? "border-primary bg-primary text-white shadow-sm ring-2 ring-primary/20"
                                : "border-zinc-200 bg-zinc-50/70 text-zinc-800 hover:border-primary/40 hover:bg-red-50/30"
                            )}
                          >
                            {opt.isCoach ? (
                              <Shield
                                className={cn(
                                  "h-4 w-4 mb-1",
                                  selected ? "text-white" : "text-primary"
                                )}
                              />
                            ) : (
                              <Shirt
                                className={cn(
                                  "h-4 w-4 mb-1",
                                  selected ? "text-white" : "text-primary"
                                )}
                              />
                            )}
                            <span className="text-xs font-extrabold sm:text-sm">
                              {opt.shortLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Animated Combobox for Role / Age Group */}
                    <div id="role-age-group-combobox">
                      <Combobox
                        value={roleOrAgeGroup}
                        hideSearch={true}
                        hideAllOption={true}
                        options={ROLE_OR_AGE_GROUP_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                          sublabel: o.sublabel,
                          badge: o.shortLabel,
                        }))}
                        onChange={(val) => {
                          if (val) {
                            handleSelectRoleOrAgeGroup(val as RoleOrAgeGroup);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* STEP 2: SPECIFIC NAME OF PLAYER OR COACH */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="player-or-coach-name"
                        className="block text-sm font-extrabold text-zinc-950"
                      >
                        {isCoach
                          ? "2. Specific Name of Coach *"
                          : `2. Specific Name of Player (${roleOrAgeGroup}) *`}
                      </label>
                      {isCoach && (
                        <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                          Coaching Staff Mode
                        </span>
                      )}
                    </div>

                    {/* Optional Roster Quick-Fill Combobox for Players */}
                    {!isCoach && (
                      <div className="rounded-xl border border-red-100 bg-red-50/40 p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-800">
                            Quick-Fill from Academy Roster (Optional)
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Or type player name below
                          </span>
                        </div>
                        <Combobox
                          value={selectedRosterKey}
                          placeholder={`Search ${roleOrAgeGroup} or Academy roster player...`}
                          shortPlaceholder="Search player from roster..."
                          searchPlaceholder="Type player name or nickname..."
                          options={rosterComboboxOptions}
                          onChange={handleQuickPickPlayer}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <input
                        id="player-or-coach-name"
                        type="text"
                        required
                        value={playerName}
                        onChange={(e) => {
                          setPlayerName(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        placeholder={
                          isCoach
                            ? "e.g. Coach Patrick Acal"
                            : "Enter full name of player (e.g. Lukas Miguel Herrera)"
                        }
                        className="h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 placeholder:font-normal placeholder:text-zinc-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <p className="text-xs text-zinc-500">
                        {isCoach
                          ? "Coach mode selected: Parent/Guardian, Companion Names, and Potluck Notes are omitted."
                          : "Please enter the specific full name of the Mendiola FA Bulacan player."}
                      </p>
                    </div>
                  </div>

                  {/* STEP 3: ATTENDANCE STATUS & SPECIFIC NUMBER OF PAX */}
                  <div className="space-y-4 pt-1">
                    <label className="block text-sm font-extrabold text-zinc-950">
                      3. Attendance &amp; Specific Number of Pax
                    </label>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceStatus("Attending");
                          if (totalPax < 1) setTotalPax(isCoach ? 1 : 2);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-extrabold transition-all active:scale-[0.98] cursor-pointer",
                          attendanceStatus === "Attending"
                            ? "border-primary bg-primary text-white shadow-sm ring-2 ring-primary/20"
                            : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-primary/40"
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Yes, Confirm Attendance</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceStatus("Not Attending");
                          setTotalPax(0);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-extrabold transition-all active:scale-[0.98] cursor-pointer",
                          attendanceStatus === "Not Attending"
                            ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300"
                        )}
                      >
                        <X className="h-4 w-4" />
                        <span>Cannot Attend (0 Pax)</span>
                      </button>
                    </div>

                    {/* Specific Number of Pax Selector */}
                    {attendanceStatus === "Attending" && (
                      <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 sm:p-5 space-y-3.5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <label
                              htmlFor="total-pax-input"
                              className="block text-sm font-extrabold text-zinc-950"
                            >
                              Specific Number of Pax Attending *
                            </label>
                            <p className="text-xs text-zinc-600">
                              {isCoach
                                ? "Total headcount for Coach attendance"
                                : "Include the player + attending parent/guardian & family members"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Decrease pax"
                              onClick={() =>
                                setTotalPax((prev) => Math.max(1, prev - 1))
                              }
                              className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-900 shadow-2xs transition hover:border-primary hover:text-primary active:scale-95 cursor-pointer"
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <input
                              id="total-pax-input"
                              type="number"
                              min={1}
                              max={30}
                              value={totalPax}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setTotalPax(
                                  Number.isFinite(val) && val >= 1
                                    ? Math.min(30, val)
                                    : 1
                                );
                              }}
                              className="h-11 w-20 rounded-xl border border-primary/50 bg-white text-center font-mono text-lg font-extrabold text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />

                            <button
                              type="button"
                              aria-label="Increase pax"
                              onClick={() =>
                                setTotalPax((prev) => Math.min(30, prev + 1))
                              }
                              className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-900 shadow-2xs transition hover:border-primary hover:text-primary active:scale-95 cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Quick Pax Preset Pills + Breakdown Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-red-100">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setTotalPax(num)}
                                className={cn(
                                  "rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition cursor-pointer",
                                  totalPax === num
                                    ? "bg-primary text-white shadow-2xs"
                                    : "bg-white text-zinc-700 border border-zinc-200 hover:border-primary/40"
                                )}
                              >
                                {num} {num === 1 ? "Pax" : "Pax"}
                              </button>
                            ))}
                          </div>

                          <div className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 border border-red-200">
                            {isCoach ? (
                              <span>Coach Party Count: {totalPax} Pax</span>
                            ) : (
                              <span>
                                1 Player + {companionCount}{" "}
                                {companionCount === 1
                                  ? "Companion"
                                  : "Companions"}{" "}
                                ={" "}
                                <strong className="text-primary">
                                  {totalPax} Total Pax
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* STEP 4: FAMILY, COMPANIONS & POTLUCK (HIDDEN WHEN COACH IS SELECTED) */}
                  {!isCoach && (
                    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 pb-2.5">
                        <h3 className="text-sm font-extrabold text-zinc-950">
                          4. Parent / Guardian, Companions &amp; Potluck
                        </h3>
                        <span className="text-[11px] font-medium text-zinc-500">
                          Player Division ({roleOrAgeGroup})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="parent-guardian-name"
                            className="block text-xs font-bold uppercase tracking-wider text-zinc-700"
                          >
                            Parent / Guardian Name *
                          </label>
                          <input
                            id="parent-guardian-name"
                            type="text"
                            required={!isCoach}
                            value={parentName}
                            onChange={(e) => {
                              setParentName(e.target.value);
                              if (formError) setFormError(null);
                            }}
                            placeholder="e.g. Angelie Mauricio"
                            className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="contact-number-player"
                            className="block text-xs font-bold uppercase tracking-wider text-zinc-700"
                          >
                            Contact / Viber Number
                          </label>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
                            <input
                              id="contact-number-player"
                              type="tel"
                              value={contactNumber}
                              onChange={(e) => setContactNumber(e.target.value)}
                              placeholder="e.g. 0917 846 8649"
                              className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="companion-names"
                          className="block text-xs font-bold uppercase tracking-wider text-zinc-700"
                        >
                          Companion Names{" "}
                          {companionCount > 0
                            ? `(${companionCount} accompanying guest${companionCount > 1 ? "s" : ""})`
                            : "(Optional)"}
                        </label>
                        <input
                          id="companion-names"
                          type="text"
                          value={companionNames}
                          onChange={(e) => setCompanionNames(e.target.value)}
                          placeholder="List accompanying parents, siblings, or relatives..."
                          className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="potluck-notes"
                          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700"
                        >
                          <Utensils className="h-3.5 w-3.5 text-primary" />
                          <span>Potluck Contribution / Notes (Optional)</span>
                        </label>
                        <textarea
                          id="potluck-notes"
                          rows={2}
                          value={potluckNotes}
                          onChange={(e) => setPotluckNotes(e.target.value)}
                          placeholder="e.g. Bringing Pasta / Barbecue / Drinks, or any special notes..."
                          className="w-full rounded-xl border border-zinc-300 bg-white p-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* COACH CONTACT NUMBER (WHEN COACH IS SELECTED) */}
                  {isCoach && (
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="contact-number-coach"
                          className="block text-xs font-bold uppercase tracking-wider text-zinc-700"
                        >
                          Coach Mobile / Viber Number (Optional)
                        </label>
                        <span className="text-[11px] font-semibold text-primary">
                          Parent, Companion &amp; Potluck fields hidden for
                          Coach
                        </span>
                      </div>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
                        <input
                          id="contact-number-coach"
                          type="tel"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          placeholder="e.g. 0917 XXX XXXX"
                          className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  )}

                  {formError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-800"
                    >
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-extrabold text-white shadow-md transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    <Ticket className="h-5 w-5" />
                    <span>
                      {isSubmitting
                        ? "Saving RSVP to Google Sheet..."
                        : attendanceStatus === "Attending"
                          ? `Confirm Attendance (${totalPax} Pax)`
                          : "Submit RSVP Response"}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: CONFIRMED ATTENDANCE ROSTER & HEADCOUNT */
          <div className="space-y-6">
            {/* Top Summary Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-2xl border border-red-200 bg-primary p-4 text-white shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-red-100">
                  Total Party Pax
                </div>
                <div className="mt-1 font-mono text-3xl font-extrabold">
                  {stats.totalPax}
                </div>
                <div className="mt-0.5 text-xs text-red-100">
                  {stats.attendingCount} confirmed entries
                </div>
              </div>

              {(["U5", "U7", "U9", "U13", "Coach"] as RoleOrAgeGroup[]).map(
                (grp) => {
                  const b = stats.byGroup[grp] ?? {
                    entries: 0,
                    attendingEntries: 0,
                    pax: 0,
                  };
                  return (
                    <div
                      key={grp}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                          {grp === "Coach" ? "Coaches" : `${grp} Division`}
                        </span>
                        <span className="rounded-md bg-red-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                          {b.attendingEntries}{" "}
                          {grp === "Coach" ? "coaches" : "players"}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-zinc-950">
                        {b.pax} <span className="text-sm font-semibold">Pax</span>
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {b.entries} total response{b.entries === 1 ? "" : "s"}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Filter & Search Bar using Animated Combobox + Search Input */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-center">
                {/* Search Input with leading Search icon and inline X clear button */}
                <div className="relative md:col-span-5">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search player, coach, parent, companion, or potluck..."
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-9 text-sm text-zinc-900 transition-all duration-200 hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      title="Clear search"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3.5 text-zinc-400 transition-colors hover:text-zinc-900 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Division / Role Filter Combobox */}
                <div className="md:col-span-3">
                  <Combobox
                    value={groupFilter === "all" ? null : groupFilter}
                    placeholder="All Age Groups & Coaches"
                    hideSearch={true}
                    options={[
                      { value: "U5", label: "U5 Division", badge: "U5" },
                      { value: "U7", label: "U7 Division", badge: "U7" },
                      { value: "U9", label: "U9 Division", badge: "U9" },
                      { value: "U13", label: "U13 Division", badge: "U13" },
                      { value: "Coach", label: "Coaching Staff", badge: "Coach" },
                    ]}
                    onChange={(val) => setGroupFilter(val ?? "all")}
                  />
                </div>

                {/* Attendance Status Filter Combobox */}
                <div className="md:col-span-2">
                  <Combobox
                    value={statusFilter === "all" ? null : statusFilter}
                    placeholder="All Statuses"
                    hideSearch={true}
                    options={[
                      { value: "Attending", label: "Attending" },
                      { value: "Not Attending", label: "Not Attending" },
                    ]}
                    onChange={(val) => setStatusFilter(val ?? "all")}
                  />
                </div>

                {/* Refresh & Open Sheet */}
                <div className="flex items-center gap-2 md:col-span-2 justify-end">
                  <button
                    type="button"
                    onClick={refreshRsvps}
                    disabled={isRefreshing}
                    title="Refresh from Google Sheet"
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-bold text-zinc-800 transition hover:border-primary/40 hover:bg-red-50/30 cursor-pointer"
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4 text-primary",
                        isRefreshing && "animate-spin"
                      )}
                    />
                    <span className="md:hidden lg:inline">Sync</span>
                  </button>

                  <a
                    href={EVENT_DETAILS.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 text-xs font-bold text-white transition hover:bg-zinc-800"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                    <span>Sheet</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Confirmed RSVPs List */}
            {filteredRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
                <Users className="mx-auto h-10 w-10 text-zinc-300" />
                <h3 className="mt-3 text-base font-extrabold text-zinc-950">
                  No Attendance Records Match Your Filter
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Be the first to confirm attendance for the Mendiola FA Bulacan
                  Christmas Party 2026!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("rsvp")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 cursor-pointer"
                >
                  <Ticket className="h-4 w-4" />
                  <span>Confirm Attendance Now</span>
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-bold uppercase tracking-wider text-zinc-600">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3">Role / Age Group</th>
                        <th className="px-3 py-3.5">Player / Coach Name</th>
                        <th className="px-3 py-3.5">Status</th>
                        <th className="px-3 py-3.5 text-center">Total Pax</th>
                        <th className="px-3 py-3.5">Parent / Guardian</th>
                        <th className="px-3 py-3.5">Companions</th>
                        <th className="px-3 py-3.5 pr-4">Potluck / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredRecords.map((rec) => {
                        const isRecCoach = rec.roleOrAgeGroup === "Coach";
                        return (
                          <tr
                            key={rec.id}
                            className="transition-colors hover:bg-red-50/20"
                          >
                            <td className="whitespace-nowrap py-3.5 pl-4 pr-3">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold",
                                  isRecCoach
                                    ? "bg-zinc-900 text-white"
                                    : "bg-red-50 text-primary border border-red-200"
                                )}
                              >
                                {rec.roleOrAgeGroup}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 font-extrabold text-zinc-950">
                              {rec.playerName}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
                                  rec.attendanceStatus === "Attending"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-zinc-100 text-zinc-600"
                                )}
                              >
                                {rec.attendanceStatus}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-center font-mono text-base font-extrabold text-primary">
                              {rec.totalPax}
                            </td>
                            <td className="px-3 py-3.5 text-zinc-700">
                              {isRecCoach ? (
                                <span className="text-xs italic text-zinc-400">
                                  —
                                </span>
                              ) : (
                                rec.parentName || "—"
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-zinc-600">
                              {isRecCoach ? (
                                <span className="text-xs italic text-zinc-400">
                                  —
                                </span>
                              ) : (
                                rec.companionNames || "—"
                              )}
                            </td>
                            <td className="px-3 py-3.5 pr-4 text-zinc-600">
                              {isRecCoach ? (
                                <span className="text-xs italic text-zinc-400">
                                  —
                                </span>
                              ) : (
                                rec.potluckNotes || "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-red-100 bg-white py-5 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 font-semibold text-zinc-800">
            <Image
              src="/mendiola-logo.png"
              alt="Mendiola FC"
              width={20}
              height={21}
              style={{ width: "auto" }}
              className="h-5 object-contain"
            />
            <span>
              Mendiola Football Academy - Bulacan · Christmas Party 2026
            </span>
          </div>
          <div>
            December 15, 2026 · 3:00 PM · Valle Maria Mar, Sta. Cruz, Sta.
            Maria, Bulacan ·{" "}
            <strong className="text-primary">Red &amp; White Motif</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}
