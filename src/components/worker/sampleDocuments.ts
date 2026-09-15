import { SampleDocument } from './types';

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: 'financial-audit-q4',
    title: 'Q4 Global SaaS Financial & Risk Audit',
    category: 'Finance & Strategy',
    badge: 'Financial Audit',
    description: 'Quarterly review covering $42M ARR, 114% net retention, burn multiple, customer acquisition efficiency, and churn headwinds.',
    fileName: 'Q4_2025_SaaS_Financial_Audit.pdf',
    content: `# NEXUS CLOUD INC. - FINANCIAL AUDIT & OPERATIONAL REVIEW
CONFIDENTIAL - BOARD OF DIRECTORS BRIEFING
Period: Q4 FY2025 (October 1 - December 31, 2025)

1. FINANCIAL PERFORMANCE SNAPSHOT
- Annual Recurring Revenue (ARR): $42.6M (Target: $40.0M, +6.5% beating forecast)
- Year-over-Year (YoY) Growth: 48.2% (FY2024: $28.7M)
- Net Revenue Retention (NRR): 114.3% (down 2.1% from Q3 due to mid-market enterprise contractions)
- Gross Revenue Retention (GRR): 93.8%
- GAAP Gross Margin: 74.2% (Target: 76.0%, slight compression driven by GPU cloud infrastructure costs)
- Net Operating Loss (Non-GAAP): -$4.2M (Improvement from -$6.8M in Q4 FY2024)
- Current Cash & Short-term Equivalents: $38.4M
- Monthly Net Cash Burn: $1.15M (Runway remaining: 33.4 months)

2. REVENUE BREAKDOWN BY SEGMENT
- Enterprise Tier (> $100k ACV): $28.1M ARR (66% of total), 184 active logos, +58% YoY
- Mid-Market Tier ($25k - $100k ACV): $11.2M ARR (26% of total), 260 active logos, +29% YoY
- Emerging SMB (< $25k ACV): $3.3M ARR (8% of total), 412 active logos, -4% YoY (self-serve attrition)

3. COHORT EFFICIENCY & CAC METRICS
- Customer Acquisition Cost (CAC): $18,400 per enterprise account (blended)
- CAC Payback Period: 13.8 months (Industry benchmark: 14-18 months)
- Magic Number (Sales Efficiency): 0.94 (Healthy range > 0.75)
- LTV / CAC Ratio: 4.8x (Industry benchmark: 3.0x - 5.0x)
- Net New ARR added in Q4: $3.8M (Gross additions: $4.6M, Churn & Contraction: $0.8M)

4. KEY OPERATIONAL HEADWINDS & RISK AUDIT
- Risk Item Alpha (Cloud Infrastructure Inflation): GPU inference costs expanded from 11.2% of COGS to 16.4% in H2 FY2025 following the release of the conversational assistant module. Recommendation: Implement model quantization, token batching, and tiered caching before Q2 FY2026.
- Risk Item Beta (Sales Cycle Elongation): Enterprise procurement cycles expanded from 68 days in Q1 to 94 days in Q4, primarily due to heightened vendor risk assessments and SOC 2 Type II audit revisions.
- Risk Item Gamma (Mid-Market Contraction): 14 accounts downgraded tier due to macroeconomic tightening in retail and logistics clients.

5. STRATEGIC PRIORITIES FOR FY2026
1. Reach Cash Flow Breakeven by Q3 FY2026 without sacrificing ARR growth below 35%.
2. Renegotiate cloud infrastructure multi-year commits to save an estimated $1.8M annually.
3. Accelerate Enterprise expansion with dedicated Customer Success pods for top 20% accounts contributing 68% of expansion revenue.`,
  },
  {
    id: 'ai-architecture-audit',
    title: 'Autonomous Systems Edge AI Architecture',
    category: 'Engineering & Tech',
    badge: 'Technical Architecture',
    description: 'Technical audit of distributed robotics perception pipeline, inference latency SLAs, sensor fusion, and failure recovery.',
    fileName: 'Autonomous_Perception_Edge_Architecture_v3.pdf',
    content: `# PROJECT AEGIS: AUTONOMOUS LOGISTICS PERCEPTION ENGINE
SYSTEM ARCHITECTURE AUDIT & PERFORMANCE VALIDATION REPORT
Document Version: 3.2.0 | Architecture Review Board

1. EXECUTIVE SYSTEM OVERVIEW
The Aegis Autonomous Logistics Perception Engine delivers real-time spatial awareness, obstacle tracking, and dynamic kinematic path planning for warehouse Automated Guided Vehicles (AGVs) and Autonomous Mobile Robots (AMRs). 

2. DISTRIBUTED EDGE COMPUTE SPECIFICATIONS
- On-Vehicle Edge Compute Units: Dual NVIDIA Orin Nano / AGX Orin modules (32GB Unified Memory, 275 TOPS INT8 per node)
- Sensor Suite:
  * 4x 120-degree HDR GMSL2 Global Shutter Cameras (1080p @ 60 FPS)
  * 1x Solid-State 3D LiDAR (905nm, 300,000 points/sec, 60m range)
  * 4x Time-of-Flight (ToF) Ultrasonic proximity arrays
  * 6-axis MEMS IMU with hardware timestamp synchronization (< 100 microseconds drift)
- Internal High-Speed Bus: Dual Automotive 1000BASE-T1 Ethernet

3. NEURAL PIPELINE BENCHMARKS & LATENCY AUDIT
- Stage 1 (Sensor Ingestion & Camera Dewarping): 2.8 ms
- Stage 2 (Multi-View 3D Object Detection - PointPillars & ConvNeXt backbone): 14.4 ms (TensorRT FP16)
- Stage 3 (Continuous Extended Kalman Filter & Velocity Estimation): 3.1 ms
- Stage 4 (Dynamic Trajectory Costmap Generation): 4.2 ms
- Total End-to-End Perception Latency: 24.5 ms (Target SLA: <= 30.0 ms)
- System Jitter: 99th percentile <= 33.2 ms
- Thermal Throttling Threshold: 82Â°C (Peak observed sustained temp under max ambient 40Â°C was 71.4Â°C)

4. SAFETY ARCHITECTURE & ISO 26262 COMPLIANCE
- Safety Integrity Level: Engineered according to ASIL-D fault tolerance standards.
- Hardware Watchdog: Dedicated STM32H7 microcontroller monitors heartbeat pulses from primary Jetson processors every 10 ms.
- Fail-Safe Degradation Matrix:
  * If primary camera drops -> Fallback to LiDAR 2D Occupancy grid with maximum velocity capped at 0.8 m/s.
  * If LiDAR drops -> Fallback to stereoscopic camera depth map with speed capped at 1.0 m/s.
  * If heartbeat fails for > 50 ms -> Autonomous mechanical emergency braking engaged within 180 ms.

5. IDENTIFIED ARCHITECTURAL BOTTLENECK & RECOMMENDATIONS
- Memory Bandwidth Saturation: TensorRT model memory copies between camera ISP DMA buffer and GPU unified RAM spike to 88% bus utilization during simultaneous 4-camera bursts.
- Solution Roadmap:
  1. Migrate to Zero-Copy direct DMA NVMM buffers (est. latency reduction: -3.8 ms).
  2. Implement INT8 Quantization with Calibration Dataset for the ConvNeXt feature extractor, reducing compute footprint by 38% with < 0.4% mAP regression.`,
  },
  {
    id: 'clinical-trial-report',
    title: 'Phase III Clinical Trial: NeuroShield-7',
    category: 'Biotech & Health',
    badge: 'Clinical Research',
    description: 'Double-blind placebo trial on neuro-protective therapeutic candidate evaluating ADAS-Cog13, amyloid clearance, and biomarker safety.',
    fileName: 'Phase3_NeuroShield7_Trial_Summary.pdf',
    content: `# PHASE III CLINICAL STUDY REPORT: PROTOCOL NS7-301
STUDY: INVESTIGATION OF THERAPEUTIC EFFICACY AND SAFETY PROFILE OF NEUROSHIELD-7 (NS-7) IN EARLY-STAGE NEURODEGENERATIVE DECLINE
Sponsor: Aevum Therapeutics Inc. | Investigational New Drug (IND): #148,920
ClinicalTrials.gov Identifier: NCT05829104

1. STUDY DESIGN & METHODOLOGY
- Design: Randomized, double-blind, parallel-group, 72-week multicenter trial across 48 clinical research sites.
- Enrollment: 1,240 patients aged 55 to 82 diagnosed with mild cognitive impairment (MCI) or early-stage mild Alzheimer's disease.
- Cohorts:
  * Arm A (High Dose): NS-7 600mg IV infusion monthly (n = 415)
  * Arm B (Low Dose): NS-7 300mg IV infusion monthly (n = 412)
  * Arm C (Placebo): Saline solution match IV infusion monthly (n = 413)

2. PRIMARY EFFICACY ENDPOINTS (WEEK 72)
- Primary Metric: Change from baseline in ADAS-Cog13 score (Alzheimer's Disease Assessment Scale - Cognitive Subscale)
  * Placebo Group: Mean cognitive decline of +5.82 points (Â±0.34)
  * Low Dose (300mg): Mean cognitive decline of +4.21 points (Â±0.31) [27.7% deceleration vs. Placebo, p = 0.0031]
  * High Dose (600mg): Mean cognitive decline of +3.54 points (Â±0.29) [39.2% deceleration vs. Placebo, p < 0.0001]
- Statistical Significance: Primary endpoint achieved with robust significance across all pre-specified stratification criteria.

3. SECONDARY BIOMARKER & FUNCTIONAL ENDPOINTS
- CDR-SB (Clinical Dementia Rating - Sum of Boxes):
  * High dose cohort demonstrated a 34.1% slowing of functional and cognitive loss (p = 0.0004).
- Brain Amyloid Plaque Burden (11C-PiB PET Imaging):
  * High Dose cohort achieved a mean 62.4% reduction in cortical amyloid-beta standardized uptake value ratio (SUVR) at Week 72.
  * 44.8% of patients in Arm A reached amyloid-negative status by Week 72.
- Plasma Phosphorylated Tau-217 (p-tau217):
  * High Dose cohort: -48.6% reduction from baseline vs. +8.2% increase in placebo.

4. SAFETY & ADVERSE EVENT PROFILE
- Amyloid-Related Imaging Abnormalities with Edema (ARIA-E):
  * Arm A (600mg): 11.8% incidence (74% were radiologically mild and clinically asymptomatic).
  * Arm B (300mg): 5.1% incidence.
  * Placebo: 0.7% incidence.
- Microhemorrhages (ARIA-H):
  * Arm A: 14.2% | Arm B: 7.8% | Placebo: 6.1%.
- Treatment Discontinuation due to adverse events: 6.8% in Arm A vs. 4.9% in Placebo.

5. REGULATORY CONCLUSION & FILING TIMELINE
- The NS7-301 trial successfully met all primary and key secondary endpoints with favorable risk-benefit balance.
- Biologics License Application (BLA) submission to FDA scheduled for Q3 2026 under Priority Review pathway.`,
  },
  {
    id: 'sustainability-blueprint',
    title: 'Corporate Net-Zero & ESG Transition Blueprint',
    category: 'Sustainability & ESG',
    badge: 'Strategic Plan',
    description: 'Enterprise decarbonization roadmap across Scope 1, 2, and 3 emissions, CAPEX projections, and carbon offset validation.',
    fileName: 'GlobalCorp_ESG_Decarbonization_2030.pdf',
    content: `# GLOBALCORP HOLDINGS - ESG & SUSTAINABILITY TRANSITION BLUEPRINT
TOWARDS NET-ZERO CARBON OPERATIONAL EXCELLENCE (2025 - 2035)
Executive Committee & Sustainability Board

1. BASELINE GREENHOUSE GAS (GHG) EMISSIONS INVENTORY (2024 AUDIT)
- Total Global Footprint: 2.84 Million Metric Tons CO2 equivalent (MTCO2e)
  * Scope 1 (Direct Operations & Fleet): 412,000 MTCO2e (14.5%)
  * Scope 2 (Purchased Electricity & Thermal Energy): 698,000 MTCO2e (24.6%)
  * Scope 3 (Supply Chain, Raw Materials, Logistics, Product End-of-Life): 1,730,000 MTCO2e (60.9%)

2. STRATEGIC DECARBONIZATION TARGETS
- Interim 2030 Targets (aligned with SBTi 1.5Â°C trajectory):
  * Scope 1 & 2: 65% absolute emissions reduction from 2024 baseline.
  * Scope 3: 35% reduction in emissions intensity per million dollar revenue.
  * Renewable Electricity: 100% sourced globally by 2028 (currently at 41%).
- Ultimate 2035 Goal: Net-Zero across operational Scope 1 & 2; 90% abatement across Scope 3 with verified permanent carbon removal for residual emissions.

3. CAPITAL EXPENDITURE (CAPEX) ALLOCATION MATRIX (2026-2030)
- Total Green CAPEX Commitment: $145 Million over 5 years
  * Facility Electrification & Heat Pump Retrofits: $38.5M
  * On-site Rooftop & Microgrid Solar Arrays: $24.0M
  * Fleet Electrification (Transition of 1,800 delivery vans to EV): $47.5M
  * Circular Packaging & Recycled Material Integration: $19.0M
  * Supplier Decarbonization Co-Investment Fund: $16.0M

4. PROJECTED RETURN ON INVESTMENT & RISK MITIGATION
- Energy Cost Savings: Projected annual operational expenditure (OPEX) savings of $18.2M annually starting in 2029 via on-site solar generation and high-efficiency heat pumps.
- Carbon Border Adjustment Mechanism (CBAM) Protection: Shields $420M in European exports from projected carbon tariff exposure estimated at $28M annually by 2028.
- Green Financing Advantage: Access to sustainability-linked credit facilities reducing corporate debt borrowing costs by 15-25 basis points.

5. GOVERNANCE & ACCOUNTABILITY
- 15% of executive annual incentive bonuses tied directly to verified GHG emissions reductions audited by third-party assurance providers.`,
  },
];
