import { useState, useEffect, useCallback } from 'react';
import type { UnifiedStatus } from '../types/index.ts';
import { api } from '../services/api.ts';

export function useUnifiedStatus() {
  const [status, setStatus] = useState<UnifiedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getUnifiedStatus();
      setStatus(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na conexão';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const isReplicaConnected = status?.replica?.whatsapp?.status === 'connected';
  const isReplicaQrReady = status?.replica?.whatsapp?.status === 'qr';
  const isBotConnected = status?.bot?.whatsapp?.status === 'connected';
  const isBotQrReady = status?.bot?.whatsapp?.status === 'qr';
  const isMeliValid = status?.replica?.cookieStatus?.status === 'valid';

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    isReplicaConnected,
    isReplicaQrReady,
    isBotConnected,
    isBotQrReady,
    isMeliValid
  };
}
