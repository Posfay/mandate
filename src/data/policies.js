// Policy catalogue. Each option carries:
//  pos:    [economic, social] position of the option (-1 left/progressive .. +1 right/traditional)
//  fx:     long-run target deltas (relative to level 0 of nothing; engine uses option - startOption)
//          growth/unemp/infl in percentage points, rev/cost in % of GDP, indices in points, emis in % of baseline
//  blocs:  extra approval reactions from specific voter blocs while the option is in force
// Flags: exec = can be enacted by executive order in presidential systems
//        constitutional = needs a two-thirds supermajority

export const POLICY_CATEGORIES = [
  { id: 'economy', name: 'Economy & labour' },
  { id: 'tax', name: 'Taxation' },
  { id: 'welfare', name: 'Welfare & health' },
  { id: 'education', name: 'Education' },
  { id: 'energy', name: 'Energy & climate' },
  { id: 'security', name: 'Security & justice' },
  { id: 'migration', name: 'Migration' },
  { id: 'society', name: 'Society & technology' },
  { id: 'institutions', name: 'Institutions' },
];

export const POLICIES = [
  // ── Economy & labour ─────────────────────────────────────────
  {
    id: 'min_wage', cat: 'economy', name: 'Minimum wage', def: 2,
    desc: 'The legal wage floor. Higher floors lift the lowest earners but can price out entry-level jobs.',
    options: [
      { label: 'No minimum wage', pos: [0.8, 0], fx: { unemp: -0.4, gini: 2.5, conf: 4, growth: 0.05 }, blocs: { biz: 4, work: -6, poor: -8 } },
      { label: 'Low floor', pos: [0.4, 0], fx: { unemp: -0.2, gini: 1, conf: 2 }, blocs: { biz: 2, work: -2, poor: -3 } },
      { label: 'Moderate floor', pos: [0, 0], fx: {} },
      { label: 'High floor', pos: [-0.45, 0], fx: { unemp: 0.3, gini: -1.2, infl: 0.2, conf: -3 }, blocs: { work: 4, poor: 5, biz: -4, youth: 2 } },
      { label: 'Living wage', pos: [-0.8, 0], fx: { unemp: 0.7, gini: -2.2, infl: 0.4, conf: -6 }, blocs: { work: 6, poor: 8, biz: -8, youth: 3 } },
    ],
  },
  {
    id: 'labor', cat: 'economy', name: 'Worker protections', def: 1,
    desc: 'How hard it is to hire, fire and organise.',
    options: [
      { label: 'Flexible hire-and-fire', pos: [0.7, 0], fx: { unemp: -0.5, growth: 0.1, gini: 1.5, conf: 5 }, blocs: { biz: 5, work: -6, pub: -3 } },
      { label: 'Balanced', pos: [0, 0], fx: {} },
      { label: 'Strong unions & job security', pos: [-0.6, 0], fx: { unemp: 0.5, growth: -0.1, gini: -1.5, conf: -5 }, blocs: { work: 6, pub: 5, biz: -6 } },
    ],
  },
  {
    id: 'work_week', cat: 'economy', name: 'Working week', def: 0,
    desc: 'Standard full-time hours. A shorter week is popular with the young and costly for employers.',
    options: [
      { label: 'Standard 40 hours', pos: [0.2, 0.1], fx: {} },
      { label: 'Four-day week pilots', pos: [-0.2, -0.2], fx: { growth: -0.03, conf: -1, health: 1, innov: 1, cost: 0.02 }, blocs: { youth: 3, prof: 2, biz: -2 } },
      { label: 'Legislated 32-hour week', pos: [-0.6, -0.3], fx: { growth: -0.35, unemp: -0.2, infl: 0.3, conf: -7, health: 3 }, blocs: { youth: 6, work: 4, prof: 2, biz: -8 } },
    ],
  },
  {
    id: 'ownership', cat: 'economy', name: 'State ownership', def: 1,
    desc: 'Who owns the energy grid, water and railways.',
    options: [
      { label: 'Privatise utilities & rail', pos: [0.8, 0], fx: { growth: 0.08, gini: 1, conf: 4, energy: -3, integ: -2 }, blocs: { biz: 5, work: -4, pub: -6 } },
      { label: 'Mixed economy', pos: [0, 0], fx: {} },
      { label: 'Nationalise energy & rail', pos: [-0.8, 0], fx: { growth: -0.1, gini: -0.8, conf: -6, energy: 6, infl: -0.2, cost: 0.4 }, blocs: { work: 4, pub: 4, poor: 3, biz: -7, prof: -2 } },
    ],
  },
  {
    id: 'industrial', cat: 'economy', name: 'Industrial strategy', def: 1,
    desc: 'Subsidies for strategic sectors such as chips, batteries and defence manufacturing.',
    options: [
      { label: 'Hands-off', pos: [0.6, 0], fx: { cost: -0.2, conf: 1, innov: -2 }, blocs: { biz: 2, work: -2 } },
      { label: 'Targeted support', pos: [0, 0.05], fx: {} },
      { label: 'State-led mega-subsidies', pos: [-0.4, 0.2], fx: { cost: 0.8, growth: 0.2, unemp: -0.3, innov: 5, energy: 3, integ: -2 }, blocs: { work: 4, rural: 1, biz: 1, prof: -1 } },
    ],
  },
  {
    id: 'trade', cat: 'economy', name: 'Trade stance', def: 1, exec: true,
    desc: 'Tariffs on imports. Protection shields some jobs and raises prices for everyone.',
    options: [
      { label: 'Free trade', pos: [0.6, -0.2], fx: { growth: 0.15, infl: -0.2, unemp: 0.1, prestige: 3, conf: 3 }, blocs: { biz: 4, prof: 2, work: -4, rural: -2 } },
      { label: 'Strategic tariffs', pos: [0, 0.2], fx: {} },
      { label: 'Protectionist walls', pos: [-0.2, 0.6], fx: { growth: -0.35, infl: 0.7, unemp: -0.15, prestige: -6, conf: -4, rev: 0.3 }, blocs: { work: 4, rural: 3, trad: 2, biz: -5, prof: -4 } },
    ],
  },
  {
    id: 'finance_reg', cat: 'economy', name: 'Financial regulation', def: 1,
    desc: 'Capital rules for banks and funds. Light rules lift growth and raise the odds of a crash.',
    options: [
      { label: 'Light-touch', pos: [0.6, 0], fx: { growth: 0.08, conf: 3, gini: 0.8 }, blocs: { biz: 3, poor: -1 } },
      { label: 'Standard', pos: [0, 0], fx: {} },
      { label: 'Strict', pos: [-0.5, 0], fx: { growth: -0.06, conf: -2, gini: -0.4 }, blocs: { work: 1, biz: -2 } },
    ],
  },
  {
    id: 'housing', cat: 'economy', name: 'Housing policy', def: 1,
    desc: 'How the country builds and prices homes.',
    options: [
      { label: 'Deregulated market', pos: [0.6, 0.1], fx: { housing: 3, gini: 1, emis: 1, conf: 2 }, blocs: { biz: 3, youth: -2, rural: 1 } },
      { label: 'Planning reform', pos: [0.1, 0], fx: {} },
      { label: 'Mass social housing', pos: [-0.5, -0.1], fx: { housing: 8, cost: 0.5, gini: -1, unemp: -0.1 }, blocs: { youth: 5, poor: 5, minor: 3, biz: -1 } },
      { label: 'Rent caps & state building', pos: [-0.8, -0.2], fx: { housing: 5, cost: 0.6, gini: -1.5, conf: -4, growth: -0.05 }, blocs: { youth: 7, poor: 6, minor: 3, biz: -6, ret: -1 } },
    ],
  },

  // ── Taxation (headline rates live in the budget) ────────────
  {
    id: 'wealth_tax', cat: 'tax', name: 'Wealth tax', def: 0, tax: true,
    desc: 'An annual levy on large fortunes.',
    options: [
      { label: 'None', pos: [0.3, 0], fx: {} },
      { label: '1% above 5 million', pos: [-0.4, 0], fx: { rev: 0.25, gini: -0.6, conf: -2, growth: -0.02 }, blocs: { biz: -4, poor: 3, work: 2, youth: 2, prof: -1 } },
      { label: '2% above 1 million', pos: [-0.8, 0], fx: { rev: 0.6, gini: -1.4, conf: -6, growth: -0.08 }, blocs: { biz: -8, prof: -4, poor: 4, work: 3, youth: 3, ret: -2 } },
    ],
  },
  {
    id: 'carbon_tax', cat: 'tax', name: 'Carbon price', def: 0, tax: true,
    desc: 'A price on each tonne of CO₂ emitted.',
    options: [
      { label: 'None', pos: [0.4, 0.2], fx: { emis: 3 } },
      { label: 'Moderate, 50 per tonne', pos: [0, -0.2], fx: { emis: -8, rev: 0.3, infl: 0.2, growth: -0.03 }, blocs: { youth: 3, rural: -3, work: -2, prof: 1 } },
      { label: 'High, 150 per tonne', pos: [-0.2, -0.5], fx: { emis: -18, rev: 0.8, infl: 0.5, growth: -0.12, conf: -3, gini: 0.5 }, blocs: { youth: 5, prof: 2, rural: -7, work: -4, poor: -4, biz: -3 } },
    ],
  },
  {
    id: 'digital_tax', cat: 'tax', name: 'Big Tech levy', def: 0, tax: true,
    desc: 'A tax on the local revenue of global platforms. Washington hates it.',
    options: [
      { label: 'None', pos: [0.4, 0], fx: { innov: 1 } },
      { label: '3% digital services tax', pos: [-0.2, 0], fx: { rev: 0.05, innov: -1, prestige: -1 }, blocs: { work: 1, biz: 1 } },
      { label: '6% levy on excess profits', pos: [-0.6, 0], fx: { rev: 0.15, innov: -3, conf: -2, prestige: -2 }, blocs: { work: 2, poor: 1, prof: -1 } },
    ],
  },

  // ── Welfare & health ────────────────────────────────────────
  {
    id: 'pension_age', cat: 'welfare', name: 'Retirement age', def: 2,
    desc: 'When the state pension starts. Every year added saves billions and costs votes.',
    options: [
      { label: 'Retire at 62', pos: [-0.4, 0.1], fx: { cost: 1.0, unemp: -0.1, growth: -0.15 }, blocs: { ret: 5, work: 5, pub: 3, youth: -2, biz: -3 } },
      { label: 'Retire at 65', pos: [-0.1, 0], fx: { cost: 0.4, growth: -0.05 }, blocs: { ret: 2, work: 2 } },
      { label: 'Retire at 67', pos: [0.2, 0], fx: {} },
      { label: 'Retire at 70', pos: [0.6, 0], fx: { cost: -0.7, growth: 0.12 }, blocs: { ret: -6, work: -7, pub: -4, biz: 3, youth: 1 } },
    ],
  },
  {
    id: 'unemp_benefits', cat: 'welfare', name: 'Unemployment benefits', def: 1,
    desc: 'Support for people out of work.',
    options: [
      { label: 'Minimal', pos: [0.6, 0.2], fx: { unemp: -0.4, gini: 1.5, cost: -0.4, crime: 2 }, blocs: { poor: -6, work: -3, biz: 3 } },
      { label: 'Standard', pos: [0, 0], fx: {} },
      { label: 'Generous', pos: [-0.6, 0], fx: { unemp: 0.4, gini: -1.2, cost: 0.5, crime: -1 }, blocs: { poor: 5, work: 3, pub: 1, biz: -2 } },
    ],
  },
  {
    id: 'ubi', cat: 'welfare', name: 'Basic income', def: 0,
    desc: 'An unconditional monthly payment. Transformative, and ruinously expensive at full scale.',
    options: [
      { label: 'None', pos: [0.2, 0], fx: {} },
      { label: 'Regional pilot', pos: [-0.3, -0.2], fx: { cost: 0.15, innov: 1 }, blocs: { youth: 2, poor: 2 } },
      { label: 'Universal basic income', pos: [-0.8, -0.3], fx: { cost: 6, gini: -5, unemp: 0.6, infl: 0.8, crime: -3, health: 2, conf: -5 }, blocs: { poor: 12, youth: 8, work: 3, ret: -2, biz: -8, prof: -3, trad: -2 } },
    ],
  },
  {
    id: 'family', cat: 'welfare', name: 'Family support', def: 1,
    desc: 'Childcare, child benefit and birth incentives.',
    options: [
      { label: 'Minimal', pos: [0.5, 0], fx: { cost: -0.4, gini: 0.6 } },
      { label: 'Child benefit', pos: [0, 0.1], fx: {} },
      { label: 'Free childcare & baby bonus', pos: [-0.3, 0.3], fx: { cost: 0.8, gini: -0.6, growth: 0.03, unemp: -0.1 }, blocs: { youth: 4, trad: 4, work: 3, minor: 2, ret: -1 } },
    ],
  },
  {
    id: 'healthcare', cat: 'welfare', name: 'Healthcare model', def: 1,
    desc: 'Who pays for treatment.',
    options: [
      { label: 'Private insurance', pos: [0.7, 0.1], fx: { health: -6, cost: -1.5, gini: 1.5, innov: 2 }, blocs: { biz: 3, poor: -6, ret: -3, work: -3 } },
      { label: 'Mixed public-private', pos: [0.1, 0], fx: {} },
      { label: 'Universal single-payer', pos: [-0.6, -0.1], fx: { health: 7, cost: 1.8, gini: -1.5, conf: -1 }, blocs: { poor: 6, work: 4, ret: 3, youth: 3, biz: -4, prof: -1 } },
    ],
  },

  // ── Education ───────────────────────────────────────────────
  {
    id: 'tuition', cat: 'education', name: 'University tuition', def: 1,
    desc: 'What students pay for a degree.',
    options: [
      { label: 'Full fees', pos: [0.6, 0], fx: { edu: -3, cost: -0.3, gini: 0.6 }, blocs: { youth: -6, biz: 1 } },
      { label: 'Subsidised', pos: [0, 0], fx: {} },
      { label: 'Free tuition', pos: [-0.5, -0.1], fx: { edu: 4, cost: 0.4, gini: -0.5, innov: 1 }, blocs: { youth: 7, prof: 1, pub: 1, ret: -1 } },
    ],
  },
  {
    id: 'vocational', cat: 'education', name: 'Vocational training', def: 0,
    desc: 'Apprenticeships and retraining for a changing labour market.',
    options: [
      { label: 'Limited', pos: [0.3, 0], fx: {} },
      { label: 'Apprenticeship guarantee', pos: [-0.1, 0.1], fx: { unemp: -0.4, cost: 0.25, edu: 2, growth: 0.05 }, blocs: { youth: 3, work: 3, biz: 1 } },
    ],
  },

  // ── Energy & climate ────────────────────────────────────────
  {
    id: 'nuclear', cat: 'energy', name: 'Nuclear power', def: 1,
    desc: 'The future of the reactor fleet.',
    options: [
      { label: 'Phase out', pos: [-0.2, -0.4], fx: { emis: 6, energy: -8, infl: 0.2 }, blocs: { youth: 2, prof: 1, work: -2 } },
      { label: 'Maintain', pos: [0, 0], fx: {} },
      { label: 'Build new reactors', pos: [0.2, 0.2], fx: { emis: -8, energy: 8, cost: 0.3 }, blocs: { biz: 2, work: 2, youth: -1 } },
    ],
  },
  {
    id: 'renewables', cat: 'energy', name: 'Renewable energy', def: 1,
    desc: 'Public money for wind, solar, storage and grids.',
    options: [
      { label: 'Market only', pos: [0.5, 0.2], fx: { emis: 4, cost: -0.2 }, blocs: { youth: -3, rural: 1 } },
      { label: 'Subsidies', pos: [0, 0], fx: {} },
      { label: 'Crash programme', pos: [-0.4, -0.4], fx: { emis: -12, energy: 6, cost: 0.7, unemp: -0.15, infl: 0.1 }, blocs: { youth: 5, prof: 2, rural: -2 } },
    ],
  },
  {
    id: 'ice_ban', cat: 'energy', name: 'Petrol & diesel cars', def: 1,
    desc: 'When new combustion-engine cars stop being sold.',
    options: [
      { label: 'No phase-out', pos: [0.3, 0.3], fx: { emis: 2 }, blocs: { rural: 2, work: 1, youth: -2 } },
      { label: 'End sales by 2040', pos: [0, 0], fx: {} },
      { label: 'End sales by 2032', pos: [-0.2, -0.4], fx: { emis: -6, infl: 0.1, conf: -2 }, blocs: { youth: 3, rural: -5, work: -3, ret: -2 } },
    ],
  },
  {
    id: 'fossil', cat: 'energy', name: 'Fossil fuel extraction', def: 1, exec: true,
    desc: 'Licences for new oil, gas and coal projects.',
    options: [
      { label: 'Expand drilling', pos: [0.5, 0.4], fx: { emis: 5, energy: 5, growth: 0.05, rev: 0.1, prestige: -3 }, blocs: { rural: 3, work: 2, youth: -5, prof: -2 } },
      { label: 'Status quo', pos: [0, 0], fx: {} },
      { label: 'No new licences', pos: [-0.3, -0.4], fx: { emis: -4, energy: -4, growth: -0.03, prestige: 2 }, blocs: { youth: 4, prof: 1, rural: -3, work: -2 } },
    ],
  },

  // ── Security & justice ──────────────────────────────────────
  {
    id: 'policing', cat: 'security', name: 'Policing', def: 1,
    desc: 'The philosophy of law enforcement.',
    options: [
      { label: 'Community-led reform', pos: [-0.2, -0.6], fx: { crime: 2, liberty: 4 }, blocs: { minor: 6, youth: 4, ret: -3, trad: -3 } },
      { label: 'Balanced', pos: [0, 0], fx: {} },
      { label: 'Zero tolerance', pos: [0.1, 0.7], fx: { crime: -5, liberty: -5, cost: 0.2 }, blocs: { ret: 4, trad: 5, rural: 2, minor: -6, youth: -4 } },
    ],
  },
  {
    id: 'surveillance', cat: 'security', name: 'Surveillance', def: 1, exec: true,
    desc: 'What the security services may watch, and with whose permission.',
    options: [
      { label: 'Strict privacy', pos: [0, -0.6], fx: { liberty: 5, crime: 1, mil: -2 }, blocs: { youth: 3, prof: 2 } },
      { label: 'Targeted warrants', pos: [0, 0], fx: {} },
      { label: 'Mass AI surveillance', pos: [0, 0.8], fx: { liberty: -12, crime: -4, democ: -4, mil: 3, prestige: -2 }, blocs: { trad: 3, ret: 3, youth: -6, prof: -4, minor: -4 } },
    ],
  },
  {
    id: 'service', cat: 'security', name: 'National service', def: 0,
    desc: 'Whether young people serve the state.',
    options: [
      { label: 'None', pos: [0, -0.2], fx: {} },
      { label: 'Voluntary civic service', pos: [0, 0.2], fx: { cost: 0.1, mil: 2, unemp: -0.1 }, blocs: { trad: 2, youth: 1 } },
      { label: 'Mandatory conscription', pos: [0, 0.7], fx: { cost: 0.4, mil: 10, growth: -0.05, liberty: -4 }, blocs: { trad: 5, ret: 3, youth: -9, prof: -2 } },
    ],
  },
  {
    id: 'guns', cat: 'security', name: 'Firearms', def: 1,
    desc: 'Who may own a gun, and which kinds.',
    options: [
      { label: 'Permissive', pos: [0.3, 0.6], fx: { crime: 4, liberty: 2 }, blocs: { rural: 5, trad: 3, prof: -3, minor: -2 } },
      { label: 'Licensing & checks', pos: [0, 0], fx: {} },
      { label: 'Strict controls', pos: [-0.1, -0.5], fx: { crime: -3, liberty: -1 }, blocs: { prof: 3, youth: 2, rural: -6, trad: -3 } },
    ],
  },
  {
    id: 'drugs', cat: 'security', name: 'Drug policy', def: 0,
    desc: 'Criminal law on recreational drugs.',
    options: [
      { label: 'Strict prohibition', pos: [0, 0.7], fx: { crime: 2, liberty: -3, cost: 0.05 }, blocs: { trad: 5, ret: 3, youth: -4 } },
      { label: 'Decriminalise possession', pos: [0, -0.3], fx: { crime: -1, health: 1, liberty: 2 }, blocs: { youth: 2, trad: -3 } },
      { label: 'Legal, regulated cannabis', pos: [0.1, -0.7], fx: { crime: -2, rev: 0.05, liberty: 4, health: -1 }, blocs: { youth: 6, prof: 2, trad: -7, ret: -4 } },
    ],
  },

  // ── Migration ───────────────────────────────────────────────
  {
    id: 'immigration', cat: 'migration', name: 'Immigration levels', def: 1, exec: true,
    desc: 'How many people may come to live and work.',
    options: [
      { label: 'Restrictive', pos: [0.1, 0.8], fx: { growth: -0.2, unemp: -0.1, housing: 3, prestige: -2 }, blocs: { trad: 6, ret: 4, rural: 4, work: 2, minor: -10, biz: -4, prof: -2, youth: -2 } },
      { label: 'Managed, points-based', pos: [0.1, 0.1], fx: {} },
      { label: 'Open labour migration', pos: [0.3, -0.7], fx: { growth: 0.25, unemp: 0.15, housing: -4, gini: 0.3 }, blocs: { biz: 5, minor: 7, prof: 2, trad: -7, ret: -4, work: -4, rural: -4 } },
    ],
  },
  {
    id: 'asylum', cat: 'migration', name: 'Asylum system', def: 1, exec: true,
    desc: 'How refugee claims are handled.',
    options: [
      { label: 'Offshore processing', pos: [0.1, 0.8], fx: { prestige: -5, liberty: -2, cost: 0.1 }, blocs: { trad: 5, ret: 3, rural: 3, minor: -8, youth: -4 } },
      { label: 'Standard procedures', pos: [0, 0], fx: {} },
      { label: 'Generous, fast integration', pos: [-0.2, -0.7], fx: { prestige: 3, cost: 0.15, housing: -1 }, blocs: { minor: 6, youth: 3, trad: -6, ret: -3, rural: -3 } },
    ],
  },

  // ── Society & technology ────────────────────────────────────
  {
    id: 'ai_reg', cat: 'society', name: 'AI regulation', def: 1,
    desc: 'Rules for frontier AI systems and automated decisions.',
    options: [
      { label: 'Light-touch', pos: [0.5, 0], fx: { innov: 6, growth: 0.1, unemp: 0.15 }, blocs: { biz: 3, prof: 1, work: -2 } },
      { label: 'Risk-based', pos: [0, 0], fx: {} },
      { label: 'Strict licensing', pos: [-0.3, 0.1], fx: { innov: -6, growth: -0.08, liberty: 1 }, blocs: { work: 2, ret: 1, biz: -3 } },
    ],
  },
  {
    id: 'social_age', cat: 'society', name: 'Social media for minors', def: 0,
    desc: 'Whether under-16s may hold social media accounts.',
    options: [
      { label: 'Unrestricted', pos: [0.2, -0.2], fx: {} },
      { label: 'Under-16 ban', pos: [-0.1, 0.4], fx: { health: 1, liberty: -1, edu: 1 }, blocs: { ret: 3, trad: 3, prof: 1, youth: -4 } },
    ],
  },
  {
    id: 'media_law', cat: 'society', name: 'Disinformation law', def: 1,
    desc: 'How the state polices false information online.',
    options: [
      { label: 'Laissez-faire', pos: [0.3, -0.1], fx: { liberty: 2, democ: -1 } },
      { label: 'Platform transparency rules', pos: [0, 0], fx: {} },
      { label: 'State "truth" authority', pos: [0, 0.6], fx: { liberty: -10, democ: -8, prestige: -4 }, blocs: { trad: 1, youth: -5, prof: -5 } },
    ],
  },
  {
    id: 'anticorr', cat: 'society', name: 'Anti-corruption', def: 1,
    desc: 'The teeth of the body that investigates officials, including your own.',
    options: [
      { label: 'Toothless watchdog', pos: [0, 0.2], fx: { integ: -8, growth: -0.05 } },
      { label: 'Independent agency', pos: [0, 0], fx: {} },
      { label: 'Powerful special prosecutor', pos: [0, -0.1], fx: { integ: 8, cost: 0.05, growth: 0.03, conf: 2 }, blocs: { prof: 3, youth: 2, poor: 1 } },
    ],
  },

  // ── Institutions (the path of power) ────────────────────────
  {
    id: 'courts', cat: 'institutions', name: 'Judiciary', def: 0, constitutional: true,
    desc: 'Who appoints judges. A friendly bench never strikes down your decrees, and the world notices.',
    options: [
      { label: 'Fully independent', pos: [0, -0.2], fx: {} },
      { label: 'Politicised appointments', pos: [0, 0.5], fx: { democ: -15, integ: -6, prestige: -6, liberty: -4, conf: -3 }, blocs: { prof: -5, youth: -4, trad: 2 } },
    ],
  },
  {
    id: 'pubmedia', cat: 'institutions', name: 'Public broadcaster', def: 0,
    desc: 'Whether state media answers to editors or to the government.',
    options: [
      { label: 'Editorially independent', pos: [0, -0.1], fx: {} },
      { label: 'Government-aligned', pos: [0, 0.5], fx: { democ: -8, liberty: -5, prestige: -3 }, blocs: { prof: -4, youth: -3 } },
    ],
  },
  {
    id: 'emergency', cat: 'institutions', name: 'Emergency powers', def: 0, exec: true, constitutional: true,
    desc: 'Ruling by decree. Fast, effective, and corrosive.',
    options: [
      { label: 'Normal rule of law', pos: [0, 0], fx: {} },
      { label: 'State of emergency', pos: [0, 0.8], fx: { democ: -10, liberty: -12, crime: -3, prestige: -8, conf: -3 }, blocs: { trad: 3, ret: 2, youth: -8, prof: -6, minor: -5 } },
    ],
  },
];

