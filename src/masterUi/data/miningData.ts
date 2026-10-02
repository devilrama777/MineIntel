export interface MineLocation {
  id: string;
  name: string;
  subsidiary: 'SECL' | 'MCL' | 'NCL' | 'CCL' | 'BCCL' | 'ECL' | 'WCL' | 'SCCL';
  state: string;
  district: string;
  type: 'Opencast (OCP)' | 'Underground (UG)' | 'Mixed Mega Project';
  lat: number;
  lng: number;
  annualCapacityMT: number;
  reportsCount: number;
  topicsCount: number;
  emergingTopicsCount: number;
  activeAlerts: number;
  status: 'Operational - High Yield' | 'Critical Monitoring' | 'Expansion Phase' | 'Normal Operations';
  strippingRatio?: string;
  primaryCoalGrade: string;
  latestReportDate: string;
  highlightMetric: string;
}

export interface TopicItem {
  id: string;
  name: string;
  category: 'Geotechnical & Strata' | 'Hydrogeology & Water' | 'Exploration & Reserves' | 'Mine Safety & Hazards' | 'Environmental & ESG' | 'Heavy Mechanization';
  keywords: string[];
  documentsCount: number;
  coherenceScore: number; // e.g. 91%
  growthPercent: number; // e.g. +43%
  status: 'emerging' | 'stable' | 'declining';
  trend2020_2026: { year: number; mentions: number }[];
  affectedMinesCount: number;
  topMines: string[];
  summary: string;
  dgmsRelevance: string;
}

export interface KeywordItem {
  term: string;
  occurrences: number;
  tfIdfScore: number;
  semanticRelevance: number;
  category: string;
  relatedTopics: string[];
  relatedDocuments: string[];
  trend: 'up' | 'stable' | 'down';
  growth: string;
}

export interface MiningReport {
  id: string;
  title: string;
  mineId: string;
  mineName: string;
  subsidiary: string;
  reportType: 'Geological Assessment' | 'Hydrogeological Survey' | 'Slope Stability Audit' | 'Safety & DGMS Compliance' | 'Feasibility & Reserves' | 'Environmental Impact';
  year: number;
  date: string;
  author: string;
  topics: string[];
  status: 'Processed' | 'Verified' | 'Under Review';
  fileSize: string;
  coherenceIndex: number;
  pages: number;
  abstract: string;
  keyFindings: string[];
  strataData?: { seam: string; depthMeters: number; thicknessMeters: number; grade: string }[];
}

export interface EmergingAlert {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  topic: string;
  growthPercent: number;
  affectedMines: string[];
  affectedMinesCount: number;
  reportsCount: number;
  detectedDate: string;
  status: 'Active' | 'Under Investigation' | 'Resolved';
  triggerDescription: string;
  recommendedAction: string;
  primaryRisk: string;
}

export interface AIInsightItem {
  id: string;
  title: string;
  headline: string;
  growthPercent: number;
  period: string;
  category: string;
  evidenceReportsCount: number;
  evidenceMinesCount: number;
  relatedTopics: string[];
  relevantDocuments: { id: string; title: string; mine: string; year: number }[];
  detailedAnalysis: string;
  operationalImpact: string;
  recommendedIntervention: string;
}

