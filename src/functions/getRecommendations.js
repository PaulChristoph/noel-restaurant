/**
 * Gibt 3 Empfehlungen basierend auf Ernährungspräferenzen / Allergien.
 */

const RECOMMENDATIONS = {

  keine_einschraenkung: {
    label: 'Unsere Hausempfehlungen',
    dishes: [
      { name: 'Rumpsteak alla griglia (250g)', price: '31,50 €', desc: 'Zart gegrilltes argentinisches Rumpsteak vom Lavasteingrill — unser absoluter Klassiker.' },
      { name: 'Zanderfilet vom Grill', price: '24,90 €', desc: 'Frisches Zanderfilet mit feiner Trüffel-Cremesauce — unser beliebtestes Fischgericht.' },
      { name: 'Spaghetti Vegetariano', price: '16,90 €', desc: 'Handgemachte Spaghetti mit Champignons, getrockneten Tomaten und Rucola in Butter-Parmesan-Sauce.' },
    ],
  },

  vegetarisch: {
    label: 'Vegetarische Empfehlungen',
    dishes: [
      { name: 'Spaghetti Vegetariano', price: '16,90 €', desc: 'Handgemachte Spaghetti mit gebratenen Champignons, getrockneten Tomaten und Rucola in Butter-Parmesan-Sauce.' },
      { name: 'Steinpilzgnocchi', price: '18,90 €', desc: 'Zarte Kartoffelgnocchi in feiner Trüffel-Parmesan-Cremesauce — ein echtes Highlight.' },
      { name: 'Pasta all\'Arrabbiata mit Burrata', price: '16,90 €', desc: 'Leicht pikante San-Marzano-Tomatensauce mit cremiger Bio-Burrata.' },
    ],
  },

  vegan: {
    label: 'Vegane Hinweise',
    dishes: [
      { name: 'Insalata Mista der Saison', price: '9,90 €', desc: 'Frischer gemischter Salat mit Cherrytomaten und roten Zwiebeln. Bitte beim Personal nach dem Dressing fragen.' },
      { name: 'Tomatensalat mit Avocado', price: '9,90 €', desc: 'Frischer Tomatensalat mit Avocado und roten Zwiebeln — unkompliziert und leicht.' },
      { name: 'Pizza Verdura', price: '14,90 €', desc: 'Pizza mit gegrilltem mediterranem Gemüse. Bitte beim Bestellen nach veganer Zubereitung fragen.' },
    ],
    hinweis: 'Für vegane Gerichte empfehlen wir, beim Service nachzufragen — unser Team hilft Ihnen gerne, die passenden Optionen zu finden.',
  },

  fisch: {
    label: 'Fisch & Meeresfrüchte',
    dishes: [
      { name: 'Zanderfilet vom Grill', price: '24,90 €', desc: 'Frisches Zanderfilet mit feiner Trüffel-Cremesauce — unser beliebtestes Fischgericht.' },
      { name: 'Filetto di Salmone', price: '26,90 €', desc: 'Zartes Lachsfilet vom Grill in feiner Hummercremesauce.' },
      { name: 'Gambas alla Griglia', price: '26,90 €', desc: 'Gegrillte Garnelen mit mediterranen Kräutern, Knoblauch und Chili.' },
    ],
  },

  fleisch: {
    label: 'Fleisch-Empfehlungen',
    dishes: [
      { name: 'Rumpsteak alla griglia (250g)', price: '31,50 €', desc: 'Argentinisches Rumpsteak zart gegrillt vom Lavasteingrill — unser Klassiker.' },
      { name: 'Rinderfilet alla griglia (200g)', price: '36,90 €', desc: 'Zartes Rinderfilet mit aromatischer Trüffel-Cremesauce — für besondere Anlässe.' },
      { name: 'Grillteller — Der Klassiker', price: '24,50 €', desc: 'Schweinefilet, Putenbrustfilet und hausgemachtes Hacksteak vom Grill.' },
    ],
  },

  glutenfrei: {
    label: 'Glutenfreie Hinweise',
    dishes: [
      { name: 'Steaks vom Lavasteingrill', price: 'ab 31,50 €', desc: 'Unsere Steaks und gegrillten Fleischgerichte sind in der Regel glutenfrei.' },
      { name: 'Gegrillte Fischgerichte', price: 'ab 23,90 €', desc: 'Zanderfilet, Lachs oder Gambas vom Grill sind in der Regel glutenfrei.' },
      { name: 'Insalata Mista', price: 'ab 9,90 €', desc: 'Gemischter Salat — bitte nach dem Dressing fragen.' },
    ],
    hinweis: 'Für genaue Informationen zu Gluten bitte unbedingt beim Service nachfragen — wir helfen Ihnen gerne.',
  },

  laktosefrei: {
    label: 'Laktosefreie Hinweise',
    dishes: [
      { name: 'Steaks & Grillgerichte', price: 'ab 24,50 €', desc: 'Unsere Grill-Klassiker enthalten in der Grundzubereitung meist keine Laktose — Saucen auf Anfrage.' },
      { name: 'Fischgerichte vom Grill', price: 'ab 23,90 €', desc: 'Gegrillter Fisch ohne Sauce ist in der Regel laktosefrei.' },
      { name: 'Salate', price: 'ab 9,90 €', desc: 'Frische Salate — bitte beim Dressing nachfragen.' },
    ],
    hinweis: 'Für laktosefreie Zubereitung sprechen Sie bitte direkt mit unserem Team.',
  },

  scharf: {
    label: 'Für Schärfe-Liebhaber',
    dishes: [
      { name: 'Pizza Diavola', price: '15,90 €', desc: 'Scharfe italienische Salami mit Peperoncino — für alle die es feurig mögen.' },
      { name: 'Pasta all\'Arrabbiata', price: '16,90 €', desc: 'Leicht pikante San-Marzano-Tomatensauce — klassisch italienisch scharf.' },
      { name: 'Gambas alla Griglia', price: '26,90 €', desc: 'Gegrillte Garnelen mit Knoblauch und Chili — mediterran und würzig.' },
    ],
  },

  kinder: {
    label: 'Empfehlungen für Kinder',
    dishes: [
      { name: 'Chicken Nuggets mit Pommes (Max und Moritz)', price: '11,90 €', desc: 'Knusprige Chicken Nuggets mit Pommes frites.' },
      { name: 'Putenschnitzel (Harry Potter)', price: '11,90 €', desc: 'Zartes Putenschnitzel gegrillt oder paniert mit Pommes.' },
      { name: 'Pizza in Kindergröße (Super Mario)', price: '10,90 €', desc: 'Margherita, Salami oder Schinken-Champignons.' },
    ],
  },

  dessert: {
    label: 'Dessert-Empfehlungen',
    dishes: [
      { name: 'Schokoladen-Soufflé mit Vanilleeis', price: '11,90 €', desc: 'Warmes Schokoladensoufflé — ca. 15 Minuten Wartezeit, jeden Cent wert.' },
      { name: 'Crème Brûlée mit Vanilleeis', price: '9,90 €', desc: 'Klassisch und unwiderstehlich.' },
      { name: 'NOEL Dessertvariation (ab 2 Personen)', price: '25,90 €', desc: 'Gemischte Nachspeisenplatte nach Art des Hauses — ideal zum Teilen.' },
    ],
  },
};

