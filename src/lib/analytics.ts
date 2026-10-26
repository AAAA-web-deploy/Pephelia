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