// ==========================================
// 1. MINES REPOSITORY (Real CIL/CMPDI Sites)
// ==========================================
export const MINES_DATA: MineLocation[] = [
  {
    id: 'mine-korba-gevra',
    name: 'Gevra Expansion Mega OCP',
    subsidiary: 'SECL',
    state: 'Chhattisgarh',
    district: 'Korba',
    type: 'Opencast (OCP)',
    lat: 22.3511,
    lng: 82.6841,
    annualCapacityMT: 52.5,
    reportsCount: 143,
    topicsCount: 24,
    emergingTopicsCount: 3,
    activeAlerts: 2,
    status: 'Operational - High Yield',
    strippingRatio: '1:1.82 (m3/t)',
    primaryCoalGrade: 'G11 - Non-Coking',
    latestReportDate: '2026-02-18',
    highlightMetric: 'Largest opencast coal pit in Asia, 42 m3 rope shovels active',
  },
  {
    id: 'mine-korba-kusmunda',
    name: 'Kusmunda Colliery OCP',
    subsidiary: 'SECL',
    state: 'Chhattisgarh',
    district: 'Korba',
    type: 'Opencast (OCP)',
    lat: 22.3382,
    lng: 82.7125,
    annualCapacityMT: 43.2,
    reportsCount: 118,
    topicsCount: 19,
    emergingTopicsCount: 2,
    activeAlerts: 1,
    status: 'Operational - High Yield',
    strippingRatio: '1:1.64 (m3/t)',
    primaryCoalGrade: 'G11/G12 Power Grade',
    latestReportDate: '2026-01-24',
    highlightMetric: 'Surface continuous miners and in-pit conveyor circuit',
  },
  {
    id: 'mine-korba-dipka',
    name: 'Dipka Mega Project',
    subsidiary: 'SECL',
    state: 'Chhattisgarh',
    district: 'Korba',
    type: 'Opencast (OCP)',
    lat: 22.3195,
    lng: 82.5934,
    annualCapacityMT: 34.0,
    reportsCount: 96,
    topicsCount: 17,
    emergingTopicsCount: 2,
    activeAlerts: 1,
    status: 'Operational - High Yield',
    strippingRatio: '1:1.45 (m3/t)',
    primaryCoalGrade: 'G12 Power Grade',
    latestReportDate: '2026-03-02',
    highlightMetric: 'Water diversion canal & highwall radar monitoring active',
  },
  {
    id: 'mine-singrauli-jayant',
    name: 'Jayant Colliery OCP',
    subsidiary: 'NCL',
    state: 'Madhya Pradesh',
    district: 'Singrauli',
    type: 'Opencast (OCP)',
    lat: 24.1167,
    lng: 82.6500,
    annualCapacityMT: 24.1,
    reportsCount: 104,
    topicsCount: 21,
    emergingTopicsCount: 2,
    activeAlerts: 1,
    status: 'Operational - High Yield',
    strippingRatio: '1:2.45 (m3/t)',
    primaryCoalGrade: 'G9/G10 Sub-bituminous',
    latestReportDate: '2026-02-10',
    highlightMetric: 'Heavy walking draglines with Merry-Go-Round rail link to NTPC',
  },
  {
    id: 'mine-singrauli-bina',
    name: 'Bina Project OCP',
    subsidiary: 'NCL',
    state: 'Uttar Pradesh / MP',
    district: 'Sonbhadra / Singrauli',
    type: 'Opencast (OCP)',
    lat: 24.1685,
    lng: 82.7842,
    annualCapacityMT: 15.4,
    reportsCount: 88,
    topicsCount: 16,
    emergingTopicsCount: 1,
    activeAlerts: 0,
    status: 'Normal Operations',
    strippingRatio: '1:2.10 (m3/t)',
    primaryCoalGrade: 'G8 Non-Coking',
    latestReportDate: '2025-12-14',
    highlightMetric: 'Integrated coal washery with automated ash telemetry',
  },
  {
    id: 'mine-talcher-bhubaneswari',
    name: 'Bhubaneswari OCP',
    subsidiary: 'MCL',
    state: 'Odisha',
    district: 'Angul (Talcher Coalfield)',
    type: 'Opencast (OCP)',
    lat: 20.9500,
    lng: 85.2167,
    annualCapacityMT: 28.4,
    reportsCount: 132,
    topicsCount: 22,
    emergingTopicsCount: 4,
    activeAlerts: 2,
    status: 'Operational - High Yield',
    strippingRatio: '1:0.85 (m3/t)',
    primaryCoalGrade: 'G12/G13 Power Grade',
    latestReportDate: '2026-03-12',
    highlightMetric: 'First-Mile Connectivity rapid loading silo dispatching 104 rakes/day',
  },
  {
    id: 'mine-jharia-moonidih',
    name: 'Moonidih Deep UG Project',
    subsidiary: 'BCCL',
    state: 'Jharkhand',
    district: 'Dhanbad (Jharia Coalfield)',
    type: 'Underground (UG)',
    lat: 23.7431,
    lng: 86.3542,
    annualCapacityMT: 1.85,
    reportsCount: 112,
    topicsCount: 25,
    emergingTopicsCount: 3,
    activeAlerts: 3,
    status: 'Critical Monitoring',
    strippingRatio: 'N/A (Depth 520m)',
    primaryCoalGrade: 'Steel Grade-I / Coking Coal',
    latestReportDate: '2026-02-28',
    highlightMetric: 'Mechanized Longwall face with continuous CBM degasification',
  },
  {
    id: 'mine-sccle-ramagundam',
    name: 'Ramagundam OCP-III Mega Project',
    subsidiary: 'SCCL',
    state: 'Telangana',
    district: 'Peddapalli (Godavari Valley)',
    type: 'Opencast (OCP)',
    lat: 18.7612,
    lng: 79.5134,
    annualCapacityMT: 12.8,
    reportsCount: 79,
    topicsCount: 18,
    emergingTopicsCount: 1,
    activeAlerts: 0,
    status: 'Normal Operations',
    strippingRatio: '1:3.20 (m3/t)',
    primaryCoalGrade: 'G10 Non-Coking',
    latestReportDate: '2025-11-20',
    highlightMetric: 'Highwall slope stability radar and eco-restoration afforestation',
  },
];

