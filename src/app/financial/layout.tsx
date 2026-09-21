'use client'

import React from 'react'
import GlobalLayoutWrapper from '@/components/layout/GlobalLayoutWrapper'

export default function FinancialLayout({ children }: { children: React.ReactNode }) {
  return <GlobalLayoutWrapper>{children}</GlobalLayoutWrapper>
}
