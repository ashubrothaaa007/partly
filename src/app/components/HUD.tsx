import { useState } from 'react';

interface Player {
  name: string;
  color: string;
  animation: string;
}

interface Props {
  playerName: string;
  playerColor: string;
  roomName: string;
  players: Player[];
  animation: string;
  globalVolume: number;
  setGlobalVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
}

const ANIM_EMOJI: Record<string, string> = {
  idle: '😐', walk: '🚶', dance: '💃', wave: '👋', cheer: '🙌', sit: '🪑', jump: '⬆️',
};

export function HUD({ playerName, playerColor, roomName, players, animation, globalVolume, setGlobalVolume, isMuted, setIsMuted }: Props) {
  const [showPlayers, setShowPlayers] = useState(true);

  return (
    <>
      {/* ── TOP BAR ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '48px',
        background: 'linear-gradient(180deg,rgba(0,0,0,0.55) 0%,transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 30, pointerEvents: 'none',
        fontFamily: "'Orbitron', monospace",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', textShadow: '2px 2px 0px #ff00ff, -1px -1px 0px #00ffff', letterSpacing: '0.02em', fontFamily: "'Orbitron', monospace" }}>
            PARTLY
          </span>
          <span style={{ color: 'rgba(0,0,0,0.5)', fontSize: '12px' }}>|</span>
          <span style={{ color: 'rgba(0,0,0,0.7)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
            {roomName.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
          <div style={{
            background: 'rgba(0,0,0,0.6)', 
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderLeft: '4px solid #00ff88',
            padding: '4px 10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            boxShadow: '3px 3px 0px rgba(0,255,136,0.2)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ position: 'relative', width: '6px', height: '6px' }}>
              <div style={{ position: 'absolute', inset: 0, background: '#00ff88', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700, lineHeight: 1 }}>
                {players.length + 1}
              </span>
              <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.1em', marginTop: '2px' }}>ONLINE</span>
            </div>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.6)', 
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderLeft: '4px solid #00aaff',
            padding: '4px 10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            boxShadow: '3px 3px 0px rgba(0,170,255,0.2)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ position: 'relative', width: '6px', height: '6px' }}>
              <div style={{ position: 'absolute', inset: 0, background: '#00aaff', borderRadius: '50%' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700, lineHeight: 1 }}>
                42<span style={{ fontSize: '9px', fontWeight: 500, marginLeft: '1px' }}>ms</span>
              </span>
              <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.1em', marginTop: '2px' }}>LATENCY</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: player status + list ── */}
      <div style={{
        position: 'absolute', top: '96px', right: '16px',
        zIndex: 30, fontFamily: "'Rajdhani', sans-serif",
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {/* Self */}
        <div style={{
          background: 'rgba(0,0,0,0.6)', 
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderLeft: `4px solid ${playerColor}`,
          padding: '6px 12px', 
          fontFamily: "'Orbitron', monospace", 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: `3px 3px 0px ${playerColor}40`,
          backdropFilter: 'blur(8px)',
          textTransform: 'uppercase',
          color: '#ffffff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '8px', height: '8px' }}>
              <div style={{ position: 'absolute', inset: 0, background: playerColor, borderRadius: '50%', boxShadow: `0 0 6px ${playerColor}` }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700, lineHeight: 1 }}>{playerName}</span>
              <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.1em', marginTop: '2px' }}>YOU</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '3px 6px', borderRadius: '3px' }}>
            <span style={{ fontSize: '12px' }}>{ANIM_EMOJI[animation] || '😐'}</span>
            <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{animation}</span>
          </div>
        </div>

        {/* Players toggle */}
                <button onClick={() => setShowPlayers(s => !s)} style={{
          background: 'rgba(0,0,0,0.6)', 
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderLeft: '4px solid #00ffff',
          padding: '6px 12px', 
          fontFamily: "'Orbitron', monospace", 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          boxShadow: '4px 4px 0px rgba(0,255,255,0.2)',
          backdropFilter: 'blur(8px)',
          textTransform: 'uppercase',
          cursor: 'pointer',
          color: '#ffffff',
          marginBottom: '4px'
        }}>
          <div style={{ position: 'relative', width: '8px', height: '8px' }}>
            <div style={{ position: 'absolute', inset: 0, background: '#00ffff', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <div style={{ position: 'absolute', inset: 1.5, background: '#00ffff', borderRadius: '50%' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {players.length} {showPlayers ? '▾' : '▸'}
            </span>
            <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.1em', marginTop: '1px' }}>Players</span>
          </div>
        </button>

        {showPlayers && (
          <div style={{
            background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '4px', padding: '6px 8px',
            maxHeight: '160px', overflowY: 'auto', scrollbarWidth: 'none',
            display: 'flex', flexDirection: 'column', gap: '3px',
          }}>
            {players.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ color: '#222', fontSize: '12px', flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: '10px', color: '#888' }}>{ANIM_EMOJI[p.animation] || '😐'}</span>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── BOTTOM RIGHT: controls hint ── */}
      <div style={{
        position: 'absolute', bottom: '12px', right: '12px', zIndex: 30,
        display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '260px',
        fontFamily: "'Rajdhani', sans-serif",
      }}>
        {[
          { key: 'WASD / ↑↓←→', label: 'Move' },
          { key: 'SPACE', label: 'Jump' },
          { key: 'C', label: 'Dance' },
          { key: 'V', label: 'Wave' },
          { key: 'B', label: 'Cheer' },
          { key: 'N', label: 'Sit' },
          { key: 'DRAG', label: 'Rotate Camera' },
        ].map(k => (
          <div key={k.key} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: '3px', padding: '3px 6px',
          }}>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: '8px', color: '#444', letterSpacing: '0.04em' }}>{k.key}</span>
            <span style={{ fontSize: '10px', color: '#777' }}>{k.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
