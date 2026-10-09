import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Sparkles, BookOpen } from 'lucide-react';
import { GLOSSARY_TERMS } from '../constants/glossary';

interface MetricHelpProps {
  term: keyof typeof GLOSSARY_TERMS | string;
  children?: React.ReactNode;
  iconOnly?: boolean;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const MetricHelp: React.FC<MetricHelpProps> = ({
  term,
  children,
  iconOnly = false,
  className = '',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    arrowLeft: number;
  } | null>(null);

  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const info = GLOSSARY_TERMS[term] || {
    sigla: term,
    nome: term,
    categoria: 'Meta Ads',
    descricao: 'Métrica de inteligência e performance operacional.'
  };

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(320, window.innerWidth - 32);
    const estimatedHeight = 200;

    // Se houver espaço suficiente acima da viewport (> 220px), abre para cima; senão abre para baixo
    const openTop = rect.top > estimatedHeight;
    const top = openTop ? rect.top - 10 : rect.bottom + 10;

    let left = rect.left;
    if (align === 'center') {
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    } else if (align === 'right') {
      left = rect.right - tooltipWidth;
    }

    // Mantém o tooltip dentro dos limites horizontais da tela (viewport)
    const margin = 12;
    if (left < margin) left = margin;
    if (left + tooltipWidth > window.innerWidth - margin) {
      left = window.innerWidth - margin - tooltipWidth;
    }

    // Calcula a posição da seta para apontar diretamente para o gatilho
    const triggerCenter = rect.left + rect.width / 2;
    const arrowLeft = Math.max(16, Math.min(tooltipWidth - 16, triggerCenter - left));

    setCoords({
      top,
      left,
      placement: openTop ? 'top' : 'bottom',
      arrowLeft
    });
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Fecha o tooltip quando o usuário clica fora ou faz scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Meta Ads':
        return 'bg-blue-500/15 text-blue-300 border-blue-400/30';
      case 'Mercado Livre':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30';
      case 'Arbitragem':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30';
      case 'Comunidade':
        return 'bg-purple-500/15 text-purple-300 border-purple-400/30';
      default:
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30';
    }
  };

  return (
    <>
      <span
        ref={containerRef}
        className={`relative inline-flex items-center gap-1 group/help ${className}`}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            handleClose();
          } else {
            handleOpen();
          }
        }}
      >
        {/* Texto ou Ícone Gatilho */}
        {!iconOnly && children && (
          <span className="border-b border-dotted border-white/40 group-hover/help:border-amber-400 transition-colors cursor-help">
            {children}
          </span>
        )}

        <span
          className={`inline-flex items-center justify-center p-0.5 rounded-full text-slate-400 group-hover/help:text-amber-300 transition-colors cursor-help ${
            iconOnly ? 'hover:scale-110' : ''
          }`}
          title={`Clique ou passe o mouse para ver a explicação de ${info.sigla}`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </span>
      </span>

      {/* Card Flutuante de Legenda Renderizado via Portal Direto no Document Body (Sem corte de overflow-hidden) */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none',
              zIndex: 9999
            }}
            className="w-72 sm:w-80 p-3.5 rounded-xl bg-slate-950/95 border border-amber-500/30 shadow-2xl backdrop-blur-2xl text-left transition-all animate-in fade-in zoom-in-95 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={handleClose}
          >
            {/* Seta do tooltip apontando com precisão para o termo */}
            <div
              style={{ left: `${coords.arrowLeft}px` }}
              className={`absolute w-0 h-0 -translate-x-1/2 ${
                coords.placement === 'top'
                  ? 'top-full border-x-6 border-x-transparent border-t-6 border-t-slate-950/95'
                  : 'bottom-full border-x-6 border-x-transparent border-b-6 border-b-slate-950/95'
              }`}
            />

            {/* Cabeçalho */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-display font-extrabold text-sm text-white tracking-wide flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>{info.sigla}</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${getCategoryColor(
                    info.categoria
                  )}`}
                >
                  {info.categoria}
                </span>
              </div>
            </div>

            {/* Nome Completo */}
            <p className="text-xs font-semibold text-amber-200/90 mb-1.5 leading-snug">
              {info.nome}
            </p>

            {/* Descrição Didática */}
            <p className="text-xs text-slate-300/90 leading-relaxed mb-2.5">
              {info.descricao}
            </p>

            {/* Fórmula / Como é Calculado */}
            {info.formula && (
              <div className="p-2 rounded-lg bg-black/50 border border-white/5 font-mono text-[10px] text-cyan-300/90 mb-2">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">
                  Fórmula:
                </span>
                <span>{info.formula}</span>
              </div>
            )}

            {/* Dica de Operação / Alerta */}
            {info.referenciaIdeal && (
              <div className="flex items-start gap-1.5 pt-1.5 border-t border-white/[0.08] text-[10px] text-emerald-300 font-medium leading-tight">
                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span>{info.referenciaIdeal}</span>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
