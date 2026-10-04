import { useState, useEffect, useRef } from 'react';

interface Message {
  id: number;
  name: string;
  text: string;
  color: string;
  time: number;
}

interface Props {
  playerName: string;
  playerColor: string;
  botNames: { name: string; color: string }[];
  onSendMessage?: (msg: string) => void;
}

const BOT_MESSAGES = [
  'THIS BEAT IS INSANE!! 🔥',
  'lets gooooo!! 🎉',
  'who else is dancing rn?',
  'this is the best party ever!',
  'CYBERRAVE 2099 🤖',
  'my avatar looks so cool lol',
  'can we get a drop pls!!',
  'neon vibes only tonight ✨',
  'omg the lights!! 🌈',
  'wave your hands in the air!!!',
  'GG everyone ggg',
  'this track goes HARD',
  'i love this virtual party!!',
  'the stage looks amazing 🎆',
  'whos the DJ tonight?',
  "i can't stop dancing lol",
  'RAVE MODE ACTIVATED 🎛️',
  'hello from the chill zone',
  'bass drop incoming!!!',
  'best. party. ever. 🥳',
];

let msgId = 0;

export function ChatPanel({ playerName, playerColor, botNames, onSendMessage }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: msgId++, name: 'SYSTEM', text: `Welcome to partly, ${playerName}! 🎉`, color: '#ffaa00', time: Date.now() },
    { id: msgId++, name: 'SYSTEM', text: 'W A S D to move • C dance • V wave • B cheer • N sit', color: '#ffaa00', time: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Disable random bot messages, since we have actual real players
  /*
  useEffect(() => {
    const interval = setInterval(() => {
      if (botNames.length === 0) return;
      const bot = botNames[Math.floor(Math.random() * botNames.length)];
      const msg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
      setMessages(prev => [...prev.slice(-49), {
        id: msgId++,
        name: bot.name,
        text: msg,
        color: bot.color,
        time: Date.now(),
      }]);
    }, Math.random() * 5000 + 4000);
    return () => clearInterval(interval);
  }, [botNames]);
  */

  const sendMessage = () => {
    if (!input.trim()) return;
    const trimmed = input.trim();
    setMessages(prev => [...prev.slice(-49), {
      id: msgId++,
      name: playerName,
      text: trimmed,
      color: playerColor,
      time: Date.now(),
    }]);
    if (onSendMessage) onSendMessage(trimmed);
    setInput('');
  };

  useEffect(() => {
    const handleChat = (e: CustomEvent) => {
      const { id, name, color, message, timestamp } = e.detail;
      // Skip our own messages as they are added immediately
      if (name === playerName) return; 
      
      setMessages(prev => [...prev.slice(-49), {
        id: msgId++,
        name,
        text: message,
        color,
        time: timestamp || Date.now(),
      }]);
    };
    
    window.addEventListener('party-chat' as any, handleChat as EventListener);
    return () => window.removeEventListener('party-chat' as any, handleChat as EventListener);
  }, [playerName]);

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: 16,
      width: '280px',
      zIndex: 100,
      fontFamily: "'Rajdhani', sans-serif",
    }}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          display: 'block',
          marginBottom: '8px',
          background: '#ff00ff',
          border: 'none',
          color: '#ffffff',
          fontSize: '12px',
          fontFamily: "'Orbitron', monospace",
          fontWeight: 800,
          padding: '8px 12px',
          cursor: 'pointer',
          letterSpacing: '0.1em',
          transform: 'skewX(-10deg)',
          boxShadow: '4px 4px 0px rgba(0,255,255,0.8)',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ display: 'inline-block', transform: 'skewX(10deg)' }}>
          💬 CHAT {isOpen ? '▾' : '▸'}
        </span>
      </button>

      {isOpen && (
        <div style={{
          background: 'rgba(4,4,15,0.85)',
          border: '1px solid rgba(0,255,255,0.15)',
          borderRadius: '4px',
          backdropFilter: 'blur(8px)',
          overflow: 'hidden',
        }}>
          {/* Messages */}
          <div style={{
            height: '200px',
            overflowY: 'auto',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            scrollbarWidth: 'none',
          }}>
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{
                  color: m.color,
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  textShadow: `0 0 8px ${m.color}`,
                  letterSpacing: '0.03em',
                }}>
                  {m.name}:
                </span>
                <span style={{ color: '#c0c0e0', fontSize: '12px', lineHeight: 1.4 }}>
                  {m.text}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', borderTop: '2px solid rgba(0,255,255,0.3)', background: 'rgba(0,0,0,0.6)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Say something..."
              maxLength={80}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                padding: '12px 10px',
                color: '#ffffff',
                fontSize: '14px',
                fontFamily: "'Orbitron', monospace",
                outline: 'none',
                textTransform: 'uppercase',
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                background: '#ff00ff',
                border: 'none',
                padding: '0 16px',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 900,
                cursor: 'pointer',
                fontFamily: "'Orbitron', monospace",
                boxShadow: '-4px 0px 0px rgba(0,255,255,0.8)',
              }}
            >
              ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