// ==========================================
// 2. TOPICS REPOSITORY
// ==========================================
export const TOPICS_DATA: TopicItem[] = [
  {
    id: 'topic-coal-seam',
    name: 'Coal Seam Characterization',
    category: 'Exploration & Reserves',
    keywords: ['Coal', 'Seam', 'Strata', 'Thickness', 'Volatile Matter', 'Ash Content', 'Core Sample'],
    documentsCount: 238,
    coherenceScore: 91,
    growthPercent: 12,
    status: 'stable',
    trend2020_2026: [
      { year: 2020, mentions: 180 },
      { year: 2021, mentions: 195 },
      { year: 2022, mentions: 210 },
      { year: 2023, mentions: 220 },
      { year: 2024, mentions: 228 },
      { year: 2025, mentions: 234 },
      { year: 2026, mentions: 238 },
    ],
    affectedMinesCount: 8,
    topMines: ['Gevra Expansion OCP', 'Jayant Colliery OCP', 'Bhubaneswari OCP'],
    summary: 'Lithological profiling and borehole petrographic assay determining gross calorific value (GCV) and stratigraphical split seams.',
    dgmsRelevance: 'Statutory geological reserve classification under Coal Mines Regulations 2017.',
  },
  {
    id: 'topic-water-ingress',
    name: 'Water Ingress & Aquifer Breaching',
    category: 'Hydrogeology & Water',
    keywords: ['Water Ingress', 'Aquifer', 'Dewatering', 'Hydrogeology', 'Artesian Pressure', 'Inundation', 'Pumping Sump'],
    documentsCount: 184,
    coherenceScore: 89,
    growthPercent: 43,
    status: 'emerging',
    trend2020_2026: [
      { year: 2020, mentions: 64 },
      { year: 2021, mentions: 78 },
      { year: 2022, mentions: 92 },
      { year: 2023, mentions: 115 },
      { year: 2024, mentions: 142 },
      { year: 2025, mentions: 168 },
      { year: 2026, mentions: 184 },
    ],
    affectedMinesCount: 7,
    topMines: ['Dipka Mega Project', 'Bhubaneswari OCP', 'Moonidih Deep UG'],
    summary: 'Sub-surface aquifer breaching during deep monsoon excavation creating hydrodynamic pressure on sump pumps and strata weakening.',
    dgmsRelevance: 'Mandatory inundation hazard precaution under DGMS Circular No. 3 (2024).',
  },
  {
    id: 'topic-slope-stability',
    name: 'Ground & Highwall Slope Stability',
    category: 'Geotechnical & Strata',
    keywords: ['Slope Stability', 'Highwall', 'Rock Mechanics', 'Strata Deformation', 'Displacement Radar', 'Bench Failure'],
    documentsCount: 205,
    coherenceScore: 88,
    growthPercent: 31,
    status: 'emerging',
    trend2020_2026: [
      { year: 2020, mentions: 95 },
      { year: 2021, mentions: 110 },
      { year: 2022, mentions: 130 },
      { year: 2023, mentions: 154 },
      { year: 2024, mentions: 175 },
      { year: 2025, mentions: 192 },
      { year: 2026, mentions: 205 },
    ],
    affectedMinesCount: 6,
    topMines: ['Gevra Expansion OCP', 'Kusmunda Colliery OCP', 'Ramagundam OCP-III'],
    summary: 'Continuous interferometric synthetic aperture radar (InSAR) and piezometer logging tracking tensile cracks along deep pit benches.',
    dgmsRelevance: 'Highwall safety bench angle regulation under Coal Mines Regulations 106.',
  },
  {
    id: 'topic-mine-safety',
    name: 'Mine Safety & Gas Hazard Detection',
    category: 'Mine Safety & Hazards',
    keywords: ['Ventilation', 'Methane CBM', 'Gas Detection', 'PPE', 'Explosion Prevention', 'DGMS Norms', 'Emergency Evacuation'],
    documentsCount: 248,
    coherenceScore: 94,
    growthPercent: 15,
    status: 'stable',
    trend2020_2026: [
      { year: 2020, mentions: 190 },
      { year: 2021, mentions: 202 },
      { year: 2022, mentions: 215 },
      { year: 2023, mentions: 228 },
      { year: 2024, mentions: 236 },
      { year: 2025, mentions: 242 },
      { year: 2026, mentions: 248 },
    ],
    affectedMinesCount: 8,
    topMines: ['Moonidih Deep UG', 'Jayant Colliery OCP', 'Bina Project OCP'],
    summary: 'Real-time telemetry of oxygen, carbon monoxide, and methane emissions in deep seams alongside automated flameproof switchgear.',
    dgmsRelevance: 'Primary safety audit standard across all underground and opencast works.',
  },
  {
    id: 'topic-ai-exploration',
    name: 'AI-Guided Seismic & Borehole Exploration',
    category: 'Exploration & Reserves',
    keywords: ['AI Exploration', '3D Seismic', 'Borehole', 'Geological Modeling', 'Neural Inversion', 'Reserves Estimation'],
    documentsCount: 142,
    coherenceScore: 85,
    growthPercent: 27,
    status: 'emerging',
    trend2020_2026: [
      { year: 2020, mentions: 32 },
      { year: 2021, mentions: 45 },
      { year: 2022, mentions: 68 },
      { year: 2023, mentions: 90 },
      { year: 2024, mentions: 114 },
      { year: 2025, mentions: 130 },
      { year: 2026, mentions: 142 },
    ],
    affectedMinesCount: 5,
    topMines: ['Gevra Expansion OCP', 'Jayant Colliery OCP', 'Talcher Coalfield'],
    summary: 'Machine learning interpolation of core-drilling logs to predict fault throws, seam thinning, and shale inter-burden.',
    dgmsRelevance: 'UNFC-111 Proved Geological Reserves certification protocol.',
  },
  {
    id: 'topic-carbon-emission',
    name: 'Fugitive Emissions & ESG Compliance',
    category: 'Environmental & ESG',
    keywords: ['Carbon Emission', 'Fugitive Methane', 'Decarbonization', 'First Mile Rail', 'Afforestation', 'Dust Suppression'],
    documentsCount: 165,
    coherenceScore: 87,
    growthPercent: 18,
    status: 'emerging',
    trend2020_2026: [
      { year: 2020, mentions: 55 },
      { year: 2021, mentions: 70 },
      { year: 2022, mentions: 95 },
      { year: 2023, mentions: 120 },
      { year: 2024, mentions: 140 },
      { year: 2025, mentions: 155 },
      { year: 2026, mentions: 165 },
    ],
    affectedMinesCount: 8,
    topMines: ['Bhubaneswari OCP', 'Kusmunda Colliery OCP', 'Gevra Expansion OCP'],
    summary: 'Transitioning coal transport to dedicated electric rail conveyors and quantifying Scope-1 diesel HEMM offsets.',
    dgmsRelevance: 'Ministry of Environment, Forest & Climate Change (MoEFCC) compliance.',
  },
  {
    id: 'topic-blasting',
    name: 'Controlled Blasting & Strata Vibration',
    category: 'Heavy Mechanization',
    keywords: ['Blasting', 'Peak Particle Velocity', 'Explosives ANFO', 'Stemming', 'Electronic Detonators', 'Flyrock Containment'],
    documentsCount: 198,
    coherenceScore: 90,
    growthPercent: 8,
    status: 'stable',
    trend2020_2026: [
      { year: 2020, mentions: 165 },
      { year: 2021, mentions: 172 },
      { year: 2022, mentions: 180 },
      { year: 2023, mentions: 188 },
      { year: 2024, mentions: 192 },
      { year: 2025, mentions: 195 },
      { year: 2026, mentions: 198 },
    ],
    affectedMinesCount: 7,
    topMines: ['Jayant Colliery OCP', 'Gevra Expansion OCP', 'Bina Project OCP'],
    summary: 'Electronic delay detonators minimizing vibration amplitude near surface structures while maximizing rock fragmentation.',
    dgmsRelevance: 'DGMS Standard PPV permissible limits (10 mm/s to 25 mm/s).',
  },
  {
    id: 'topic-mechanized-extraction',
    name: 'Heavy Mechanization & Continuous Mining',
    category: 'Heavy Mechanization',
    keywords: ['Draglines', 'Surface Miner', 'Hydraulic Shovel', 'Continuous Miner', 'FMC Silo', 'Dumper Telemetry'],
    documentsCount: 220,
    coherenceScore: 92,
    growthPercent: 14,
    status: 'stable',
    trend2020_2026: [
      { year: 2020, mentions: 150 },
      { year: 2021, mentions: 165 },
      { year: 2022, mentions: 182 },
      { year: 2023, mentions: 198 },
      { year: 2024, mentions: 208 },
      { year: 2025, mentions: 215 },
      { year: 2026, mentions: 220 },
    ],
    affectedMinesCount: 8,
    topMines: ['Gevra Expansion OCP', 'Kusmunda Colliery OCP', 'Jayant Colliery OCP'],
    summary: 'Deployment of high-capacity continuous surface miners avoiding conventional blasting in ecologically sensitive zones.',
    dgmsRelevance: 'CIL Modernization Standard for Tier-1 Mega Mines.',
  },
];

