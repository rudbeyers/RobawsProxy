import crypto from "crypto";

const APP_URL_BASE = "https://rudbeyers.github.io/backxWerfapp/"; // jouw werfapp
const ROBAWS_BASE = "https://app.robaws.com/api/v2";

function buildDescriptionHtml(projectId) {
  const url = `https://rudbeyers.github.io/backxWerfapp/?projectnummer=${encodeURIComponent(projectId)}`;
  return `<p>Vul het formulier in</p>\n<p><a href="${url}">Klik</a></p>`;
}

function timingSafeEqualHex(a, b) {
  // voorkom timing attacks
  const aa = Buffer.from(a || "", "hex");
  const bb = Buffer.from(b || "", "hex");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function buildWerfUrl(projectId) {
  // je kan dit later ook #projectnummer=... maken als je dat verkiest
  const u = new URL(APP_URL_BASE);
  u.searchParams.set("projectnummer", String(projectId));
  return u.toString();
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // 1) Signature check
  const signatureHeader =
    event.headers["robaws-signature"] ||
    event.headers["Robaws-Signature"] ||
    event.headers["ROBAWS-SIGNATURE"];

  if (!signatureHeader) {
    return { statusCode: 400, body: "Missing Robaws-Signature" };
  }

  const webhookSecret = process.env.ROBAWS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing ROBAWS_WEBHOOK_SECRET");
    return { statusCode: 500, body: "Server misconfigured" };
  }

  const parts = signatureHeader.split(",");
  const t = parts.find(p => p.trim().startsWith("t="))?.split("=")[1];
  const v1 = parts.find(p => p.trim().startsWith("v1="))?.split("=")[1];

  if (!t || !v1) {
    return { statusCode: 400, body: "Invalid signature format" };
  }

  const payloadToSign = `${t}.${event.body || ""}`;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(payloadToSign)
    .digest("hex");

  if (!timingSafeEqualHex(expected, v1)) {
    console.error("Invalid signature");
    return { statusCode: 401, body: "Invalid signature" };
  }

  // 2) Parse payload
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    console.error("Invalid JSON", e);
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const eventType = data?.event;
  const item = data?.data;

  // 3) Enkel de planning item events
  if (!["planning-item.created", "planning-item.updated"].includes(eventType)) {
    return { statusCode: 200, body: "Ignored" };
  }

  const planningItemId = item?.id;
  const projectId = item?.projectId;

  if (!planningItemId || !projectId) {
    console.log("Missing planningItemId/projectId, skip.");
    return { statusCode: 200, body: "Missing ids" };
  }

  const descriptionHtml = buildDescriptionHtml(projectId);

  // 4) Loop-preventie: als description al exact die URL is → niets doen
  const currentDescription = (item?.description || "").trim();
if (currentDescription === descriptionHtml) {
  console.log("Description staat al correct, skip.");
  return { statusCode: 200, body: "Already up to date" };
}


  // 5) PATCH terugschrijven naar Robaws
  const apiKey = process.env.ROBAWS_API_KEY;
  const apiSecret = process.env.ROBAWS_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("Missing ROBAWS_API_KEY/ROBAWS_API_SECRET");
    return { statusCode: 500, body: "Server misconfigured" };
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const patchBody = { description: descriptionHtml };


  try {
    const res = await fetch(`${ROBAWS_BASE}/planning-items/${encodeURIComponent(planningItemId)}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/merge-patch+json",
        "Accept": "application/json"
      },
      body: JSON.stringify(patchBody)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("PATCH failed:", res.status, text);
      // toch 200 naar Robaws, anders blijven ze retry’en
      return { statusCode: 200, body: "PATCH failed (logged)" };
    }

    console.log(`✅ Updated planning item ${planningItemId} description -> ${werfUrl}`);
    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("Fetch/PATCH error:", err);
    return { statusCode: 200, body: "PATCH error (logged)" };
  }
}
