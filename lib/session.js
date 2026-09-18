import crypto from 'crypto';
import { sql } from './db';

const COOKIE_NAME = 'bc_session';
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

export function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function getSessionToken(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export async function findSessionByToken(token) {
  if (!token) return null;
  const rows = await sql`
    SELECT id, session_token, name, started_at, last_activity_at
    FROM sessions
    WHERE session_token = ${token}
    LIMIT 1
  `;
  return rows[0] || null;
}

// Exact, case-sensitive match: "John", "john" and "joHn" are different
// identities and must never share saved data.
export async function findSessionByName(name) {
  if (!name) return null;
  const rows = await sql`
    SELECT id, session_token, name, started_at, last_activity_at
    FROM sessions
    WHERE name = ${name}
    ORDER BY last_activity_at DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function createSession(req, res, name) {
  const token = crypto.randomBytes(24).toString('hex');
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const rows = await sql`
    INSERT INTO sessions (session_token, name, ip_address, user_agent)
    VALUES (${token}, ${name || 'Anonymous'}, ${ip}, ${userAgent})
    RETURNING id, session_token, name, started_at, last_activity_at
  `;
  setSessionCookie(res, token);
  return rows[0];
}

export async function touchSession(sessionId) {
  await sql`UPDATE sessions SET last_activity_at = now() WHERE id = ${sessionId}`;
}

// Called when someone submits the login form (name + shared password).
// Identity is keyed by NAME, not by whatever cookie this browser happens
// to already be carrying: logging in as "Bob" on a browser that was last
// used as "Alice" must never inherit Alice's estimate/activity, but
// logging back in as "Alice" later on that same (or any) browser should
// recover her own saved work. So this always looks the name up fresh and
// points the cookie at that name's session, creating one if it doesn't
// exist yet.
export async function resolveSession(req, res, name) {
  let session = await findSessionByName(name);
  if (!session) {
    session = await createSession(req, res, name);
  } else {
    await touchSession(session.id);
    setSessionCookie(res, session.session_token);
  }
  return session;
}
