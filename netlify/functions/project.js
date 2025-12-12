// netlify/functions/project.js

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const projectnummer = event.queryStringParameters?.projectnummer;
  if (!projectnummer) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing projectnummer" }),
    };
  }

  const apiKey = process.env.ROBAWS_API_KEY;
  const apiSecret = process.env.ROBAWS_API_SECRET;

  if (!apiKey || !apiSecret) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing API credentials on server" }),
    };
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const upstream = await fetch(`https://app.robaws.com/api/v2/projects/${encodeURIComponent(projectnummer)}`, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json",
      },
    });

    const text = await upstream.text();

    return {
      statusCode: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Fetch failed", details: String(err) }),
    };
  }
};
