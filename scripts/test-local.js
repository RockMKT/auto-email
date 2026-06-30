// scripts/test-local.js
//
// Corre la lógica de "quién cumple años en 7/3 días" usando tus datos
// reales, SIN enviar ningún mail todavía.
//
// Uso: node scripts/test-local.js

import { readFileSync } from "fs";
import { getContactsToNotify } from "../lib/birthday-logic.js";

const contacts = JSON.parse(readFileSync("./data/contacts.json", "utf-8"));

const { sevenDaysBefore, threeDaysBefore } = getContactsToNotify(contacts);

console.log(`Hoy: ${new Date().toISOString().slice(0, 10)}`);
console.log(`\nCumplen en 7 días (${sevenDaysBefore.length}):`);
sevenDaysBefore.slice(0, 10).forEach((c) => console.log(`  - ${c.name} <${c.email}>`));

console.log(`\nCumplen en 3 días (${threeDaysBefore.length}):`);
threeDaysBefore.slice(0, 10).forEach((c) => console.log(`  - ${c.name} <${c.email}>`));