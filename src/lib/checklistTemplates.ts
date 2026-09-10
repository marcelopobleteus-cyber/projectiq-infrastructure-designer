/**
 * Plantillas de checklist por tipo de conectividad.
 *
 * Estas listas estaban escritas a mano dentro de generateScopeTemplateTasks.
 * Ahora viven aqui porque las usan tres lugares: el generador de tareas, la
 * pantalla de Settings donde la organizacion las edita, y el fallback cuando
 * la organizacion todavia no guardo una version propia.
 *
 * Importante: NO se borran ni se renumeran los templateKey existentes. La
 * tabla camera_tasks los usa para no duplicar tareas ya creadas; cambiar una
 * clave haria que se vuelva a insertar una tarea que la cuadrilla ya cerro.
 */

export type CommunicationType = 'copper' | 'fiber' | 'wireless' | 'existing' | 'unknown'

export interface ChecklistTemplateItem {
  title: string
  taskType: string
  templateKey: string
}

export const COMMUNICATION_TYPES: { value: CommunicationType; label: string }[] = [
  { value: 'copper', label: 'Copper' },
  { value: 'fiber', label: 'Fiber' },
  { value: 'wireless', label: 'Wireless' },
  { value: 'existing', label: 'Existing network' },
  { value: 'unknown', label: 'Unknown / TBD' },
]

/** Tipos de tarea disponibles al armar una plantilla. */
export const TASK_TYPES = [
  'Site Survey',
  'Mounting',
  'Cabling',
  'Fiber',
  'Wireless',
  'Power',
  'Switch Assignment',
  'IP Addressing',
  'Configuration',
  'Testing',
  'Documentation',
  'Photos',
  'Closeout',
]

export const DEFAULT_CHECKLIST_TEMPLATES: Record<CommunicationType, ChecklistTemplateItem[]> = {
  copper: [
    { title: 'Verify camera location', taskType: 'Site Survey', templateKey: 'copper_verify_location' },
    { title: 'Install camera mount', taskType: 'Mounting', templateKey: 'copper_install_mount' },
    { title: 'Pull Cat6 cable', taskType: 'Cabling', templateKey: 'copper_pull_cat6' },
    { title: 'Terminate Cat6', taskType: 'Cabling', templateKey: 'copper_terminate_cat6' },
    { title: 'Label Cat6', taskType: 'Documentation', templateKey: 'copper_label_cat6' },
    { title: 'Connect to switch', taskType: 'Switch Assignment', templateKey: 'copper_connect_switch' },
    { title: 'Assign switch port', taskType: 'Switch Assignment', templateKey: 'copper_assign_port' },
    { title: 'Verify PoE', taskType: 'Power', templateKey: 'copper_verify_poe' },
    { title: 'Configure IP address', taskType: 'IP Addressing', templateKey: 'copper_configure_ip' },
    { title: 'Verify live video', taskType: 'Testing', templateKey: 'copper_verify_video' },
    { title: 'Verify recording', taskType: 'Testing', templateKey: 'copper_verify_recording' },
    { title: 'Take completion photos', taskType: 'Photos', templateKey: 'copper_completion_photos' },
    { title: 'Mark camera as tested', taskType: 'Closeout', templateKey: 'copper_mark_tested' },
  ],
  fiber: [
    { title: 'Verify camera location', taskType: 'Site Survey', templateKey: 'fiber_verify_location' },
    { title: 'Install camera mount', taskType: 'Mounting', templateKey: 'fiber_install_mount' },
    { title: 'Install fiber drop', taskType: 'Fiber', templateKey: 'fiber_install_drop' },
    { title: 'Install enclosure if required', taskType: 'Fiber', templateKey: 'fiber_install_enclosure' },
    { title: 'Splice fiber', taskType: 'Fiber', templateKey: 'fiber_splice_fiber' },
    { title: 'Test fiber', taskType: 'Testing', templateKey: 'fiber_test_fiber' },
    { title: 'Install media converter or fiber switch', taskType: 'Power', templateKey: 'fiber_install_converter_switch' },
    { title: 'Connect camera', taskType: 'Cabling', templateKey: 'fiber_connect_camera' },
    { title: 'Configure IP address', taskType: 'IP Addressing', templateKey: 'fiber_configure_ip' },
    { title: 'Verify live video', taskType: 'Testing', templateKey: 'fiber_verify_video' },
    { title: 'Upload fiber test results', taskType: 'Documentation', templateKey: 'fiber_upload_results' },
    { title: 'Take completion photos', taskType: 'Photos', templateKey: 'fiber_completion_photos' },
    { title: 'Mark camera as tested', taskType: 'Closeout', templateKey: 'fiber_mark_tested' },
  ],
  wireless: [
    { title: 'Verify line of sight', taskType: 'Site Survey', templateKey: 'wireless_verify_los' },
    { title: 'Confirm mounting height', taskType: 'Site Survey', templateKey: 'wireless_confirm_height' },
    { title: 'Install wireless radio placeholder', taskType: 'Wireless', templateKey: 'wireless_install_radio' },
    { title: 'Assign wireless source/destination placeholder', taskType: 'Wireless', templateKey: 'wireless_assign_endpoints' },
    { title: 'Field survey required', taskType: 'Site Survey', templateKey: 'wireless_field_survey' },
    { title: 'Verify wireless path design later', taskType: 'Wireless', templateKey: 'wireless_verify_path' },
  ],
  existing: [
    { title: 'Verify network source', taskType: 'Site Survey', templateKey: 'existing_verify_source' },
    { title: 'Confirm available switch port', taskType: 'Switch Assignment', templateKey: 'existing_confirm_port' },
    { title: 'Confirm VLAN/network access', taskType: 'Configuration', templateKey: 'existing_confirm_vlan' },
    { title: 'Connect camera', taskType: 'Cabling', templateKey: 'existing_connect_camera' },
    { title: 'Configure IP address', taskType: 'IP Addressing', templateKey: 'existing_configure_ip' },
    { title: 'Verify live video', taskType: 'Testing', templateKey: 'existing_verify_video' },
    { title: 'Verify recording', taskType: 'Testing', templateKey: 'existing_verify_recording' },
    { title: 'Take completion photos', taskType: 'Photos', templateKey: 'existing_completion_photos' },
  ],
  unknown: [
    { title: 'Verify camera location', taskType: 'Site Survey', templateKey: 'unknown_verify_location' },
    { title: 'Complete field survey', taskType: 'Site Survey', templateKey: 'unknown_field_survey' },
    { title: 'Confirm connectivity method', taskType: 'Site Survey', templateKey: 'unknown_confirm_connectivity' },
    { title: 'Confirm power source', taskType: 'Site Survey', templateKey: 'unknown_confirm_power' },
    { title: 'Confirm network source', taskType: 'Site Survey', templateKey: 'unknown_confirm_network' },
  ],
}

