/**
 * Google Apps Script — appends each cohort application to this Google Sheet.
 *
 * Paste this whole file into Extensions → Apps Script of the leads Sheet,
 * set SECRET below to the same value as LEADS_SHEET_WEBHOOK_SECRET in Vercel,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access:
 * Anyone). Put the web-app URL in LEADS_SHEET_WEBHOOK_URL.
 * Full steps: docs/integrations/cohort-applications-setup.md
 *
 * "Anyone" only means anyone can CALL the URL; without the secret the script
 * refuses to write. Nobody can READ the Sheet unless you share it.
 */

const SECRET = 'PASTE-THE-SAME-SECRET-AS-IN-VERCEL';
const SHEET_NAME = 'Applications';

// Column order. Matches sheetRow() in lib/cohort-application-delivery.ts.
const COLUMNS = [
  ['submitted_at_ist', 'Submitted (IST)'],
  ['name', 'Name'],
  ['email', 'Email'],
  ['phone', 'Phone / WhatsApp'],
  ['country', 'Country'],
  ['current_role', 'Current role'],
  ['experience', 'Experience'],
  ['primary_goal', 'Main goal'],
  ['consents', 'Consent ticked'],
  ['consent_version', 'Consent version'],
  ['source_url', 'Source page'],
  ['utm', 'UTM'],
  ['reference_id', 'Reference ID'],
];

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.secret !== SECRET) return json_({ ok: false, error: 'unauthorised' });

    const sheet = sheet_();
    const row = body.row || {};
    // Skip if this reference ID is already in the sheet (retries are safe).
    const ids = sheet.getRange(2, COLUMNS.length, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
    if (row.reference_id && ids.indexOf(row.reference_id) !== -1) return json_({ ok: true, duplicate: true });

    sheet.appendRow(COLUMNS.map(function (c) { return asText_(row[c[0]]); }));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Run once from the editor (▶ setup) to create the tab and header row. */
function setup() {
  sheet_();
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(function (c) { return c[1]; }));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  }
  return sheet;
}

/**
 * Keep every value as plain text: "+91 98765…" would otherwise be read as a
 * formula, and a name typed as "=HYPERLINK(…)" must never run as one.
 */
function asText_(v) {
  const s = v == null ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
