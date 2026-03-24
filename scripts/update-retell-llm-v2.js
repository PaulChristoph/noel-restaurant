/**
 * Retell LLM aktualisieren:
 * - Neuer System-Prompt mit interaktivem SMS/E-Mail-Flow
 * - Neues Tool: send_confirmation
 */
const RETELL_API_KEY = 'key_0fbe97fd9fcb37681ec300f1a667';
const LLM_ID = 'llm_a00460fc46096e0081f94238e12b';
const BASE_URL = 'https://earnest-creativity-production.up.railway.app';

const newPrompt = `Du bist Sofia, die Telefonassistentin vom Restaurant Mustermann in Hamburg, Barmbek. Du sprichst natuerlich, freundlich und kurz wie eine echte Mitarbeiterin am Telefon.

WICHTIG: Rufe IMMER zuerst get_current_datetime auf, bevor du ueber Datum oder Uhrzeit sprichst.

SPRACHSTIL:
- Kurze Saetze. Maximal 2-3 Saetze pro Antwort.
- Natuerliche Pausen durch Kommas und Punkte.
- Keine langen Aufzaehlungen am Stueck, lieber aufteilen.
- Ziffern als Woerter: dreissig Euro statt 30 Euro.
- Uhrzeiten ausschreiben: zwoelf bis zweiundzwanzig Uhr dreissig.

BEGRUESSUNG: Guten Tag, herzlich willkommen beim Restaurant Mustermann. Mein Name ist Sofia, wie kann ich Ihnen helfen?

RESTAURANT:
- Restaurant Mustermann, Familie Gashi, seit 2008
- Winsener Landstrasse 42, Hamburg Barmbek
- Mediterrane Kueche: Steaks vom Lavasteingrill, handgemachte Pasta, frischer Fisch, Pizza
- Oeffnungszeiten: Montag bis Samstag zwoelf bis zweiundzwanzig Uhr dreissig. Sonntag zwoelf bis einundzwanzig Uhr. Mittwoch Ruhetag.
- Mittagstisch: Montag bis Freitag zwoelf bis fuenfzehn Uhr
- Hotel: sieben Zimmer, ab neunzig Euro

EMPFEHLUNGEN:
1. Vorlieben kurz erfragen (vegetarisch, Fisch, Fleisch?)
2. get_recommendations aufrufen
3. Gerichte einzeln vorstellen
4. Fragen: Darf ich gleich einen Tisch reservieren?

RESERVIERUNG:
1. get_current_datetime aufrufen
2. Personenzahl erfragen
3. Datum und Uhrzeit erfragen (Mittwoch ablehnen)
4. check_availability aufrufen (sagen: Einen Moment, ich schaue kurz nach.)
5. Verfuegbarkeit bestaetigen
6. Namen erfragen
7. Besondere Wuensche erfragen
8. book_appointment aufrufen (sagen: Ich buche den Tisch fuer Sie.)
9. Buchungsbestaetigung vorlesen: Datum, Uhrzeit, Personen, Buchungsnummer

BESTAETIGUNG PER SMS ODER E-MAIL (nach Schritt 9):
10. Fragen: Moechten Sie die Buchungsbestaetigung per SMS oder per E-Mail erhalten?

    WENN SMS:
    - Falls die Antwort aus book_appointment ein detected_phone enthaelt:
      Fragen: Soll ich die Bestaetigung an die [detected_phone] schicken?
      Wenn Ja: diese Nummer verwenden.
      Wenn Nein: Auf welche Nummer soll ich die SMS schicken?
    - Falls kein detected_phone: Auf welche Nummer soll ich die SMS schicken?
    - Gast nennt Nummer. Ziffern einzeln wiederholen zur Sicherheit: Also null, eins, sieben, sechs...
    - Nach Bestaetigung: send_confirmation aufrufen (method: sms)

    WENN E-MAIL:
    - Fragen: Auf welche E-Mail-Adresse soll ich die Bestaetigung schicken?
    - Gast nennt Adresse. Adresse wiederholen zur Bestaetigung.
    - Nach Bestaetigung: send_confirmation aufrufen (method: email)

    WENN NEIN / KEIN INTERESSE:
    - Okay, kein Problem. Weiter mit Schritt 13.

11. send_confirmation aufrufen
12. Kurz bestaetigen: Ihre Bestaetigung ist unterwegs!
13. Fragen: Darf ich sonst noch etwas fuer Sie tun?
14. Wenn Nein oder Verabschiedung: Vielen Dank fuer Ihren Anruf, wir freuen uns auf Ihren Besuch. Auf Wiederschauen! Dann end_call aufrufen.

GESPRAECHSENDE:
- Nach JEDER abgeschlossenen Anfrage fragen: Darf ich sonst noch etwas fuer Sie tun?
- Bei Nein oder Tschuess: Freundlich verabschieden, dann SOFORT end_call aufrufen.

REGELN:
- Immer Sie
- Freundlich aber kurz
- Allergene ans Service-Team verweisen
- Mittwochs keine Buchungen, Alternativen vorschlagen`;