/** Normaliza lo que venga de la camara a uno de los tipos conocidos. */
export function normalizeCommunicationType(value: string | null | undefined): CommunicationType {
  const v = (value || '').toLowerCase()
  if (v === 'copper' || v === 'fiber' || v === 'wireless' || v === 'existing') return v
  return 'unknown'
}

export function getDefaultChecklistTemplate(value: string | null | undefined): ChecklistTemplateItem[] {
  return DEFAULT_CHECKLIST_TEMPLATES[normalizeCommunicationType(value)]
}

/**
 * Clave para una tarea nueva creada por el usuario. Se deriva del titulo para
 * que sea legible en la base, y se le agrega un sufijo si choca con otra ya
 * presente en la misma plantilla.
 */
export function buildTemplateKey(
  comm: CommunicationType,
  title: string,
  taken: Set<string>,
): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'task'
  let key = `${comm}_${slug}`
  let n = 2
  while (taken.has(key)) {
    key = `${comm}_${slug}_${n}`
    n += 1
  }
  return key
}

/** Valida una plantilla completa antes de guardarla. */
export function validateChecklistTemplate(
  items: ChecklistTemplateItem[],
): { ok: true } | { ok: false; error: string } {
  if (!Array.isArray(items)) return { ok: false, error: 'Invalid checklist.' }
  if (items.length === 0) return { ok: false, error: 'A checklist needs at least one task.' }
  if (items.length > 60) return { ok: false, error: 'A checklist cannot have more than 60 tasks.' }

  const keys = new Set<string>()
  for (const item of items) {
    const title = (item?.title || '').trim()
    if (!title) return { ok: false, error: 'Every task needs a title.' }
    if (title.length > 120) return { ok: false, error: `Task title is too long: "${title.slice(0, 30)}…"` }
    if (!item?.taskType) return { ok: false, error: `Task "${title}" needs a type.` }
    const key = (item?.templateKey || '').trim()
    if (!key) return { ok: false, error: `Task "${title}" is missing its internal key.` }
    if (keys.has(key)) return { ok: false, error: `Duplicated task: "${title}".` }
    keys.add(key)
  }
  return { ok: true }
}
