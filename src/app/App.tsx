import { useState } from 'react';
import { Toaster } from 'sonner';
import { LandingPage } from './components/LandingPage';
import { PartyScene } from './components/PartyScene';

export default function App() {
  const [screen, setScreen] = useState<'landing' | 'party'>('landing');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('main-party');

  const handleJoin = (name: string, room: string) => {
    setPlayerName(name);
    setRoomId(room);
    setScreen('party');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Toaster position="top-center" theme="dark" />
      {screen === 'landing' ? (
        <LandingPage onJoin={handleJoin} />
      ) : (
        <PartyScene playerName={playerName} roomId={roomId} />
      )}
    </div>
  );
}
