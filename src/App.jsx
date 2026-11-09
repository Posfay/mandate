import { useState } from 'react';
import { Title, Setup } from './screens/Start.jsx';
import GameScreen from './screens/Game.jsx';
import Info from './screens/Info.jsx';
import { store, loadSave, useGame } from './store.js';

export default function App() {
  const s = useGame();
  const [screen, setScreen] = useState('title');
  const [info, setInfo] = useState(null);

  let body;
  if (screen === 'game' && s) body = <GameScreen onQuit={() => { store.clear(); setScreen('title'); }} onInfo={setInfo} />;
  else if (screen === 'setup') body = <Setup onBack={() => setScreen('title')} onStart={() => setScreen('game')} />;
  else body = <Title onNew={() => setScreen('setup')} onContinue={() => loadSave() && setScreen('game')} onInfo={setInfo} />;

  return (
    <>
      {body}
      {info && <Info kind={info} onClose={() => setInfo(null)} />}
    </>
  );
}
