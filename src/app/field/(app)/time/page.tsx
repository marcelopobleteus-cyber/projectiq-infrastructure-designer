import React from 'react'
import FieldAppShell from '@/components/field/FieldAppShell'
import TimeClockClient from '@/components/field/TimeClockClient'
import { getTimeClockData } from './data'

export default async function FieldTimePage() {
  const data = await getTimeClockData()

  return (
    <FieldAppShell title="Time Card" subtitle="Hours Log">
      <TimeClockClient {...data} />
    </FieldAppShell>
  )
}
