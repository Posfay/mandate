// "How to play" and the multiplayer roadmap.
import { Icon } from '../ui/bits.jsx';

const HOW = [
  ['Each month is a turn', 'Read the decisions on your desk, use your three agenda slots, pass legislation, then end the month. The economy, voters and the world move on, and a briefing tells you what changed.'],
  ['Political capital is your currency', 'You earn it every month from approval and the size of your majority. Spend it to bring bills to a vote, lobby wavering parties, sign decrees and strike deals abroad.'],
  ['Every bill is a vote', 'Draft a change in Policy or Budget and see the whip count party by party. Lobby parties that are undecided. If the vote fails, the capital is gone and your authority takes a hit.'],
  ['Watch the electorate', 'Ten voter blocs sit on the political compass. Each cares about different issues and reacts to your policies, your record and the news. Hover them to see why they feel the way they do.'],
  ['Control the conversation', 'Voters judge you most on what the country is talking about. Address the nation on issues where your record is strong. Crises and scandals will pull the spotlight elsewhere.'],
  ['Keep your promises', 'The three pledges you made are judged at the next election. Breaking the no-new-taxes pledge is judged immediately.'],
  ['Decisions echo', 'Some choices schedule consequences months later. They appear in the Echoes list so you can see trouble coming.'],
  ['Survive', 'Lose an election, a confidence vote or your party’s confidence and it is over. Serve out your terms and history will give you a name.'],
];

const MODES = [
  ['Rival nations', 'Two to eight players each lead a country in the same world. Turns resolve simultaneously; trade deals, sanctions and alliances become negotiations between people, not scripts. Global events hit everyone at once.'],
  ['Government and opposition', 'An asymmetric duel inside one country. One player governs; the other leads the opposition: tables no-confidence motions, filibusters bills, picks which scandals to amplify and fights the campaign. Same electorate, opposite goals.'],
  ['The cabinet', 'Three to six players sit in one government as ministers with public portfolios and secret personal agendas. Cooperate to win the election, or quietly build support for a leadership challenge. A social-deduction game played on top of the simulation.'],
  ['The people', 'A streamer governs while the audience plays the electorate: chat votes as voter blocs in real time, and their mood becomes the polls.'],
  ['Asynchronous summits', 'Play solo at your own pace, but meet other players’ leaders at periodic summits where agreements are struck and enforced across both games.'],
];

const ARCH = [
  'Deterministic engine. All randomness comes from a seeded generator stored in the game state, so the same actions always produce the same history.',
  'Command log. Every player input is a serializable action (resolveEvent, bill, decree, diplomacy, endMonth). The log plus the seed reproduces a game exactly: the basis for lockstep multiplayer, replays and anti-cheat validation on a server.',
  'Data-driven content. Events, policies and countries are plain data with declarative effects, so a server can validate and broadcast them without running UI code.',
  'Single-state snapshots. The whole game is one JSON document, ready for save-sync, spectating and reconnecting.',
];

export default function Info({ kind, onClose }) {
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="info-title" style={{ width: 'min(820px, 100%)' }}>
        <div className="modal-pad">
          <div className="spread" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="label">{kind === 'how' ? 'The rules of the job' : 'Where Mandate goes next'}</div>
              <h2 className="h1" id="info-title">{kind === 'how' ? 'How to govern' : 'Multiplayer roadmap'}</h2>
            </div>
            <button className="btn btn-ghost" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
          </div>
          {kind === 'how' ? (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginTop: 18 }}>
              {HOW.map(([t, d]) => (
                <div key={t}>
                  <div className="h3" style={{ fontSize: 17 }}>{t}</div>
                  <p className="small dim" style={{ margin: '4px 0 0' }}>{d}</p>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="lede" style={{ marginTop: 10 }}>
                Mandate is single-player today, but the engine was built so that people, not scripts, can sit on the other side of the table.
              </p>
              <div className="col" style={{ gap: 14, marginTop: 16 }}>
                {MODES.map(([t, d]) => (
                  <div key={t} className="card">
                    <div className="h3" style={{ fontSize: 17 }}>{t}</div>
                    <p className="small dim" style={{ margin: '4px 0 0' }}>{d}</p>
                  </div>
                ))}
              </div>
              <div className="h3" style={{ marginTop: 22, marginBottom: 6 }}>Already in the engine</div>
              <ul className="small dim" style={{ paddingLeft: 18, margin: 0, display: 'grid', gap: 6 }}>
                {ARCH.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
