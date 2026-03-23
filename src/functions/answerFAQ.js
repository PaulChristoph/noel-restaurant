const FAQ = require('../config/faq');

function answerFAQ({ question_category }) {
  const answer = FAQ[question_category];

  if (!answer) {
    return {
      answer: 'Zu dieser Frage habe ich leider keine gespeicherte Antwort. Rufen Sie uns gerne direkt unter 04105 676 33 02 an.',
      follow_up_suggestion: null,
    };
  }

  const followUps = {
    oeffnungszeiten: 'Soll ich gleich einen Tisch für Sie reservieren?',
    adresse: 'Soll ich einen Tisch für Sie reservieren?',
    speisekarte: 'Darf ich einen Tisch für Sie buchen?',
    gruppenreservierung: 'Soll ich direkt eine Reservierung für Ihre Gruppe aufnehmen?',
  };

  return {
    answer,
    follow_up_suggestion: followUps[question_category] || null,
  };
}

module.exports = answerFAQ;
