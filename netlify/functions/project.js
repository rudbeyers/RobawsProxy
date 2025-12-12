export default async (req) => {
  const ALLOWED_ORIGIN = "https://rudbeyers.github.io";
  const origin = req.headers.get("origin"); // kan null of "null" zijn (in-app browsers)

  // Sta toe: jouw GitHub Pages origin, én webviews die origin "null" sturen
  const allowOrigin =
    origin === ALLOWED_ORIGIN ? origin :
    origin === "null" ? "null" :
    ALLOWED_ORIGIN;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };

  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: corsHeaders });
  }



  const url = new URL(req.url);
  const projectnummer = url.searchParams.get("projectnummer");

  if (!projectnummer) {
    return new Response(JSON.stringify({ error: "Missing projectnummer" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ROBAWS_API_KEY;
  const apiSecret = process.env.ROBAWS_API_SECRET;

  if (!apiKey || !apiSecret) {
    return new Response(JSON.stringify({ error: "Missing API credentials on server" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const upstream = await fetch(`https://app.robaws.com/api/v2/projects/${encodeURIComponent(projectnummer)}`, {
    headers: {
      "Authorization": `Basic ${auth}`,
      "Accept": "application/json",
    },
  });

  const text = await upstream.text();

  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};
