const HOSTED_API = 'https://pephelia.103.161.35.238.sslip.io'

export function analyticsOrigin(): string {
  if (typeof location === 'undefined') return ''
  const host = location.hostname.toLowerCase()
  if (host === 'aaaa-web-deploy.github.io') return HOSTED_API
  if (host === 'pephelia.103.161.35.238.sslip.io') return ''
  return 'http://127.0.0.1:8788'
}

export function analyticsUrl(path: string): string {
  return `${analyticsOrigin()}${path}`
}

export function isDashboardPath(pathname = typeof location === 'undefined' ? '' : location.pathname): boolean {
  return pathname.includes('/dashboard')
}

export type VisitAction = 'copy-ca' | 'open-x' | 'open-telegram'

export function trackAction(action: VisitAction): void {
  if (typeof sessionStorage === 'undefined' || isDashboardPath()) return
  const visitorId = sessionStorage.getItem('pephelia-visitor')
  if (!visitorId) return
  void fetch(analyticsUrl('/api/analytics/collect'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'action', action, visitorId, path: `${location.pathname}${location.search}` }),
    keepalive: true,
  }).catch(() => undefined)
}
