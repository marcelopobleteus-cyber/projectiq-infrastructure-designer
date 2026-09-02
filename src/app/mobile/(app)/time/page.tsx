import React from 'react'
import MobileAppShell from '@/components/mobile/MobileAppShell'
import TimeClockClient from '@/components/mobile/TimeClockClient'
import { getTimeClockData } from './data'

export default async function MobileTimePage() {
  const data = await getTimeClockData()

  return (
    <MobileAppShell title="Time Card" subtitle="Hours Log">
      <TimeClockClient {...data} />
    </MobileAppShell>
  )
}
