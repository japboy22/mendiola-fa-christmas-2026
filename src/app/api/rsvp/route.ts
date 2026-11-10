import { NextRequest, NextResponse } from "next/server";
import {
  clearLocalOverlayRecords,
  configureAndSyncAppsScript,
  fetchAllRsvps,
  normalizeAttendanceStatus,
  normalizeRoleOrAgeGroup,
  saveRsvpRecord,
} from "@/lib/rsvp-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchAllRsvps();
    return NextResponse.json({
      ok: true,
      ...data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Failed to load RSVP records",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: string;
      appsScriptUrl?: string;
      roleOrAgeGroup?: string;
      playerName?: string;
      attendanceStatus?: string;
      totalPax?: number;
      parentName?: string;
      companionNames?: string;
      contactNumber?: string;
      potluckNotes?: string;
    };

    if (body.action === "clearLocal") {
      await clearLocalOverlayRecords();
      const updated = await fetchAllRsvps();
      return NextResponse.json({
        ok: true,
        message: "Cleared local RSVP records.",
        ...updated,
      });
    }

    if (body.action === "configureAppsScript") {
      const result = await configureAndSyncAppsScript(body.appsScriptUrl || "");
      const updated = await fetchAllRsvps();
      return NextResponse.json({
        ...result,
        ...updated,
      });
    }

    const roleOrAgeGroup = normalizeRoleOrAgeGroup(body.roleOrAgeGroup || "U9");
    const playerName = String(body.playerName || "").trim();
    const attendanceStatus = normalizeAttendanceStatus(
      body.attendanceStatus || "Attending"
    );
    const isCoach = roleOrAgeGroup === "Coach";

    if (!playerName) {
      return NextResponse.json(
        {
          ok: false,
          error: isCoach
            ? "Please enter the Coach's full name."
            : "Please enter the Player's full name.",
        },
        { status: 400 }
      );
    }

    if (!isCoach && !String(body.parentName || "").trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please enter the Parent / Guardian name.",
        },
        { status: 400 }
      );
    }

    const totalPax =
      attendanceStatus === "Attending"
        ? Math.max(1, Math.min(30, Number(body.totalPax) || 1))
        : 0;

    const saved = await saveRsvpRecord(
      {
        roleOrAgeGroup,
        playerName,
        attendanceStatus,
        totalPax,
        parentName: isCoach ? "" : body.parentName,
        companionNames: isCoach ? "" : body.companionNames,
        contactNumber: body.contactNumber,
        potluckNotes: isCoach ? "" : body.potluckNotes,
      },
      body.appsScriptUrl
    );

    const updated = await fetchAllRsvps();

    return NextResponse.json({
      ok: true,
      record: saved.record,
      syncedToSheet: saved.syncedToSheet,
      syncMethod: saved.syncMethod,
      ...updated,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to save your RSVP confirmation.",
      },
      { status: 500 }
    );
  }
}
