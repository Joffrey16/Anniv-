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

import { snapUsername, snapUrls } from '../src/message.ts';

test('nom d\'utilisateur Snapchat', () => {
  assert.equal(snapUsername('@Lea.Martin94'), 'lea.martin94');
  assert.equal(snapUsername('https://www.snapchat.com/add/lea_m?share_id=xyz'), 'lea_m');
  assert.equal(snapUsername('Léa Martin'), null);
  assert.equal(snapUsername('ab'), null);
  assert.deepEqual(snapUrls('Léa Martin'), ['snapchat://', 'https://www.snapchat.com/']);
  assert.equal(snapUrls('lea_m')[0], 'https://www.snapchat.com/add/lea_m');
});

import { alarmTrigger, buildIcs } from '../src/calendar.ts';

test('export calendrier .ics', () => {
  assert.equal(alarmTrigger(0, 9, 0), 'PT540M');
  assert.equal(alarmTrigger(7, 18, 0), '-PT9000M');
  const ics = buildIcs([
    { id: 'a', name: 'Léa', day: 21, month: 11, year: 1994, relation: 'ami', emoji: '', giftNeeded: true, giftIdeas: 'livre, vinyle' },
    { id: 'b', name: 'Hugo', day: 2, month: 1, relation: 'ami', emoji: '', giftNeeded: false },
  ], { wishTemplate: '', reminders: [
    { id: '1', kind: 'cadeau', daysBefore: 7, hour: 18, minute: 0, enabled: true },
    { id: '2', kind: 'souhaiter', daysBefore: 0, hour: 9, minute: 0, enabled: true },
  ] }, new Date(2026, 10, 18));
  assert.match(ics, /DTSTART;VALUE=DATE:20261121/);
  assert.match(ics, /DTSTART;VALUE=DATE:20270102/);
  assert.equal((ics.match(/BEGIN:VALARM/g) ?? []).length, 3); // Hugo : pas de rappel cadeau
  assert.match(ics, /livre\\, vinyle/);
  assert.ok(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75));
});

import { buildShareLink, decodeShare, shareCodeFromUrl } from '../src/share.ts';

test('lien de partage', () => {
  const people = [
    { id: '1', name: 'Léa Martin 🌸', day: 21, month: 11, year: 1994, relation: 'famille' as const, emoji: '🌸', giftNeeded: true, giftIdeas: 'secret', phone: '0612345678' },
    { id: '2', name: 'Hugo', day: 2, month: 12, relation: 'collegue' as const, emoji: '⚽️', giftNeeded: false },
  ];
  const link = buildShareLink(people, 'https://joffrey16.github.io/Anniv-/', 'Joffrey');
  assert.ok(link.startsWith('https://joffrey16.github.io/Anniv-/#partage='));
  const res = decodeShare(shareCodeFromUrl(link)!);
  assert.equal(res?.from, 'Joffrey');
  assert.deepEqual(res?.people[0], { name: 'Léa Martin 🌸', day: 21, month: 11, year: 1994, relation: 'famille', emoji: '🌸', phone: '0612345678' });
  assert.equal(res?.people[1].year, undefined);
  assert.ok(!link.includes('secret')); // les idées cadeau ne sont pas partagées
  assert.equal(decodeShare('nimportequoi'), null);
});
