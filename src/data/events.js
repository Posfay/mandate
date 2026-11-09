// Event deck. Effects are declarative op lists (see engine/effects.js) so that every
// decision is serializable, replayable for multiplayer, and can describe itself in the UI.
//
// Placeholders inside ops: '$role' (minister role from ctx), '$actor' (country id), '$partner' (party id)
// Text tokens: {country} {demonym} {capital} {title} {leader} {party} {rival} {legislature}
//              {min} {minRole} {actor} {actorLeader} {partner} {policy} {region}

const has = (s, id) => s.countryId === id;
const inAny = (s, ids) => ids.includes(s.countryId);
const cfgHas = (s, m) => s.cfgMemberships.includes(m);
const summer = (s) => (s.southern ? [11, 0, 1] : [5, 6, 7]).includes(s.turn % 12);
const hostile = (s) => {
  const opts = ['RUS', 'CHN', 'IRN', 'PRK'].filter((id) => id !== s.countryId);
  return opts.sort((a, b) => (s.world.rel[a] ?? 0) - (s.world.rel[b] ?? 0))[0];
};
const NOTE = [{ label: 'Noted', ops: [] }];

export const EVENTS = [
  // ── Economy ─────────────────────────────────────────────────
  {
    id: 'central_bank_clash', cat: 'economy', title: 'The governor raises rates again',
    text: 'The central bank has lifted interest rates to {rate}% to choke off inflation. Mortgage holders are furious, your backbenchers want you to say something, and the markets are listening for exactly that.',
    when: (s) => s.ind.infl > 3.2 && s.turn > 2, weight: 1.2,
    setup: (s) => ({ rate: (Math.round(s.econ.rate * 4) / 4).toFixed(2) }),
    choices: [
      { label: 'Defend the bank’s independence', desc: 'Inflation is the cruellest tax. The bank must do its job.', ops: [['bloc', 'prof', 2], ['bloc', 'biz', 2], ['bloc', 'work', -2], ['mod', 'conf', 3, 6]] },
      { label: 'Publicly demand lower rates', desc: 'Families come before bond traders.', ops: [['econ', 'cbBias', -0.8], ['econ', 'inflAnchor', 0.6], ['econ', 'riskMod', 0.4], ['mod', 'conf', -6, 6], ['bloc', 'work', 3], ['bloc', 'poor', 3], ['bloc', 'biz', -3], ['news', 'Markets rattled as {title} attacks central bank', -1]] },
      { label: 'Say nothing', ops: [] },
    ],
  },
  {
    id: 'plant_closure', cat: 'labor', title: 'The factory gates close',
    text: 'The country’s largest car plant will shut within a year. Its owners blame energy costs and Chinese competition. Six thousand jobs, and a town built around them, hang on your answer.',
    when: (s) => s.turn > 1, weight: 1,
    choices: [
      { label: 'Bail it out with public money', desc: 'Take a stake, keep the lines running.', ops: [['debt', 0.1], ['bloc', 'work', 5], ['bloc', 'rural', 2], ['bloc', 'biz', -2], ['bloc', 'prof', -1], ['mod', 'unemp', -0.1, 12], ['echo', 'bailout_followup', 8, 'The rescued car plant will publish its first results.']] },
      { label: 'Fund retraining instead', desc: 'Save the workers, not the factory.', ops: [['debt', 0.03], ['bloc', 'work', -2], ['bloc', 'prof', 1], ['mod', 'unemp', 0.08, 6]] },
      { label: 'Let the market decide', ops: [['bloc', 'work', -6], ['bloc', 'biz', 3], ['mod', 'unemp', 0.15, 10], ['sal', 'jobs', 3], ['news', 'Government shrugs as six thousand jobs vanish', -1]] },
    ],
  },
  {
    id: 'bailout_followup', cat: 'labor', title: 'The rescued plant reports', echo: true,
    text: 'Eight months after the bailout, the plant you saved has published its figures.',
    choices: [
      { label: 'Read the report', ops: [['chance', 0.55, [['news', 'Rescued car plant returns to profit', 1], ['bloc', 'work', 3], ['trust', 2]], [['news', 'Bailed-out plant burns through state cash', -1], ['debt', 0.05], ['trust', -3], ['bloc', 'prof', -2]]]] },
    ],
  },
  {
    id: 'tech_hq', cat: 'economy', title: 'A tech giant goes shopping',
    text: 'One of Silicon Valley’s largest firms is choosing where to build its regional AI headquarters: four thousand jobs, average salary three times the national wage. Their price is a ten-year tax holiday.',
    when: (s) => s.turn > 0 && s.countryId !== 'USA',
    choices: [
      { label: 'Offer the tax holiday', ops: [['mod', 'innov', 4, 0], ['mod', 'growth', 0.1, 24], ['bloc', 'prof', 3], ['bloc', 'work', -2], ['bloc', 'poor', -2], ['mod', 'gini', 0.5, 0], ['trust', -1]] },
      { label: 'Offer infrastructure, not tax breaks', ops: [['debt', 0.05], ['chance', 0.5, [['mod', 'innov', 3, 0], ['mod', 'growth', 0.06, 24], ['news', 'Tech giant picks {country} for AI hub', 1]], [['news', 'Tech giant snubs {country}, citing taxes', -1], ['bloc', 'prof', -1]]]] },
      { label: 'Decline', ops: [['bloc', 'work', 1], ['bloc', 'prof', -2], ['bloc', 'biz', -2]] },
    ],
  },
  {
    id: 'bond_jitters', cat: 'economy', title: 'The bond market blinks',
    text: 'Yields on ten-year government bonds have jumped sharply in a week. Pension funds are selling. Your finance minister, {min}, wants an emergency statement before the markets open on Monday.',
    when: (s) => s.econ.stress > 0.2 || (s.econ.deficit > 5.5 && s.econ.debt > 85 && s.turn > 4), weight: (s) => 1 + s.econ.stress * 6, cooldown: 10,
    setup: (s) => ({ role: 'finance' }),
    choices: [
      { label: 'Announce a credible austerity package', desc: 'Cut spending now, before the market cuts it for you.', ops: [['spend', 'welfare', -0.5], ['spend', 'infrastructure', -0.3], ['econ', 'riskMod', -1.0], ['bloc', 'pub', -5], ['bloc', 'poor', -4], ['bloc', 'ret', -3], ['bloc', 'biz', 4], ['mod', 'growth', -0.3, 12]] },
      { label: 'Raise taxes on top earners', ops: [['tax', 'income', 2], ['econ', 'riskMod', -0.6], ['bloc', 'biz', -4], ['bloc', 'prof', -3], ['bloc', 'work', 2]] },
      { label: 'Blame speculators and hold course', ops: [['econ', 'riskMod', 0.8], ['mod', 'conf', -8, 6], ['bloc', 'work', 2], ['trust', -2], ['chance', 0.45, [['echo', 'bond_crisis', 2, 'Markets will test your resolve again.']]]] },
    ],
  },
  {
    id: 'bond_crisis', cat: 'economy', title: 'Sell-off', echo: true,
    text: 'It is happening. Yields are climbing by the hour, the currency is sliding, and the central bank governor is on the phone asking what exactly the government intends to do.',
    choices: [
      { label: 'Emergency U-turn', desc: 'Reverse course, publicly.', ops: [['pc', -15], ['trust', -5], ['econ', 'riskMod', -1.6], ['spend', 'welfare', -0.4], ['news', '{title} performs humiliating U-turn', -1]] },
      { label: 'Ask the central bank to buy bonds', ops: [['econ', 'riskMod', -1.0], ['econ', 'inflAnchor', 1.2], ['mod', 'conf', -5, 6], ['news', 'Central bank steps in as bond rout deepens', -1]] },
      { label: 'Ride it out', ops: [['econ', 'riskMod', 0.6], ['mod', 'growth', -0.8, 9], ['mod', 'conf', -12, 9], ['bloc', 'all', -4]] },
    ],
  },
  {
    id: 'housing_protest', cat: 'society', title: '“Homes, not profits”',
    text: 'Tens of thousands march through {capital}. Rents have risen by a third in three years and the average first-time buyer is now 38. The march ends outside your office.',
    when: (s) => s.ind.housing < 42 && s.turn > 1, weight: (s) => 1 + (42 - s.ind.housing) / 15,
    choices: [
      { label: 'Freeze rents for two years', ops: [['mod', 'housing', 3, 24], ['mod', 'housing', -1.5, 0], ['mod', 'conf', -3, 12], ['bloc', 'youth', 6], ['bloc', 'poor', 4], ['bloc', 'biz', -4], ['echo', 'rent_freeze_end', 24, 'The rent freeze expires. Landlords are waiting.']] },
      { label: 'Fast-track 200,000 homes', ops: [['debt', 0.3], ['mod', 'housing', 5, 36], ['bloc', 'youth', 3], ['bloc', 'rural', -2], ['mod', 'emis', 0.5, 24], ['mod', 'unemp', -0.1, 24]] },
      { label: 'Supply will catch up', ops: [['bloc', 'youth', -5], ['bloc', 'poor', -3], ['bloc', 'biz', 2], ['sal', 'housing', 4]] },
    ],
  },
  {
    id: 'rent_freeze_end', cat: 'society', title: 'The freeze thaws', echo: true,
    text: 'The two-year rent freeze ends next month. Landlord associations warn of double-digit increases; tenant groups want it made permanent.',
    choices: [
      { label: 'Extend it', ops: [['mod', 'housing', 2, 24], ['mod', 'housing', -1.5, 0], ['bloc', 'youth', 3], ['bloc', 'biz', -3]] },
      { label: 'Let it lapse', ops: [['mod', 'housing', -3, 6], ['bloc', 'youth', -4], ['bloc', 'poor', -3], ['bloc', 'biz', 2]] },
    ],
  },
  {
    id: 'energy_spike', cat: 'economy', title: 'Winter bills',
    text: 'Wholesale energy prices have nearly doubled. Households face bills 60% higher this winter, and small businesses are already closing.',
    when: (s) => s.world.globals.oil > 118, weight: 2, cooldown: 12,
    choices: [
      { label: 'Cap household bills, state pays the gap', ops: [['debt', 0.8], ['mod', 'infl', -1.0, 8], ['bloc', 'all', 4], ['bloc', 'biz', -1]] },
      { label: 'Targeted support for the poorest', ops: [['debt', 0.25], ['mod', 'infl', -0.2, 8], ['bloc', 'poor', 5], ['bloc', 'ret', 2], ['bloc', 'work', -2], ['bloc', 'prof', -1]] },
      { label: 'Let prices do their work', ops: [['mod', 'infl', 0.4, 8], ['bloc', 'all', -4], ['bloc', 'biz', 2], ['mod', 'emis', -1, 12]] },
    ],
  },
  {
    id: 'windfall', cat: 'economy', title: 'Record profits at the pump',
    text: 'Energy companies have posted the largest profits in their history while household bills soar. The opposition demands a windfall tax.',
    when: (s) => s.world.globals.oil > 112, cooldown: 24,
    choices: [
      { label: 'Impose a windfall tax', ops: [['debt', -0.2], ['bloc', 'work', 3], ['bloc', 'poor', 3], ['bloc', 'biz', -3], ['mod', 'conf', -3, 12], ['flag', 'taxRaised']] },
      { label: 'Leave it to the market', ops: [['bloc', 'work', -3], ['bloc', 'poor', -2], ['bloc', 'biz', 2]] },
    ],
  },
  {
    id: 'pension_shortfall', cat: 'welfare', title: 'The actuary’s letter',
    text: 'The pension fund actuary reports a hole: without changes, payments will exceed contributions within six years. The letter will be published in a week.',
    when: (s) => s.turn > 6 && s.blocs.find((b) => b.id === 'ret').size > 0.15,
    choices: [
      { label: 'Raise contributions', ops: [['tax', 'income', 1], ['econ', 'riskMod', -0.2], ['bloc', 'work', -3], ['bloc', 'prof', -2], ['bloc', 'ret', 2]] },
      { label: 'Trim benefits for new retirees', ops: [['spend', 'welfare', -0.4], ['bloc', 'ret', -5], ['bloc', 'work', -3], ['bloc', 'biz', 2], ['econ', 'riskMod', -0.3]] },
      { label: 'Borrow and defer', ops: [['debt', 0.2], ['econ', 'riskMod', 0.2], ['echo', 'pension_shortfall', 18, 'The actuary will report again.']] },
    ],
  },
  {
    id: 'grocery_prices', cat: 'economy', title: '“Greedflation”',
    text: 'Supermarket margins have doubled while food prices rose 15% in a year. The opposition has a new word for it, and it is trending.',
    when: (s) => s.ind.infl > 3.5,
    choices: [
      { label: 'Cap prices on staples', ops: [['mod', 'infl', -0.4, 6], ['mod', 'conf', -4, 6], ['bloc', 'poor', 5], ['bloc', 'work', 4], ['bloc', 'biz', -5], ['echo', 'price_caps', 4, 'Retailers warn the caps will empty shelves.']] },
      { label: 'Launch a competition inquiry', ops: [['mod', 'infl', -0.1, 6], ['bloc', 'work', 1], ['bloc', 'biz', -1]] },
      { label: 'Cut sales tax on food', ops: [['tax', 'vat', -1], ['mod', 'infl', -0.3, 6], ['bloc', 'all', 2]] },
    ],
  },
  {
    id: 'price_caps', cat: 'economy', title: 'Empty shelves', echo: true,
    text: 'Four months into the price caps, some staples are disappearing from shelves as suppliers divert stock abroad.',
    choices: [
      { label: 'Lift the caps', ops: [['mod', 'infl', 0.3, 6], ['bloc', 'poor', -3], ['bloc', 'biz', 3], ['trust', -1]] },
      { label: 'Keep them and subsidise farmers', ops: [['debt', 0.1], ['bloc', 'rural', 3]] },
    ],
  },
  {
    id: 'crypto_collapse', cat: 'economy', title: 'Withdrawals frozen',
    text: 'The country’s biggest crypto exchange has frozen withdrawals. Four hundred thousand savers, most of them under 35, cannot reach their money.',
    when: (s) => s.turn > 4,
    choices: [
      { label: 'Compensate small savers', ops: [['debt', 0.1], ['bloc', 'youth', 3], ['bloc', 'poor', 2], ['bloc', 'prof', -2], ['trust', 1]] },
      { label: 'Regulate the sector hard', ops: [['mod', 'innov', -2, 0], ['bloc', 'ret', 2], ['bloc', 'youth', -2], ['mod', 'integ', 2, 0]] },
      { label: 'Buyer beware', ops: [['bloc', 'youth', -4], ['bloc', 'biz', 1]] },
    ],
  },
  {
    id: 'lithium', cat: 'economy', title: 'Treasure under the forest',
    text: 'Geologists confirm one of the largest lithium deposits on the continent, beneath a protected nature reserve. Battery makers are already calling.',
    once: true, when: (s) => s.turn > 3,
    choices: [
      { label: 'Mine it', ops: [['mod', 'growth', 0.15, 0], ['mod', 'emis', 0.5, 0], ['bloc', 'work', 3], ['bloc', 'biz', 3], ['bloc', 'youth', -4], ['bloc', 'rural', -1]] },
      { label: 'Mine it under strict conditions', ops: [['mod', 'growth', 0.07, 0], ['bloc', 'biz', 1], ['pc', -4]] },
      { label: 'Protect the reserve', ops: [['bloc', 'youth', 3], ['bloc', 'prof', 1], ['bloc', 'work', -2], ['bloc', 'biz', -2]] },
    ],
  },
  {
    id: 'tariff_threat', cat: 'foreign', title: 'A letter from Washington',
    text: 'The White House threatens 25% tariffs on {demonym} exports unless you buy more American gas and drop barriers to US farm goods. Your exporters are panicking.',
    when: (s) => s.countryId !== 'USA' && (s.world.rel.USA ?? 50) < 55 && s.turn > 2, cooldown: 20,
    choices: [
      { label: 'Concede', ops: [['rel', 'USA', 10], ['bloc', 'biz', 3], ['bloc', 'rural', -3], ['trust', -1], ['mod', 'prestige', -2, 12]] },
      { label: 'Retaliate in kind', ops: [['rel', 'USA', -15], ['mod', 'growth', -0.3, 12], ['mod', 'infl', 0.3, 12], ['bloc', 'trad', 3], ['bloc', 'work', 2], ['bloc', 'biz', -4], ['mod', 'prestige', 2, 12]] },
      { label: 'Negotiate quietly', ops: [['pc', -8], ['chance', 0.6, [['rel', 'USA', 5], ['news', 'Quiet trade truce with Washington', 1]], [['mod', 'growth', -0.2, 12], ['news', 'Talks fail as US tariffs bite', -1]]]] },
    ],
  },
  {
    id: 'trade_retaliation', cat: 'foreign', title: 'Retaliation',
    text: 'The EU, Canada and China have announced coordinated tariffs on American farm goods and motorcycles in response to your tariff wall. Farm-state senators are calling.',
    when: (s) => s.countryId === 'USA' && s.policies.trade === 2 && s.turn > 1, cooldown: 18,
    choices: [
      { label: 'Escalate', ops: [['mod', 'growth', -0.25, 12], ['mod', 'infl', 0.3, 12], ['bloc', 'rural', -4], ['bloc', 'trad', 2], ['rel', 'CHN', -10], ['rel', 'DEU', -5]] },
      { label: 'Bail out the farmers', ops: [['debt', 0.1], ['bloc', 'rural', 4], ['bloc', 'prof', -2]] },
      { label: 'Seek a truce', ops: [['pc', -6], ['rel', 'CHN', 6], ['rel', 'DEU', 6], ['rel', 'CAN', 6], ['bloc', 'trad', -2], ['bloc', 'biz', 3]] },
    ],
  },
  // ── Labour & welfare ────────────────────────────────────────
  {
    id: 'transport_strike', cat: 'labor', title: 'The trains stop',
    text: 'Rail and bus unions have walked out over pay. {capital} is gridlocked, and the union leader says they will strike every Monday until you move.',
    when: (s) => s.turn > 1,
    choices: [
      { label: 'Meet their demands', ops: [['spend', 'infrastructure', 0.15], ['bloc', 'work', 3], ['bloc', 'pub', 3], ['bloc', 'biz', -2], ['bloc', 'prof', -1], ['mod', 'infl', 0.1, 6]] },
      { label: 'Negotiate a compromise', ops: (s) => [['pc', s.player.bg === 'unionist' ? -2 : -6], ['spend', 'infrastructure', 0.05], ['bloc', 'work', 1], ['bloc', 'prof', 1]] },
      { label: 'Legislate minimum service levels', ops: [['bloc', 'work', -5], ['bloc', 'pub', -3], ['bloc', 'biz', 4], ['bloc', 'prof', 2], ['mod', 'liberty', -2, 0], ['mod', 'growth', -0.1, 3]] },
    ],
  },
  {
    id: 'gig_ruling', cat: 'labor', title: 'Riders are workers',
    text: 'The supreme court has ruled that food-delivery riders are employees, not contractors. The platforms threaten to leave the country.',
    once: true, when: (s) => s.turn > 3,
    choices: [
      { label: 'Write the ruling into law', ops: [['mod', 'gini', -0.5, 0], ['mod', 'unemp', 0.1, 12], ['bloc', 'work', 3], ['bloc', 'youth', 2], ['bloc', 'biz', -3]] },
      { label: 'Create a “third status” compromise', ops: [['bloc', 'biz', 1], ['bloc', 'work', 1]] },
      { label: 'Legislate to overturn it', ops: [['bloc', 'work', -4], ['bloc', 'youth', -3], ['bloc', 'biz', 4], ['mod', 'innov', 1, 0]] },
    ],
  },
  {
    id: 'ai_layoffs', cat: 'tech', title: 'Replaced by agents',
    text: 'Three banks and a telecom giant announce forty thousand job cuts in a single week, the work handed to AI agents. Call centres in the regions are emptying.',
    when: (s) => s.turn > 5, weight: (s) => 1 + s.world.globals.ai / 100,
    choices: [
      { label: 'Fund a national retraining guarantee', ops: [['debt', 0.15], ['spend', 'education', 0.1], ['mod', 'unemp', -0.15, 24], ['bloc', 'work', 3], ['bloc', 'youth', 2]] },
      { label: 'Tax automation', ops: [['mod', 'innov', -4, 0], ['mod', 'growth', -0.05, 0], ['bloc', 'work', 4], ['bloc', 'biz', -4], ['bloc', 'prof', -2], ['flag', 'taxRaised']] },
      { label: 'Embrace it: productivity is coming', ops: [['mod', 'growth', 0.15, 24], ['mod', 'unemp', 0.25, 18], ['bloc', 'work', -5], ['bloc', 'biz', 3], ['bloc', 'prof', 1]] },
    ],
  },
  {
    id: 'doctors_strike', cat: 'health', title: 'Doctors walk out',
    text: 'Junior doctors have begun a five-day strike over pay and rotas. Sixty thousand operations are cancelled. Your health minister, {min}, says the offer on the table is final.',
    when: (s) => s.turn > 2, setup: () => ({ role: 'health' }),
    choices: [
      { label: 'Fund a pay rise', ops: [['spend', 'health', 0.2], ['bloc', 'pub', 4], ['bloc', 'ret', 2], ['mod', 'health', 1, 6]] },
      { label: 'Hold firm', ops: [['mod', 'health', -3, 6], ['bloc', 'pub', -4], ['bloc', 'ret', -3], ['bloc', 'biz', 1], ['minister', '$role', 'loyalty', 5]] },
      { label: 'Reform rotas with a small rise', ops: (s) => [['spend', 'health', 0.08], ['pc', s.player.bg === 'doctor' ? -2 : -5], ['bloc', 'pub', 1]] },
    ],
  },
  {
    id: 'teachers_strike', cat: 'education', title: 'Classrooms empty',
    text: 'Teachers have voted to strike for the first time in a decade. Parents are scrambling for childcare and exam season is six weeks away.',
    when: (s) => s.turn > 2,
    choices: [
      { label: 'Raise teacher pay', ops: [['spend', 'education', 0.2], ['bloc', 'pub', 4], ['bloc', 'youth', 2], ['mod', 'edu', 1, 0]] },
      { label: 'Recruit replacements', ops: [['bloc', 'pub', -5], ['bloc', 'prof', -1], ['bloc', 'biz', 1], ['mod', 'edu', -2, 12]] },
      { label: 'Offer smaller classes instead of pay', ops: [['spend', 'education', 0.1], ['pc', -4], ['mod', 'edu', 1, 0]] },
    ],
  },
  // ── Society ─────────────────────────────────────────────────
  {
    id: 'police_video', cat: 'society', title: 'Forty million views',
    text: 'A phone video of officers beating a teenager during an arrest in {capital} has been watched forty million times. Protests have spread to five cities.',
    when: (s) => s.turn > 2,
    choices: [
      { label: 'Independent inquiry, officers suspended', ops: [['bloc', 'minor', 5], ['bloc', 'youth', 4], ['bloc', 'trad', -2], ['bloc', 'ret', -1], ['mod', 'liberty', 1, 0]] },
      { label: 'Back the police', ops: [['bloc', 'minor', -7], ['bloc', 'youth', -5], ['bloc', 'trad', 3], ['bloc', 'ret', 3], ['heat', 'unrest', 15]] },
      { label: 'Call for calm and say little', ops: [['bloc', 'minor', -2], ['bloc', 'youth', -2], ['heat', 'unrest', 6]] },
    ],
  },
  {
    id: 'free_speech', cat: 'society', title: 'The cancelled lecture',
    text: 'A university has cancelled a talk by a controversial author after student protests. By lunchtime it has become the culture war’s newest front page.',
    choices: [
      { label: 'Defend free speech on campus', ops: [['bloc', 'trad', 3], ['bloc', 'ret', 2], ['bloc', 'youth', -3]] },
      { label: 'Back the students', ops: [['bloc', 'youth', 3], ['bloc', 'trad', -3], ['bloc', 'ret', -1]] },
      { label: 'Stay out of it', ops: [['sal', 'liberty', 2]] },
    ],
  },
  {
    id: 'religious_rebuke', cat: 'society', title: 'A sermon against you',
    text: 'The nation’s most senior religious leader has condemned your government’s “moral drift” in a sermon broadcast live. Your opponents are sharing it widely.',
    when: (s) => s.policies.drugs === 2 || s.policies.asylum === 2 || s.turn > 10,
    choices: [
      { label: 'Respectfully disagree', ops: [['bloc', 'trad', -3], ['bloc', 'youth', 1], ['bloc', 'prof', 1]] },
      { label: 'Meet them privately', desc: 'Costs one agenda slot this month.', req: (s) => s.agenda >= 1, reqText: 'Needs an agenda slot', ops: [['agenda', -1], ['bloc', 'trad', 3]] },
      { label: 'Hit back publicly', ops: [['bloc', 'trad', -6], ['bloc', 'ret', -2], ['bloc', 'youth', 2]] },
    ],
  },
  {
    id: 'ageing', cat: 'society', title: 'One in four',
    text: 'The census confirms it: one citizen in four is now over 65. Within a decade there will be two workers for every pensioner.',
    once: true, when: (s) => s.turn > 8 && s.blocs.find((b) => b.id === 'ret').size > 0.17,
    choices: [
      { label: 'Launch a skilled-immigration drive', ops: [['mod', 'growth', 0.1, 0], ['bloc', 'trad', -3], ['bloc', 'biz', 3], ['bloc', 'minor', 2], ['heat', 'migration', 5]] },
      { label: 'Invest in automation and productivity', ops: [['debt', 0.1], ['mod', 'innov', 3, 0], ['bloc', 'prof', 1]] },
      { label: 'Leave it for the next government', ops: [['trust', -1]] },
    ],
  },
  {
    id: 'birth_rate', cat: 'society', title: 'The quiet maternity wards',
    text: 'Births have fallen to their lowest level since records began. Demographers call it a slow-motion emergency.',
    once: true, when: (s) => inAny(s, ['KOR', 'JPN', 'ITA', 'ESP', 'POL', 'HUN', 'DEU']) || s.turn > 14,
    choices: [
      { label: 'Baby bonus and homes for young families', ops: [['debt', 0.2], ['bloc', 'youth', 3], ['bloc', 'trad', 3], ['mod', 'housing', 1, 0]] },
      { label: 'Fund childcare instead', ops: [['spend', 'welfare', 0.2], ['bloc', 'youth', 2], ['bloc', 'pub', 2], ['bloc', 'prof', 2]] },
      { label: 'It is not the state’s business', ops: [['bloc', 'trad', -2], ['bloc', 'biz', 1]] },
    ],
  },
  {
    id: 'opioids', cat: 'health', title: 'Forty a week',
    text: 'Synthetic opioids are now killing forty people a week in the cities. Paramedics describe streets that look like war zones.',
    when: (s) => s.turn > 4,
    choices: [
      { label: 'Safe consumption sites and treatment', ops: [['spend', 'health', 0.05], ['mod', 'crime', -1, 12], ['bloc', 'trad', -3], ['bloc', 'prof', 2], ['bloc', 'minor', 1]] },
      { label: 'Crack down on dealers', ops: [['spend', 'police', 0.05], ['mod', 'crime', -2, 12], ['mod', 'liberty', -1, 0], ['bloc', 'trad', 3], ['bloc', 'ret', 2], ['bloc', 'youth', -2]] },
      { label: 'Sue the manufacturers', ops: [['chance', 0.5, [['debt', -0.05], ['news', 'Pharma giants settle for billions', 1], ['bloc', 'all', 2]], [['news', 'Lawsuit against drug makers collapses', -1]]]] },
    ],
  },
  {
    id: 'school_shooting', cat: 'security', title: 'A day of mourning',
    text: 'A gunman has killed nine people, seven of them children, at a school. The country is in mourning, and the question is already being asked of you.',
    when: (s) => s.policies.guns === 0, weight: 1.5, cooldown: 14,
    choices: [
      { label: 'Push for stricter gun laws', ops: [['sal', 'crime', 6], ['bloc', 'prof', 4], ['bloc', 'youth', 4], ['bloc', 'rural', -4], ['bloc', 'trad', -3], ['flag', 'gunPush']] },
      { label: 'Fund school security', ops: [['spend', 'police', 0.05], ['bloc', 'ret', 2], ['bloc', 'rural', 1], ['bloc', 'youth', -2]] },
      { label: 'Offer condolences, avoid politics', ops: [['bloc', 'youth', -3], ['bloc', 'prof', -2]] },
    ],
  },
  {
    id: 'mass_protest', cat: 'politics', title: 'The square fills',
    text: 'Half a million people have filled the streets of {capital}, many holding signs demanding your resignation. More are arriving by train.',
    when: (s) => s.heat.unrest > 28 || (s.approval < 31 && s.turn > 5), weight: 2, cooldown: 8,
    choices: [
      { label: 'Address their demands', ops: [['pc', -10], ['heat', 'unrest', -25], ['bloc', 'all', 2], ['unity', -5]] },
      { label: 'Deploy riot police', ops: [['heat', 'unrest', -10], ['mod', 'liberty', -3, 0], ['bloc', 'youth', -6], ['bloc', 'trad', 3], ['chance', 0.25, [['heat', 'unrest', 30], ['news', 'Protester killed in clashes; anger spreads', -1], ['bloc', 'all', -3]]]] },
      { label: 'Wait it out', ops: [['heat', 'unrest', 5], ['bloc', 'all', -1]] },
    ],
  },
  // ── Environment & disasters ─────────────────────────────────
  {
    id: 'heatwave', cat: 'disaster', title: '46 degrees',
    text: 'A record heatwave has pushed temperatures to 46°C. Hospitals are overwhelmed with elderly patients and wildfires are burning in the hills above three towns.',
    when: (s) => summer(s), weight: (s) => 1.4 + s.world.globals.climate / 50, cooldown: 10,
    choices: [
      { label: 'Emergency funds for hospitals and firefighters', ops: [['debt', 0.1], ['bloc', 'ret', 3], ['bloc', 'pub', 2], ['heat', 'disaster', 20], ['sal', 'environment', 4]] },
      { label: 'Declare a climate emergency', ops: [['heat', 'disaster', 25], ['sal', 'environment', 8], ['bloc', 'youth', 5], ['bloc', 'rural', -2], ['pc', 4]] },
      { label: 'Go to the fire lines yourself', desc: 'Costs one agenda slot this month.', req: (s) => s.agenda >= 1, reqText: 'Needs an agenda slot', ops: [['agenda', -1], ['bloc', 'all', 2], ['heat', 'disaster', 15]] },
    ],
  },
  {
    id: 'floods', cat: 'disaster', title: 'The rivers rise',
    text: 'Four days of torrential rain. Rivers have burst their banks in three regions and twelve thousand people have been evacuated.',
    when: (s) => !summer(s), weight: (s) => 0.8 + s.world.globals.climate / 60, cooldown: 12,
    choices: [
      { label: 'Full state compensation', ops: [['debt', 0.3], ['bloc', 'rural', 5], ['bloc', 'all', 2], ['heat', 'disaster', 20]] },
      { label: 'Fund flood defences for the future', ops: [['spend', 'infrastructure', 0.1], ['bloc', 'rural', 2], ['heat', 'disaster', 15]] },
      { label: 'Insurance should cover it', ops: [['bloc', 'rural', -6], ['bloc', 'all', -2], ['heat', 'disaster', 15]] },
    ],
  },
  {
    id: 'drought', cat: 'disaster', title: 'Twenty percent',
    text: 'Reservoirs are at twenty percent capacity. Without rain, water rationing begins next month, and someone has to go first.',
    when: (s) => summer(s) && inAny(s, ['ESP', 'ITA', 'AUS', 'IND', 'ZAF', 'MEX', 'TUR', 'FRA', 'BRA', 'ARG', 'USA']), cooldown: 12,
    choices: [
      { label: 'Ration agriculture first', ops: [['bloc', 'rural', -5], ['bloc', 'prof', 1], ['mod', 'growth', -0.05, 6]] },
      { label: 'Ration households first', ops: [['bloc', 'all', -2], ['bloc', 'rural', 3]] },
      { label: 'Build desalination plants', ops: [['debt', 0.2], ['spend', 'infrastructure', 0.05], ['bloc', 'rural', 2], ['mod', 'emis', 0.4, 0]] },
    ],
  },
  {
    id: 'climate_blockade', cat: 'environment', title: 'Glued to the motorway',
    text: 'Climate activists have blocked the main motorway into {capital} for the third week running. Commuters are dragging them off the road.',
    when: (s) => s.ind.emis > 88 && s.turn > 2,
    choices: [
      { label: 'New protest laws with prison terms', ops: [['mod', 'liberty', -3, 0], ['bloc', 'youth', -5], ['bloc', 'ret', 3], ['bloc', 'trad', 3], ['bloc', 'rural', 2]] },
      { label: 'Meet the activists', desc: 'Costs one agenda slot this month.', req: (s) => s.agenda >= 1, reqText: 'Needs an agenda slot', ops: [['agenda', -1], ['bloc', 'youth', 3], ['bloc', 'ret', -2], ['sal', 'environment', 3]] },
      { label: 'Let the police handle it', ops: [['heat', 'unrest', 5]] },
    ],
  },
  {
    id: 'nuclear_incident', cat: 'environment', title: 'Coolant leak',
    text: 'A coolant leak has forced an emergency shutdown at one of the country’s reactors. Officials say no radiation escaped. Not everyone believes them.',
    when: (s) => s.policies.nuclear === 2 && s.turn > 12, once: true,
    choices: [
      { label: 'Full safety review, pause new builds', ops: [['mod', 'energy', -3, 12], ['bloc', 'youth', 2], ['bloc', 'biz', -2]] },
      { label: 'Reassure and continue', ops: [['chance', 0.85, [['bloc', 'biz', 2]], [['bloc', 'all', -5], ['news', 'Leaked report: regulators ignored warnings', -1], ['trust', -4]]]] },
    ],
  },
  {
    id: 'climate_summit', cat: 'foreign', title: 'The climate summit',
    text: 'World leaders are gathering for the annual climate summit. The hosts want every major economy to announce something bold.',
    when: (s) => s.turn % 12 === 10, weight: 3,
    choices: [
      { label: 'Pledge deep cuts by 2035', ops: [['mod', 'prestige', 5, 24], ['bloc', 'youth', 3], ['bloc', 'rural', -2], ['echo', 'climate_check', 24, 'The world will check whether you kept your climate pledge.']] },
      { label: 'Pledge climate finance for poorer nations', ops: [['spend', 'aid', 0.05], ['mod', 'prestige', 3, 24], ['bloc', 'trad', -1]] },
      { label: 'Send a junior minister', ops: [['mod', 'prestige', -2, 12], ['bloc', 'youth', -2]] },
    ],
  },
  {
    id: 'climate_check', cat: 'foreign', title: 'Two years on', echo: true,
    text: 'Two years after your pledge at the climate summit, independent auditors publish their verdict.',
    choices: [{ label: 'Read the verdict', ops: (s) => (s.ind.emis < 92 ? [['mod', 'prestige', 4, 24], ['news', 'Auditors: {country} on track for climate pledge', 1], ['bloc', 'youth', 2]] : [['mod', 'prestige', -5, 24], ['news', 'Auditors: {country} broke its climate promise', -1], ['trust', -2], ['bloc', 'youth', -3]]) }],
  },
  // ── Security & foreign ──────────────────────────────────────
  {
    id: 'cyberattack', cat: 'security', title: 'Lights out in the north',
    text: 'A cyberattack has knocked out the power grid across the north for thirty-six hours. Intelligence chiefs say the fingerprints point to {actor}.',
    when: (s) => s.turn > 2, setup: (s) => ({ actor: hostile(s) }),
    choices: [
      { label: 'Attribute publicly and sanction', ops: [['rel', '$actor', -20], ['bloc', 'trad', 3], ['bloc', 'ret', 2], ['mod', 'prestige', 2, 12], ['mod', 'energy', -2, 6]] },
      { label: 'Retaliate quietly in kind', ops: [['rel', '$actor', -8], ['pc', -5], ['chance', 0.3, [['news', 'Leaked: {country} hacked {actor} in retaliation', -1], ['mod', 'prestige', -3, 12]]]] },
      { label: 'Invest in cyber defence', ops: [['spend', 'defense', 0.1], ['mod', 'mil', 2, 0]] },
    ],
  },
  {
    id: 'terror_plot', cat: 'security', title: 'The plot that failed',
    text: 'Police have foiled a plot to bomb a football stadium. The intelligence services say they got lucky, and want new powers so they don’t have to be lucky next time.',
    when: (s) => s.turn > 1,
    choices: [
      { label: 'Grant the new powers', ops: [['mod', 'liberty', -4, 0], ['mod', 'crime', -2, 0], ['bloc', 'ret', 3], ['bloc', 'trad', 3], ['bloc', 'youth', -3], ['bloc', 'prof', -2]] },
      { label: 'More funding, same rules', ops: [['spend', 'police', 0.05], ['bloc', 'ret', 1]] },
      { label: 'No new powers', ops: [['bloc', 'youth', 2], ['bloc', 'ret', -3], ['bloc', 'trad', -3], ['chance', 0.2, [['echo', 'terror_attack', 3, 'Intelligence chiefs warn they are flying blind.']]]] },
    ],
  },
  {
    id: 'terror_attack', cat: 'security', title: 'The attack', echo: true,
    text: 'Three months after the foiled plot, a bomb has exploded at a railway station. Eleven people are dead. Your decision to deny new powers is on every front page.',
    choices: [
      { label: 'Grant emergency powers now', ops: [['mod', 'liberty', -6, 0], ['bloc', 'ret', 3], ['bloc', 'trad', 3], ['trust', -3], ['sal', 'security', 8]] },
      { label: 'Stand by your principles', ops: [['bloc', 'all', -4], ['bloc', 'youth', 2], ['sal', 'security', 8], ['trust', 1]] },
    ],
  },
  {
    id: 'migrant_boats', cat: 'migration', title: 'Crossings',
    text: 'Irregular arrivals have tripled this year and last night a boat capsized; thirty-one people drowned. Every camp is beyond capacity.',
    when: (s) => s.turn > 1, weight: (s) => 1 + s.heat.migration / 30 + (inAny(s, ['ITA', 'ESP', 'GBR', 'AUS', 'USA', 'DEU', 'NLD', 'SWE', 'FRA']) ? 0.6 : 0),
    choices: [
      { label: 'Tougher border enforcement', ops: [['heat', 'migration', -10], ['bloc', 'trad', 4], ['bloc', 'ret', 3], ['bloc', 'minor', -4], ['bloc', 'youth', -3], ['spend', 'police', 0.05], ['mod', 'prestige', -2, 12]] },
      { label: 'Safe legal routes and rescue', ops: [['heat', 'migration', 8], ['bloc', 'minor', 4], ['bloc', 'youth', 4], ['bloc', 'trad', -5], ['bloc', 'ret', -3], ['mod', 'prestige', 3, 12]] },
      { label: 'Push for a regional deal', ops: [['pc', -6], ['heat', 'migration', -4], ['mod', 'prestige', 1, 12]] },
    ],
  },
  {
    id: 'ukraine_aid', cat: 'foreign', title: 'A request from Kyiv',
    text: 'Ukraine has asked for air-defence systems and artillery shells before winter. Your defence minister, {min}, says stocks are thin but it can be done.',
    when: (s) => (cfgHas(s, 'NATO') || cfgHas(s, 'EU')) && s.turn > 1, cooldown: 14, setup: () => ({ role: 'defense' }),
    choices: [
      { label: 'Send a major package', ops: [['spend', 'defense', 0.1], ['rel', 'UKR', 15], ['rel', 'RUS', -15], ['rel', 'USA', 3], ['mod', 'prestige', 3, 12], ['bloc', 'prof', 2], ['bloc', 'work', -1]] },
      { label: 'Humanitarian aid only', ops: [['rel', 'UKR', 4], ['debt', 0.02]] },
      { label: 'Decline', ops: [['rel', 'UKR', -10], ['rel', 'RUS', 5], ['mod', 'prestige', -3, 12], ['bloc', 'trad', 1]] },
    ],
  },
  {
    id: 'spy', cat: 'foreign', title: 'A spy in the ministry',
    text: 'A senior official in the defence ministry has been arrested for passing secrets to {actor}. The press does not know yet.',
    when: (s) => s.turn > 3, setup: (s) => ({ actor: hostile(s) }),
    choices: [
      { label: 'Expel their diplomats', ops: [['rel', '$actor', -20], ['bloc', 'trad', 3], ['mod', 'prestige', 1, 12]] },
      { label: 'Keep it quiet', ops: [['chance', 0.4, [['heat', 'scandal', 15], ['trust', -3], ['news', 'Cover-up: government hid spy arrest', -1]]]] },
      { label: 'Order a vetting overhaul', ops: [['pc', -3], ['mod', 'mil', 1, 0]] },
    ],
  },
  {
    id: 'interference', cat: 'foreign', title: 'Hands on the ballot',
    text: 'Your intelligence services report a foreign campaign of fake accounts and laundered donations designed to sway the coming election. The trail leads to {actor}.',
    when: (s) => s.nextElection - s.turn < 10 && s.nextElection - s.turn > 1, once: true, setup: (s) => ({ actor: hostile(s) }),
    choices: [
      { label: 'Go public with the evidence', ops: [['rel', '$actor', -15], ['bloc', 'all', 1], ['trust', 2]] },
      { label: 'Ban foreign-funded political ads', ops: [['mod', 'liberty', -1, 0], ['bloc', 'prof', 2]] },
      { label: 'Stay quiet', ops: [['party', 'rival', 'mom', 0.12]] },
    ],
  },
  {
    id: 'arms_deal', cat: 'foreign', title: 'Forty-eight jets',
    text: '{actor} wants to buy forty-eight fighter jets built in your country. The order would secure eight thousand jobs for a decade. Human-rights groups are already drafting their statements.',
    when: (s) => s.turn > 3 && s.ind.mil > 45, setup: (s) => ({ actor: ['SAU', 'ARE', 'QAT', 'EGY'][s.turn % 4] }),
    choices: [
      { label: 'Sign it', ops: [['mod', 'growth', 0.08, 24], ['mod', 'unemp', -0.05, 24], ['rel', '$actor', 15], ['bloc', 'work', 3], ['bloc', 'youth', -3], ['bloc', 'prof', -2], ['mod', 'prestige', -1, 12]] },
      { label: 'Attach human-rights conditions', ops: [['rel', '$actor', -5], ['chance', 0.3, [['mod', 'growth', 0.05, 24], ['news', 'Arms deal signed with rights clauses', 1]]]] },
      { label: 'Refuse', ops: [['rel', '$actor', -12], ['bloc', 'youth', 2], ['bloc', 'work', -2]] },
    ],
  },
  {
    id: 'defence_target', cat: 'foreign', title: 'The new NATO target',
    text: 'Allies have agreed a new benchmark: 3.5% of GDP on core defence. You are at {def}%. Washington is keeping score.',
    when: (s) => cfgHas(s, 'NATO') && s.budget.spend.defense < 3.4 && s.countryId !== 'USA', cooldown: 24,
    setup: (s) => ({ def: s.budget.spend.defense.toFixed(1) }),
    choices: [
      { label: 'Commit to the target', ops: [['spend', 'defense', 0.5], ['rel', 'USA', 8], ['mod', 'prestige', 2, 24], ['bloc', 'trad', 2], ['bloc', 'pub', -2], ['bloc', 'youth', -2]] },
      { label: 'Commit on paper, deliver slowly', ops: [['spend', 'defense', 0.15], ['rel', 'USA', 2], ['trust', -1]] },
      { label: 'Refuse', ops: [['rel', 'USA', -12], ['mod', 'prestige', -3, 24], ['bloc', 'youth', 2], ['bloc', 'trad', -2]] },
    ],
  },
  {
    id: 'hostage', cat: 'foreign', title: 'Detained abroad',
    text: 'Two {demonym} aid workers have been detained in {actor} on espionage charges. Their families are on every morning show.',
    when: (s) => s.turn > 6, once: true, setup: (s) => ({ actor: hostile(s) }),
    choices: [
      { label: 'Negotiate a prisoner swap', ops: [['rel', '$actor', 5], ['bloc', 'all', 2], ['bloc', 'trad', -2], ['news', 'Aid workers home after secret swap', 1]] },
      { label: 'Impose sanctions', ops: [['rel', '$actor', -15], ['bloc', 'trad', 2], ['chance', 0.5, [['news', 'Detained aid workers sentenced to ten years', -1], ['bloc', 'all', -2]]]] },
    ],
  },
  // ── Scandal & politics ──────────────────────────────────────
  {
    id: 'minister_expenses', cat: 'scandal', title: 'The villa receipts',
    text: 'Leaked receipts show {min}, your {minRole} minister, billed the taxpayer for a luxury villa holiday and a chauffeur for their dog.',
    when: (s) => s.turn > 1,
    setup: (s) => {
      const roles = Object.keys(s.cabinet).filter((r) => s.cabinet[r]);
      roles.sort((a, b) => s.cabinet[a].integrity - s.cabinet[b].integrity);
      return { role: roles[0] };
    },
    weight: (s) => 1 + (60 - s.ind.integ) / 40,
    choices: [
      { label: 'Sack them', ops: [['fire', '$role'], ['bloc', 'all', 1], ['trust', 1], ['unity', -3]] },
      { label: 'Defend them', ops: [['heat', 'scandal', 15], ['trust', -3], ['minister', '$role', 'loyalty', 15]] },
      { label: 'Order an independent investigation', ops: [['heat', 'scandal', 6], ['echo', 'expenses_verdict', 3, 'The investigator will report on {min}.']] },
    ],
  },
  {
    id: 'expenses_verdict', cat: 'scandal', title: 'The investigator reports', echo: true,
    text: 'The independent investigator has delivered the report on {min}.',
    choices: [{ label: 'Read the findings', ops: [['chance', 0.5, [['news', 'Report clears minister of wrongdoing', 1], ['heat', 'scandal', -8]], [['news', 'Damning report: minister broke the rules', -1], ['fire', '$role'], ['heat', 'scandal', 8], ['trust', -2]]]] }],
  },
  {
    id: 'donor_sting', cat: 'scandal', title: 'Access for sale',
    text: 'An undercover sting has filmed a party fundraiser offering “dinner with the {title}” in exchange for a six-figure donation.',
    when: (s) => s.turn > 3, weight: (s) => 1 + (65 - s.ind.integ) / 30,
    choices: [
      { label: 'Ban large private donations', ops: [['mod', 'integ', 4, 0], ['pc', -6], ['bloc', 'prof', 3], ['bloc', 'youth', 2], ['unity', -4]] },
      { label: 'Return the money and apologise', ops: [['trust', -2], ['heat', 'scandal', 8]] },
      { label: 'Deny everything', ops: [['chance', 0.5, [['heat', 'scandal', 25], ['trust', -6], ['news', 'Second tape emerges in cash-for-access scandal', -1]], [['heat', 'scandal', 5]]]] },
    ],
  },
  {
    id: 'backbench_revolt', cat: 'politics', title: 'The letter',
    text: 'Forty of your own MPs have signed a letter accusing you of betraying the manifesto. It will be in tomorrow’s papers.',
    when: (s) => s.unity < 55 && s.turn > 3, weight: 2,
    choices: [
      { label: 'Meet them and make concessions', ops: [['pc', -8], ['unity', 12]] },
      { label: 'Face them down', ops: [['unity', -8], ['pc', 4], ['trust', 1]] },
      { label: 'Promote the ringleaders', ops: [['unity', 7], ['trust', -1]] },
    ],
  },
  {
    id: 'coalition_ultimatum', cat: 'politics', title: 'An ultimatum',
    text: 'The {partner} leadership says it will walk out of government unless you deliver on its priorities. They want an answer within the week.',
    when: (s) => s.gov.slice(1).some((id) => (s.parties.find((p) => p.id === id)?.sat ?? 60) < 30), weight: 4, cooldown: 4,
    setup: (s) => {
      const ps = s.gov.slice(1).map((id) => s.parties.find((p) => p.id === id)).sort((a, b) => a.sat - b.sat);
      return { partner: ps[0].id };
    },
    choices: [
      { label: 'Give them a policy win', desc: 'Enact one of their demands immediately.', ops: [['concede', '$partner'], ['party', '$partner', 'sat', 25]] },
      { label: 'Offer money and posts', ops: [['pc', -10], ['party', '$partner', 'sat', 15]] },
      { label: 'Call their bluff', ops: [['chance', 0.5, [['party', '$partner', 'sat', 8], ['news', '{partner} backs down', 1]], [['leave', '$partner']]]] },
    ],
  },
  {
    id: 'leadership_rumblings', cat: 'politics', title: 'Counting heads',
    text: '{min}, your {minRole} minister, is said to be quietly counting votes for a leadership challenge. Three junior ministers have stopped returning your calls.',
    when: (s) => s.approval < 36 && s.turn > 6 && s.system !== 'presidential', weight: 2, cooldown: 8,
    setup: (s) => {
      const roles = Object.keys(s.cabinet).filter((r) => s.cabinet[r] && s.cabinet[r].party === s.player.partyId);
      roles.sort((a, b) => (s.cabinet[b].ambition - s.cabinet[b].loyalty) - (s.cabinet[a].ambition - s.cabinet[a].loyalty));
      return { role: roles[0] || 'finance' };
    },
    choices: [
      { label: 'Sack them', ops: [['fire', '$role'], ['unity', -8], ['chance', 0.4, [['echo', 'leadership_challenge', 2, 'The rebels are regrouping.']]]] },
      { label: 'Promote them to bind them closer', ops: [['minister', '$role', 'loyalty', 20], ['minister', '$role', 'ambition', -10], ['pc', -4]] },
      { label: 'Ignore the rumours', ops: [['chance', 0.5, [['echo', 'leadership_challenge', 1, 'A challenge may be imminent.']]]] },
    ],
  },
  {
    id: 'opposition_gaffe', cat: 'politics', title: 'Hot mic',
    text: 'The leader of {rival} has been caught on a microphone they thought was off, mocking pensioners as “a voting bloc with a pulse”.',
    when: (s) => s.turn > 2,
    choices: [
      { label: 'Go on the attack', ops: [['party', 'rival', 'mom', -0.15], ['bloc', 'ret', 2], ['trust', -1]] },
      { label: 'Take the high road', ops: [['trust', 2], ['party', 'rival', 'mom', -0.07]] },
    ],
  },
  {
    id: 'whistleblower', cat: 'scandal', title: 'The surveillance files',
    text: 'A whistleblower has leaked files showing the security services monitored the phones of eleven journalists and two opposition MPs.',
    when: (s) => s.policies.surveillance === 2 || s.policies.emergency === 1 || s.policies.pubmedia === 1, weight: 2,
    choices: [
      { label: 'Launch a public inquiry', ops: [['heat', 'scandal', 10], ['mod', 'liberty', 2, 0], ['bloc', 'prof', 2], ['bloc', 'youth', 2]] },
      { label: 'Prosecute the whistleblower', ops: [['mod', 'liberty', -3, 0], ['mod', 'democ', -2, 0], ['bloc', 'youth', -4], ['bloc', 'prof', -3], ['bloc', 'trad', 2], ['mod', 'prestige', -2, 12]] },
    ],
  },
  {
    id: 'court_strikes', cat: 'politics', title: 'Struck down', echo: true,
    text: 'The constitutional court has ruled that your decree on {policy} exceeded executive authority. It is void from midnight.',
    choices: [
      { label: 'Comply with the ruling', ops: [['revert'], ['pc', -4], ['mod', 'democ', 1, 0]] },
      { label: 'Defy the court', ops: [['mod', 'democ', -6, 0], ['mod', 'prestige', -4, 0], ['bloc', 'prof', -4], ['bloc', 'youth', -3], ['trust', -3], ['bloc', 'trad', 2], ['news', '{title} defies the constitutional court', -1]] },
    ],
  },
  {
    id: 'newsroom_raid', cat: 'scandal', title: 'The raid',
    text: 'Police have raided the newsroom of the country’s largest independent paper, citing “state secrets”. Foreign embassies are asking questions.',
    when: (s) => s.policies.pubmedia === 1 || s.policies.media_law === 2 || s.policies.emergency === 1, weight: 1.5,
    choices: [
      { label: 'Order the charges dropped', ops: [['mod', 'democ', 2, 0], ['bloc', 'prof', 2], ['trust', 1]] },
      { label: 'Let the case proceed', ops: [['mod', 'democ', -4, 0], ['mod', 'prestige', -4, 12], ['bloc', 'prof', -3], ['bloc', 'youth', -3], ['rel', 'USA', -3]] },
    ],
  },
  {
    id: 'health_rumours', cat: 'politics', title: 'The photograph',
    text: 'A photograph of you looking grey and exhausted at a summit has sparked rumours about your health.',
    when: (s) => s.turn > 8, once: true,
    choices: [
      { label: 'Release your medical records', ops: [['trust', 2]] },
      { label: 'Take a week off', desc: 'Costs one agenda slot this month.', req: (s) => s.agenda >= 1, reqText: 'Needs an agenda slot', ops: [['agenda', -1], ['bloc', 'all', 1]] },
      { label: 'Dismiss it as gossip', ops: [['chance', 0.3, [['trust', -2]]]] },
    ],
  },
  {
    id: 'memoir', cat: 'scandal', title: 'Chapter nine',
    text: 'Your former chief of staff has published a memoir. Chapter nine is about you, and it is not kind.',
    when: (s) => s.turn > 16, once: true,
    choices: [
      { label: 'Laugh it off', ops: [['chance', 0.5, [['trust', -2], ['heat', 'scandal', 6]], [['bloc', 'all', 1]]]] },
      { label: 'Threaten to sue', ops: [['heat', 'scandal', 10], ['bloc', 'prof', -2]] },
    ],
  },
  // ── Technology ──────────────────────────────────────────────
  {
    id: 'ai_lab', cat: 'tech', title: 'The breakthrough',
    text: 'A domestic AI lab claims a major breakthrough and asks the state for compute subsidies worth billions. Rival labs abroad are a few months behind.',
    when: (s) => s.turn > 3, once: true,
    choices: [
      { label: 'Back them', ops: [['debt', 0.15], ['mod', 'innov', 6, 0], ['mod', 'growth', 0.1, 0], ['bloc', 'prof', 2], ['bloc', 'work', -1]] },
      { label: 'Back them with safety conditions', ops: [['debt', 0.15], ['mod', 'innov', 4, 0], ['bloc', 'prof', 1], ['bloc', 'ret', 1]] },
      { label: 'Decline', ops: [['mod', 'innov', -1, 0], ['bloc', 'biz', -1]] },
    ],
  },
  {
    id: 'antitrust', cat: 'tech', title: 'Break it up',
    text: 'The competition regulator recommends forcing the dominant search-and-advertising platform to sell its local ad business.',
    when: (s) => s.countryId !== 'USA' && s.turn > 4, once: true,
    choices: [
      { label: 'Back the regulator', ops: [['rel', 'USA', -6], ['mod', 'innov', 1, 0], ['bloc', 'biz', 2], ['bloc', 'prof', 1]] },
      { label: 'Settle for a fine', ops: [['debt', -0.02], ['bloc', 'biz', -1]] },
    ],
  },
  {
    id: 'deepfake', cat: 'tech', title: 'It wasn’t you',
    text: 'A convincing deepfake video of you announcing a bank holiday has gone viral overnight. Queues are forming at cash machines.',
    when: (s) => s.turn > 5, once: true,
    choices: [
      { label: 'Emergency televised address', desc: 'Costs one agenda slot this month.', req: (s) => s.agenda >= 1, reqText: 'Needs an agenda slot', ops: [['agenda', -1], ['trust', 2], ['mod', 'conf', 2, 3]] },
      { label: 'Push a deepfake ban', ops: [['mod', 'liberty', -1, 0], ['bloc', 'ret', 2], ['bloc', 'youth', -1]] },
      { label: 'Issue a statement', ops: [['mod', 'conf', -3, 3]] },
    ],
  },
  {
    id: 'data_breach', cat: 'tech', title: 'Eight million records',
    text: 'Hackers have stolen the health records of eight million citizens from a government database that auditors flagged as insecure two years ago.',
    when: (s) => s.turn > 3, once: true,
    choices: [
      { label: 'Compensate victims and overhaul IT', ops: [['debt', 0.05], ['spend', 'research', 0.03], ['trust', -1]] },
      { label: 'Fire the agency head', ops: [['heat', 'scandal', -5], ['trust', -1]] },
      { label: 'Downplay it', ops: [['chance', 0.5, [['heat', 'scandal', 15], ['trust', -4]]]] },
    ],
  },
  {
    id: 'olympics', cat: 'society', title: 'Bid for the Games',
    text: '{capital} has a real chance of hosting the Olympic Games in 2040. The city wants national backing and a guarantee.',
    when: (s) => s.turn > 6 && s.econ.gdp > 400, once: true,
    choices: [
      { label: 'Back the bid', ops: [['debt', 0.1], ['mod', 'prestige', 2, 0], ['bloc', 'all', 1], ['echo', 'olympics_result', 8, 'The IOC will announce its decision.']] },
      { label: 'Too expensive', ops: [['bloc', 'biz', -1], ['bloc', 'prof', 1]] },
    ],
  },
  {
    id: 'olympics_result', cat: 'society', title: 'The envelope', echo: true,
    text: 'The IOC president steps up to the microphone in Lausanne.',
    choices: [{ label: 'Watch', ops: [['chance', 0.4, [['news', '{capital} will host the 2040 Olympics', 1], ['mod', 'prestige', 6, 0], ['bloc', 'all', 3]], [['news', '{capital} loses Olympic bid', -1], ['mod', 'prestige', -1, 12]]]] }],
  },
  // ── Country specific ────────────────────────────────────────
  {
    id: 'independence', cat: 'politics', title: 'Another referendum',
    text: 'The government of {region} demands a new independence referendum, citing its mandate at the last regional election.',
    when: (s) => inAny(s, ['GBR', 'ESP', 'CAN']) && s.turn > 6, once: true,
    setup: (s) => ({ region: { GBR: 'Scotland', ESP: 'Catalonia', CAN: 'Québec' }[s.countryId] }),
    choices: [
      { label: 'Grant the referendum', ops: [['bloc', 'trad', -4], ['bloc', 'youth', 2], ['echo', 'referendum_result', 10, 'The referendum date is set.']] },
      { label: 'Refuse: the union is not up for a vote', ops: [['bloc', 'trad', 3], ['heat', 'unrest', 6], ['mod', 'democ', -1, 0]] },
      { label: 'Offer more devolution', ops: [['pc', -8], ['debt', 0.05], ['bloc', 'prof', 1]] },
    ],
  },
  {
    id: 'referendum_result', cat: 'politics', title: 'The count', echo: true,
    text: 'The polls have closed in {region}. Counting has gone through the night.',
    choices: [{ label: 'Hear the result', ops: [['chance', 0.62, [['news', '{region} votes to stay', 1], ['bloc', 'all', 2], ['mod', 'prestige', 1, 0]], [['news', '{region} votes to leave', -1], ['mod', 'growth', -0.6, 18], ['mod', 'prestige', -8, 0], ['bloc', 'all', -6], ['trust', -5], ['pc', -15]]]] }],
  },
  {
    id: 'eu_funds', cat: 'foreign', title: 'Brussels names its price',
    text: 'The European Commission says billions in frozen EU funds will flow again once the courts are independent and the anti-corruption office has real power.',
    when: (s) => has(s, 'HUN') && (s.policies.courts === 1 || s.policies.anticorr === 0) && !s.flags.euFundsDone, cooldown: 12,
    choices: [
      { label: 'Commit to the reforms', ops: [['flag', 'euCommit'], ['rel', 'DEU', 5], ['rel', 'FRA', 5], ['echo', 'eu_funds_release', 8, 'Brussels will review your rule-of-law reforms.']] },
      { label: 'Refuse: sovereignty first', ops: [['bloc', 'trad', 3], ['bloc', 'prof', -3], ['rel', 'DEU', -5], ['rel', 'FRA', -5]] },
    ],
  },
  {
    id: 'eu_funds_release', cat: 'foreign', title: 'The Commission decides', echo: true,
    text: 'The Commission has finished its review of your rule-of-law reforms.',
    choices: [{ label: 'Read the decision', ops: (s) => (s.policies.courts === 0 && s.policies.anticorr >= 1 ? [['flag', 'euFundsDone'], ['mod', 'growth', 0.6, 24], ['debt', -1.5], ['news', 'EU unfreezes billions for {country}', 1], ['bloc', 'all', 3]] : [['news', 'Brussels keeps funds frozen: reforms “insufficient”', -1], ['bloc', 'prof', -2]]) }],
  },
  {
    id: 'shutdown', cat: 'politics', title: 'Midnight shutdown',
    text: 'Congress has failed to pass a spending bill. Unless something changes, the federal government shuts down at midnight.',
    when: (s) => has(s, 'USA') && s.turn > 4, cooldown: 12,
    choices: [
      { label: 'Compromise with the opposition', ops: [['pc', -8], ['unity', -4], ['bloc', 'all', 1]] },
      { label: 'Hold out', ops: [['mod', 'growth', -0.2, 3], ['bloc', 'pub', -6], ['chance', 0.5, [['party', 'rival', 'mom', -0.1]], [['party', 'own', 'mom', -0.1]]]] },
    ],
  },
  {
    id: 'winter_crisis', cat: 'health', title: 'Forty hours in a corridor',
    text: 'Winter flu has pushed hospitals into crisis. Patients are waiting forty hours on trolleys in emergency department corridors.',
    when: (s) => inAny(s, ['GBR', 'CAN', 'ITA', 'ESP', 'SWE']) && [11, 0, 1].includes(s.turn % 12), cooldown: 10,
    choices: [
      { label: 'Emergency winter funding', ops: [['debt', 0.1], ['spend', 'health', 0.05], ['bloc', 'ret', 3], ['bloc', 'pub', 2]] },
      { label: 'Use private hospitals to clear the backlog', ops: [['debt', 0.06], ['mod', 'health', 1, 6], ['bloc', 'pub', -3], ['bloc', 'biz', 2]] },
      { label: 'Blame the previous government', ops: [['bloc', 'ret', -2], ['trust', -1]] },
    ],
  },
  {
    id: 'debt_brake', cat: 'economy', title: 'The debt brake',
    text: 'The constitutional debt brake blocks the borrowing your investment plans depend on. Loosening it needs a two-thirds majority you do not have.',
    when: (s) => has(s, 'DEU') && s.econ.deficit > 3, once: true,
    choices: [
      { label: 'Create an off-budget investment fund', ops: [['debt', 0.5], ['spend', 'infrastructure', 0.3], ['bloc', 'biz', 2], ['trust', -2]] },
      { label: 'Cut spending to comply', ops: [['spend', 'welfare', -0.4], ['bloc', 'poor', -3], ['bloc', 'pub', -2], ['econ', 'riskMod', -0.3]] },
    ],
  },
  {
    id: 'pension_streets', cat: 'labor', title: 'Une marée humaine',
    text: 'More than a million people march against pension cuts. The unions announce a general strike for next Thursday.',
    when: (s) => has(s, 'FRA') && s.policies.pension_age >= 2, cooldown: 10,
    choices: [
      { label: 'Withdraw the reform', ops: [['policy', 'pension_age', 1], ['pc', -10], ['trust', -2], ['bloc', 'work', 4]] },
      { label: 'Force it through', ops: [['heat', 'unrest', 20], ['bloc', 'work', -4], ['bloc', 'biz', 3]] },
    ],
  },
  {
    id: 'yen', cat: 'economy', title: 'The yen slides',
    text: 'The yen has fallen to its weakest level in four decades. Import prices are surging and the finance ministry asks whether to intervene.',
    when: (s) => has(s, 'JPN'), cooldown: 14,
    choices: [
      { label: 'Intervene in currency markets', ops: [['mod', 'infl', -0.3, 6], ['debt', 0.2]] },
      { label: 'Let it fall: exporters win', ops: [['mod', 'infl', 0.4, 8], ['mod', 'growth', 0.15, 8], ['bloc', 'biz', 2], ['bloc', 'ret', -3]] },
    ],
  },
  {
    id: 'monsoon', cat: 'disaster', title: 'The monsoon fails',
    text: 'Rainfall is 30% below normal. Crops are wilting across the northern plains and food prices are rising fast.',
    when: (s) => has(s, 'IND') && [6, 7, 8].includes(s.turn % 12), cooldown: 12,
    choices: [
      { label: 'Release grain reserves and support farmers', ops: [['debt', 0.15], ['mod', 'infl', -0.4, 6], ['bloc', 'rural', 6]] },
      { label: 'Ban food exports', ops: [['mod', 'infl', -0.6, 6], ['bloc', 'rural', -3], ['mod', 'prestige', -2, 12]] },
    ],
  },
  {
    id: 'amazon', cat: 'environment', title: 'The arc of fire',
    text: 'Satellite data shows Amazon deforestation up 40% this year. European buyers threaten to boycott Brazilian beef and soy.',
    when: (s) => has(s, 'BRA'), cooldown: 14,
    choices: [
      { label: 'Send in federal enforcement', ops: [['spend', 'green', 0.05], ['mod', 'emis', -2, 0], ['bloc', 'rural', -5], ['mod', 'prestige', 4, 24]] },
      { label: 'Defend farmers’ rights', ops: [['bloc', 'rural', 4], ['mod', 'prestige', -5, 24], ['rel', 'FRA', -6], ['rel', 'DEU', -6]] },
    ],
  },
  {
    id: 'load_shedding', cat: 'economy', title: 'Stage six',
    text: 'The state utility has moved to stage six load-shedding: ten hours a day without power. Factories are idling.',
    when: (s) => has(s, 'ZAF') && s.ind.energy < 50, cooldown: 8,
    choices: [
      { label: 'Emergency private power procurement', ops: [['debt', 0.2], ['mod', 'energy', 6, 0], ['bloc', 'biz', 3], ['bloc', 'pub', -2]] },
      { label: 'Bail out the utility again', ops: [['debt', 0.4], ['mod', 'energy', 2, 12], ['bloc', 'work', 2], ['trust', -2]] },
    ],
  },
  {
    id: 'cartel', cat: 'security', title: 'A city under siege',
    text: 'Cartel gunmen have blockaded a state capital after the arrest of a kingpin. Burning trucks block every highway.',
    when: (s) => inAny(s, ['MEX', 'BRA', 'COL']) && s.turn > 1, cooldown: 8,
    choices: [
      { label: 'Send in the army', ops: [['mod', 'crime', -3, 12], ['mod', 'liberty', -2, 0], ['bloc', 'trad', 3], ['bloc', 'ret', 2], ['chance', 0.3, [['news', 'Civilians killed in army operation', -1], ['bloc', 'all', -3]]]] },
      { label: 'Release the kingpin to restore calm', ops: [['mod', 'crime', 2, 12], ['trust', -5], ['bloc', 'all', -3]] },
    ],
  },
  {
    id: 'imf_review', cat: 'economy', title: 'The IMF review',
    text: 'The IMF mission wants deeper subsidy cuts before releasing the next tranche of your loan programme.',
    when: (s) => has(s, 'ARG') || (s.econ.stress > 0.5 && s.econ.gdp < 1000), cooldown: 12,
    choices: [
      { label: 'Cut energy subsidies', ops: [['spend', 'welfare', -0.4], ['mod', 'infl', 0.5, 6], ['econ', 'riskMod', -0.8], ['bloc', 'poor', -5], ['bloc', 'work', -3]] },
      { label: 'Refuse and go it alone', ops: [['econ', 'riskMod', 1.0], ['bloc', 'work', 3], ['bloc', 'poor', 3], ['mod', 'conf', -6, 9]] },
    ],
  },
  {
    id: 'lira', cat: 'economy', title: 'The lira breaks',
    text: 'The currency has lost 8% in a day. The central bank is burning reserves and the governor wants an emergency rate hike.',
    when: (s) => has(s, 'TUR') || (s.ind.infl > 15 && s.turn > 3), cooldown: 10,
    choices: [
      { label: 'Back an emergency hike', ops: [['econ', 'rate', 5], ['econ', 'inflAnchor', -1.5], ['mod', 'growth', -0.6, 9], ['bloc', 'biz', -2], ['bloc', 'prof', 2]] },
      { label: 'Impose capital controls', ops: [['mod', 'conf', -10, 12], ['mod', 'prestige', -3, 12], ['econ', 'inflAnchor', 1.0]] },
    ],
  },
  {
    id: 'nk_missile', cat: 'security', title: 'Over the sea',
    text: 'North Korea has fired an intercontinental missile over the sea, the longest flight yet. Allies are calling.',
    when: (s) => inAny(s, ['KOR', 'JPN']), cooldown: 8,
    choices: [
      { label: 'Joint drills with the United States', ops: [['rel', 'USA', 5], ['rel', 'PRK', -10], ['rel', 'CHN', -5], ['bloc', 'trad', 2], ['mod', 'mil', 1, 0]] },
      { label: 'Offer talks', ops: [['rel', 'PRK', 8], ['bloc', 'youth', 2], ['bloc', 'trad', -3]] },
    ],
  },
  {
    id: 'gangs', cat: 'security', title: 'Shootings in the suburbs',
    text: 'Three fatal shootings in a week, one of them a teenager killed by a stray bullet. The gangs are recruiting children as hitmen over social media.',
    when: (s) => inAny(s, ['SWE', 'ZAF', 'MEX', 'BRA', 'FRA', 'NLD']) && s.turn > 1, cooldown: 8,
    choices: [
      { label: 'Stop-and-search zones and tougher sentences', ops: [['mod', 'crime', -3, 12], ['mod', 'liberty', -2, 0], ['bloc', 'trad', 3], ['bloc', 'ret', 3], ['bloc', 'minor', -4]] },
      { label: 'Invest in youth programmes', ops: [['spend', 'education', 0.05], ['mod', 'crime', -1, 24], ['bloc', 'minor', 2], ['bloc', 'youth', 2]] },
    ],
  },
  // ── Notifications (single-choice) generated by the engine ───
  {
    id: 'leadership_challenge', cat: 'politics', title: 'The challenge', echo: true,
    text: 'A formal leadership challenge has been lodged against you. Your party’s MPs will vote at six o’clock.',
    choices: [
      { label: 'Fight for your job', ops: [['leadershipVote']] },
      { label: 'Resign with dignity', ops: [['over', 'resigned', 'You stepped down rather than face a leadership vote.']] },
    ],
  },
  { id: 'pandemic_wave2', cat: 'health', title: 'The second wave', echo: true, text: 'Hospitals are filling again. The epidemiologists were right.', choices: [{ label: 'Lock down now', ops: [['mod', 'growth', -1.2, 3], ['debt', 0.6], ['bloc', 'ret', 2], ['bloc', 'biz', -4]] }, { label: 'Stay the course', ops: [['mod', 'health', -5, 6], ['bloc', 'ret', -6], ['trust', -3]] }] },
  {
    id: 'pandemic', cat: 'health', title: 'A new virus',
    text: 'A new respiratory virus is spreading fast. Hospitals in two regions are close to capacity and the chief medical officer wants a decision tonight.',
    when: (s) => s.world.globals.pandemic > 0, weight: 8, cooldown: 30,
    choices: [
      { label: 'Lock down now', ops: (s) => [['mod', 'growth', -1.5, 4], ['mod', 'health', 2, 6], ['debt', 1.0], ['bloc', 'ret', 5], ['bloc', 'biz', -6], ['bloc', 'youth', -4], ['mod', 'liberty', -4, 6], ['trust', s.player.bg === 'doctor' ? 3 : 0]] },
      { label: 'Targeted measures and masks', ops: [['mod', 'growth', -0.4, 4], ['debt', 0.3], ['bloc', 'ret', 1], ['chance', 0.5, [['mod', 'health', -2, 6]], [['news', 'Targeted approach is working, says chief medical officer', 1]]]] },
      { label: 'Keep the country open', ops: [['mod', 'health', -6, 8], ['bloc', 'ret', -6], ['bloc', 'biz', 3], ['bloc', 'youth', 2], ['echo', 'pandemic_wave2', 3, 'Epidemiologists are worried about the next wave.']] },
    ],
  },
];

export const EVENT_MAP = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export { NOTE };