// ==========================================
// 3. KEYWORDS & LEXICAL TERMINOLOGY INDEX
// ==========================================
export const KEYWORDS_DATA: KeywordItem[] = [
  {
    term: 'COAL',
    occurrences: 1420,
    tfIdfScore: 0.98,
    semanticRelevance: 0.99,
    category: 'Core Commodity',
    relatedTopics: ['Coal Seam Characterization', 'AI-Guided Seismic & Borehole Exploration', 'Fugitive Emissions & ESG Compliance'],
    relatedDocuments: ['Geological Assessment Report 2025', 'CMPDI Exploration Master Plan', 'National Coal Inventory'],
    trend: 'up',
    growth: '+12%',
  },
  {
    term: 'GEOLOGY',
    occurrences: 980,
    tfIdfScore: 0.92,
    semanticRelevance: 0.96,
    category: 'Lithology',
    relatedTopics: ['Coal Seam Characterization', 'Ground & Highwall Slope Stability'],
    relatedDocuments: ['Korba Basin Petrographic Survey', 'Singrauli Stratigraphy Review', 'Talcher Basin Core Analysis'],
    trend: 'stable',
    growth: '+5%',
  },
  {
    term: 'MINING',
    occurrences: 1150,
    tfIdfScore: 0.94,
    semanticRelevance: 0.97,
    category: 'Operations',
    relatedTopics: ['Heavy Mechanization & Continuous Mining', 'Controlled Blasting & Strata Vibration'],
    relatedDocuments: ['Gevra Mega Expansion Feasibility', 'SECL Operational Review Q4', 'CMPDI Mining Methods Study'],
    trend: 'up',
    growth: '+9%',
  },
  {
    term: 'EXPLORATION',
    occurrences: 760,
    tfIdfScore: 0.89,
    semanticRelevance: 0.91,
    category: 'Survey',
    relatedTopics: ['AI-Guided Seismic & Borehole Exploration', 'Coal Seam Characterization'],
    relatedDocuments: ['Talcher Deep Seam Exploration', 'Bina Extension Drilling Logs', 'Jharia CBM Exploration'],
    trend: 'up',
    growth: '+27%',
  },
  {
    term: 'DRILLING',
    occurrences: 521,
    tfIdfScore: 0.84,
    semanticRelevance: 0.88,
    category: 'Survey',
    relatedTopics: ['AI-Guided Seismic & Borehole Exploration', 'Ground & Highwall Slope Stability'],
    relatedDocuments: ['Geological Report 2025', 'Mine Exploration Report', 'Borehole Stratum Analysis'],
    trend: 'up',
    growth: '+18%',
  },
  {
    term: 'SEAM',
    occurrences: 680,
    tfIdfScore: 0.87,
    semanticRelevance: 0.93,
    category: 'Stratigraphy',
    relatedTopics: ['Coal Seam Characterization', 'Water Ingress & Aquifer Breaching'],
    relatedDocuments: ['Gevra Main Seam Profile', 'Kusmunda Upper & Lower Seams', 'Moonidih Seam XVI Assessment'],
    trend: 'stable',
    growth: '+7%',
  },
  {
    term: 'BLASTING',
    occurrences: 490,
    tfIdfScore: 0.81,
    semanticRelevance: 0.85,
    category: 'Operations',
    relatedTopics: ['Controlled Blasting & Strata Vibration', 'Ground & Highwall Slope Stability'],
    relatedDocuments: ['Electronic Detonator Trial Jayant', 'Dipka Highwall Blasting Audit', 'PPV Monitoring Report'],
    trend: 'stable',
    growth: '+4%',
  },
  {
    term: 'SAFETY',
    occurrences: 840,
    tfIdfScore: 0.91,
    semanticRelevance: 0.95,
    category: 'Compliance',
    relatedTopics: ['Mine Safety & Gas Hazard Detection', 'Water Ingress & Aquifer Breaching'],
    relatedDocuments: ['Annual DGMS Safety Audit 2025', 'Underground Evacuation Plan', 'Highwall Slope Risk Survey'],
    trend: 'up',
    growth: '+16%',
  },
  {
    term: 'RESERVES',
    occurrences: 620,
    tfIdfScore: 0.86,
    semanticRelevance: 0.90,
    category: 'Economics',
    relatedTopics: ['Coal Seam Characterization', 'AI-Guided Seismic & Borehole Exploration'],
    relatedDocuments: ['CMPDI Proved Reserves Ledger', 'CIL 10-Year Production Trajectory', 'UNFC Resource Re-evaluation'],
    trend: 'stable',
    growth: '+6%',
  },
  {
    term: 'STRATA',
    occurrences: 570,
    tfIdfScore: 0.85,
    semanticRelevance: 0.92,
    category: 'Lithology',
    relatedTopics: ['Ground & Highwall Slope Stability', 'Coal Seam Characterization'],
    relatedDocuments: ['Strata Control Technology Report', 'Rock Mass Rating Moonidih', 'Dipka Overburden Stability'],
    trend: 'up',
    growth: '+21%',
  },
  {
    term: 'WATER',
    occurrences: 710,
    tfIdfScore: 0.90,
    semanticRelevance: 0.92,
    category: 'Hydrogeology',
    relatedTopics: ['Water Ingress & Aquifer Breaching', 'Fugitive Emissions & ESG Compliance'],
    relatedDocuments: ['Bhubaneswari Aquifer Breach Audit', 'Dipka Sump Dewatering Report', 'Groundwater Hydrogeology Survey'],
    trend: 'up',
    growth: '+43%',
  },
  {
    term: 'VENTILATION',
    occurrences: 410,
    tfIdfScore: 0.79,
    semanticRelevance: 0.87,
    category: 'Safety',
    relatedTopics: ['Mine Safety & Gas Hazard Detection'],
    relatedDocuments: ['Moonidih Deep Shaft Ventilation Survey', 'Jhanjra Continuous Methane Sweep', 'Underground Airflow Audit'],
    trend: 'up',
    growth: '+11%',
  },
  {
    term: 'AQUIFER',
    occurrences: 380,
    tfIdfScore: 0.78,
    semanticRelevance: 0.89,
    category: 'Hydrogeology',
    relatedTopics: ['Water Ingress & Aquifer Breaching'],
    relatedDocuments: ['Talcher Confined Aquifer Investigation', 'Korba Basin Water Table Monitoring', 'Artesian Pressure Telemetry'],
    trend: 'up',
    growth: '+38%',
  },
  {
    term: 'SLOPE',
    occurrences: 495,
    tfIdfScore: 0.83,
    semanticRelevance: 0.91,
    category: 'Geotechnical',
    relatedTopics: ['Ground & Highwall Slope Stability'],
    relatedDocuments: ['Gevra Bench Slope Safety Audit', 'Kusmunda InSAR Displacement Log', 'Ramagundam Highwall Analysis'],
    trend: 'up',
    growth: '+31%',
  },
  {
    term: 'METHANE',
    occurrences: 340,
    tfIdfScore: 0.77,
    semanticRelevance: 0.86,
    category: 'Safety & ESG',
    relatedTopics: ['Mine Safety & Gas Hazard Detection', 'Fugitive Emissions & ESG Compliance'],
    relatedDocuments: ['CBM Drainage Assessment Jharia', 'Fugitive Emissions Audit CIL', 'Gas Drainage Borehole Log'],
    trend: 'up',
    growth: '+24%',
  },
  {
    term: 'BOREHOLE',
    occurrences: 460,
    tfIdfScore: 0.82,
    semanticRelevance: 0.88,
    category: 'Survey',
    relatedTopics: ['AI-Guided Seismic & Borehole Exploration', 'Coal Seam Characterization'],
    relatedDocuments: ['CMPDI Deep Core Borehole Database', 'Bina South Extension Logs', 'Seam Thickness Isopach Map'],
    trend: 'up',
    growth: '+14%',
  },
  {
    term: 'DRAGLINE',
    occurrences: 290,
    tfIdfScore: 0.73,
    semanticRelevance: 0.82,
    category: 'Heavy Mechanization',
    relatedTopics: ['Heavy Mechanization & Continuous Mining'],
    relatedDocuments: ['Jayant 24/96 Walking Dragline Productivity', 'Dudhichua Stripping Audit', 'NCL HEMM Availability Log'],
    trend: 'stable',
    growth: '+3%',
  },
  {
    term: 'EMISSIONS',
    occurrences: 310,
    tfIdfScore: 0.75,
    semanticRelevance: 0.84,
    category: 'Environmental',
    relatedTopics: ['Fugitive Emissions & ESG Compliance'],
    relatedDocuments: ['CIL Decarbonization Roadmap 2026', 'First Mile Connectivity Carbon Audit', 'MoEFCC Air Quality Submission'],
    trend: 'up',
    growth: '+18%',
  },
];

