/**
 * Mendiola Football Academy - Bulacan | Christmas Party 2026 RSVP Bridge
 * Target Google Sheet: https://docs.google.com/spreadsheets/d/1VX3X-TbQQWLm9ntd0mfjD7nNKWwf-7RMH8Vs-y-SD1g/edit
 *
 * HOW TO ENABLE 24/7 VERCEL CLOUD WRITE SYNC IN 60 SECONDS:
 * 1. Open your Google Sheet:
 *    https://docs.google.com/spreadsheets/d/1VX3X-TbQQWLm9ntd0mfjD7nNKWwf-7RMH8Vs-y-SD1g/edit
 * 2. Click Extensions -> Apps Script
 * 3. Paste this entire file into Code.gs and click Save
 * 4. Click Deploy -> New deployment -> Select type: "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 5. Copy the Web App URL and either:
 *    - Paste it into the "Google Sheet DB" modal inside the web app, OR
 *    - Add it as GOOGLE_APPS_SCRIPT_URL in your Vercel Environment Variables.
 */

const SPREADSHEET_ID = "1VX3X-TbQQWLm9ntd0mfjD7nNKWwf-7RMH8Vs-y-SD1g";
const SHEET_NAME = "Sheet1";
const HEADERS = [
  "Timestamp",
  "Role / Age Group",
  "Player / Coach Name",
  "Attendance Status",
  "Total Pax",
  "Parent / Guardian Name",
  "Companion Names",
  "Contact Number",
  "Potluck / Notes",
];

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getTargetSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function doGet() {
  const sheet = getTargetSheet();
  const rows = sheet.getDataRange().getDisplayValues();
  return jsonResponse({
    ok: true,
    rows: rows,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const sheet = getTargetSheet();

    if (body.action === "upsertRsvp" && Array.isArray(body.row)) {
      const incomingRole = String(body.row[1] || "").trim().toLowerCase();
      const incomingName = String(body.row[2] || "").trim().toLowerCase();
      const data = sheet.getDataRange().getDisplayValues();

      // If the same Role/Age Group + Player/Coach Name already exists, update that row in place
      for (let i = 1; i < data.length; i++) {
        const existingRole = String(data[i][1] || "").trim().toLowerCase();
        const existingName = String(data[i][2] || "").trim().toLowerCase();
        if (existingRole === incomingRole && existingName === incomingName && incomingName) {
          sheet.getRange(i + 1, 1, 1, 9).setValues([body.row.slice(0, 9)]);
          return jsonResponse({ ok: true, mode: "updated", rowNumber: i + 1 });
        }
      }

      sheet.appendRow(body.row.slice(0, 9));
      return jsonResponse({ ok: true, mode: "appended", rowNumber: sheet.getLastRow() });
    }

    if (body.action === "batchUpsert" && Array.isArray(body.rows)) {
      const data = sheet.getDataRange().getDisplayValues();
      let appended = 0;
      let updated = 0;

      body.rows.forEach(function (row) {
        if (!Array.isArray(row)) return;
        const incomingRole = String(row[1] || "").trim().toLowerCase();
        const incomingName = String(row[2] || "").trim().toLowerCase();
        let matchedRowIndex = -1;

        for (let i = 1; i < data.length; i++) {
          const existingRole = String(data[i][1] || "").trim().toLowerCase();
          const existingName = String(data[i][2] || "").trim().toLowerCase();
          if (existingRole === incomingRole && existingName === incomingName && incomingName) {
            matchedRowIndex = i + 1;
            break;
          }
        }

        if (matchedRowIndex > 1) {
          sheet.getRange(matchedRowIndex, 1, 1, 9).setValues([row.slice(0, 9)]);
          updated++;
        } else {
          sheet.appendRow(row.slice(0, 9));
          data.push(row.slice(0, 9));
          appended++;
        }
      });

      return jsonResponse({ ok: true, appended: appended, updated: updated });
    }

    return jsonResponse({ ok: false, error: "Invalid action or row payload" });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}
