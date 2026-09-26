import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';
import { api } from '../services/api.ts';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CookieModal: React.FC<CookieModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [cookieValue, setCookieValue] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cookieValue.trim()) return alert('Cole o cookie da sessão!');
    setLoading(true);
    try {
      const res = await api.renewCookie(cookieValue.trim());
      alert(res.message || 'Cookie atualizado com sucesso!');
      setCookieValue('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao validar cookie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-panel rounded-2xl p-6 border border-white/10 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h4 className="font-heading font-bold text-white text-sm flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            Renovar Cookie Mercado Livre Sentinel
          </h4>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Para que o sistema continue encurtando os links oficiais de afiliados com o domínio <strong>meli.la</strong>, cole abaixo o cookie da sua sessão ativa no Mercado Livre.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <textarea
            rows={5}
            placeholder="Cole os cookies aqui (ex: _d2id=...; org_user_id=...)"
            value={cookieValue}
            onChange={e => setCookieValue(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500/50"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{loading ? 'Validando...' : 'Salvar & Validar Cookie'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
