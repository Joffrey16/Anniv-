import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { daysUntil, nextBirthday, upcomingAge } from '../src/dates.ts';
import { parseText, toCandidates } from '../src/parsers.ts';

const now = new Date(2026, 10, 18, 10, 0); // 18 nov. 2026

test('prochain anniversaire', () => {
  assert.equal(daysUntil({ day: 18, month: 11 }, now), 0);
  assert.equal(daysUntil({ day: 19, month: 11 }, now), 1);
  assert.equal(daysUntil({ day: 17, month: 11 }, now), 364);
  assert.equal(nextBirthday({ day: 29, month: 2 }, now).getDate(), 28); // 2027 non bissextile
  assert.equal(upcomingAge({ id: 'x', name: 'A', day: 1, month: 1, year: 1990, relation: 'ami', emoji: '', giftNeeded: false }, now), 37);
});

test('vcf Google Contacts', () => {
  const vcf = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Léa Martin\r\nBDAY:1994-05-12\r\nEND:VCARD\r\nBEGIN:VCARD\r\nFN:Tom\r\nBDAY:--0703\r\nEND:VCARD\r\nBEGIN:VCARD\r\nFN:Sans date\r\nEND:VCARD';
  assert.deepEqual(parseText(vcf), [
    { name: 'Léa Martin', day: 12, month: 5, year: 1994 },
    { name: 'Tom', day: 3, month: 7, year: undefined },
  ]);
});

test('ics anniversaires', () => {
  const ics = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20260214\nSUMMARY:Anniversaire de Paul\nRRULE:FREQ=YEARLY\nEND:VEVENT\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261001\nSUMMARY:Julie\'s birthday\nEND:VEVENT\nEND:VCALENDAR';
  assert.deepEqual(parseText(ics), [
    { name: 'Paul', day: 14, month: 2 },
    { name: 'Julie', day: 1, month: 10 },
  ]);
});

test('doublons et déjà présents', () => {
  const c = toCandidates([{ name: 'Paul', day: 14, month: 2 }, { name: 'paul', day: 14, month: 2 }, { name: 'Zoé', day: 40, month: 1 }], [
    { id: '1', name: 'Paul', day: 14, month: 2, relation: 'ami', emoji: '', giftNeeded: false },
  ]);
  assert.equal(c.length, 1);
  assert.equal(c[0].alreadyThere, true);
});

import { buildMessage, internationalDigits, smsUrl, whatsappUrl } from '../src/message.ts';

test('message paramétrable', () => {
  const p = { id: '1', name: 'Léa Martin', day: 1, month: 1, relation: 'ami' as const, emoji: '', giftNeeded: false };
  assert.equal(buildMessage('Joyeux anniv {prenom} ! {age} ans 🎉', p, 30), 'Joyeux anniv Léa ! 30 ans 🎉');
  assert.equal(buildMessage('Bon anniversaire {nom} {age}', p), 'Bon anniversaire Léa Martin');
});

test('liens SMS / WhatsApp', () => {
  assert.equal(internationalDigits('06 12 34 56 78'), '33612345678');
  assert.equal(internationalDigits('+32 470 12 34 56'), '32470123456');
  assert.equal(internationalDigits('0041 79 123 45 67'), '41791234567');
  assert.equal(whatsappUrl('06 12 34 56 78', 'Salut !'), 'https://wa.me/33612345678?text=Salut%20!');
  assert.equal(smsUrl('06 12 34 56 78', 'Coucou', 'ios'), 'sms:0612345678&body=Coucou');
  assert.equal(smsUrl('06 12 34 56 78', 'Coucou', 'android'), 'sms:0612345678?body=Coucou');
});
