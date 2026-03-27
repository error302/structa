// ─────────────────────────────────────────────────────────────
// KENYA NCA COMPLIANCE RULES — MOMBASA COUNTY
// Sources:
//   • Physical Planning Act Cap 286
//   • NCA Act No. 41 of 2011
//   • Mombasa County Building Code 2015
//   • Public Health Act Cap 242
//   • NEMA Environmental Management Act
// ─────────────────────────────────────────────────────────────

export interface ComplianceRule {
  code: string
  name: string
  category: ComplianceCategory
  isMandatory: boolean
  reference: string
  description: string
  check: (input: ComplianceInput) => RuleResult
}

export type ComplianceCategory =
  | 'setbacks'
  | 'room_sizes'
  | 'floor_area_ratio'
  | 'plot_coverage'
  | 'heights'
  | 'parking'
  | 'sanitation'
  | 'ventilation'
  | 'fire_safety'
  | 'accessibility'
  | 'structural'
  | 'environmental'

export interface ComplianceInput {
  buildingType: 'residential' | 'commercial' | 'industrial' | 'mixed'
  county: string
  zone: 'high_density' | 'medium_density' | 'low_density' | 'commercial' | 'industrial'
  plotArea: number           // m²
  totalFloorArea: number     // m²
  buildingFootprint: number  // m²
  floors: number
  buildingHeight: number     // meters
  rooms: {
    name: string
    area: number             // m²
    hasWindow: boolean
    hasVentilation: boolean
    floor: number
  }[]
  setbacks: {
    front: number            // meters from boundary
    rear: number
    left: number
    right: number
  }
  parkingSpaces: number
  hasRamp: boolean           // disability access
  bathroomCount: number
  hasFireExit: boolean
  hasFireExtinguisher: boolean
  distanceToSewage: number   // meters
  hasSewerConnection: boolean
  hasSepticTank: boolean
  nearCoast: boolean         // within 60m of high water mark
  treeCount: number          // trees to be removed
}

export interface RuleResult {
  status: 'passed' | 'warning' | 'failed'
  actualValue: string
  requiredValue: string
  message: string
  recommendation: string
}

// ─────────────────────────────────────────────
// MOMBASA COUNTY SPECIFIC SETBACK REQUIREMENTS
// ─────────────────────────────────────────────
const MOMBASA_SETBACKS: Record<string, Record<string, { front: number; rear: number; side: number }>> = {
  residential: {
    high_density:   { front: 3, rear: 2, side: 1.5 },
    medium_density: { front: 4.5, rear: 3, side: 2 },
    low_density:    { front: 6, rear: 4.5, side: 3 },
  },
  commercial: {
    commercial:     { front: 4.5, rear: 3, side: 2 },
    high_density:   { front: 3, rear: 2, side: 1.5 },
  },
  industrial: {
    industrial:     { front: 9, rear: 4.5, side: 4.5 },
  },
  mixed: {
    medium_density: { front: 4.5, rear: 3, side: 2 },
  },
}

const MINIMUM_ROOM_SIZES = {
  bedroom:          9,    // m² minimum
  master_bedroom:   12,   // m²
  living_room:      15,   // m²
  kitchen:          6,    // m²
  bathroom:         2.5,  // m²
  dining_room:      8,    // m²
  study:            6,    // m²
  store:            3,    // m²
}

const PLOT_COVERAGE_LIMITS = {
  high_density:   0.60,  // 60% max
  medium_density: 0.50,  // 50% max
  low_density:    0.40,  // 40% max
  commercial:     0.70,  // 70% max
  industrial:     0.60,  // 60% max
}

const FLOOR_AREA_RATIOS = {
  high_density:   2.5,
  medium_density: 1.5,
  low_density:    0.8,
  commercial:     3.0,
  industrial:     1.5,
}

const HEIGHT_LIMITS = {
  high_density:   30,    // meters
  medium_density: 15,
  low_density:    9,
  commercial:     45,
  industrial:     15,
}

