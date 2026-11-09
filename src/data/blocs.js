// Issues voters care about, and the voter blocs that make up every electorate.

export const ISSUES = [
  { id: 'economy', name: 'The economy' },
  { id: 'jobs', name: 'Jobs' },
  { id: 'cost', name: 'Cost of living' },
  { id: 'health', name: 'Healthcare' },
  { id: 'education', name: 'Schools & universities' },
  { id: 'environment', name: 'Climate' },
  { id: 'crime', name: 'Crime' },
  { id: 'immigration', name: 'Immigration' },
  { id: 'housing', name: 'Housing' },
  { id: 'corruption', name: 'Integrity' },
  { id: 'security', name: 'Security' },
  { id: 'liberty', name: 'Rights & freedoms' },
  { id: 'taxes', name: 'Taxes' },
];

export const ISSUE_MAP = Object.fromEntries(ISSUES.map((i) => [i.id, i]));

// econ: -1 left .. +1 right; social: -1 progressive .. +1 traditional
export const BLOCS = [
  {
    id: 'prof', name: 'Urban professionals', short: 'Professionals', econ: 0.15, social: -0.45, turnout: 0.78,
    blurb: 'Graduates in the big cities. Mobile, online and quick to punish incompetence.',
    w: { economy: 3, housing: 2, environment: 2, liberty: 2, health: 1, education: 2, corruption: 1.5, cost: 1.5, taxes: 2 },
  },
  {
    id: 'work', name: 'Industrial & service workers', short: 'Workers', econ: -0.35, social: 0.25, turnout: 0.6,
    blurb: 'Factory floors, warehouses, care homes and checkout lines. Wages and prices decide their vote.',
    w: { jobs: 3, cost: 3, health: 2, immigration: 1.5, crime: 1.5, economy: 1.5, housing: 1, taxes: 1 },
  },
  {
    id: 'ret', name: 'Retirees', short: 'Retirees', econ: 0.0, social: 0.45, turnout: 0.86,
    blurb: 'The most reliable voters in the land. Pensions, hospitals and safe streets.',
    w: { health: 3, cost: 2, crime: 2, security: 1.5, immigration: 1.5, taxes: 1, economy: 1 },
  },
  {
    id: 'rural', name: 'Rural & farming communities', short: 'Rural', econ: 0.25, social: 0.55, turnout: 0.72,
    blurb: 'Small towns and the countryside. Distrustful of the capital, sensitive to fuel prices.',
    w: { economy: 2, cost: 2.5, immigration: 1.5, crime: 1, security: 1, taxes: 1.5, health: 1 },
  },
  {
    id: 'youth', name: 'Students & young adults', short: 'Youth', econ: -0.45, social: -0.7, turnout: 0.5,
    blurb: 'Renting, studying, starting out. Climate and housing are not abstractions to them.',
    w: { housing: 3, environment: 3, education: 2, jobs: 2, liberty: 2, cost: 1.5 },
  },
  {
    id: 'biz', name: 'Business owners', short: 'Business', econ: 0.7, social: 0.1, turnout: 0.8,
    blurb: 'From corner shops to boardrooms. They want growth, low taxes and predictability.',
    w: { economy: 3, taxes: 3, jobs: 1, corruption: 1, cost: 1, crime: 1 },
  },
  {
    id: 'pub', name: 'Public sector workers', short: 'Public sector', econ: -0.4, social: -0.2, turnout: 0.75,
    blurb: 'Teachers, nurses, civil servants. They run the state and feel every budget cut.',
    w: { health: 2, education: 2.5, jobs: 1, cost: 2, corruption: 1, liberty: 1 },
  },
  {
    id: 'trad', name: 'Religious & traditional voters', short: 'Traditionalists', econ: 0.2, social: 0.85, turnout: 0.74,
    blurb: 'Faith, family and nation. Wary of rapid social change.',
    w: { crime: 2, immigration: 2.5, security: 1.5, cost: 1, liberty: 0.5, economy: 1 },
  },
  {
    id: 'poor', name: 'Low-income & precarious', short: 'Precarious', econ: -0.7, social: 0.2, turnout: 0.45,
    blurb: 'Gig work, benefits, zero-hours contracts. Often ignored, sometimes decisive.',
    w: { cost: 3.5, jobs: 2.5, housing: 2, health: 2, crime: 1 },
  },
  {
    id: 'minor', name: 'Migrant & minority communities', short: 'Minorities', econ: -0.35, social: -0.45, turnout: 0.52,
    blurb: 'First and second generations, ethnic and religious minorities.',
    w: { immigration: 3, jobs: 2, liberty: 2, cost: 2, crime: 1, housing: 1.5 },
  },
];

export const BLOC_MAP = Object.fromEntries(BLOCS.map((b) => [b.id, b]));
