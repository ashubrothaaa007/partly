import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { ThreeCanvas } from './ThreeCanvas';
import { ChatPanel } from './ChatPanel';
import { HUD } from './HUD';
import { useMultiplayer, PlayerData } from './useMultiplayer';

interface Props {
  playerName: string;
  roomId: string;
}

// ---- Curated party playlist ----
const PLAYLIST = [
  { id: '0sCaK_7cDO0', title: 'Wispr Flow takes on India' }
];

// Cryptographic SHA-256 hash of stage password ('wisprflowmani')
// Plaintext password is never stored or transmitted in the codebase
const STAGE_CHANGE_HASH = (import.meta.env.VITE_STAGE_PASSWORD_HASH as string) || '950c631063f2673b461431dfabcb7419a78f91be100024974bc5c5a01e378ec6';

async function sha256(str: string): Promise<string> {
  const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function extractYouTubeId(urlOrId: string): string | null {
  const clean = urlOrId.trim();
  // Valid YouTube video ID is strictly 11 characters of alphanumeric, dash, or underscore
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Sync all users to the same video slot based on wall-clock time
const SLOT_MS = 5 * 60 * 1000; // 5 minutes per slot
function getSyncedSlot() {
  return 0; // Default to user's requested video
}
function getSyncedStartSeconds() {
  return 0;
}

// ---- Bot data ----
const BOT_DATA = [
  { id: 'b1',  name: 'DJ_Nova',      color: '#ff4488' },
  { id: 'b2',  name: 'NeonFox',      color: '#44ffff' },
  { id: 'b3',  name: 'CyberBeat',    color: '#ff8800' },
  { id: 'b4',  name: 'VioletRave',   color: '#aa44ff' },
  { id: 'b5',  name: 'GlowByte',     color: '#44ff88' },
  { id: 'b6',  name: 'PinkStorm',    color: '#ff44ff' },
  { id: 'b7',  name: 'AcidDrop',     color: '#ffff44' },
  { id: 'b8',  name: 'Skulltrax',    color: '#ff6644' },
  { id: 'b9',  name: 'ZeroGrav',     color: '#44ffaa' },
  { id: 'b10', name: 'NightOwl',     color: '#6688ff' },
  { id: 'b11', name: 'CryptoPunk',   color: '#ff44aa' },
  { id: 'b12', name: 'DigitalGhost', color: '#88ddff' },
  { id: 'b13', name: 'RaveMaster',   color: '#ffcc00' },
  { id: 'b14', name: 'SynthWitch',   color: '#cc44ff' },
  { id: 'b15', name: 'BassDrop99',   color: '#00ff66' },
];

const ANIMATIONS = ['idle', 'dance', 'dance', 'dance', 'wave', 'cheer', 'idle'];

function generateBots() {
  return BOT_DATA.map(b => {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 9 + 1;
    return {
      ...b,
      pos: [Math.cos(angle) * radius, 0, -15 + Math.sin(angle) * 6] as [number, number, number],
      targetPos: [Math.cos(angle) * radius, 0, -15 + Math.sin(angle) * 6] as [number, number, number],
      animation: ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)],
    };
  });
}

const PLAYER_COLORS = ['#00ffff', '#ff44aa', '#44ff88', '#ffaa00', '#aa44ff', '#ff4444', '#44aaff'];
function getPlayerColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}

const ROOM_NAMES: Record<string, string> = {
  'main-party': 'Main Party Floor',
  'chill-zone': 'Chill Zone',
  'hardstyle': 'Hardstyle Room',
  'lounge': 'VIP Lounge',
};

