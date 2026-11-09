# Mandate

**Govern a real nation. Survive the people.**

Mandate is a political simulation for the browser. It is January 2027 in an alternate near-future, and you have
just taken power in one of twenty real countries. You have to win votes in a real parliament, hold a coalition together,
keep the promises you campaigned on, and get re-elected. Every decision moves an electorate made of thousands of citizens,
and you can watch them move.

## Play

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173.

To get a single HTML file you can double-click to play offline, with no server and no internet:

```bash
npm run build:single
```

The game is then `dist-single/index.html`. Saves live in your browser's local storage.

## What makes it different

- **The living electorate.** The population is ten voter blocs (professionals, workers, retirees, rural voters, youth,
  business owners, public-sector staff, traditionalists, the precarious and minorities). Each bloc has a place on the
  political compass, its own priorities and its own turnout. On screen, every particle is a slice of voters, pulled toward
  the party it would back today. When opinion shifts, you see people cross the room.
- **Every law is a vote.** A policy change becomes a bill. You see a live whip count, party by party, spend political
  capital lobbying waverers, then watch the division fill the hemicycle seat by seat. Constitutional changes need two
  thirds. Presidents can rule by decree instead, and courts may strike the decree down.
- **Coalitions with teeth.** When no one has a majority, you negotiate. Partners join only if they are close enough to
  you, write their demands straight into law, take cabinet posts, and walk out if you ignore them. Bringing a fringe
  party into government splits your own.
- **Pledges and trust.** You make three promises at the start. They are judged at the election. Break the no-new-taxes
  pledge and you are judged the same day.
- **The conversation.** Voters judge you most on whatever the country is talking about. You can address the nation to
  pull attention toward your strengths, until a crisis or scandal pulls it away again.
- **Echoes.** Some decisions schedule consequences months later: a bailed-out factory reports, a rent freeze expires, a
  court rules on your decree. Upcoming echoes are listed so you can see trouble coming.
- **A real economy, simplified honestly.** Growth, jobs, inflation, a central bank following a Taylor rule, bond markets
  that punish fiscal recklessness, debt dynamics, plus health, education, crime, emissions, housing, liberty, democracy
  and integrity. Every number shows what is driving it.
- **The path of power.** You can capture the courts, take over the public broadcaster, or declare a state of emergency.
  Governing gets easier: more capital, fewer obstacles. Democracy, your allies and the street all react.
- **A living world.** Sixty-five nations with real 2026 leaders, relations, blocs (EU, NATO, G7, BRICS), trade deals,
  defence pacts, sanctions, oil shocks, pandemics, AI booms and foreign elections that change leaders.
- **Election night and a legacy.** Polls close, the results animate in, and coalition talks may follow. When it ends,
  history grades you across eight dimensions and gives you a name.

## The twenty nations

United States, Canada, Mexico, Brazil, Argentina, United Kingdom, France, Germany, Italy, Spain, Netherlands, Sweden,
Poland, Hungary, Türkiye, South Africa, India, Japan, South Korea, Australia.

Each nation has its real parties with approximate 2025–26 polling, its electoral system (first-past-the-post,
proportional with thresholds, mixed, run-off), its term length and term limits, a real fiscal position, and its own
mix of voters and national issues. Your party "has just won", so if you pick a party that is not in power today, the
game starts with a hypothetical election it came first in.

Ministers, rivals' quotes and scandals involve **fictional** people. Real foreign heads of state appear only by name
and title in neutral diplomatic roles, and can be replaced as the simulated world holds its own elections.

## How a month works

1. Read the decisions on your desk. Each option shows its likely effects; dashed chips are uncertain.
2. Spend your three agenda slots: address the nation, rally a voter bloc, hold a press conference, shore up your party,
   keep partners happy, court the opposition, or travel abroad.
3. Draft bills in **Policy** and **Budget**, check the whip count, lobby, and call the vote.
4. End the month. The economy, voters and world move on, and the monthly briefing shows what changed.

Elections come at each country's real interval. The last four months are campaign season. In parliamentary systems
you can call a snap election, and you can lose a confidence vote or a leadership challenge. Presidents face term limits.

## Project structure

```
src/
  data/       countries, parties, voter blocs, 36 policies, 85 events, 65 world actors, names, pledges
  engine/     deterministic simulation (no UI code)
    core.js     indicator targets, economy, approval, voter model, seats, whip counts
    game.js     creation, monthly turn, elections, diplomacy, the action dispatcher
    effects.js  declarative event effects: apply them, or describe them for the UI
    cabinet.js  generated ministers
  ui/         Globe (canvas, d3-geo), Swarm (electorate particles), Hemicycle, charts, portraits, guilloché
  screens/    title, setup, coalition talks, the game shell
  views/      overview, electorate, policy, budget, parliament, cabinet, world, media, records
  modals/     decision dispatch, bill vote, monthly briefing, election night, legacy
tools/simtest.mjs     headless balance test: plays every country with a bot and prints the outcome
tools/replaytest.mjs  determinism test: rebuilds a game from its seed and action log and compares
```

Run the balance test with `node tools/simtest.mjs` (optionally a country id and month count, e.g. `node tools/simtest.mjs HUN 60`).

## Multiplayer

Single-player today. The engine is deterministic and command-driven so that multiplayer can be added without a rewrite.
See [MULTIPLAYER.md](MULTIPLAYER.md) for the modes and the technical plan.

## Credits

Built with React, Vite, d3-geo, topojson and world-atlas (Natural Earth), flag-icons, Bodoni Moda and Public Sans.
