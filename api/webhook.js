// Monday.com Webhook — Vercel Serverless Function
// Maps Lovable form data → Monday.com board columns via GraphQL API

const MONDAY_API_URL = "https://api.monday.com/v2";

// ─── Field Mappers ────────────────────────────────────────────────────────────

function mapDestinoVivienda(value) {
  const map = {
    primera: "Primera vivienda",
    segunda: "Segunda vivienda",
    inversion: "Inversión",
  };
  return map[value] || value;
}

function buildColumnValues(form) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const columns = {
    // ── Checkbox ──────────────────────────────────────────────────────────────
    boolean_mkvw55qp: { checked: form.privacidad === true ? "true" : "false" },

    // ── Dropdown ─────────────────────────────────────────────────────────────
    dropdown_mm131mxd: { labels: [form.idioma] },           // Idioma preferido
    dropdown_mksd92xa: {                                     // Tipología interés (dormitorios)
      labels: Array.isArray(form.dormitorios)
        ? form.dormitorios
        : [form.dormitorios],
    },

    // ── Date ─────────────────────────────────────────────────────────────────
    date_mksbjga2: { date: today },                          // Fecha de entrada

    // ── Phone ────────────────────────────────────────────────────────────────
    lead_phone: { phone: form.telefono.replace(/\s/g, ""), countryShortName: "ES" },

    // ── Email ────────────────────────────────────────────────────────────────
    lead_email: { email: form.email, text: form.email },

    // ── Text ─────────────────────────────────────────────────────────────────
    text_mm12yqx0: form.codigoPostal,                        // Código Postal

    // ── Status (valores fijos) ────────────────────────────────────────────────
    color_mks7cm2f:  { label: "Mail" },                      // Tipo de gestión
    color_mks9ct6h:  { label: "Formulario web" },            // Origen del contacto
    color_mm165spb:  { label: "Lead Nuevo" },                // Estado Lead

    // ── Status (valores del formulario) ──────────────────────────────────────
    color_mksg46wh:  { label: form.edad },                   // Rango Edad
    color_mm1274dx:  { label: form.presupuesto },            // Presupuesto
    color_mm0ee37e:  { label: mapDestinoVivienda(form.destinoVivienda) }, // Destino vivienda
  };

  // Zonas Comunes (dropdown_mm16dpss — columna dedicada)
  if (form.zonasComunes && form.zonasComunes.length > 0) {
    columns.dropdown_mm16dpss = {
      labels: Array.isArray(form.zonasComunes)
        ? form.zonasComunes
        : [form.zonasComunes],
    };
  }

  return JSON.stringify(columns);
}

// ─── Monday.com API Call ──────────────────────────────────────────────────────

async function createMondayItem(form) {
  const boardId = process.env.MONDAY_BOARD_ID;
  const apiKey  = process.env.MONDAY_API_KEY;

  if (!boardId || !apiKey) {
    throw new Error("Missing MONDAY_BOARD_ID or MONDAY_API_KEY env vars");
  }

  const columnValues = buildColumnValues(form);

  const query = `
    mutation CreateLead($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId,
        item_name: $itemName,
        column_values: $columnValues
      ) {
        id
        name
      }
    }
  `;

  const variables = {
    boardId,
    itemName: form.nombre,
    columnValues,
  };

  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Monday API HTTP error ${response.status}: ${text}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`Monday GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data.create_item;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const form = req.body;

  const required = ["nombre", "telefono", "email"];
  const missing  = required.filter((f) => !form[f]);
  if (missing.length > 0) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missing.join(", ")}` });
  }

  try {
    const item = await createMondayItem(form);
    return res.status(200).json({
      success: true,
      message: "Lead registrado en Monday.com",
      monday_item_id:   item.id,
      monday_item_name: item.name,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
