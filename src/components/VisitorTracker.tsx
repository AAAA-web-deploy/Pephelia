'use client'
import { useEffect } from 'react'
import { analyticsUrl, isDashboardPath } from '@/lib/analytics'

function refused(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (nav.globalPrivacyControl) return true
  return navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes'
}

export default function VisitorTracker() {
  useEffect(() => {
    if (isDashboardPath() || refused()) return
    const key = 'pephelia-visitor'
    let visitorId = sessionStorage.getItem(key)
    if (!visitorId) {
      visitorId = crypto.randomUUID()
      sessionStorage.setItem(key, visitorId)
    }
    const send = (type: 'pageview' | 'heartbeat') => {
      const body = JSON.stringify({
        type,
        visitorId,
        path: `${location.pathname}${location.search}`,
        referrer: document.referrer,
      })
      void fetch(analyticsUrl(type === 'heartbeat' ? '/api/analytics/heartbeat' : '/api/analytics/collect'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined)
    }
    send('pageview')
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') send('heartbeat')
    }, 15000)
    return () => window.clearInterval(timer)
  }, [])
  return null
}
