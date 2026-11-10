"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  Cloud,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  X,
} from "lucide-react";
import { EVENT_DETAILS } from "@/types/rsvp";

const APPS_SCRIPT_SNIPPET = `const SPREADSHEET_ID = "1VX3X-TbQQWLm9ntd0mfjD7nNKWwf-7RMH8Vs-y-SD1g";
const SHEET_NAME = "Sheet1";

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTargetSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

function doGet() {
  const sheet = getTargetSheet();
  return jsonResponse({ ok: true, rows: sheet.getDataRange().getDisplayValues() });
}

function doPost(e) {
  const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  const sheet = getTargetSheet();
  if (body.action === "upsertRsvp" && Array.isArray(body.row)) {
    const role = String(body.row[1] || "").trim().toLowerCase();
    const name = String(body.row[2] || "").trim().toLowerCase();
    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1] || "").trim().toLowerCase() === role &&
          String(data[i][2] || "").trim().toLowerCase() === name && name) {
        sheet.getRange(i + 1, 1, 1, 9).setValues([body.row.slice(0, 9)]);
        return jsonResponse({ ok: true, mode: "updated" });
      }
    }
    sheet.appendRow(body.row.slice(0, 9));
    return jsonResponse({ ok: true, mode: "appended" });
  }
  if (body.action === "batchUpsert" && Array.isArray(body.rows)) {
    body.rows.forEach(function(r) { sheet.appendRow(r.slice(0, 9)); });
    return jsonResponse({ ok: true });
  }
  return jsonResponse({ ok: false });
}`;

interface SheetSyncModalProps {
  syncMode: "apps-script" | "service-account" | "csv-live";
  hasAppsScriptUrl: boolean;
  unsyncedCount: number;
  onAppsScriptSaved: (url: string) => Promise<void>;
}

export function SheetSyncModal({
  syncMode,
  hasAppsScriptUrl,
  unsyncedCount,
  onAppsScriptSaved,
}: SheetSyncModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("mfc_xmas_apps_script_url") || "";
      if (saved) setUrlInput(saved);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      try {
        localStorage.setItem("mfc_xmas_apps_script_url", urlInput.trim());
      } catch {
        // Ignore
      }
      await onAppsScriptSaved(urlInput.trim());
      setFeedback(
        urlInput.trim()
          ? "Web App URL connected! All RSVPs now write directly to your Google Sheet."
          : "Cleared custom Web App URL."
      );
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Could not save Web App URL."
      );
    } finally {
      setSaving(false);
    }
  };

  const isCloudWriteReady =
    syncMode === "apps-script" ||
    syncMode === "service-account" ||
    hasAppsScriptUrl;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 shadow-2xs transition hover:border-primary/50 hover:bg-red-50/40 sm:px-3 sm:py-2 cursor-pointer"
        >
          <Cloud
            className={
              isCloudWriteReady
                ? "h-3.5 w-3.5 text-emerald-600"
                : "h-3.5 w-3.5 text-primary"
            }
          />
          <span className="hidden sm:inline">Google Sheet DB</span>
          <span className="sm:hidden">Sheet DB</span>
          {unsyncedCount > 0 && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-white">
              {unsyncedCount}
            </span>
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="mfc-dialog-overlay fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs" />
        <Dialog.Content className="mfc-dialog-content fixed left-1/2 top-1/2 z-50 max-h-[88dvh] w-[calc(100vw-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-red-200 bg-white p-5 sm:p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-extrabold text-zinc-950">
                Google Sheet RSVP Database
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-zinc-600">
                Target Sheet:{" "}
                <strong className="text-zinc-900">
                  Mendiola Christmas Party 2026
                </strong>{" "}
                (<code className="font-mono text-[11px]">Sheet1</code>)
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4 text-xs text-zinc-700 leading-relaxed">
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-zinc-950">
                  Database Columns (Sheet1!A1:I1)
                </p>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                  LIVE READ CONNECTED
                </span>
              </div>
              <p className="mt-1 text-zinc-600">
                <code className="font-mono text-[11px] text-zinc-800">
                  Timestamp · Role / Age Group · Player / Coach Name · Attendance
                  Status · Total Pax · Parent / Guardian Name · Companion Names ·
                  Contact Number · Potluck / Notes
                </code>
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-zinc-950">
                  Enable 24/7 Vercel Cloud Write Sync (30 Seconds)
                </p>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-zinc-800 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied Code.gs!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Apps Script</span>
                    </>
                  )}
                </button>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-zinc-600">
                <li>
                  Open the Google Sheet below and click{" "}
                  <strong className="text-zinc-900">
                    Extensions &rarr; Apps Script
                  </strong>
                  .
                </li>
                <li>
                  Click <strong>Copy Apps Script</strong> above, paste it into{" "}
                  <code className="font-mono text-zinc-900">Code.gs</code>, and
                  save.
                </li>
                <li>
                  Click{" "}
                  <strong className="text-zinc-900">
                    Deploy &rarr; New deployment &rarr; Web app
                  </strong>{" "}
                  (Execute as: <em>Me</em>, Who has access: <em>Anyone</em>).
                </li>
                <li>
                  Paste the deployed{" "}
                  <code className="font-mono text-zinc-900">
                    https://script.google.com/macros/s/.../exec
                  </code>{" "}
                  URL below (or in Vercel as{" "}
                  <code className="font-mono text-zinc-900">
                    GOOGLE_APPS_SCRIPT_URL
                  </code>
                  ).
                </li>
              </ol>

              <form onSubmit={handleSaveUrl} className="pt-1 space-y-2">
                <label
                  htmlFor="apps-script-url-input"
                  className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700"
                >
                  Google Apps Script Web App URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="apps-script-url-input"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="h-10 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`}
                    />
                    <span>
                      {saving ? "Connecting..." : "Connect & Sync Sheet"}
                    </span>
                  </button>
                </div>
                {feedback && (
                  <p className="text-xs font-medium text-emerald-700">
                    {feedback}
                  </p>
                )}
              </form>
            </div>

            <a
              href={EVENT_DETAILS.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-xs font-bold text-white transition hover:bg-zinc-800"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Open Mendiola Christmas Party 2026 Google Sheet</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