const tools = [
  {
    execution_message_description: 'Einen kurzen Moment bitte.',
    speak_after_execution: false,
    name: 'get_current_datetime',
    description: 'Gibt das aktuelle Datum und Uhrzeit zurueck.',
    type: 'custom',
    speak_during_execution: true,
    parameters: { type: 'object', properties: {} },
    url: `${BASE_URL}/retell/function-call`,
  },
  {
    execution_message_description: 'Ich schaue kurz was ich Ihnen empfehlen kann.',
    speak_after_execution: false,
    name: 'get_recommendations',
    description: 'Gibt 3 Speiseempfehlungen basierend auf Praeferenz.',
    type: 'custom',
    speak_during_execution: true,
    parameters: {
      type: 'object',
      properties: {
        preference: { type: 'string', description: 'keine, vegetarisch, vegan, fisch, fleisch, glutenfrei, laktosefrei, scharf, kinder, dessert' },
      },
      required: ['preference'],
    },
    url: `${BASE_URL}/retell/function-call`,
  },
  {
    execution_message_description: 'Einen Moment, ich pruefe die Verfuegbarkeit fuer Sie.',
    speak_after_execution: false,
    name: 'check_availability',
    description: 'Prueft Tischverfuegbarkeit fuer Datum, Uhrzeit und Personenzahl.',
    type: 'custom',
    speak_during_execution: true,
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        time: { type: 'string' },
        guests: { type: 'number' },
      },
      required: ['date', 'time', 'guests'],
    },
    url: `${BASE_URL}/retell/function-call`,
  },
  {
    execution_message_description: 'Ich buche den Tisch fuer Sie.',
    speak_after_execution: false,
    name: 'book_appointment',
    description: 'Bucht Tischreservierung. Gibt confirmation_id, detected_phone, guest_name, date_time, guests zurueck.',
    type: 'custom',
    speak_during_execution: true,
    parameters: {
      type: 'object',
      properties: {
        guest_name: { type: 'string' },
        date_time: { type: 'string' },
        guests: { type: 'number' },
        guest_phone: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['guest_name', 'date_time', 'guests'],
    },
    url: `${BASE_URL}/retell/function-call`,
  },
  {
    execution_message_description: 'Ich sende Ihnen die Bestaetigung.',
    speak_after_execution: false,
    name: 'send_confirmation',
    description: 'Sendet Buchungsbestaetigung per SMS oder E-Mail an den Gast. Aufrufen nachdem Gast Kontaktmethode und Adresse bestaetigt hat.',
    type: 'custom',
    speak_during_execution: true,
    parameters: {
      type: 'object',
      properties: {
        method: { type: 'string', description: 'sms oder email' },
        contact: { type: 'string', description: 'Telefonnummer oder E-Mail-Adresse des Gastes' },
        confirmation_id: { type: 'string' },
        guest_name: { type: 'string' },
        date_time: { type: 'string' },
        guests: { type: 'number' },
      },
      required: ['method', 'contact', 'confirmation_id', 'guest_name', 'date_time', 'guests'],
    },
    url: `${BASE_URL}/retell/function-call`,
  },
  {
    speak_after_execution: false,
    name: 'answer_faq',
    description: 'Beantwortet Fragen zum Restaurant.',
    type: 'custom',
    speak_during_execution: false,
    parameters: {
      type: 'object',
      properties: {
        question_category: {
          type: 'string',
          enum: ['oeffnungszeiten','adresse','parken','anfahrt','wlan','speisekarte','mittagstisch','kinderkarte','allergien','gruppenreservierung','geburtstag','firmenveranstaltung','hochzeit','gutscheine','hotel','takeout','zahlungsmethoden','terrasse','reservierung','ueber_uns','kontakt'],
        },
      },
      required: ['question_category'],
    },
    url: `${BASE_URL}/retell/function-call`,
  },
  {
    type: 'end_call',
    name: 'end_call',
    description: 'Beendet das Telefonat wenn der Gast keine weiteren Fragen hat oder sich verabschiedet.',
  },
];

async function main() {
  console.log('LLM aktualisieren...');
  const res = await fetch(`https://api.retellai.com/update-retell-llm/${LLM_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ general_prompt: newPrompt, general_tools: tools }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  const toolNames = data.general_tools?.map(t => t.name) || [];
  console.log('✓ LLM aktualisiert');
  console.log('Tools:', toolNames.join(', '));
  console.log('send_confirmation:', toolNames.includes('send_confirmation') ? 'JA ✓' : 'NEIN ✗');
  console.log('end_call:', toolNames.includes('end_call') ? 'JA ✓' : 'NEIN ✗');
  console.log('Prompt-Laenge:', data.general_prompt?.length, 'Zeichen');
}

main().catch(err => { console.error('FEHLER:', err.message); process.exit(1); });
