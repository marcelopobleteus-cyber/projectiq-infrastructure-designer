export type WorkflowGroup =
  | 'Setup'
  | 'Assets'
  | 'Connectivity'
  | 'Infrastructure'
  | 'Execution'
  | 'Validation'
  | 'Delivery'

export type PhaseAvailability = 'Active' | 'Partial' | 'Planned' | 'Future'
export type WorkflowStatus = 'Not Started' | 'In Progress' | 'Needs Attention' | 'Complete' | 'Planned'

export interface WorkflowStep {
  id: string
  group: WorkflowGroup
  order: number
  title: string
  description: string
  relatedRoute: string
  relatedLayers?: string[]
  relatedEntities?: string[]
  phaseAvailability: PhaseAvailability
  status: WorkflowStatus
  nextActionLabel: string
  nextActionRoute: string
  completionCriteria: string
  message?: string
}

export interface WorkflowGroupInfo {
  name: WorkflowGroup
  description: string
  order: number
}

export const WORKFLOW_GROUPS: WorkflowGroupInfo[] = [
  { name: 'Setup', description: 'Configure project boundary, base map details, and import initial layouts.', order: 1 },
  { name: 'Assets', description: 'Deploy and position cameras, cabinets, fiber nodes, switches, and utility poles.', order: 2 },
  { name: 'Connectivity', description: 'Define transmission methods (Fiber, Copper, Wireless, LTE) per endpoint.', order: 3 },
  { name: 'Infrastructure', description: 'Perform detailed engineering for fiber routing, splicing, ports, and power.', order: 4 },
  { name: 'Execution', description: 'Track installation status, technician task boards, and site progress.', order: 5 },
  { name: 'Validation', description: 'Log testing records, QA reports, pings, and optical metrics.', order: 6 },
  { name: 'Delivery', description: 'Generate Bill of Materials (BOM), project reports, and closeout submittals.', order: 7 }
]

