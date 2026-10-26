import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { clientIp, createAnalyticsApp, isPublicIp, normalizeIp, parseUserAgent } from '../server/analytics.mjs'

const dir = await mkdtemp(path.join(tmpdir(), 'pephelia-analytics-'))
process.env.TRUST_PROXY = '1'
process.env.TRUSTED_PROXIES = '127.0.0.1,::1'
const password = 'analytics-test-secret'
const app = createAnalyticsApp({ dataDir: dir, password })
const server = createServer((req, res) => { void app.handle(req, res) })
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const base = `http://127.0.0.1:${port}`

function request(url, { method = 'GET', headers = {}, body } = {}) {
  return fetch(url, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })
}

try {
  assert.equal(normalizeIp('::ffff:203.0.113.8'), '203.0.113.8')
  assert.equal(normalizeIp('::1'), '127.0.0.1')
  assert.equal(normalizeIp('999.1.1.1'), null)
  assert.equal(isPublicIp('127.0.0.1'), false)
  assert.equal(isPublicIp('10.1.2.3'), false)
  assert.equal(isPublicIp('1.1.1.1'), true)
  assert.deepEqual(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'), { browser: 'Chrome', os: 'Windows', device: 'desktop' })
  assert.deepEqual(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'), { browser: 'Safari', os: 'iOS', device: 'mobile' })
  assert.equal(clientIp({ socket: { remoteAddress: '::ffff:127.0.0.1' }, headers: { 'x-pephelia-client-ip': '203.0.113.9', 'x-forwarded-for': '8.8.8.8' } }), '203.0.113.9')
  assert.equal(clientIp({ socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-pephelia-client-ip': '203.0.113.9, 198.51.100.4' } }), '127.0.0.1')
  process.env.TRUST_PROXY = '0'
  assert.equal(clientIp({ socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-pephelia-client-ip': '203.0.113.9' } }), '127.0.0.1')
  process.env.TRUST_PROXY = '1'

  const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  const localId = '11111111-1111-4111-8111-111111111111'
  const collected = await request(`${base}/api/analytics/collect`, {
    method: 'POST',
    headers: { 'user-agent': chrome, origin: 'http://127.0.0.1:4174' },
    body: { type: 'pageview', visitorId: localId, path: '/Pephelia/', referrer: '', ip: '8.8.8.8' },
  })
  assert.equal(collected.status, 200)

  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  const publicId = '22222222-2222-4222-8222-222222222222'
  const forwarded = await request(`${base}/api/analytics/collect`, {
    method: 'POST',
    headers: { 'user-agent': iphone, 'x-pephelia-client-ip': '1.1.1.1', 'x-forwarded-for': '8.8.8.8' },
    body: { type: 'pageview', visitorId: publicId, path: '/Pephelia/how-to-purchase/', referrer: 'https://aaaa-web-deploy.github.io/Pephelia/' },
  })
  assert.equal(forwarded.status, 200)

  const denied = await request(`${base}/api/dashboard/login`, { method: 'POST', body: { password: 'wrong' } })
  assert.equal(denied.status, 401)
  const login = await request(`${base}/api/dashboard/login`, { method: 'POST', body: { password } })
  assert.equal(login.status, 200)
  const token = (await login.json()).token
  assert.ok(token)
  const locked = await request(`${base}/api/dashboard/analytics/visits`)
  assert.equal(locked.status, 401)
  const visitsResponse = await request(`${base}/api/dashboard/analytics/visits`, { headers: { authorization: `Bearer ${token}` } })
  assert.equal(visitsResponse.status, 200)
  const { visits } = await visitsResponse.json()
  const local = visits.find((visit) => visit.id === localId)
  const remote = visits.find((visit) => visit.id === publicId)
  assert.equal(local.ip, '127.0.0.1')
  assert.equal(local.location, 'Private network')
  assert.equal(local.browser, 'Chrome')
  assert.equal(local.os, 'Windows')
  assert.equal(local.device, 'desktop')
  assert.equal(local.active, true)
  assert.equal(remote.ip, '1.1.1.1')
  assert.notEqual(remote.location, 'Unavailable')
  assert.notEqual(remote.location, 'Private network')
  assert.match(remote.location, /Australia|Sydney|Research|Cloudflare/i)
  assert.equal(remote.browser, 'Safari')
  assert.equal(remote.os, 'iOS')
  assert.equal(remote.device, 'mobile')

  await new Promise((resolve) => setTimeout(resolve, 1100))
  const beat = await request(`${base}/api/analytics/heartbeat`, {
    method: 'POST',
    headers: { 'user-agent': chrome },
    body: { type: 'heartbeat', visitorId: localId, path: '/Pephelia/' },
  })
  assert.equal(beat.status, 200)
  const after = await request(`${base}/api/dashboard/analytics/visits`, { headers: { authorization: `Bearer ${token}` } })
  const updated = (await after.json()).visits.find((visit) => visit.id === localId)
  assert.ok(updated.lastSeen > local.lastSeen)
  assert.equal(updated.pageViews, 1)
  for (const action of ['copy-ca', 'open-x', 'open-telegram']) {
    const response = await request(`${base}/api/analytics/collect`, {
      method: 'POST',
      headers: { 'user-agent': chrome },
      body: { type: 'action', action, visitorId: localId, path: '/Pephelia/' },
    })
    assert.equal(response.status, 200)
  }
  const acted = await request(`${base}/api/dashboard/analytics/visits`, { headers: { authorization: `Bearer ${token}` } })
  const withActions = (await acted.json()).visits.find((visit) => visit.id === localId)
  assert.equal(withActions.copiedCa, 1)
  assert.equal(withActions.openedX, 1)
  assert.equal(withActions.openedTelegram, 1)
  assert.equal(withActions.pageViews, 1)
  const blocked = await request(`${base}/api/dashboard/analytics/visits/${localId}`, { method: 'DELETE' })
  assert.equal(blocked.status, 401)
  const removed = await request(`${base}/api/dashboard/analytics/visits/${localId}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } })
  assert.equal(removed.status, 200)
  const remaining = await request(`${base}/api/dashboard/analytics/visits`, { headers: { authorization: `Bearer ${token}` } })
  assert.equal((await remaining.json()).visits.some((visit) => visit.id === localId), false)
  console.log(`PASS: local IP ${local.ip} (${local.location}, ${local.browser} on ${local.os}); forwarded IP ${remote.ip} (${remote.location}, ${remote.browser} on ${remote.os} ${remote.device}); actions recorded and the record removed.`)
} finally {
  await new Promise((resolve) => server.close(resolve))
  app.close()
  await rm(dir, { recursive: true, force: true })
}
