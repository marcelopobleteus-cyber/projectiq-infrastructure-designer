export type LayerStatus = 'Active' | 'Partial' | 'Planned' | 'Future'

export type LayerCategory =
  | 'Site'
  | 'Cameras'
  | 'Fiber'
  | 'Network'
  | 'Power'
  | 'Wireless'
  | 'Field Work'
  | 'Issues'
  | 'As-Built'

export interface LayerDefinition {
  id: string
  name: string
  description: string
  defaultVisible: boolean
  editable: boolean
  icon: string
  color: string
  status: LayerStatus
  relatedEntities: string[]
}

export const LAYERS: LayerDefinition[] = [
  {
    id: 'base-map',
    name: 'Base Map',
    description: 'Street, satellite, and hybrid base layers',
    defaultVisible: true,
    editable: false,
    icon: 'map',
    color: '#94a3b8',
    status: 'Active',
    relatedEntities: []
  },
  {
    id: 'project-boundary',
    name: 'Project Boundary',
    description: 'CAD boundary representing layout borders',
    defaultVisible: false,
    editable: false,
    icon: 'boundary',
    color: '#6366f1',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'fiber-nodes',
    name: 'Fiber Nodes',
    description: 'Manholes, handholes, vaults, and cabinets',
    defaultVisible: true,
    editable: true,
    icon: 'node',
    color: '#10b981',
    status: 'Active',
    relatedEntities: ['fiber_nodes']
  },
  {
    id: 'cameras',
    name: 'Cameras',
    description: 'CCTV poles, mounting fixtures, and cameras',
    defaultVisible: true,
    editable: true,
    icon: 'camera',
    color: '#eab308',
    status: 'Active',
    relatedEntities: ['camera_locations']
  },
  {
    id: 'camera-coverage',
    name: 'Camera Coverage',
    description: 'Lenses coverage cones and line of sight',
    defaultVisible: false,
    editable: false,
    icon: 'cone',
    color: '#a855f7',
    status: 'Future',
    relatedEntities: []
  },
  {
    id: 'fiber-routes',
    name: 'Fiber Routes',
    description: 'OSP conduits, ducts, aerial lines, and drops',
    defaultVisible: true,
    editable: true,
    icon: 'route',
    color: '#10b981',
    status: 'Active',
    relatedEntities: ['fiber_routes', 'fiber_route_segments']
  },
  {
    id: 'fiber-enclosures',
    name: 'Fiber Enclosures',
    description: 'Splice closures (dome, aerial, rack or wall mount)',
    defaultVisible: true,
    editable: true,
    icon: 'enclosure',
    color: '#ec4899',
    status: 'Active',
    relatedEntities: ['fiber_enclosures']
  },
  {
    id: 'splice-points',
    name: 'Splice Points',
    description: 'Fusion or mechanical fiber splices inside enclosures',
    defaultVisible: true,
    editable: true,
    icon: 'splice',
    color: '#8b5cf6',
    status: 'Partial',
    relatedEntities: ['fiber_splice_records', 'splice_trays']
  },
  {
    id: 'fiber-strands',
    name: 'Fiber Strands',
    description: 'Duplex TX/RX strands assignments and color coding',
    defaultVisible: true,
    editable: true,
    icon: 'strand',
    color: '#14b8a6',
    status: 'Active',
    relatedEntities: ['fiber_strands', 'camera_fiber_assignment_strands']
  },
  {
    id: 'patch-termination',
    name: 'Patch / Termination',
    description: 'FDU, FPP, and switch port patches',
    defaultVisible: true,
    editable: true,
    icon: 'patch',
    color: '#06b6d4',
    status: 'Partial',
    relatedEntities: ['fiber_distribution_units', 'fiber_patch_panels', 'switch_ports']
  },
  {
    id: 'network-devices',
    name: 'Network Devices',
    description: 'Industrial switches, NVRs, routers, and UPS units',
    defaultVisible: true,
    editable: true,
    icon: 'router',
    color: '#3b82f6',
    status: 'Active',
    relatedEntities: ['network_devices']
  },
  {
    id: 'switch-ports',
    name: 'Switch Ports',
    description: 'Physical interfaces, budgeting, and PoE draws',
    defaultVisible: true,
    editable: true,
    icon: 'port',
    color: '#3b82f6',
    status: 'Partial',
    relatedEntities: ['switch_ports']
  },
  {
    id: 'logical-network',
    name: 'Logical Network',
    description: 'Logical subnets, VLAN divisions, and IP structures',
    defaultVisible: false,
    editable: false,
    icon: 'logical',
    color: '#60a5fa',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'power-sources',
    name: 'Power Sources',
    description: 'Utility feeds, breakers, panels, and pedestals',
    defaultVisible: false,
    editable: false,
    icon: 'power',
    color: '#f59e0b',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'poe-sources',
    name: 'PoE Sources',
    description: 'PoE budget allocation and port consumption loads',
    defaultVisible: true,
    editable: true,
    icon: 'poe',
    color: '#f59e0b',
    status: 'Partial',
    relatedEntities: ['network_devices', 'switch_ports']
  },
  {
    id: 'backup-power',
    name: 'Backup Power',
    description: 'UPS units, backups, solar capacity, and runtimes',
    defaultVisible: true,
    editable: true,
    icon: 'ups',
    color: '#10b981',
    status: 'Partial',
    relatedEntities: ['network_devices']
  },
  {
    id: 'power-issues',
    name: 'Power Issues',
    description: 'Voltage drops, overloaded PoE switches, and failures',
    defaultVisible: true,
    editable: true,
    icon: 'alert',
    color: '#ef4444',
    status: 'Partial',
    relatedEntities: ['network_devices', 'camera_locations']
  },
  {
    id: 'wireless-radios',
    name: 'Wireless Radios',
    description: 'Active access points, subscriber modules, and receivers',
    defaultVisible: false,
    editable: false,
    icon: 'radio',
    color: '#a855f7',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'ptp-links',
    name: 'PtP Links',
    description: 'Point-to-Point dedicated wireless backhauls',
    defaultVisible: false,
    editable: false,
    icon: 'wireless-ptp',
    color: '#a855f7',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'ptmp-links',
    name: 'PtMP Links',
    description: 'Wireless sector coverage and client client branches',
    defaultVisible: false,
    editable: false,
    icon: 'wireless-ptmp',
    color: '#8b5cf6',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'wifi-bridges',
    name: 'Wi-Fi Bridges',
    description: 'Short range high throughput wireless bridging links',
    defaultVisible: false,
    editable: false,
    icon: 'wifi',
    color: '#6366f1',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'lte-5g-links',
    name: 'LTE / 5G Links',
    description: 'Cellular backhauls, SIM records, and secondary links',
    defaultVisible: false,
    editable: false,
    icon: 'cellular',
    color: '#3b82f6',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'wireless-issues',
    name: 'Wireless Issues',
    description: 'Line of Sight obstructions, RF interference, and outages',
    defaultVisible: false,
    editable: false,
    icon: 'alert',
    color: '#ef4444',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'field-tasks',
    name: 'Field Tasks',
    description: 'Field installation checklists and audit history',
    defaultVisible: true,
    editable: true,
    icon: 'task',
    color: '#a855f7',
    status: 'Active',
    relatedEntities: ['camera_tasks', 'field_tasks']
  },
  {
    id: 'installation-status',
    name: 'Installation Status',
    description: 'Progress track of OSP cabling and structure mounts',
    defaultVisible: false,
    editable: false,
    icon: 'install',
    color: '#8b5cf6',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'qa-testing',
    name: 'QA / Testing',
    description: 'Pre-commissioning tests and QA signatures log',
    defaultVisible: false,
    editable: false,
    icon: 'check',
    color: '#06b6d4',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'blocked-conduit',
    name: 'Blocked Conduit',
    description: 'Conduits blocked by dirt or utility conflicts',
    defaultVisible: false,
    editable: false,
    icon: 'blockage',
    color: '#f97316',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'damaged-fiber',
    name: 'Damaged Fiber',
    description: 'Cuts, bends, and high-loss fiber splices warnings',
    defaultVisible: false,
    editable: false,
    icon: 'cut',
    color: '#ef4444',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'no-power',
    name: 'No Power',
    description: 'Cameras or cabinets without active power feeds',
    defaultVisible: false,
    editable: false,
    icon: 'no-power',
    color: '#ef4444',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'access-issue',
    name: 'Access Issue',
    description: 'Right-of-way permissions or physical site blocks',
    defaultVisible: false,
    editable: false,
    icon: 'lock',
    color: '#ef4444',
    status: 'Planned',
    relatedEntities: []
  },
  {
    id: 'verified-installed-assets',
    name: 'Verified Installed Assets',
    description: 'As-built verification of hardware placement',
    defaultVisible: false,
    editable: false,
    icon: 'asbuilt-asset',
    color: '#22c55e',
    status: 'Future',
    relatedEntities: []
  },
  {
    id: 'tested-fiber',
    name: 'Tested Fiber',
    description: 'OTDR testing trace curves and validation signature',
    defaultVisible: false,
    editable: false,
    icon: 'asbuilt-fiber',
    color: '#22c55e',
    status: 'Future',
    relatedEntities: []
  },
  {
    id: 'accepted-cameras',
    name: 'Accepted Cameras',
    description: 'Visual video feeds and client acceptance sign-off',
    defaultVisible: false,
    editable: false,
    icon: 'asbuilt-camera',
    color: '#22c55e',
    status: 'Future',
    relatedEntities: []
  }
]

export const CATEGORY_MAPPINGS: Record<LayerCategory, string[]> = {
  'Site': ['base-map', 'project-boundary', 'fiber-nodes'],
  'Cameras': ['cameras', 'camera-coverage'],
  'Fiber': ['fiber-routes', 'fiber-nodes', 'fiber-enclosures', 'splice-points', 'fiber-strands', 'patch-termination'],
  'Network': ['network-devices', 'switch-ports', 'logical-network'],
  'Power': ['power-sources', 'poe-sources', 'backup-power', 'power-issues'],
  'Wireless': ['wireless-radios', 'ptp-links', 'ptmp-links', 'wifi-bridges', 'lte-5g-links', 'wireless-issues'],
  'Field Work': ['field-tasks', 'installation-status', 'qa-testing'],
  'Issues': ['blocked-conduit', 'damaged-fiber', 'no-power', 'access-issue'],
  'As-Built': ['verified-installed-assets', 'tested-fiber', 'accepted-cameras']
}
