import crypto from 'crypto';
import { sql } from './db';

// Two cookies, two different jobs:
//  - bc_device: a permanent, random id for THIS browser. Set once, on the
//    first login attempt, and never changed again - it's how we tell two
//    different physical people apart even if they type the identical name.
//  - bc_session: points at the currently active session row (its UUID) on
//    this browser, so a page reload can silently resume without
//    re-entering the shared password.
const DEVICE_COOKIE = 'bc_device';
const SESSION_COOKIE = 'bc_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  });
  return out;
}

function setCookie(res, name, value) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (isProd) parts.push('Secure');
  // Append rather than overwrite: a response may need to set both cookies.
  const existing = res.getHeader('Set-Cookie');
  const next = parts.join('; ');
  if (!existing) {
    res.setHeader('Set-Cookie', next);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, next]);
  } else {
    res.setHeader('Set-Cookie', [existing, next]);
  }
}

export function setSessionCookie(res, sessionId) {
  setCookie(res, SESSION_COOKIE, sessionId);
}

export function getSessionId(req) {
  return parseCookies(req)[SESSION_COOKIE] || null;
}

export function getDeviceId(req) {
  return parseCookies(req)[DEVICE_COOKIE] || null;
}

// Ensures this browser has a permanent device id, creating one if this is
// its first-ever login attempt. Never overwrites an existing one.
export function ensureDeviceId(req, res) {
  const existing = getDeviceId(req);
  if (existing) return existing;
  const deviceId = crypto.randomBytes(16).toString('hex');
  setCookie(res, DEVICE_COOKIE, deviceId);
  return deviceId;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A malformed or stale bc_session cookie (e.g. left over from before this
// id format was adopted, or simply tampered with) must never surface as a
// 500 - it just means "no session", same as no cookie at all.
export async function findSessionById(id) {
  if (!id || !UUID_RE.test(id)) return null;
  const rows = await sql`
    SELECT id, device_id, name, started_at, last_activity_at
    FROM sessions
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function touchSession(sessionId) {
  await sql`UPDATE sessions SET last_activity_at = now() WHERE id = ${sessionId}`;
}

// Called when someone submits the login form (name + shared password).
// Identity is the pair (this browser's device id, exact-case name), so:
//  - same browser + same name        -> same row, own data resumes
//  - same browser + a different name -> a different row, no data leaks in
//  - a different browser + same name -> ALSO a different row, because two
//    strangers who both happen to type "John" must never end up sharing
//    one dashboard just because the password is shared
// The upsert is atomic (ON CONFLICT) so concurrent logins from the same
// browser+name can't race into duplicate rows.
export async function resolveSession(req, res, name) {
  const deviceId = ensureDeviceId(req, res);
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const rows = await sql`
    INSERT INTO sessions (device_id, name, ip_address, user_agent)
    VALUES (${deviceId}, ${name || 'Anonymous'}, ${ip}, ${userAgent})
    ON CONFLICT (device_id, name)
    DO UPDATE SET
      last_activity_at = now(),
      ip_address = EXCLUDED.ip_address,
      user_agent = EXCLUDED.user_agent
    RETURNING id, device_id, name, started_at, last_activity_at
  `;
  const session = rows[0];
  setSessionCookie(res, session.id);
  return session;
}