// ==========================================
// 4. REPORTS CATALOG (Real Document Records)
// ==========================================
export const REPORTS_DATA: MiningReport[] = [
  {
    id: 'rep-korba-2025-01',
    title: 'Geological & Stratigraphical Evaluation Report 2025',
    mineId: 'mine-korba-gevra',
    mineName: 'Gevra Expansion Mega OCP',
    subsidiary: 'SECL',
    reportType: 'Geological Assessment',
    year: 2025,
    date: '2025-11-14',
    author: 'Dr. S. K. Mahapatra (Chief Geologist, CMPDI RI-V)',
    topics: ['Coal Seam Characterization', 'Ground & Highwall Slope Stability', 'AI-Guided Seismic & Borehole Exploration'],
    status: 'Processed',
    fileSize: '14.2 MB',
    coherenceIndex: 94,
    pages: 184,
    abstract: 'Detailed 3D lithological reconstruction of Gevra Expansion Sector IV, delineating Upper Seam thickness (14.2m) and Lower Seam split (22.5m). Confirms 480 MT proved reserves under UNFC code 111 with G11 power grading.',
    keyFindings: [
      'Proved in-situ extractable coal reserves verified at 480.25 MT across Seams I, II, and III.',
      'Average strip ratio stabilized at 1:1.82 m3/tonne with sandstone inter-burden.',
      'Interferometric radar confirms stable 42-degree overall pit slope with zero shear fractures.',
    ],
    strataData: [
      { seam: 'Seam I (Top)', depthMeters: 45, thicknessMeters: 8.4, grade: 'G10' },
      { seam: 'Seam II (Main Gevra)', depthMeters: 110, thicknessMeters: 28.5, grade: 'G11' },
      { seam: 'Seam III (Bottom)', depthMeters: 185, thicknessMeters: 14.2, grade: 'G12' },
    ],
  },
  {
    id: 'rep-talcher-2026-02',
    title: 'Hydrogeological Survey & Aquifer Ingress Assessment',
    mineId: 'mine-talcher-bhubaneswari',
    mineName: 'Bhubaneswari OCP',
    subsidiary: 'MCL',
    reportType: 'Hydrogeological Survey',
    year: 2026,
    date: '2026-02-04',
    author: 'Er. Ananya Sen (Principal Hydrologist, CMPDI RI-VII)',
    topics: ['Water Ingress & Aquifer Breaching', 'Fugitive Emissions & ESG Compliance', 'Mine Safety & Gas Hazard Detection'],
    status: 'Verified',
    fileSize: '19.8 MB',
    coherenceIndex: 91,
    pages: 142,
    abstract: 'Investigation into confined sandstone aquifer penetration at Dip-Side Bench 6 of Bhubaneswari OCP. Quantifies hydraulic head of 3.8 bar and hydro-chemical signatures requiring enhanced dewatering sumps.',
    keyFindings: [
      'Water ingress rate peaked at 4,200 m3/hour during pre-monsoon unconfined aquifer breach.',
      'Total dissolved solids (TDS) measured at 480 mg/L within permissible industrial discharge norms.',
      'Recommended radial grout curtain and 3 additional 500 HP submersible dewatering pumps.',
    ],
  },
  {
    id: 'rep-singrauli-2025-03',
    title: 'Highwall Slope Stability & Strata Radar Audit',
    mineId: 'mine-singrauli-jayant',
    mineName: 'Jayant Colliery OCP',
    subsidiary: 'NCL',
    reportType: 'Slope Stability Audit',
    year: 2025,
    date: '2025-09-22',
    author: 'Prof. R. V. Kulkarni (Geotechnical Advisor, IIT Kharagpur / CMPDI)',
    topics: ['Ground & Highwall Slope Stability', 'Controlled Blasting & Strata Vibration', 'Heavy Mechanization & Continuous Mining'],
    status: 'Processed',
    fileSize: '24.5 MB',
    coherenceIndex: 93,
    pages: 210,
    abstract: 'Geotechnical numerical modeling using FLAC3D evaluating factor of safety (FoS) along the 220-meter deep eastern highwall under heavy dragline surcharge loading.',
    keyFindings: [
      'Factor of safety (FoS) maintained at 1.34 under static conditions, exceeding DGMS minimum (1.20).',
      'Electronic delay detonators reduced peak particle velocity (PPV) from 18.2 mm/s to 7.4 mm/s at 300m perimeter.',
      'Automated highwall prism displacement telemetry configured with real-time sirens at 2mm/day threshold.',
    ],
  },
  {
    id: 'rep-jharia-2026-04',
    title: 'Underground Methane Ingress & CBM Drainage Assessment',
    mineId: 'mine-jharia-moonidih',
    mineName: 'Moonidih Deep UG Project',
    subsidiary: 'BCCL',
    reportType: 'Safety & DGMS Compliance',
    year: 2026,
    date: '2026-01-18',
    author: 'Dr. P. K. Ghosh (Director of Mine Safety, DGMS Certified)',
    topics: ['Mine Safety & Gas Hazard Detection', 'Water Ingress & Aquifer Breaching', 'Fugitive Emissions & ESG Compliance'],
    status: 'Verified',
    fileSize: '16.7 MB',
    coherenceIndex: 95,
    pages: 168,
    abstract: 'Statutory ventilation survey and degasification efficiency audit in Seam XVI at 520m depth. Reviews continuous methane drainage boreholes delivering 18,000 m3/day of 92% purity gas to surface flare.',
    keyFindings: [
      'Methane content in return airway maintained strictly at 0.32% (well below statutory 0.75% limit).',
      'Longwall face production exceeded 5,500 tonnes/day with zero asphyxiation or ignition events.',
      'Identified cross-measure borehole sealing enhancement for upcoming Longwall Panel LW-8.',
    ],
  },
  {
    id: 'rep-kusmunda-2025-05',
    title: 'Continuous Surface Mining Productivity & Strata Feasibility',
    mineId: 'mine-korba-kusmunda',
    mineName: 'Kusmunda Colliery OCP',
    subsidiary: 'SECL',
    reportType: 'Feasibility & Reserves',
    year: 2025,
    date: '2025-08-30',
    author: 'Er. V. Ramanathan (General Manager, CIL Mechanization Cell)',
    topics: ['Heavy Mechanization & Continuous Mining', 'Coal Seam Characterization', 'Controlled Blasting & Strata Vibration'],
    status: 'Processed',
    fileSize: '11.4 MB',
    coherenceIndex: 89,
    pages: 130,
    abstract: 'Operational benchmarking of 4 continuous surface miners operating in thick coal seams. Validates elimination of drill-and-blast operations and direct discharge onto mobile conveyor transfer stations.',
    keyFindings: [
      'Surface miner extraction achieved 43.2 MT annual run rate with 99.2% sizing compliance (-100mm).',
      'Averted 18,400 drill holes and explosive consumption of 4,200 MT ANFO in close proximity to human settlements.',
      'Fuel efficiency improved by 22% compared to conventional shovel-dumper circuit.',
    ],
  },
  {
    id: 'rep-bina-2024-06',
    title: 'Singrauli Basin Environmental Impact & Decarbonization Audit',
    mineId: 'mine-singrauli-bina',
    mineName: 'Bina Project OCP',
    subsidiary: 'NCL',
    reportType: 'Environmental Impact',
    year: 2024,
    date: '2024-12-05',
    author: 'CMPDI Regional Institute VI Environment Cell',
    topics: ['Fugitive Emissions & ESG Compliance', 'Water Ingress & Aquifer Breaching', 'AI-Guided Seismic & Borehole Exploration'],
    status: 'Processed',
    fileSize: '21.0 MB',
    coherenceIndex: 88,
    pages: 195,
    abstract: 'Comprehensive environmental compliance scorecard quantifying ambient PM10/PM2.5 dust suppression, FMC conveyor electrification, and 120 hectares of overburden eco-restoration.',
    keyFindings: [
      'Dust mist canons and dry fog systems reduced haul road PM10 by 44% year-over-year.',
      'Silo loading eliminated 240 heavy truck trips daily along the National Highway corridor.',
      'Eco-park and dense native tree plantation sequestered an estimated 8,500 tonnes CO2e annually.',
    ],
  },
  {
    id: 'rep-ramagundam-2025-07',
    title: 'Highwall Radar Displacement & Geotechnical Assessment',
    mineId: 'mine-sccle-ramagundam',
    mineName: 'Ramagundam OCP-III Mega Project',
    subsidiary: 'SCCL',
    reportType: 'Slope Stability Audit',
    year: 2025,
    date: '2025-10-10',
    author: 'SCCL Geotechnical Directorate in collaboration with CMPDI',
    topics: ['Ground & Highwall Slope Stability', 'Mine Safety & Gas Hazard Detection', 'Heavy Mechanization & Continuous Mining'],
    status: 'Verified',
    fileSize: '15.9 MB',
    coherenceIndex: 90,
    pages: 156,
    abstract: 'Real-time slope stability radar (SSR) telemetry along South-West Pit Highwall during deep transition bench excavation in sandstone-shale sequences.',
    keyFindings: [
      'Overall slope angle of 38 degrees sustained without macro-tensile cracking.',
      'Piezometric water pressure dissipated effectively via sub-horizontal drainage holes.',
      'Pre-split blasting boundary preserved rock mass integrity with RMR score of 68.',
    ],
  },
];

