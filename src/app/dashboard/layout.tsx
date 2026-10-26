import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Visitors — Pephelia Twin',
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
