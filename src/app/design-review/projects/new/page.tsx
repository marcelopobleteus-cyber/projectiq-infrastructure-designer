import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ProjectCreateReviewClient from './ProjectCreateReviewClient'

export default async function DesignReviewNewProjectPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  return (
    <ProjectCreateReviewClient googleMapsApiKey={googleMapsApiKey} />
  )
}
