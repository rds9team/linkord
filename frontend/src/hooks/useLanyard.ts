import { useState, useEffect, useRef } from 'react';
import { fetchLanyardPresence } from '../api/client';

export interface LanyardSpotify {
  track_id: string;
  timestamps: {
    start: number;
    end: number;
  };
  song: string;
  artist: string;
  album_art_url: string;
  album: string;
}

export interface LanyardActivity {
  id: string;
  name: string;
  type: number; // 0: Game, 1: Streaming, 2: Listening, 3: Watching, 4: Custom status, 5: Competing
  state?: string;
  details?: string;
  timestamps?: {
    start?: number;
    end?: number;
  };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  emoji?: {
    name: string;
    id?: string;
    animated?: boolean;
  };
  application_id?: string;
}

export interface LanyardData {
  discord_status: 'online' | 'idle' | 'dnd' | 'offline';
  discord_user?: {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
    global_name?: string;
  };
  listening_to_spotify: boolean;
  spotify: LanyardSpotify | null;
  activities: LanyardActivity[];
  active_on_discord_web?: boolean;
  active_on_discord_desktop?: boolean;
  active_on_discord_mobile?: boolean;
}

export function getActivityAssetUrl(applicationId?: string, assetId?: string): string | null {
  if (!assetId) return null;
  if (assetId.startsWith('mp:external/')) {
    const raw = assetId.replace('mp:external/', '');
    return `https://media.discordapp.net/external/${raw}`;
  }
  if (applicationId) {
    return `https://cdn.discordapp.com/app-assets/${applicationId}/${assetId}.png`;
  }
  return null;
}

export function useLanyard(discordId?: string | null) {
  const [data, setData] = useState<LanyardData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!discordId) {
      setData(null);
      setIsConnected(false);
      return;
    }

    let isMounted = true;

    // 1. Initial fallback via HTTP API
    fetchLanyardPresence(discordId)
      .then((res) => {
        if (isMounted && res && res.data) {
          setData(res.data);
        }
      })
      .catch(() => {});

    // 2. Connect to WebSocket
    function connect() {
      if (!isMounted) return;

      try {
        const ws = new WebSocket('wss://api.lanyard.rest/socket');
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg = JSON.parse(event.data);
            const { op, d, t } = msg;

            // Opcode 1: HELLO
            if (op === 1) {
              const interval = d.heartbeat_interval;
              if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
              }
              heartbeatIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ op: 3 }));
                }
              }, interval);

              // Opcode 2: INITIALIZE subscribe to user
              ws.send(
                JSON.stringify({
                  op: 2,
                  d: {
                    subscribe_to_id: discordId,
                  },
                })
              );
            }

            // Opcode 0: EVENT
            if (op === 0) {
              if (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE') {
                if (d) {
                  setData(d);
                }
              }
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onerror = () => {
          // let onclose handle reconnection
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          // Reconnect after 4s
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) connect();
          }, 4000);
        };
      } catch {
        // Fallback retry
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted) connect();
        }, 5000);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [discordId]);

  return { data, isConnected };
}
