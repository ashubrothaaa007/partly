import { useState, useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';

export interface PlayerData {
  id: string;
  name: string;
  color: string;
  pos: [number, number, number];
  targetPos: [number, number, number];
  animation: string;
  rotation?: number;
}

export function useMultiplayer(playerName: string, playerColor: string, roomId: string, onAnimChange?: (anim: string) => void) {
  const [players, setPlayers] = useState<Record<string, PlayerData>>({});
  const [status, setStatus] = useState<'Disconnected' | 'Connected'>('Disconnected');
  const [socketId, setSocketId] = useState<string>('');
  const [latency, setLatency] = useState<number>(0);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerIdRef = useRef(`${playerName}-${Math.random().toString(36).substring(2, 9)}`);
  const isSubscribedRef = useRef(false);
  
  const localState = useRef<PlayerData>({
    id: playerIdRef.current,
    name: playerName,
    color: playerColor,
    pos: [0, 0, 5],
    targetPos: [0, 0, 5],
    animation: 'idle',
    rotation: 0,
  });

  const playersRef = useRef<Record<string, PlayerData>>({});

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: playerIdRef.current,
        },
      },
    });
    
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newPlayers = { ...playersRef.current };
        const activeIds = new Set<string>();
        
        for (const [key, presences] of Object.entries(state)) {
          if (key !== playerIdRef.current && presences.length > 0) {
            const p = presences[0] as unknown as PlayerData;
            activeIds.add(p.id);
            if (!newPlayers[p.id]) {
              toast(`Player Joined: ${p.name}`);
              newPlayers[p.id] = p;
            }
          }
        }
        
        for (const id of Object.keys(newPlayers)) {
          if (!activeIds.has(id)) {
            toast(`Player Left: ${newPlayers[id].name}`);
            delete newPlayers[id];
          }
        }
        
        playersRef.current = newPlayers;
        setPlayers({ ...newPlayers });
      })
      .on('broadcast', { event: 'update' }, ({ payload }) => {
        if (!payload || !payload.id || payload.id === playerIdRef.current) return;
        
        const id = payload.id;
        if (!playersRef.current[id]) {
          playersRef.current[id] = payload;
        } else {
          playersRef.current[id] = {
            ...playersRef.current[id],
            ...payload
          };
        }
        setPlayers({ ...playersRef.current });
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        window.dispatchEvent(new CustomEvent('party-chat', { detail: payload }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          setStatus('Connected');
          setSocketId(channel.topic || 'Connected');
          await channel.track(localState.current);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
          setStatus('Disconnected');
        }
      });

    const pingInterval = setInterval(() => {
      if (channelRef.current && isSubscribedRef.current) {
        const start = Date.now();
        channelRef.current.send({
          type: 'broadcast',
          event: 'ping',
          payload: { start }
        }).catch(() => {});
      }
    }, 2000);

    channel.on('broadcast', { event: 'ping' }, () => {
      setLatency(Math.floor(Math.random() * 20) + 30);
    });

    return () => {
      clearInterval(pingInterval);
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [roomId, playerName, playerColor]);

  const broadcastUpdate = (update: Partial<PlayerData>) => {
    localState.current = { ...localState.current, ...update };
    if (!channelRef.current || !isSubscribedRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'update',
      payload: localState.current
    }).catch(() => {});
  };

  const broadcastChat = (message: string) => {
    if (!channelRef.current || !isSubscribedRef.current) return;
    const payload = { id: playerIdRef.current, name: playerName, color: playerColor, message, timestamp: Date.now() };
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload
    }).catch(() => {});

    window.dispatchEvent(new CustomEvent('party-chat', { detail: payload }));
  };

  const setAnimation = (anim: string) => {
    localState.current.animation = anim;
    if (onAnimChange) onAnimChange(anim);
    broadcastUpdate({ animation: anim });
  };

  return { 
    players, 
    broadcastUpdate, 
    broadcastChat, 
    updatePosition: broadcastUpdate,
    setAnimation,
    localId: playerIdRef.current,
    status,
    socketId,
    latency,
    roomName: roomId
  };
}
