#!/usr/bin/env node
/** Visitor analytics for Pephelia Twin. IP comes from the connection, never from the page. */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const PORT = Number(process.env.PORT || 8788)
const HOST = process.env.HOST || '127.0.0.1'
const DATA_DIR = process.env.PEPHELIA_DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const ACTIVE_MS = 90_000
const SESSION_MS = 8 * 60 * 60 * 1000

const PUBLIC_ORIGINS = new Set([
  'https://aaaa-web-deploy.github.io',
  'https://pephelia.103.161.35.238.sslip.io',
])

export function normalizeIp(value) {
  if (!value) return null
  let ip = String(value).trim()
  if (ip.startsWith('::ffff:')) ip = ip.slice(7)
  if (ip === '::1') return '127.0.0.1'
  if (ip.includes(':')) return /^[0-9a-f:]+$/i.test(ip) ? ip : null
  const parts = ip.split('.')
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) return null
  return ip
}

export function isPublicIp(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '0.0.0.0') return false
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return false
  const parts = ip.split('.').map(Number)
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false
  const lower = ip.toLowerCase()
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return false
  return true
}

export function clientIp(req) {
  const remote = normalizeIp(req.socket?.remoteAddress)
  const trusted = new Set((process.env.TRUSTED_PROXIES || '127.0.0.1,::1').split(',').map((item) => item.trim()).filter(Boolean))
  const headerName = (process.env.TRUSTED_IP_HEADER || 'x-pephelia-client-ip').toLowerCase()
  if (process.env.TRUST_PROXY === '1' && remote && trusted.has(remote)) {
    const forwarded = normalizeIp(String(req.headers[headerName] || '').split(',')[0])
    if (forwarded && !String(req.headers[headerName]).includes(',')) return forwarded
  }
  return remote
}

export function parseUserAgent(ua = '') {
  const browser = /edg\//i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Other'
  const os = /windows/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ios/i.test(ua) ? 'iOS' : /mac os/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Other'
  const device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobile|iphone|android/i.test(ua) ? 'mobile' : 'desktop'
  return { browser, os, device }
}

