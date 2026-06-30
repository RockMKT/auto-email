/**
 * import-contacts.js
 *
 * Lee el CSV de participantes (con muchas filas duplicadas, porque cada
 * participación del sorteo genera una fila nueva con el mismo email) y
 * genera un JSON limpio con UN contacto por email, quedándose con el
 * registro más reciente (por created_at) que tenga fecha de nacimiento.
 *
 * Uso:
 *   node scripts/import-contacts.js ./raffle_participants.csv ./data/contacts.json
 */

const fs = require("fs");
const path = require("path");

function parseCsv(content) {
  // Parser simple para CSV con comillas dobles y campos que pueden
  // contener comas. Suficiente para este archivo (sin saltos de línea
  // dentro de los campos).
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.map((line) => {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields;
  });
  return rows;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function run() {
  const [, , inputPath, outputPath] = process.argv;

  if (!inputPath || !outputPath) {
    console.error(
      "Uso: node scripts/import-contacts.js <input.csv> <output.json>"
    );
    process.exit(1);
  }

  const content = fs.readFileSync(inputPath, "utf-8");
  const rows = parseCsv(content);
  const header = rows[0].map((h) => h.trim());

  const idx = {
    created_at: header.indexOf("created_at"),
    name: header.indexOf("name"),
    email: header.indexOf("email"),
    date_of_birth: header.indexOf("date_of_birth"),
  };

  if (Object.values(idx).some((i) => i === -1)) {
    console.error(
      "No se encontraron todas las columnas esperadas. Header detectado:",
      header
    );
    process.exit(1);
  }

  const byEmail = new Map();
  let skippedNoEmail = 0;
  let skippedNoBirthday = 0;
  let skippedBadEmail = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawEmail = (row[idx.email] || "").trim().toLowerCase();
    const name = (row[idx.name] || "").trim();
    const createdAt = row[idx.created_at];
    const dob = row[idx.date_of_birth];

    if (!rawEmail) {
      skippedNoEmail++;
      continue;
    }
    if (!isValidEmail(rawEmail)) {
      skippedBadEmail++;
      continue;
    }
    if (!dob) {
      skippedNoBirthday++;
      continue;
    }

    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      skippedNoBirthday++;
      continue;
    }

    const existing = byEmail.get(rawEmail);
    const candidate = {
      email: rawEmail,
      name: name || rawEmail.split("@")[0],
      // Guardamos solo mes y día: para cumpleaños no nos importa el año
      // de nacimiento, solo cuándo cae el próximo cumpleaños.
      birthMonth: dobDate.getUTCMonth() + 1, // 1-12
      birthDay: dobDate.getUTCDate(), // 1-31
      birthYear: dobDate.getUTCFullYear(),
      createdAt,
    };

    if (!existing || new Date(createdAt) > new Date(existing.createdAt)) {
      byEmail.set(rawEmail, candidate);
    }
  }

  const contacts = Array.from(byEmail.values()).map(
    ({ email, name, birthMonth, birthDay, birthYear }) => ({
      email,
      name,
      birthMonth,
      birthDay,
      birthYear,
    })
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(contacts, null, 2));

  console.log(`Filas leídas: ${rows.length - 1}`);
  console.log(`Contactos únicos con email + cumpleaños válidos: ${contacts.length}`);
  console.log(`Descartados sin email: ${skippedNoEmail}`);
  console.log(`Descartados email inválido: ${skippedBadEmail}`);
  console.log(`Descartados sin fecha de nacimiento válida: ${skippedNoBirthday}`);
  console.log(`Archivo generado: ${outputPath}`);
}

run();
