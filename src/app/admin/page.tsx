import { redirect } from 'next/navigation'
import { getPlatformOverviewData } from './actions'
import AdminDashboardClient from './AdminDashboardClient'
import { BYPASS_AUTH } from '@/config/auth'

export default async function AdminPage() {
  const initialData = await getPlatformOverviewData()

  if (!initialData.isCallerPlatformAdmin && !BYPASS_AUTH) {
    redirect('/projects')
  }

  return <AdminDashboardClient initialData={initialData} />
}
