import UnderConstruction from '@/components/UnderConstruction'
import { getDiscipline, getSectionMeta } from '@/lib/disciplines'

export default function TowerMaintenanceGroundPage() {
  const d = getDiscipline('tower_maint_ground')!
  const section = getSectionMeta(d.sections[0])
  return <UnderConstruction icon={d.icon} title={d.title} subtitle={d.subtitle} sectionLabel={section.title} />
}
