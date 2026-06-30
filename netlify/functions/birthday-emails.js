// netlify/functions/birthday-emails.js
//
// Netlify Scheduled Function. El horario se define en netlify.toml
// (no acá, a diferencia de Vercel). Netlify la ejecuta automáticamente
// según ese cron, no hace falta llamarla desde afuera ni proteger con
// un secret (no es un endpoint público invocable a demanda).
//
// Persistencia: usamos Netlify Blobs para llevar el registro de
// "a quién ya le mandé el mail este año" y no duplicar envíos si la
// función corre más de una vez el mismo día.

import { getStore } from "@netlify/blobs";
import sgMail from "@sendgrid/mail";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getContactsToNotify } from "../../lib/birthday-logic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contacts = JSON.parse(
  readFileSync(join(__dirname, "../../data/contacts.json"), "utf-8")
);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const TEMPLATE_7_DAYS = process.env.SENDGRID_TEMPLATE_ID_7_DAYS;
const TEMPLATE_3_DAYS = process.env.SENDGRID_TEMPLATE_ID_3_DAYS;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;

const store = getStore("birthday-emails-log");

async function wasAlreadySent(email, kind, year) {
  const key = `${kind}:${year}:${email}`;
  const value = await store.get(key);
  return Boolean(value);
}

async function markAsSent(email, kind, year) {
  const key = `${kind}:${year}:${email}`;
  await store.set(key, "1");
}

async function sendBatch(contactsToSend, kind, templateId) {
  const year = new Date().getUTCFullYear();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const contact of contactsToSend) {
    if (await wasAlreadySent(contact.email, kind, year)) {
      skipped++;
      continue;
    }

    try {
      await sgMail.send({
        to: contact.email,
        from: FROM_EMAIL,
        templateId,
        dynamicTemplateData: { nombre: contact.name },
      });
      await markAsSent(contact.email, kind, year);
      sent++;
    } catch (err) {
      console.error(`Error enviando a ${contact.email}:`, err?.response?.body || err.message);
      failed++;
    }
  }

  return { sent, skipped, failed };
}

const handler = async () => {
  const { sevenDaysBefore, threeDaysBefore } = getContactsToNotify(contacts);

  const result7 = await sendBatch(sevenDaysBefore, "7days", TEMPLATE_7_DAYS);
  const result3 = await sendBatch(threeDaysBefore, "3days", TEMPLATE_3_DAYS);

  const summary = {
    date: new Date().toISOString(),
    sevenDaysBefore: { candidates: sevenDaysBefore.length, ...result7 },
    threeDaysBefore: { candidates: threeDaysBefore.length, ...result3 },
  };

  console.log("Resumen envío cumpleaños:", summary);

  return {
    statusCode: 200,
    body: JSON.stringify(summary),
  };
};

// "@daily" corre todos los días a las 00:00 UTC. Si querés otro horario
// usá formato cron normal, ej "0 13 * * *" (13:00 UTC = 10am Argentina).
export const config = {
  schedule: "0 13 * * *",
};

export default handler;
