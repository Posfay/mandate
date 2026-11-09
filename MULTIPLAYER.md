# Mandate multiplayer: design and technical plan

Mandate ships as a single-player game, but its engine was built so that the other side of the table can be a person.
This document describes the multiplayer modes worth building, in the order that delivers the most for the least work,
and what the engine already provides.

## What is already in place

| Property | Where | Why it matters |
| --- | --- | --- |
| Deterministic simulation | `src/engine/util.js` keeps the RNG state (`s.rng`, mulberry32) inside the game state | Same seed + same actions = same history on every machine. Lockstep becomes possible. |
| Command pattern | Every input goes through `dispatch(state, action)` in `src/engine/game.js` and is appended to `s.actionLog` | Actions are tiny JSON messages: the network protocol is already defined. |
| Declarative content | Event effects are op lists (`['bloc', 'work', 4]`), not code | A server can validate, describe and replay choices without UI code. |
| Single JSON state | `store.js` saves the whole game as one document | Snapshots for join-in-progress, reconnect, spectating and save-sync. |
| No UI in the engine | `src/engine` imports nothing from React | The same engine runs in a browser, a Node server or a worker. |

The engine uses no wall-clock time and no `Math.random()` (the only exception picks the seed when none is given), and
generated IDs come from a counter stored in the state. Keep it that way: anything new inside `src/engine` that needs
randomness must go through the state RNG. `tools/replaytest.mjs` checks this by replaying a game from its seed and
action log and comparing the result.

## Modes

### 1. Government and opposition (asymmetric 1v1)

One country, one electorate, two players. Player A governs exactly as in single-player. Player B leads the largest
opposition party and gets their own agenda and political capital:

- **Opposition actions:** table a no-confidence motion, filibuster or amend a bill (raises its capital cost), amplify a
  scandal (raises `heat.scandal`), set the narrative (shift salience), woo a coalition partner (lower their satisfaction),
  shadow budget (a counter-proposal voters compare).
- **Shared simulation:** the same voter model decides who is winning. The election is the scoreboard.
- **Turn structure:** both players act during the month; the government's actions resolve first, then the opposition's,
  then `endMonth`. Hidden information: the government sees whip counts, the opposition sees only public polls.

Why first: it reuses one country and one engine instance, needs only two seats, and is the most "Mandate" of the modes.

### 2. Rival nations (2–8 players, simultaneous turns)

Each player governs a different country in one shared world. Today the world's other governments are scripted; in this
mode they are people.

- **Diplomacy becomes negotiation:** trade agreements, defence pacts and sanctions require the other player's consent,
  with a proposal/accept/counter flow and optional side payments in political capital.
- **Shared world state:** oil, world growth, tension, AI adoption and climate stress are global; one player's sanctions
  or tariff war move everyone's economy.
- **Summits:** every twelve months, a G20-style summit where leaders vote on a joint communiqué (climate, trade,
  security). Signatories gain prestige; holdouts gain domestic approval with nationalist blocs.
- **Engine change:** split state into `world` (shared) and `nations[id]` (per player); `endMonth` advances all nations
  after all players have submitted their month (simultaneous lockstep).

### 3. The cabinet (3–6 players, cooperative with traitors)

Everyone sits in the same government. Each player holds a portfolio (Finance, Interior, Health…) with control over its
budget line and events, a public goal (the government's re-election) and a secret personal agenda (become leader, pass a
pet bill, destroy a rival). Players can leak, brief against each other, and trigger a leadership challenge, which uses
the existing leadership-vote mechanic. A social-deduction game played on top of the simulation.

### 4. The people (streamer mode)

A streamer governs; the audience is the electorate. Viewers are assigned to voter blocs and vote in chat on what their
bloc cares about this month; their mood becomes that bloc's approval modifier. One-way data flow makes this the simplest
networked mode technically.

### 5. Asynchronous summits

Play single-player at your own pace. Periodically your leader attends a summit with leaders from other players' games
(matched by in-game date). Agreements struck there apply to both games as permanent modifiers. No real-time requirement.

## Technical plan

1. **Engine isolation.** Move `src/engine` and `src/data` into a package usable from Node. Add a test that replays
   `actionLog` from `seed` and asserts byte-identical state (`tools/simtest.mjs` is the start of this).
2. **Authoritative server, lockstep clients.** A small Node/WebSocket server holds the canonical state per room. Clients
   send actions; the server validates them with the same `dispatch`, broadcasts the accepted action with a sequence
   number, and every client applies it locally. State hashes every month detect desyncs; on mismatch the client
   downloads a snapshot.
3. **Seats and permissions.** Add `actor` to each action (`{ type, ..., actor: 'gov' | 'opp' | playerId }`) and a
   permission table per mode (who may resolve which events, spend which capital).
4. **Simultaneous turns.** `endMonth` becomes "ready"; the server advances when every seat is ready or a timer expires
   (default choice applied for unresolved events, which the engine can already describe).
5. **Hidden information.** The server sends each seat a filtered view (e.g. opposition does not see the government's
   echoes or whip counts). Because clients still simulate locally, hidden values must be derivable only on the server:
   for competitive modes, switch from lockstep to server-simulated with per-seat projections.
6. **Persistence and accounts.** Rooms persist as `{ seed, actionLog, snapshot }`. Replays and spectating come free.
7. **Hosting.** Any WebSocket host (Cloudflare Durable Objects, Fly.io, a small VPS). One room is a few KB of state and
   a handful of messages per minute.

## First milestone

Hot-seat "Government and opposition" on one device: two seats, alternating phases each month, no networking. It
exercises seats, permissions and the opposition action set, and everything it needs is local.