// ==========================================
// 5. EMERGING TOPIC ALERTS
// ==========================================
export const EMERGING_ALERTS_DATA: EmergingAlert[] = [
  {
    id: 'alt-01',
    severity: 'HIGH',
    topic: 'Water Ingress & Aquifer Breaching',
    growthPercent: 43,
    affectedMines: ['Bhubaneswari OCP', 'Dipka Mega Project', 'Moonidih Deep UG', 'Gevra Expansion OCP', 'Talcher Mine', 'Korba West', 'Jharia Seam XVI'],
    affectedMinesCount: 7,
    reportsCount: 84,
    detectedDate: '2026-03-24',
    status: 'Active',
    triggerDescription: 'Mention frequency in geological & hydrogeological reports spiked by 43% over the trailing 24 months, indicating unconfined aquifer intersections at deeper pit levels.',
    recommendedAction: 'Mandate immediate piezometer installation, perimeter radial grouting, and review DGMS monsoon emergency pump capacity.',
    primaryRisk: 'Pit flooding, highwall saturation instability, and prolonged extraction suspension.',
  },
  {
    id: 'alt-02',
    severity: 'HIGH',
    topic: 'Ground & Highwall Slope Stability',
    growthPercent: 31,
    affectedMines: ['Gevra Expansion OCP', 'Kusmunda Colliery OCP', 'Ramagundam OCP-III', 'Jayant Colliery OCP', 'Dipka Mega Project', 'Talcher Mine'],
    affectedMinesCount: 6,
    reportsCount: 62,
    detectedDate: '2026-03-18',
    status: 'Active',
    triggerDescription: 'Slope stability and strata deformation mentions expanded 31%, correlated with increased bench depths exceeding 180 meters.',
    recommendedAction: 'Deploy GroundProbe Real-Time Synthetic Aperture Slope Radar (SSR) across all deep benches and enforce CMR 106 safety berm standards.',
    primaryRisk: 'Bench collapse, shovel/dumper entrapment, and pit haul-road severance.',
  },
  {
    id: 'alt-03',
    severity: 'MEDIUM',
    topic: 'AI-Guided Seismic & Borehole Exploration',
    growthPercent: 27,
    affectedMines: ['Gevra Expansion OCP', 'Jayant Colliery OCP', 'Bina Project OCP', 'Bhubaneswari OCP', 'Talcher Mine'],
    affectedMinesCount: 5,
    reportsCount: 48,
    detectedDate: '2026-03-10',
    status: 'Under Investigation',
    triggerDescription: 'Accelerated adoption of machine-learning core interpolation and 3D seismic inversion across CMPDI exploratory exploration blocks.',
    recommendedAction: 'Standardize CIL neural-network geological modeling protocols to ensure UNFC reserve reporting compliance.',
    primaryRisk: 'Mis-correlation of thin split seams without physical core validation.',
  },
  {
    id: 'alt-04',
    severity: 'LOW',
    topic: 'Fugitive Emissions & ESG Compliance',
    growthPercent: 18,
    affectedMines: ['Bhubaneswari OCP', 'Kusmunda Colliery OCP', 'Gevra Expansion OCP', 'Jayant Colliery OCP', 'Moonidih Deep UG', 'Bina Project OCP', 'Ramagundam OCP-III', 'Dipka Mega Project'],
    affectedMinesCount: 8,
    reportsCount: 56,
    detectedDate: '2026-02-28',
    status: 'Under Investigation',
    triggerDescription: 'Statutory disclosures regarding Scope-1 diesel HEMM emissions and methane venting increased 18% following MoEFCC carbon mandate.',
    recommendedAction: 'Accelerate First-Mile Connectivity (FMC) rail silos and deploy electric trolley-assist dumper pilots.',
    primaryRisk: 'Regulatory environmental clearance penalties and carbon emission audit queries.',
  },
  {
    id: 'alt-05',
    severity: 'MEDIUM',
    topic: 'Deep Strata Ground Movement (Moonidih)',
    growthPercent: 22,
    affectedMines: ['Moonidih Deep UG'],
    affectedMinesCount: 1,
    reportsCount: 29,
    detectedDate: '2026-03-01',
    status: 'Active',
    triggerDescription: 'Micro-seismic geophone sensors logged elevated strata deformation events exceeding 45 events/day along Longwall Panel LW-7.',
    recommendedAction: 'Execute hydro-fracturing pre-conditioning of massive sandstone roof to induce controlled caving.',
    primaryRisk: 'Air blast hazard resulting from sudden massive roof collapse.',
  },
];