export function getWorkflowSteps(stats: {
  camerasCount: number
  camerasWithConnectivityCount: number
  nodesCount: number
  routesCount: number
  cablesCount: number
  enclosuresCount: number
  networkDevicesCount: number
  switchesCount: number
  powerPointsCount: number
  fieldTasksCount: number
  openIssuesCount: number
  projectHasCoords: boolean
  hasBOMItems: boolean
  hasDocuments: boolean
}): WorkflowStep[] {
  return [
    // Setup Group
    {
      id: 'project-setup',
      group: 'Setup',
      order: 1,
      title: 'Project Setup',
      description: 'Define general project metadata, target organization, and project parameters.',
      relatedRoute: 'overview',
      phaseAvailability: 'Active',
      status: stats.projectHasCoords ? 'Complete' : 'Needs Attention',
      nextActionLabel: 'Update Setup details',
      nextActionRoute: 'overview',
      completionCriteria: 'Project metadata and center coordinates are fully configured.',
      message: stats.projectHasCoords
        ? 'Project specifications set.'
        : 'Update center coordinates in the Specifications panel below.'
    },
    {
      id: 'site-basemap',
      group: 'Setup',
      order: 2,
      title: 'Site / Base Map',
      description: 'Review the base GIS layout, boundaries, and visual styling layers.',
      relatedRoute: 'maps',
      phaseAvailability: 'Active',
      status: stats.camerasCount > 0 || stats.nodesCount > 0 ? 'Complete' : 'Not Started',
      nextActionLabel: 'Open GIS Map Workspace',
      nextActionRoute: 'maps',
      completionCriteria: 'Base map tiles load and initial asset layers are enabled.',
      message: stats.camerasCount > 0 || stats.nodesCount > 0
        ? 'Site map layers loaded with assets.'
        : 'Map has no assets placed yet.'
    },
    {
      id: 'existing-infrastructure',
      group: 'Setup',
      order: 3,
      title: 'Existing Infrastructure',
      description: 'Mark existing utility poles, fiber sources, and ducts from municipal records.',
      relatedRoute: 'maps',
      phaseAvailability: 'Active',
      status: stats.nodesCount > 0 ? 'In Progress' : 'Not Started',
      nextActionLabel: 'Place Existing Nodes',
      nextActionRoute: 'maps',
      completionCriteria: 'Add existing fiber sources or utility poles to the map layout.',
      message: stats.nodesCount > 0
        ? `${stats.nodesCount} total infrastructure nodes placed.`
        : 'Identify existing physical structures on the GIS workspace.'
    },
    {
      id: 'import-plans',
      group: 'Setup',
      order: 4,
      title: 'Import Plans / Excel / Coordinates',
      description: 'Import existing cameras, switches, and coordinates from sheets or PDF drawings.',
      relatedRoute: 'overview',
      phaseAvailability: 'Partial',
      status: 'Not Started',
      nextActionLabel: 'Open Import Center',
      nextActionRoute: 'overview?import=open',
      completionCriteria: 'Bulk upload camera lists and validate placements.',
      message: 'Upload XLS/CSV, coordinates lists, or preview before import.'
    },

    // Assets Group
    {
      id: 'asset-cameras',
      group: 'Assets',
      order: 5,
      title: 'CCTV Cameras',
      description: 'Configure camera locations, models, mounting details, and visual labels.',
      relatedRoute: 'cameras',
      phaseAvailability: 'Active',
      status: stats.camerasCount > 0 ? 'Complete' : 'Not Started',
      nextActionLabel: 'Manage Cameras',
      nextActionRoute: 'cameras',
      completionCriteria: 'CCTV camera node items are created and placed on the project layout.',
      message: stats.camerasCount > 0
        ? `${stats.camerasCount} CCTV cameras registered.`
        : 'Create and place cameras on the layout.'
    },
    {
      id: 'asset-cabinets',
      group: 'Assets',
      order: 6,
      title: 'Cabinets & Enclosures',
      description: 'Define field termination cabinets, cabinets with UPS power, and local distribution hubs.',
      relatedRoute: 'locations',
      phaseAvailability: 'Active',
      status: stats.nodesCount > 0 ? 'In Progress' : 'Not Started',
      nextActionLabel: 'Define Cabinets',
      nextActionRoute: 'locations',
      completionCriteria: 'Physical enclosure cabinets created and mapped.',
      message: stats.nodesCount > 0
        ? 'Cabinet hubs initialized on layout.'
        : 'No cabinet distribution points defined.'
    },
    {
      id: 'asset-fiber-nodes',
      group: 'Assets',
      order: 7,
      title: 'Fiber Nodes',
      description: 'Configure pull boxes, manholes, splice enclosures, and handholes.',
      relatedRoute: 'fiber',
      phaseAvailability: 'Active',
      status: stats.nodesCount > 0 ? 'Complete' : 'Not Started',
      nextActionLabel: 'Manage Fiber Nodes',
      nextActionRoute: 'fiber',
      completionCriteria: 'Physical handholes and manholes placed on layout.',
      message: stats.nodesCount > 0
        ? `${stats.nodesCount} fiber nodes recorded.`
        : 'No physical fiber handholes mapped.'
    },
    {
      id: 'asset-network',
      group: 'Assets',
      order: 8,
      title: 'Network Switches',
      description: 'Provision industrial and core network switches, router configurations, and server hubs.',
      relatedRoute: 'network',
      phaseAvailability: 'Active',
      status: stats.networkDevicesCount > 0 ? 'Complete' : 'Not Started',
      nextActionLabel: 'Manage Switch Grid',
      nextActionRoute: 'network',
      completionCriteria: 'Network switch equipment entries are registered.',
      message: stats.networkDevicesCount > 0
        ? `${stats.networkDevicesCount} network devices provisioned.`
        : 'No network switches recorded.'
    },
    {
      id: 'asset-power',
      group: 'Assets',
      order: 9,
      title: 'Power Points',
      description: 'Map utility power feeds, solar panels, battery enclosures, and UPS points.',
      relatedRoute: 'power',
      phaseAvailability: 'Partial',
      status: 'Not Started',
      nextActionLabel: 'Open Power Module',
      nextActionRoute: 'power',
      completionCriteria: 'Utility power connections mapped to cabinet locations.',
      message: 'Utility power nodes and cabinet power feeds.'
    },

    // Connectivity Group
    {
      id: 'assign-connectivity',
      group: 'Connectivity',
      order: 10,
      title: 'Assign Connectivity Type',
      description: 'Define how each CCTV camera connects to the network backhaul (Fiber, Copper, Wireless, LTE).',
      relatedRoute: 'cameras',
      phaseAvailability: 'Active',
      status:
        stats.camerasCount === 0
          ? 'Not Started'
          : stats.camerasWithConnectivityCount === stats.camerasCount
          ? 'Complete'
          : stats.camerasWithConnectivityCount > 0
          ? 'In Progress'
          : 'Needs Attention',
      nextActionLabel: 'Start Connectivity Review',
      nextActionRoute: 'cameras',
      completionCriteria: 'All CCTV camera locations have an assigned connectivity method.',
      message: stats.camerasCount === 0
        ? 'No cameras placed yet.'
        : `${stats.camerasWithConnectivityCount} of ${stats.camerasCount} cameras have connectivity assigned.`
    },

    // Infrastructure Group (Fiber Pathway)
    {
      id: 'infra-conduits',
      group: 'Infrastructure',
      order: 11,
      title: 'Conduits & Fiber Routes',
      description: 'Draw physical route pathways and configure conduit diameter, installation type, and slack.',
      relatedRoute: 'maps',
      phaseAvailability: 'Active',
      status: stats.routesCount > 0 ? 'Complete' : 'Not Started',
      nextActionLabel: 'Draw Fiber Routes',
      nextActionRoute: 'maps?mode=draw',
      completionCriteria: 'Create route path runs linking cabinet and fiber nodes.',
      message: stats.routesCount > 0
        ? `${stats.routesCount} fiber routes designed.`
        : 'No physical fiber routes drawn.'
    },
    {
      id: 'infra-cables',
      group: 'Infrastructure',
      order: 12,
      title: 'Cable Catalog & Cable Design',
      description: 'Select catalog fiber cables and assign them to physical route paths.',
      relatedRoute: 'fiber',
      phaseAvailability: 'Active',
      status: stats.cablesCount > 0 ? 'Complete' : 'Not Started',
      nextActionLabel: 'Assign Cables',
      nextActionRoute: 'fiber',
      completionCriteria: 'Attach catalog cables to created routes.',
      message: stats.cablesCount > 0
        ? `${stats.cablesCount} cables mapped to routes.`
        : 'No cables mapped to routes.'
    },
    {
      id: 'infra-splicing',
      group: 'Infrastructure',
      order: 13,
      title: 'Enclosures & Splicing',
      description: 'Map vault splice closures, patch panels, and configure fiber-to-fiber splices.',
      relatedRoute: 'fiber',
      phaseAvailability: 'Active',
      status: stats.enclosuresCount > 0 ? 'In Progress' : 'Not Started',
      nextActionLabel: 'Manage Splicing Matrix',
      nextActionRoute: 'fiber',
      completionCriteria: 'Define splice closures and strand-level splices.',
      message: stats.enclosuresCount > 0
        ? 'Splice closures defined. Strand splicing active.'
        : 'No enclosures defined.'
    },
    {
      id: 'infra-wireless',
      group: 'Infrastructure',
      order: 14,
      title: 'Wireless Links & Antenna Path',
      description: 'Establish point-to-point (PTP) or point-to-multipoint (PTMP) backhaul, line-of-sight analysis, and signals.',
      relatedRoute: 'wireless',
      phaseAvailability: 'Active',
      status: stats.networkDevicesCount > 0 ? 'In Progress' : 'Not Started',
      nextActionLabel: 'Open Wireless Workspace',
      nextActionRoute: 'wireless',
      completionCriteria: 'Configure radio heights, frequencies, and link alignments.',
      message: 'Establish PtP/PtMP wireless backhaul configurations.'
    },
    {
      id: 'infra-network-switches',
      group: 'Infrastructure',
      order: 15,
      title: 'Switch Ports & IP/VLAN',
      description: 'Configure switch port termination, RJ45 ports, PoE output, and VLAN IP parameters.',
      relatedRoute: 'network',
      phaseAvailability: 'Active',
      status: stats.switchesCount > 0 ? 'In Progress' : 'Not Started',
      nextActionLabel: 'Configure Switch Ports',
      nextActionRoute: 'network',
      completionCriteria: 'Verify port assignments and resolve power PoE alerts.',
      message: stats.switchesCount > 0
        ? 'Port termination grids active.'
        : 'No active switch configurations.'
    },
    {
      id: 'infra-power-poe',
      group: 'Infrastructure',
      order: 16,
      title: 'Power & PoE Monitoring',
      description: 'Inspect cabinet power loads, PoE budget utilization, and UPS status.',
      relatedRoute: 'power',
      phaseAvailability: 'Partial',
      status: 'Not Started',
      nextActionLabel: 'Review Power Feeds',
      nextActionRoute: 'power',
      completionCriteria: 'Total PoE draw matches switch limits.',
      message: 'PoE power monitoring and UPS status.'
    },

    // Execution Group
    {
      id: 'exec-fieldtasks',
      group: 'Execution',
      order: 17,
      title: 'Field Tasks & Work Orders',
      description: 'Generate structured work cards, install tasks, and assign them to technicians.',
      relatedRoute: 'tasks',
      phaseAvailability: 'Active',
      status: stats.fieldTasksCount > 0 ? 'In Progress' : 'Not Started',
      nextActionLabel: 'Open Field Board',
      nextActionRoute: 'tasks',
      completionCriteria: 'Create and assign installation tasks for field deployment.',
      message: stats.fieldTasksCount > 0
        ? `${stats.fieldTasksCount} task cards initialized.`
        : 'No installation tasks registered.'
    },
    {
      id: 'exec-photos',
      group: 'Execution',
      order: 18,
      title: 'Site Photos & Evidence',
      description: 'Access field technician photo logs, mounting validations, and physical structures evidence.',
      relatedRoute: 'documents',
      phaseAvailability: 'Active',
      status: stats.hasDocuments ? 'In Progress' : 'Not Started',
      nextActionLabel: 'View Documents',
      nextActionRoute: 'documents',
      completionCriteria: 'Photo files attached to field checkpoints.',
      message: stats.hasDocuments
        ? 'Technician photos and attachments uploaded.'
        : 'No technician uploads recorded.'
    },

    // Validation Group
    {
      id: 'val-testing',
      group: 'Validation',
      order: 19,
      title: 'Testing & QA Validation',
      description: 'Log optical levels, light levels, ping validation, and OTDR results.',
      relatedRoute: 'reports',
      phaseAvailability: 'Active',
      status: 'Not Started',
      nextActionLabel: 'Validate QA Checkpoints',
      nextActionRoute: 'reports',
      completionCriteria: 'Record test outcomes per strand and connection.',
      message: 'OTDR, Light Level, Ping, and camera status records.'
    },

    // Delivery Group
    {
      id: 'del-bom',
      group: 'Delivery',
      order: 20,
      title: 'Bill of Materials (BOM)',
      description: 'Review automated pricing sheets, parts listings, and vendor quote files.',
      relatedRoute: 'bom',
      phaseAvailability: 'Active',
      status: stats.hasBOMItems ? 'Complete' : 'Not Started',
      nextActionLabel: 'View Bill of Materials',
      nextActionRoute: 'bom',
      completionCriteria: 'Line item list fully populated and exportable.',
      message: stats.hasBOMItems
        ? 'Parts pricing spreadsheet ready.'
        : 'No parts listing items generated.'
    },
    {
      id: 'del-reports',
      group: 'Delivery',
      order: 21,
      title: 'Closeout & Reports',
      description: 'Generate closeout packages, fiber routing logs, and project summary PDF files.',
      relatedRoute: 'reports',
      phaseAvailability: 'Active',
      status: 'Not Started',
      nextActionLabel: 'Compile Closeout Reports',
      nextActionRoute: 'reports',
      completionCriteria: 'Generate the final project delivery documents.',
      message: 'Compile engineering submittals and reports.'
    }
  ]
}

