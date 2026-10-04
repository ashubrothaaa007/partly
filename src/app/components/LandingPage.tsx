import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../../utils/supabaseClient';

interface Props {
  onJoin: (name: string, roomId: string) => void;
}

export function LandingPage({ onJoin }: Props) {
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial fetch using Supabase Realtime Presence
    const channel = supabase.channel(`room:main-party`);
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      let count = 0;
      for (const key of Object.keys(state)) {
        if (state[key].length > 0) count++;
      }
      setRoomCounts({ 'main-party': count });
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleJoin = () => {
    if (name.trim().length >= 2) {
      onJoin(name.trim(), 'main-party');
    }
  };

  const totalPlayers = Object.values(roomCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        fontFamily: "'Rajdhani', sans-serif",
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
      }}
    >
      {/* Game Background Image */}
      <img
        src="https://images.unsplash.com/photo-1662950267280-0cdf5f7139b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwcGFydHl8ZW58MXx8fHwxNzgxMDcxMjE3fDA&ixlib=rb-4.1.0&q=80&w=1080"
        alt="Tropical Party Background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.7,
        }}
      />

      {/* Vignette & Gradients for UI readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(10,0,20,0.9) 0%, rgba(10,0,20,0.7) 30%, transparent 100%), linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)',
        }}
      />



      {/* Main Game Menu UI (Left aligned like PC games) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 'min(600px, 100vw)',
        padding: '0 5vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        zIndex: 10,
      }}>
        
        {/* Title Sequence */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(60px, 8vw, 110px)',
            fontFamily: "'Orbitron', monospace",
            fontWeight: 900,
            lineHeight: 0.9,
            color: '#ffffff',
            textTransform: 'uppercase',
            fontStyle: 'italic',
            textShadow: '5px 5px 0px #ff00ff, -2px -2px 0px #00ffff',
            letterSpacing: '0.02em'
          }}>
            Partly
          </h1>
          <div style={{
            fontSize: 'clamp(14px, 2vw, 20px)',
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            color: '#00ffff',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginTop: '12px',
            textShadow: '0 0 10px rgba(0,255,255,0.5)',
            background: 'linear-gradient(90deg, rgba(0,255,255,0.1), transparent)',
            padding: '4px 12px',
            borderLeft: '4px solid #00ffff',
            display: 'inline-block'
          }}>MEET.DANCE.CONNECT.</div>
        </motion.div>

        {/* Input & Play Button */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* Player Name Input */}
          <div style={{ position: 'relative' }}>
            <div style={{
              fontSize: '14px',
              fontFamily: "'Orbitron', monospace",
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600
            }}>
              Callsign / Username
            </div>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="ENTER NAME"
              maxLength={20}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '20px 24px',
                background: isFocused ? 'rgba(255, 0, 255, 0.1)' : 'rgba(0, 0, 0, 0.6)',
                border: '2px solid',
                borderColor: isFocused ? 'rgba(255, 0, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                borderLeft: isFocused ? '6px solid #ff00ff' : '4px solid #ff00ff',
                color: '#ffffff',
                fontSize: '24px',
                fontFamily: "'Orbitron', monospace",
                fontWeight: 700,
                letterSpacing: '0.1em',
                outline: 'none',
                boxSizing: 'border-box',
                textTransform: 'uppercase',
                transition: 'background-color 0.2s, border-color 0.2s, border-left-width 0.2s',
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </div>

          {/* Chunky Game Play Button */}
          <motion.button
            whileHover={{ scale: 1.02, x: 10 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleJoin}
            disabled={name.trim().length < 2}
            animate={{
              background: name.trim().length >= 2 ? '#ff00ff' : '#333333',
              color: name.trim().length >= 2 ? '#ffffff' : '#888888',
              boxShadow: name.trim().length >= 2 
                ? '6px 6px 0px rgba(0,255,255,0.8), 0 0 20px rgba(255,0,255,0.5)' 
                : '6px 6px 0px #1a1a1a',
            }}
            transition={{ duration: 0.3 }}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '16px',
              border: 'none',
              fontSize: '20px',
              fontFamily: "'Orbitron', monospace",
              fontWeight: 900,
              letterSpacing: '0.1em',
              cursor: name.trim().length >= 2 ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase',
              transform: 'skewX(-10deg)',
              marginTop: '10px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Button text un-skewed so it reads normally */}
            <span style={{ display: 'inline-block', transform: 'skewX(10deg)', textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
              Deploy
            </span>
            
            {/* Glitch/shine overlay */}
            {name.trim().length >= 2 && (
              <div style={{
                position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                transform: 'skewX(20deg)',
                animation: 'shine 3s infinite'
              }} />
            )}
          </motion.button>

          {/* Server Status / Player Count */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginTop: '20px',
            fontFamily: "'Rajdhani', sans-serif",
            background: 'rgba(0,0,0,0.5)',
            padding: '12px 16px',
            borderRadius: '4px',
            maxWidth: '400px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{ position: 'relative', width: '12px', height: '12px' }}>
              <div style={{ position: 'absolute', inset: 0, background: '#00ff88', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              <div style={{ position: 'absolute', inset: 2, background: '#00ff88', borderRadius: '50%' }} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Server Status: Online
              </div>
              <div style={{ fontSize: '18px', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em' }}>
                {totalPlayers} Players Active
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls / Game Info overlay bottom right */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: '14px', fontFamily: "'Orbitron', monospace", color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>
          Keybinds
        </div>
        {[
          { keys: 'W A S D', label: 'Navigate' },
          { keys: 'SPACE', label: 'Jump' },
          { keys: 'C / V', label: 'Emote' },
        ].map(k => (
          <div key={k.keys} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '14px', color: '#aaaaaa', fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k.label}</span>
            <span style={{
              background: '#ffffff',
              color: '#000000',
              padding: '4px 8px',
              borderRadius: '2px',
              fontSize: '12px',
              fontFamily: "'Orbitron', monospace",
              fontWeight: 800,
            }}>{k.keys}</span>
          </div>
        ))}
      </motion.div>

      <style>{`
        @keyframes shine {
          0% { left: -100%; }
          20% { left: 200%; }
          100% { left: 200%; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(2); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        input::placeholder { color: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
}