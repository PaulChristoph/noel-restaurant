function getCurrentDatetime() {
  const now = new Date();

  const date = now.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/Berlin'
  });

  const time = now.toLocaleTimeString('de-DE', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Berlin'
  });

  const isoDate = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }); // YYYY-MM-DD
  const isoTime = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

  return {
    date_formatted: date,
    time_formatted: `${time} Uhr`,
    date_iso: isoDate,
    time_iso: isoTime,
    message: `Heute ist ${date}, es ist ${time} Uhr.`,
  };
}

module.exports = getCurrentDatetime;
