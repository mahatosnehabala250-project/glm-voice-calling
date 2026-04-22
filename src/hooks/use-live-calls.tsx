'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { toast } from 'sonner';
import { Phone, PhoneMissed, CheckCircle2, AlertTriangle, PhoneIncoming } from 'lucide-react';

const MAX_RETRY_ATTEMPTS = 3;

interface CallEventData {
  callerName: string;
  callerPhone: string;
  intent: string;
  sentiment: string;
  duration: number;
  timestamp: string;
}

interface CallEndedData {
  callerName: string;
  result: string;
  message: string;
  emoji: string;
  duration: number;
  timestamp: string;
}

function getResultIcon(result: string) {
  switch (result) {
    case 'booked':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'missed':
      return <PhoneMissed className="w-4 h-4 text-rose-500" />;
    case 'escalated':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'callback_requested':
      return <PhoneIncoming className="w-4 h-4 text-teal-500" />;
    case 'no_show':
      return <PhoneMissed className="w-4 h-4 text-slate-400" />;
    default:
      return <Phone className="w-4 h-4 text-slate-500" />;
  }
}

function getResultDescription(result: string, duration: number): string {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationStr = `${mins}m ${secs}s`;

  switch (result) {
    case 'booked':
      return `Appointment booked • Duration: ${durationStr}`;
    case 'missed':
      return 'Caller hung up before connecting';
    case 'escalated':
      return 'Transferred to human agent';
    case 'callback_requested':
      return 'Callback requested by patient';
    case 'no_show':
      return 'Patient did not answer';
    default:
      return `Call ended • ${durationStr}`;
  }
}

export function useLiveCalls() {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const maxRetriesHitRef = useRef(false);
  const { user, isAuthenticated } = useAuthStore();
  const { startLiveCall, endLiveCall, setWsConnected } = useAppStore();

  const connect = useCallback(() => {
    // Only connect for client (clinic) role
    if (!isAuthenticated || !user || user.role !== 'client') return;
    // Don't reconnect if already connected
    if (socketRef.current?.connected) return;

    const socket = io('/?XTransformPort=3004', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RETRY_ATTEMPTS,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('📞 Call simulator connected');
      // Reset retry counter on successful connection
      retryCountRef.current = 0;
      maxRetriesHitRef.current = false;
      setWsConnected(true);
    });

    socket.on('connected', () => {
      console.log('📞 Call simulator ready');
    });

    socket.on('call_event', (data: CallEventData) => {
      console.log('📞 Incoming call:', data.callerName, data.callerPhone);

      // Trigger live call indicator in header
      startLiveCall(data.callerName);

      // Show incoming call toast
      toast(`Incoming Call`, {
        description: `${data.callerName} (${data.callerPhone})\nIntent: ${data.intent}`,
        icon: <Phone className="w-4 h-4 text-emerald-500" />,
        duration: 5000,
      });
    });

    socket.on('call_ended', (data: CallEndedData) => {
      console.log('📊 Call ended:', data.callerName, data.result);

      // End live call indicator
      endLiveCall();

      // Show call result toast
      const description = getResultDescription(data.result, data.duration);
      toast(`Call from ${data.callerName} — ${data.result.replace(/_/g, ' ')}`, {
        description,
        icon: getResultIcon(data.result),
        duration: 6000,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('📞 Call simulator disconnected:', reason);
      setWsConnected(false);
      // Clean up any active call state
      endLiveCall();
    });

    socket.on('connect_error', (_error) => {
      retryCountRef.current += 1;

      // Only show subtle warning after exhausting all retries
      if (retryCountRef.current >= MAX_RETRY_ATTEMPTS && !maxRetriesHitRef.current) {
        maxRetriesHitRef.current = true;
        // Show a subtle, non-intrusive warning once
        toast('Call simulator offline', {
          description: 'Live call simulation is unavailable. The dashboard will continue to work normally.',
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          duration: 4000,
        });
      }

      setWsConnected(false);
    });
  }, [isAuthenticated, user, startLiveCall, endLiveCall, setWsConnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setWsConnected(false);
  }, [setWsConnected]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
}
