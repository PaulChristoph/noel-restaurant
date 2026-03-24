/**
 * Google Sheets — DEAKTIVIERT.
 * Airtable ist die einzige Datenbank. Diese Datei ist ein no-op Stub
 * damit alte Imports keinen Fehler werfen.
 */

async function appendReservation() {
  console.log('[Sheets] DEAKTIVIERT — Airtable wird genutzt');
}

async function cancelReservationInSheets() {
  // no-op
}

async function findReservationsInSheets() {
  return [];
}

module.exports = { appendReservation, cancelReservationInSheets, findReservationsInSheets };