export const POLICY_MAP = Object.fromEntries(POLICIES.map((p) => [p.id, p]));

// Budget lines: spending categories in % of GDP and what each extra point buys.
export const SPEND_LINES = [
  { id: 'health', name: 'Health', fx: { health: 5 } },
  { id: 'education', name: 'Education', fx: { edu: 5, growth: 0.05, innov: 1 } },
  { id: 'welfare', name: 'Pensions & welfare', fx: { gini: -1.0, crime: -0.8 } },
  { id: 'defense', name: 'Defence', fx: { mil: 12, prestige: 1.5, growth: 0.02 } },
  { id: 'infrastructure', name: 'Infrastructure', fx: { growth: 0.12, unemp: -0.1, housing: 1, energy: 2 } },
  { id: 'police', name: 'Police & justice', fx: { crime: -8 } },
  { id: 'research', name: 'Research & innovation', fx: { innov: 12, growth: 0.15 } },
  { id: 'green', name: 'Green transition', fx: { emis: -10, energy: 4 } },
  { id: 'aid', name: 'Foreign aid', fx: { prestige: 10 } },
];

export const TAX_LINES = [
  { id: 'income', name: 'Income tax, top rate', share: 0.52, fx: { gini: -0.35, growth: -0.04, conf: -0.5 }, min: 0, max: 75 },
  { id: 'corporate', name: 'Corporate tax', share: 0.1, fx: { growth: -0.05, conf: -1.2, innov: -0.3 }, min: 0, max: 50 },
  { id: 'vat', name: 'Sales tax / VAT', share: 0.28, fx: { infl: 0.25, gini: 0.25, growth: -0.03 }, min: 0, max: 30 },
];