function originAllowed(origin) {
  if (!origin) return true
  try {
    const url = new URL(origin)
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return true
    return PUBLIC_ORIGINS.has(origin)
  } catch {
    return false
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('base64')
  const hash = scryptSync(password, salt, 32).toString('base64')
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password, stored) {
  const [algo, salt, hash] = String(stored || '').split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const actual = scryptSync(password, salt, 32)
  const expected = Buffer.from(hash, 'base64')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function cleanText(value, max) {
  return String(value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max)
}

async function lookupLocation(ip, fetchImpl = fetch) {
  if (!isPublicIp(ip)) return 'Private network'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetchImpl(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!response.ok) return 'Unavailable'
    const data = await response.json()
    if (!data || data.success === false) return 'Unavailable'
    const parts = [data.city, data.region, data.country].map((part) => cleanText(part, 80)).filter(Boolean)
    const unique = parts.filter((part, index) => parts.findIndex((item) => item.toLowerCase() === part.toLowerCase()) === index)
    return unique.join(', ') || 'Unavailable'
  } catch {
    return 'Unavailable'
  } finally {
    clearTimeout(timer)
  }
}

export function createAnalyticsApp({ dataDir = DATA_DIR, password = process.env.DASHBOARD_PASSWORD || '', fetchImpl = fetch, now = () => Date.now() } = {}) {
  mkdirSync(dataDir, { recursive: true })
  const db = new DatabaseSync(path.join(dataDir, 'analytics.sqlite'))
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      location TEXT NOT NULL,
      browser TEXT NOT NULL,
      os TEXT NOT NULL,
      device TEXT NOT NULL,
      path TEXT NOT NULL,
      referrer TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      page_views INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS geo_cache (ip TEXT PRIMARY KEY, location TEXT NOT NULL, cached_at INTEGER NOT NULL);
  `)
  const storedPassword = db.prepare('SELECT value FROM settings WHERE key = ?').get('password')
  if (!storedPassword && password) db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('password', hashPassword(password))
  const failures = new Map()

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = []
      let size = 0
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > 8192) {
          reject(Object.assign(new Error('too large'), { status: 413 }))
          req.destroy()
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        if (!text) return resolve({})
        try { resolve(JSON.parse(text)) } catch { reject(Object.assign(new Error('bad json'), { status: 400 })) }
      })
      req.on('error', reject)
    })
  }

  function send(res, status, body, origin) {
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    }
    if (origin && originAllowed(origin)) {
      headers['access-control-allow-origin'] = origin
      headers['access-control-allow-headers'] = 'content-type, authorization'
      headers['access-control-allow-methods'] = 'GET, POST, OPTIONS'
      headers.vary = 'Origin'
    }
    res.writeHead(status, headers)
    res.end(JSON.stringify(body))
  }

  function currentAuth(req) {
    const header = String(req.headers.authorization || '')
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    if (!token) return false
    const row = db.prepare('SELECT expires_at FROM auth_sessions WHERE token_hash = ?').get(sha256(token))
    if (!row || row.expires_at <= now()) return false
    return true
  }

  async function locationFor(ip) {
    const cached = db.prepare('SELECT location, cached_at FROM geo_cache WHERE ip = ?').get(ip)
    if (cached && now() - cached.cached_at < 24 * 60 * 60 * 1000) return cached.location
    const location = await lookupLocation(ip, fetchImpl)
    if (location !== 'Unavailable') db.prepare('INSERT INTO geo_cache (ip, location, cached_at) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET location = excluded.location, cached_at = excluded.cached_at').run(ip, location, now())
    return location
  }

  async function record(req, body) {
    const visitorId = cleanText(body.visitorId, 80)
    if (!/^[0-9a-f-]{36}$/i.test(visitorId)) return { status: 400, body: { ok: false } }
    const type = body.type === 'heartbeat' ? 'heartbeat' : 'pageview'
    const ip = clientIp(req) || 'Unavailable'
    const agent = parseUserAgent(String(req.headers['user-agent'] || ''))
    const location = await locationFor(ip)
    const visitPath = cleanText(body.path, 300) || '/'
    const referrer = cleanText(body.referrer, 500)
    const existing = db.prepare('SELECT id FROM visits WHERE id = ?').get(visitorId)
    if (!existing) {
      db.prepare('INSERT INTO visits (id, ip, location, browser, os, device, path, referrer, started_at, last_seen, page_views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(visitorId, ip, location, agent.browser, agent.os, agent.device, visitPath, referrer, now(), now(), type === 'pageview' ? 1 : 0)
    } else if (type === 'pageview') {
      db.prepare('UPDATE visits SET ip = ?, location = ?, browser = ?, os = ?, device = ?, path = ?, referrer = ?, last_seen = ?, page_views = page_views + 1 WHERE id = ?').run(ip, location, agent.browser, agent.os, agent.device, visitPath, referrer, now(), visitorId)
    } else {
      db.prepare('UPDATE visits SET ip = ?, location = ?, browser = ?, os = ?, device = ?, last_seen = ? WHERE id = ?').run(ip, location, agent.browser, agent.os, agent.device, now(), visitorId)
    }
    return { status: 200, body: { ok: true } }
  }

  async function handle(req, res) {
    const origin = String(req.headers.origin || '')
    const url = new URL(req.url || '/', 'http://localhost')
    if (req.method === 'OPTIONS') {
      if (origin && !originAllowed(origin)) return send(res, 403, { ok: false }, origin)
      res.writeHead(204, {
        'access-control-allow-origin': originAllowed(origin) && origin ? origin : '*',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        vary: 'Origin',
      })
      res.end()
      return
    }
    if (origin && !originAllowed(origin)) return send(res, 403, { ok: false }, origin)
    try {
      if (req.method === 'POST' && (url.pathname === '/api/analytics/collect' || url.pathname === '/api/analytics/heartbeat')) {
        const result = await record(req, await readBody(req))
        return send(res, result.status, result.body, origin)
      }
      if (req.method === 'GET' && url.pathname === '/api/dashboard/session') {
        return send(res, 200, { authenticated: currentAuth(req) }, origin)
      }
      if (req.method === 'POST' && url.pathname === '/api/dashboard/login') {
        const ip = clientIp(req) || 'unknown'
        const attempt = failures.get(ip)
        if (attempt && attempt.resetAt > now() && attempt.count >= 8) return send(res, 429, { ok: false, error: 'Too many attempts. Try again later.' }, origin)
        const body = await readBody(req)
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('password')
        if (!row || !verifyPassword(String(body.password || ''), row.value)) {
          const current = attempt && attempt.resetAt > now() ? attempt : { count: 0, resetAt: now() + 15 * 60 * 1000 }
          current.count += 1
          failures.set(ip, current)
          return send(res, 401, { ok: false, error: 'Incorrect password.' }, origin)
        }
        failures.delete(ip)
        const token = randomBytes(32).toString('base64url')
        db.prepare('INSERT INTO auth_sessions (token_hash, expires_at) VALUES (?, ?)').run(sha256(token), now() + SESSION_MS)
        return send(res, 200, { ok: true, token }, origin)
      }
      if (req.method === 'POST' && url.pathname === '/api/dashboard/logout') {
        const header = String(req.headers.authorization || '')
        const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
        if (token) db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(sha256(token))
        return send(res, 200, { ok: true }, origin)
      }
      if (url.pathname.startsWith('/api/dashboard/') && !currentAuth(req)) return send(res, 401, { ok: false, error: 'Sign in required.' }, origin)
      if (req.method === 'GET' && url.pathname === '/api/dashboard/analytics/summary') {
        const since = now() - ACTIVE_MS
        const active = db.prepare('SELECT COUNT(*) AS count FROM visits WHERE last_seen >= ?').get(since).count
        const totals = db.prepare('SELECT COUNT(*) AS visitors, COALESCE(SUM(page_views), 0) AS pageViews FROM visits').get()
        return send(res, 200, { activeVisitors: active, visitors: totals.visitors, pageViews: totals.pageViews, generatedAt: now() }, origin)
      }
      if (req.method === 'GET' && url.pathname === '/api/dashboard/analytics/visits') {
        const rows = db.prepare('SELECT * FROM visits ORDER BY last_seen DESC LIMIT 200').all()
        const visits = rows.map((row) => ({
          id: row.id,
          ip: row.ip,
          location: row.location,
          browser: row.browser,
          os: row.os,
          device: row.device,
          path: row.path,
          referrer: row.referrer,
          startedAt: row.started_at,
          lastSeen: row.last_seen,
          pageViews: row.page_views,
          active: now() - row.last_seen <= ACTIVE_MS,
        }))
        return send(res, 200, { visits, generatedAt: now() }, origin)
      }
      send(res, 404, { ok: false }, origin)
    } catch (error) {
      send(res, error.status || 500, { ok: false }, origin)
    }
  }

  return { handle, close: () => db.close() }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const app = createAnalyticsApp()
  const server = createServer((req, res) => { void app.handle(req, res) })
  server.listen(PORT, HOST, () => {
    console.log(`Pephelia analytics listening on http://${HOST}:${PORT}`)
  })
}
