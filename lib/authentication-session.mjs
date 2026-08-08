export const SESSION_COOKIE_NAME = "__Host-lotura_session";
export const SESSION_SUBJECT = "temporary-admin";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("Invalid base64url value.");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret, usage) {
  return crypto.subtle.importKey(
    "raw",
    base64UrlToBytes(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    [usage],
  );
}

function epochSeconds(value) {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) throw new Error("Invalid session clock value.");
  return Math.floor(timestamp / 1000);
}

export async function createSignedSession({
  durationSeconds,
  now = new Date(),
  secret,
}) {
  const issuedAt = epochSeconds(now);
  const payload = bytesToBase64Url(
    textEncoder.encode(
      JSON.stringify({
        exp: issuedAt + durationSeconds,
        iat: issuedAt,
        sub: SESSION_SUBJECT,
        v: 1,
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret, "sign"),
    textEncoder.encode(payload),
  );
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySignedSession(
  token,
  { maximumDurationSeconds, now = new Date(), secret },
) {
  if (typeof token !== "string" || token.length > 4096) return null;
  const pieces = token.split(".");
  if (pieces.length !== 2) return null;

  try {
    const [payloadValue, signatureValue] = pieces;
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret, "verify"),
      base64UrlToBytes(signatureValue),
      textEncoder.encode(payloadValue),
    );
    if (!validSignature) return null;

    const payload = JSON.parse(
      textDecoder.decode(base64UrlToBytes(payloadValue)),
    );
    const currentTime = epochSeconds(now);

    if (
      payload?.v !== 1 ||
      payload?.sub !== SESSION_SUBJECT ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      payload.iat > currentTime + 60 ||
      payload.exp <= currentTime ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > maximumDurationSeconds
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
