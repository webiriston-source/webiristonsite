import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseCookies, serializeCookie } from "./cookies.ts";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type SessionPayload = {
  isAdmin: boolean;
  iat: number;
  exp: number;
};

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

function sign(secret: string, payload: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  return base64UrlEncode(hmac.digest());
}

export function createAdminSessionToken(secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    isAdmin: true,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(secret, encoded);
  return `${encoded}.${signature}`;
}

export function verifyAdminSessionToken(secret: string, token?: string): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(secret, encoded);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload;
    if (!payload.isAdmin) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getAdminSession(req: VercelRequest, secret: string): SessionPayload | null {
  const cookies = parseCookies(req.headers.cookie);
  return verifyAdminSessionToken(secret, cookies[COOKIE_NAME]);
}

export function setAdminSessionCookie(res: VercelResponse, token: string) {
  const isSecure = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
  const cookie = serializeCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
  res.setHeader("Set-Cookie", cookie);
}

export function clearAdminSessionCookie(res: VercelResponse) {
  const isSecure = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
  const cookie = serializeCookie(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: 0,
    path: "/",
  });
  res.setHeader("Set-Cookie", cookie);
}
