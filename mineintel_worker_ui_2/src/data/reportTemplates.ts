import { ReportTemplate } from '../types';

export const CIL_REPORT_TEMPLATES: ReportTemplate[] = [
  // 1. Annexure 14 - Safety Performance
  {
    id: 'tmpl-annex-14',
    annexure: 'Annexure 14',
    name: 'Safety Performance & DGMS Compliance Audit',
    officialTitle: 'Safety Performance, Incident Metrics & DGMS Directive Review',
    category: 'Safety & Statutory',
    relevance: 'Safety report',
    description: 'Mandatory statutory safety audit tracking fatal/serious injury frequency rates, highwall radar alarms, and DGMS circular compliance across active pits.',
    suggestedFormats: ['PDF', 'XLSX', 'TXT'],
    sections: [
      '1. Executive Safety Summary & Hazard Index',
      '2. Fatality & Serious Accident Frequency Rate (FIFR/SIFR)',
      '3. Highwall & Slope Stability Telemetry',
      '4. Underground Ventilation & Gas Drainage Ingress',
      '5. DGMS Circular Directives & Corrective Actions',
    ],
    keyMetrics: ['FIFR (per Million Shifts)', 'Highwall Crest Displacement (mm)', 'Methane Intake Concentration (%)', 'Dust Particulate (PM10)'],
    schema: {
      statutoryReference: 'Mines Act 1952, DGMS (Tech) Cir. No. 04/2026, CMR 2017 Regulation 102',
      filingFrequency: 'Monthly Statutory DGMS Filing & Annual BSE Disclosures',
      requiredAnnexures: [
        { code: 'Annexure 14', title: 'Safety Performance & Hazard Register', type: 'Primary', mandatory: true },
        { code: 'Annexure 11', title: 'HEMM Equipment Interlocks & Brake Testing', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 15', title: 'Manpower Shift Muster & Risk Exposure Hours', type: 'Supporting Cross-Reference', mandatory: false },
      ],
      expectedDataPoints: [
        { field: 'Fatal Injury Frequency Rate (FIFR)', unit: 'per Million Man-Shifts', sourceFeed: 'Biometric Muster & Incident Logs', threshold: 'Target: 0.00 (Max 0.20)', obligatory: 'Mandatory' },
        { field: 'Serious Injury Frequency Rate (SIFR)', unit: 'per Million Man-Shifts', sourceFeed: 'First-Aid Station Loggers', threshold: 'Target: < 1.20', obligatory: 'Mandatory' },
        { field: 'Highwall Crest Displacement Rate', unit: 'mm / 24 hrs', sourceFeed: 'Slope Stability Radar SSR-3', threshold: 'Max 5.0 mm/day creep', obligatory: 'Mandatory' },
        { field: 'Methane (CH4) Concentration in Return Drift', unit: '% Volume in General Body', sourceFeed: 'Digital Multi-Gas Lamp Logger', threshold: 'Max 0.75% permissible', obligatory: 'Mandatory' },
        { field: 'Carbon Monoxide (CO) Concentration', unit: 'parts per million (ppm)', sourceFeed: 'Fixed Infrared Electrochemical Sensor', threshold: 'Max 50 ppm ambient', obligatory: 'High Priority' },
        { field: 'Respirable Dust Particulate (PM10)', unit: 'ug/m³ air volume', sourceFeed: 'Respirable Dust Sampler RDS-8', threshold: 'Max 100 ug/m³ NAAQS', obligatory: 'High Priority' },
        { field: 'Bench Factor of Safety (FOS)', unit: 'Numerical Index', sourceFeed: 'Geotechnical Borehole Log', threshold: 'Min 1.30 Factor of Safety', obligatory: 'Mandatory' },
      ],
    },
    sampleTablePreview: {
      headers: ['Inspection Zone', 'Shift Hours Logged', 'Accident Index', 'Highwall Radar Status', 'DGMS Verdict'],
      rows: [
        ['Seam XIV North Bench', '14,280 hrs', '0.00 [Zero Incident]', 'Displacement < 1.8mm', 'VERIFIED COMPLIANT'],
        ['Shaft-B Deep Drift', '8,940 hrs', '0.00 [Zero Incident]', 'Gas Sensor Normal (0.04% CH4)', 'VERIFIED COMPLIANT'],
        ['Crusher Yard Haulroad', '6,200 hrs', '0.00 [Zero Incident]', 'Berm Height 2.4m Safe', 'ACCEPTABLE'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 14
## Safety Performance & Statutory DGMS Compliance Audit
**Dossier Reference**: ${id}  
**Classification**: OFFICIAL SENSITIVE // CIL CMPDI STATUTORY DISCLOSURE  
**Jurisdiction**: ${region}  
**Inspecting Officer**: ${officerName} (${officerId})  
**Date of Compilation**: ${dateStr}  
**Primary Telemetry Ingested**: ${sourcesText}

---

### 1. Executive Safety Summary & Hazard Index
Pursuant to statutory requirements under the Mines Act, 1952 and Coal Mines Regulations (CMR), this filing consolidates ground monitoring data, fatal/serious incident frequency records, and occupational health metrics for all operational pits in the ${region}. Zero fatal incidents were reported during the active reporting period.

### 2. Fatality & Serious Injury Frequency Rates (FIFR / SIFR)

| Operational Unit | Man-Shifts Worked | Fatal Incidents | Serious Injuries | FIFR (per Mte) | DGMS Compliance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Opencast Cut #1 | 48,250 | 0 | 0 | 0.00 | COMPLIANT |
| Opencast Cut #2 | 39,120 | 0 | 1 (Minor) | 0.00 | UNDER REVIEW |
| Deep Seam XIV Heading | 22,400 | 0 | 0 | 0.00 | COMPLIANT |
| Main Washery Yard | 14,800 | 0 | 0 | 0.00 | COMPLIANT |

### 3. Geotechnical Stability & Sensor Drift Analysis
- Continuous real-time slope stability radar (SSR-3) active at Northern Highwall: 0.12 mm/day creep (Threshold: 5.0 mm/day).
- Automatic seismic trip sensors operational across all blasting benches.
- Pre-shift gas audits registered zero unventilated pockets.

### 4. Mandatory Safety Recommendations
1. Maintain haul road night illumination levels above 15.0 lux across all transition switchbacks.
2. Complete non-destructive ultrasonic axle testing for 240T dumper fleet before shift commencement.
3. Submit formal digital endorsement to DGMS Regional Directorate.
`,
  },

  // 2. Annexure 10B - Subsidiary-wise Overburden Removal
  {
    id: 'tmpl-annex-10b',
    annexure: 'Annexure 10B',
    name: 'Subsidiary-wise Overburden Removal (OBR)',
    officialTitle: 'Overburden Removal Efficiency, Stripping Ratio & Dragline Log',
    category: 'Mining Operations',
    relevance: 'Mining operations',
    description: 'Tracks volumetric cubic meter (BCM) overburden excavation, stripping ratios, dragline utilization, and explosive consumption across benches.',
    suggestedFormats: ['XLSX', 'CSV', 'PDF'],
    sections: [
      '1. Operational Overburden Excavation Overview',
      '2. Stripping Ratio & Bench Face Trajectory',
      '3. Heavy Earthmoving Machinery (Dragline/Shovel) Fleet Rates',
      '4. Specific Blasting Energy & Powder Factor Log',
      '5. Monsoon Advance Drainage & Dump Stability Assessment',
    ],
    keyMetrics: ['Composite BCM Excavated', 'Actual Stripping Ratio', 'Dragline Productivity (m3/hr)', 'Powder Factor (t/kg)'],
    schema: {
      statutoryReference: 'CIL Mining Operations Manual (Chapter 4), Ministry of Coal Guidelines',
      filingFrequency: 'Monthly Operational Review & Annual BSE Annexure Filing',
      requiredAnnexures: [
        { code: 'Annexure 10B', title: 'Subsidiary-wise Overburden Removal (OBR)', type: 'Primary', mandatory: true },
        { code: 'Annexure 10', title: 'Coking & Non-Coking Coal Production Log', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 11', title: 'HEMM Dragline & Shovel Deployment Census', type: 'Supporting Cross-Reference', mandatory: true },
      ],
      expectedDataPoints: [
        { field: 'Composite Overburden Excavation Volume', unit: 'Bank Cubic Meters (BCM)', sourceFeed: 'Total Station Survey & HEMM Payload', threshold: 'Target: >= 420,000 BCM/mo', obligatory: 'Mandatory' },
        { field: 'Operating Stripping Ratio (OB : Coal)', unit: 'Ratio (e.g. 3.42 : 1)', sourceFeed: 'Weighbridge & Bench Survey Ledger', threshold: 'PR Benchmark: 3.50 : 1', obligatory: 'Mandatory' },
        { field: 'Walking Dragline Average Cycle Time', unit: 'Seconds per Swing Cycle', sourceFeed: 'Dragline Onboard PLC Telemetry', threshold: 'Norm: <= 65 seconds', obligatory: 'High Priority' },
        { field: 'Blasting Powder Factor', unit: 'BCM / kg Explosive', sourceFeed: 'ANFO Magazine Issue Ledger', threshold: 'Target: 2.20 - 2.50 BCM/kg', obligatory: 'High Priority' },
        { field: 'Overburden External Dump Slope Angle', unit: 'Degrees (°)', sourceFeed: 'Drone LiDAR Digital Elevation Model', threshold: 'DGMS Max 28° Overall', obligatory: 'Mandatory' },
      ],
    },
    sampleTablePreview: {
      headers: ['Bench Section', 'Target OBR (BCM)', 'Actual OBR (BCM)', 'Variance (%)', 'Stripping Ratio (OB:Coal)'],
      rows: [
        ['Top Sandstone Seam XIV', '420,000', '438,200', '+4.3% (Ahead)', '3.42 : 1'],
        ['Interburden Shale XV', '280,000', '274,500', '-1.9% (Par)', '2.18 : 1'],
        ['Lower Basal Cut XVI', '190,000', '196,400', '+3.3% (Ahead)', '1.85 : 1'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 10B
## Overburden Removal (OBR) & Stripping Ratio Report
**Dossier Reference**: ${id}  
**Classification**: OPERATIONAL SENSITIVE // CIL PRODUCTION LEDGER  
**Field Division**: ${region}  
**Evaluation Officer**: ${officerName} (${officerId})  
**Date of Filing**: ${dateStr}  
**Sources Correlated**: ${sourcesText}

---

### 1. Operational Overburden Excavation Overview
Total composite overburden removal across ${region} reached **909,100 BCM** against the targeted milestone of 890,000 BCM, demonstrating an aggregate realization rate of **102.1%**.

### 2. Bench Strata Excavation Matrix

| Stratigraphic Bench | Target Volume (BCM) | Achieved Volume (BCM) | Dragline Deployment | Stripping Ratio |
| :--- | :--- | :--- | :--- | :--- |
| Upper Alluvium & Weathered Rock | 240,000 | 251,200 | Shovel-Dumper Sh-04 | 4.10 : 1 |
| Middle Sandstone Horizon | 420,000 | 438,200 | Dragline 24/88 'Garuda' | 3.42 : 1 |
| Interburden Carbonaceous Shale | 249,000 | 219,700 | Shovel E-02 / E-05 | 2.15 : 1 |

### 3. Explosive Consumption & Blast Geometry
- Powder factor achieved: **2.38 BCM/kg** of emulsion explosive.
- Average bench face angle maintained at 65°, preserving overall highwall slope factor of safety at 1.41.
`,
  },

  // 3. Annexure 10 - Coking & Non-Coking Coal Production
  {
    id: 'tmpl-annex-10',
    annexure: 'Annexure 10',
    name: 'Coking / Non-Coking Production (UG & OC)',
    officialTitle: 'Coal Extraction Volumes by Seam, Rank & Method',
    category: 'Production & Dispatch',
    relevance: 'Production report',
    description: 'Detailed breakdown of underground continuous miner cuts and opencast production split into metallurgical coking coal and thermal non-coking coal.',
    suggestedFormats: ['XLSX', 'CSV'],
    sections: [
      '1. Gross Seam Extraction Summary',
      '2. Underground vs Opencast Extraction Disaggregation',
      '3. Coking Coal (Steel Grade / Washery Grade) Ledger',
      '4. Non-Coking Thermal Coal Grades (G1 to G14)',
      '5. Target Variance & Month-on-Month Growth Analysis',
    ],
    keyMetrics: ['Total Coal Production (MT)', 'Opencast Share (%)', 'Coking Coal (MT)', 'Average GCV (kcal/kg)'],
    schema: {
      statutoryReference: 'Coal Mines (Conservation and Development) Act 1974 & CMR 2017',
      filingFrequency: 'Monthly Statutory Return & Annual Financial Accounts',
      requiredAnnexures: [
        { code: 'Annexure 10', title: 'Coking/Non-coking Production (UG/OC)', type: 'Primary', mandatory: true },
        { code: 'Annexure 5', title: 'Subsidiary-wise Coal Off-take and Evacuation', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 7', title: 'Subsidiary-wise Stock of Coal Verification', type: 'Supporting Cross-Reference', mandatory: false },
      ],
      expectedDataPoints: [
        { field: 'Gross Raw Coal Production', unit: 'Metric Tonnes (MT)', sourceFeed: 'Pithead In-Motion Weighbridge', threshold: 'Target: >= 250,000 MT/mo', obligatory: 'Mandatory' },
        { field: 'Underground Continuous Miner Volume', unit: 'Metric Tonnes (MT)', sourceFeed: 'Shaft Skip Counter & Scraper Conveyor', threshold: 'Uptime: >= 90.0%', obligatory: 'Mandatory' },
        { field: 'Metallurgical Coking Coal Yield', unit: 'Metric Tonnes (MT)', sourceFeed: 'Seam XII Incline Laboratory Assay', threshold: 'Ash Content <= 24.5%', obligatory: 'High Priority' },
        { field: 'Gross Calorific Value (GCV Band)', unit: 'Kilocalories / kg (kcal/kg)', sourceFeed: 'Bomb Calorimeter Automated Sampler', threshold: 'G-9/G-11 (4000-4900 kcal)', obligatory: 'Mandatory' },
      ],
    },
    sampleTablePreview: {
      headers: ['Seam & Method', 'Coal Grade', 'Monthly Target (MT)', 'Actual Extracted (MT)', 'Realization (%)'],
      rows: [
        ['Seam XIV (Opencast)', 'Non-Coking G11', '125,000', '132,450', '105.9%'],
        ['Seam XV (Opencast)', 'Non-Coking G9', '85,000', '88,120', '103.6%'],
        ['Seam XII (Underground)', 'Coking W-III', '32,000', '31,800', '99.4%'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 10
## Production Breakdown: Coking & Non-Coking Coal (UG/OC)
**Filing Reference**: ${id}  
**Subsidiary Branch**: CMPDI Regional Office II // ${region}  
**Logging Officer**: ${officerName} (${officerId})  
**Date of Record**: ${dateStr}  
**Data Feeds**: ${sourcesText}

---

### 1. Cumulative Tonnage Production Summary
Gross production for the recording period totaled **252,370 Metric Tonnes (MT)**, representing a **104.2%** realization against the statutory baseline.

| Seam Designation | Method | Coal Type | Grade Band | Production (MT) | Ash Content (%) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Seam XIV North | Opencast | Non-Coking | G-11 (4000-4300 kcal) | 132,450 | 34.2% |
| Seam XV Quarry | Opencast | Non-Coking | G-9 (4600-4900 kcal) | 88,120 | 28.5% |
| Seam XII Incline | Underground | Coking | Washery Gr-III | 31,800 | 24.1% |

### 2. Operational Observations
- Mechanical extraction via Continuous Miner CM-01 achieved an uptime of 91.8%.
- Grade slippage prevented through automated bomb-calorimeter auto-sampling at the primary pithead feeder.
`,
  },

  // 4. Annexure 6 - Sector-wise Dispatch & Rail Off-take
  {
    id: 'tmpl-annex-6',
    annexure: 'Annexure 6',
    name: 'Sector-wise Coal Dispatch & Logistics',
    officialTitle: 'Sector-wise Evacuation, Power Utility Delivery & Rake Turnaround',
    category: 'Production & Dispatch',
    relevance: 'Operations report',
    description: 'Tracks outward distribution to critical sectors including Power Utilities, Steel plants, Cement kilns, and Captive Power Plants (CPP) via Indian Railways.',
    suggestedFormats: ['XLSX', 'CSV', 'DOCX'],
    sections: [
      '1. Outward Dispatch Volume Overview',
      '2. Sectoral Allocation Matrix (Power vs Non-Power)',
      '3. Indian Railways Rake Loading & Turnaround Times',
      '4. Merry-Go-Round (MGR) Dedicated Rail Corridors',
      '5. Road-Transport Weighbridge Reconciliation',
    ],
    keyMetrics: ['Dispatched Tonnage (MT)', 'Power Sector Share (%)', 'Daily Rakes Loaded', 'Demurrage Cost Incidents'],
    schema: {
      statutoryReference: 'Fuel Supply Agreement (FSA) Mandates & Railway Freight Tariffs',
      filingFrequency: 'Daily Dispatch Telemetry & Annual BSE Statutory Annexure',
      requiredAnnexures: [
        { code: 'Annexure 6', title: 'Sector-wise Dispatch Records', type: 'Primary', mandatory: true },
        { code: 'Annexure 5', title: 'Subsidiary-wise Coal Off-take Schedules', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 8', title: 'Trade Receivables & Customer Billing Notes', type: 'Supporting Cross-Reference', mandatory: false },
      ],
      expectedDataPoints: [
        { field: 'Dispatched Power Utility Volume', unit: 'Metric Tonnes (MT)', sourceFeed: 'FOIS (Freight Operations Information System)', threshold: 'Min 85% of total evacuation', obligatory: 'Mandatory' },
        { field: 'BOXN Rakes Despatched per Day', unit: 'Rakes / Day', sourceFeed: 'Siding Loading Station PLC', threshold: 'Target: >= 14 rakes/day', obligatory: 'Mandatory' },
        { field: 'Mean Rake Turnaround Duration', unit: 'Hours : Minutes', sourceFeed: 'Railway Siding RFID Tagging', threshold: 'Target: < 3 hrs per rake', obligatory: 'High Priority' },
        { field: 'Demurrage Financial Penalty Cases', unit: 'Currency (₹ Lakhs)', sourceFeed: 'Commercial Railway Billing', threshold: 'Target: ₹ 0.00', obligatory: 'Conditional' },
      ],
    },
    sampleTablePreview: {
      headers: ['Consumer Sector', 'Programmed (MT)', 'Dispatched (MT)', 'Mode of Evacuation', 'Fulfillment (%)'],
      rows: [
        ['National Thermal Power (NTPC)', '140,000', '142,600', 'Rail Rakes (BOXN)', '101.8%'],
        ['State Electricity Boards (SEBs)', '55,000', '56,200', 'Rail / MGR', '102.1%'],
        ['Steel Authority (SAIL)', '22,000', '21,900', 'Rail (Washery Coal)', '99.5%'],
        ['Cement & Domestic Industrial', '18,000', '18,400', 'Road (Covered Trucks)', '102.2%'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 6
## Sector-wise Dispatch & Rail Evacuation Performance
**Reference ID**: ${id}  
**Jurisdiction**: ${region} Loading Sidings  
**Dispatch Controller**: ${officerName} (${officerId})  
**Date Generated**: ${dateStr}  
**Siding Manifests**: ${sourcesText}

---

### 1. Sectoral Evacuation Summary
Aggregate coal off-take cleared from regional rail sidings totaled **239,100 MT**, averaging **14.2 rail rakes per day**. Priority dispatch directives under the Fuel Supply Agreements (FSA) for supercritical thermal power stations were 100% satisfied.

| Destination Sector | FSA Quota (MT) | Dispatched (MT) | Rail Rakes (BOXN) | Fulfillment |
| :--- | :--- | :--- | :--- | :--- |
| Power Utilities (Central / State) | 195,000 | 198,800 | 78 rakes | 101.9% |
| Steel & Coking Consumers | 22,000 | 21,900 | 9 rakes | 99.5% |
| Cement & Sponge Iron Plants | 12,000 | 11,850 | 5 rakes | 98.7% |
| E-Auction & Open Market | 7,000 | 6,550 | Road | 93.5% |

### 2. Logistics & Siding Efficiencies
- Average rake loading time: **2 hours 44 minutes** per 58-wagon BOXN consist.
- In-motion rail weighbridge calibrations verified by Legal Metrology inspectors on 26 September.
`,
  },

  // 5. Annexure 5 - Subsidiary-wise Coal Off-take
  {
    id: 'tmpl-annex-5',
    annexure: 'Annexure 5',
    name: 'Subsidiary-wise Coal Off-take & Delivery',
    officialTitle: 'Comparative Off-take Schedules, Mode-wise Distribution & Quotas',
    category: 'Production & Dispatch',
    relevance: 'Production/dispatch report',
    description: 'Harmonized off-take records comparing regional subsidiary commitments with national dispatch targets and inter-subsidiary transfers.',
    suggestedFormats: ['XLSX', 'PDF'],
    sections: [
      '1. Subsidiary Off-take Target vs Achievement',
      '2. Multimodal Transit (Rail, Belt Conveyor, MGR, Road)',
      '3. Pithead Stock Adjustments vs Off-take Rate',
      '4. Long-term FSA vs Spot E-Auction Realization',
    ],
    keyMetrics: ['Total Off-take (MT)', 'Target Compliance (%)', 'Conveyor Evacuation (MT)', 'Rake Deficit/Surplus'],
    schema: {
      statutoryReference: 'CIL Marketing & Commercial Policy Framework, Chapter 6',
      filingFrequency: 'Quarterly Off-take Reconciliations & Annual BSE Filing',
      requiredAnnexures: [
        { code: 'Annexure 5', title: 'Subsidiary-wise Coal Off-take', type: 'Primary', mandatory: true },
        { code: 'Annexure 6', title: 'Sector-wise Dispatch Records', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 10', title: 'Coal Extraction Volumes by Seam', type: 'Supporting Cross-Reference', mandatory: false },
      ],
      expectedDataPoints: [
        { field: 'Gross Realized Off-take', unit: 'Metric Tonnes (MT)', sourceFeed: 'Integrated Sales Logistics ERP', threshold: '>= 98.0% of Programmed Quota', obligatory: 'Mandatory' },
        { field: 'Overland Conveyor Evacuation Share', unit: 'Metric Tonnes & Percentage', sourceFeed: 'Belt Scale Telemetry', threshold: 'Min 15% of pithead volume', obligatory: 'High Priority' },
        { field: 'Third-Party Grade Sampling Confirmation', unit: 'Percentage of Consignments Verified', sourceFeed: 'CIMFR / QCI Sampling Labs', threshold: '100% of Rake Loads', obligatory: 'Mandatory' },
      ],
    },
    sampleTablePreview: {
      headers: ['Evacuation Mode', 'Allotted Volume (MT)', 'Lifted Volume (MT)', 'Variance (%)', 'Operational Status'],
      rows: [
        ['Indian Railways Siding #2', '180,000', '184,200', '+2.3%', 'NOMINAL ACTIVE'],
        ['Cross-Pit Overland Conveyor', '45,000', '46,100', '+2.4%', 'HIGH CADENCE'],
        ['Controlled Road Transport', '15,000', '14,800', '-1.3%', 'REGULATED'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 5
## Subsidiary-wise Coal Off-take Analysis
**Report Reference**: ${id}  
**Field Command**: ${region}  
**Compiling Officer**: ${officerName} (${officerId})  
**Date of Dossier**: ${dateStr}  
**Underlying Telemetry**: ${sourcesText}

---

### 1. Cumulative Delivery Analysis
The regional mining block fulfilled **245,100 MT** of combined off-take, with rail freight accounting for **75.1%** of overall movements and overland pipe conveyors transporting **18.8%** straight to adjacent pithead thermal stations.
`,
  },

  // 6. Annexure 7 - Subsidiary-wise Stock of Coal
  {
    id: 'tmpl-annex-7',
    annexure: 'Annexure 7',
    name: 'Coal Stockpile & Spontaneous Combustion Audit',
    officialTitle: 'Pithead Coal Inventory, Drone Volume Calculation & Stock Aging',
    category: 'Mining Operations',
    relevance: 'Inventory report',
    description: 'Tracks volumetric pithead stockpile inventories, drone photogrammetry reconciliations, stack heating risk indices, and inventory write-offs.',
    suggestedFormats: ['JPG', 'PNG', 'XLSX', 'CSV'],
    sections: [
      '1. Total Physical Stockpile Inventory',
      '2. Drone LiDAR Volumetric Survey vs Ledger Balance',
      '3. Stockpile Aging & Grade Deterioration Monitoring',
      '4. Infrared Thermal Scans & Spontaneous Heating Mitigation',
      '5. Safety Berms & Dust Barrier Compliance at Stockyards',
    ],
    keyMetrics: ['Closing Physical Stock (MT)', 'Book Variance (%)', 'Stack Hot-Spots (>60°C)', 'Mean Dwell Time (Days)'],
    schema: {
      statutoryReference: 'CIL Stock Measurement Code & DGMS Coal Mine Fire Safety Guidelines',
      filingFrequency: 'Bi-monthly Drone Survey & Annual BSE Inventory Audit',
      requiredAnnexures: [
        { code: 'Annexure 7', title: 'Subsidiary-wise Stock of Coal Verification', type: 'Primary', mandatory: true },
        { code: 'Annexure 10', title: 'Monthly Production Ledger', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 5', title: 'Cumulative Coal Dispatches', type: 'Supporting Cross-Reference', mandatory: true },
      ],
      expectedDataPoints: [
        { field: 'Closing Physical Inventory', unit: 'Metric Tonnes (MT)', sourceFeed: 'UAV Drone Orthomosaic & LiDAR Cloud', threshold: 'Permissible Variance <= ±2.0%', obligatory: 'Mandatory' },
        { field: 'Internal Stack Thermal Temperature', unit: 'Degrees Celsius (°C)', sourceFeed: 'Infrared Thermal Thermography Probe', threshold: 'Alert Trigger: > 60.0°C', obligatory: 'Mandatory' },
        { field: 'Average Stockpile Residence Time', unit: 'Calendar Days', sourceFeed: 'Depot Inward-Outward ERP Ledger', threshold: 'Target: < 45 Days (Auto-combustion risk)', obligatory: 'High Priority' },
      ],
    },
    sampleTablePreview: {
      headers: ['Stockyard Depot', 'Book Balance (MT)', 'Drone Survey (MT)', 'Variance (%)', 'Thermal Alert Level'],
      rows: [
        ['Yard 1 - Seam XIV Siding', '64,200', '63,850', '-0.54% (Normal)', 'SAFE (34°C max)'],
        ['Yard 2 - Central Sizer Sump', '38,100', '38,320', '+0.57% (Normal)', 'SAFE (32°C max)'],
        ['Washery Clean Stockpile', '19,400', '19,250', '-0.77% (Normal)', 'SAFE (29°C max)'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 7
## Subsidiary-wise Stock of Coal & Inventory Verification
**Dossier Reference**: ${id}  
**Stock Depot**: ${region} Central Coal Storage  
**Survey Officer**: ${officerName} (${officerId})  
**Audit Timestamp**: ${dateStr}  
**Drone & Weighbridge Inputs**: ${sourcesText}

---

### 1. Stockpile Reconciliation Findings
UAV drone photogrammetry and stationary laser scanning verified an aggregate physical inventory of **121,420 MT** against book records of 121,700 MT, yielding an exemplary variance of **-0.23%**, well within the statutory permissible threshold ($\pm 2.0\%$).
`,
  },

  // 7. Annexure 10A - Washery Coal Production
  {
    id: 'tmpl-annex-10a',
    annexure: 'Annexure 10A',
    name: 'Washery Coal Production & Beneficiation Yield',
    officialTitle: 'Raw Coal Feed, Heavy Media Separation Yield & Slurry Rejection',
    category: 'Quality & Beneficiation',
    relevance: 'Quality report',
    description: 'Tracks dense media cyclones, float-and-sink recovery percentages, clean coking coal enrichment, and tailings dewatering performance.',
    suggestedFormats: ['XLSX', 'CSV'],
    sections: [
      '1. Beneficiation Plant Operating Envelope',
      '2. Raw Coal Feed Rates & Input Ash Distribution',
      '3. Clean Coal Yield & Caloric Value Enrichment',
      '4. Middlings & Rejects Utilization Ledger',
      '5. Heavy Media (Magnetite) Consumption Efficiency',
    ],
    keyMetrics: ['Raw Coal Fed (MT)', 'Clean Coal Yield (%)', 'Magnetite Consumption (kg/t)', 'Ash Reduction (Δ%)'],
    schema: {
      statutoryReference: 'CIL Coal Beneficiation Norms & Steel Grade Allocation Criteria',
      filingFrequency: 'Monthly Quality Dossier & Annual BSE Disclosures',
      requiredAnnexures: [
        { code: 'Annexure 10A', title: 'Washery Coal Production Log', type: 'Primary', mandatory: true },
        { code: 'Annexure 10', title: 'Underground Coking Seam Feed Tonnage', type: 'Supporting Cross-Reference', mandatory: true },
      ],
      expectedDataPoints: [
        { field: 'Raw Coal Processed', unit: 'Metric Tonnes (MT)', sourceFeed: 'Washery Inflow Weightometer', threshold: 'Target: >= 65,000 MT/mo', obligatory: 'Mandatory' },
        { field: 'Clean Coking Coal Yield Ratio', unit: 'Percentage of Raw Feed (%)', sourceFeed: 'Cyclone Underflow/Overflow Assays', threshold: 'Target: >= 55.0% Yield', obligatory: 'Mandatory' },
        { field: 'Clean Coal Ash Concentration', unit: 'Percentage (%)', sourceFeed: 'Proximate Ash Analyzer Oven', threshold: 'Max 18.0% Ash for Steel Grade', obligatory: 'Mandatory' },
        { field: 'Heavy Media (Magnetite) Loss Rate', unit: 'kg / Tonne of Feed', sourceFeed: 'Magnetic Separator Drain Log', threshold: 'Standard: < 0.90 kg/tonne', obligatory: 'High Priority' },
      ],
    },
    sampleTablePreview: {
      headers: ['Washery Module', 'Raw Feed (MT)', 'Clean Yield (%)', 'Feed Ash (%)', 'Clean Ash (%)'],
      rows: [
        ['Dense Media Cyclone Circuit 1', '42,000', '58.4%', '33.2%', '17.8%'],
        ['Fine Coal Spiral Separator 2', '18,500', '51.2%', '36.5%', '18.4%'],
        ['Flotation Froth Circuit 3', '8,200', '62.1%', '28.0%', '16.5%'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 10A
## Washery Coal Beneficiation & Yield Performance
**Inspection Dossier**: ${id}  
**Plant Facility**: ${region} Coal Preparation Complex  
**Metallurgical Quality Officer**: ${officerName} (${officerId})  
**Date of Run**: ${dateStr}  
**Sample Laboratories**: ${sourcesText}

---

### 1. Beneficiation Yield & Quality Improvement
The heavy media washery circuit processed **68,700 MT** of high-ash raw feed, yielding **38,810 MT** of premium coking coal with an average ash content lowered from 33.4% down to **17.8%**, fulfilling SAIL technical procurement requirements.
`,
  },

  // 8. Annexure 11 - Population of Equipment & Fleet Health
  {
    id: 'tmpl-annex-11',
    annexure: 'Annexure 11',
    name: 'Heavy Earthmoving Equipment (HEMM) Audit',
    officialTitle: 'HEMM Population, Fleet Availability, Utilization & Breakdown Logs',
    category: 'Asset & Fleet',
    relevance: 'Asset report',
    description: 'Monitors inventory of draglines, electric shovels, 240T dumpers, blast hole drills, and dozers against DGMS safety and CMPDI maintenance standards.',
    suggestedFormats: ['DOCX', 'XLSX', 'PDF'],
    sections: [
      '1. Heavy Machinery Deployment Census',
      '2. Fleet Availability Index vs Utilization Target',
      '3. Mean Time Between Failures (MTBF) & Mean Time to Repair (MTTR)',
      '4. Lubricant, Tyre Life & Wear Component Surveillance',
      '5. Overhaul Schedules & Capital Rehabilitation Pipeline',
    ],
    keyMetrics: ['Total Fleet Strength', 'Overall Availability (%)', 'Overall Utilization (%)', 'Critical Spares Stock Ratio'],
    schema: {
      statutoryReference: 'CMPDI Heavy Earth Moving Machinery Standards & DGMS HEMM Circulars',
      filingFrequency: 'Monthly Maintenance Audit & Annual BSE Annexure 11 Filing',
      requiredAnnexures: [
        { code: 'Annexure 11', title: 'Population of Equipment Census', type: 'Primary', mandatory: true },
        { code: 'Annexure 10B', title: 'Overburden Removal Stripping Operations', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 12', title: 'Plant & Machinery Capital Expenditure', type: 'Supporting Cross-Reference', mandatory: false },
      ],
      expectedDataPoints: [
        { field: 'Fleet Availability Percentage', unit: 'Percentage of Operating Hours (%)', sourceFeed: 'Fleet Management System (FMS) Telemetry', threshold: 'CMPDI Standard: >= 82.0%', obligatory: 'Mandatory' },
        { field: 'Fleet Utilization Percentage', unit: 'Percentage of Available Hours (%)', sourceFeed: 'Engine Run Hours & Job Cards', threshold: 'CMPDI Standard: >= 72.0%', obligatory: 'Mandatory' },
        { field: 'Mean Time Between Failures (MTBF)', unit: 'Operating Hours (hrs)', sourceFeed: 'Preventative Maintenance Logs', threshold: 'Target: > 120 Hours', obligatory: 'High Priority' },
        { field: 'Off-Highway Giant Tyre Running Life', unit: 'Operating Hours (hrs)', sourceFeed: 'Tyre Pressure Monitoring System (TPMS)', threshold: 'Target: > 4,500 Operating Hours', obligatory: 'Conditional' },
      ],
    },
    sampleTablePreview: {
      headers: ['Machine Class', 'Fleet Population', 'Availability Target', 'Actual Availability', 'Mean Utilization'],
      rows: [
        ['Walking Draglines (24/88)', '2 units', '85.0%', '88.4%', '78.2%'],
        ['Electric Rope Shovels (10-20m³)', '6 units', '82.0%', '85.1%', '74.5%'],
        ['Off-Highway Dumpers (100T-240T)', '34 units', '80.0%', '83.2%', '72.0%'],
        ['Rotary Blast Hole Drills (250mm)', '8 units', '85.0%', '87.0%', '69.4%'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 11
## Heavy Earthmoving Machinery (HEMM) Census & Health
**Census Reference**: ${id}  
**Workshop & Maintenance Depot**: ${region} Central Mining Workshop  
**Fleet Superintendent**: ${officerName} (${officerId})  
**Audit Date**: ${dateStr}  
**Telemetry Ingested**: ${sourcesText}

---

### 1. Fleet Strength & Availability Summary
The operational HEMM inventory across the district comprises **50 heavy primary machines**. Fleet availability averaged **84.8%** against the CMPDI mandate of 82.0%.
`,
  },

  // 9. Annexure 13 - Status of Project Implementation
  {
    id: 'tmpl-annex-13',
    annexure: 'Annexure 13',
    name: 'Mining Project Implementation & PR Milestones',
    officialTitle: 'Capital Project Progress, Land Acquisition, Forestry & Expansion Milestones',
    category: 'Project & Planning',
    relevance: 'Project report',
    description: 'Comprehensive project progress monitoring tracking environmental clearance (EC), forest clearance (FC Stage-II), land possession, and construction of Coal Handling Plants (CHP).',
    suggestedFormats: ['PDF', 'DOCX'],
    sections: [
      '1. Strategic Project Status & Project Report (PR) Baseline',
      '2. Land Possession & R&R (Resettlement & Rehabilitation) Progress',
      '3. Statutory Clearances (EC, FC Stage I/II, Consent to Operate)',
      '4. Rapid Coal Loading System (SILO) Construction Progress',
      '5. Critical Path Milestones & Slippage Risk Mitigation',
    ],
    keyMetrics: ['Project Completion (%)', 'Capex Spent (₹ Cr)', 'Land Possessed (Ha)', 'EC Approved Capacity (MTPA)'],
    schema: {
      statutoryReference: 'MoEF&CC Environmental Norms, CIL Project Approval Guidelines',
      filingFrequency: 'Quarterly Milestone Review & Annual Statutory Disclosures',
      requiredAnnexures: [
        { code: 'Annexure 13', title: 'Status of Project Implementation', type: 'Primary', mandatory: true },
        { code: 'Annexure 12', title: 'Capital Expenditure Budget Tracking', type: 'Supporting Cross-Reference', mandatory: true },
      ],
      expectedDataPoints: [
        { field: 'Physical Milestone Completion Rate', unit: 'Percentage (%)', sourceFeed: 'CMPDI Project Monitoring Dashboard', threshold: 'Target: On-Schedule (Variance < 5%)', obligatory: 'Mandatory' },
        { field: 'Forestry Stage-II Clearance Status', unit: 'Legal Status', sourceFeed: 'PARIVESH Portal Registry', threshold: 'Compliance: Verified In-Hand', obligatory: 'Mandatory' },
        { field: 'Land Possession Acquired', unit: 'Hectares (Ha)', sourceFeed: 'Revenue Circle Land Records', threshold: 'Target: 100% of Phase 1 Mining Area', obligatory: 'High Priority' },
        { field: 'CHP SILO Erection Status', unit: 'Tonnage Capacity & Progress %', sourceFeed: 'Turnkey EPC Construction Audit', threshold: 'Operational Ready by Scheduled Target', obligatory: 'High Priority' },
      ],
    },
    sampleTablePreview: {
      headers: ['Capital Project Component', 'Approved Cost (₹ Cr)', 'Cumulative Spend (₹ Cr)', 'Target Date', 'Milestone Status'],
      rows: [
        ['North Ridge Expansion (15 MTPA)', '₹ 1,840 Cr', '₹ 1,120 Cr', 'Mar 2027', 'ON TRACK'],
        ['Rapid Loading Railway SILO (4000 TPH)', '₹ 220 Cr', '₹ 185 Cr', 'Dec 2026', 'ADVANCED STAGE (92%)'],
        ['Overland Conveyor Link (7.5 km)', '₹ 145 Cr', '₹ 98 Cr', 'Jun 2027', 'ON SCHEDULE'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 13
## Mining Project Implementation & Milestone Tracking
**Project Reference**: ${id}  
**Field Division**: ${region} Mining Project Office  
**Nodal Officer**: ${officerName} (${officerId})  
**Filing Date**: ${dateStr}  
**DPR Documentation**: ${sourcesText}

---

### 1. Major Expansion Overview
Project Implementation for the **North Ridge 15 MTPA Expansion** reached **68.4% physical completion**. Key civil infrastructure for the 4,000 TPH automated railway loading silo is now 92% erected.
`,
  },

  // 10. Annexure 12 - Capital Expenditure (CAPEX)
  {
    id: 'tmpl-annex-12',
    annexure: 'Annexure 12',
    name: 'Capital Expenditure (CAPEX) Ledger',
    officialTitle: 'Subsidiary Capital Outlay, Infrastructure Investments & Budget Utilization',
    category: 'Financial & Capex',
    relevance: 'Financial report',
    description: 'Tracks capital deployment across heavy machinery procurement, railway sidings, land acquisition, safety gear, and digitalization initiatives.',
    suggestedFormats: ['XLSX', 'CSV'],
    sections: [
      '1. Fiscal CAPEX Allocation vs Actual Expenditure',
      '2. Plant & Machinery (P&M) Capital Outlay',
      '3. Railway Infrastructure & First-Mile Connectivity (FMC)',
      '4. Safety Capital & Environmental Expenditure',
      '5. Quarter-End Variance & Re-appropriation Proposals',
    ],
    keyMetrics: ['Budget Allocated (₹ Cr)', 'Expenditure Incurred (₹ Cr)', 'Utilization Ratio (%)', 'FMC Investment Share (%)'],
    schema: {
      statutoryReference: 'Department of Public Enterprises (DPE) CAPEX Guidelines & CIL Finance Manual',
      filingFrequency: 'Monthly Ministry Review & Annual BSE Financial Filing',
      requiredAnnexures: [
        { code: 'Annexure 12', title: 'Capital Expenditure (CAPEX) Ledger', type: 'Primary', mandatory: true },
        { code: 'Annexure 1', title: 'Profitability and Financial Summary', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 13', title: 'Capital Project Progress Status', type: 'Supporting Cross-Reference', mandatory: false },
      ],
      expectedDataPoints: [
        { field: 'Budget Estimates (BE) Allocation', unit: '₹ Crores', sourceFeed: 'SAP Financial Ledger', threshold: 'Target: 100% Capital Absorbed', obligatory: 'Mandatory' },
        { field: 'First-Mile Connectivity (FMC) Spend', unit: '₹ Crores', sourceFeed: 'Railway Sidings EPC Invoices', threshold: 'Minimum 25% of total outlay', obligatory: 'High Priority' },
        { field: 'Safety Gear & Environmental Capex', unit: '₹ Crores', sourceFeed: 'Safety Directorate Procurement Slips', threshold: 'Non-divertible dedicated head', obligatory: 'Mandatory' },
      ],
    },
    sampleTablePreview: {
      headers: ['Budget Head', 'BE 2026-27 (₹ Cr)', 'Actual Spend (₹ Cr)', 'Utilization (%)', 'Financial Status'],
      rows: [
        ['Plant & Heavy Machinery (P&M)', '₹ 420.0 Cr', '₹ 392.5 Cr', '93.5%', 'APPROVED EXPENDITURE'],
        ['First-Mile Railway Connectivity', '₹ 180.0 Cr', '₹ 164.2 Cr', '91.2%', 'ON SCHEDULE'],
        ['Land Acquisition & R&R Claims', '₹ 95.0 Cr', '₹ 91.0 Cr', '95.8%', 'DISBURSED'],
        ['Safety Equipment & Digital Sensors', '₹ 32.0 Cr', '₹ 30.8 Cr', '96.3%', 'COMMITTED'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 12
## Capital Expenditure (CAPEX) Utilization Report
**Fiscal Record**: ${id}  
**Account Unit**: ${region} Finance & Accounts Wing  
**Verification Officer**: ${officerName} (${officerId})  
**Ledger Date**: ${dateStr}  
**Accounts Feeds**: ${sourcesText}

---

### 1. CAPEX Performance Overview
Capital expenditure for ${region} registered **₹ 678.5 Cr** against the pro-rata allocation of ₹ 727.0 Cr, reflecting **93.3% utilization efficiency**.
`,
  },

  // 11. Annexure 1 - Profitability of CIL & Subsidiaries
  {
    id: 'tmpl-annex-1',
    annexure: 'Annexure 1',
    name: 'Subsidiary Profitability & Cost of Extraction',
    officialTitle: 'Gross Margin, Cost per Tonne (P&M / Explosives / Power) & EBITDA',
    category: 'Financial & Capex',
    relevance: 'Financial report template',
    description: 'Calculates pithead net realization, extraction cost per tonne of coal, diesel and electricity tariffs, and operating profitability.',
    suggestedFormats: ['XLSX', 'CSV'],
    sections: [
      '1. Revenue from Operations & Realization per Tonne',
      '2. Cost Structure Analysis (Cost / Tonne Breakdown)',
      '3. Power & Diesel Unit Consumption Rates',
      '4. Stores, Spares & Explosive Expenditure',
      '5. Net Operational Profit (EBITDA)',
    ],
    keyMetrics: ['Net Realization (₹/tonne)', 'Cost of Production (₹/tonne)', 'Operating EBITDA (₹ Cr)', 'Diesel Consumption (L/BCM)'],
    schema: {
      statutoryReference: 'Companies Act 2013 & SEBI LODR Regulations (Regulation 33)',
      filingFrequency: 'Quarterly Audited Financials & Annual BSE Disclosure',
      requiredAnnexures: [
        { code: 'Annexure 1', title: 'Profit of CIL & Subsidiaries', type: 'Primary', mandatory: true },
        { code: 'Annexure 10', title: 'Gross Coal Extraction Volumes', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 8', title: 'Trade Receivables & Billing Recovery', type: 'Supporting Cross-Reference', mandatory: false },
      ],
      expectedDataPoints: [
        { field: 'Pithead Realization Price', unit: '₹ per Metric Tonne', sourceFeed: 'Commercial Sales Invoice Records', threshold: 'Benchmarked against CIL Price Circular', obligatory: 'Mandatory' },
        { field: 'Direct Production Cost per Tonne', unit: '₹ per Metric Tonne', sourceFeed: 'Cost Accounting Statements', threshold: 'Target: < ₹ 980 / tonne', obligatory: 'Mandatory' },
        { field: 'High Speed Diesel (HSD) Consumption Index', unit: 'Litres / BCM of Overburden', sourceFeed: 'Fuel Bowser Automated Dispensers', threshold: 'Target: < 0.78 L/BCM', obligatory: 'High Priority' },
        { field: 'Operating EBITDA Margin', unit: 'Percentage of Turnover (%)', sourceFeed: 'Audited Financial Ledgers', threshold: 'Target: > 35.0%', obligatory: 'Mandatory' },
      ],
    },
    sampleTablePreview: {
      headers: ['Cost Component', 'Budget (₹/tonne)', 'Actual (₹/tonne)', 'Variance (₹)', 'Audit Evaluation'],
      rows: [
        ['Salaries & Wages', '₹ 480 /t', '₹ 472 /t', '- ₹ 8 /t (Favorable)', 'VERIFIED'],
        ['Heavy Equipment Diesel & Lubes', '₹ 220 /t', '₹ 214 /t', '- ₹ 6 /t (Favorable)', 'VERIFIED'],
        ['Explosives & Blasting Consumables', '₹ 68 /t', '₹ 65 /t', '- ₹ 3 /t (Favorable)', 'OPTIMAL'],
        ['Power & Electrical Tariff', '₹ 84 /t', '₹ 81 /t', '- ₹ 3 /t (Favorable)', 'NOMINAL'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 1
## Profitability of CIL & Subsidiary Operating Margins
**Statement Ref**: ${id}  
**Division**: ${region} Operational Cost Accounts  
**Auditing Officer**: ${officerName} (${officerId})  
**Reporting Date**: ${dateStr}  
**Accounts Ledger**: ${sourcesText}

---

### 1. Unit Extraction Cost & Net Realization
Average cost of coal extraction for the sector dropped to **₹ 915 per tonne** against a realization price of **₹ 1,780 per tonne**, resulting in a robust operating margin of **48.6%**.
`,
  },

  // 12. Annexure 8 - Trade Receivables
  {
    id: 'tmpl-annex-8',
    annexure: 'Annexure 8',
    name: 'Trade Receivables & Commercial Recovery',
    officialTitle: 'Power Sector Billing, Aging Debtors & Letter of Credit (LC) Backing',
    category: 'Financial & Capex',
    relevance: 'Financial report',
    description: 'Tracks outstanding receivables from State GENCOs and independent power producers (IPPs), disputed bills, and Letter of Credit coverage.',
    suggestedFormats: ['XLSX', 'CSV'],
    sections: [
      '1. Gross Receivables Position & Aging Slabs',
      '2. Sectoral Debtors (Discoms vs Steel vs IPPs)',
      '3. Disputed Billing Reconciliation (Grade / Third-Party Sampling)',
      '4. Letter of Credit (LC) & Tripartite Agreement Security',
    ],
    keyMetrics: ['Total Receivables (₹ Cr)', 'Unsecured Debtors (%)', 'Debtor Days (DSO)', 'Recovery Realization Rate (%)'],
    schema: {
      statutoryReference: 'Ind AS 109 Financial Instruments & SEBI Disclosure Requirements',
      filingFrequency: 'Quarterly Trade Audit & Annual BSE Filing',
      requiredAnnexures: [
        { code: 'Annexure 8', title: 'Trade Receivables Ledger', type: 'Primary', mandatory: true },
        { code: 'Annexure 6', title: 'Sector-wise Coal Dispatch Consignments', type: 'Supporting Cross-Reference', mandatory: true },
      ],
      expectedDataPoints: [
        { field: 'Gross Outstanding Debtors', unit: '₹ Crores', sourceFeed: 'Customer Ledger Statements', threshold: 'Target: Realization > 95%', obligatory: 'Mandatory' },
        { field: 'Aging Debtors Beyond 180 Days', unit: '₹ Crores & % of Total', sourceFeed: 'Aging Schedule Accounts', threshold: 'Target: < 5% of gross receivables', obligatory: 'Mandatory' },
        { field: 'Letter of Credit (LC) Collateral Coverage', unit: 'Percentage (%)', sourceFeed: 'Bank Trade Finance Portals', threshold: 'Mandatory: 100% for private IPPs', obligatory: 'Mandatory' },
      ],
    },
    sampleTablePreview: {
      headers: ['Power Utility Client', 'Total Dues (₹ Cr)', 'Current (<60d)', 'Overdue (>180d)', 'LC Coverage'],
      rows: [
        ['State Electricity Utility A', '₹ 142.5 Cr', '₹ 120.0 Cr', '₹ 22.5 Cr', '100% LC Backed'],
        ['Thermal Power Corporation B', '₹ 88.0 Cr', '₹ 88.0 Cr', '₹ 0.0 Cr', 'Tripartite Direct Debit'],
        ['Regional Private IPP', '₹ 18.2 Cr', '₹ 12.0 Cr', '₹ 6.2 Cr', 'Letter of Credit Active'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 8
## Trade Receivables & Commercial Recovery Dossier
**Audit Code**: ${id}  
**Commercial Ledger**: ${region} Sales Accounts  
**Commercial Officer**: ${officerName} (${officerId})  
**Date of Ledger**: ${dateStr}  
**Billing Invoices**: ${sourcesText}

---

### 1. Outstanding Liquidity Assessment
Total outstanding trade receivables stand at **₹ 248.7 Cr**, with **91.4%** falling under secure banking Letters of Credit or the Ministry of Power Tripartite payment mechanism.
`,
  },

  // 13. Annexure 9 - Statutory Levies & Royalties
  {
    id: 'tmpl-annex-9',
    annexure: 'Annexure 9',
    name: 'Statutory Levies, Royalties & DMF Collections',
    officialTitle: 'Royalty to State Governments, DMF (District Mineral Foundation) & NMET Payments',
    category: 'Safety & Statutory',
    relevance: 'Compliance report',
    description: 'Statutory remittance ledger covering 14% ad-valorem royalty, 30% DMF allocation, 2% NMET, clean environment cess, and GST compensation.',
    suggestedFormats: ['XLSX', 'PDF'],
    sections: [
      '1. Gross Statutory Levies Remitted to State & Central Exchequers',
      '2. State Government Royalty Reconciliation (14% Ad-Valorem)',
      '3. District Mineral Foundation (DMF) Trust Fund Allocation',
      '4. National Mineral Exploration Trust (NMET) Contributions',
      '5. Environmental Cess & GST Compensation Tax Clearances',
    ],
    keyMetrics: ['Total Levies Remitted (₹ Cr)', 'State Royalty Share (₹ Cr)', 'DMF Remittance (₹ Cr)', 'Compliance Clearance Status'],
    schema: {
      statutoryReference: 'Mines & Minerals (Development & Regulation) Act 1957, Section 9',
      filingFrequency: 'Monthly Treasury Challans & Annual BSE Statutory Filing',
      requiredAnnexures: [
        { code: 'Annexure 9', title: 'Statutory Levies & Royalties Ledger', type: 'Primary', mandatory: true },
        { code: 'Annexure 10', title: 'Coal Production Weight Records', type: 'Supporting Cross-Reference', mandatory: true },
      ],
      expectedDataPoints: [
        { field: 'Mineral Royalty Remittance', unit: '14% Ad-Valorem (₹ Crores)', sourceFeed: 'State Mining Directorate Challan', threshold: '100% Remitted without Default', obligatory: 'Mandatory' },
        { field: 'District Mineral Foundation (DMF)', unit: '30% of Royalty (₹ Crores)', sourceFeed: 'District Collector Trust Receipt', threshold: 'Statutory 30% of assessed royalty', obligatory: 'Mandatory' },
        { field: 'National Mineral Exploration Trust', unit: '2% of Royalty (₹ Crores)', sourceFeed: 'Central Mineral Trust Treasury', threshold: 'Statutory 2% of assessed royalty', obligatory: 'Mandatory' },
      ],
    },
    sampleTablePreview: {
      headers: ['Statutory Head', 'Rate Basis', 'Amount Accrued (₹ Cr)', 'Amount Deposited (₹ Cr)', 'Challan Status'],
      rows: [
        ['Mineral Royalty', '14% Ad-valorem', '₹ 44.8 Cr', '₹ 44.8 Cr', 'TREASURY VERIFIED'],
        ['District Mineral Foundation (DMF)', '30% of Royalty', '₹ 13.44 Cr', '₹ 13.44 Cr', 'TRUST RECEIPT ISSUED'],
        ['Nat. Mineral Exploration (NMET)', '2% of Royalty', '₹ 0.89 Cr', '₹ 0.89 Cr', 'CENTRAL TREASURY OK'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 9
## Statutory Levies, Royalty & DMF Remittance Compliance
**Challan Master Code**: ${id}  
**State Mineral Wing**: ${region} Mining Revenue Circle  
**Authorized Signatory**: ${officerName} (${officerId})  
**Remittance Date**: ${dateStr}  
**Treasury Portals**: ${sourcesText}

---

### 1. Exchequers Remittance Certification
All statutory dues totaling **₹ 59.13 Cr** under Section 9 of the Mines and Minerals (Development and Regulation) Act have been deposited in full with zero pending arrears.
`,
  },

  // 14. Annexure 15 - Manpower Data & HR Ergonomics
  {
    id: 'tmpl-annex-15',
    annexure: 'Annexure 15',
    name: 'Manpower Census & Shift Productivity',
    officialTitle: 'Executive/Non-Executive Headcount, Output per Manshift (OMS) & Attrition',
    category: 'Workforce & HR',
    relevance: 'HR report',
    description: 'Personnel deployment census tracking underground/opencast staff, Output per Manshift (OMS), statutory shift hours, training, and pension fund deductions.',
    suggestedFormats: ['XLSX', 'DOCX'],
    sections: [
      '1. District Manpower Census & Demographic Composition',
      '2. Output per Manshift (OMS) Index (Overall vs Opencast)',
      '3. Statutory Vocational Training & DGMS Skill Refreshers',
      '4. Health & Medical Examinations (Periodic Medical Exam - PME)',
      '5. Overtime Rationalization & Shift Deployment Optimization',
    ],
    keyMetrics: ['Total Regular Employees', 'Contractor Work Force', 'Output per Manshift (OMS in Tonnes)', 'PME Health Clearance (%)'],
    schema: {
      statutoryReference: 'National Coal Wage Agreement (NCWA-XI) & Mines Rules 1955',
      filingFrequency: 'Quarterly Workforce Census & Annual BSE Filing',
      requiredAnnexures: [
        { code: 'Annexure 15', title: 'Manpower Census & Demographics', type: 'Primary', mandatory: true },
        { code: 'Annexure 14', title: 'Safety Health Surveillance & PME Logs', type: 'Supporting Cross-Reference', mandatory: true },
        { code: 'Annexure 10', title: 'Total Coal Extraction Tonnage', type: 'Supporting Cross-Reference', mandatory: true },
      ],
      expectedDataPoints: [
        { field: 'Output per Manshift (OMS Opencast)', unit: 'Tonnes / Shift', sourceFeed: 'Biometric Attendance & Tonnage Records', threshold: 'Target: > 10.5 t/manshift', obligatory: 'Mandatory' },
        { field: 'Periodic Medical Examination (PME) Rate', unit: 'Percentage of Eligible Workforce (%)', sourceFeed: 'Colliery Hospital Health Records', threshold: 'Target: 100% within statutory cycle', obligatory: 'Mandatory' },
        { field: 'Statutory Vocational Training Completed', unit: 'Training Hours / Officer', sourceFeed: 'Mining Vocational Training Center', threshold: 'DGMS Mandated Refresher Cleared', obligatory: 'High Priority' },
      ],
    },
    sampleTablePreview: {
      headers: ['Staff Cadre', 'Authorized Roll', 'Present on Roll', 'Output / Manshift (OMS)', 'PME Compliance'],
      rows: [
        ['Executives / Engineers', '112', '108', '—', '100% Medically Fit'],
        ['Skilled Excavation Operators', '420', '412', '12.4 t/shift', '98.5% Fit'],
        ['Underground Specialized Crew', '280', '268', '3.8 t/shift', '100% Fit'],
        ['Technicians & Mechanics', '180', '175', '—', '99.0% Fit'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# CIL Annual Regulatory Filing: Annexure 15
## Manpower Data, Headcount & Productivity (OMS)
**Human Resources Ledger**: ${id}  
**Subsidiary Division**: ${region} Personnel Directorate  
**Staff Welfare Officer**: ${officerName} (${officerId})  
**Census Date**: ${dateStr}  
**Biometric Logs**: ${sourcesText}

---

### 1. Workforce Productivity & OMS Performance
Aggregate Output per Manshift (OMS) across opencast benches attained a high of **12.4 Tonnes**, supported by 100% completion of mandatory safety drills.
`,
  },

  // 15. Master Integrated Field Dossier (Annexure 1-15 Combined Field Audit)
  {
    id: 'tmpl-master-audit',
    annexure: 'Master Field Audit',
    name: 'Comprehensive CIL Master Intelligence Dossier',
    officialTitle: 'Multi-Annexure Integrated Field Assessment (Operations, Safety, OBR & Finance)',
    category: 'Mining Operations',
    relevance: 'Master operations dossier',
    description: 'All-inclusive operational dossier synthesizing safety telemetry, volumetric overburden stripping, coal extraction, quality grading, and railway dispatches.',
    suggestedFormats: ['PDF', 'XLSX', 'CSV', 'DOCX', 'TXT', 'PNG', 'JPG'],
    sections: [
      '1. General Executive Intelligence Summary',
      '2. Production, Overburden Stripping & Stripping Ratio',
      '3. Highwall Slope Stability & DGMS Safety Thresholds',
      '4. Beneficiation Yield & Quality Dispatch Matrix',
      '5. Fleet Telemetry & First-Mile Rail Operations',
      '6. Consolidated Statutory Directives & Endorsements',
    ],
    keyMetrics: ['Composite Extraction Realization (%)', 'Safety Factor (FOS)', 'Overburden Stripping (BCM)', 'Rail Dispatch Compliance (%)'],
    schema: {
      statutoryReference: 'Comprehensive Coal India Master Filing Norms & DGMS Safety Charter 2026',
      filingFrequency: 'Bi-annual Comprehensive Inspection & Annual General Meeting (AGM) Report',
      requiredAnnexures: [
        { code: 'Annexure 14', title: 'Safety Performance & DGMS Compliance Audit', type: 'Primary', mandatory: true },
        { code: 'Annexure 10B', title: 'Overburden Stripping Trajectory (OBR)', type: 'Primary', mandatory: true },
        { code: 'Annexure 10', title: 'Coking/Non-coking Coal Extraction Ledger', type: 'Primary', mandatory: true },
        { code: 'Annexure 6', title: 'Rail Rake Allocation & Freight Despatch', type: 'Primary', mandatory: true },
        { code: 'Annexure 11', title: 'Heavy Earthmoving Fleet (HEMM) Availability', type: 'Supporting Cross-Reference', mandatory: true },
      ],
      expectedDataPoints: [
        { field: 'Composite Extraction Realization', unit: 'Metric Tonnes and % Target', sourceFeed: 'Consolidated Pithead Weighbridge', threshold: 'Target: >= 100.0% Realization', obligatory: 'Mandatory' },
        { field: 'Composite Overburden Removal Volume', unit: 'Bank Cubic Meters (BCM)', sourceFeed: 'Total Station & Highwall Radar', threshold: 'Target: >= 900,000 BCM', obligatory: 'Mandatory' },
        { field: 'Slope Stability Minimum Safety Factor', unit: 'Numerical Factor (FOS)', sourceFeed: 'Geotechnical Borehole Loggers', threshold: 'Statutory Standard: >= 1.30 FOS', obligatory: 'Mandatory' },
        { field: 'First-Mile Rail Dispatch Realization', unit: 'Railway Rakes / Month', sourceFeed: 'FOIS Dedicated Freight Portal', threshold: 'FSA Target 100% Fulfillment', obligatory: 'Mandatory' },
      ],
    },
    sampleTablePreview: {
      headers: ['Pillar Assessment', 'Baseline Target', 'Achieved Metric', 'Variance', 'Statutory Status'],
      rows: [
        ['Seam XIV Extraction', '125,000 MT', '132,450 MT', '+5.9%', 'EXCEEDED'],
        ['Overburden Removal (OBR)', '420,000 BCM', '438,200 BCM', '+4.3%', 'COMPLIANT'],
        ['Slope Safety Radar', 'FOS > 1.30', 'FOS = 1.42', '+0.12', 'OPTIMAL SAFE'],
        ['Rake Dispatch Compliance', '75 rakes', '78 rakes', '+3 rakes', 'CLEARED'],
      ],
    },
    markdownTemplate: ({ id, officerName, officerId, region, dateStr, sourcesText }) => `# Comprehensive Master Field Intelligence Dossier
## Integrated CIL / CMPDI Operational Audit & Annual Filing Annexures
**Master Reference**: ${id}  
**Classification**: OFFICIAL SENSITIVE // DIRECTORS BOARD DISCLOSURE  
**Jurisdiction**: ${region} Mining Reserve  
**Chief Evaluating Officer**: ${officerName} (${officerId})  
**Date of Compilation**: ${dateStr}  
**Integrated Evidence Sources**: ${sourcesText}

---

### 1. Executive Intelligence Overview
Pursuant to statutory directions under the Coal Mines Regulations (CMR), DGMS circulars, and CIL annual reporting standards, this dossier consolidates telemetry evidence from all operational benches in the ${region}.

### 2. Primary Mining & Safety Metrics

| Pillar Dimension | Statutory Standard | Observed Metric | Evaluation Status |
| :--- | :--- | :--- | :--- |
| Overburden Removal (OBR) | Min 420,000 BCM | 438,200 BCM | EXCEEDED (+4.3%) |
| Highwall Slope Factor of Safety | Min 1.30 FOS | 1.42 FOS | NOMINAL SAFE |
| Methane Gas Concentration | Max 0.75% | 0.05% | OPTIMAL SAFE |
| Railway Dispatch Target | 100% FSA Quota | 101.9% Dispatched | FULLY SATISFIED |

### 3. Concluding Statutory Directives
1. Maintain regular laser highwall monitoring sweeps through shift rotations.
2. Advance electrical auxiliary fan rotor lubrication ahead of scheduled maintenance.
3. Transmit signed digital copy to CIL Headquarters and Regional DGMS Inspectorate.
`,
  },
];
