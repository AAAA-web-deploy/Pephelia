'use client'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { analyticsUrl } from '@/lib/analytics'
import styles from './dashboard.module.css'

type Visit = {
  id: string
  ip: string
  location: string
  browser: string
  os: string
  device: string
  path: string
  referrer: string
  startedAt: number
  lastSeen: number
  pageViews: number
  active: boolean
}
type Summary = { activeVisitors: number; visitors: number; pageViews: number; generatedAt: number }

const TOKEN_KEY = 'pephelia-dashboard-token'

async function call<T>(path: string, token = '', init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const headers = new Headers({ accept: 'application/json' })
    if (init?.body !== undefined) headers.set('content-type', 'application/json')
    if (token) headers.set('authorization', `Bearer ${token}`)
    const response = await fetch(analyticsUrl(path), {
      method: init?.method ?? 'GET',
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({})) as T
    return { ok: response.ok, status: response.status, data }
  } catch {
    return { ok: false, status: 0, data: {} as T }
  }
}

function when(ms: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(ms)
}

export default function DashboardPage() {
  const [token, setToken] = useState('')
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])

  const load = useCallback(async (current: string) => {
    const [summaryResult, visitResult] = await Promise.all([
      call<Summary>('/api/dashboard/analytics/summary', current),
      call<{ visits: Visit[] }>('/api/dashboard/analytics/visits', current),
    ])
    if (summaryResult.status === 401 || visitResult.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY)
      setToken('')
      setReady(false)
      return
    }
    if (!summaryResult.ok || !visitResult.ok) {
      setError('The visitor service is not responding.')
      return
    }
    setSummary(summaryResult.data)
    setVisits(visitResult.data.visits ?? [])
    setError('')
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY) || ''
    if (!saved) return
    setToken(saved)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || !token) return
    void load(token)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(token)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [ready, token, load])

  async function onLogin(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const result = await call<{ ok?: boolean; token?: string; error?: string }>('/api/dashboard/login', '', { method: 'POST', body: { password } })
    setBusy(false)
    if (!result.ok || !result.data.token) {
      setError(result.data.error || 'Incorrect password.')
      return
    }
    sessionStorage.setItem(TOKEN_KEY, result.data.token)
    setToken(result.data.token)
    setPassword('')
    setReady(true)
  }

  async function logout() {
    await call('/api/dashboard/logout', token, { method: 'POST', body: {} })
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setReady(false)
    setSummary(null)
    setVisits([])
  }

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <p className={styles.lead}>PEPHELIA TWIN</p>
        <h1>Visitors</h1>
        {!ready ? (
          <form className={styles.card} onSubmit={onLogin}>
            <label htmlFor="dashboard-password">Password</label>
            <input id="dashboard-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="submit" disabled={busy}>Open dashboard</button>
            {error && <p className={styles.error} role="alert">{error}</p>}
          </form>
        ) : (
          <>
            <div className={styles.bar}>
              <p className={styles.lead}>Live connection data. This page refreshes every five seconds.</p>
              <button type="button" onClick={() => void logout()}>Log out</button>
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            {summary && (
              <section className={styles.stats} aria-label="Visitor summary">
                <article><p>Active now</p><strong>{summary.activeVisitors}</strong></article>
                <article><p>Visitors</p><strong>{summary.visitors}</strong></article>
                <article><p>Page views</p><strong>{summary.pageViews}</strong></article>
              </section>
            )}
            <p className={styles.note}>{summary ? `Updated ${when(summary.generatedAt)}.` : 'Loading visits.'} IP and location come from the network connection. Device comes from the browser signature.</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Seen</th><th>IP address</th><th>Location</th><th>Device</th><th>Page</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{when(visit.lastSeen)}</td>
                      <td>{visit.ip}</td>
                      <td>{visit.location}</td>
                      <td>{visit.browser} · {visit.os} · {visit.device}</td>
                      <td className={styles.path}>{visit.path}<br />{visit.pageViews} view{visit.pageViews === 1 ? '' : 's'}</td>
                      <td className={visit.active ? styles.live : styles.idle}>{visit.active ? 'Live' : 'Idle'}</td>
                    </tr>
                  ))}
                  {visits.length === 0 && <tr><td colSpan={6}>No visits yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