function getRecommendations({ preference }) {
  const key = (preference || 'keine_einschraenkung').toLowerCase();

  // Mapping für flexible Eingaben
  const mapping = {
    'keine': 'keine_einschraenkung',
    'alles': 'keine_einschraenkung',
    'egal': 'keine_einschraenkung',
    'vegetarisch': 'vegetarisch',
    'vegetarian': 'vegetarisch',
    'vegan': 'vegan',
    'fisch': 'fisch',
    'fish': 'fisch',
    'meeresfrüchte': 'fisch',
    'fleisch': 'fleisch',
    'steak': 'fleisch',
    'meat': 'fleisch',
    'glutenfrei': 'glutenfrei',
    'gluten': 'glutenfrei',
    'laktosefrei': 'laktosefrei',
    'laktose': 'laktosefrei',
    'scharf': 'scharf',
    'kinder': 'kinder',
    'kind': 'kinder',
    'dessert': 'dessert',
    'nachtisch': 'dessert',
  };

  const resolvedKey = mapping[key] || key;
  const rec = RECOMMENDATIONS[resolvedKey] || RECOMMENDATIONS['keine_einschraenkung'];

  const dishList = rec.dishes
    .map((d, i) => `${i + 1}. ${d.name} (${d.price}): ${d.desc}`)
    .join(' | ');

  let message = `${rec.label}: ${dishList}`;
  if (rec.hinweis) message += ` Hinweis: ${rec.hinweis}`;

  return {
    category: rec.label,
    dishes: rec.dishes,
    message,
  };
}

module.exports = getRecommendations;