// ==========================================
// 6. AI INSIGHTS DATA (Curated Mining Intelligence)
// ==========================================
export const AI_INSIGHTS_DATA: AIInsightItem[] = [
  {
    id: 'ins-01',
    title: 'Systemic Hydrogeological Pressure Across Deepening Opencast Pits',
    headline: 'MineIntel detected a 43% increase in reports related to water ingress during 2024–2026 across 7 major subsidiaries.',
    growthPercent: 43,
    period: '2024–2026',
    category: 'Hydrogeology & Risk',
    evidenceReportsCount: 84,
    evidenceMinesCount: 7,
    relatedTopics: ['Water Ingress & Aquifer Breaching', 'Ground & Highwall Slope Stability', 'Mine Safety & Gas Hazard Detection'],
    relevantDocuments: [
      { id: 'rep-talcher-2026-02', title: 'Hydrogeological Survey & Aquifer Ingress Assessment', mine: 'Bhubaneswari OCP', year: 2026 },
      { id: 'rep-korba-2025-01', title: 'Geological & Stratigraphical Evaluation Report 2025', mine: 'Gevra Expansion Mega OCP', year: 2025 },
      { id: 'rep-jharia-2026-04', title: 'Underground Methane Ingress & CBM Drainage Assessment', mine: 'Moonidih Deep UG Project', year: 2026 },
    ],
    detailedAnalysis: 'As opencast coal pits in Korba and Talcher coalfields push past 180–220 meters depth, mine workings increasingly intersect confined Barakar formation sandstones containing pressurized artesian aquifers. Natural drainage channels become insufficient during monsoon surges, triggering sub-surface pore pressure build-up along pit floor beds and elevating highwall toe liquefaction risks.',
    operationalImpact: 'Unscheduled pit sump dewatering halts average 14 hours per month per pit, translating to an estimated 420,000 tonnes of deferred coal extraction if pre-drainage boreholes are omitted.',
    recommendedIntervention: 'Execute proactive perimeter depressurization drilling 6 months prior to bench advancement, install automated SCADA sump telemetry, and construct peripheral diversion channels.',
  },
  {
    id: 'ins-02',
    title: 'Highwall Radar Monitoring Correlates with Zero Fatal Bench Failures',
    headline: 'Adoption of interferometric real-time slope radar in Tier-1 mines reduced unexpected bench displacement events by 68%.',
    growthPercent: 31,
    period: '2023–2026',
    category: 'Geotechnical Safety',
    evidenceReportsCount: 62,
    evidenceMinesCount: 6,
    relatedTopics: ['Ground & Highwall Slope Stability', 'Controlled Blasting & Strata Vibration', 'Heavy Mechanization & Continuous Mining'],
    relevantDocuments: [
      { id: 'rep-singrauli-2025-03', title: 'Highwall Slope Stability & Strata Radar Audit', mine: 'Jayant Colliery OCP', year: 2025 },
      { id: 'rep-ramagundam-2025-07', title: 'Highwall Radar Displacement & Geotechnical Assessment', mine: 'Ramagundam OCP-III Mega Project', year: 2025 },
    ],
    detailedAnalysis: 'Geotechnical slope telemetry from Jayant and Gevra confirms that sub-millimeter displacement radar detects progressive shear planes 48 to 72 hours before catastrophic failure, granting ample buffer for HEMM evacuation and controlled slope un-weighting.',
    operationalImpact: 'Avoidance of catastrophic highwall slumps has saved an estimated ₹180 Crore in heavy shovel equipment damage over the 3-year audit window.',
    recommendedIntervention: 'Standardize mandatory SSR deployment across all opencast pits reaching statutory depth threshold of 150 meters.',
  },
  {
    id: 'ins-03',
    title: 'First-Mile Connectivity (FMC) Rail Infrastructure Eliminates Scope-1 Diesel Penalties',
    headline: 'FMC rapid loading rail silos decreased surface trucking fuel consumption by 34% across 8 monitored collieries.',
    growthPercent: 18,
    period: '2022–2026',
    category: 'ESG & Logistics',
    evidenceReportsCount: 56,
    evidenceMinesCount: 8,
    relatedTopics: ['Fugitive Emissions & ESG Compliance', 'Heavy Mechanization & Continuous Mining', 'Coal Seam Characterization'],
    relevantDocuments: [
      { id: 'rep-talcher-2026-02', title: 'Hydrogeological Survey & Aquifer Ingress Assessment', mine: 'Bhubaneswari OCP', year: 2026 },
      { id: 'rep-bina-2024-06', title: 'Singrauli Basin Environmental Impact & Decarbonization Audit', mine: 'Bina Project OCP', year: 2024 },
    ],
    detailedAnalysis: 'MCL and SECL rapid loading systems loading 100+ railway rakes daily have substituted approximately 12,000 road truck voyages per day, eliminating severe traffic congestion on regional arteries and sharply cutting particulate matter (PM2.5) concentrations.',
    operationalImpact: 'Reduced average wagon turnaround time from 6.8 hours to 1.9 hours, boosting national railway rake utilization.',
    recommendedIntervention: 'Complete remaining Phase-II FMC rail spurs at Kusmunda and Dipka to achieve 100% mechanized dispatch by FY 2027.',
  },
];