export function getDetailedConnectivity(commType: string, notes: string | null): string {
  if (notes) {
    const match = notes.match(/\[Connectivity: ([^\]]+)\]/)
    if (match) return match[1]
  }
  if (commType === 'fiber') return 'Fiber'
  if (commType === 'copper') return 'Ethernet / Copper'
  if (commType === 'wireless') return 'Wireless PTP'
  return 'Unknown'
}

export function setDetailedConnectivityInNotes(method: string, oldNotes: string | null): { commType: 'fiber' | 'copper' | 'wireless'; notes: string } {
  const cleanNotes = oldNotes ? oldNotes.replace(/\[Connectivity: [^\]]+\]\s*/g, '') : ''
  const tag = `[Connectivity: ${method}]`
  const newNotes = cleanNotes ? `${tag} ${cleanNotes.trim()}` : tag
  
  let commType: 'fiber' | 'copper' | 'wireless' = 'copper'
  if (method === 'Fiber') commType = 'fiber'
  else if (method === 'Ethernet / Copper' || method === 'Existing Network' || method === 'Unknown') commType = 'copper'
  else commType = 'wireless' // Wireless PTP, Wireless PTMP, Wi-Fi Bridge, LTE / 5G
  
  return { commType, notes: newNotes }
}

export interface CameraReadiness {
  location: 'Done' | 'Missing'
  connectivity: string
  fiberRoute: 'Done' | 'Missing' | 'Not Applicable'
  cable: 'Done' | 'Missing' | 'Not Applicable'
  splicing: 'Done' | 'Missing' | 'Not Applicable'
  switchPort: 'Done' | 'Missing'
  power: 'Done' | 'Missing'
  fieldTask: 'Created' | 'Missing'
  testing: 'Not Started' | 'In Progress' | 'Complete'
  overallStatus: 'Ready' | 'In Progress' | 'Needs Attention'
  nextAction: string
  wirelessLink: 'Done' | 'Missing' | 'Not Applicable'
}

