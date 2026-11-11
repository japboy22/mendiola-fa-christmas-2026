# Mendiola Football Academy - Bulacan | Christmas Party 2026 RSVP PWA

Official Progressive Web App for **Mendiola Football Academy - Bulacan** Christmas Party 2026 confirmation of attendance.

## Event Details
- **Date:** Saturday, December 5, 2026
- **Time:** 3:00 PM
- **Venue:** Valle Maria Mar, Sta. Cruz, Sta. Maria, Bulacan
- **Motif:** Red and White Motif (`#D91B23` & `#FFFFFF`)
- **Age Groups & Roles:** `U5`, `U7`, `U9`, `U13`, `U15`, and `Coach`
  - When **Coach** is selected, `Parent / Guardian Name` is automatically omitted.

## Google Sheet Database
- **Spreadsheet:** [Mendiola Christmas Party 2026](https://docs.google.com/spreadsheets/d/1VX3X-TbQQWLm9ntd0mfjD7nNKWwf-7RMH8Vs-y-SD1g/edit?usp=sharing)
- **Columns (`Sheet1`):** `Timestamp`, `Role / Age Group`, `Player / Coach Name`, `Attendance Status`, `Total Pax`, `Parent / Guardian Name`, `Companion Names`, `Contact Number`
- For 24/7 Vercel cloud write sync, paste [`scripts/google-apps-script.js`](./scripts/google-apps-script.js) into **Extensions → Apps Script** inside the Google Sheet, deploy as a Web App (`Execute as: Me`, `Who has access: Anyone`), and set `GOOGLE_APPS_SCRIPT_URL` in Vercel (or paste it directly inside the app's **Google Sheet DB** modal).