// ==========================================
// 7. MULTI-YEAR TREND AGGREGATES (2020–2026)
// ==========================================
export const MULTI_YEAR_TOPIC_TRENDS = [
  { year: '2020', 'Coal Quality': 180, 'Mine Safety': 190, 'Exploration': 130, 'Water Management': 64, Environment: 55, 'Ground Stability': 95 },
  { year: '2021', 'Coal Quality': 195, 'Mine Safety': 202, 'Exploration': 145, 'Water Management': 78, Environment: 70, 'Ground Stability': 110 },
  { year: '2022', 'Coal Quality': 210, 'Mine Safety': 215, 'Exploration': 168, 'Water Management': 92, Environment: 95, 'Ground Stability': 130 },
  { year: '2023', 'Coal Quality': 220, 'Mine Safety': 228, 'Exploration': 190, 'Water Management': 115, Environment: 120, 'Ground Stability': 154 },
  { year: '2024', 'Coal Quality': 228, 'Mine Safety': 236, 'Exploration': 214, 'Water Management': 142, Environment: 140, 'Ground Stability': 175 },
  { year: '2025', 'Coal Quality': 234, 'Mine Safety': 242, 'Exploration': 230, 'Water Management': 168, Environment: 155, 'Ground Stability': 192 },
  { year: '2026', 'Coal Quality': 238, 'Mine Safety': 248, 'Exploration': 242, 'Water Management': 184, Environment: 165, 'Ground Stability': 205 },
];

// ==========================================
// 8. MODEL & SYSTEM HEALTH METRICS (Phase 2C)
// ==========================================
export const SYSTEM_HEALTH_METRICS = {
  modelName: 'MineIntel-BERT-GeoMiner v3.4',
  baseFramework: 'Transformers + PyTorch NLP + Sentence-BERT',
  embeddingDimensions: 768,
  lastRetrained: '25 Sept 2026, 04:30 IST',
  nextScheduledRetraining: '25 Oct 2026, 02:00 IST',
  modelAccuracy: 92.4, // %
  processingSpeedSec: 2.3, // sec/report
  documentsProcessed: 12420,
  trainingRecords: '1.2M geological & statutory records',
  topicCoherenceScore: 86.8, // %
  activeTopicCategories: 6,
  totalIdentifiedTopics: 42,
  analystUsersTrained: 48,
  trainingSessionsCompleted: 14,
  gpuClusterStatus: 'Operational (NVIDIA A100 Tensor Core Node)',
  vectorStoreStatus: 'Healthy (Local Sovereign HNSW Index)',
  apiLatencyMs: 42,
};
