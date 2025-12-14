import crypto from "crypto";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const signature = event.headers["robaws-signature"];
  if (!signature) {
    return { statusCode: 400, body: "Missing signature" };
  }

  const secret = process.env.ROBAWS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing ROBAWS_WEBHOOK_SECRET");
    return { statusCode: 500, body: "Server misconfigured" };
  }

  // ---- signature verificatie ----
  const [tPart, v1Part] = signature.split(",");
  const timestamp = tPart?.split("=")[1];
  const receivedSig = v1Part?.split("=")[1];

  const payload = `${timestamp}.${event.body}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expectedSig !== receivedSig) {
    console.error("Invalid signature");
    return { statusCode: 401, body: "Invalid signature" };
  }

  // ---- payload verwerken ----
  const data = JSON.parse(event.body);

  console.log("✅ Robaws webhook ontvangen");
  console.log("Event:", data.event);
  console.log("Planning item data:", data.data);

  // TODO later:
  // - opslaan
  // - koppelen aan project
  // - push naar app / database

  return {
    statusCode: 200,
    body: "OK"
  };
}