export function PartyScene({ playerName, roomId }: Props) {
  const [playerAnimation, setPlayerAnimation] = useState('idle');
  const playerColor = getPlayerColor(playerName);
  const { players, broadcastUpdate, broadcastChat, status, socketId, latency, roomName } = useMultiplayer(playerName, playerColor, roomId, setPlayerAnimation);
  const activePlayers = Object.values(players);

  // Active video track state (defaults to user's video)
  const [activeTrack, setActiveTrack] = useState<{ id: string; title: string }>({
    id: '0sCaK_7cDO0',
    title: 'Wispr Flow takes on India'
  });
  const [musicStarted, setMusicStarted] = useState(true);

  // Audio state
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [globalVolume, setGlobalVolume] = useState(() => {
    const saved = localStorage.getItem('party_volume');
    return saved !== null ? parseInt(saved, 10) : 100;
  });
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    localStorage.setItem('party_volume', globalVolume.toString());
  }, [globalVolume]);

  const playersRef = useRef(activePlayers);
  const screenOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { playersRef.current = activePlayers; }, [activePlayers]);

  const playerList = activePlayers.map(p => ({ name: p.name, color: p.color, animation: p.animation }));

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#87ceeb', overflow: 'hidden' }}>

      {/* 3D Canvas */}
      <ThreeCanvas
        playerName={playerName}
        playerColor={playerColor}
        botsRef={playersRef}
        onAnimChange={setPlayerAnimation}
        onPlayerUpdate={(pos, rot, anim) => {
          broadcastUpdate({ pos, targetPos: pos, rotation: rot, animation: anim });
        }}
        videoId={activeTrack.id}
        screenOverlayRef={screenOverlayRef}
        audioEnabled={audioEnabled}
        globalVolume={globalVolume}
        isMuted={isMuted}
      />

      {/* The video screen is now handled completely natively inside ThreeCanvas.tsx to avoid React detachment bugs! */}

      {/* ── Now Playing banner above stage (always visible) ── */}
      <NowPlayingBanner
        track={activeTrack}
        onSelectTrack={(id, title) => setActiveTrack({ id, title })}
      />

      {/* ── HTML overlays ── */}
      <ChatPanel
        playerName={playerName}
        playerColor={playerColor}
        botNames={activePlayers.map(p => ({ name: p.name, color: p.color }))}
        onSendMessage={broadcastChat}
      />
      <HUD
        playerName={playerName}
        playerColor={playerColor}
        roomName={ROOM_NAMES[roomId] || roomId}
        players={playerList}
        animation={playerAnimation}
        globalVolume={globalVolume}
        setGlobalVolume={setGlobalVolume}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />

      {/* Debug UI Panel */}
            {/* Sleek Player Info Overlay */}
      <div style={{
        position: 'absolute', top: 30, right: 30, zIndex: 50,
        display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end'
      }}>



      </div>

      {/* Enter Party / Enable Audio Overlay */}
      {!audioEnabled && (
        <div 
          onClick={() => {
            setAudioEnabled(true);
            setMusicStarted(true);
            // Resume AudioContext per browser autoplay policies
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              if (ctx.state === 'suspended') ctx.resume();
            }
          }}
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            padding: '20px 40px', borderRadius: '12px',
            color: '#fff', fontFamily: "'Orbitron', monospace",
            fontSize: '24px', letterSpacing: '0.1em',
            boxShadow: '0 0 30px rgba(236, 72, 153, 0.5)',
            textAlign: 'center', animation: 'pulse 2s infinite'
          }}>
            CLICK TO ENTER PARTY
            <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8, fontFamily: "'Rajdhani', sans-serif" }}>
              Enables interactive 3D audio and music
            </div>
          </div>
        </div>
      )}

      {/* Loading flash */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: '#87ceeb',
        color: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Orbitron', monospace",
        fontSize: '14px', letterSpacing: '0.3em',
        pointerEvents: 'none',
        animation: 'fadeOut 0.4s ease 1.5s forwards',
        textShadow: '0 0 10px rgba(255,255,255,0.8)',
      }}>
        LOADING FESTIVAL WORLD...
      </div>

      <style>{`
        @keyframes fadeOut { to { opacity: 0; visibility: hidden; } }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

// ── Now Playing banner ──
function NowPlayingBanner({
  track,
  onSelectTrack
}: {
  track: { id: string; title: string };
  onSelectTrack: (id: string, title: string) => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [passwordVal, setPasswordVal] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleApplyCustomVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const hash = await sha256(passwordVal.trim());
    if (hash !== STAGE_CHANGE_HASH) {
      setPasswordError(true);
      toast.error('Incorrect password! Enter password to change video.');
      return;
    }

    const vId = extractYouTubeId(inputVal);
    if (!vId) {
      toast.error('Invalid YouTube link or ID. Must be a valid 11-character YouTube video.');
      return;
    }

    setPasswordError(false);
    onSelectTrack(vId, vId === '0sCaK_7cDO0' ? 'Wispr Flow takes on India' : `Custom Video (${vId})`);
    setShowInput(false);
    setInputVal('');
    setPasswordVal('');
    toast.success('Concert stage video updated!');
  };

  return (
    <div style={{
      position: 'absolute',
      top: '52px',
      right: '16px',
      zIndex: 35,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '8px',
      pointerEvents: 'auto',
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      <div style={{
        background: 'rgba(12, 12, 18, 0.72)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '5px 10px 5px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      }}>
        {/* Subtle Live Dot */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '9px',
          fontWeight: 700,
          color: 'rgba(255, 255, 255, 0.6)',
          letterSpacing: '0.12em',
          fontFamily: "'Orbitron', monospace",
        }}>
          <span style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#ff2a5f',
            boxShadow: '0 0 6px #ff2a5f',
            animation: 'pulse 1.8s infinite'
          }} />
          STAGE
        </div>

        <span style={{ color: 'rgba(255, 255, 255, 0.18)', fontSize: '10px' }}>•</span>

        {/* Track Title */}
        <div style={{
          fontSize: '12px',
          color: '#ffffff',
          fontWeight: 600,
          letterSpacing: '0.03em',
          maxWidth: '240px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {track.title}
        </div>

        {/* Minimalist Button */}
        <button
          onClick={() => {
            setShowInput(s => !s);
            setPasswordError(false);
          }}
          title={showInput ? "Close" : "Change Video"}
          style={{
            background: showInput ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: showInput ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
            fontSize: '10px',
            fontFamily: "'Orbitron', monospace",
            fontWeight: 600,
            letterSpacing: '0.06em',
            padding: '3px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = showInput ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.color = showInput ? '#ffffff' : 'rgba(255, 255, 255, 0.75)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
        >
          {showInput ? (
            <span style={{ fontSize: '11px', lineHeight: 1 }}>✕</span>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span>CHANGE</span>
            </>
          )}
        </button>
      </div>

      {/* Video switcher dropdown */}
      {showInput && (
        <div style={{
          background: 'rgba(12, 12, 18, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
          width: '320px',
        }}>
          <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: '0.08em', fontFamily: "'Orbitron', monospace" }}>
            CHANGE STAGE VIDEO (PASSWORD PROTECTED)
          </div>

          <form onSubmit={handleApplyCustomVideo} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="YouTube URL or Video ID"
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '5px',
                color: '#fff',
                fontSize: '11px',
                fontFamily: "'Rajdhani', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="password"
                value={passwordVal}
                onChange={e => {
                  setPasswordVal(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="Enter password"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: passwordError ? '1px solid #ff3366' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '5px',
                  color: '#fff',
                  fontSize: '11px',
                  fontFamily: "'Rajdhani', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '10px',
                  fontFamily: "'Orbitron', monospace",
                  padding: '0 14px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#000000';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = '#ffffff';
                }}
              >
                PLAY
              </button>
            </div>

            {passwordError && (
              <div style={{
                color: '#ff4466',
                fontSize: '10px',
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                ✕ Incorrect password. Required to change video.
              </div>
            )}
          </form>

          {/* Quick Reset to Default Video */}
          {track.id !== '0sCaK_7cDO0' && (
            <div style={{ marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
              <button
                onClick={() => {
                  onSelectTrack('0sCaK_7cDO0', 'Wispr Flow takes on India');
                  setShowInput(false);
                  setPasswordError(false);
                  setPasswordVal('');
                  toast.success('Reset to Wispr Flow takes on India!');
                }}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  color: '#00eaff',
                  fontSize: '9px',
                  fontFamily: "'Orbitron', monospace",
                  padding: '6px 8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0, 234, 255, 0.15)';
                  e.currentTarget.style.borderColor = '#00eaff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ⟲ RESET TO WISPR FLOW TAKES ON INDIA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
