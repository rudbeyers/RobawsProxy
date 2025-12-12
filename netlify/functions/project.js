export default async (req) => {
  // CORS (laat je GitHub Pages site toe)
  const origin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin.endsWith(".github.io") ? origin : "https://github.com",
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
