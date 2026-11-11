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
  type PlayerAgeGroup,
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
  const [siblings, setSiblings] = React.useState<
    { id: string; ageGroup: PlayerAgeGroup; name: string }[]
  >([]);
  const [attendanceStatus, setAttendanceStatus] =
    React.useState<AttendanceStatus>("Attending");
  const [totalPax, setTotalPax] = React.useState<number>(2);
  const [parentName, setParentName] = React.useState("");
  const [companionList, setCompanionList] = React.useState<string[]>([]);
  const [companionInput, setCompanionInput] = React.useState("");
  const [contactNumber, setContactNumber] = React.useState("");
  const companionInputRef = React.useRef<HTMLInputElement | null>(null);

  const isCoach = roleOrAgeGroup === "Coach";
  const playerCount = isCoach ? 1 : 1 + siblings.length;
  const minAttendingPax = playerCount;
  const maxCompanions =
    attendanceStatus === "Attending"
      ? Math.max(0, totalPax - playerCount)
      : 0;
  const isCompanionLimitReached = companionList.length >= maxCompanions;

  const addSiblingPlayer = () => {
    const defaultAgeGroup: PlayerAgeGroup =
      roleOrAgeGroup === "Coach" ? "U5" : roleOrAgeGroup;
    setSiblings((prev) => [
      ...prev,
      {
        id: `sib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ageGroup: defaultAgeGroup,
        name: "",
      },
    ]);
    if (attendanceStatus === "Attending") {
      setTotalPax((prev) => Math.min(30, prev + 1));
    }
    if (formError) setFormError(null);
  };

  const updateSiblingPlayer = (
    id: string,
    patch: Partial<{ ageGroup: PlayerAgeGroup; name: string }>
  ) => {
    setSiblings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
    if (formError) setFormError(null);
  };

  const removeSiblingPlayer = (id: string) => {
    const nextMinPax = Math.max(1, siblings.length);
    setSiblings((prev) => prev.filter((s) => s.id !== id));
    if (attendanceStatus === "Attending") {
      setTotalPax((prev) => Math.max(nextMinPax, prev - 1));
    }
    if (formError) setFormError(null);
  };

  const updateTotalPax = React.useCallback(
    (nextPax: number, nextPlayerCount = playerCount) => {
      const clampedPax = Math.max(nextPlayerCount, Math.min(30, nextPax));
      const nextMaxCompanions = Math.max(0, clampedPax - nextPlayerCount);
      setTotalPax(clampedPax);
      setCompanionList((prev) => {
        const sliced =
          prev.length > nextMaxCompanions
            ? prev.slice(0, nextMaxCompanions)
            : prev;
        if (sliced.length >= nextMaxCompanions) {
          setCompanionInput("");
        }
        return sliced;
      });
    },
    [playerCount]
  );

  const addCompanionBadges = React.useCallback(
    (rawNames: string[]) => {
      const cleaned = rawNames
        .map((n) => n.replace(/^[,.]+|[,.]+$/g, "").trim())
        .filter(Boolean);
      if (cleaned.length === 0) return;
      setCompanionList((prev) => {
        const remainingSlots = Math.max(0, maxCompanions - prev.length);
        if (remainingSlots <= 0) return prev;
        return [...prev, ...cleaned.slice(0, remainingSlots)];
      });
    },
    [maxCompanions]
  );

  const removeCompanionBadge = React.useCallback((indexToRemove: number) => {
    setCompanionList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }, []);

  const handleCompanionInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (companionList.length >= maxCompanions) {
      setCompanionInput("");
      return;
    }

    const val = e.target.value;

    // Split into badge(s) when typing a comma "," or period "." (unless it's a short prefix/initial like "Ma." or "J.")
    if (val.includes(",")) {
      const parts = val.split(",");
      const remainder = parts.pop() ?? "";
      const remainingSlots = Math.max(
        0,
        maxCompanions - companionList.length
      );
      const accepted = parts
        .map((n) => n.replace(/^[,.]+|[,.]+$/g, "").trim())
        .filter(Boolean)
        .slice(0, remainingSlots);
      addCompanionBadges(accepted);
      setCompanionInput(
        companionList.length + accepted.length >= maxCompanions ? "" : remainder
      );
      return;
    }

    if (val.endsWith(".")) {
      const candidate = val.slice(0, -1).trim();
      const lower = candidate.toLowerCase();
      const isPrefixOrInitial =
        candidate.length <= 1 ||
        ["ma", "mr", "ms", "mrs", "dr", "jr", "sr", "st"].includes(lower);
      if (candidate && !isPrefixOrInitial) {
        addCompanionBadges([candidate]);
        setCompanionInput("");
        return;
      }
    }

    setCompanionInput(val);
  };

  const handleCompanionKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (companionInput.trim() && companionList.length < maxCompanions) {
        addCompanionBadges([companionInput]);
        setCompanionInput("");
      }
    } else if (
      e.key === "Backspace" &&
      companionInput === "" &&
      companionList.length > 0
    ) {
      e.preventDefault();
      setCompanionList((prev) => prev.slice(0, -1));
    }
  };

  const handleCompanionBlur = () => {
    if (companionInput.trim() && companionList.length < maxCompanions) {
      addCompanionBadges(companionInput.split(","));
      setCompanionInput("");
    } else if (companionList.length >= maxCompanions) {
      setCompanionInput("");
    }
  };

  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedRecord, setSubmittedRecord] =
    React.useState<ChristmasRsvpRecord | null>(null);
  const [submittedSiblings, setSubmittedSiblings] = React.useState<
    ChristmasRsvpRecord[]
  >([]);

  // Roster filter state
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const countdown = useEventCountdown(EVENT_DETAILS.isoStart);

  const handleSelectRoleOrAgeGroup = (nextRole: RoleOrAgeGroup) => {
    setRoleOrAgeGroup(nextRole);
    setFormError(null);
    if (nextRole === "Coach") {
      setParentName("");
      setSiblings([]);
    }
    if (attendanceStatus === "Attending" && totalPax < 1) {
      setTotalPax(2);
    }
  };

  const openRsvpForGroup = (grp?: RoleOrAgeGroup) => {
    if (grp) {
      handleSelectRoleOrAgeGroup(grp);
    }
    setSubmittedRecord(null);
    setSubmittedSiblings([]);
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

    if (!isCoach) {
      for (let i = 0; i < siblings.length; i++) {
        if (!siblings[i].name.trim()) {
          setFormError(
            `Please enter the full name for Sibling Player #${i + 1}.`
          );
          return;
        }
      }
    }

    if (!isCoach && !parentName.trim()) {
      setFormError("Please enter the Parent / Guardian name.");
      return;
    }

    if (
      attendanceStatus === "Attending" &&
      (!totalPax || totalPax < minAttendingPax)
    ) {
      setFormError(
        `Please enter a valid number of pax (at least ${minAttendingPax} for ${playerCount} player${playerCount > 1 ? "s" : ""}).`
      );
      return;
    }

    setIsSubmitting(true);

    const isAttending = attendanceStatus === "Attending";
    const remainingSlots = Math.max(0, maxCompanions - companionList.length);
    const pendingCompanions = companionInput
      .split(",")
      .map((n) => n.replace(/^[,.]+|[,.]+$/g, "").trim())
      .filter(Boolean)
      .slice(0, remainingSlots);
    const finalCompanionList = [
      ...companionList.slice(0, maxCompanions),
      ...pendingCompanions,
    ];
    const mergedCompanions = finalCompanionList.join(", ");
    if (pendingCompanions.length > 0) {
      setCompanionList(finalCompanionList);
      setCompanionInput("");
    }

    const activeSiblings = !isCoach
      ? siblings
          .map((s) => ({ ageGroup: s.ageGroup, name: s.name.trim() }))
          .filter((s) => Boolean(s.name))
      : [];

    const primaryPax = isAttending
      ? Math.max(1, totalPax - activeSiblings.length)
      : 0;

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleOrAgeGroup,
          playerName: trimmedName,
          attendanceStatus,
          totalPax: primaryPax,
          parentName: isCoach ? "" : parentName.trim(),
          companionNames: isAttending ? mergedCompanions : "",
          contactNumber: isAttending ? contactNumber.trim() : "",
        }),
      });

      let data = (await res.json()) as {
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

      const primaryRecord = data.record;
      const savedSiblingRecords: ChristmasRsvpRecord[] = [];

      for (const sib of activeSiblings) {
        const sibRes = await fetch("/api/rsvp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleOrAgeGroup: sib.ageGroup,
            playerName: sib.name,
            attendanceStatus,
            totalPax: isAttending ? 1 : 0,
            parentName: parentName.trim(),
            companionNames: isAttending
              ? `Sibling of ${trimmedName} (${roleOrAgeGroup})`
              : "",
            contactNumber: isAttending ? contactNumber.trim() : "",
          }),
        });
        const sibData = (await sibRes.json()) as {
          ok: boolean;
          record?: ChristmasRsvpRecord;
          records?: ChristmasRsvpRecord[];
          stats?: RsvpSummaryStats;
        };
        if (sibRes.ok && sibData.ok && sibData.record) {
          savedSiblingRecords.push(sibData.record);
          data = { ...data, records: sibData.records, stats: sibData.stats };
        }
      }

      if (data.records) setRecords(data.records);
      if (data.stats) setStats(data.stats);

      try {
        const raw = localStorage.getItem(LOCAL_CACHE_KEY);
        const existing: ChristmasRsvpRecord[] = raw ? JSON.parse(raw) : [];
        const newEntries = [primaryRecord, ...savedSiblingRecords];
        const updated = [
          ...newEntries,
          ...existing.filter(
            (r) =>
              !newEntries.some(
                (ne) =>
                  ne.roleOrAgeGroup === r.roleOrAgeGroup &&
                  ne.playerName.toLowerCase() === r.playerName.toLowerCase()
              )
          ),
        ];
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }

      setSubmittedSiblings(savedSiblingRecords);
      setSubmittedRecord({
        ...primaryRecord,
        totalPax: isAttending ? totalPax : 0,
      });
      setIsSubmitting(false);
    } catch {
      setFormError(
        "Network error while submitting RSVP. Please check your connection and try again."
      );
      setIsSubmitting(false);
    }
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
          r.contactNumber,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, groupFilter, statusFilter, searchQuery]);

  const companionCount = maxCompanions;

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-zinc-50/70 text-zinc-950 pb-24">
      {/* Subtle Ambient Snowfall Background */}
      <ChristmasSnowfall />

      {/* Subtle Top Accent Line */}
      <div className="relative z-30 h-1 w-full bg-zinc-200" />

      {/* Clean Neutral Sticky Header */}
      <header className="sticky top-0 z-30 h-16 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-3.5 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("pass")}
            className="flex min-w-0 items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white p-1 shadow-2xs transition-transform duration-200 group-hover:scale-105">
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
                <span className="hidden shrink-0 whitespace-nowrap rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-600 sm:inline-block">
                  XMAS 2026
                </span>
              </div>
              <p className="truncate text-[11px] font-medium text-zinc-500">
                Dec 15, 2026 · 3:00 PM · Valle Maria Mar
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openRsvpForGroup()}
            className="shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-200/80 active:scale-[0.98] cursor-pointer"
          >
            <span>RSVP</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 mx-auto w-full max-w-6xl flex-1 px-3.5 py-4 sm:px-6 sm:py-8">
        {activeTab === "pass" ? (
          <div className="space-y-5 sm:space-y-7">
            {/* OPTION A + STUDY 3: NEUTRAL CANVAS HERO WITH HANGING ORNAMENTS, BOKEH & PINE HORIZON */}
            <section className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-sm">
              {/* Calm Neutral Hero Header with Study 3 Graphic Framing */}
              <div className="relative overflow-hidden px-4 py-6 sm:px-8 sm:py-9">
                {/* Study 3: Soft Bokeh Light Circles + Hanging Ornaments + Bottom Pine Silhouette */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                  {/* Soft bokeh circles */}
                  <div className="absolute -top-10 left-[18%] h-36 w-36 rounded-full bg-red-100/40 blur-2xl" />
                  <div className="absolute top-4 right-[22%] h-32 w-32 rounded-full bg-amber-100/45 blur-2xl" />
                  <div className="absolute bottom-2 left-[45%] h-28 w-28 rounded-full bg-red-50/60 blur-xl" />

                  {/* Top-left hanging line-art ornaments */}
                  <svg
                    className="absolute top-0 left-4 sm:left-10 h-16 w-28 text-zinc-300/75"
                    viewBox="0 0 110 68"
                    fill="none"
                  >
                    <line x1="18" y1="0" x2="18" y2="24" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="18" cy="33" r="8" stroke="currentColor" strokeWidth="1.4" />
                    <line x1="52" y1="0" x2="52" y2="14" stroke="currentColor" strokeWidth="1.2" />
                    <polygon
                      points="52,15 55,21 62,22 57,26.5 58,33 52,29.5 46,33 47,26.5 42,22 49,21"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <line x1="86" y1="0" x2="86" y2="30" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 2" />
                    <circle cx="86" cy="36" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>

                  {/* Top-right hanging line-art ornaments */}
                  <svg
                    className="absolute top-0 right-4 sm:right-10 h-16 w-28 text-zinc-300/75"
                    viewBox="0 0 110 68"
                    fill="none"
                  >
                    <line x1="26" y1="0" x2="26" y2="18" stroke="currentColor" strokeWidth="1.2" />
                    <polygon points="26,18 33,28 26,38 19,28" stroke="currentColor" strokeWidth="1.3" />
                    <line x1="62" y1="0" x2="62" y2="28" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="62" cy="37" r="8.5" stroke="currentColor" strokeWidth="1.4" />
                    <line x1="92" y1="0" x2="92" y2="14" stroke="currentColor" strokeWidth="1.2" />
                    <polygon
                      points="92,15 94.5,20 100,21 96,25 97,30.5 92,27.5 87,30.5 88,25 84,21 89.5,20"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </svg>

                  {/* Bottom pine silhouette horizon inside hero */}
                  <svg
                    className="absolute bottom-0 inset-x-0 h-8 w-full text-zinc-200/65"
                    viewBox="0 0 800 32"
                    preserveAspectRatio="none"
                    fill="currentColor"
                  >
                    <path
                      d="M0 32 L0 25 Q200 16 400 24 T800 22 L800 32 Z"
                      className="text-zinc-100"
                      fill="currentColor"
                    />
                    <polygon points="18,32 30,8 42,32" />
                    <polygon points="38,32 48,14 58,32" />
                    <polygon points="62,32 70,18 78,32" />
                    <polygon points="120,32 132,10 144,32" />
                    <polygon points="650,32 662,12 674,32" />
                    <polygon points="718,32 728,16 738,32" />
                    <polygon points="734,32 748,6 762,32" />
                    <polygon points="758,32 770,13 782,32" />
                  </svg>
                </div>

                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  {/* Official Crest + Title */}
                  <div className="flex items-center gap-3.5 sm:gap-5">
                    <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50/70 p-2 shadow-xs">
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
                      <div className="inline-flex items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        Season&apos;s Greetings · Est. 1991
                      </div>

                      <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl leading-tight">
                        Mendiola Football Academy - Bulacan
                      </h1>

                      <p className="mt-1 text-xs font-medium text-zinc-500 sm:text-sm">
                        Christmas Party 2026 · Attendance Confirmation
                      </p>
                    </div>
                  </div>

                  {/* Muted Countdown + Emphasized Primary RSVP Action */}
                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 sm:min-w-[240px]">
                      <div className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 whitespace-nowrap">
                        Christmas Party Countdown
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-zinc-200/80 bg-white py-1 text-center">
                          <div className="font-mono text-lg font-extrabold text-zinc-900 sm:text-xl">
                            {countdown.days}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                            Days
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-200/80 bg-white py-1 text-center">
                          <div className="font-mono text-lg font-extrabold text-zinc-900 sm:text-xl">
                            {countdown.hours}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                            Hours
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-200/80 bg-white py-1 text-center">
                          <div className="font-mono text-lg font-extrabold text-zinc-900 sm:text-xl">
                            {countdown.minutes}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                            Mins
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openRsvpForGroup()}
                      className="inline-flex h-13 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-gradient-to-r from-[#D91B23] to-[#B5121B] px-6 text-sm font-extrabold text-white shadow-lg shadow-red-600/30 ring-4 ring-red-500/15 transition hover:brightness-110 active:scale-[0.98] sm:w-auto cursor-pointer"
                    >
                      <Gift className="h-4 w-4 shrink-0 text-white" />
                      <span>Confirm Attendance Now</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtle Neutral Divider */}
              <div className="h-px w-full bg-zinc-200/80" />

              {/* Event Key Info Grid (Unified Muted Neutral Icons & Controls) */}
              <div className="grid grid-cols-1 divide-y divide-zinc-200/70 bg-zinc-50/40 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                {/* 1. Date & Time */}
                <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-600">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Celebration Date &amp; Time
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold text-zinc-950 sm:text-base">
                        December 15, 2026
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-zinc-600">
                        Tuesday · 3:00 PM
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadCalendarIcs}
                    className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 cursor-pointer"
                  >
                    + Save Date
                  </button>
                </div>

                {/* 2. Venue & Map Directions */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Christmas Party Venue
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold text-zinc-950 sm:text-base">
                        Valle Maria Mar
                      </div>
                      <div className="text-xs font-medium text-zinc-500">
                        Sta. Cruz, Sta. Maria, Bulacan
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={EVENT_DETAILS.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-100"
                    >
                      Open Google Maps
                    </a>
                    <a
                      href={EVENT_DETAILS.wazeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-100"
                    >
                      Navigate via Waze
                    </a>
                  </div>
                </div>

                {/* 3. Red & White Christmas Motif */}
                <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-600">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Holiday Dress Code
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold text-zinc-950 sm:text-base">
                        Red and White Motif
                      </div>
                      <div className="text-xs font-medium text-zinc-500">
                        Festive Christmas Red &amp; Snow White
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center -space-x-2">
                    <span
                      title="Christmas Red (#D91B23)"
                      className="relative z-10 h-7 w-7 rounded-full bg-[#D91B23]/85 ring-2 ring-white shadow-2xs"
                    />
                    <span
                      title="Snow White (#FFFFFF)"
                      className="relative z-0 h-7 w-7 rounded-full bg-white ring-2 ring-zinc-200 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* RECENT CONFIRMED HOLIDAY GUESTS PREVIEW */}
            <section className="rounded-3xl border border-zinc-200/90 bg-white p-4 sm:p-6 shadow-2xs space-y-3.5">
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
                  className="shrink-0 inline-flex items-center whitespace-nowrap rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 cursor-pointer"
                >
                  See All ({records.length})
                </button>
              </div>

              {records.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-7 text-center">
                  <p className="text-sm font-extrabold text-zinc-900">
                    Be the First to Confirm for Christmas Party 2026!
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    Tap{" "}
                    <strong className="text-primary">
                      Confirm Attendance Now
                    </strong>{" "}
                    above to register your player or coach attendance.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {records.slice(0, 6).map((rec) => {
                    const isRecCoach = rec.roleOrAgeGroup === "Coach";
                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-700">
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
                          {rec.attendanceStatus === "Attending" ? (
                            <span className="inline-flex items-center whitespace-nowrap rounded-xl bg-white border border-zinc-200 px-2.5 py-1 font-mono text-xs font-bold text-zinc-800">
                              {rec.totalPax} Pax
                            </span>
                          ) : (
                            <span className="inline-flex items-center whitespace-nowrap rounded-xl bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-500">
                              Not Attending
                            </span>
                          )}
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
            {/* Neutral Mobile-First Summary Strip */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
              <div className="col-span-2 sm:col-span-2 lg:col-span-1 rounded-2xl border border-zinc-200 bg-zinc-900 p-3.5 text-white shadow-2xs flex sm:block items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Total Party Pax
                  </div>
                  <div className="text-xs text-zinc-300">
                    {stats.attendingCount} confirmed entries
                  </div>
                </div>
                <div className="font-mono text-3xl font-extrabold sm:mt-1">
                  {stats.totalPax}
                </div>
              </div>

              {(
                ["U5", "U7", "U9", "U13", "U15", "Coach"] as RoleOrAgeGroup[]
              ).map((grp) => {
                const b = stats.byGroup[grp] ?? {
                  entries: 0,
                  attendingEntries: 0,
                  pax: 0,
                };
                return (
                  <div
                    key={grp}
                    className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-extrabold uppercase text-zinc-700 whitespace-nowrap">
                        {grp === "Coach" ? "Coaches" : grp}
                      </span>
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-600">
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
              })}
            </div>

            {/* Filter & Search Bar */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2.5 sm:space-y-0">
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12 items-center">
                <div className="relative md:col-span-5">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search player, coach, parent, or companion..."
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-9 text-base sm:text-sm text-zinc-900 transition-all duration-200 hover:border-zinc-300 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
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
                      { value: "U15", label: "U15 Division", badge: "U15" },
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
                    className="inline-flex h-11 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 cursor-pointer"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-zinc-600",
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
              <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center">
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
                  className="mt-4 inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 cursor-pointer"
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
                        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="shrink-0 whitespace-nowrap rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-700">
                                {rec.roleOrAgeGroup}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold border",
                                  rec.attendanceStatus === "Attending"
                                    ? "bg-zinc-50 text-zinc-700 border-zinc-200"
                                    : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                )}
                              >
                                {rec.attendanceStatus}
                              </span>
                            </div>
                            <h3 className="mt-1.5 text-base font-extrabold text-zinc-950">
                              {rec.playerName}
                            </h3>
                          </div>

                          {rec.attendanceStatus === "Attending" && (
                            <span className="shrink-0 inline-flex items-center whitespace-nowrap rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs font-extrabold text-zinc-900">
                              {rec.totalPax} Pax
                            </span>
                          )}
                        </div>

                        {((!isRecCoach && rec.parentName) ||
                          rec.companionNames) && (
                          <div className="border-t border-zinc-100 pt-2 text-xs text-zinc-600 space-y-1">
                            {!isRecCoach && rec.parentName && (
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (md+) */}
                <div className="hidden md:block overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-bold uppercase tracking-wider text-zinc-600">
                        <tr>
                          <th className="py-3.5 pl-4 pr-3">Role / Age Group</th>
                          <th className="px-3 py-3.5">Player / Coach Name</th>
                          <th className="px-3 py-3.5">Status</th>
                          <th className="px-3 py-3.5 text-center">Total Pax</th>
                          <th className="px-3 py-3.5">Parent / Guardian</th>
                          <th className="px-3 py-3.5 pr-4">Companions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filteredRecords.map((rec) => {
                          const isRecCoach = rec.roleOrAgeGroup === "Coach";
                          return (
                            <tr
                              key={rec.id}
                              className="transition-colors hover:bg-zinc-50/70"
                            >
                              <td className="whitespace-nowrap py-3.5 pl-4 pr-3">
                                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-mono text-xs font-bold text-zinc-700">
                                  {rec.roleOrAgeGroup}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3.5 font-extrabold text-zinc-950">
                                {rec.playerName}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border",
                                    rec.attendanceStatus === "Attending"
                                      ? "bg-zinc-50 text-zinc-700 border-zinc-200"
                                      : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                  )}
                                >
                                  {rec.attendanceStatus}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3.5 text-center font-mono text-base font-extrabold text-zinc-900">
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
                              <td className="px-3 py-3.5 pr-4 text-zinc-600">
                                {rec.companionNames || "—"}
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

              <Dialog.Content
                asChild
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
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
                            ? submittedRecord.attendanceStatus === "Not Attending"
                              ? "Not Attending"
                              : "Holiday Party Pass"
                            : "Christmas Party RSVP"}
                        </Dialog.Title>
                        <Dialog.Description className="truncate text-[11px] text-red-100">
                          {submittedRecord &&
                          submittedRecord.attendanceStatus === "Not Attending"
                            ? "Attendance response recorded"
                            : "Dec 15, 2026 · 3:00 PM · Valle Maria Mar, Bulacan"}
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
                      /* CONFIRMATION SCREEN INSIDE DIALOG (ATTENDING vs NOT ATTENDING) */
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        <div
                          className={cn(
                            "rounded-2xl border-2 p-4 sm:p-5 shadow-sm",
                            submittedRecord.attendanceStatus === "Not Attending"
                              ? "border-zinc-200 bg-zinc-50/80"
                              : "border-red-200 bg-gradient-to-br from-red-50/90 via-white to-amber-50/50"
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-center justify-between gap-3 border-b pb-3.5",
                              submittedRecord.attendanceStatus === "Not Attending"
                                ? "border-zinc-200"
                                : "border-red-100"
                            )}
                          >
                            <div>
                              <span
                                className={cn(
                                  "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase text-white",
                                  submittedRecord.attendanceStatus ===
                                    "Not Attending"
                                    ? "bg-zinc-800"
                                    : "bg-primary"
                                )}
                              >
                                {submittedRecord.roleOrAgeGroup === "Coach"
                                  ? "COACH"
                                  : `${submittedRecord.roleOrAgeGroup} DIVISION`}
                              </span>
                              <h3 className="mt-1.5 text-xl font-extrabold text-zinc-950">
                                {submittedRecord.playerName}
                              </h3>
                            </div>

                            {submittedRecord.attendanceStatus === "Attending" && (
                              <span className="shrink-0 inline-flex items-center whitespace-nowrap rounded-2xl border border-red-200 bg-white px-3.5 py-2 font-mono text-sm font-extrabold text-primary shadow-2xs">
                                {submittedRecord.totalPax} Pax
                              </span>
                            )}
                          </div>

                          <dl className="mt-3.5 grid grid-cols-2 gap-3 text-xs sm:text-sm">
                            <div
                              className={cn(
                                submittedRecord.attendanceStatus ===
                                  "Not Attending" && "col-span-2"
                              )}
                            >
                              <dt className="text-[11px] font-semibold text-zinc-500">
                                Status
                              </dt>
                              <dd
                                className={cn(
                                  "font-bold",
                                  submittedRecord.attendanceStatus ===
                                    "Not Attending"
                                    ? "text-zinc-800"
                                    : "text-emerald-700"
                                )}
                              >
                                {submittedRecord.attendanceStatus}
                              </dd>
                            </div>

                            {submittedRecord.attendanceStatus ===
                              "Attending" && (
                              <>
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
                                    Valle Maria Mar, Sta. Cruz, Sta. Maria,
                                    Bulacan · Dec 15, 2026 @ 3:00 PM
                                  </dd>
                                </div>
                              </>
                            )}

                            {submittedSiblings.length > 0 && (
                              <div className="col-span-2">
                                <dt className="text-[11px] font-semibold text-zinc-500">
                                  Sibling Player{submittedSiblings.length > 1 ? "s" : ""} Registered
                                </dt>
                                <dd className="mt-1 flex flex-wrap gap-1.5">
                                  {submittedSiblings.map((sib) => (
                                    <span
                                      key={sib.id}
                                      className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-extrabold text-zinc-900"
                                    >
                                      <span className="shrink-0 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                        {sib.roleOrAgeGroup}
                                      </span>
                                      <span className="truncate">{sib.playerName}</span>
                                    </span>
                                  ))}
                                </dd>
                              </div>
                            )}

                            {submittedRecord.roleOrAgeGroup !== "Coach" &&
                              submittedRecord.parentName && (
                                <div className="col-span-2 sm:col-span-1">
                                  <dt className="text-[11px] font-semibold text-zinc-500">
                                    Parent / Guardian
                                  </dt>
                                  <dd className="font-bold text-zinc-950">
                                    {submittedRecord.parentName}
                                  </dd>
                                </div>
                              )}
                            {submittedRecord.attendanceStatus === "Attending" &&
                              submittedRecord.companionNames && (
                                <div className="col-span-2 sm:col-span-1">
                                  <dt className="text-[11px] font-semibold text-zinc-500">
                                    Companions
                                  </dt>
                                  <dd className="font-bold text-zinc-950">
                                    {submittedRecord.companionNames}
                                  </dd>
                                </div>
                              )}
                          </dl>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsRsvpDialogOpen(false);
                            setActiveTab("roster");
                          }}
                          className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl bg-primary px-4 text-xs font-extrabold text-white transition hover:bg-red-700 cursor-pointer"
                        >
                          View Confirmed Guests
                        </button>
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
                          <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
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
                                    "flex items-center justify-center whitespace-nowrap rounded-xl border py-2.5 px-1 text-center text-xs font-extrabold transition-all active:scale-95 cursor-pointer",
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

                        {/* 2. PLAYER OR COACH NAME (+ SIBLING PLAYERS) */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <label
                              htmlFor="dialog-player-name"
                              className="min-w-0 truncate text-xs font-extrabold uppercase tracking-wider text-zinc-800"
                            >
                              {isCoach
                                ? "2. Specific Name of Coach *"
                                : `2. Specific Name of Player (${roleOrAgeGroup}) *`}
                            </label>
                            {isCoach ? (
                              <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-800 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                Coach Mode
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={addSiblingPlayer}
                                className="shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-primary transition hover:bg-red-100/80 active:scale-95 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5 shrink-0" />
                                <span>Add Sibling as Player</span>
                              </button>
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
                            className="h-11 w-full rounded-xl border border-red-200 bg-white px-3.5 text-base sm:text-sm font-semibold text-zinc-950 placeholder:font-normal placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />

                          {/* Sibling Player Rows */}
                          {!isCoach && siblings.length > 0 && (
                            <div className="space-y-2 pt-1">
                              {siblings.map((sib, idx) => (
                                <div
                                  key={sib.id}
                                  className="rounded-2xl border border-red-200/90 bg-red-50/40 p-3 space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wider text-primary">
                                      Sibling Player #{idx + 1} ({sib.ageGroup}) *
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeSiblingPlayer(sib.id)}
                                      className="shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-bold text-zinc-500 transition hover:bg-red-100/70 hover:text-primary cursor-pointer"
                                    >
                                      <X className="h-3.5 w-3.5 shrink-0" />
                                      <span>Remove</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-5 gap-1">
                                    {(
                                      [
                                        "U5",
                                        "U7",
                                        "U9",
                                        "U13",
                                        "U15",
                                      ] as PlayerAgeGroup[]
                                    ).map((div) => (
                                      <button
                                        key={div}
                                        type="button"
                                        onClick={() =>
                                          updateSiblingPlayer(sib.id, {
                                            ageGroup: div,
                                          })
                                        }
                                        className={cn(
                                          "whitespace-nowrap rounded-lg border py-1.5 text-center font-mono text-[11px] font-extrabold transition cursor-pointer",
                                          sib.ageGroup === div
                                            ? "border-primary bg-primary text-white shadow-2xs"
                                            : "border-red-100 bg-white text-zinc-700 hover:border-primary/40"
                                        )}
                                      >
                                        {div}
                                      </button>
                                    ))}
                                  </div>

                                  <input
                                    type="text"
                                    required
                                    value={sib.name}
                                    onChange={(e) =>
                                      updateSiblingPlayer(sib.id, {
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder={`Enter Sibling #${idx + 1}'s full name`}
                                    className="h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-base sm:text-sm font-semibold text-zinc-950 placeholder:font-normal placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
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
                                if (totalPax < minAttendingPax) {
                                  setTotalPax(
                                    isCoach ? 1 : Math.max(2, minAttendingPax)
                                  );
                                }
                              }}
                              className={cn(
                                "flex items-center justify-center whitespace-nowrap rounded-xl border py-2.5 px-3 text-xs font-extrabold transition cursor-pointer",
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
                                setCompanionList([]);
                                setCompanionInput("");
                              }}
                              className={cn(
                                "flex items-center justify-center whitespace-nowrap rounded-xl border py-2.5 px-3 text-xs font-extrabold transition cursor-pointer",
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
                                      ? `1 Coach + ${companionCount} Companion${companionCount === 1 ? "" : "s"}`
                                      : playerCount > 1
                                        ? `${playerCount} Players (incl. ${siblings.length} Sibling${siblings.length > 1 ? "s" : ""}) + ${companionCount} Family Companion${companionCount === 1 ? "" : "s"}`
                                        : `1 Player + ${companionCount} Family Companion${companionCount === 1 ? "" : "s"}`}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    aria-label="Decrease pax"
                                    onClick={() =>
                                      updateTotalPax(totalPax - 1)
                                    }
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-zinc-900 active:scale-95 cursor-pointer"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>

                                  <input
                                    type="number"
                                    min={minAttendingPax}
                                    max={30}
                                    aria-label="Total Pax"
                                    value={totalPax}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      updateTotalPax(
                                        Number.isFinite(val) &&
                                          val >= minAttendingPax
                                          ? val
                                          : minAttendingPax
                                      );
                                    }}
                                    className="h-10 w-16 rounded-xl border border-primary/50 bg-white text-center font-mono text-base font-extrabold text-primary focus:border-primary focus:outline-none"
                                  />

                                  <button
                                    type="button"
                                    aria-label="Increase pax"
                                    onClick={() =>
                                      updateTotalPax(totalPax + 1)
                                    }
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-zinc-900 active:scale-95 cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex gap-1.5 pt-1 border-t border-red-100">
                                {[1, 2, 3, 4, 5, 6].map((num) => {
                                  const disabled = num < minAttendingPax;
                                  return (
                                    <button
                                      key={num}
                                      type="button"
                                      disabled={disabled}
                                      onClick={() => updateTotalPax(num)}
                                      className={cn(
                                        "flex-1 whitespace-nowrap rounded-lg py-1 font-mono text-xs font-bold transition",
                                        disabled
                                          ? "bg-zinc-100 text-zinc-300 border border-zinc-200 cursor-not-allowed"
                                          : totalPax === num
                                            ? "bg-primary text-white shadow-2xs cursor-pointer"
                                            : "bg-white text-zinc-700 border border-red-100 cursor-pointer"
                                      )}
                                    >
                                      {num}
                                    </button>
                                  );
                                })}
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
                                    className="h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-base sm:text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none"
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
                                      className="h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-base sm:text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                )}
                              </div>

                              {attendanceStatus === "Attending" && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <label
                                      htmlFor="dialog-companions"
                                      className="truncate text-[11px] font-bold uppercase tracking-wider text-zinc-700"
                                    >
                                      Companion Names{" "}
                                      {companionCount > 0
                                        ? `(${companionList.length}/${companionCount} guest${companionCount > 1 ? "s" : ""})`
                                        : `(0 guests for ${playerCount} Pax)`}
                                    </label>
                                    <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-zinc-500">
                                      {companionCount === 0
                                        ? `Increase Pax above ${playerCount} to add companions`
                                        : isCompanionLimitReached
                                          ? `Max ${companionCount} companion${companionCount > 1 ? "s" : ""} reached`
                                          : "Type a comma (,) to add badge"}
                                    </span>
                                  </div>

                                  <div
                                    onClick={() => {
                                      if (!isCompanionLimitReached) {
                                        companionInputRef.current?.focus();
                                      }
                                    }}
                                    className={cn(
                                      "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
                                      companionCount === 0
                                        ? "bg-zinc-100/80 border-zinc-200 cursor-not-allowed"
                                        : isCompanionLimitReached
                                          ? "cursor-default"
                                          : "cursor-text"
                                    )}
                                  >
                                    {companionList.map((name, idx) => (
                                      <span
                                        key={`${name}-${idx}`}
                                        className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-primary shadow-2xs"
                                      >
                                        <span className="truncate">{name}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeCompanionBadge(idx);
                                          }}
                                          aria-label={`Remove ${name}`}
                                          className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-primary/70 transition hover:bg-red-200/70 hover:text-primary cursor-pointer"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    ))}

                                    {!isCompanionLimitReached ? (
                                      <input
                                        ref={companionInputRef}
                                        id="dialog-companions"
                                        type="text"
                                        value={companionInput}
                                        onChange={handleCompanionInputChange}
                                        onKeyDown={handleCompanionKeyDown}
                                        onBlur={handleCompanionBlur}
                                        placeholder={
                                          companionList.length === 0
                                            ? "Type name + comma (e.g. Santa Claus, Rudolf)..."
                                            : `Add ${companionCount - companionList.length} more companion${companionCount - companionList.length > 1 ? "s" : ""}...`
                                        }
                                        className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-base sm:text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
                                      />
                                    ) : companionCount === 0 ? (
                                      <span className="truncate whitespace-nowrap px-1 py-0.5 text-xs text-zinc-400">
                                        {playerCount} Pax = {playerCount > 1 ? "Players" : "Player"} only (increase Pax to add companions)
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ) : attendanceStatus === "Attending" ? (
                            <motion.div
                              key="coach-fields"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.16 }}
                              className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <label
                                    htmlFor="dialog-contact-coach"
                                    className="truncate text-[11px] font-bold uppercase tracking-wider text-zinc-800"
                                  >
                                    Coach Contact Number (Optional)
                                  </label>
                                  <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-emerald-800">
                                    Parent / Guardian omitted
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
                                  className="h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-base sm:text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-primary focus:outline-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <label
                                    htmlFor="dialog-companions"
                                    className="truncate text-[11px] font-bold uppercase tracking-wider text-zinc-800"
                                  >
                                    Companion Names{" "}
                                    {companionCount > 0
                                      ? `(${companionList.length}/${companionCount} guest${companionCount > 1 ? "s" : ""})`
                                      : "(0 guests for 1 Pax)"}
                                  </label>
                                  <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-emerald-900/70">
                                    {companionCount === 0
                                      ? "Increase Pax above 1 to add companions"
                                      : isCompanionLimitReached
                                        ? `Max ${companionCount} companion${companionCount > 1 ? "s" : ""} reached`
                                        : "Type a comma (,) to add badge"}
                                  </span>
                                </div>

                                <div
                                  onClick={() => {
                                    if (!isCompanionLimitReached) {
                                      companionInputRef.current?.focus();
                                    }
                                  }}
                                  className={cn(
                                    "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-600/20",
                                    companionCount === 0
                                      ? "bg-zinc-100/80 border-zinc-200 cursor-not-allowed"
                                      : isCompanionLimitReached
                                        ? "cursor-default"
                                        : "cursor-text"
                                  )}
                                >
                                  {companionList.map((name, idx) => (
                                    <span
                                      key={`${name}-${idx}`}
                                      className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900 shadow-2xs"
                                    >
                                      <span className="truncate">{name}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeCompanionBadge(idx);
                                        }}
                                        aria-label={`Remove ${name}`}
                                        className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-emerald-800/70 transition hover:bg-emerald-200/70 hover:text-emerald-950 cursor-pointer"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}

                                  {!isCompanionLimitReached ? (
                                    <input
                                      ref={companionInputRef}
                                      id="dialog-companions"
                                      type="text"
                                      value={companionInput}
                                      onChange={handleCompanionInputChange}
                                      onKeyDown={handleCompanionKeyDown}
                                      onBlur={handleCompanionBlur}
                                      placeholder={
                                        companionList.length === 0
                                          ? "Type name + comma (e.g. Santa Claus, Rudolf)..."
                                          : `Add ${companionCount - companionList.length} more companion${companionCount - companionList.length > 1 ? "s" : ""}...`
                                      }
                                      className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-base sm:text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
                                    />
                                  ) : companionCount === 0 ? (
                                    <span className="truncate whitespace-nowrap px-1 py-0.5 text-xs text-zinc-400">
                                      1 Pax = Coach only (increase Pax to add companions)
                                    </span>
                                  ) : null}
                                </div>
                              </div>
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
                          className="inline-flex h-12 w-full items-center justify-center whitespace-nowrap rounded-2xl bg-gradient-to-r from-[#D91B23] to-[#B01219] px-5 text-sm font-extrabold text-white shadow-md shadow-red-600/20 ring-1 ring-amber-300/40 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                        >
                          <span className="truncate">
                            {isSubmitting
                              ? "Saving Holiday RSVP..."
                              : attendanceStatus === "Attending"
                                ? `Confirm Christmas Attendance (${totalPax} Pax)`
                                : "Submit RSVP Response"}
                          </span>
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

      {/* CLEAN BOTTOM STICKY NAVIGATION BAR */}
      <nav
        aria-label="Bottom sticky navigation"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] backdrop-blur-md"
      >
        <div className="mx-auto grid h-17 max-w-lg grid-cols-3 items-center gap-2 px-3">
          {/* 1. Christmas Pass Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("pass")}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-xl py-1.5 transition cursor-pointer",
              activeTab === "pass" && !isRsvpDialogOpen
                ? "text-zinc-950 font-extrabold"
                : "text-zinc-500 font-semibold hover:text-zinc-900"
            )}
          >
            <TreePine
              className={cn(
                "h-5 w-5",
                activeTab === "pass" && !isRsvpDialogOpen
                  ? "text-zinc-900"
                  : "text-zinc-400"
              )}
            />
            <span className="text-[11px] whitespace-nowrap">Christmas Pass</span>
          </button>

          {/* 2. Center Primary Action: Open Animated Christmas RSVP Dialog */}
          <button
            type="button"
            onClick={() => openRsvpForGroup()}
            className="flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-gradient-to-r from-[#D91B23] to-[#B01219] px-3 text-xs font-extrabold text-white shadow-md shadow-red-600/25 ring-2 ring-red-500/15 transition hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <Gift className="h-4 w-4 shrink-0 text-white" />
            <span className="truncate">Confirm RSVP</span>
          </button>

          {/* 3. Confirmed Pax Roster Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-xl py-1.5 transition cursor-pointer",
              activeTab === "roster" && !isRsvpDialogOpen
                ? "text-zinc-950 font-extrabold"
                : "text-zinc-500 font-semibold hover:text-zinc-900"
            )}
          >
            <div className="relative">
              <Users className="h-5 w-5" />
              <span className="absolute -right-3.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center whitespace-nowrap rounded-full bg-zinc-800 px-1 font-mono text-[9px] font-bold text-white">
                {stats.totalPax}
              </span>
            </div>
            <span className="text-[11px] whitespace-nowrap">Confirmed Pax</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