export function getCameraReadiness(
  camera: {
    id: string
    latitude: number
    longitude: number
    communication_type: string
    power_type: string
    notes: string | null
    assigned_network_device_id: string | null
  },
  fiberAssignments: Array<{ camera_id: string; fiber_route_id?: string | null; drop_cable_id?: string | null; backbone_cable_id?: string | null; assigned_strand_tx_id?: string | null }>,
  switchPorts: Array<{ assigned_camera_location_id?: string | null }>,
  cameraTasks: Array<{ status?: string | null; task_type?: string | null }>
): CameraReadiness {
  const detailedMethod = getDetailedConnectivity(camera.communication_type, camera.notes)
  const isFiber = camera.communication_type === 'fiber'
  const isWireless = ['Wireless PTP', 'Wireless PTMP', 'Wi-Fi Bridge', 'LTE / 5G'].includes(detailedMethod)

  const location: 'Done' | 'Missing' = camera.latitude !== 0 && camera.longitude !== 0 ? 'Done' : 'Missing'
  const connectivity = detailedMethod

  // Fiber route checks
  const assignment = isFiber ? fiberAssignments.find(a => a.camera_id === camera.id) : null
  const fiberRoute: 'Done' | 'Missing' | 'Not Applicable' = !isFiber
    ? 'Not Applicable'
    : (assignment?.fiber_route_id ? 'Done' : 'Missing')

  // Cable checks
  const cable: 'Done' | 'Missing' | 'Not Applicable' = !isFiber
    ? 'Not Applicable'
    : ((assignment?.drop_cable_id || assignment?.backbone_cable_id) ? 'Done' : 'Missing')

  // Splicing checks
  const splicing: 'Done' | 'Missing' | 'Not Applicable' = !isFiber
    ? 'Not Applicable'
    : (assignment?.assigned_strand_tx_id ? 'Done' : 'Missing')

  // Switch port checks
  const hasSwitchPort = switchPorts.some(p => p.assigned_camera_location_id === camera.id) || camera.assigned_network_device_id !== null
  const switchPort: 'Done' | 'Missing' = hasSwitchPort ? 'Done' : 'Missing'

  // Wireless link/radio checks
  const wirelessLink: 'Done' | 'Missing' | 'Not Applicable' = !isWireless
    ? 'Not Applicable'
    : (camera.assigned_network_device_id ? 'Done' : 'Missing')

  // Power checks
  const power: 'Done' | 'Missing' = camera.power_type && camera.power_type !== 'unknown' ? 'Done' : 'Missing'

  // Field tasks
  const fieldTask: 'Created' | 'Missing' = cameraTasks.length > 0 ? 'Created' : 'Missing'

  // Testing status
  const testTasks = cameraTasks.filter(t => t.task_type === 'Testing' || t.task_type === 'testing' || t.status === 'Complete')
  let testing: 'Not Started' | 'In Progress' | 'Complete' = 'Not Started'
  if (cameraTasks.length > 0) {
    const completeCount = cameraTasks.filter(t => t.status === 'Complete').length
    if (completeCount === cameraTasks.length) {
      testing = 'Complete'
    } else if (completeCount > 0) {
      testing = 'In Progress'
    }
  }

  // Wireless validation checks in notes (Signal & Latency details)
  const hasSignalInfo = camera.notes && camera.notes.includes('[Signal:') && camera.notes.includes('[Latency:')

  // Next action evaluation
  let nextAction = 'All core checkpoints complete. Camera is ready for field deployment.'
  let overallStatus: 'Ready' | 'In Progress' | 'Needs Attention' = 'Ready'

  if (location === 'Missing') {
    nextAction = 'Set valid latitude and longitude coordinates on the map.'
    overallStatus = 'Needs Attention'
  } else if (connectivity === 'Unknown' || !connectivity) {
    nextAction = 'Select a specific backhaul connectivity method.'
    overallStatus = 'Needs Attention'
  } else if (isFiber && fiberRoute === 'Missing') {
    nextAction = 'Draw a fiber route pathway or assign this camera to an existing route.'
    overallStatus = 'Needs Attention'
  } else if (isFiber && cable === 'Missing') {
    nextAction = 'Assign a drop cable or backbone cable to the route connection.'
    overallStatus = 'Needs Attention'
  } else if (isFiber && splicing === 'Missing') {
    nextAction = 'Configure strand assignments and splice tray terminations.'
    overallStatus = 'Needs Attention'
  } else if (isWireless && wirelessLink === 'Missing') {
    nextAction = 'Assign the wireless radio terminal to a cabinet switch or receiver.'
    overallStatus = 'Needs Attention'
  } else if (switchPort === 'Missing') {
    nextAction = 'Terminate the camera connection to an industrial switch port.'
    overallStatus = 'Needs Attention'
  } else if (power === 'Missing') {
    nextAction = 'Map the local power type (PoE, PoE+, Local, or Solar).'
    overallStatus = 'Needs Attention'
  } else if (fieldTask === 'Missing') {
    nextAction = 'Generate field installation checklist tasks.'
    overallStatus = 'In Progress'
  } else if (isWireless && !hasSignalInfo) {
    nextAction = 'Log wireless link validation stats (Signal strength, Capacity, and Latency) in the notes.'
    overallStatus = 'Needs Attention'
  } else if (testing !== 'Complete') {
    nextAction = 'Run ping tests and log physical signal/light validations.'
    overallStatus = 'In Progress'
  }

  return {
    location,
    connectivity,
    fiberRoute,
    cable,
    splicing,
    switchPort,
    power,
    fieldTask,
    testing,
    overallStatus,
    nextAction,
    wirelessLink
  }
}

