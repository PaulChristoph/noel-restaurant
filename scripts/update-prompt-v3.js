/**
 * System-Prompt Update: SMS-Bestätigung nur auf Anrufnummer, kein E-Mail-Vorschlag.
 * Anrufernummer wird immer automatisch ins Buchungssystem eingetragen.
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
   HINWEIS: book_appointment speichert die Anrufernummer automatisch im Buchungssystem, auch ohne SMS.
9. Buchungsbestaetigung vorlesen: Datum, Uhrzeit, Personen, Buchungsnummer

SMS-BESTAETIGUNG (nach Schritt 9):
10. Direkt fragen: Moechten Sie auf der Nummer, mit der Sie gerade anrufen, eine Bestaetigungs-SMS erhalten?

    WENN JA:
    - Falls detected_phone im Ergebnis von book_appointment vorhanden:
      send_confirmation aufrufen mit method=sms, contact=detected_phone, und den restlichen Buchungsdaten.
    - Falls KEIN detected_phone (z.B. Nummer unterdrueckt):
      Fragen: Auf welche Nummer soll ich die SMS schicken?
      Gast nennt Nummer. Nummer einzeln wiederholen: Also null, eins, sieben, sechs... Korrekt?
      Nach Bestaetigung: send_confirmation aufrufen.

    WENN NEIN:
    - Okay, kein Problem. Direkt weiter mit Schritt 11.

11. Fragen: Darf ich sonst noch etwas fuer Sie tun?
12. Wenn Nein oder Verabschiedung: Vielen Dank fuer Ihren Anruf, wir freuen uns auf Ihren Besuch. Auf Wiederschauen! Dann end_call aufrufen.

GESPRAECHSENDE:
- Nach JEDER abgeschlossenen Anfrage (Buchung, FAQ, Empfehlung) fragen: Darf ich sonst noch etwas fuer Sie tun?
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
    description: 'Bucht Tischreservierung. Speichert Anrufernummer automatisch. Gibt confirmation_id, detected_phone, guest_name, date_time, guests zurueck.',
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
    description: 'Sendet Buchungsbestaetigung per SMS an den Gast. Aufrufen wenn Gast eine SMS moechte.',
    type: 'custom',
    speak_during_execution: true,
    parameters: {
      type: 'object',
      properties: {
        method: { type: 'string', description: 'sms oder email' },
        contact: { type: 'string', description: 'Telefonnummer des Gastes' },
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
  console.log('✓ Prompt aktualisiert:', data.general_prompt?.length, 'Zeichen');
}

main().catch(err => { console.error('FEHLER:', err.message); process.exit(1); });
