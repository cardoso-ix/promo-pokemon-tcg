import React from 'react';
import { QrCode, CheckCircle, RefreshCw } from 'lucide-react';
import type { WhatsAppState } from '../types/index.ts';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  waState: WhatsAppState | undefined;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, title, waState }) => {
  if (!isOpen) return null;

  const isConnected = waState?.status === 'connected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="glass-panel rounded-2xl p-6 border border-white/10 max-w-sm w-full space-y-4 shadow-2xl text-center">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h4 className="font-heading font-bold text-white text-sm flex items-center gap-2">
            <QrCode className="w-4 h-4 text-cyan-400" />
            {title}
          </h4>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar Aparelho e aponte a câmera:
        </p>

        <div className="p-3 bg-white rounded-2xl w-56 h-56 mx-auto flex items-center justify-center shadow-xl border-4 border-cyan-500/20">
          {waState?.qrDataUrl ? (
            <img src={waState.qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
          ) : isConnected ? (
            <div className="flex flex-col items-center gap-2 text-emerald-600">
              <CheckCircle className="w-12 h-12" />
              <span className="text-xs font-bold font-sans">Aparelho Pareado!</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
              <span>Gerando QR Code...</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
