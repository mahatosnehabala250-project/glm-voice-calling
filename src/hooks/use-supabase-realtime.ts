'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseBrowser, isSupabaseAvailable } from '@/lib/supabase-browser';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// SUPABASE REAL-TIME SUBSCRIPTION HOOKS
// ============================================
// These hooks provide real-time updates when Supabase is configured
// Falls back to polling when Supabase is not available

interface RealtimeOptions {
  clinicId?: string;
  enabled?: boolean;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

/**
 * Subscribe to new appointments in real-time
 */
export function useRealtimeAppointments(options: RealtimeOptions = {}) {
  const { clinicId, enabled = true, event = 'INSERT' } = options;
  const [newAppointment, setNewAppointment] = useState<Record<string, unknown> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseAvailable() || !enabled) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channelName = clinicId 
      ? `appointments:clinic:${clinicId}` 
      : 'appointments:all';

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: event as '*' | 'INSERT' | 'UPDATE' | 'DELETE',
          schema: 'public',
          table: 'appointments',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          console.log('[Realtime] New appointment:', payload);
          setNewAppointment(payload.new as Record<string, unknown>);
          // Auto-clear after 5 seconds
          setTimeout(() => setNewAppointment(null), 5000);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [clinicId, enabled, event, filter]);

  return { newAppointment };
}

/**
 * Subscribe to call status changes in real-time
 */
export function useRealtimeCalls(options: RealtimeOptions = {}) {
  const { clinicId, enabled = true } = options;
  const [liveCalls, setLiveCalls] = useState<Record<string, unknown>[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseAvailable() || !enabled) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channelName = clinicId 
      ? `calls:clinic:${clinicId}` 
      : 'calls:all';

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          ...(clinicId ? { filter: `clinic_id=eq.${clinicId}` } : {}),
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLiveCalls((prev) => [...prev, payload.new as Record<string, unknown>]);
          } else if (payload.eventType === 'UPDATE') {
            setLiveCalls((prev) =>
              prev.map((c) => (c.id === (payload.new as Record<string, unknown>).id ? (payload.new as Record<string, unknown>) : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setLiveCalls((prev) =>
              prev.filter((c) => c.id !== (payload.old as Record<string, unknown>).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [clinicId, enabled]);

  const clearStale = useCallback(() => {
    setLiveCalls([]);
  }, []);

  return { liveCalls, clearStale };
}

/**
 * Subscribe to notifications in real-time
 */
export function useRealtimeNotifications(options: RealtimeOptions = {}) {
  const { clinicId, enabled = true } = options;
  const [notification, setNotification] = useState<Record<string, unknown> | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseAvailable() || !enabled || !clinicId) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    // Subscribe to new notifications
    channelRef.current = supabase
      .channel(`notifications:clinic:${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          console.log('[Realtime] New notification:', payload);
          setNotification(payload.new as Record<string, unknown>);
          setUnreadCount((prev) => prev + 1);
          setTimeout(() => setNotification(null), 5000);
        }
      )
      .subscribe();

    // Fetch initial unread count
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('is_read', false)
      .then(({ count }) => {
        if (count !== null) setUnreadCount(count);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [clinicId, enabled]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  return { notification, unreadCount, markAsRead };
}

/**
 * Generic presence hook - track who's online
 */
export function usePresence(room: string, userId: string, userInfo?: Record<string, unknown>) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, unknown>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseAvailable()) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    channelRef.current = supabase.channel(`presence:${room}`, {
      config: { presence: { key: userId } },
    });

    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current?.presenceState();
        if (state) {
          const users: Record<string, unknown> = {};
          Object.values(state).forEach((presences) => {
            (presences as Record<string, unknown>[]).forEach((p) => {
              users[p.userId as string] = p;
            });
          });
          setOnlineUsers(users);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channelRef.current?.track({
            userId,
            ...userInfo,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [room, userId, userInfo]);

  return { onlineUsers };
}
