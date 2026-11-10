"use client";

import * as React from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import {
  Calendar,
  Gift,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TreePine,
  Users,
  X,
} from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { ChristmasSnowfall } from "@/components/christmas-snowfall";
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
}: ChristmasRsvpExperienceProps) {
  const [activeTab, setActiveTab] = React.useState<"pass" | "roster">("pass");
  const [isRsvpDialogOpen, setIsRsvpDialogOpen] = React.useState(false);

  const [records, setRecords] =
    React.useState<ChristmasRsvpRecord[]>(initialRecords);
  const [stats, setStats] = React.useState<RsvpSummaryStats>(initialStats);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Form state inside the RSVP Dialog Box
  const [roleOrAgeGroup, setRoleOrAgeGroup] =
    React.useState<RoleOrAgeGroup>("U5");
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

  const handleSelectRoleOrAgeGroup = (nextRole: RoleOrAgeGroup) => {
    setRoleOrAgeGroup(nextRole);
    setFormError(null);
    if (nextRole === "Coach") {
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

  const openRsvpForGroup = (grp?: RoleOrAgeGroup) => {
    if (grp) {
      handleSelectRoleOrAgeGroup(grp);
    }
    setSubmittedRecord(null);
    setFormError(null);
    setIsRsvpDialogOpen(true);
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
        };
        if (data.ok && data.records && data.stats) {
          setRecords(data.records);
          setStats(data.stats);
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

    const isAttending = attendanceStatus === "Attending";

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleOrAgeGroup,
          playerName: trimmedName,
          attendanceStatus,
          totalPax: isAttending ? totalPax : 0,
          parentName: isCoach ? "" : parentName.trim(),
          companionNames: !isCoach && isAttending ? companionNames.trim() : "",
          contactNumber: isAttending ? contactNumber.trim() : "",
          potluckNotes: !isCoach && isAttending ? potluckNotes.trim() : "",
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        record?: ChristmasRsvpRecord;
        records?: ChristmasRsvpRecord[];
        stats?: RsvpSummaryStats;
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

  const handleResetForAnotherPlayer = () => {
    setSubmittedRecord(null);
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

  const companionCount =
    !isCoach && attendanceStatus === "Attending"
      ? Math.max(0, totalPax - 1)
      : 0;

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#FFF7F6] via-[#FDFBFB] to-[#FFF5F5] text-zinc-950 pb-24">
      {/* Subtle Ambient Snowfall Background */}
      <ChristmasSnowfall />

      {/* Festive Candy-Cane Top Ribbon */}
      <div className="mfc-candy-cane-bar relative z-30 h-2 w-full shadow-2xs" />

      {/* Clean Christmas Sticky Header */}
      <header className="sticky top-0 z-30 h-16 border-b border-red-200/70 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(217,27,35,0.05)]">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-3.5 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("pass")}
            className="flex min-w-0 items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white p-1 shadow-2xs transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/mendiola-logo.png"
                alt="Mendiola Football Academy - Bulacan Logo"
                width={36}
                height={38}
                style={{ width: "auto" }}
                className="h-8 object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-extrabold tracking-tight text-zinc-950 sm:text-base">
                  Mendiola FA Bulacan
                </span>
                <span className="hidden rounded-full bg-red-50 border border-red-200 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary sm:inline-block">
                  XMAS 2026
                </span>
              </div>
              <p className="truncate text-[11px] font-medium text-zinc-600">
                Dec 15, 2026 · 3:00 PM · Valle Maria Mar
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openRsvpForGroup()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D91B23] to-[#B5121B] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm shadow-red-600/20 ring-1 ring-amber-300/40 transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
          >
            <span>RSVP Now</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 mx-auto w-full max-w-6xl flex-1 px-3.5 py-4 sm:px-6 sm:py-8">
        {activeTab === "pass" ? (
          <div className="space-y-5 sm:space-y-7">
            {/* FESTIVE CHRISTMAS INVITATION HERO CARD */}
            <section className="overflow-hidden rounded-3xl border-2 border-red-200/90 bg-white/95 shadow-[0_18px_50px_rgba(185,20,28,0.10)] backdrop-blur-xs">
              {/* Crimson & Gold Christmas Banner */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#A50D16] via-[#D91B23] to-[#7C0910] px-4 py-6 text-white sm:px-8 sm:py-9">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                  <div className="absolute -top-16 right-8 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
                  <div className="absolute -bottom-16 left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                </div>

                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  {/* Official Crest + Title */}
                  <div className="flex items-center gap-3.5 sm:gap-5">
                    <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-3xl border-2 border-amber-300/90 bg-white p-2 shadow-2xl ring-4 ring-white/15">
                      <Image
                        src="/mendiola-logo.png"
                        alt="Mendiola Football Club 1991 Official Crest"
                        width={80}
                        height={84}
                        style={{ width: "auto" }}
                        className="h-15 sm:h-19 object-contain"
                        priority
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="inline-flex items-center rounded-full border border-amber-300/40 bg-black/20 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur-xs">
                        Season&apos;s Greetings · Est. 1991
                      </div>

                      <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-white sm:text-3xl leading-tight">
                        Mendiola Football Academy - Bulacan
                      </h1>

                      <p className="mt-1 text-xs font-semibold text-red-100 sm:text-sm">
                        Christmas Party 2026 · Attendance Confirmation
                      </p>
                    </div>
                  </div>

                  {/* Holiday Countdown + Primary RSVP Action */}
                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                    <div className="rounded-2xl border border-amber-200/30 bg-black/25 px-3.5 py-2.5 backdrop-blur-xs sm:min-w-[240px]">
                      <div className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-amber-200">
                        Christmas Party Countdown
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white/10 py-1 text-center">
                          <div className="font-mono text-lg font-extrabold text-white sm:text-xl">
                            {countdown.days}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-red-100">
                            Days
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/10 py-1 text-center">
                          <div className="font-mono text-lg font-extrabold text-white sm:text-xl">
                            {countdown.hours}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-red-100">
                            Hours
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/10 py-1 text-center">
                          <div className="font-mono text-lg font-extrabold text-white sm:text-xl">
                            {countdown.minutes}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-red-100">
                            Mins
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openRsvpForGroup()}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-200 bg-white px-5 text-sm font-extrabold text-primary shadow-xl transition hover:bg-red-50 active:scale-[0.98] sm:w-auto cursor-pointer"
                    >
                      <Gift className="h-4 w-4 text-primary" />
                      <span>Confirm Attendance Now</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Festive Garland Divider */}
              <div className="h-1.5 w-full bg-gradient-to-r from-emerald-700 via-amber-400 to-primary" />

              {/* Event Key Info Grid (One Clean Icon per Section) */}
              <div className="grid grid-cols-1 divide-y divide-red-100/80 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                {/* 1. Date & Time */}
                <div className="flex items-start justify-between gap-3 p-4 sm:p-5 bg-gradient-to-b from-white to-red-50/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-primary">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Celebration Date &amp; Time
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold text-zinc-950 sm:text-base">
                        December 15, 2026
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-primary">
                        Tuesday · 3:00 PM
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadCalendarIcs}
                    className="shrink-0 rounded-xl border border-red-200 bg-red-50/60 px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-red-100/70 cursor-pointer"
                  >
                    + Save Date
                  </button>
                </div>

                {/* 2. Venue & Map Directions */}
                <div className="p-4 sm:p-5 space-y-3 bg-gradient-to-b from-white to-red-50/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Christmas Party Venue
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold text-zinc-950 sm:text-base">
                        Valle Maria Mar
                      </div>
                      <div className="text-xs font-medium text-zinc-600">
                        Sta. Cruz, Sta. Maria, Bulacan
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={EVENT_DETAILS.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-red-200/80 bg-white px-3 py-2 text-xs font-bold text-zinc-800 shadow-2xs transition hover:border-primary hover:bg-red-50/40"
                    >
                      Open Google Maps
                    </a>
                    <a
                      href={EVENT_DETAILS.wazeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-red-200/80 bg-white px-3 py-2 text-xs font-bold text-zinc-800 shadow-2xs transition hover:border-primary hover:bg-red-50/40"
                    >
                      Navigate via Waze
                    </a>
                  </div>
                </div>

                {/* 3. Red & White Christmas Motif */}
                <div className="flex items-center justify-between gap-3 p-4 sm:p-5 bg-gradient-to-br from-red-50/70 via-white to-amber-50/40">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D91B23] to-[#9E0B14] text-amber-200 shadow-2xs">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        Holiday Dress Code
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold text-zinc-950 sm:text-base">
                        Red and White Motif
                      </div>
                      <div className="text-xs font-medium text-zinc-600">
                        Festive Christmas Red &amp; Snow White
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center -space-x-2">
                    <span
                      title="Christmas Red (#D91B23)"
                      className="h-8 w-8 rounded-full bg-[#D91B23] ring-2 ring-white shadow-sm"
                    />
                    <span
                      title="Snow White (#FFFFFF)"
                      className="h-8 w-8 rounded-full bg-white ring-2 ring-red-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* RECENT CONFIRMED HOLIDAY GUESTS PREVIEW */}
            <section className="rounded-3xl border border-red-200/80 bg-white/90 p-4 sm:p-6 shadow-xs backdrop-blur-xs space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-zinc-950">
                    Latest Confirmed Holiday Guests
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Live confirmed players, families &amp; coaching staff
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("roster")}
                  className="inline-flex items-center rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-red-100/70 cursor-pointer"
                >
                  See All ({records.length})
                </button>
              </div>

              {records.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-red-200 bg-gradient-to-b from-red-50/40 to-white p-7 text-center">
                  <p className="text-sm font-extrabold text-zinc-900">
                    Be the First to Confirm for Christmas Party 2026!
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    Tap{" "}
                    <strong className="text-primary">Confirm RSVP</strong>{" "}
                    below to register your player or coach attendance.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {records.slice(0, 6).map((rec) => {
                    const isRecCoach = rec.roleOrAgeGroup === "Coach";
                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50/40 via-white to-red-50/20 p-3.5 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 font-mono text-[10px] font-bold",
                                isRecCoach
                                  ? "bg-emerald-800 text-white"
                                  : "bg-primary text-white"
                              )}
                            >
                              {rec.roleOrAgeGroup}
                            </span>
                            <span className="truncate text-sm font-extrabold text-zinc-950">
                              {rec.playerName}
                            </span>
                          </div>
                          {!isRecCoach && rec.parentName && (
                            <p className="mt-0.5 truncate text-xs text-zinc-500">
                              Parent: {rec.parentName}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center rounded-xl bg-white border border-red-200 px-2.5 py-1 font-mono text-xs font-extrabold text-primary shadow-2xs">
                            {rec.totalPax} Pax
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* TAB 2: CONFIRMED ATTENDANCE ROSTER & HEADCOUNT */
          <div className="space-y-4 sm:space-y-6">
            {/* Festive Mobile-First Summary Strip */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-red-300 bg-gradient-to-br from-[#D91B23] to-[#9E0B14] p-3.5 text-white shadow-sm flex sm:block items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200">
                    Total Party Pax
                  </div>
                  <div className="text-xs text-red-100">
                    {stats.attendingCount} confirmed entries
                  </div>
                </div>
                <div className="font-mono text-3xl font-extrabold sm:mt-1">
                  {stats.totalPax}
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
                      className="rounded-2xl border border-red-100 bg-white/95 p-3.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase text-zinc-700">
                          {grp === "Coach" ? "Coaches" : grp}
                        </span>
                        <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                          {b.attendingEntries} going
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-xl font-extrabold text-zinc-950">
                        {b.pax}{" "}
                        <span className="text-xs font-semibold text-zinc-500">
                          Pax
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Filter & Search Bar */}
            <div className="rounded-2xl border border-red-200/80 bg-white/95 p-3.5 sm:p-4 shadow-2xs space-y-2.5 sm:space-y-0">
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12 items-center">
                <div className="relative md:col-span-5">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-primary/70" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search player, coach, parent, or potluck..."
                    className="h-11 w-full rounded-xl border border-red-200 bg-white pl-9 pr-9 text-sm text-zinc-900 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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

                <div className="grid grid-cols-2 gap-2 md:col-span-5">
                  <Combobox
                    value={groupFilter === "all" ? null : groupFilter}
                    placeholder="All Divisions"
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

                <div className="flex items-center gap-2 md:col-span-2 justify-end">
                  <button
                    type="button"
                    onClick={refreshRsvps}
                    disabled={isRefreshing}
                    className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 text-xs font-bold text-primary transition hover:bg-red-100/70 cursor-pointer"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5 text-primary",
                        isRefreshing && "animate-spin"
                      )}
                    />
                    <span>Refresh List</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Confirmed RSVPs: Mobile Card Stack (< md) + Desktop Table (md+) */}
            {filteredRecords.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-red-200 bg-white/95 p-10 text-center">
                <h3 className="text-base font-extrabold text-zinc-950">
                  No Christmas Party RSVPs Found
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Tap the button below to confirm attendance for a player or
                  coach.
                </p>
                <button
                  type="button"
                  onClick={() => openRsvpForGroup()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 cursor-pointer"
                >
                  <span>Confirm Attendance Now</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Card List (< 768px) */}
                <div className="grid grid-cols-1 gap-2.5 md:hidden">
                  {filteredRecords.map((rec) => {
                    const isRecCoach = rec.roleOrAgeGroup === "Coach";
                    return (
                      <div
                        key={rec.id}
                        className="rounded-2xl border border-red-200/80 bg-white p-4 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "rounded-md px-2 py-0.5 font-mono text-[11px] font-bold",
                                  isRecCoach
                                    ? "bg-emerald-800 text-white"
                                    : "bg-red-50 text-primary border border-red-200"
                                )}
                              >
                                {rec.roleOrAgeGroup}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                  rec.attendanceStatus === "Attending"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-zinc-100 text-zinc-600"
                                )}
                              >
                                {rec.attendanceStatus}
                              </span>
                            </div>
                            <h3 className="mt-1.5 text-base font-extrabold text-zinc-950">
                              {rec.playerName}
                            </h3>
                          </div>

                          <div className="shrink-0 rounded-xl border border-red-200 bg-red-50/60 px-3 py-1.5 text-center">
                            <div className="font-mono text-lg font-extrabold leading-none text-primary">
                              {rec.totalPax}
                            </div>
                            <div className="text-[10px] font-bold uppercase text-zinc-500">
                              Pax
                            </div>
                          </div>
                        </div>

                        {!isRecCoach &&
                          (rec.parentName ||
                            rec.companionNames ||
                            rec.potluckNotes) && (
                            <div className="border-t border-red-100/80 pt-2 text-xs text-zinc-600 space-y-1">
                              {rec.parentName && (
                                <div>
                                  <span className="font-bold text-zinc-800">
                                    Parent/Guardian:
                                  </span>{" "}
                                  {rec.parentName}
                                </div>
                              )}
                              {rec.companionNames && (
                                <div>
                                  <span className="font-bold text-zinc-800">
                                    Companions:
                                  </span>{" "}
                                  {rec.companionNames}
                                </div>
                              )}
                              {rec.potluckNotes && (
                                <div>
                                  <span className="font-bold text-primary">
                                    Potluck/Notes:
                                  </span>{" "}
                                  {rec.potluckNotes}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (md+) */}
                <div className="hidden md:block overflow-hidden rounded-3xl border border-red-200/80 bg-white/95 shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-red-100 bg-red-50/60 text-xs font-bold uppercase tracking-wider text-zinc-700">
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
                      <tbody className="divide-y divide-red-100/60">
                        {filteredRecords.map((rec) => {
                          const isRecCoach = rec.roleOrAgeGroup === "Coach";
                          return (
                            <tr
                              key={rec.id}
                              className="transition-colors hover:bg-red-50/30"
                            >
                              <td className="whitespace-nowrap py-3.5 pl-4 pr-3">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold",
                                    isRecCoach
                                      ? "bg-emerald-800 text-white"
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
              </>
            )}
          </div>
        )}
      </main>

      {/* SUBTLE ANIMATED CHRISTMAS RSVP FORM DIALOG BOX */}
      <Dialog.Root open={isRsvpDialogOpen} onOpenChange={setIsRsvpDialogOpen}>
        <AnimatePresence>
          {isRsvpDialogOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-50 bg-zinc-950/65 backdrop-blur-xs"
                />
              </Dialog.Overlay>

              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14, scale: 0.98 }}
                  transition={{
                    duration: 0.24,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-1.25rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border-2 border-red-200 bg-white shadow-2xl focus:outline-none"
                >
                  {/* Candy-cane top accent inside dialog */}
                  <div className="mfc-candy-cane-bar h-1.5 w-full shrink-0" />

                  {/* Clean Sticky Festive Dialog Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-gradient-to-r from-[#A50D16] via-[#D91B23] to-[#9E0B14] px-4 py-3.5 text-white sm:px-6 sm:py-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-white p-1 shadow-xs">
                        <Image
                          src="/mendiola-logo.png"
                          alt="Mendiola FC"
                          width={32}
                          height={34}
                          style={{ width: "auto" }}
                          className="h-7 object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <Dialog.Title className="truncate text-base font-extrabold leading-tight text-white sm:text-lg">
                          {submittedRecord
                            ? "Holiday Party Pass"
                            : "Christmas Party RSVP"}
                        </Dialog.Title>
                        <Dialog.Description className="truncate text-[11px] text-red-100">
                          Dec 15, 2026 · 3:00 PM · Valle Maria Mar, Bulacan
                        </Dialog.Description>
                      </div>
                    </div>

                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Close RSVP dialog"
                        className="rounded-xl bg-white/15 p-2 text-white transition hover:bg-white/25 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Scrollable Dialog Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-[#FFFDFD] to-[#FFF7F6]">
                    {submittedRecord ? (
                      /* DIGITAL HOLIDAY PARTY PASS INSIDE DIALOG */
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50/90 via-white to-amber-50/50 p-4 sm:p-5 shadow-sm">
                          <div className="flex items-center justify-between gap-3 border-b border-red-100 pb-3.5">
                            <div>
                              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase text-white">
                                {submittedRecord.roleOrAgeGroup === "Coach"
                                  ? "COACH PASS"
                                  : `${submittedRecord.roleOrAgeGroup} DIVISION`}
                              </span>
                              <h3 className="mt-1.5 text-xl font-extrabold text-zinc-950">
                                {submittedRecord.playerName}
                              </h3>
                            </div>

                            <div className="rounded-2xl border border-red-200 bg-white px-3.5 py-2 text-center shadow-2xs">
                              <div className="text-[10px] font-bold uppercase text-zinc-500">
                                Total Pax
                              </div>
                              <div className="font-mono text-2xl font-extrabold text-primary">
                                {submittedRecord.totalPax}
                              </div>
                            </div>
                          </div>

                          <dl className="mt-3.5 grid grid-cols-2 gap-3 text-xs sm:text-sm">
                            <div>
                              <dt className="text-[11px] font-semibold text-zinc-500">
                                Status
                              </dt>
                              <dd className="font-bold text-emerald-700">
                                {submittedRecord.attendanceStatus}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-semibold text-zinc-500">
                                Dress Code Motif
                              </dt>
                              <dd className="font-bold text-primary">
                                Red &amp; White Motif
                              </dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="text-[11px] font-semibold text-zinc-500">
                                Venue &amp; Time
                              </dt>
                              <dd className="font-bold text-zinc-950">
                                Valle Maria Mar, Sta. Cruz, Sta. Maria, Bulacan
                                · Dec 15, 2026 @ 3:00 PM
                              </dd>
                            </div>

                            {submittedRecord.roleOrAgeGroup !== "Coach" && (
                              <>
                                {submittedRecord.parentName && (
                                  <div className="col-span-2 sm:col-span-1">
                                    <dt className="text-[11px] font-semibold text-zinc-500">
                                      Parent / Guardian
                                    </dt>
                                    <dd className="font-bold text-zinc-950">
                                      {submittedRecord.parentName}
                                    </dd>
                                  </div>
                                )}
                                {submittedRecord.companionNames && (
                                  <div className="col-span-2 sm:col-span-1">
                                    <dt className="text-[11px] font-semibold text-zinc-500">
                                      Companions
                                    </dt>
                                    <dd className="font-bold text-zinc-950">
                                      {submittedRecord.companionNames}
                                    </dd>
                                  </div>
                                )}
                                {submittedRecord.potluckNotes && (
                                  <div className="col-span-2">
                                    <dt className="text-[11px] font-semibold text-zinc-500">
                                      Potluck / Notes
                                    </dt>
                                    <dd className="font-bold text-zinc-950">
                                      {submittedRecord.potluckNotes}
                                    </dd>
                                  </div>
                                )}
                              </>
                            )}
                          </dl>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={handleResetForAnotherPlayer}
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-extrabold text-primary transition hover:bg-red-100 cursor-pointer"
                          >
                            + Add Another Player / Sibling
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsRsvpDialogOpen(false);
                              setActiveTab("roster");
                            }}
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-xs font-extrabold text-white transition hover:bg-red-700 cursor-pointer"
                          >
                            View Confirmed Guests
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      /* CLEAN FESTIVE RSVP FORM INSIDE DIALOG */
                      <form
                        id="rsvp-dialog-form"
                        onSubmit={handleSubmit}
                        noValidate
                        className="space-y-4 sm:space-y-5"
                      >
                        {/* 1. AGE GROUP OR COACH */}
                        <div className="space-y-2">
                          <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-800">
                            1. Select Age Group or Coach Role
                          </label>
                          <div className="grid grid-cols-5 gap-1.5">
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
                                    "flex items-center justify-center rounded-xl border py-2.5 px-1 text-center text-xs font-extrabold transition-all active:scale-95 cursor-pointer",
                                    selected
                                      ? "border-primary bg-gradient-to-b from-[#D91B23] to-[#B01219] text-white shadow-sm ring-2 ring-primary/20"
                                      : "border-red-100 bg-white text-zinc-800 hover:border-primary/40 hover:bg-red-50/40"
                                  )}
                                >
                                  {opt.shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. PLAYER OR COACH NAME */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="dialog-player-name"
                              className="block text-xs font-extrabold uppercase tracking-wider text-zinc-800"
                            >
                              {isCoach
                                ? "2. Specific Name of Coach *"
                                : `2. Specific Name of Player (${roleOrAgeGroup}) *`}
                            </label>
                            {isCoach && (
                              <span className="rounded-full bg-emerald-800 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                Coach Mode
                              </span>
                            )}
                          </div>

                          <input
                            id="dialog-player-name"
                            type="text"
                            required
                            value={playerName}
                            onChange={(e) => {
                              setPlayerName(e.target.value);
                              if (formError) setFormError(null);
                            }}
                            placeholder={
                              isCoach
                                ? "Enter Coach's full name"
                                : "Enter Player's full name"
                            }
                            className="h-11 w-full rounded-xl border border-red-200 bg-white px-3.5 text-sm font-semibold text-zinc-950 placeholder:font-normal placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        {/* 3. ATTENDANCE & SPECIFIC NUMBER OF PAX */}
                        <div className="space-y-3">
                          <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-800">
                            3. Attendance &amp; Specific Number of Pax
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAttendanceStatus("Attending");
                                if (totalPax < 1) setTotalPax(isCoach ? 1 : 2);
                              }}
                              className={cn(
                                "flex items-center justify-center rounded-xl border py-2.5 px-3 text-xs font-extrabold transition cursor-pointer",
                                attendanceStatus === "Attending"
                                  ? "border-primary bg-primary text-white shadow-xs"
                                  : "border-red-100 bg-white text-zinc-700"
                              )}
                            >
                              Going (Attending)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAttendanceStatus("Not Attending");
                                setTotalPax(0);
                                setContactNumber("");
                                setCompanionNames("");
                                setPotluckNotes("");
                              }}
                              className={cn(
                                "flex items-center justify-center rounded-xl border py-2.5 px-3 text-xs font-extrabold transition cursor-pointer",
                                attendanceStatus === "Not Attending"
                                  ? "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                                  : "border-red-100 bg-white text-zinc-700"
                              )}
                            >
                              Cannot Attend
                            </button>
                          </div>

                          {attendanceStatus === "Attending" && (
                            <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/70 via-white to-amber-50/40 p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-extrabold text-zinc-950">
                                    Specific Number of Pax *
                                  </div>
                                  <div className="text-[11px] text-zinc-600">
                                    {isCoach
                                      ? "Coach headcount"
                                      : `1 Player + ${companionCount} Family Companion${companionCount === 1 ? "" : "s"}`}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    aria-label="Decrease pax"
                                    onClick={() =>
                                      setTotalPax((prev) =>
                                        Math.max(1, prev - 1)
                                      )
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-zinc-900 active:scale-95 cursor-pointer"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>

                                  <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    aria-label="Total Pax"
                                    value={totalPax}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setTotalPax(
                                        Number.isFinite(val) && val >= 1
                                          ? Math.min(30, val)
                                          : 1
                                      );
                                    }}
                                    className="h-10 w-16 rounded-xl border border-primary/50 bg-white text-center font-mono text-base font-extrabold text-primary focus:border-primary focus:outline-none"
                                  />

                                  <button
                                    type="button"
                                    aria-label="Increase pax"
                                    onClick={() =>
                                      setTotalPax((prev) =>
                                        Math.min(30, prev + 1)
                                      )
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-zinc-900 active:scale-95 cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-red-100">
                                {[1, 2, 3, 4, 5, 6].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => setTotalPax(num)}
                                    className={cn(
                                      "flex-1 rounded-lg py-1 font-mono text-xs font-bold transition cursor-pointer",
                                      totalPax === num
                                        ? "bg-primary text-white shadow-2xs"
                                        : "bg-white text-zinc-700 border border-red-100"
                                    )}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 4. CONDITIONAL PLAYER vs COACH & ATTENDANCE FIELDS */}
                        <AnimatePresence mode="wait" initial={false}>
                          {!isCoach ? (
                            <motion.div
                              key={`player-fields-${attendanceStatus}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.16 }}
                              className="space-y-3 rounded-2xl border border-red-100 bg-red-50/35 p-3.5"
                            >
                              <div
                                className={cn(
                                  "grid grid-cols-1 gap-3",
                                  attendanceStatus === "Attending" &&
                                    "sm:grid-cols-2"
                                )}
                              >
                                <div className="space-y-1">
                                  <label
                                    htmlFor="dialog-parent-name"
                                    className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700"
                                  >
                                    Parent / Guardian Name *
                                  </label>
                                  <input
                                    id="dialog-parent-name"
                                    type="text"
                                    required={!isCoach}
                                    value={parentName}
                                    onChange={(e) => {
                                      setParentName(e.target.value);
                                      if (formError) setFormError(null);
                                    }}
                                    placeholder="e.g. Angelie Mauricio"
                                    className="h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none"
                                  />
                                </div>

                                {attendanceStatus === "Attending" && (
                                  <div className="space-y-1">
                                    <label
                                      htmlFor="dialog-contact-player"
                                      className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700"
                                    >
                                      Contact / Viber Number
                                    </label>
                                    <input
                                      id="dialog-contact-player"
                                      type="tel"
                                      value={contactNumber}
                                      onChange={(e) =>
                                        setContactNumber(e.target.value)
                                      }
                                      placeholder="0917 XXX XXXX"
                                      className="h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                )}
                              </div>

                              {attendanceStatus === "Attending" && (
                                <>
                                  <div className="space-y-1">
                                    <label
                                      htmlFor="dialog-companions"
                                      className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700"
                                    >
                                      Companion Names{" "}
                                      {companionCount > 0
                                        ? `(${companionCount} guest${companionCount > 1 ? "s" : ""})`
                                        : "(Optional)"}
                                    </label>
                                    <input
                                      id="dialog-companions"
                                      type="text"
                                      value={companionNames}
                                      onChange={(e) =>
                                        setCompanionNames(e.target.value)
                                      }
                                      placeholder="Names of accompanying family members..."
                                      className="h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label
                                      htmlFor="dialog-potluck"
                                      className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700"
                                    >
                                      Holiday Potluck / Notes (Optional)
                                    </label>
                                    <input
                                      id="dialog-potluck"
                                      type="text"
                                      value={potluckNotes}
                                      onChange={(e) =>
                                        setPotluckNotes(e.target.value)
                                      }
                                      placeholder="e.g. Bringing Christmas Ham / Pasta / Drinks..."
                                      className="h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                </>
                              )}
                            </motion.div>
                          ) : attendanceStatus === "Attending" ? (
                            <motion.div
                              key="coach-fields"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.16 }}
                              className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <label
                                  htmlFor="dialog-contact-coach"
                                  className="block text-[11px] font-bold uppercase tracking-wider text-zinc-800"
                                >
                                  Coach Contact Number (Optional)
                                </label>
                                <span className="text-[10px] font-semibold text-emerald-800">
                                  Parent, Companion &amp; Potluck omitted
                                </span>
                              </div>
                              <input
                                id="dialog-contact-coach"
                                type="tel"
                                value={contactNumber}
                                onChange={(e) =>
                                  setContactNumber(e.target.value)
                                }
                                placeholder="0917 XXX XXXX"
                                className="h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none"
                              />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        {formError && (
                          <div
                            role="alert"
                            className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-800"
                          >
                            {formError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#D91B23] to-[#B01219] px-5 text-sm font-extrabold text-white shadow-md shadow-red-600/20 ring-1 ring-amber-300/40 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                        >
                          {isSubmitting
                            ? "Saving Holiday RSVP..."
                            : attendanceStatus === "Attending"
                              ? `Confirm Christmas Attendance (${totalPax} Pax)`
                              : "Submit RSVP Response"}
                        </button>
                      </form>
                    )}
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {/* FESTIVE BOTTOM STICKY NAVIGATION BAR */}
      <nav
        aria-label="Bottom sticky navigation"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-red-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(185,20,28,0.08)] backdrop-blur-md"
      >
        <div className="mx-auto grid h-17 max-w-lg grid-cols-3 items-center gap-2 px-3">
          {/* 1. Christmas Pass Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("pass")}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition cursor-pointer",
              activeTab === "pass" && !isRsvpDialogOpen
                ? "text-primary font-extrabold"
                : "text-zinc-500 font-semibold hover:text-zinc-900"
            )}
          >
            <TreePine
              className={cn(
                "h-5 w-5",
                activeTab === "pass" && !isRsvpDialogOpen
                  ? "text-emerald-700"
                  : "text-zinc-500"
              )}
            />
            <span className="text-[11px]">Christmas Pass</span>
          </button>

          {/* 2. Center Primary Action: Open Animated Christmas RSVP Dialog */}
          <button
            type="button"
            onClick={() => openRsvpForGroup()}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#D91B23] to-[#B01219] px-3 text-xs font-extrabold text-white shadow-md shadow-red-600/25 ring-1 ring-amber-300/50 transition hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <Gift className="h-4 w-4 shrink-0 text-amber-200" />
            <span className="truncate">Confirm RSVP</span>
          </button>

          {/* 3. Confirmed Pax Roster Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition cursor-pointer",
              activeTab === "roster" && !isRsvpDialogOpen
                ? "text-primary font-extrabold"
                : "text-zinc-500 font-semibold hover:text-zinc-900"
            )}
          >
            <div className="relative">
              <Users className="h-5 w-5" />
              <span className="absolute -right-3.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold text-white ring-1 ring-amber-200">
                {stats.totalPax}
              </span>
            </div>
            <span className="text-[11px]">Confirmed Pax</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
