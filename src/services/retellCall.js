/**
 * Ruft Anrufer-Infos über die Retell API ab.
 */
async function getCallerPhone(callId) {
  if (!callId || !process.env.RETELL_API_KEY) return null;

  try {
    const response = await fetch(`https://api.retellai.com/get-call/${callId}`, {
      headers: { Authorization: `Bearer ${process.env.RETELL_API_KEY}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.from_number || null;
  } catch (err) {
    console.error('[RetellCall] Fehler beim Abrufen der Anrufernummer:', err.message);
    return null;
  }
}

module.exports = { getCallerPhone };
