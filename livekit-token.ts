export const config = { runtime: "edge" };

function b64url(input: ArrayBuffer | string) {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  bytes.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = await req.json();
    const roomName = String(body?.roomName ?? "").trim().slice(0, 120);
    const participantName = String(body?.participantName ?? "").trim().slice(0, 80);
    // role: "host" can publish (broadcast), "viewer" can only watch
    const role = body?.role === "host" ? "host" : "viewer";

    if (!roomName || !participantName) {
      return new Response(
        JSON.stringify({ error: "roomName and participantName are required" }),
        { status: 400 },
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !url) {
      return new Response(JSON.stringify({ error: "LiveKit is not configured" }), { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: apiKey,
      sub: participantName,
      name: participantName,
      nbf: now - 5,
      exp: now + 60 * 60 * 4,
      jti: `${participantName}-${now}`,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: role === "host",
        canSubscribe: true,
        canPublishData: role === "host",
      },
    };

    const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payloadEncoded = b64url(JSON.stringify(payload));
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(apiSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${head}.${payloadEncoded}`),
    );

    const token = `${head}.${payloadEncoded}.${b64url(sig)}`;
    return new Response(JSON.stringify({ token, url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed to create token" }),
      { status: 500 },
    );
  }
}
