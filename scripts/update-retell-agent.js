/**
 * Retell AI Agent + LLM umbenennen:
 * "NOEL Restaurant Fleestedt" → "Restaurant Mustermann"
 */

const RETELL_API_KEY = 'key_0fbe97fd9fcb37681ec300f1a667';
const AGENT_ID = 'agent_24cdda0cef15ba1efe2b4f832a';
const LLM_ID = 'llm_a00460fc46096e0081f94238e12b';
const BASE_URL = 'https://api.retellai.com';

async function retellFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return JSON.parse(text);
}

function replaceNoelReferences(text) {
  if (!text) return text;
  return text
    .replace(/NOEL Restaurant Fleestedt/gi, 'Restaurant Mustermann')
    .replace(/Restaurant NOEL/gi, 'Restaurant Mustermann')
    .replace(/NOEL Fleestedt/gi, 'Restaurant Mustermann')
    .replace(/Restaurant Noel/gi, 'Restaurant Mustermann')
    .replace(/\bNOEL\b/g, 'Restaurant Mustermann')
    .replace(/Fleestedt/gi, 'Hamburg, Barmbek')
    .replace(/noel-restaurant\.de/gi, 'restaurant-mustermann.de')
    .replace(/info@noel/gi, 'info@restaurant-mustermann')
    .replace(/MSTR-/g, 'MSTR-'); // already correct, keep
}

async function main() {
  console.log('=== Retell Agent Update ===\n');

  // 1. Agent umbenennen
  console.log('1. Agent umbenennen...');
  const agentUpdate = await retellFetch(`/update-agent/${AGENT_ID}`, 'PATCH', {
    agent_name: 'Sofia - Restaurant Mustermann',
  });
  console.log(`   ✓ Agent: "${agentUpdate.agent_name}"\n`);

  // 2. LLM abrufen
  console.log('2. LLM System-Prompt abrufen...');
  const llm = await retellFetch(`/get-retell-llm/${LLM_ID}`);
  const oldPrompt = llm.general_prompt || '';
  console.log(`   Prompt-Länge: ${oldPrompt.length} Zeichen`);

  // NOEL-Referenzen zählen
  const noelMatches = (oldPrompt.match(/NOEL|Fleestedt/gi) || []).length;
  console.log(`   NOEL/Fleestedt-Referenzen gefunden: ${noelMatches}`);

  // 3. System-Prompt bereinigen
  const newPrompt = replaceNoelReferences(oldPrompt);
  const newBeginMessage = replaceNoelReferences(llm.begin_message || '');

  // Vorschau
  if (noelMatches > 0) {
    console.log('\n   Vorher (erste 200 Zeichen):');
    console.log('  ', oldPrompt.substring(0, 200));
    console.log('\n   Nachher (erste 200 Zeichen):');
    console.log('  ', newPrompt.substring(0, 200));
  }

  // 4. LLM aktualisieren
  console.log('\n3. LLM aktualisieren...');
  const updateBody = {};
  if (newPrompt !== oldPrompt) updateBody.general_prompt = newPrompt;
  if (newBeginMessage !== (llm.begin_message || '')) updateBody.begin_message = newBeginMessage;

  // General tools / begin_message
  if (Object.keys(updateBody).length === 0) {
    console.log('   ✓ LLM-Prompt hatte keine NOEL-Referenzen (bereits sauber)');
  } else {
    const llmUpdate = await retellFetch(`/update-retell-llm/${LLM_ID}`, 'PATCH', updateBody);
    console.log(`   ✓ LLM aktualisiert`);
    if (llmUpdate.begin_message) {
      console.log(`   Begin-Message: "${llmUpdate.begin_message.substring(0, 100)}..."`);
    }
  }

  console.log('\n=== FERTIG ===');
  console.log('Agent-Name:   Sofia - Restaurant Mustermann');
  console.log('Agent-ID:    ', AGENT_ID);
  console.log('LLM-ID:      ', LLM_ID);
  console.log('\nTestanruf möglich!');
}

main().catch(err => {
  console.error('FEHLER:', err.message);
  process.exit(1);
});
