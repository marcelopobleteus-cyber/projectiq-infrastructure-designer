'use client'

import React from 'react'
import GlobalLayoutWrapper from '@/components/layout/GlobalLayoutWrapper'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <GlobalLayoutWrapper>{children}</GlobalLayoutWrapper>
}
