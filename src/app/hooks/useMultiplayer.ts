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
    animation: 'idle'
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
        const currentPlayers: Record<string, PlayerData> = {};
        
        for (const id in state) {
          if (id === playerIdRef.current) continue;
          const userPresences = state[id] as any[];
          if (userPresences && userPresences.length > 0) {
            const p = userPresences[0];
            currentPlayers[id] = {
              id,
              name: p.name || 'Anonymous',
              color: p.color || '#ff00ff',
              pos: p.pos || [0, 0, 5],
              targetPos: p.pos || [0, 0, 5],
              animation: p.animation || 'idle',
              rotation: p.rotation || 0
            };
          }
        }
        playersRef.current = currentPlayers;
        setPlayers({ ...currentPlayers });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === playerIdRef.current) return;
        const p = (newPresences as any[])[0];
        if (p) {
          toast(`${p.name || 'Someone'} joined the beach party! 🎉`);
          setPlayers((prev) => {
            const updated = {
              ...prev,
              [key]: {
                id: key,
                name: p.name || 'Anonymous',
                color: p.color || '#ff00ff',
                pos: p.pos || [0, 0, 5],
                targetPos: p.pos || [0, 0, 5],
                animation: p.animation || 'idle',
                rotation: p.rotation || 0
              }
            };
            playersRef.current = updated;
            return updated;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === playerIdRef.current) return;
        setPlayers((prev) => {
          const updated = { ...prev };
          const leavingPlayer = updated[key];
          if (leavingPlayer) {
            toast(`${leavingPlayer.name} left the party.`);
          }
          delete updated[key];
          playersRef.current = updated;
          return updated;
        });
      })
      .on('broadcast', { event: 'player-update' }, ({ payload }) => {
        if (!payload || payload.id === playerIdRef.current) return;
        setPlayers((prev) => {
          const existing = prev[payload.id];
          if (!existing) return prev;
          const updated = {
            ...prev,
            [payload.id]: {
              ...existing,
              targetPos: payload.pos || existing.targetPos,
              animation: payload.animation || existing.animation,
              rotation: payload.rotation !== undefined ? payload.rotation : existing.rotation
            }
          };
          playersRef.current = updated;
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          setStatus('Connected');
          setSocketId(playerIdRef.current);
          
          await channel.track({
            name: playerName,
            color: playerColor,
            pos: localState.current.pos,
            animation: localState.current.animation
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
          setStatus('Disconnected');
        }
      });

    return () => {
      isSubscribedRef.current = false;
      channel.unsubscribe();
    };
  }, [roomId, playerName, playerColor]);

  const updatePosition = (pos: [number, number, number], rotation: number, animation: string) => {
    localState.current.pos = pos;
    localState.current.animation = animation;
    localState.current.rotation = rotation;

    if (isSubscribedRef.current && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player-update',
        payload: {
          id: playerIdRef.current,
          pos,
          rotation,
          animation
        }
      });
    }
  };

  const setAnimation = (anim: string) => {
    localState.current.animation = anim;
    if (onAnimChange) onAnimChange(anim);
    if (isSubscribedRef.current && channelRef.current) {
      channelRef.current.track({
        name: playerName,
        color: playerColor,
        pos: localState.current.pos,
        animation: anim
      });
    }
  };

  return {
    players,
    status,
    socketId,
    latency,
    updatePosition,
    setAnimation
  };
}