// ─────────────────────────────────────────────
// ALL COMPLIANCE RULES
// ─────────────────────────────────────────────
export const COMPLIANCE_RULES: ComplianceRule[] = [

  // ── SETBACKS ────────────────────────────────
  {
    code: 'SET-001',
    name: 'Front Setback',
    category: 'setbacks',
    isMandatory: true,
    reference: 'Mombasa County Building Code 2015 — Section 4.2',
    description: 'Minimum distance from front boundary to building face',
    check: (input) => {
      const required = MOMBASA_SETBACKS[input.buildingType]?.[input.zone]?.front
        ?? MOMBASA_SETBACKS.residential.medium_density.front
      const actual = input.setbacks.front
      if (actual >= required) {
        return {
          status: 'passed',
          actualValue: `${actual}m`,
          requiredValue: `${required}m minimum`,
          message: `Front setback of ${actual}m meets the ${required}m requirement`,
          recommendation: '',
        }
      }
      return {
        status: 'failed',
        actualValue: `${actual}m`,
        requiredValue: `${required}m minimum`,
        message: `Front setback of ${actual}m is less than the required ${required}m`,
        recommendation: `Move the building ${(required - actual).toFixed(1)}m further from the front boundary`,
      }
    },
  },

  {
    code: 'SET-002',
    name: 'Rear Setback',
    category: 'setbacks',
    isMandatory: true,
    reference: 'Mombasa County Building Code 2015 — Section 4.3',
    description: 'Minimum distance from rear boundary to building',
    check: (input) => {
      const required = MOMBASA_SETBACKS[input.buildingType]?.[input.zone]?.rear
        ?? MOMBASA_SETBACKS.residential.medium_density.rear
      const actual = input.setbacks.rear
      if (actual >= required) {
        return {
          status: 'passed',
          actualValue: `${actual}m`,
          requiredValue: `${required}m minimum`,
          message: `Rear setback of ${actual}m meets requirement`,
          recommendation: '',
        }
      }
      return {
        status: 'failed',
        actualValue: `${actual}m`,
        requiredValue: `${required}m minimum`,
        message: `Rear setback of ${actual}m is insufficient`,
        recommendation: `Increase rear setback to ${required}m`,
      }
    },
  },

  {
    code: 'SET-003',
    name: 'Side Setbacks',
    category: 'setbacks',
    isMandatory: true,
    reference: 'Mombasa County Building Code 2015 — Section 4.4',
    description: 'Minimum side boundary distances',
    check: (input) => {
      const required = MOMBASA_SETBACKS[input.buildingType]?.[input.zone]?.side
        ?? MOMBASA_SETBACKS.residential.medium_density.side
      const minSide = Math.min(input.setbacks.left, input.setbacks.right)
      if (minSide >= required) {
        return {
          status: 'passed',
          actualValue: `L:${input.setbacks.left}m R:${input.setbacks.right}m`,
          requiredValue: `${required}m minimum each side`,
          message: 'Side setbacks meet requirements',
          recommendation: '',
        }
      }
      return {
        status: 'failed',
        actualValue: `L:${input.setbacks.left}m R:${input.setbacks.right}m`,
        requiredValue: `${required}m minimum each side`,
        message: `One or both side setbacks are below the required ${required}m`,
        recommendation: `Increase side setbacks to minimum ${required}m on both sides`,
      }
    },
  },

  {
    code: 'SET-004',
    name: 'Coastal Setback',
    category: 'setbacks',
    isMandatory: true,
    reference: 'NEMA — Environmental Management and Coordination Act — Section 57',
    description: 'Buildings within 60m of high water mark require NEMA approval',
    check: (input) => {
      if (!input.nearCoast) {
        return {
          status: 'passed',
          actualValue: 'Not within coastal zone',
          requiredValue: 'N/A',
          message: 'Building is not in the coastal setback zone',
          recommendation: '',
        }
      }
      return {
        status: 'warning',
        actualValue: 'Within 60m of high water mark',
        requiredValue: 'NEMA approval required',
        message: 'This building is in the coastal buffer zone',
        recommendation: 'Obtain NEMA Environmental Impact Assessment approval before submitting to county. Allow 60-90 days for NEMA review.',
      }
    },
  },

  // ── PLOT COVERAGE ────────────────────────────
  {
    code: 'COV-001',
    name: 'Plot Coverage Ratio',
    category: 'plot_coverage',
    isMandatory: true,
    reference: 'Physical Planning Act Cap 286 — Section 23',
    description: 'Maximum percentage of plot that can be covered by building footprint',
    check: (input) => {
      const limit = PLOT_COVERAGE_LIMITS[input.zone] ?? 0.5
      const actual = input.buildingFootprint / input.plotArea
      const actualPct = (actual * 100).toFixed(1)
      const limitPct = (limit * 100).toFixed(0)
      if (actual <= limit) {
        return {
          status: 'passed',
          actualValue: `${actualPct}%`,
          requiredValue: `${limitPct}% maximum`,
          message: `Plot coverage of ${actualPct}% is within the ${limitPct}% limit`,
          recommendation: '',
        }
      }
      return {
        status: 'failed',
        actualValue: `${actualPct}%`,
        requiredValue: `${limitPct}% maximum`,
        message: `Plot coverage of ${actualPct}% exceeds the ${limitPct}% maximum`,
        recommendation: `Reduce building footprint by ${((actual - limit) * input.plotArea).toFixed(0)}m² or apply for variance`,
      }
    },
  },

  // ── FLOOR AREA RATIO ─────────────────────────
  {
    code: 'FAR-001',
    name: 'Floor Area Ratio (FAR)',
    category: 'floor_area_ratio',
    isMandatory: true,
    reference: 'Physical Planning Act Cap 286 — Section 24',
    description: 'Maximum ratio of total floor area to plot area',
    check: (input) => {
      const limit = FLOOR_AREA_RATIOS[input.zone] ?? 1.5
      const actual = input.totalFloorArea / input.plotArea
      if (actual <= limit) {
        return {
          status: 'passed',
          actualValue: actual.toFixed(2),
          requiredValue: `${limit} maximum`,
          message: `FAR of ${actual.toFixed(2)} is within the ${limit} limit`,
          recommendation: '',
        }
      }
      return {
        status: 'failed',
        actualValue: actual.toFixed(2),
        requiredValue: `${limit} maximum`,
        message: `FAR of ${actual.toFixed(2)} exceeds the maximum of ${limit}`,
        recommendation: `Reduce total floor area by ${((actual - limit) * input.plotArea).toFixed(0)}m²`,
      }
    },
  },

  // ── BUILDING HEIGHT ──────────────────────────
  {
    code: 'HGT-001',
    name: 'Building Height Limit',
    category: 'heights',
    isMandatory: true,
    reference: 'Mombasa County Building Code 2015 — Section 7.1',
    description: 'Maximum building height for the zone',
    check: (input) => {
      const limit = HEIGHT_LIMITS[input.zone] ?? 15
      if (input.buildingHeight <= limit) {
        return {
          status: 'passed',
          actualValue: `${input.buildingHeight}m`,
          requiredValue: `${limit}m maximum`,
          message: `Building height of ${input.buildingHeight}m is within the ${limit}m limit`,
          recommendation: '',
        }
      }
      return {
        status: 'failed',
        actualValue: `${input.buildingHeight}m`,
        requiredValue: `${limit}m maximum`,
        message: `Building height of ${input.buildingHeight}m exceeds the ${limit}m limit for this zone`,
        recommendation: `Reduce building height or apply for high-rise approval from the county`,
      }
    },
  },

  // ── ROOM SIZES ───────────────────────────────
  {
    code: 'ROM-001',
    name: 'Minimum Room Sizes',
    category: 'room_sizes',
    isMandatory: true,
    reference: 'Public Health Act Cap 242 — Section 108',
    description: 'All habitable rooms must meet minimum area requirements',
    check: (input) => {
      const failures: string[] = []
      const warnings: string[] = []

      for (const room of input.rooms) {
        const nameLower = room.name.toLowerCase()
        let minSize: number | undefined

        if (nameLower.includes('master')) minSize = MINIMUM_ROOM_SIZES.master_bedroom
        else if (nameLower.includes('bedroom') || nameLower.includes('bed')) minSize = MINIMUM_ROOM_SIZES.bedroom
        else if (nameLower.includes('living') || nameLower.includes('lounge') || nameLower.includes('sitting')) minSize = MINIMUM_ROOM_SIZES.living_room
        else if (nameLower.includes('kitchen')) minSize = MINIMUM_ROOM_SIZES.kitchen
        else if (nameLower.includes('bathroom') || nameLower.includes('toilet') || nameLower.includes('wc')) minSize = MINIMUM_ROOM_SIZES.bathroom
        else if (nameLower.includes('dining')) minSize = MINIMUM_ROOM_SIZES.dining_room
        else if (nameLower.includes('study') || nameLower.includes('office')) minSize = MINIMUM_ROOM_SIZES.study

        if (minSize && room.area < minSize) {
          failures.push(`${room.name}: ${room.area}m² (min ${minSize}m²)`)
        } else if (minSize && room.area < minSize * 1.1) {
          warnings.push(`${room.name}: ${room.area}m² is close to minimum ${minSize}m²`)
        }
      }

      if (failures.length === 0 && warnings.length === 0) {
        return {
          status: 'passed',
          actualValue: `${input.rooms.length} rooms checked`,
          requiredValue: 'All rooms meet minimums',
          message: 'All rooms meet minimum size requirements',
          recommendation: '',
        }
      }
      if (failures.length > 0) {
        return {
          status: 'failed',
          actualValue: failures.join(', '),
          requiredValue: 'See NCA minimum room sizes',
          message: `${failures.length} room(s) below minimum size: ${failures.join('; ')}`,
          recommendation: 'Increase room dimensions to meet NCA minimums before submission',
        }
      }
      return {
        status: 'warning',
        actualValue: warnings.join(', '),
        requiredValue: 'Rooms should comfortably exceed minimums',
        message: `${warnings.length} room(s) are close to minimum size`,
        recommendation: 'Consider increasing room sizes slightly for better liveability and resale value',
      }
    },
  },

  // ── VENTILATION ──────────────────────────────
  {
    code: 'VEN-001',
    name: 'Natural Ventilation',
    category: 'ventilation',
    isMandatory: true,
    reference: 'Public Health Act Cap 242 — Section 106',
    description: 'All habitable rooms must have natural light and ventilation',
    check: (input) => {
      const habitable = input.rooms.filter(r => {
        const n = r.name.toLowerCase()
        return n.includes('bedroom') || n.includes('living') ||
               n.includes('dining') || n.includes('kitchen') || n.includes('study')
      })
      const withoutVent = habitable.filter(r => !r.hasWindow || !r.hasVentilation)

      if (withoutVent.length === 0) {
        return {
          status: 'passed',
          actualValue: `${habitable.length}/${habitable.length} rooms ventilated`,
          requiredValue: '100% of habitable rooms',
          message: 'All habitable rooms have natural light and ventilation',
          recommendation: '',
        }
      }
      return {
        status: 'failed',
        actualValue: `${withoutVent.map(r => r.name).join(', ')} lack ventilation`,
        requiredValue: 'All habitable rooms must have openable windows',
        message: `${withoutVent.length} habitable room(s) lack adequate natural ventilation`,
        recommendation: 'Add openable windows to all bedrooms, living areas, and kitchen — minimum window area = 1/10th of floor area',
      }
    },
  },

  // ── SANITATION ───────────────────────────────
  {
    code: 'SAN-001',
    name: 'Bathroom Provision',
    category: 'sanitation',
    isMandatory: true,
    reference: 'Public Health Act Cap 242 — Section 112',
    description: 'Minimum bathroom provision per occupancy',
    check: (input) => {
      const bedrooms = input.rooms.filter(r => r.name.toLowerCase().includes('bedroom')).length
      const requiredBathrooms = Math.ceil(bedrooms / 3) // 1 bathroom per 3 bedrooms
      if (input.bathroomCount >= requiredBathrooms) {
        return {
          status: 'passed',
          actualValue: `${input.bathroomCount} bathroom(s)`,
          requiredValue: `${requiredBathrooms} minimum`,
          message: `Bathroom provision of ${input.bathroomCount} meets the minimum of ${requiredBathrooms}`,
          recommendation: '',
        }
      }
      return {
        status: 'failed',
        actualValue: `${input.bathroomCount} bathroom(s)`,
        requiredValue: `${requiredBathrooms} minimum for ${bedrooms} bedrooms`,
        message: `Insufficient bathrooms — ${bedrooms} bedrooms require at least ${requiredBathrooms}`,
        recommendation: `Add ${requiredBathrooms - input.bathroomCount} more bathroom(s) to comply`,
      }
    },
  },

  {
    code: 'SAN-002',
    name: 'Sewage Disposal',
    category: 'sanitation',
    isMandatory: true,
    reference: 'Public Health Act Cap 242 — Section 115',
    description: 'Adequate sewage disposal system required',
    check: (input) => {
      if (input.hasSewerConnection) {
        return {
          status: 'passed',
          actualValue: 'Connected to municipal sewer',
          requiredValue: 'Approved sewage disposal',
          message: 'Building is connected to municipal sewerage system',
          recommendation: '',
        }
      }
      if (input.hasSepticTank) {
        return {
          status: 'warning',
          actualValue: 'Septic tank system',
          requiredValue: 'Approved sewage disposal',
          message: 'Septic tank proposed — ensure it is designed by a registered engineer and approved by public health',
          recommendation: 'Submit septic tank design to Mombasa County Public Health office for approval. Minimum capacity: 2,000 litres for a 3-bedroom house.',
        }
      }
      return {
        status: 'failed',
        actualValue: 'No sewage system specified',
        requiredValue: 'Municipal connection or approved septic system',
        message: 'No sewage disposal system has been specified',
        recommendation: 'Connect to Mombasa Water & Sewerage Company sewer line if available, otherwise design an approved septic tank system',
      }
    },
  },

  // ── PARKING ──────────────────────────────────
  {
    code: 'PRK-001',
    name: 'Parking Provision',
    category: 'parking',
    isMandatory: true,
    reference: 'Mombasa County Building Code 2015 — Section 11',
    description: 'Minimum off-street parking spaces',
    check: (input) => {
      const bedrooms = input.rooms.filter(r => r.name.toLowerCase().includes('bedroom')).length
      let required = 0

      if (input.buildingType === 'residential') {
        required = bedrooms <= 2 ? 1 : Math.ceil(bedrooms / 2)
      } else if (input.buildingType === 'commercial') {
        required = Math.ceil(input.totalFloorArea / 50) // 1 space per 50m² GFA
      }

      if (input.parkingSpaces >= required) {
        return {
          status: 'passed',
          actualValue: `${input.parkingSpaces} space(s)`,
          requiredValue: `${required} minimum`,
          message: `Parking provision of ${input.parkingSpaces} meets the ${required} space minimum`,
          recommendation: '',
        }
      }
      if (input.parkingSpaces >= required * 0.75) {
        return {
          status: 'warning',
          actualValue: `${input.parkingSpaces} space(s)`,
          requiredValue: `${required} minimum`,
          message: `Parking is slightly below requirement`,
          recommendation: `Add ${required - input.parkingSpaces} more parking space(s) or apply for waiver`,
        }
      }
      return {
        status: 'failed',
        actualValue: `${input.parkingSpaces} space(s)`,
        requiredValue: `${required} minimum`,
        message: `Only ${input.parkingSpaces} parking space(s) provided — ${required} required`,
        recommendation: `Provide ${required - input.parkingSpaces} additional parking space(s). Each bay minimum 2.5m x 5m.`,
      }
    },
  },

  // ── FIRE SAFETY ──────────────────────────────
  {
    code: 'FIR-001',
    name: 'Fire Exits',
    category: 'fire_safety',
    isMandatory: true,
    reference: 'NCA Act — Building Code Part F',
    description: 'Adequate fire exits required for all buildings',
    check: (input) => {
      if (input.floors <= 2 && input.buildingType === 'residential') {
        return {
          status: 'passed',
          actualValue: 'Low-rise residential',
          requiredValue: 'Standard exits sufficient',
          message: 'Low-rise residential buildings are served by standard door exits',
          recommendation: '',
        }
      }
      if (input.hasFireExit) {
        return {
          status: 'passed',
          actualValue: 'Fire exit provided',
          requiredValue: 'Dedicated fire exit',
          message: 'Building has dedicated fire exit routes',
          recommendation: '',
        }
      }
      return {
        status: 'failed',
        actualValue: 'No dedicated fire exit',
        requiredValue: 'Dedicated fire exit required for 3+ storey buildings',
        message: 'Buildings of 3 or more floors require dedicated fire escape routes',
        recommendation: 'Add a dedicated fire exit staircase. Submit fire safety plan to Kenya Fire Brigade for approval.',
      }
    },
  },

  {
    code: 'FIR-002',
    name: 'Fire Extinguishers',
    category: 'fire_safety',
    isMandatory: false,
    reference: 'NCA Act — Building Code Part F.3',
    description: 'Fire extinguisher provision',
    check: (input) => {
      if (input.hasFireExtinguisher) {
        return {
          status: 'passed',
          actualValue: 'Specified in plan',
          requiredValue: 'Fire extinguisher points',
          message: 'Fire extinguisher provision is included',
          recommendation: '',
        }
      }
      return {
        status: 'warning',
        actualValue: 'Not specified',
        requiredValue: 'Recommended — mandatory for commercial',
        message: 'Fire extinguisher points not specified in plans',
        recommendation: input.buildingType === 'commercial'
          ? 'Fire extinguishers are mandatory for commercial buildings — add to MEP drawings'
          : 'Recommend adding fire extinguisher points — 1 per floor minimum',
      }
    },
  },

  // ── ACCESSIBILITY ────────────────────────────
  {
    code: 'ACC-001',
    name: 'Disability Access',
    category: 'accessibility',
    isMandatory: false,
    reference: 'Persons with Disabilities Act 2003 — Section 21',
    description: 'Ramp access for persons with disabilities',
    check: (input) => {
      if (input.buildingType === 'residential' && input.floors === 1) {
        return {
          status: 'passed',
          actualValue: 'Single storey residential',
          requiredValue: 'Ramp recommended',
          message: 'Single storey residential — step-free access recommended but not mandatory',
          recommendation: 'Consider adding a gentle ramp at the main entrance for future accessibility',
        }
      }
      if (input.hasRamp) {
        return {
          status: 'passed',
          actualValue: 'Ramp provided',
          requiredValue: 'Ramp or lift required',
          message: 'Disability ramp access is provided',
          recommendation: '',
        }
      }
      if (input.buildingType === 'commercial') {
        return {
          status: 'failed',
          actualValue: 'No ramp specified',
          requiredValue: 'Mandatory for commercial buildings',
          message: 'Commercial buildings must provide wheelchair-accessible entrance',
          recommendation: 'Add ramp at main entrance — gradient max 1:12, minimum width 1.2m, with handrails',
        }
      }
      return {
        status: 'warning',
        actualValue: 'No ramp specified',
        requiredValue: 'Recommended for multi-storey',
        message: 'No disability ramp specified for multi-storey building',
        recommendation: 'Strongly recommend adding ramp access — max gradient 1:12, minimum 1.2m wide',
      }
    },
  },

  // ── ENVIRONMENTAL ────────────────────────────
  {
    code: 'ENV-001',
    name: 'Tree Removal',
    category: 'environmental',
    isMandatory: false,
    reference: 'NEMA — Environmental Management and Coordination Act',
    description: 'Tree removal requires NEMA notification',
    check: (input) => {
      if (input.treeCount === 0) {
        return {
          status: 'passed',
          actualValue: 'No trees to be removed',
          requiredValue: 'N/A',
          message: 'No trees are being removed — no NEMA notification required',
          recommendation: '',
        }
      }
      if (input.treeCount <= 5) {
        return {
          status: 'warning',
          actualValue: `${input.treeCount} tree(s) to be removed`,
          requiredValue: 'NEMA notification',
          message: `${input.treeCount} tree(s) will be removed — notify NEMA and replace at 3:1 ratio`,
          recommendation: `Plant ${input.treeCount * 3} replacement trees on or near the site and notify NEMA`,
        }
      }
      return {
        status: 'failed',
        actualValue: `${input.treeCount} trees to be removed`,
        requiredValue: 'NEMA Environmental Impact Assessment',
        message: `Removal of ${input.treeCount} trees requires a full Environmental Impact Assessment`,
        recommendation: 'Engage a NEMA-registered EIA expert to conduct assessment before construction begins',
      }
    },
  },
]
