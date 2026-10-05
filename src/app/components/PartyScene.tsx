import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { ThreeCanvas } from './ThreeCanvas';
import { ChatPanel } from './ChatPanel';
import { HUD } from './HUD';
import { useMultiplayer, PlayerData } from '../hooks/useMultiplayer';
import { supabase } from '../../utils/supabaseClient';

interface Props {
  playerName: string;
  roomId: string;
}

// ---- Curated party playlist ----
const PLAYLIST = [
  { id: '0sCaK_7cDO0', title: 'Wispr Flow takes on India' }
];


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

  // Active video track state (synced across all players in room)
  const [activeTrack, setActiveTrack] = useState<{ id: string; title: string }>({
    id: '0sCaK_7cDO0',
    title: 'Wispr Flow takes on India'
  });

  // Handle track changes broadcast by other players in real-time
  const handleRemoteTrackChange = useCallback((track: { id: string; title: string }) => {
    setActiveTrack(prev => {
      if (prev.id === track.id) return prev;
      toast(`🎵 Stage track changed: ${track.title}`, {
        duration: 4000
      });
      return track;
    });
  }, []);

  const { players, broadcastUpdate, broadcastChat, broadcastTrack, status, socketId, latency, roomName } = useMultiplayer(
    playerName,
    playerColor,
    roomId,
    setPlayerAnimation,
    handleRemoteTrackChange
  );
  const activePlayers = Object.values(players);

  // Sync current active track from Supabase so all devices (mobile, desktop, newly joined) stay in sync
  useEffect(() => {
    let isMounted = true;

    const fetchCurrentTrack = async () => {
      try {
        const { data, error } = await supabase
          .from('kv_store_488bc5db')
          .select('value')
          .eq('key', `room:${roomId}:track`)
          .maybeSingle();

        if (!error && data?.value && data.value.id && isMounted) {
          setActiveTrack(prev => {
            if (prev.id !== data.value.id) {
              toast(`🎵 Now Playing on Stage: ${data.value.title}`, {
                icon: '🎶',
                duration: 4500
              });
              return data.value;
            }
            return prev;
          });
        }
      } catch (_) {}
    };

    fetchCurrentTrack();
    const interval = setInterval(fetchCurrentTrack, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [roomId]);

  const handleSelectTrack = useCallback((id: string, title: string) => {
    const newTrack = { id, title };
    setActiveTrack(newTrack);
    broadcastTrack(newTrack);
    // Persist to Supabase kv_store so all devices polling or joining later receive it
    supabase
      .from('kv_store_488bc5db')
      .upsert({ key: `room:${roomId}:track`, value: newTrack })
      .then(() => {
        toast.success(`Broadcasting "${title}" to all devices!`);
      })
      .catch(() => {});
  }, [broadcastTrack, roomId]);

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

  const handleAnimChange = useCallback((anim: string) => {
    setPlayerAnimation(anim);
  }, []);

  const handlePlayerUpdate = useCallback((pos: [number, number, number], rot: number, anim: string) => {
    broadcastUpdate({ pos, targetPos: pos, rotation: rot, animation: anim });
  }, [broadcastUpdate]);

  const playerList = useMemo(() => activePlayers.map(p => ({ name: p.name, color: p.color, animation: p.animation })), [activePlayers]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#87ceeb', overflow: 'hidden' }}>

      {/* 3D Canvas */}
      <ThreeCanvas
        playerName={playerName}
        playerColor={playerColor}
        botsRef={playersRef}
        onAnimChange={handleAnimChange}
        onPlayerUpdate={handlePlayerUpdate}
        videoId={activeTrack.id}
        videoTitle={activeTrack.title}
        screenOverlayRef={screenOverlayRef}
        audioEnabled={audioEnabled}
        globalVolume={globalVolume}
        isMuted={isMuted}
      />

      {/* The video screen is now handled completely natively inside ThreeCanvas.tsx to avoid React detachment bugs! */}

      {/* ── Now Playing banner above stage (always visible) ── */}
      <NowPlayingBanner
        track={activeTrack}
        onSelectTrack={handleSelectTrack}
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

// ── Curated party playlist for instant 1-click stage changes ──
const PRESET_TRACKS = [
  { id: '0sCaK_7cDO0', title: 'Wispr Flow takes on India', emoji: '🌴' },
  { id: '60ItHLz5WEA', title: 'Alan Walker - Faded (Live)', emoji: '⚡' },
  { id: 'UtF6Jej8yb4', title: 'Avicii - The Nights', emoji: '✨' },
  { id: '5qap5aO4i9A', title: 'Beach Chill Lofi Beats', emoji: '🏖️' },
];

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
  const [titleVal, setTitleVal] = useState('');

  const handleApplyCustomVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const vId = extractYouTubeId(inputVal);
    if (!vId) {
      toast.error('Please enter a valid YouTube URL or 11-character video ID.');
      return;
    }

    const cleanTitle = titleVal.trim() || (vId === '0sCaK_7cDO0' ? 'Wispr Flow takes on India' : `Custom Track (${vId})`);
    onSelectTrack(vId, cleanTitle);
    setShowInput(false);
    setInputVal('');
    setTitleVal('');
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
        background: 'rgba(12, 12, 18, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 234, 255, 0.3)',
        borderRadius: '20px',
        padding: '5px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 20px rgba(0, 234, 255, 0.25)',
      }}>
        {/* Glowing Live Dot */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '9px',
          fontWeight: 700,
          color: '#00eaff',
          letterSpacing: '0.12em',
          fontFamily: "'Orbitron', monospace",
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#ff2a5f',
            boxShadow: '0 0 8px #ff2a5f',
            animation: 'pulse 1.8s infinite'
          }} />
          LIVE STAGE
        </div>

        <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '10px' }}>•</span>

        {/* Track Title */}
        <div style={{
          fontSize: '12px',
          color: '#ffffff',
          fontWeight: 600,
          letterSpacing: '0.03em',
          maxWidth: '220px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textShadow: '0 0 8px rgba(0, 234, 255, 0.5)',
        }}>
          {track.title}
        </div>

        {/* Minimalist Button */}
        <button
          onClick={() => setShowInput(s => !s)}
          title={showInput ? "Close" : "Change Video for Everyone"}
          style={{
            background: showInput ? 'rgba(255, 42, 95, 0.25)' : 'rgba(0, 234, 255, 0.15)',
            border: showInput ? '1px solid #ff2a5f' : '1px solid rgba(0, 234, 255, 0.4)',
            color: showInput ? '#ff6b8b' : '#00eaff',
            fontSize: '10px',
            fontFamily: "'Orbitron', monospace",
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '3px 9px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = showInput ? 'rgba(255, 42, 95, 0.4)' : 'rgba(0, 234, 255, 0.3)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = showInput ? 'rgba(255, 42, 95, 0.25)' : 'rgba(0, 234, 255, 0.15)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {showInput ? (
            <span style={{ fontSize: '11px', lineHeight: 1 }}>✕ CLOSE</span>
          ) : (
            <>
              <span>♫ CHANGE SONG</span>
            </>
          )}
        </button>
      </div>

      {/* Video switcher dropdown */}
      {showInput && (
        <div style={{
          background: 'rgba(10, 12, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 234, 255, 0.3)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 234, 255, 0.15)',
          width: '330px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#00eaff', letterSpacing: '0.1em', fontFamily: "'Orbitron', monospace", fontWeight: 700 }}>
              CHANGE STAGE SONG (ALL DEVICES)
            </span>
            <span style={{ fontSize: '9px', color: '#00ff88', fontFamily: "'Orbitron', monospace" }}>
              ● REALTIME SYNC
            </span>
          </div>

          {/* 1-Click Preset Track Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Instant Quick Select:
            </div>
            {PRESET_TRACKS.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  onSelectTrack(preset.id, preset.title);
                  setShowInput(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: track.id === preset.id ? 'rgba(0, 234, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: track.id === preset.id ? '1px solid #00eaff' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: track.id === preset.id ? '#00eaff' : '#ffffff',
                  fontSize: '11px',
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0, 234, 255, 0.25)';
                  e.currentTarget.style.borderColor = '#00eaff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = track.id === preset.id ? 'rgba(0, 234, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = track.id === preset.id ? '#00eaff' : 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <span>{preset.emoji}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preset.title}
                </span>
                {track.id === preset.id && (
                  <span style={{ fontSize: '9px', color: '#00ff88', fontFamily: "'Orbitron', monospace" }}>PLAYING</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '2px 0' }} />

          {/* Custom YouTube URL Form */}
          <form onSubmit={handleApplyCustomVideo} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Or Enter Any YouTube Video Link:
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Paste YouTube Link or Video ID"
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                fontFamily: "'Rajdhani', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <input
              type="text"
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              placeholder="Track Title (optional)"
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
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
                background: 'linear-gradient(135deg, #00d4ff, #0077ff)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: '11px',
                fontFamily: "'Orbitron', monospace",
                letterSpacing: '0.08em',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 15px rgba(0, 212, 255, 0.4)',
                textAlign: 'center',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 212, 255, 0.6)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 212, 255, 0.4)';
              }}
            >
              ▶ PLAY ON STAGE FOR ALL PLAYERS
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
