'use client'
import { useEffect } from 'react'
import { analyticsUrl, isDashboardPath, trackAction, type VisitAction } from '@/lib/analytics'

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
    const known = new Set<VisitAction>(['copy-ca', 'open-x', 'open-telegram'])
    const from = (value: string | null | undefined): VisitAction | null => known.has(value as VisitAction) ? value as VisitAction : null
    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest('[data-track]') : null
      const action = from(element?.getAttribute('data-track'))
      if (action) trackAction(action)
    }
    const onCopy = () => {
      const node = document.getSelection()?.anchorNode
      const element = node instanceof Element ? node : node?.parentElement
      const action = from(element?.closest('[data-track-copy]')?.getAttribute('data-track-copy'))
      if (action) trackAction(action)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('copy', onCopy)
    send('pageview')
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') send('heartbeat')
    }, 15000)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('click', onClick)
      document.removeEventListener('copy', onCopy)
    }
  }, [])
  return null
}
