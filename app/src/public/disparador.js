// Estado Global da Aplicação
const state = {
  activeTab: 'dashboard',
  whatsapp: { status: 'disconnected', qrDataUrl: null, pairingCode: null, userPhone: null },
  metricas: { totalContatos: 0, totalGrupos: 0, enviosHoje: 0, falhasHoje: 0, respostasIaHoje: 0 },
  grupos: [],
  contatos: [],
  pastas: [],
  currentPasta: 'todos',
  campanhas: [],
  configs: {},
  metaStatus: { ativo: false, configured: false, tokenConfigured: false, phoneNumberId: null, wabaId: null, apiVersion: 'v21.0' },
  metaTemplates: [],
  metaPresets: [],
  financas: {
    mesAtivo: '',
    meses: [],
    uploads: [],
    relatorio: null,
    selectedFile: null
  }
};

// Toast de Notificação
function showToast(message, type = 'info') {
  const toast = document.getElementById('app-toast');
  toast.innerText = message;
  toast.style.display = 'block';
  toast.style.borderColor =
    type === 'error'
      ? 'var(--google-red)'
      : type === 'warning'
      ? '#f59e0b'
      : type === 'success'
      ? 'var(--google-green)'
      : 'var(--google-blue)';
  const timeoutMs = type === 'warning' ? 6000 : 3500;
  setTimeout(() => {
    toast.style.display = 'none';
  }, timeoutMs);
}

// Utilitários de Formatação & Sanitização
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resolveSpintaxText(text) {
  if (!text) return '';
  let current = text;
  let prev = '';
  while (current !== prev) {
    prev = current;
    current = current.replace(/\{([^{}]+)\}/g, (match, choices) => {
      const lower = choices.toLowerCase().trim();
      if (['nome', 'saudacao', 'grupo', 'numero'].includes(lower)) {
        return match; // Preserva as tags de substituição
      }
      if (choices.includes('|')) {
        const parts = choices.split('|');
        return parts[Math.floor(Math.random() * parts.length)].trim();
      }
      return match;
    });
  }
  return current;
}

function formatWhatsAppMarkdown(text) {
  if (!text) return '';
  let esc = escapeHtml(text);
  // Bloco de código ```...```
  esc = esc.replace(/```([\s\S]*?)```/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 4px;border-radius:3px;">$1</code>');
  // Negrito *...*
  esc = esc.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  // Itálico _..._
  esc = esc.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  // Riscado ~...~
  esc = esc.replace(/~([^~\n]+)~/g, '<del>$1</del>');
  // Quebras de linha
  esc = esc.replace(/\n/g, '<br>');
  return esc;
}

// Atualizador da Prévia Ao Vivo do WhatsApp
function updateWhatsAppPreview() {
  const templateInput = document.getElementById('camp-template');
  const mediaInput = document.getElementById('camp-media');
  if (!templateInput || !mediaInput) return;

  const template = templateInput.value || '';
  const mediaUrl = mediaInput.value.trim();
  const mediaPreviewBox = document.getElementById('wa-media-preview');
  const mediaImg = document.getElementById('wa-media-img');
  const textElem = document.getElementById('wa-preview-text');
  const timeElem = document.getElementById('wa-preview-time');

  // Preview de foto anexada
  if (mediaUrl) {
    mediaPreviewBox.style.display = 'block';
    mediaImg.src = mediaUrl;
    mediaImg.onerror = () => {
      mediaPreviewBox.style.display = 'none';
    };
  } else {
    mediaPreviewBox.style.display = 'none';
  }

  // Horário atual formatado
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  if (timeElem) timeElem.innerText = `${hours}:${minutes}`;

  // Se o campo estiver vazio
  if (!template.trim()) {
    if (textElem) {
      textElem.innerHTML = '<span style="color: rgba(233,237,239,0.45); font-style: italic;">Digite sua mensagem ao lado para visualizar a prévia ao vivo...</span>';
    }
    return;
  }

  // Saudação de acordo com o turno
  const hr = now.getHours();
  let saudacao = 'Boa tarde';
  if (hr >= 5 && hr < 12) saudacao = 'Bom dia';
  else if (hr >= 18 || hr < 5) saudacao = 'Boa noite';

  // Resolver tags dinâmicas primeiro e depois processar Spintax
  let rendered = template
    .replace(/\{nome\}/gi, 'Carlos')
    .replace(/\{saudacao\}/gi, saudacao)
    .replace(/\{grupo\}/gi, 'Pokémon TCG VIP')
    .replace(/\{numero\}/gi, '55 11 99999-9999');
  rendered = resolveSpintaxText(rendered);

  if (textElem) {
    textElem.innerHTML = formatWhatsAppMarkdown(rendered);
  }
}

// Navegação por Abas
const tabTitles = {
  dashboard: { title: 'Visão Geral', desc: 'Monitore a conexão do chip, campanhas ativas e métricas em tempo real.' },
  grupos: { title: 'Captação de Grupos', desc: 'Selecione um grupo para extrair instantaneamente os participantes e criar listas de leads.' },
  contatos: { title: 'Base de Leads', desc: 'Contatos captados automaticamente de grupos ou importados manualmente.' },
  campanhas: { title: 'Disparador em Massa', desc: 'Crie e gerencie filas de envios em massa com Spintax inteligente e anti-ban.' },
  'meta-cloud': { title: 'Meta Cloud API Oficial', desc: 'Disparos oficiais autenticados pela Meta com zero risco de banimento e otimização de custos.' },
  financas: { title: 'Gestão Financeira & Relatórios Meta Ads', desc: 'Controle de custos de tráfego pago, arquivamento semanal de planilhas e relatórios mensais executivos.' },
  deepseek: { title: 'Atendimento IA (DeepSeek V4)', desc: 'Configure a inteligência artificial para responder clientes no privado imitando a sua voz.' },
  configuracoes: { title: 'Anti-Ban & Parâmetros', desc: 'Regule os intervalos de envio, limites de aquecimento de chip e horários de operação.' },
  logs: { title: 'Logs ao Vivo', desc: 'Registro cronológico de disparos, respostas da IA e eventos do WhatsApp.' }
};

function switchTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `pane-${tabId}`);
  });

  const meta = tabTitles[tabId] || { title: 'Disparador Pro', desc: '' };
  document.getElementById('page-title').innerText = meta.title;
  document.getElementById('page-desc').innerText = meta.desc;

  if (tabId === 'grupos') loadGrupos();
  if (tabId === 'contatos') {
    loadPastasLeads();
    loadContatos();
  }
  if (tabId === 'campanhas') loadCampanhas();
  if (tabId === 'meta-cloud') loadMetaCloudData();
  if (tabId === 'financas') loadFinancasData();
  if (tabId === 'deepseek' || tabId === 'configuracoes') loadConfigs();
  if (tabId === 'logs') loadLogs();
}
window.switchTab = switchTab;

// Atualizar Interface do WhatsApp
function updateWhatsAppUI(wa) {
  state.whatsapp = wa;

  const dot = document.getElementById('connection-dot');
  const title = document.getElementById('connection-title');
  const sub = document.getElementById('connection-sub');
  const badge = document.getElementById('card-badge-status');
  const phonePill = document.getElementById('phone-pill');
  const phoneDisplay = document.getElementById('phone-display');
  const qrPlaceholder = document.getElementById('qr-placeholder');
  const qrImage = document.getElementById('qr-image');
  const pairingContainer = document.getElementById('pairing-code-container');
  const pairingVal = document.getElementById('pairing-code-val');
  const btnConnect = document.getElementById('btn-connect-qr');
  const btnDisconnect = document.getElementById('btn-disconnect');

  dot.className = `status-dot ${wa.status}`;

  if (wa.status === 'connected') {
    title.innerText = 'Conectado';
    sub.innerText = wa.userPhone || 'WhatsApp Ativo';
    badge.innerText = 'Conectado';
    badge.className = 'badge success';
    phonePill.style.display = 'flex';
    phoneDisplay.innerText = `+${wa.userPhone}`;
    qrPlaceholder.style.display = 'none';
    qrImage.style.display = 'none';
    pairingContainer.style.display = 'none';
    btnConnect.style.display = 'none';
    btnDisconnect.style.display = 'inline-flex';
  } else if (wa.status === 'qr_ready') {
    title.innerText = 'Pronto para Conectar';
    sub.innerText = wa.pairingCode ? 'Aguardando código' : 'Escaneie o QR Code';
    badge.innerText = 'Aguardando Leitura';
    badge.className = 'badge warning';
    phonePill.style.display = 'none';
    btnConnect.style.display = 'none';
    btnDisconnect.style.display = 'inline-flex';

    if (wa.pairingCode) {
      qrPlaceholder.style.display = 'none';
      qrImage.style.display = 'none';
      pairingContainer.style.display = 'block';
      pairingVal.innerText = wa.pairingCode;
    } else if (wa.qrDataUrl) {
      qrPlaceholder.style.display = 'none';
      qrImage.style.display = 'block';
      qrImage.src = wa.qrDataUrl;
      pairingContainer.style.display = 'none';
    }
  } else if (wa.status === 'connecting') {
    title.innerText = 'Conectando...';
    sub.innerText = 'Iniciando socket';
    badge.innerText = 'Conectando';
    badge.className = 'badge warning';
    btnConnect.style.display = 'none';
    btnDisconnect.style.display = 'inline-flex';
  } else {
    title.innerText = 'Desconectado';
    sub.innerText = 'Aguardando login';
    badge.innerText = 'Desconectado';
    badge.className = 'badge danger';
    phonePill.style.display = 'none';
    qrPlaceholder.style.display = 'flex';
    qrImage.style.display = 'none';
    pairingContainer.style.display = 'none';
    btnConnect.style.display = 'inline-flex';
    btnDisconnect.style.display = 'none';
  }
}

// Atualizar Métricas na Tela
function updateMetricasUI(m) {
  state.metricas = m;
  document.getElementById('stat-contatos').innerText = m.totalContatos || 0;
  document.getElementById('stat-grupos').innerText = m.totalGrupos || 0;
  document.getElementById('stat-envios').innerText = m.enviosHoje || 0;
  document.getElementById('stat-ia').innerText = m.respostasIaHoje || 0;

  const w = m.warmup;
  if (w) {
    const lbl = document.getElementById('stat-warmup-label');
    const val = document.getElementById('stat-warmup-val');
    if (lbl && val) {
      if (w.ativo) {
        lbl.innerText = `Aquecimento (Dia ${w.diaAtual})`;
        val.innerText = `${w.enviosHoje} / ${w.limiteHoje}`;
      } else {
        lbl.innerText = 'Limite Diário Fixo';
        val.innerText = `${w.enviosHoje} / ${w.limiteHoje}`;
      }
    }

    const badgeDay = document.getElementById('warmup-badge-day');
    const badgeDesc = document.getElementById('warmup-badge-desc');
    if (badgeDay && badgeDesc) {
      if (w.ativo) {
        badgeDay.innerText = `Aquecimento Ativo: Dia ${w.diaAtual} ${w.concluido ? '(Meta Atingida)' : ''}`;
        badgeDesc.innerText = `Cota de hoje: ${w.limiteHoje} disparos (${w.enviosHoje} enviados hoje • ${w.restantesHoje} restantes)`;
      } else {
        badgeDay.innerText = 'Aquecimento Gradual Desativado';
        badgeDesc.innerText = `Operando com limite fixo de ${w.limiteHoje} disparos/dia (${w.enviosHoje} enviados hoje)`;
      }
    }
  }
}

// Conectar via SSE para tempo real
function initSSE() {
  const eventSource = new EventSource('/api/bot/events');

  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'init') {
        if (payload.state) updateWhatsAppUI(payload.state);
        if (payload.metricas) updateMetricasUI(payload.metricas);
      } else if (payload.type === 'whatsapp_state') {
        updateWhatsAppUI(payload.data);
      } else if (payload.type === 'metricas') {
        updateMetricasUI(payload.data);
      } else if (payload.type === 'campanhas_update') {
        if (state.activeTab === 'campanhas') loadCampanhas();
      }
    } catch (e) {
      console.warn('Erro ao processar evento SSE:', e);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    setTimeout(initSSE, 4000);
  };
}

// Carregar Status Inicial
async function loadStatus() {
  try {
    const res = await fetch('/api/bot/status');
    const data = await res.json();
    if (data.whatsapp) updateWhatsAppUI(data.whatsapp);
    if (data.metricas) updateMetricasUI(data.metricas);
    if (data.configs) state.configs = data.configs;

    // Verificar se o motor de disparos está em pausa de descanso
    try {
      const engineRes = await fetch('/api/bot/engine/status');
      const engineStatus = await engineRes.json();
      updateEnginePauseUI(engineStatus);
    } catch {}
  } catch (err) {
    console.warn('Falha ao carregar status inicial:', err);
  }
}

let pauseActionType = 'resume';

window.handlePauseAction = function() {
  if (pauseActionType === 'resume') {
    resumeEngineNow();
  } else if (pauseActionType === 'config') {
    if (typeof window.switchTab === 'function') {
      window.switchTab('configuracoes');
    }
  }
};

function updateEnginePauseUI(status) {
  const banner = document.getElementById('engine-pause-banner');
  const iconElem = document.getElementById('pause-banner-icon');
  const titleElem = document.getElementById('pause-banner-title');
  const msgElem = document.getElementById('pause-banner-msg');
  const btnElem = document.getElementById('btn-force-resume');
  if (!banner || !msgElem) return;

  if (status && status.inBlockPause) {
    pauseActionType = 'resume';
    banner.style.display = 'flex';
    banner.style.borderColor = '#f59e0b';
    banner.style.background = 'rgba(245, 158, 11, 0.12)';
    if (iconElem) iconElem.innerText = '⏸️';
    if (titleElem) {
      titleElem.innerText = 'MOTOR EM PAUSA LONGA HUMANA (Descanso de Chip)';
      titleElem.style.color = '#f59e0b';
    }
    msgElem.innerText = `Bloco concluído. O chip está descansando para evitar comportamento robótico e proteger seu número. Retoma automaticamente às ${status.pauseTimeFormatted || 'instantes'} (${status.remainingMinutes} min restantes).`;
    if (btnElem) {
      btnElem.innerText = '▶️ Retomar Envios Agora';
      btnElem.style.background = '#f59e0b';
      btnElem.style.color = '#121212';
    }
  } else if (status && status.dailyLimitReached) {
    pauseActionType = 'config';
    banner.style.display = 'flex';
    banner.style.borderColor = '#3b82f6';
    banner.style.background = 'rgba(59, 130, 246, 0.12)';
    if (iconElem) iconElem.innerText = '🛡️';
    if (titleElem) {
      titleElem.innerText = 'COTA DIÁRIA DE SEGURANÇA ATINGIDA (Modo Aquecimento de Chip)';
      titleElem.style.color = '#60a5fa';
    }
    const w = status.warmup;
    msgElem.innerText = `Você atingiu a cota de hoje (${w?.enviosHoje || 20}/${w?.limiteHoje || 20} mensagens - Dia ${w?.diaAtual || 1}). Para proteger seu chip novo de ser banido, os envios pausam até amanhã. Quer enviar mais agora? Você pode alterar a cota ou desativar o aquecimento na aba de configurações.`;
    if (btnElem) {
      btnElem.innerText = '⚙️ Ajustar Limite nas Configurações';
      btnElem.style.background = '#3b82f6';
      btnElem.style.color = '#ffffff';
    }
  } else {
    banner.style.display = 'none';
  }
}

window.resumeEngineNow = async function() {
  try {
    const res = await fetch('/api/bot/engine/resume', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      showToast('Pausa encerrada! O motor retomou a fila de disparos agora mesmo.', 'success');
      loadStatus();
      loadCampanhas();
      loadLogs();
    }
  } catch (err) {
    showToast(`Erro ao retomar: ${err.message}`, 'error');
  }
};

window.openTestModal = function() {
  const modal = document.getElementById('modal-test-send');
  const inputPhone = document.getElementById('test-phone-input');
  if (state.whatsapp?.userPhone && inputPhone && !inputPhone.value) {
    inputPhone.value = state.whatsapp.userPhone;
  }
  if (modal) modal.style.display = 'flex';
};

window.closeTestModal = function() {
  const modal = document.getElementById('modal-test-send');
  if (modal) modal.style.display = 'none';
};

window.sendTestMessage = async function() {
  const phoneInput = document.getElementById('test-phone-input');
  const msgInput = document.getElementById('test-message-input');
  const btn = document.getElementById('btn-submit-test-send');

  const phone = phoneInput?.value.trim();
  const text = msgInput?.value.trim();

  if (!phone) {
    showToast('Por favor, informe um número de telefone com DDD.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Enviando teste...';

  try {
    const res = await fetch('/api/bot/whatsapp/test-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, text })
    });
    const data = await res.json();
    if (data.ok) {
      showToast(`Sucesso! Mensagem de teste entregue para ${data.destinatario.split('@')[0]}. Verifique seu WhatsApp!`, 'success');
      closeTestModal();
      loadLogs();
    } else {
      showToast(data.message || 'Falha ao enviar mensagem de teste.', 'error');
    }
  } catch (err) {
    showToast(`Erro no teste: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = '🚀 Disparar Teste Agora';
  }
};

// Grupos
async function loadGrupos(refetch = true) {
  const container = document.getElementById('grupos-list');
  const counter = document.getElementById('grupos-counter');
  const searchInput = document.getElementById('grupos-search');
  const query = (searchInput?.value || '').toLowerCase().trim();

  try {
    if (refetch || !state.grupos || state.grupos.length === 0) {
      const res = await fetch('/api/bot/grupos');
      const { grupos } = await res.json();
      state.grupos = grupos || [];
    }

    let list = state.grupos;
    if (query) {
      list = list.filter(g => 
        (g.nome && g.nome.toLowerCase().includes(query)) ||
        String(g.total_membros || 0).includes(query)
      );
    }

    if (counter) {
      counter.innerText = `${list.length} de ${state.grupos.length} grupos`;
    }

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>${state.grupos.length === 0 ? 'Nenhum grupo sincronizado ainda. Conecte seu WhatsApp e clique em "Sincronizar Grupos do Chip".' : 'Nenhum grupo corresponde à sua pesquisa.'}</p>
        </div>`;
      return;
    }

    container.innerHTML = list.map(g => `
      <div class="grupo-card">
        <div class="grupo-top">
          <img src="${g.foto_url || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'48\' height=\'48\' fill=\'%23282c37\'><rect width=\'48\' height=\'48\' rx=\'12\'/><text x=\'50%25\' y=\'50%25\' font-size=\'18\' fill=\'%238ab4f8\' text-anchor=\'middle\' dominant-baseline=\'middle\' font-family=\'sans-serif\'>👥</text></svg>'}" class="grupo-avatar" alt="Foto">
          <div class="grupo-info">
            <h4 title="${escapeHtml(g.nome)}">${escapeHtml(g.nome)}</h4>
            <p>${g.total_membros} participantes</p>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="extractParticipants('${g.jid}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Extrair Leads Deste Grupo
        </button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-danger">Erro ao carregar grupos: ${err.message}</p>`;
  }
}

window.extractParticipants = async function(jid) {
  showToast('Iniciando extração de membros do grupo...', 'info');
  try {
    const res = await fetch('/api/bot/grupos/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupJid: jid })
    });
    const data = await res.json();
    if (data.ok) {
      const msgAdms = data.adminsIgnorados > 0 ? ` (${data.adminsIgnorados} ADMs protegidos/ignorados)` : '';
      const msgOcultos = data.ocultosIgnorados > 0 ? ` [${data.ocultosIgnorados} números ocultos de comunidade ignorados]` : '';

      if (data.total === 0 && data.ocultosIgnorados > 0) {
        showToast(
          `Aviso: Os ${data.ocultosIgnorados} membros deste grupo estão com o telefone oculto por regras de comunidade do WhatsApp. O WhatsApp não permite envio para contatos com número privado.`,
          'warning'
        );
      } else {
        showToast(`Sucesso! ${data.total} novos membros extraídos do grupo "${data.grupoNome}"${msgAdms}${msgOcultos}.`, 'success');
      }

      loadStatus();
      loadPastasLeads();
      loadContatos();
    } else {
      showToast(data.message || 'Falha na extração.', 'error');
    }
  } catch (err) {
    showToast(`Erro na extração: ${err.message}`, 'error');
  }
};

// Funções de Gerenciamento de Pastas & Lotes de Leads
window.exportarPasta = function(pastaNome, formato = 'excel') {
  let url = `/api/contatos/export?formato=${encodeURIComponent(formato)}`;
  if (pastaNome && pastaNome !== 'todos') {
    url += `&pasta=${encodeURIComponent(pastaNome)}`;
  }
  window.open(url, '_blank');
};

window.iniciarCampanhaComPasta = async function(pastaNome) {
  switchTab('campanhas');
  await openNovaCampanhaModal(`pasta:${pastaNome}`);
};

window.excluirPasta = async function(pastaNome) {
  if (confirm(`Atenção: Deseja realmente excluir a pasta "${pastaNome}" e todos os seus contatos?\nEsta ação não poderá ser desfeita.`)) {
    try {
      const res = await fetch('/api/bot/contatos/pasta', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pastaNome })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Pasta "${pastaNome}" e ${data.totalDeleted} contatos foram excluídos.`, 'success');
        if (state.currentPasta === pastaNome) {
          state.currentPasta = 'todos';
        }
        await loadPastasLeads();
        await loadContatos();
        await loadStatus();
      } else {
        showToast(data.message || 'Erro ao excluir pasta.', 'error');
      }
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
    }
  }
};

async function loadPastasLeads() {
  const container = document.getElementById('pastas-container');
  const counterInfo = document.getElementById('pastas-counter-info');
  const totalAllBadge = document.getElementById('pasta-total-all');
  if (!container) return;

  try {
    const res = await fetch('/api/bot/contatos/pastas');
    const data = await res.json();
    const pastas = data.pastas || [];
    state.pastas = pastas;

    const totalLeadsGeral = pastas.reduce((sum, p) => sum + (p.total || 0), 0);
    if (totalAllBadge) {
      totalAllBadge.innerText = `${totalLeadsGeral} leads`;
    }
    if (counterInfo) {
      counterInfo.innerText = `${pastas.length} pasta${pastas.length === 1 ? '' : 's'} de captação`;
    }

    const cardsHtml = [
      `
      <div class="pasta-card ${state.currentPasta === 'todos' ? 'active' : ''}" data-pasta="todos">
        <div class="pasta-top">
          <span class="pasta-icon">📁</span>
          <span class="pasta-badge">TODOS</span>
        </div>
        <strong class="pasta-name">Todas as Pastas</strong>
        <span class="pasta-count">${totalLeadsGeral} contatos no total</span>
      </div>
      `
    ];

    pastas.forEach(p => {
      const isSelected = state.currentPasta === p.nome;
      const dataFormatada = p.criado_em ? p.criado_em.split(' ')[0] : '';
      cardsHtml.push(`
        <div class="pasta-card ${isSelected ? 'active' : ''}" data-pasta="${escapeHtml(p.nome)}">
          <div class="pasta-top">
            <span class="pasta-icon">📂</span>
            <span class="pasta-badge">${p.total} leads</span>
          </div>
          <strong class="pasta-name" title="${escapeHtml(p.nome)}">${escapeHtml(p.nome)}</strong>
          <span class="pasta-count">${p.total} contatos ${dataFormatada ? '• ' + dataFormatada : ''}</span>
          <div class="pasta-actions" onclick="event.stopPropagation()">
            <button class="pasta-btn" title="Exportar esta pasta para Excel (.CSV)" onclick="exportarPasta('${escapeHtml(p.nome)}', 'excel')">
              Excel
            </button>
            <button class="pasta-btn" title="Exportar lista formatada para Meta Ads (.CSV)" onclick="exportarPasta('${escapeHtml(p.nome)}', 'meta')" style="color: #8ab4f8;">
              Meta Ads
            </button>
            <button class="pasta-btn highlight" title="Criar campanha com esta pasta" onclick="iniciarCampanhaComPasta('${escapeHtml(p.nome)}')">
              Disparar
            </button>
            <button class="pasta-btn danger" title="Excluir esta pasta e seus contatos" onclick="excluirPasta('${escapeHtml(p.nome)}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `);
    });

    container.innerHTML = cardsHtml.join('');

    container.querySelectorAll('.pasta-card').forEach(card => {
      card.addEventListener('click', () => {
        const pasta = card.dataset.pasta;
        state.currentPasta = pasta;
        container.querySelectorAll('.pasta-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        loadContatos();
      });
    });

  } catch (err) {
    console.warn('Erro ao carregar pastas de leads:', err);
  }
}

// Excluir contato individual
window.excluirContato = async function(id, numero) {
  if (confirm(`Deseja realmente remover o contato +${numero} da base de leads?`)) {
    try {
      const res = await fetch(`/api/bot/contatos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        showToast(`Contato +${numero} removido com sucesso!`, 'info');
        await loadContatos();
        await loadPastasLeads();
        await loadStatus();
      } else {
        showToast(data.message || 'Erro ao remover contato.', 'error');
      }
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
    }
  }
};

// Contatos
async function loadContatos() {
  const tbody = document.getElementById('contatos-tbody');
  const counter = document.getElementById('contatos-counter');
  const busca = (document.getElementById('contatos-search')?.value || '').trim();
  const pasta = state.currentPasta || 'todos';

  try {
    const res = await fetch(`/api/bot/contatos?limit=250&busca=${encodeURIComponent(busca)}&pasta=${encodeURIComponent(pasta)}`);
    const { contatos, total } = await res.json();
    state.contatos = contatos || [];

    if (counter) {
      if (pasta && pasta !== 'todos') {
        counter.innerText = `${total} contatos na pasta "${pasta}"`;
      } else {
        counter.innerText = `${total} contatos cadastrados`;
      }
    }

    if (!contatos || contatos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">Nenhum contato encontrado${pasta !== 'todos' ? ` na pasta "${escapeHtml(pasta)}"` : ''}.</td></tr>`;
      return;
    }

    tbody.innerHTML = contatos.map(c => `
      <tr>
        <td><strong>+${c.numero}</strong></td>
        <td>${escapeHtml(c.nome) || '<span class="text-muted">Sem nome</span>'}</td>
        <td><span class="badge secondary" style="font-size: 11px;">📁 ${escapeHtml(c.grupo_nome) || 'Geral'}</span></td>
        <td><span class="badge info">${c.origem_tipo}</span></td>
        <td>${c.criado_em ? c.criado_em.split(' ')[0] : '-'}</td>
        <td style="text-align: right;">
          <button class="btn-trash" title="Excluir este contato (+${c.numero})" onclick="excluirContato(${c.id}, '${c.numero}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro: ${err.message}</td></tr>`;
  }
}

// Campanhas
async function loadCampanhas(refetch = true) {
  const container = document.getElementById('campanhas-container');
  const counter = document.getElementById('campanhas-counter');
  const query = (document.getElementById('campanhas-search')?.value || '').toLowerCase().trim();

  try {
    if (refetch || !state.campanhas || state.campanhas.length === 0) {
      const res = await fetch('/api/bot/campanhas');
      const { campanhas } = await res.json();
      state.campanhas = campanhas || [];
    }

    let list = state.campanhas;
    if (query) {
      list = list.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(query)) ||
        (c.status && c.status.toLowerCase().includes(query)) ||
        (c.mensagem_template && c.mensagem_template.toLowerCase().includes(query))
      );
    }

    if (counter) {
      counter.innerText = `${list.length} de ${state.campanhas.length} campanhas`;
    }

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>${state.campanhas.length === 0 ? 'Nenhuma campanha criada ainda. Clique em "Nova Campanha" para começar.' : 'Nenhuma campanha corresponde à sua pesquisa.'}</p>
        </div>`;
      return;
    }

    container.innerHTML = list.map(c => {
      const pct = c.total_destinatarios > 0 ? Math.round((c.enviados / c.total_destinatarios) * 100) : 0;
      let badgeClass = 'info';
      if (c.status === 'executando') badgeClass = 'warning';
      if (c.status === 'concluida') badgeClass = 'success';
      if (c.status === 'cancelada') badgeClass = 'danger';

      return `
        <div class="glass-card">
          <div class="card-header">
            <div>
              <h3>${escapeHtml(c.nome)}</h3>
              <small>Criada em ${c.criado_em}</small>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge ${badgeClass}">${c.status.toUpperCase()}</span>
              <button class="btn-trash" title="Excluir campanha e envios pendentes" onclick="deleteCampanha(${c.id}, '${escapeHtml(c.nome)}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                Excluir
              </button>
            </div>
          </div>
          <div class="card-body">
            <p style="margin-bottom: 12px; font-size: 13px; color: var(--text-secondary); white-space: pre-wrap;">${escapeHtml(c.mensagem_template.slice(0, 160))}...</p>
            
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
              <span>Progresso: ${c.enviados} de ${c.total_destinatarios} enviados (${c.falhas} falhas)</span>
              <strong>${pct}%</strong>
            </div>
            <div style="width: 100%; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; margin-bottom: 16px;">
              <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, var(--google-blue), var(--gemini-purple));"></div>
            </div>

            <div style="display: flex; gap: 8px;">
              ${c.status !== 'executando' && c.status !== 'concluida' ? `
                <button class="btn btn-primary btn-sm" onclick="startCampanha(${c.id})">▶ Iniciar Disparos</button>
              ` : ''}
              ${c.status === 'executando' ? `
                <button class="btn btn-secondary btn-sm" onclick="pauseCampanha(${c.id})">⏸ Pausar</button>
              ` : ''}
              ${c.status !== 'concluida' && c.status !== 'cancelada' ? `
                <button class="btn btn-danger btn-sm" onclick="cancelCampanha(${c.id})">⏹ Cancelar</button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-danger">Erro: ${err.message}</p>`;
  }
}

window.startCampanha = async function(id) {
  await fetch(`/api/bot/campanhas/${id}/start`, { method: 'POST' });
  showToast('Campanha iniciada! Disparos rodando em segundo plano.', 'success');
  loadCampanhas();
};

window.pauseCampanha = async function(id) {
  await fetch(`/api/bot/campanhas/${id}/pause`, { method: 'POST' });
  showToast('Campanha pausada.', 'info');
  loadCampanhas();
};

window.cancelCampanha = async function(id) {
  if (confirm('Tem certeza que deseja cancelar esta campanha?')) {
    await fetch(`/api/bot/campanhas/${id}/cancel`, { method: 'POST' });
    showToast('Campanha cancelada.', 'warn');
    loadCampanhas();
  }
};

window.deleteCampanha = async function(id, nome) {
  if (confirm(`Deseja realmente excluir a campanha "${nome}"?\nTodos os disparos pendentes desta fila também serão removidos.`)) {
    try {
      const res = await fetch(`/api/bot/campanhas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        showToast(`Campanha "${nome}" excluída com sucesso!`, 'success');
        loadCampanhas(true);
        loadStatus();
      } else {
        showToast(data.message || 'Erro ao excluir campanha.', 'error');
      }
    } catch (err) {
      showToast(`Erro na requisição: ${err.message}`, 'error');
    }
  }
};

// Configurações e DeepSeek
async function loadConfigs() {
  try {
    const res = await fetch('/api/bot/config');
    const cfg = await res.json();
    state.configs = cfg;

    // DeepSeek & OpenCode Form
    document.getElementById('deepseek-ativo-toggle').checked = cfg.deepseek_ativo === 'true';
    document.getElementById('deepseek-key-input').value = cfg.deepseek_api_key || '';
    let currentUrl = cfg.deepseek_base_url;
    if (!currentUrl || currentUrl === 'https://api.deepseek.com/v1' || currentUrl.includes('api.deepseek.com')) {
      currentUrl = 'https://opencode.ai/zen/go/v1';
    }
    let currentModel = cfg.deepseek_model;
    if (!currentModel || currentModel === 'deepseek-chat') {
      currentModel = 'deepseek-flash';
    }
    document.getElementById('deepseek-url-input').value = currentUrl;
    document.getElementById('deepseek-model-input').value = currentModel;
    document.getElementById('deepseek-prompt-textarea').value = cfg.deepseek_prompt_sistema || '';
    document.getElementById('deepseek-delay-min').value = cfg.deepseek_delay_min || '3';
    document.getElementById('deepseek-delay-max').value = cfg.deepseek_delay_max || '6';

    // Anti-ban & Fator Humano Form
    document.getElementById('cfg-delay-min').value = cfg.disparo_delay_min || '15';
    document.getElementById('cfg-delay-max').value = cfg.disparo_delay_max || '45';

    const simularElem = document.getElementById('cfg-simular-digitacao');
    if (simularElem) simularElem.checked = cfg.disparo_simular_digitacao !== 'false';
    const presencaElem = document.getElementById('cfg-presenca-tipo');
    if (presencaElem) presencaElem.value = cfg.disparo_presenca_tipo || 'auto';
    const digMinElem = document.getElementById('cfg-digitacao-min');
    if (digMinElem) digMinElem.value = cfg.disparo_digitacao_min || '3';
    const digMaxElem = document.getElementById('cfg-digitacao-max');
    if (digMaxElem) digMaxElem.value = cfg.disparo_digitacao_max || '10';

    const aqAtivoElem = document.getElementById('cfg-aquecimento-ativo');
    if (aqAtivoElem) aqAtivoElem.checked = cfg.aquecimento_ativo !== 'false';
    const aqIniElem = document.getElementById('cfg-aquecimento-inicio');
    if (aqIniElem) aqIniElem.value = cfg.aquecimento_inicio_diario || '20';
    const aqIncElem = document.getElementById('cfg-aquecimento-incremento');
    if (aqIncElem) aqIncElem.value = cfg.aquecimento_incremento_diario || '5';
    const aqTetoElem = document.getElementById('cfg-aquecimento-teto');
    if (aqTetoElem) aqTetoElem.value = cfg.aquecimento_limite_maximo || '100';

    document.getElementById('cfg-pausa-cada').value = cfg.disparo_pausa_a_cada || '50';
    const pMinElem = document.getElementById('cfg-pausa-minutos-min');
    if (pMinElem) pMinElem.value = cfg.disparo_pausa_minutos_min || '30';
    const pMaxElem = document.getElementById('cfg-pausa-minutos-max');
    if (pMaxElem) pMaxElem.value = cfg.disparo_pausa_minutos_max || '60';

    document.getElementById('cfg-hora-inicio').value = cfg.disparo_horario_inicio || '08:00';
    document.getElementById('cfg-hora-fim').value = cfg.disparo_horario_fim || '21:30';
    document.getElementById('cfg-limite-diario').value = cfg.disparo_limite_diario || '100';
  } catch (err) {
    console.warn('Erro ao carregar configs:', err);
  }
}

async function saveConfigs(updates) {
  try {
    const res = await fetch('/api/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.ok) {
      showToast('Configurações salvas com sucesso!', 'success');
    }
  } catch (err) {
    showToast(`Erro ao salvar: ${err.message}`, 'error');
  }
}

// ==========================================
// Meta Cloud API Oficial & Templates
// ==========================================
async function loadMetaCloudData() {
  try {
    const [resStatus, resTemplates] = await Promise.all([
      fetch('/api/bot/meta/status').then(r => r.json()).catch(() => ({ ativo: false })),
      fetch('/api/bot/meta/templates').then(r => r.json()).catch(() => ({ templates: [], presets: [] }))
    ]);

    state.metaStatus = resStatus;
    state.metaTemplates = resTemplates.templates || [];
    state.metaPresets = resTemplates.presets || [];

    // Preencher campos
    const toggleAtivo = document.getElementById('meta-cloud-ativo-toggle');
    if (toggleAtivo) toggleAtivo.checked = !!resStatus.ativo;

    const inputWaba = document.getElementById('meta-waba-id-input');
    if (inputWaba && resStatus.wabaId) inputWaba.value = resStatus.wabaId;

    const inputPhone = document.getElementById('meta-phone-id-input');
    if (inputPhone && resStatus.phoneNumberId) inputPhone.value = resStatus.phoneNumberId;

    const inputVer = document.getElementById('meta-api-version-input');
    if (inputVer && resStatus.apiVersion) inputVer.value = resStatus.apiVersion;

    const inputToken = document.getElementById('meta-token-input');
    if (inputToken && resStatus.tokenConfigured && !inputToken.value) {
      inputToken.placeholder = '•••••••••••••••••••••••• (Token já salvo com segurança)';
    }

    // Badge de status
    const badge = document.getElementById('meta-connection-badge');
    if (badge) {
      if (resStatus.configured) {
        badge.className = 'badge badge-approved';
        badge.innerText = '🟢 Credenciais Salvas';
      } else {
        badge.className = 'badge badge-pending';
        badge.innerText = '⚪ Não Configurado';
      }
    }

    renderMetaTemplatesTable();
  } catch (err) {
    console.warn('Erro ao carregar Meta Cloud data:', err);
  }
}

function renderMetaTemplatesTable() {
  const tbody = document.getElementById('meta-templates-tbody');
  if (!tbody) return;

  const list = state.metaTemplates || [];
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">
          Nenhum template cadastrado localmente. Clique em <strong>"Sincronizar com a Meta"</strong> para importar templates existentes ou <strong>"Submeter Novo Template"</strong>.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(t => {
    const isUtility = (t.categoria || '').toUpperCase() === 'UTILITY';
    const catBadge = isUtility
      ? `<span class="badge badge-utility">UTILIDADE (~R$ 0,18)</span>`
      : `<span class="badge badge-marketing">MARKETING (~R$ 0,38)</span>`;

    let statusBadge = `<span class="badge badge-pending">🟡 ${t.status || 'PENDING'}</span>`;
    if (t.status === 'APPROVED') {
      statusBadge = `<span class="badge badge-approved">🟢 APROVADO</span>`;
    } else if (t.status === 'REJECTED') {
      statusBadge = `<span class="badge badge-rejected" title="${escapeHtml(t.motivo_rejeicao || '')}">🔴 REJEITADO</span>`;
    }

    return `
      <tr>
        <td><code>${escapeHtml(t.nome)}</code></td>
        <td>${catBadge}</td>
        <td><code>${escapeHtml(t.idioma || 'pt_BR')}</code></td>
        <td>${statusBadge}</td>
        <td><small style="color: var(--text-secondary); max-width: 280px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(t.corpo_texto || '')}</small></td>
        <td style="text-align: right; white-space: nowrap;">
          ${t.status === 'APPROVED' ? `
            <button class="btn btn-secondary btn-sm" style="font-size: 11.5px; padding: 4px 8px; margin-right: 4px;" onclick="useMetaTemplateInCampanha('${escapeHtml(t.nome)}')">
              🚀 Usar em Campanha
            </button>
          ` : ''}
          <button class="btn-trash" style="padding: 4px 8px;" onclick="deleteMetaTemplate('${escapeHtml(t.nome)}')">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.useMetaTemplateInCampanha = async function(nome) {
  switchTab('campanhas');
  await openNovaCampanhaModal('todos');
  const metaRadio = document.querySelector('input[name="camp-canal-envio"][value="meta_cloud"]');
  if (metaRadio) {
    metaRadio.checked = true;
    handleChannelToggle('meta_cloud');
    const select = document.getElementById('camp-meta-template-select');
    if (select) {
      select.value = nome;
      handleMetaTemplateSelectionChange();
    }
  }
};

window.deleteMetaTemplate = async function(nome) {
  if (confirm(`Deseja excluir o template "${nome}" do banco local e solicitar remoção na Meta?`)) {
    try {
      const res = await fetch(`/api/bot/meta/templates/${encodeURIComponent(nome)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        showToast(`Template "${nome}" removido!`, 'success');
        loadMetaCloudData();
      } else {
        showToast(data.message || 'Erro ao remover template.', 'error');
      }
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
    }
  }
};

function auditUtilitySafetyLive(text) {
  const auditBox = document.getElementById('meta-utility-safety-audit');
  if (!auditBox) return;

  if (!text || !text.trim()) {
    auditBox.style.display = 'none';
    return;
  }

  const lower = text.toLowerCase();
  const commercialTriggers = [
    { word: 'compre', reason: 'Apelo direto de compra força reclassificação para MARKETING.' },
    { word: 'desconto', reason: 'Menção a descontos financeiros aciona filtro de MARKETING.' },
    { word: 'promoção', reason: 'Termos de promoção acionam custo de MARKETING (~R$ 0,38).' },
    { word: 'cupom', reason: 'Cupons são estritamente classificados como MARKETING pela Meta.' },
    { word: 'oferta', reason: 'Palavra "oferta" tem alto risco de reclassificação pela Meta.' },
    { word: 'r$', reason: 'Valores explícitos em moeda (R$) indicam venda comercial.' },
    { word: '% off', reason: 'Percentuais de desconto acionam reclassificação imediata.' }
  ];

  const found = commercialTriggers.filter(t => lower.includes(t.word));

  auditBox.style.display = 'block';
  if (found.length > 0) {
    auditBox.style.background = 'rgba(245, 158, 11, 0.12)';
    auditBox.style.border = '1px solid #f59e0b';
    auditBox.style.color = '#fde68a';
    auditBox.innerHTML = `
      <strong style="color: #f59e0b; display: block; margin-bottom: 4px;">⚠️ ALERTA DE RECLASSIFICAÇÃO META (Risco de Custo Alto):</strong>
      <p style="margin: 0 0 6px;">Foram detectados gatilhos comerciais no texto: <strong>${found.map(f => f.word).join(', ')}</strong>.</p>
      <small style="color: var(--text-secondary); display: block; line-height: 1.4;">A Meta pode reprovar a categoria <strong>UTILIDADE</strong> e forçar para <strong>MARKETING (~R$ 0,38)</strong>. Clique em <strong>"✨ Converter para Utilidade com IA"</strong> acima para transformar em alerta/status aceito.</small>
    `;
  } else {
    auditBox.style.background = 'rgba(129, 201, 149, 0.12)';
    auditBox.style.border = '1px solid rgba(129, 201, 149, 0.4)';
    auditBox.style.color = '#a7f3d0';
    auditBox.innerHTML = `
      <strong style="color: var(--google-green); display: block; margin-bottom: 2px;">🟢 Formato Seguro para UTILIDADE (~R$ 0,18):</strong>
      <small style="color: var(--text-secondary);">O texto está estruturado como notificação/alerta de serviço. Excelente probabilidade de aprovação com tarifa reduzida!</small>
    `;
  }
}

function updateMetaTemplatePreview() {
  const bodyInput = document.getElementById('meta-tpl-body');
  const previewText = document.getElementById('wa-meta-preview-text');
  if (!bodyInput || !previewText) return;

  const raw = bodyInput.value || '';
  if (!raw.trim()) {
    previewText.innerHTML = '<span style="color: rgba(233,237,239,0.45); font-style: italic;">Digite o texto ao lado para visualizar a formatação do template oficial...</span>';
    return;
  }

  let rendered = raw
    .replace(/\{\{1\}\}/g, 'Carlos')
    .replace(/\{\{2\}\}/g, 'https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo')
    .replace(/\{\{3\}\}/g, 'Copag / Pokémon TCG');

  previewText.innerHTML = formatWhatsAppMarkdown(rendered);
}

// Logs
async function loadLogs(refetch = true) {
  const terminal = document.getElementById('terminal-logs');
  const searchInput = document.getElementById('logs-search');
  const query = (searchInput?.value || '').toLowerCase().trim();

  try {
    if (refetch || !state.logs || state.logs.length === 0) {
      const res = await fetch('/api/bot/logs?limit=120');
      const { logs } = await res.json();
      state.logs = logs || [];
    }

    let list = state.logs;
    if (query) {
      list = list.filter(l => 
        (l.mensagem && l.mensagem.toLowerCase().includes(query)) ||
        (l.categoria && l.categoria.toLowerCase().includes(query)) ||
        (l.nivel && l.nivel.toLowerCase().includes(query))
      );
    }

    if (!list || list.length === 0) {
      terminal.innerHTML = '<div class="log-line info">[SISTEMA] Nenhum log corresponde ao filtro atual.</div>';
      return;
    }

    terminal.innerHTML = list.map(l => `
      <div class="log-line ${l.nivel}">
        <span class="text-muted">[${l.criado_em.split(' ')[1] || l.criado_em}]</span>
        <strong>[${l.categoria.toUpperCase()}]</strong> ${escapeHtml(l.mensagem)}
      </div>
    `).join('');
    terminal.scrollTop = terminal.scrollHeight;
  } catch (err) {
    terminal.innerHTML = `<div class="log-line error">Erro ao carregar logs: ${err.message}</div>`;
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'go-grupos') switchTab('grupos');
      if (action === 'go-campanhas') switchTab('campanhas');
      if (action === 'go-deepseek') switchTab('deepseek');
    });
  });

  // Connect WhatsApp Button
  document.getElementById('btn-connect-qr').addEventListener('click', async () => {
    const phone = document.getElementById('pairing-phone-input').value.trim();
    showToast('Iniciando conexão...', 'info');
    await fetch('/api/bot/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairingPhone: phone || undefined })
    });
  });

  // Disconnect WhatsApp Button
  document.getElementById('btn-disconnect').addEventListener('click', async () => {
    if (confirm('Deseja desconectar e resetar a sessão do WhatsApp?')) {
      await fetch('/api/bot/whatsapp/disconnect', { method: 'POST' });
      showToast('WhatsApp desconectado.', 'info');
    }
  });

  // Sync All
  document.getElementById('btn-sync-all').addEventListener('click', async () => {
    showToast('Sincronizando grupos e status...', 'info');
    await fetch('/api/bot/grupos/sync', { method: 'POST' });
    await loadStatus();
    showToast('Sincronização concluída!', 'success');
  });

  document.getElementById('btn-refresh-grupos').addEventListener('click', async () => {
    showToast('Sincronizando grupos...', 'info');
    await fetch('/api/bot/grupos/sync', { method: 'POST' });
    await loadGrupos(true);
    showToast('Grupos atualizados!', 'success');
  });

  // Live Search Filters
  document.getElementById('grupos-search')?.addEventListener('input', () => {
    loadGrupos(false);
  });

  document.getElementById('contatos-search')?.addEventListener('input', () => {
    loadContatos();
  });

  document.getElementById('campanhas-search')?.addEventListener('input', () => {
    loadCampanhas(false);
  });

  document.getElementById('logs-search')?.addEventListener('input', () => {
    loadLogs(false);
  });

  // Clear Contatos
  // Clear Contatos
  document.getElementById('btn-clear-contatos').addEventListener('click', async () => {
    if (confirm('Tem certeza que deseja apagar todos os contatos da base?')) {
      await fetch('/api/bot/contatos', { method: 'DELETE' });
      showToast('Base de contatos limpa.', 'warn');
      state.currentPasta = 'todos';
      await loadPastasLeads();
      await loadContatos();
      await loadStatus();
    }
  });

  // Exportar Excel
  document.getElementById('btn-export-excel')?.addEventListener('click', () => {
    exportarPasta(state.currentPasta, 'excel');
  });

  // Exportar Meta Ads
  document.getElementById('btn-export-meta')?.addEventListener('click', () => {
    exportarPasta(state.currentPasta, 'meta');
  });

  // Import Modal & Leitura de Planilha/Arquivo (.CSV ou .TXT)
  const modalImport = document.getElementById('modal-import');
  const importFileInput = document.getElementById('import-file');
  const importTextarea = document.getElementById('import-textarea');
  const importGrupoNome = document.getElementById('import-grupo-nome');

  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!importGrupoNome.value.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-\s]+/g, ' ').trim();
        importGrupoNome.value = cleanName;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        importTextarea.value = evt.target.result;
        showToast(`Arquivo "${file.name}" carregado com sucesso!`, 'info');
      };
      reader.readAsText(file);
    });
  }

  document.getElementById('btn-open-import').addEventListener('click', () => {
    modalImport.style.display = 'flex';
  });
  document.getElementById('btn-close-import-modal').addEventListener('click', () => {
    modalImport.style.display = 'none';
  });
  document.getElementById('btn-cancel-import').addEventListener('click', () => {
    modalImport.style.display = 'none';
  });
  document.getElementById('btn-confirm-import').addEventListener('click', async () => {
    const rawText = importTextarea.value.trim();
    const grupoNome = importGrupoNome.value.trim() || 'Importação Manual';
    if (!rawText) return alert('Insira ou suba ao menos um contato.');

    try {
      const res = await fetch('/api/bot/contatos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, grupoNome })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`${data.totalImported} contatos importados para a pasta "${grupoNome}"!`, 'success');
        modalImport.style.display = 'none';
        importTextarea.value = '';
        importGrupoNome.value = '';
        if (importFileInput) importFileInput.value = '';
        await loadPastasLeads();
        await loadContatos();
        await loadStatus();
      } else {
        alert(data.message || 'Erro ao importar contatos.');
      }
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  });

  // Nova Campanha Modal & Simulador WhatsApp Live
  const modalCampanha = document.getElementById('modal-campanha');

  function handleChannelToggle(canal) {
    const labelBaileys = document.getElementById('label-canal-baileys');
    const labelMeta = document.getElementById('label-canal-meta');
    const groupBaileys = document.getElementById('group-baileys-template-editor');
    const presetsContainer = document.getElementById('presets-container-campanha');
    const groupMeta = document.getElementById('group-meta-template-selection');

    if (canal === 'meta_cloud') {
      if (labelMeta) labelMeta.classList.add('active');
      if (labelBaileys) labelBaileys.classList.remove('active');
      if (groupBaileys) groupBaileys.style.display = 'none';
      if (presetsContainer) presetsContainer.style.display = 'none';
      if (groupMeta) groupMeta.style.display = 'block';

      handleMetaTemplateSelectionChange();
    } else {
      if (labelBaileys) labelBaileys.classList.add('active');
      if (labelMeta) labelMeta.classList.remove('active');
      if (groupBaileys) groupBaileys.style.display = 'block';
      if (presetsContainer) presetsContainer.style.display = 'block';
      if (groupMeta) groupMeta.style.display = 'none';

      updateWhatsAppPreview();
      updateMetaShieldAudit();
    }
  }

  function handleMetaTemplateSelectionChange() {
    const select = document.getElementById('camp-meta-template-select');
    const detailsBox = document.getElementById('camp-meta-template-details');
    const textElem = document.getElementById('wa-preview-text');
    if (!select) return;

    const selectedName = select.value;
    if (!selectedName) {
      if (detailsBox) detailsBox.style.display = 'none';
      if (textElem) textElem.innerHTML = '<span style="color: rgba(233,237,239,0.45); font-style: italic;">Selecione um template aprovado na Meta para ver a prévia...</span>';
      return;
    }

    const tpl = state.metaTemplates.find(t => t.nome === selectedName);
    if (!tpl) return;

    const isUtil = (tpl.categoria || '').toUpperCase() === 'UTILITY';
    if (detailsBox) {
      detailsBox.style.display = 'block';
      detailsBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="badge ${isUtil ? 'badge-utility' : 'badge-marketing'}">${isUtil ? 'UTILIDADE (~R$ 0,18)' : 'MARKETING (~R$ 0,38)'}</span>
          <span style="color: var(--google-green); font-weight: 600;">🟢 Aprovado pela Meta</span>
        </div>
        <div style="color: var(--text-secondary); line-height: 1.4;">${escapeHtml(tpl.corpo_texto)}</div>
      `;
    }

    if (textElem) {
      let rendered = (tpl.corpo_texto || '')
        .replace(/\{\{1\}\}/g, 'Carlos')
        .replace(/\{\{2\}\}/g, 'https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo')
        .replace(/\{\{3\}\}/g, 'Copag / Pokémon TCG');
      textElem.innerHTML = formatWhatsAppMarkdown(rendered);
    }
  }

  // Listeners de alternância de canal
  document.querySelectorAll('input[name="camp-canal-envio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      handleChannelToggle(e.target.value);
    });
  });
  document.getElementById('label-canal-baileys')?.addEventListener('click', () => {
    const radio = document.querySelector('input[name="camp-canal-envio"][value="baileys"]');
    if (radio) {
      radio.checked = true;
      handleChannelToggle('baileys');
    }
  });
  document.getElementById('label-canal-meta')?.addEventListener('click', () => {
    const radio = document.querySelector('input[name="camp-canal-envio"][value="meta_cloud"]');
    if (radio) {
      radio.checked = true;
      handleChannelToggle('meta_cloud');
    }
  });
  document.getElementById('camp-meta-template-select')?.addEventListener('change', handleMetaTemplateSelectionChange);

  window.openNovaCampanhaModal = async function(selectedTarget = 'todos') {
    const select = document.getElementById('camp-target');
    select.innerHTML = '<option value="todos">Todos os Contatos da Base Geral</option>';

    const searchInput = document.getElementById('camp-target-search');
    const counterSpan = document.getElementById('camp-target-counter');
    if (searchInput) searchInput.value = '';
    if (counterSpan) counterSpan.textContent = '';

    try {
      const [resPastas, resGrupos, resMeta] = await Promise.all([
        fetch('/api/bot/contatos/pastas').then(r => r.json()).catch(() => ({ pastas: [] })),
        fetch('/api/bot/grupos').then(r => r.json()).catch(() => ({ grupos: [] })),
        fetch('/api/bot/meta/templates').then(r => r.json()).catch(() => ({ templates: [] }))
      ]);

      if (resPastas && resPastas.pastas && resPastas.pastas.length > 0) {
        let optgroup = '<optgroup label="📁 Pastas e Lotes de Leads">';
        resPastas.pastas.forEach(p => {
          optgroup += `<option value="pasta:${escapeHtml(p.nome)}">📁 Pasta: ${escapeHtml(p.nome)} (${p.total} leads)</option>`;
        });
        optgroup += '</optgroup>';
        select.innerHTML += optgroup;
      }

      if (resGrupos && resGrupos.grupos && resGrupos.grupos.length > 0) {
        let optgroup = '<optgroup label="👥 Grupos do WhatsApp Conectado">';
        resGrupos.grupos.forEach(g => {
          optgroup += `<option value="grupo:${g.jid}">👥 Grupo: ${escapeHtml(g.nome)}</option>`;
        });
        optgroup += '</optgroup>';
        select.innerHTML += optgroup;
      }

      // Preencher seletor de templates Meta aprovados
      state.metaTemplates = resMeta.templates || [];
      const approved = state.metaTemplates.filter(t => t.status === 'APPROVED');
      const selectMeta = document.getElementById('camp-meta-template-select');
      if (selectMeta) {
        if (approved.length === 0) {
          selectMeta.innerHTML = '<option value="">⚠️ Nenhum template aprovado na Meta ainda (acesse a aba Meta Cloud)</option>';
        } else {
          selectMeta.innerHTML = '<option value="">-- Selecione um template aprovado na Meta --</option>' +
            approved.map(t => {
              const isUtil = (t.categoria || '').toUpperCase() === 'UTILITY';
              const label = isUtil ? `[UTILIDADE ~R$ 0,18] ${t.nome}` : `[MARKETING ~R$ 0,38] ${t.nome}`;
              return `<option value="${escapeHtml(t.nome)}">${escapeHtml(label)}</option>`;
            }).join('');
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar dados para campanha:', e);
    }

    if (selectedTarget) {
      select.value = selectedTarget;
    }

    // Default para canal Baileys
    const radioBaileys = document.querySelector('input[name="camp-canal-envio"][value="baileys"]');
    if (radioBaileys) {
      radioBaileys.checked = true;
      handleChannelToggle('baileys');
    }

    updateWhatsAppPreview();
    updateMetaShieldAudit();
    modalCampanha.style.display = 'flex';
  };

  document.getElementById('btn-open-nova-campanha').addEventListener('click', () => {
    openNovaCampanhaModal();
  });

  document.getElementById('btn-close-campanha-modal').addEventListener('click', () => {
    modalCampanha.style.display = 'none';
  });
  document.getElementById('btn-cancel-campanha').addEventListener('click', () => {
    modalCampanha.style.display = 'none';
  });

  // Fechar modal ao clicar fora (backdrop)
  modalCampanha?.addEventListener('click', (e) => {
    if (e.target === modalCampanha) {
      modalCampanha.style.display = 'none';
    }
  });
  modalImport?.addEventListener('click', (e) => {
    if (e.target === modalImport) {
      modalImport.style.display = 'none';
    }
  });

  // Fechar modal ao pressionar ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalCampanha) modalCampanha.style.display = 'none';
      if (modalImport) modalImport.style.display = 'none';
    }
  });

  // Alternância de abas de presets (Aquecimento Seguro vs Ofertas & Vendas)
  const tabAquecimento = document.getElementById('tab-presets-aquecimento');
  const tabVendas = document.getElementById('tab-presets-vendas');
  const panelAquecimento = document.getElementById('panel-presets-aquecimento');
  const panelVendas = document.getElementById('panel-presets-vendas');

  if (tabAquecimento && tabVendas && panelAquecimento && panelVendas) {
    tabAquecimento.addEventListener('click', () => {
      tabAquecimento.classList.add('active');
      tabVendas.classList.remove('active');
      panelAquecimento.style.display = 'block';
      panelVendas.style.display = 'none';
    });

    tabVendas.addEventListener('click', () => {
      tabVendas.classList.add('active');
      tabAquecimento.classList.remove('active');
      panelVendas.style.display = 'block';
      panelAquecimento.style.display = 'none';
    });
  }

  // Auditoria e Validação de Diretrizes Meta Shield (Anti-Ban)
  let lastMetaAuditResult = null;
  let metaAuditDebounceTimer = null;

  function updateMetaShieldAudit() {
    const templateInput = document.getElementById('camp-template');
    if (!templateInput) return;
    const template = templateInput.value || '';

    // Contagem rápida de variações Spintax no navegador
    const spintaxRegex = /\{([^{}]*?\|[^{}]*?)\}/g;
    let variations = 1;
    let hasSpintax = false;
    let match;
    while ((match = spintaxRegex.exec(template)) !== null) {
      hasSpintax = true;
      const count = match[1].split('|').length;
      if (count > 0) variations *= count;
    }
    const varElem = document.getElementById('meta-variations-count');
    if (varElem) {
      varElem.innerText = `🎲 ${hasSpintax ? variations : 1} variaç${(hasSpintax ? variations : 1) === 1 ? 'ão' : 'ões'}`;
    }

    // Debounce da validação completa no backend
    clearTimeout(metaAuditDebounceTimer);
    metaAuditDebounceTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/bot/templates/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template, isColdContact: true })
        });
        if (!res.ok) return;
        const data = await res.json();
        lastMetaAuditResult = data;
        renderMetaShieldUI(data);
      } catch (e) {
        console.warn('Falha na validação do Meta Shield:', e);
      }
    }, 200);
  }

  function renderMetaShieldUI(result) {
    const badge = document.getElementById('meta-shield-badge');
    const bar = document.getElementById('meta-score-bar');
    const infracoesList = document.getElementById('meta-infracoes-list');
    const dicaBox = document.getElementById('meta-dica-text');

    if (!badge || !bar) return;

    // Atualizar Score e Nível de Risco
    bar.style.width = `${result.score}%`;
    bar.className = 'meta-score-fill ' + (result.score >= 80 ? 'score-high' : result.score >= 60 ? 'score-medium' : 'score-low');

    badge.className = 'meta-shield-badge ' + (result.nivelRisco === 'seguro' ? 'badge-seguro' : result.nivelRisco === 'moderado' ? 'badge-moderado' : 'badge-alto_risco');
    badge.innerText = result.nivelRisco === 'seguro'
      ? `🟢 Seguro (${result.score}%)`
      : result.nivelRisco === 'moderado'
      ? `🟡 Atenção (${result.score}%)`
      : `🔴 Alto Risco (${result.score}%)`;

    // Renderizar Infrações Detectadas
    if (infracoesList) {
      if (result.infracoes && result.infracoes.length > 0) {
        infracoesList.style.display = 'flex';
        infracoesList.innerHTML = result.infracoes.map(i => `
          <div class="meta-infracao-item infracao-${i.severidade}">
            <strong>${i.severidade === 'critico' ? '⛔' : i.severidade === 'alerta' ? '⚠️' : 'ℹ️'} ${escapeHtml(i.titulo)}</strong>
            <small>${escapeHtml(i.descricao)}</small>
            <small style="margin-top: 2px; color: rgba(255,255,255,0.9); font-weight: 500;">👉 ${escapeHtml(i.sugestao)}</small>
          </div>
        `).join('');
      } else {
        infracoesList.style.display = 'none';
        infracoesList.innerHTML = '';
      }
    }

    // Dica Contextual
    if (dicaBox) {
      dicaBox.innerText = (result.dicas && result.dicas[0]) || '💡 Dica Pro: Mensagens que parecem conversas naturais entre amigos possuem taxa de banimento próxima de zero.';
    }
  }

  // Listeners de digitação para o preview ao vivo do WhatsApp e Meta Shield
  document.getElementById('camp-template')?.addEventListener('input', () => {
    updateWhatsAppPreview();
    updateMetaShieldAudit();
  });
  document.getElementById('camp-media')?.addEventListener('input', updateWhatsAppPreview);
  document.getElementById('btn-shuffle-spintax')?.addEventListener('click', () => {
    updateWhatsAppPreview();
    updateMetaShieldAudit();
  });

  // Botão Otimizar com IA (DeepSeek Meta Shield)
  const btnOptimizeMetaAi = document.getElementById('btn-optimize-meta-ai');
  if (btnOptimizeMetaAi) {
    btnOptimizeMetaAi.addEventListener('click', async () => {
      const templateInput = document.getElementById('camp-template');
      const text = templateInput ? templateInput.value.trim() : '';
      if (!text) {
        return alert('Digite ou escolha uma mensagem primeiro para a IA otimizar.');
      }

      btnOptimizeMetaAi.disabled = true;
      btnOptimizeMetaAi.innerText = '✨ Otimizando...';

      try {
        const res = await fetch('/api/bot/templates/optimize-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: text })
        });
        const data = await res.json();
        if (data.ok && data.optimizedTemplate) {
          templateInput.value = data.optimizedTemplate;
          updateWhatsAppPreview();
          updateMetaShieldAudit();
          showToast('Template blindado com sucesso pelas diretrizes da Meta!', 'success');
        } else {
          alert(data.error || 'Falha ao otimizar template com IA.');
        }
      } catch (err) {
        alert(`Erro ao conectar com a IA: ${err.message}`);
      } finally {
        btnOptimizeMetaAi.disabled = false;
        btnOptimizeMetaAi.innerText = '✨ Otimizar com IA';
      }
    });
  }

  // Modelos Prontos Pokémon TCG de Alta Conversão
  const PRESET_TEMPLATES = {
    // 1. De Fã para Fã: Apresentação Pessoal do Eduardo
    'aquecimento-fa-pra-fa': {
      nome: 'Aquecimento: De Fã para Fã',
      template: `{Olá|Oi|Fala|E aí} {nome}! {{saudacao}|Tudo bem|Como você tá}? Aqui é o Eduardo! 😊\n\n{Vi seu contato|Achei você|Vi você} no grupo {grupo}. {Como também sou colecionador e fãzaço de Pokémon TCG|Também curto colecionar e jogar Pokémon}, montei um grupo bem legal {feito de verdade de um fã para outros fãs|criado de coração de fã pra fã}, sem enrolação e sem spam, só com dicas e alertas das melhores ofertas e estoques.\n\n{Posso te fazer um convite para o meu grupo?|Queria saber se posso te fazer um convite para entrar no meu grupo?}\n\nSe você curtir, me dá um toque aqui que te passo o link! {Valeu|Abraço|Tamo junto}! ⚡`,
      media: ''
    },
    // 2. Papo de Colecionador & Convite Gentil
    'aquecimento-conversa-leve': {
      nome: 'Aquecimento: Papo de Colecionador',
      template: `{{saudacao}|Oi|Opa|Fala} {nome}, {tudo certo|tudo bem|tudo joia}? Tudo tranquilo por aí?\n\nAqui é o Eduardo! {Notei que você tá|Vi que você também participa} no grupo {grupo}. Passando só pra dar um alô: criei uma comunidade no WhatsApp {feita de fã para fãs|criada de fã pra fã de coração}, onde a gente se ajuda a encontrar cartas, fichários e boosters com preços justos de verdade.\n\n{Posso te fazer um convite para meu grupo?|Será que posso te fazer um convite pro meu grupo?}\n\nSe fizer sentido pra você, só me responder aqui que te mando o link na hora! {Um abraço|Valeu demais}! 🎴`,
      media: ''
    },
    // 3. Espaço de Fã para Fã (Sem Spams)
    'aquecimento-comunidade-vip': {
      nome: 'Aquecimento: Comunidade Sem Spam',
      template: `{Fala|Oi|Olá|Opa} {nome}! {Tudo bem|Como você tá|Beleza}? Aqui é o Eduardo! 🤝\n\n{Como te vi no grupo {grupo}, lembrei de te mandar uma mensagem rápida|Vi seu contato lá no {grupo}}! Eu sou apaixonado por Pokémon TCG desde criança e resolvi juntar uma galera bacana num grupo novo, {totalmente feito de um fã para fãs|feito de fã pra fã de colecionador}, focado em economizar nas compras e trocar experiências.\n\n{Posso te fazer um convite para o meu grupo?|Queria saber se posso te fazer um convite pro meu grupo?}\n\n{Me responde com um "sim" ou me dá um alô aqui que te envio o link|Se quiser participar, só me avisar aqui}! {Abraço|Valeu}! ✨`,
      media: ''
    },
    // 4. Mega-Spintax Super Humano & De Fã para Fãs
    'aquecimento-mega-humano': {
      nome: 'Aquecimento: Mega-Spintax Humano',
      template: `{{saudacao}|{Olá|Oi|Fala|E aí}} {nome}! {{Tudo bem|Tudo certo|Como você tá}?|☀️} Aqui é o Eduardo!\n\n{Vi seu contato|Te achei|Notei que você tá} {no grupo {grupo}|através do {grupo}|no grupo de Pokémon}. Eu {coleciono|sou muito fã de} cartas de Pokémon e acabei de criar um grupo {muito especial|fechado|exclusivo} {feito de um fã para fãs|criado de fã pra fã de verdade}.\n\nA ideia é avisar dos menores preços e novidades antes de esgotar, sem flood. {Posso te fazer um convite para meu grupo?|Queria te perguntar se posso te fazer um convite para entrar no meu grupo?}\n\n{Se topar, me dá um salve aqui|Se você quiser, é só me responder aqui|Qualquer coisa me dá um alô} que já te passo o link! {Valeu demais|Forte abraço|Até mais}! ⚡`,
      media: ''
    },
    // 5. Pergunta & Convite de Fã
    'aquecimento-pergunta-direta': {
      nome: 'Aquecimento: Pergunta & Convite de Fã',
      template: `{Opa|Oi|Olá} {nome}! {Tudo joia|Tudo tranquilo}? Aqui é o Eduardo! 👋\n\n{Tava olhando os membros do {grupo}|Vi você no grupo {grupo}} e resolvi te mandar um oi. Como colecionador assíduo de Pokémon TCG, criei um espaço bem acolhedor, {100% feito de um fã para fãs|feito de coração de fã pra fã}, pra gente se ajudar com promoções reais do Mercado Livre Full e novidades de Copag.\n\n{Posso te fazer um convite para o meu grupo?|Queria saber se posso te fazer um convite pra participar com a gente?}\n\nSe você puder me responder se quer receber o link, te mando em seguida! {Abraço e boas aberturas de cartas|Valeu|Um ótimo dia pra você}! 📦✨`,
      media: ''
    },
    // Modelos de Ofertas & Vendas
    'convite-grupo': {
      nome: 'Convite Grupo VIP Pokémon TCG',
      template: `{Olá|Fala|Oi} {nome}! {Tudo bem com você|Como estão as coisas}? Vi seu contato no grupo {grupo}! 🎴⚡\n\nCriei um grupo VIP exclusivo onde solto diariamente promoções com até *50% OFF* em Boosters, Boxes, Decks e Fichários (a maioria com frete Full grátis no Mercado Livre)!\n\nSe você curte colecionar ou jogar e quer pegar as melhores ofertas antes de esgotar, entra por aqui:\n👉 https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo\n\nTe espero lá!`,
      media: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png'
    },
    'promocao-boxes': {
      nome: 'Oferta Relâmpago Boxes & Copag',
      template: `{Fala|Oi|E aí} {nome}! {Tudo certo|Beleza}? Passando rápido para te avisar que liberaram uma *promoção relâmpago* de Pokémon TCG hoje com estoque limitado! 🔥\n\nTem Booster Box, Coleções de Treinador Avançado e Blisters com preços bem abaixo da tabela oficial!\n\nDá uma olhada aqui na nossa vitrine oficial:\n🔗 https://mercadolivre.com/sec/2rM6RPm\n\nSe tiver qualquer dúvida sobre as cartas ou envio, pode me responder por aqui!`,
      media: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png'
    },
    'acessorios': {
      nome: 'Ofertas Fichários e Sleeves',
      template: `{Olá|Oi} {nome}! {Tudo bem|Como vai}? Se você estiver precisando organizar sua coleção ou proteger suas cartas raras, acabaram de liberar descontos em *Fichários 360 cartas, Sleeves e Deck Boxes*! 📦✨\n\nPreços a partir de R$ 35 com envio imediato no Mercado Livre Full!\nConfere aqui: https://mercadolivre.com/sec/2rM6RPm\n\nAbraço e boas aberturas de boosters! ⚡`,
      media: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/130.png'
    }
  };

  // Botão de Sortear Frase Amigável de Aquecimento
  const btnRandomWarmup = document.getElementById('btn-random-warmup');
  if (btnRandomWarmup) {
    btnRandomWarmup.addEventListener('click', () => {
      const warmupKeys = [
        'aquecimento-fa-pra-fa',
        'aquecimento-conversa-leve',
        'aquecimento-comunidade-vip',
        'aquecimento-mega-humano',
        'aquecimento-pergunta-direta'
      ];
      const randomKey = warmupKeys[Math.floor(Math.random() * warmupKeys.length)];
      const preset = PRESET_TEMPLATES[randomKey];
      if (preset) {
        document.getElementById('camp-template').value = preset.template;
        const nomeInput = document.getElementById('camp-nome');
        if (nomeInput && (!nomeInput.value.trim() || nomeInput.value.startsWith('Aquecimento') || nomeInput.value.startsWith('Convite') || nomeInput.value.startsWith('Oferta'))) {
          nomeInput.value = preset.nome;
        }
        document.getElementById('camp-media').value = '';
        updateWhatsAppPreview();
        updateMetaShieldAudit();
        showToast(`🎲 Sorteado: "${preset.nome}"`, 'info');
      }
    });
  }

  // Click nos cards de modelos prontos
  document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const presetKey = card.dataset.preset;
      const preset = PRESET_TEMPLATES[presetKey];
      if (!preset) return;

      const nomeInput = document.getElementById('camp-nome');
      const templateInput = document.getElementById('camp-template');
      const mediaInput = document.getElementById('camp-media');

      if (templateInput) templateInput.value = preset.template;
      if (nomeInput && (!nomeInput.value.trim() || nomeInput.value.startsWith('Convite') || nomeInput.value.startsWith('Oferta') || nomeInput.value.startsWith('Aquecimento'))) {
        nomeInput.value = preset.nome;
      }
      if (mediaInput) mediaInput.value = preset.media || '';

      updateWhatsAppPreview();
      updateMetaShieldAudit();
      showToast(`Modelo "${preset.nome}" aplicado!`, 'info');
    });
  });

  // Click tag to insert in template and update preview
  document.querySelectorAll('.tags-hint code').forEach(code => {
    code.addEventListener('click', () => {
      const textarea = document.getElementById('camp-template');
      textarea.value += code.innerText;
      textarea.focus();
      updateWhatsAppPreview();
      updateMetaShieldAudit();
    });
  });

  document.getElementById('btn-save-campanha').addEventListener('click', async () => {
    const nome = document.getElementById('camp-nome').value.trim();
    const targetVal = document.getElementById('camp-target').value;
    const media = document.getElementById('camp-media').value.trim();
    const canalEnvio = document.querySelector('input[name="camp-canal-envio"]:checked')?.value || 'baileys';

    if (!nome) return alert('Por favor, informe o nome da campanha.');

    let template = '';
    let metaTemplateNome = undefined;
    let forceRiskApproval = false;

    if (canalEnvio === 'meta_cloud') {
      const selectMeta = document.getElementById('camp-meta-template-select');
      metaTemplateNome = selectMeta?.value;
      if (!metaTemplateNome) {
        return alert('Por favor, selecione um template aprovado na Meta para criar campanha via WhatsApp Oficial.');
      }
      const tpl = state.metaTemplates.find(t => t.nome === metaTemplateNome);
      template = tpl?.corpo_texto || metaTemplateNome;
    } else {
      template = document.getElementById('camp-template').value.trim();
      if (!template) return alert('Por favor, informe o modelo da mensagem com Spintax.');

      // Trava do Meta Shield contra banimento no chip
      if (lastMetaAuditResult && lastMetaAuditResult.nivelRisco === 'alto_risco') {
        const confirmForce = confirm(
          '⚠️ ALERTA DO META SHIELD ANTI-BAN:\n\n' +
          `Este template foi classificado como ALTO RISCO DE BANIMENTO (Score: ${lastMetaAuditResult.score}%).\n\n` +
          'Ele contém violações graves (como gatilhos de spam ou ausência de Spintax) que podem derrubar seu chip no WhatsApp.\n\n' +
          'Recomendamos clicar em "✨ Otimizar com IA" para blindar o texto.\n\n' +
          'Deseja forçar o envio mesmo assim por sua conta e risco?'
        );
        if (!confirmForce) return;
        forceRiskApproval = true;
      }
    }

    let targetType = 'todos';
    let targetGroupJid = null;
    let targetPastaNome = null;

    if (targetVal.startsWith('grupo:')) {
      targetType = 'grupo';
      targetGroupJid = targetVal.replace('grupo:', '');
    } else if (targetVal.startsWith('pasta:')) {
      targetType = 'pasta';
      targetPastaNome = targetVal.replace('pasta:', '');
    }

    try {
      const res = await fetch('/api/bot/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          mensagemTemplate: template,
          canalEnvio,
          metaTemplateNome,
          targetType,
          targetGroupJid,
          targetPastaNome,
          mediaPath: media || undefined,
          forceRiskApproval
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Campanha criada com ${data.totalDestinatarios} mensagens! Canal: ${canalEnvio === 'meta_cloud' ? 'Meta Cloud Oficial ⚡' : 'Chip Baileys 📱'}`, 'success');
        modalCampanha.style.display = 'none';
        document.getElementById('camp-nome').value = '';
        document.getElementById('camp-template').value = '';
        document.getElementById('camp-media').value = '';
        loadCampanhas(true);
      } else {
        alert(data.error || data.message || 'Erro ao criar campanha.');
      }
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  });

  // Save DeepSeek Configs
  // Atalhos rápidos para seleção de gateway de IA
  document.querySelectorAll('.ai-gateway-quick').forEach((tag) => {
    tag.addEventListener('click', () => {
      const url = tag.getAttribute('data-url');
      if (url) {
        document.getElementById('deepseek-url-input').value = url;
        showToast(`Gateway selecionado: ${url}`, 'info');
      }
    });
  });

  // Atalhos rápidos para seleção de modelo de IA
  document.querySelectorAll('.ai-model-quick').forEach((tag) => {
    tag.addEventListener('click', () => {
      const model = tag.getAttribute('data-model');
      if (model) {
        document.getElementById('deepseek-model-input').value = model;
        showToast(`Modelo selecionado: ${model}`, 'info');
      }
    });
  });

  document.getElementById('btn-save-deepseek').addEventListener('click', () => {
    saveConfigs({
      deepseek_ativo: document.getElementById('deepseek-ativo-toggle').checked ? 'true' : 'false',
      deepseek_api_key: document.getElementById('deepseek-key-input').value.trim(),
      deepseek_base_url: document.getElementById('deepseek-url-input').value.trim(),
      deepseek_model: document.getElementById('deepseek-model-input').value.trim(),
      deepseek_prompt_sistema: document.getElementById('deepseek-prompt-textarea').value.trim(),
      deepseek_delay_min: document.getElementById('deepseek-delay-min').value,
      deepseek_delay_max: document.getElementById('deepseek-delay-max').value
    });
  });

  // Test DeepSeek / OpenCode
  document.getElementById('btn-test-deepseek').addEventListener('click', async () => {
    const input = document.getElementById('deepseek-test-input').value.trim();
    const output = document.getElementById('deepseek-test-output');
    output.style.display = 'block';
    output.innerText = 'Pensando com IA... Aguarde...';

    const apiKey = document.getElementById('deepseek-key-input').value.trim();
    const baseUrl = document.getElementById('deepseek-url-input').value.trim();
    const model = document.getElementById('deepseek-model-input').value.trim();
    const promptSistema = document.getElementById('deepseek-prompt-textarea').value.trim();

    try {
      const res = await fetch('/api/bot/deepseek/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input || undefined,
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || undefined,
          model: model || undefined,
          promptSistema: promptSistema || undefined
        })
      });
      const data = await res.json();
      if (data.ok) {
        output.innerHTML = `<strong>Resposta da IA:</strong>\n${data.resposta}`;
      } else {
        output.innerText = `Erro: ${data.message}`;
      }
    } catch (err) {
      output.innerText = `Erro de conexão: ${err.message}`;
    }
  });

  // Save Anti-Ban & Human Factor Configs
  document.getElementById('btn-save-configs').addEventListener('click', () => {
    saveConfigs({
      disparo_delay_min: document.getElementById('cfg-delay-min').value || '15',
      disparo_delay_max: document.getElementById('cfg-delay-max').value || '45',
      disparo_simular_digitacao: document.getElementById('cfg-simular-digitacao')?.checked ? 'true' : 'false',
      disparo_presenca_tipo: document.getElementById('cfg-presenca-tipo')?.value || 'auto',
      disparo_digitacao_min: document.getElementById('cfg-digitacao-min')?.value || '3',
      disparo_digitacao_max: document.getElementById('cfg-digitacao-max')?.value || '10',
      aquecimento_ativo: document.getElementById('cfg-aquecimento-ativo')?.checked ? 'true' : 'false',
      aquecimento_inicio_diario: document.getElementById('cfg-aquecimento-inicio')?.value || '20',
      aquecimento_incremento_diario: document.getElementById('cfg-aquecimento-incremento')?.value || '5',
      aquecimento_limite_maximo: document.getElementById('cfg-aquecimento-teto')?.value || '100',
      disparo_pausa_a_cada: document.getElementById('cfg-pausa-cada')?.value || '50',
      disparo_pausa_minutos_min: document.getElementById('cfg-pausa-minutos-min')?.value || '30',
      disparo_pausa_minutos_max: document.getElementById('cfg-pausa-minutos-max')?.value || '60',
      disparo_horario_inicio: document.getElementById('cfg-hora-inicio')?.value || '08:00',
      disparo_horario_fim: document.getElementById('cfg-hora-fim')?.value || '21:30',
      disparo_limite_diario: document.getElementById('cfg-limite-diario')?.value || '100'
    });
  });

  // Reset Warmup Button
  const btnResetWarmup = document.getElementById('btn-reset-warmup');
  if (btnResetWarmup) {
    btnResetWarmup.addEventListener('click', async () => {
      if (confirm('Deseja reiniciar a contagem de aquecimento do chip para o Dia 1 a partir de hoje?')) {
        try {
          const res = await fetch('/api/bot/warmup/reset', { method: 'POST' });
          const data = await res.json();
          if (data.ok) {
            showToast('Aquecimento reiniciado para o Dia 1 com sucesso!', 'success');
            loadConfigs();
            loadStatus();
          }
        } catch (err) {
          showToast(`Erro ao reiniciar aquecimento: ${err.message}`, 'error');
        }
      }
    });
  }

  // Refresh Logs Button
  document.getElementById('btn-refresh-logs').addEventListener('click', loadLogs);

  // Logout Button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('Deseja realmente sair do Disparador Pro?')) {
        try {
          await fetch('/api/bot/auth/logout', { method: 'POST' });
        } catch {}
        window.location.href = '/login.html';
      }
    });
  }

  // ==========================================
  // Eventos Meta Cloud API Oficial & Templates
  // ==========================================
  const modalMetaTemplate = document.getElementById('modal-meta-template');

  function openMetaTemplateModal() {
    if (modalMetaTemplate) {
      modalMetaTemplate.style.display = 'flex';
      const nameInput = document.getElementById('meta-tpl-name');
      const catSelect = document.getElementById('meta-tpl-category');
      const bodyText = document.getElementById('meta-tpl-body');
      const exInput = document.getElementById('meta-tpl-example');
      const presetSelect = document.getElementById('meta-preset-selector');

      if (nameInput) nameInput.value = '';
      if (catSelect) catSelect.value = 'UTILITY';
      if (bodyText) bodyText.value = '';
      if (exInput) exInput.value = '';
      if (presetSelect) presetSelect.value = '';

      updateMetaTemplatePreview();
      auditUtilitySafetyLive('');
    }
  }

  function closeMetaTemplateModal() {
    if (modalMetaTemplate) modalMetaTemplate.style.display = 'none';
  }

  document.getElementById('btn-open-meta-template-modal')?.addEventListener('click', openMetaTemplateModal);
  document.getElementById('btn-close-meta-template-modal')?.addEventListener('click', closeMetaTemplateModal);
  document.getElementById('btn-cancel-meta-template')?.addEventListener('click', closeMetaTemplateModal);
  modalMetaTemplate?.addEventListener('click', (e) => {
    if (e.target === modalMetaTemplate) closeMetaTemplateModal();
  });

  // Salvar Credenciais Meta
  document.getElementById('btn-save-meta-config')?.addEventListener('click', async () => {
    const ativo = document.getElementById('meta-cloud-ativo-toggle')?.checked || false;
    const token = document.getElementById('meta-token-input')?.value.trim();
    const wabaId = document.getElementById('meta-waba-id-input')?.value.trim();
    const phoneNumberId = document.getElementById('meta-phone-id-input')?.value.trim();
    const apiVersion = document.getElementById('meta-api-version-input')?.value.trim() || 'v21.0';

    try {
      const res = await fetch('/api/bot/meta/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo, token, wabaId, phoneNumberId, apiVersion })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Credenciais da Meta Cloud API salvas com sucesso!', 'success');
        loadMetaCloudData();
      } else {
        showToast(data.message || 'Erro ao salvar credenciais.', 'error');
      }
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
    }
  });

  // Testar Conexão Oficial Meta
  document.getElementById('btn-test-meta-connection')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-test-meta-connection');
    const token = document.getElementById('meta-token-input')?.value.trim();
    const phoneNumberId = document.getElementById('meta-phone-id-input')?.value.trim();
    const apiVersion = document.getElementById('meta-api-version-input')?.value.trim() || 'v21.0';

    btn.disabled = true;
    btn.innerText = '⚡ Testando...';

    try {
      const res = await fetch('/api/bot/meta/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phoneNumberId, apiVersion })
      });
      const data = await res.json();
      const badge = document.getElementById('meta-connection-badge');
      if (data.ok) {
        showToast(`Conexão Oficial com a Meta bem-sucedida! Número verificado: ${data.data?.display_phone_number || ''}`, 'success');
        if (badge) {
          badge.className = 'badge badge-approved';
          badge.innerText = '🟢 Conectado Oficial';
        }
      } else {
        showToast(data.message || 'Falha na conexão com a Meta.', 'error');
        if (badge) {
          badge.className = 'badge badge-rejected';
          badge.innerText = '🔴 Erro de Conexão';
        }
      }
    } catch (err) {
      showToast(`Erro ao testar: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '⚡ Testar Conexão Oficial';
    }
  });

  // Sincronizar Templates com a Meta
  document.getElementById('btn-sync-meta-templates')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync-meta-templates');
    btn.disabled = true;
    btn.innerText = '🔄 Sincronizando...';

    try {
      const res = await fetch('/api/bot/meta/templates/sync', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast(`Sucesso! ${data.count} templates sincronizados da Meta!`, 'success');
        await loadMetaCloudData();
      } else {
        showToast(data.message || 'Erro ao sincronizar templates com a Meta.', 'error');
      }
    } catch (err) {
      showToast(`Erro na sincronização: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '🔄 Sincronizar com a Meta';
    }
  });

  // Listener Preset de Template
  document.getElementById('meta-preset-selector')?.addEventListener('change', (e) => {
    const key = e.target.value;
    if (!key) return;
    const preset = state.metaPresets.find(p => p.name === key);
    if (preset) {
      document.getElementById('meta-tpl-name').value = preset.name;
      document.getElementById('meta-tpl-category').value = preset.category;
      document.getElementById('meta-tpl-body').value = preset.body;
      document.getElementById('meta-tpl-example').value = preset.exampleValues.join(', ');
      updateMetaTemplatePreview();
      auditUtilitySafetyLive(preset.body);
      showToast(`Preset "${preset.name}" carregado!`, 'info');
    }
  });

  // Listener Digitação Corpo do Template
  document.getElementById('meta-tpl-body')?.addEventListener('input', (e) => {
    updateMetaTemplatePreview();
    auditUtilitySafetyLive(e.target.value);
  });

  // Sanitização automática do nome do template (letras minúsculas e underline)
  document.getElementById('meta-tpl-name')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
  });

  // Botão Converter para Utilidade com IA
  document.getElementById('btn-meta-optimize-utility')?.addEventListener('click', async () => {
    const bodyInput = document.getElementById('meta-tpl-body');
    const text = bodyInput?.value.trim();
    if (!text) {
      return alert('Digite ou cole uma mensagem comercial antes para a IA otimizar.');
    }

    const btn = document.getElementById('btn-meta-optimize-utility');
    btn.disabled = true;
    btn.innerText = '✨ Otimizando com IA...';

    try {
      const res = await fetch('/api/bot/meta/templates/optimize-utility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.ok && data.optimizedText) {
        bodyInput.value = data.optimizedText;
        updateMetaTemplatePreview();
        auditUtilitySafetyLive(data.optimizedText);
        showToast('Template otimizado como Notificação de Utilidade oficial!', 'success');
      } else {
        showToast(data.message || 'Falha ao otimizar template.', 'error');
      }
    } catch (err) {
      showToast(`Erro na IA: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '✨ Converter para Utilidade com IA';
    }
  });

  // Botão Submeter para a Meta
  document.getElementById('btn-submit-meta-template')?.addEventListener('click', async () => {
    const name = document.getElementById('meta-tpl-name')?.value.trim();
    const category = document.getElementById('meta-tpl-category')?.value;
    const bodyText = document.getElementById('meta-tpl-body')?.value.trim();
    const exampleInput = document.getElementById('meta-tpl-example')?.value.trim();

    if (!name || !bodyText) {
      return alert('Preencha o nome do template e o corpo do texto.');
    }

    const exampleValues = exampleInput ? exampleInput.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const btn = document.getElementById('btn-submit-meta-template');
    btn.disabled = true;
    btn.innerText = '🚀 Submetendo à Meta...';

    try {
      const res = await fetch('/api/bot/meta/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          language: 'pt_BR',
          bodyText,
          exampleValues
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Template "${name}" submetido com sucesso! Status inicial: ${data.data?.status || 'PENDING'}`, 'success');
        closeMetaTemplateModal();
        loadMetaCloudData();
      } else {
        alert(`Erro na validação da Meta:\n\n${data.message || 'Falha ao submeter template.'}`);
      }
    } catch (err) {
      alert(`Erro de conexão com o servidor: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerText = '🚀 Submeter para a Meta';
    }
  });

  // ==========================================
  // MÓDULO DE FINANÇAS & CONTROLE META ADS
  // ==========================================

  function formatCurrency(val) {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatNumber(val) {
    return Number(val || 0).toLocaleString('pt-BR');
  }

  function formatMonthName(isoMonth) {
    if (!isoMonth || !isoMonth.includes('-')) return isoMonth || 'Mês Atual';
    const [ano, mes] = isoMonth.split('-');
    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const idx = parseInt(mes, 10) - 1;
    return `${mesesNomes[idx] || mes} de ${ano}`;
  }

  function getMesAtualIso() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
  }

  async function loadFinancasData(mesDesejado) {
    try {
      // 1. Buscar lista de meses com histórico
      const resMeses = await fetch('/api/bot/financas/meses').then(r => r.json()).catch(() => ({ meses: [] }));
      state.financas.meses = resMeses.meses || [];

      // Determinar mês ativo
      if (mesDesejado) {
        state.financas.mesAtivo = mesDesejado;
      } else if (!state.financas.mesAtivo) {
        if (state.financas.meses.length > 0) {
          state.financas.mesAtivo = state.financas.meses[0];
        } else {
          state.financas.mesAtivo = getMesAtualIso();
        }
      }

      // 2. Buscar uploads arquivados, relatório mensal consolidado e balanço DRE com reinvestimento
      const [resUploads, resRelatorio, resBalanco] = await Promise.all([
        fetch(`/api/bot/financas/uploads?mes=${encodeURIComponent(state.financas.mesAtivo)}`).then(r => r.json()).catch(() => ({ uploads: [] })),
        fetch(`/api/bot/financas/relatorio?mes=${encodeURIComponent(state.financas.mesAtivo)}`).then(r => r.json()).catch(() => ({ relatorio: null })),
        fetch(`/api/bot/financas/balanco?mes=${encodeURIComponent(state.financas.mesAtivo)}`).then(r => r.json()).catch(() => ({ balanco: null }))
      ]);

      state.financas.uploads = resUploads.uploads || [];
      state.financas.relatorio = resRelatorio.relatorio || null;
      state.financas.balanco = resBalanco.balanco || null;

      renderBalancoUI();
      renderFinancasUI();
    } catch (err) {
      console.warn('Erro ao carregar dados financeiros:', err);
      showToast(`Erro ao carregar finanças: ${err.message}`, 'error');
    }
  }

  function renderFinancasUI() {
    const mesAtivo = state.financas.mesAtivo || getMesAtualIso();
    const mesFormatado = formatMonthName(mesAtivo);

    // 1. Atualizar Seletor de Meses
    const selectMes = document.getElementById('financas-mes-select');
    if (selectMes) {
      let optionsHtml = '';
      const listaMeses = [...state.financas.meses];
      if (!listaMeses.includes(mesAtivo)) {
        listaMeses.unshift(mesAtivo);
      }

      listaMeses.forEach(m => {
        optionsHtml += `<option value="${m}" ${m === mesAtivo ? 'selected' : ''}>📅 ${formatMonthName(m)} (${m})</option>`;
      });

      selectMes.innerHTML = optionsHtml;
    }

    // Atualizar campo de mês do formulário de upload
    const inputMesUpload = document.getElementById('financas-mes-input');
    if (inputMesUpload && !inputMesUpload.value) {
      inputMesUpload.value = mesAtivo;
    }

    // Labels de mês
    const badgeLabel = document.getElementById('financas-mes-badge-label');
    if (badgeLabel) badgeLabel.innerText = mesFormatado;

    const relatorioTitulo = document.getElementById('financas-relatorio-titulo');
    if (relatorioTitulo) relatorioTitulo.innerText = `📊 Desempenho Financeiro e de Tráfego · ${mesFormatado}`;

    // 2. Atualizar KPIs Executivos
    const rel = state.financas.relatorio;
    const kpis = rel?.kpis || {
      gastoTotal: 0,
      leadsTotal: 0,
      custoPorLeadMedio: 0,
      impressoesTotal: 0,
      cliquesTotal: 0,
      ctrMedio: 0,
      cpcMedio: 0,
      cpmMedio: 0,
      qtdUploads: state.financas.uploads.length,
      qtdCampanhasDistintas: 0
    };

    document.getElementById('financas-kpi-gasto').innerText = formatCurrency(kpis.gastoTotal);
    document.getElementById('financas-kpi-uploads-count').innerText = `${kpis.qtdUploads} planilha(s) semanal(is) arquivada(s)`;

    document.getElementById('financas-kpi-leads').innerText = formatNumber(kpis.leadsTotal);
    document.getElementById('financas-kpi-campanhas-count').innerText = `${kpis.qtdCampanhasDistintas} campanha(s) analisada(s) no mês`;

    document.getElementById('financas-kpi-cpl').innerText = formatCurrency(kpis.custoPorLeadMedio);

    const cplBadge = document.getElementById('financas-kpi-cpl-badge');
    if (cplBadge) {
      if (kpis.leadsTotal === 0) {
        cplBadge.innerText = 'Sem leads registrados';
        cplBadge.style.color = 'var(--text-muted)';
      } else if (kpis.custoPorLeadMedio <= 5) {
        cplBadge.innerText = '🟢 CPL Excelente (Abaixo de R$ 5,00)';
        cplBadge.style.color = '#4ade80';
      } else if (kpis.custoPorLeadMedio <= 12) {
        cplBadge.innerText = '🟡 CPL Moderado / Saudável';
        cplBadge.style.color = '#facc15';
      } else {
        cplBadge.innerText = '🔴 CPL Alto (Atenção ao criativo/público)';
        cplBadge.style.color = '#f87171';
      }
    }

    document.getElementById('financas-kpi-cliques').innerText = `${formatNumber(kpis.cliquesTotal)} cliques`;
    document.getElementById('financas-kpi-ctr-cpc').innerText = `CTR: ${kpis.ctrMedio}% • CPC: ${formatCurrency(kpis.cpcMedio)} • CPM: ${formatCurrency(kpis.cpmMedio)}`;

    // 3. Renderizar Tabela de Uploads Arquivados
    const tbodyUploads = document.getElementById('financas-uploads-tbody');
    const badgeArquivos = document.getElementById('badge-total-arquivos');
    const uploads = state.financas.uploads || [];

    if (badgeArquivos) {
      badgeArquivos.innerText = `${uploads.length} arquivo${uploads.length === 1 ? '' : 's'}`;
    }

    if (tbodyUploads) {
      if (uploads.length === 0) {
        tbodyUploads.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 36px 20px;">
              📁 Nenhum arquivo arquivado para <strong>${mesFormatado}</strong>.<br>
              <small>Arraste uma fatura em PDF ou planilha do Meta Ads na área acima para começar o controle mensal.</small>
            </td>
          </tr>
        `;
      } else {
        tbodyUploads.innerHTML = uploads.map(u => {
          const isPdf = (u.nome_arquivo || '').toLowerCase().endsWith('.pdf');
          const tipoBadge = isPdf
            ? '<span class="badge" style="background: rgba(96, 165, 250, 0.15); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.35); font-size: 11px; padding: 2px 7px;">📄 Fatura PDF</span>'
            : '<span class="badge" style="background: rgba(74, 222, 128, 0.15); color: #86efac; border: 1px solid rgba(74, 222, 128, 0.35); font-size: 11px; padding: 2px 7px;">📊 Planilha</span>';

          const cpl = Number(u.custo_por_lead_medio || 0);
          const periodo = (u.periodo_inicio && u.periodo_fim)
            ? `${u.periodo_inicio.split('-').reverse().slice(0, 2).join('/')} a ${u.periodo_fim.split('-').reverse().slice(0, 2).join('/')}`
            : 'Período contínuo';
          const dataUpload = u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

          const btnVisualizar = isPdf
            ? `<button class="btn btn-secondary btn-sm" onclick="visualizarPdfUpload(${u.id})" title="Visualizar fatura em PDF no navegador" style="padding: 4px 8px; margin-right: 4px; color: #60a5fa; border-color: rgba(96, 165, 250, 0.4);">
                👁️ Ver
               </button>`
            : '';

          return `
            <tr>
              <td>
                <strong style="color: #fff; display: flex; align-items: center; gap: 6px;">
                  <span>${isPdf ? '🧾' : '📅'}</span> ${escapeHtml(u.semana_rotulo)}
                </strong>
              </td>
              <td>${tipoBadge}</td>
              <td>
                <span title="${escapeHtml(u.nome_arquivo)}" style="color: var(--text-secondary); max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;">
                  ${escapeHtml(u.nome_arquivo)}
                </span>
              </td>
              <td>${periodo}</td>
              <td><strong style="color: #f87171;">${formatCurrency(u.valor_total_gasto)}</strong></td>
              <td>${u.total_resultados > 0 ? `<strong style="color: #4ade80;">${formatNumber(u.total_resultados)}</strong> leads` : '<span class="text-muted">-</span>'}</td>
              <td>${cpl > 0 ? formatCurrency(cpl) : '<span class="text-muted">-</span>'}</td>
              <td><small class="text-muted">${dataUpload}</small></td>
              <td style="text-align: right; white-space: nowrap;">
                ${btnVisualizar}
                <button class="btn btn-secondary btn-sm" onclick="downloadFinancasUpload(${u.id})" title="Baixar arquivo original" style="padding: 4px 8px; margin-right: 4px;">
                  ⬇️ Baixar
                </button>
                <button class="btn btn-secondary btn-sm" onclick="excluirFinancasUpload(${u.id}, '${escapeHtml(u.nome_arquivo)}')" title="Excluir do histórico" style="padding: 4px 8px; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                  🗑️
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 4. Renderizar Tabela de Evolução Semana a Semana
    const tbodySemanas = document.getElementById('financas-semanas-tbody');
    const semanas = rel?.semanas || [];

    if (tbodySemanas) {
      if (semanas.length === 0) {
        tbodySemanas.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
              Aguardando o arquivamento das primeiras planilhas semanais...
            </td>
          </tr>
        `;
      } else {
        tbodySemanas.innerHTML = semanas.map(s => {
          const periodo = (s.periodoInicio && s.periodoFim)
            ? `${s.periodoInicio.split('-').reverse().slice(0, 2).join('/')} a ${s.periodoFim.split('-').reverse().slice(0, 2).join('/')}`
            : 'Período da planilha';

          return `
            <tr>
              <td><strong>${escapeHtml(s.semanaRotulo)}</strong></td>
              <td><span class="text-muted">${periodo}</span></td>
              <td><strong style="color: #f87171;">${formatCurrency(s.gastoTotal)}</strong></td>
              <td><strong style="color: #4ade80;">${formatNumber(s.leadsTotal)}</strong></td>
              <td>${formatCurrency(s.custoPorLeadMedio)}</td>
              <td>${formatNumber(s.cliquesTotal)}</td>
              <td>${formatNumber(s.impressoesTotal)}</td>
              <td>${s.ctrMedio.toFixed(2)}%</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 5. Renderizar Tabela de Performance por Campanha
    const tbodyCampanhas = document.getElementById('financas-campanhas-tbody');
    const topCampanhas = rel?.topCampanhas || [];

    if (tbodyCampanhas) {
      if (topCampanhas.length === 0) {
        tbodyCampanhas.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
              Nenhuma campanha encontrada nas planilhas deste mês.
            </td>
          </tr>
        `;
      } else {
        tbodyCampanhas.innerHTML = topCampanhas.map(c => {
          let badgeEfic = '<span class="badge badge-seguro">🟢 Excelente</span>';
          if (c.leads === 0) {
            badgeEfic = '<span class="badge badge-alto_risco">🔴 Sem Leads</span>';
          } else if (c.custoPorLead > 12) {
            badgeEfic = '<span class="badge badge-moderado">🟡 CPL Alto</span>';
          }

          return `
            <tr>
              <td>
                <strong style="color: #fff;">${escapeHtml(c.nomeCampanha)}</strong>
              </td>
              <td><strong style="color: #f87171;">${formatCurrency(c.valorGasto)}</strong></td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; min-width: 60px;">
                    <div style="width: ${Math.min(c.shareGasto, 100)}%; height: 100%; background: #ef4444; border-radius: 3px;"></div>
                  </div>
                  <small style="font-weight: 600; min-width: 42px;">${c.shareGasto.toFixed(1)}%</small>
                </div>
              </td>
              <td><strong style="color: #4ade80;">${formatNumber(c.leads)}</strong></td>
              <td>${formatCurrency(c.custoPorLead)}</td>
              <td>${formatNumber(c.cliques)}</td>
              <td>${formatNumber(c.impressoes)}</td>
              <td>${badgeEfic}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 6. Atualizar Caixa de Fechamento Financeiro
    document.getElementById('fechamento-total-gasto').innerText = formatCurrency(kpis.gastoTotal);
    document.getElementById('fechamento-total-leads').innerText = `${formatNumber(kpis.leadsTotal)} contatos / leads`;
    document.getElementById('fechamento-cpl-medio').innerText = formatCurrency(kpis.custoPorLeadMedio);
  }

  // Renderização da Seção de Balanço DRE, Lançamentos Diários e Reinvestimento
  function renderBalancoUI() {
    const mesAtivo = state.financas.mesAtivo || getMesAtualIso();
    const mesFormatado = formatMonthName(mesAtivo);
    const balanco = state.financas.balanco || {
      mesReferencia: mesAtivo,
      totalGastoCampanhas: 0,
      totalLucroBruto: 0,
      resultadoLiquido: 0,
      status: 'neutro',
      percentualReinvestimento: 70,
      valorReinvestimentoCampanhas: 0,
      valorLucroDisponivel: 0,
      margemLiquidaPercentual: 0,
      roiPercentual: 0,
      totalDiasLancados: 0,
      itens: []
    };

    // 1. Títulos de Mês
    const elDreMesNome = document.getElementById('balanco-dre-mes-nome');
    if (elDreMesNome) elDreMesNome.innerText = mesFormatado;

    const elTabelaMesNome = document.getElementById('tabela-lancamentos-mes-nome');
    if (elTabelaMesNome) elTabelaMesNome.innerText = mesFormatado;

    // 2. Badges de Percentual e Labels de Reinvestimento
    const elBadgePct = document.getElementById('balanco-badge-pct-reinvest');
    if (elBadgePct) elBadgePct.innerText = `${balanco.percentualReinvestimento}%`;

    const elLabelCampanhas = document.getElementById('balanco-pct-campanhas-label');
    if (elLabelCampanhas) elLabelCampanhas.innerText = `${balanco.percentualReinvestimento}%`;

    const elLabelLivre = document.getElementById('balanco-pct-livre-label');
    if (elLabelLivre) elLabelLivre.innerText = `${100 - balanco.percentualReinvestimento}%`;

    const elInputFlag = document.getElementById('cfg-percentual-reinvestimento');
    if (elInputFlag && !elInputFlag.matches(':focus')) {
      elInputFlag.value = balanco.percentualReinvestimento;
    }

    const elTextoExplicativo = document.getElementById('texto-explicativo-reinvestimento');
    if (elTextoExplicativo) {
      const parteCampanhas = (balanco.percentualReinvestimento * 10).toFixed(0);
      const parteLivre = ((100 - balanco.percentualReinvestimento) * 10).toFixed(0);
      elTextoExplicativo.innerHTML = `🎯 <strong>Regra de Ouro:</strong> Com a meta em <strong>${balanco.percentualReinvestimento}%</strong>, cada R$ 1.000 de lucro líquido apurado destina <strong>R$ ${parteCampanhas}</strong> para novas campanhas de tráfego e <strong>R$ ${parteLivre}</strong> para retirada limpa.`;
    }

    // 3. Status Badge
    const elStatusBadge = document.getElementById('balanco-resumo-badge');
    if (elStatusBadge) {
      if (balanco.status === 'lucro') {
        elStatusBadge.innerText = '🟢 LUCRO LÍQUIDO APURADO';
        elStatusBadge.style.background = 'rgba(74, 222, 128, 0.2)';
        elStatusBadge.style.color = '#86efac';
        elStatusBadge.style.borderColor = 'rgba(74, 222, 128, 0.4)';
      } else if (balanco.status === 'prejuizo') {
        elStatusBadge.innerText = '🔴 PREJUÍZO CONTÁBIL NO MÊS';
        elStatusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
        elStatusBadge.style.color = '#fca5a5';
        elStatusBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      } else {
        elStatusBadge.innerText = '⚪ EQUILÍBRIO (R$ 0,00)';
        elStatusBadge.style.background = 'rgba(148, 163, 184, 0.2)';
        elStatusBadge.style.color = '#cbd5e1';
        elStatusBadge.style.borderColor = 'rgba(148, 163, 184, 0.4)';
      }
    }

    // 4. 5 KPIs do Balanço
    const elLucroBruto = document.getElementById('balanco-resumo-lucro-bruto');
    if (elLucroBruto) elLucroBruto.innerText = formatCurrency(balanco.totalLucroBruto);

    const elDiasLucro = document.getElementById('balanco-resumo-dias-lucro');
    if (elDiasLucro) elDiasLucro.innerText = `${balanco.totalDiasLancados} dia(s) com registros`;

    const elGastoCampanhas = document.getElementById('balanco-resumo-gasto-campanhas');
    if (elGastoCampanhas) elGastoCampanhas.innerText = formatCurrency(balanco.totalGastoCampanhas);

    const elRoiBadge = document.getElementById('balanco-resumo-roi-badge');
    if (elRoiBadge) elRoiBadge.innerText = `ROI: ${balanco.roiPercentual.toFixed(1)}%`;

    const elResultadoLiquido = document.getElementById('balanco-resumo-resultado-liquido');
    if (elResultadoLiquido) {
      elResultadoLiquido.innerText = formatCurrency(balanco.resultadoLiquido);
      if (balanco.resultadoLiquido > 0) elResultadoLiquido.style.color = '#4ade80';
      else if (balanco.resultadoLiquido < 0) elResultadoLiquido.style.color = '#f87171';
      else elResultadoLiquido.style.color = '#fbbf24';
    }

    const elMargemBadge = document.getElementById('balanco-resumo-margem-badge');
    if (elMargemBadge) elMargemBadge.innerText = `Margem Líquida: ${balanco.margemLiquidaPercentual.toFixed(1)}%`;

    const elReinvestimento = document.getElementById('balanco-resumo-reinvestimento');
    if (elReinvestimento) elReinvestimento.innerText = formatCurrency(balanco.valorReinvestimentoCampanhas);

    const elLucroLivre = document.getElementById('balanco-resumo-lucro-livre');
    if (elLucroLivre) elLucroLivre.innerText = formatCurrency(balanco.valorLucroDisponivel);

    // 5. Tabela de Lançamentos Diários
    const tbodyLancamentos = document.getElementById('tabela-lancamentos-tbody');
    const badgeLancamentos = document.getElementById('badge-total-lancamentos');
    const itens = balanco.itens || [];

    if (badgeLancamentos) {
      badgeLancamentos.innerText = `${itens.length} lançamento${itens.length === 1 ? '' : 's'}`;
    }

    if (tbodyLancamentos) {
      if (itens.length === 0) {
        tbodyLancamentos.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px 20px;">
              ✍️ Nenhum lançamento diário registrado para <strong>${mesFormatado}</strong> ainda.<br>
              <small>Preencha os valores gastos em campanhas e o lucro diário obtido no formulário acima.</small>
            </td>
          </tr>
        `;
      } else {
        tbodyLancamentos.innerHTML = itens.map(it => {
          const gasto = Number(it.gasto_campanhas) || 0;
          const lucro = Number(it.lucro_bruto) || 0;
          const saldo = lucro - gasto;
          const reinvest = saldo > 0 ? saldo * (balanco.percentualReinvestimento / 100) : 0;
          const livre = saldo > 0 ? saldo - reinvest : saldo;

          const dataBr = it.data_lancamento ? it.data_lancamento.split('-').reverse().join('/') : '-';
          const corSaldo = saldo > 0 ? '#4ade80' : saldo < 0 ? '#f87171' : '#cbd5e1';

          let catBadge = '<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1; font-size: 11px;">Geral</span>';
          if (it.categoria === 'meta_ads') {
            catBadge = '<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.35); font-size: 11px;">Meta Ads</span>';
          } else if (it.categoria === 'google_ads') {
            catBadge = '<span class="badge" style="background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.35); font-size: 11px;">Google Ads</span>';
          } else if (it.categoria === 'afiliado_ml') {
            catBadge = '<span class="badge" style="background: rgba(250, 204, 21, 0.2); color: #fde047; border: 1px solid rgba(250, 204, 21, 0.4); font-size: 11px;">Afiliado ML</span>';
          } else if (it.categoria === 'venda_direta') {
            catBadge = '<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.35); font-size: 11px;">Venda Direta</span>';
          }

          return `
            <tr>
              <td><strong style="color: #fff;">${dataBr}</strong></td>
              <td><strong style="color: #f87171;">${formatCurrency(gasto)}</strong></td>
              <td><strong style="color: #4ade80;">${formatCurrency(lucro)}</strong></td>
              <td><strong style="color: ${corSaldo};">${saldo > 0 ? '+' : ''}${formatCurrency(saldo)}</strong></td>
              <td><span style="color: #38bdf8; font-weight: 600;">${formatCurrency(reinvest)}</span></td>
              <td><span style="color: #c084fc; font-weight: 600;">${formatCurrency(livre)}</span></td>
              <td>${catBadge}</td>
              <td><span title="${escapeHtml(it.descricao || '')}" style="color: var(--text-secondary); max-width: 220px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(it.descricao || '-')}</span></td>
              <td style="text-align: right;">
                <button class="btn btn-secondary btn-sm" onclick="removerLancamentoDiario(${it.id})" title="Excluir lançamento" style="padding: 3px 8px; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                  🗑️
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Inicializa a data do formulário com a data de hoje (se ainda vazia)
    const inputData = document.getElementById('lancamento-data');
    if (inputData && !inputData.value) {
      inputData.value = new Date().toISOString().substring(0, 10);
    }
  }

  // Ação Global para Excluir Lançamento Manual Diário
  window.removerLancamentoDiario = async function(id) {
    if (confirm('Deseja realmente remover este lançamento diário?\nOs cálculos de balanço e reinvestimento serão recalculados imediatamente.')) {
      try {
        const res = await fetch(`/api/bot/financas/lancamento/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
          showToast('Lançamento excluído com sucesso!', 'success');
          await loadFinancasData(state.financas.mesAtivo);
        } else {
          showToast(data.error || 'Erro ao excluir lançamento.', 'error');
        }
      } catch (err) {
        showToast(`Erro na requisição: ${err.message}`, 'error');
      }
    }
  };

  // Ações Globais de Finanças & Documentos
  window.downloadFinancasUpload = function(id) {
    window.open(`/api/bot/financas/download/${id}`, '_blank');
  };

  window.visualizarPdfUpload = function(id) {
    window.open(`/api/bot/financas/download/${id}?inline=true`, '_blank');
  };

  window.excluirFinancasUpload = async function(id, nome) {
    if (confirm(`Deseja realmente excluir "${nome}" e todos os registros associados?\nEsta ação recalculará automaticamente o relatório executivo do mês.`)) {
      try {
        const res = await fetch(`/api/bot/financas/upload/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
          showToast('Arquivo removido e métricas recalculadas!', 'success');
          await loadFinancasData(state.financas.mesAtivo);
        } else {
          showToast(data.error || 'Erro ao remover arquivo.', 'error');
        }
      } catch (err) {
        showToast(`Erro na requisição: ${err.message}`, 'error');
      }
    }
  };

  // Gerador Executivo Moderno para Impressão / Exportação em PDF
  function gerarRelatorioExecutivoModernoPrint() {
    const container = document.getElementById('relatorio-executivo-print');
    if (!container) return;

    const mesAtivo = state.financas.mesAtivo || getMesAtualIso();
    const mesFormatado = formatMonthName(mesAtivo);
    const rel = state.financas.relatorio;
    const kpis = rel?.kpis || {
      gastoTotal: 0,
      leadsTotal: 0,
      custoPorLeadMedio: 0,
      impressoesTotal: 0,
      cliquesTotal: 0,
      ctrMedio: 0,
      cpcMedio: 0,
      cpmMedio: 0,
      qtdUploads: (state.financas.uploads || []).length,
      qtdCampanhasDistintas: 0
    };
    const uploads = state.financas.uploads || [];
    const semanas = rel?.semanas || [];
    const campanhas = rel?.topCampanhas || [];
    const balanco = state.financas.balanco || {
      totalGastoCampanhas: 0,
      totalLucroBruto: 0,
      resultadoLiquido: 0,
      status: 'neutro',
      percentualReinvestimento: 70,
      valorReinvestimentoCampanhas: 0,
      valorLucroDisponivel: 0,
      margemLiquidaPercentual: 0,
      roiPercentual: 0,
      totalDiasLancados: 0,
      itens: []
    };

    const emitidoEm = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const protocoloId = `MTA-${mesAtivo.replace('-', '')}-${Date.now().toString().slice(-4)}`;

    let cplClassificacao = 'Dentro da Meta';
    if (kpis.leadsTotal === 0) cplClassificacao = 'Sem Conversões Registradas';
    else if (kpis.custoPorLeadMedio <= 5) cplClassificacao = 'Alta Eficiência (Excelente)';
    else if (kpis.custoPorLeadMedio <= 12) cplClassificacao = 'Moderado / Saudável';
    else cplClassificacao = 'Atenção / Otimizar Criativos';

    const rowsLancamentosPrint = balanco.itens.length === 0
      ? `<tr><td colspan="7" style="text-align: center; padding: 14px; color: #6b7280;">Nenhum lançamento diário manual registrado para este mês contábil.</td></tr>`
      : balanco.itens.map(it => {
          const gasto = Number(it.gasto_campanhas) || 0;
          const lucro = Number(it.lucro_bruto) || 0;
          const saldo = lucro - gasto;
          const reinvest = saldo > 0 ? saldo * (balanco.percentualReinvestimento / 100) : 0;
          const livre = saldo > 0 ? saldo - reinvest : saldo;
          const dataBr = it.data_lancamento ? it.data_lancamento.split('-').reverse().join('/') : '-';
          return `
            <tr>
              <td><strong>${dataBr}</strong></td>
              <td style="text-align: right; color: #b91c1c; font-weight: 600;">${formatCurrency(gasto)}</td>
              <td style="text-align: right; color: #15803d; font-weight: 600;">${formatCurrency(lucro)}</td>
              <td style="text-align: right; font-weight: 700; color: ${saldo >= 0 ? '#15803d' : '#b91c1c'};">${saldo > 0 ? '+' : ''}${formatCurrency(saldo)}</td>
              <td style="text-align: right; color: #0284c7;">${formatCurrency(reinvest)}</td>
              <td style="text-align: right; color: #7c3aed;">${formatCurrency(livre)}</td>
              <td>${escapeHtml(it.descricao || it.categoria || '-')}</td>
            </tr>
          `;
        }).join('');

    const rowsArquivos = uploads.length === 0
      ? `<tr><td colspan="6" style="text-align: center; padding: 18px; color: #6b7280;">Nenhum arquivo ou fatura arquivada para este mês contábil.</td></tr>`
      : uploads.map((u, idx) => {
          const isPdf = (u.nome_arquivo || '').toLowerCase().endsWith('.pdf');
          const tipoLabel = isPdf ? 'Fatura / Recibo em PDF' : 'Planilha Semanal (Meta Ads)';
          const periodo = (u.periodo_inicio && u.periodo_fim)
            ? `${u.periodo_inicio.split('-').reverse().slice(0, 2).join('/')} a ${u.periodo_fim.split('-').reverse().slice(0, 2).join('/')}`
            : 'Período Contínuo';
          const dataUpload = u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '-';
          return `
            <tr>
              <td style="text-align: center;"><strong>#${idx + 1}</strong></td>
              <td>
                <strong>${escapeHtml(u.semana_rotulo)}</strong>
                <div style="font-size: 11px; color: #6b7280;">${tipoLabel}</div>
              </td>
              <td><span style="font-family: monospace; font-size: 11px; color: #374151;">${escapeHtml(u.nome_arquivo)}</span></td>
              <td>${periodo}<br><small style="color: #6b7280;">Envio: ${dataUpload}</small></td>
              <td style="text-align: center;"><strong>${u.total_resultados > 0 ? formatNumber(u.total_resultados) : '-'}</strong></td>
              <td style="text-align: right;"><strong style="color: #b91c1c; font-size: 13px;">${formatCurrency(u.valor_total_gasto)}</strong></td>
            </tr>
          `;
        }).join('');

    const rowsCampanhas = campanhas.length === 0
      ? `<tr><td colspan="7" style="text-align: center; padding: 14px; color: #6b7280;">Dados consolidados a partir das faturas e comprovantes arquivados no mês.</td></tr>`
      : campanhas.map((c) => {
          return `
            <tr>
              <td><strong>${escapeHtml(c.nomeCampanha)}</strong></td>
              <td style="text-align: right;"><strong style="color: #b91c1c;">${formatCurrency(c.valorGasto)}</strong></td>
              <td style="text-align: center;"><strong>${c.shareGasto.toFixed(1)}%</strong></td>
              <td style="text-align: center;"><strong>${formatNumber(c.leads)}</strong></td>
              <td style="text-align: right;">${formatCurrency(c.custoPorLead)}</td>
              <td style="text-align: center;">${formatNumber(c.cliques)}</td>
              <td style="text-align: center;">${c.ctr.toFixed(2)}%</td>
            </tr>
          `;
        }).join('');

    container.innerHTML = `
      <div class="print-document">
        <!-- Cabeçalho Corporativo de Alto Padrão -->
        <div class="print-header">
          <div class="print-brand">
            <div class="print-logo-box">
              <span class="print-logo-icon">🔥</span>
              <div class="print-logo-text">
                <span class="print-brand-main">PROMO POKÉMON TCG</span>
                <span class="print-brand-sub">SISTEMA OFICIAL DE GESTÃO DE TRÁFEGO & META ADS</span>
              </div>
            </div>
            <div class="print-title-group">
              <h1 class="print-title">RELATÓRIO EXECUTIVO DE FECHAMENTO FINANCEIRO</h1>
              <p class="print-subtitle">Demonstrativo mensal consolidado de receitas, custos de aquisição de tráfego, balanço DRE e regras de reinvestimento.</p>
            </div>
          </div>
          <div class="print-meta-card">
            <div class="print-meta-row"><span>Competência:</span> <strong>${mesFormatado}</strong></div>
            <div class="print-meta-row"><span>Referência (ISO):</span> <strong>${mesAtivo}</strong></div>
            <div class="print-meta-row"><span>Data de Emissão:</span> <strong>${emitidoEm}</strong></div>
            <div class="print-meta-row"><span>Protocolo:</span> <code>#${protocoloId}</code></div>
            <div class="print-status-stamp">✓ CONCILIADO E AUDITADO</div>
          </div>
        </div>

        <!-- Grade de Indicadores-Chave de Performance (KPIs) -->
        <div class="print-kpi-grid">
          <div class="print-kpi-card border-green">
            <span class="print-kpi-label">LUCRO / FATURAMENTO BRUTO</span>
            <strong class="print-kpi-val text-green">${formatCurrency(balanco.totalLucroBruto)}</strong>
            <span class="print-kpi-sub">${balanco.totalDiasLancados} dia(s) com registros operacionais</span>
          </div>

          <div class="print-kpi-card border-red">
            <span class="print-kpi-label">INVESTIMENTO EM CAMPANHAS</span>
            <strong class="print-kpi-val text-red">${formatCurrency(balanco.totalGastoCampanhas || kpis.gastoTotal)}</strong>
            <span class="print-kpi-sub">${uploads.length} comprovante(s) e fatura(s) arquivadas</span>
          </div>

          <div class="print-kpi-card border-blue">
            <span class="print-kpi-label">RESULTADO LÍQUIDO DO MÊS</span>
            <strong class="print-kpi-val ${balanco.resultadoLiquido >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(balanco.resultadoLiquido)}</strong>
            <span class="print-kpi-sub">${balanco.status === 'lucro' ? '🟢 Lucro Líquido' : balanco.status === 'prejuizo' ? '🔴 Déficit Operacional' : '⚪ Equilíbrio'} (ROI: ${balanco.roiPercentual.toFixed(1)}%)</span>
          </div>

          <div class="print-kpi-card border-amber">
            <span class="print-kpi-label">DESTINAÇÃO PARA NOVAS CAMPANHAS</span>
            <strong class="print-kpi-val text-amber">${formatCurrency(balanco.valorReinvestimentoCampanhas)}</strong>
            <span class="print-kpi-sub">Fundo de ${balanco.percentualReinvestimento}% para acelerar novos anúncios</span>
          </div>
        </div>

        <!-- Seção 0: Demonstrativo de Resultado (Balanço de Lucro & Prejuízo) e Destinação de Reinvestimento -->
        <div class="print-section">
          <div class="print-section-header">
            <h3>Balanço Executivo Mensal (DRE) & Fundo de Reinvestimento em Tráfego</h3>
            <span class="print-section-count">Meta Reinvestimento: ${balanco.percentualReinvestimento}%</span>
          </div>
          <table class="print-table">
            <thead>
              <tr>
                <th>Demonstrativo Contábil / Indicador</th>
                <th style="text-align: right; width: 170px;">Valor Apurado (R$)</th>
                <th>Parecer / Destinação Estratégica</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Faturamento / Lucro Bruto Total:</strong></td>
                <td style="text-align: right; font-weight: 700; color: #15803d;">${formatCurrency(balanco.totalLucroBruto)}</td>
                <td>Total de receitas e comissões registradas no mês (${balanco.totalDiasLancados} dia(s) com registros)</td>
              </tr>
              <tr>
                <td><strong>Investimento Total em Campanhas:</strong></td>
                <td style="text-align: right; font-weight: 700; color: #b91c1c;">${formatCurrency(balanco.totalGastoCampanhas)}</td>
                <td>Total consumido em campanhas de anúncios (Meta Ads, Google, tráfego pago)</td>
              </tr>
              <tr style="background: rgba(0,0,0,0.03);">
                <td><strong>Resultado Líquido Apurado no Mês:</strong></td>
                <td style="text-align: right; font-weight: 800; font-size: 14px; color: ${balanco.resultadoLiquido >= 0 ? '#15803d' : '#b91c1c'};">${formatCurrency(balanco.resultadoLiquido)}</td>
                <td><strong>${balanco.status === 'lucro' ? '🟢 LUCRO LÍQUIDO APURADO' : balanco.status === 'prejuizo' ? '🔴 PREJUÍZO CONTÁBIL' : '⚪ EQUILÍBRIO'}</strong> (Margem: ${balanco.margemLiquidaPercentual.toFixed(1)}% · ROI: ${balanco.roiPercentual.toFixed(1)}%)</td>
              </tr>
              <tr>
                <td><strong>🚀 Orçamento Destinado a Novas Campanhas (${balanco.percentualReinvestimento}%):</strong></td>
                <td style="text-align: right; font-weight: 800; color: #0284c7;">${formatCurrency(balanco.valorReinvestimentoCampanhas)}</td>
                <td>Fundo obrigatório retido para reinvestimento acelerado em anúncios no próximo ciclo</td>
              </tr>
              <tr>
                <td><strong>💵 Lucro Líquido Real / Retirada dos Sócios (${100 - balanco.percentualReinvestimento}%):</strong></td>
                <td style="text-align: right; font-weight: 800; color: #7c3aed;">${formatCurrency(balanco.valorLucroDisponivel)}</td>
                <td>Saldo líquido livre disponível para distribuição de lucro / retirada no bolso</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${balanco.itens.length > 0 ? `
        <!-- Seção: Detalhamento dos Lançamentos Diários -->
        <div class="print-section" style="margin-top: 18px;">
          <div class="print-section-header">
            <h3>Discriminação dos Lançamentos Diários de Receita & Tráfego</h3>
            <span class="print-section-count">${balanco.itens.length} lançamento(s)</span>
          </div>
          <table class="print-table">
            <thead>
              <tr>
                <th>Data</th>
                <th style="text-align: right;">Gasto Campanhas (R$)</th>
                <th style="text-align: right;">Lucro Bruto (R$)</th>
                <th style="text-align: right;">Saldo do Dia (R$)</th>
                <th style="text-align: right;">Reinvestimento (${balanco.percentualReinvestimento}%)</th>
                <th style="text-align: right;">Lucro Livre (${100 - balanco.percentualReinvestimento}%)</th>
                <th>Descrição / Categoria</th>
              </tr>
            </thead>
            <tbody>
              ${rowsLancamentosPrint}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Seção 1: Arquivos, Comprovantes e Faturas Arquivadas -->
        <div class="print-section" style="margin-top: 18px;">
          <div class="print-section-header">
            <h3>Demonstrativo de Arquivos, Faturas e Recibos Conciliados</h3>
            <span class="print-section-count">${uploads.length} item(ns)</span>
          </div>
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">#</th>
                <th>Semana / Identificador</th>
                <th>Arquivo Físico Armazenado</th>
                <th>Período Contábil</th>
                <th style="text-align: center; width: 80px;">Leads</th>
                <th style="text-align: right; width: 140px;">Valor Consumido (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsArquivos}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align: right; font-weight: 700; text-transform: uppercase;">Total Financeiro Apurado no Mês:</td>
                <td style="text-align: center; font-weight: 800; color: #15803d;">${formatNumber(kpis.leadsTotal)}</td>
                <td style="text-align: right; font-weight: 800; font-size: 14px; color: #b91c1c;">${formatCurrency(kpis.gastoTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        ${campanhas.length > 0 ? `
        <!-- Seção 2: Desempenho por Campanha -->
        <div class="print-section" style="margin-top: 18px;">
          <div class="print-section-header">
            <h3>2. Alocação de Orçamento e Performance por Campanha</h3>
            <span class="print-section-count">${campanhas.length} campanha(s)</span>
          </div>
          <table class="print-table">
            <thead>
              <tr>
                <th>Nome da Campanha</th>
                <th style="text-align: right; width: 120px;">Gasto Consumido</th>
                <th style="text-align: center; width: 85px;">% Verba</th>
                <th style="text-align: center; width: 80px;">Leads</th>
                <th style="text-align: right; width: 100px;">CPL (R$)</th>
                <th style="text-align: center; width: 90px;">Cliques</th>
                <th style="text-align: center; width: 80px;">CTR (%)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsCampanhas}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Seção 3: Encerramento e Termo de Conformidade Fiscal -->
        <div class="print-closing-card">
          <div class="print-closing-text">
            <h4>Parecer de Encerramento Contábil & Auditoria</h4>
            <p>
              Certificamos que as despesas e comprovantes constantes neste relatório foram devidamente processados e armazenados com integridade no banco de dados da operação Promo Pokémon TCG. Os valores correspondem estritamente aos débitos faturados pela Meta Platforms Inc. através do Gerenciador de Anúncios.
            </p>
            <div class="print-closing-tags">
              <span class="print-tag-pill">🔒 Arquivos Físicos Preservados</span>
              <span class="print-tag-pill">📊 Conciliação Bancária Aprovada</span>
              <span class="print-tag-pill">✓ Relatório Apto para Contabilidade</span>
            </div>
          </div>
          <div class="print-signatures-row">
            <div class="print-signature-box">
              <div class="print-sig-line"></div>
              <strong>Gestor de Tráfego & Performance</strong>
              <span>Operação Pokémon TCG</span>
            </div>
            <div class="print-signature-box">
              <div class="print-sig-line"></div>
              <strong>Diretoria Financeira / Aprovador</strong>
              <span>Conferido e Homologado</span>
            </div>
          </div>
        </div>

        <!-- Rodapé do Relatório Impresso -->
        <div class="print-footer-bar">
          <span>Promo Pokémon TCG · Sistema de Inteligência em Tráfego Pago & Meta Ads</span>
          <span>Documento gerado em formato executivo A4 · Arquivamento permanente garantido</span>
        </div>
      </div>
    `;
  }

  function setupFinancasListeners() {
    // 1. Alternador de Mês
    const selectMes = document.getElementById('financas-mes-select');
    if (selectMes) {
      selectMes.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) loadFinancasData(val);
      });
    }

    // 2. Botão Mês Atual
    const btnMesAtual = document.getElementById('btn-financas-mes-atual');
    if (btnMesAtual) {
      btnMesAtual.addEventListener('click', () => {
        const mesAtual = getMesAtualIso();
        loadFinancasData(mesAtual);
        showToast(`Exibindo mês atual: ${formatMonthName(mesAtual)}`, 'info');
      });
    }

    // 3. Exportar CSV
    const btnExportarCsv = document.getElementById('btn-financas-exportar-csv');
    if (btnExportarCsv) {
      btnExportarCsv.addEventListener('click', () => {
        const mes = state.financas.mesAtivo || getMesAtualIso();
        window.open(`/api/bot/financas/exportar-csv?mes=${encodeURIComponent(mes)}`, '_blank');
      });
    }

    // 3.1. Exportar Balanço DRE Completo (CSV / Excel)
    const btnBalancoCsv = document.getElementById('btn-balanco-exportar-csv');
    if (btnBalancoCsv) {
      btnBalancoCsv.addEventListener('click', () => {
        const mes = state.financas.mesAtivo || getMesAtualIso();
        window.open(`/api/bot/financas/balanco/exportar-csv?mes=${encodeURIComponent(mes)}`, '_blank');
      });
    }

    // 3.2. Salvar Flag de Reinvestimento
    const btnSalvarFlag = document.getElementById('btn-salvar-flag-reinvestimento');
    const inputFlag = document.getElementById('cfg-percentual-reinvestimento');
    if (btnSalvarFlag && inputFlag) {
      btnSalvarFlag.addEventListener('click', async () => {
        const valor = Number(inputFlag.value);
        if (isNaN(valor) || valor < 0 || valor > 100) {
          showToast('Insira uma porcentagem válida entre 0 e 100.', 'warning');
          return;
        }

        try {
          btnSalvarFlag.disabled = true;
          btnSalvarFlag.innerText = 'Salvando...';
          const res = await fetch('/api/bot/financas/config-reinvestimento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ percentual: valor })
          });
          const data = await res.json();
          if (data.ok) {
            showToast(`Meta de reinvestimento atualizada para ${data.percentual}%!`, 'success');
            await loadFinancasData(state.financas.mesAtivo);
          } else {
            showToast(data.error || 'Erro ao salvar meta.', 'error');
          }
        } catch (err) {
          showToast(`Erro: ${err.message}`, 'error');
        } finally {
          btnSalvarFlag.disabled = false;
          btnSalvarFlag.innerText = '💾 Salvar Meta';
        }
      });
    }

    // 3.3. Gravar Lançamento Manual Diário
    const btnGravarLancamento = document.getElementById('btn-gravar-lancamento');
    const inputLancData = document.getElementById('lancamento-data');
    const inputLancGasto = document.getElementById('lancamento-gasto');
    const inputLancLucro = document.getElementById('lancamento-lucro');
    const selectLancCat = document.getElementById('lancamento-categoria');
    const inputLancDesc = document.getElementById('lancamento-descricao');

    if (btnGravarLancamento) {
      btnGravarLancamento.addEventListener('click', async () => {
        const dataVal = inputLancData?.value?.trim();
        if (!dataVal) {
          showToast('Por favor, informe a data do lançamento.', 'warning');
          inputLancData?.focus();
          return;
        }

        const gastoVal = Number(inputLancGasto?.value) || 0;
        const lucroVal = Number(inputLancLucro?.value) || 0;
        const catVal = selectLancCat?.value || 'geral';
        const descVal = inputLancDesc?.value?.trim() || '';

        if (gastoVal === 0 && lucroVal === 0) {
          showToast('Informe ao menos o valor gasto com campanha ou o lucro/faturamento obtido.', 'warning');
          inputLancGasto?.focus();
          return;
        }

        try {
          btnGravarLancamento.disabled = true;
          btnGravarLancamento.innerText = 'Gravando...';

          const res = await fetch('/api/bot/financas/lancamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataLancamento: dataVal,
              gastoCampanhas: gastoVal,
              lucroBruto: lucroVal,
              categoria: catVal,
              descricao: descVal
            })
          });
          const data = await res.json();
          if (data.ok) {
            showToast('Lançamento registrado com sucesso!', 'success');
            if (inputLancGasto) inputLancGasto.value = '';
            if (inputLancLucro) inputLancLucro.value = '';
            if (inputLancDesc) inputLancDesc.value = '';

            const mesLanc = dataVal.substring(0, 7);
            await loadFinancasData(mesLanc);
          } else {
            showToast(data.error || 'Erro ao registrar lançamento.', 'error');
          }
        } catch (err) {
          showToast(`Erro na requisição: ${err.message}`, 'error');
        } finally {
          btnGravarLancamento.disabled = false;
          btnGravarLancamento.innerText = '➕ Gravar Lançamento';
        }
      });
    }

    // 4. Imprimir / Salvar Relatório Executivo em PDF
    const btnImprimir = document.getElementById('btn-financas-imprimir');
    if (btnImprimir) {
      btnImprimir.addEventListener('click', () => {
        gerarRelatorioExecutivoModernoPrint();
        setTimeout(() => {
          window.print();
        }, 120);
      });
    }

    // 5. Configuração da Dropzone Unificada (PDF, XLSX, XLS, CSV)
    const dropzone = document.getElementById('financas-dropzone');
    const fileInput = document.getElementById('financas-file-input');
    const dropTitle = document.getElementById('dropzone-title');
    const dropSubtitle = document.getElementById('dropzone-subtitle');
    const dropFilename = document.getElementById('dropzone-filename');
    const btnLimpar = document.getElementById('btn-limpar-upload');
    const btnProcessar = document.getElementById('btn-processar-upload');
    const semanaInput = document.getElementById('financas-semana-input');

    function handleFileSelection(file) {
      if (!file) return;

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv', 'pdf'].includes(ext)) {
        alert('Formato de arquivo não suportado!\n\nPor favor, envie um arquivo em PDF (.pdf), Excel (.xlsx, .xls) ou CSV exportado do Meta Ads.');
        return;
      }

      state.financas.selectedFile = file;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

      if (ext === 'pdf') {
        if (dropTitle) dropTitle.innerText = 'Fatura / Recibo em PDF pronto para arquivar:';
        if (dropSubtitle) dropSubtitle.innerText = 'O sistema extrairá a data e o valor da fatura automaticamente.';
        if (dropFilename) {
          dropFilename.style.display = 'inline-flex';
          dropFilename.innerHTML = `📄 <strong>${escapeHtml(file.name)}</strong> (${sizeMb} MB) <span class="badge" style="background: rgba(96, 165, 250, 0.2); color: #93c5fd; margin-left: 6px;">Fatura PDF</span>`;
        }
        if (semanaInput && !semanaInput.value) {
          const nomeSemExt = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          semanaInput.value = `Fatura ${nomeSemExt.slice(0, 24)}`;
        }
      } else {
        if (dropTitle) dropTitle.innerText = 'Planilha do Meta Ads pronta para arquivar:';
        if (dropSubtitle) dropSubtitle.innerText = 'Revise a semana e o mês de referência abaixo se desejar.';
        if (dropFilename) {
          dropFilename.style.display = 'inline-flex';
          dropFilename.innerHTML = `📊 <strong>${escapeHtml(file.name)}</strong> (${sizeMb} MB) <span class="badge" style="background: rgba(74, 222, 128, 0.2); color: #86efac; margin-left: 6px;">Planilha Meta</span>`;
        }
      }

      if (btnLimpar) btnLimpar.style.display = 'inline-block';
    }

    function resetDropzone() {
      state.financas.selectedFile = null;
      if (fileInput) fileInput.value = '';
      if (dropTitle) dropTitle.innerText = 'Arraste a fatura (PDF) ou planilha aqui';
      if (dropSubtitle) dropSubtitle.innerText = 'ou clique para selecionar do seu computador (.pdf, .xlsx, .xls, .csv)';
      if (dropFilename) {
        dropFilename.style.display = 'none';
        dropFilename.innerHTML = '';
      }
      if (btnLimpar) btnLimpar.style.display = 'none';
      if (semanaInput) semanaInput.value = '';
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelection(file);
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileSelection(file);
      });
    }

    if (btnLimpar) {
      btnLimpar.addEventListener('click', resetDropzone);
    }

    // 6. Submissão do Upload (Fatura PDF ou Planilha)
    if (btnProcessar) {
      btnProcessar.addEventListener('click', async () => {
        const file = state.financas.selectedFile;
        if (!file) {
          alert('Por favor, selecione ou arraste um arquivo (PDF ou Planilha) antes de processar.');
          return;
        }

        const ext = file.name.split('.').pop()?.toLowerCase();
        const isPdf = ext === 'pdf';
        const semanaRotulo = document.getElementById('financas-semana-input')?.value.trim();
        const mesReferencia = document.getElementById('financas-mes-input')?.value.trim();

        btnProcessar.disabled = true;
        btnProcessar.innerText = isPdf ? '⏳ Processando e Lendo Fatura PDF...' : '⏳ Processando e Arquivando Planilha...';

        try {
          const formData = new FormData();
          formData.append('file', file);
          if (semanaRotulo) formData.append('semanaRotulo', semanaRotulo);
          if (mesReferencia) formData.append('mesReferencia', mesReferencia);

          const res = await fetch('/api/bot/financas/upload', {
            method: 'POST',
            body: formData
          });

          const data = await res.json();
          if (data.ok) {
            const resMes = data.resumo?.mesReferencia || mesReferencia || state.financas.mesAtivo;
            const msgSucesso = isPdf
              ? `Fatura em PDF arquivada com sucesso! Valor apurado: ${formatCurrency(data.resumo?.gastoTotal)}.`
              : `Planilha arquivada com sucesso! Total apurado: ${formatCurrency(data.resumo?.gastoTotal)} (${data.resumo?.leadsTotal} leads).`;
            showToast(msgSucesso, 'success');
            resetDropzone();
            await loadFinancasData(resMes);
          } else {
            alert(`Erro ao processar arquivo:\n\n${data.error || 'Verifique se o arquivo é um PDF de fatura válido ou uma exportação do Meta Ads.'}`);
          }
        } catch (err) {
          alert(`Falha na conexão com o servidor: ${err.message}`);
        } finally {
          btnProcessar.disabled = false;
          btnProcessar.innerText = '⚡ Arquivar e Processar Arquivo';
        }
      });
    }
  }

  // Motor Gráfico de Brasas & Fagulhas de Fogo (Canvas 60fps GPU)
  function initFireParticles() {
    const canvas = document.getElementById('ambient-fx');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const count = 55;
    const particles = [];

    function createParticle(initial = false) {
      const isEmber = Math.random() > 0.35;
      const r = isEmber ? (Math.random() * 2.8 + 1.8) : (Math.random() * 1.6 + 0.9);
      return {
        x: Math.random() * width,
        y: initial ? Math.random() * height : height + Math.random() * 20,
        r: r,
        baseR: r,
        speedY: isEmber ? -(Math.random() * 1.1 + 0.55) : -(Math.random() * 1.6 + 0.8),
        speedX: (Math.random() - 0.5) * 0.45,
        wobbleSpeed: Math.random() * 0.04 + 0.015,
        wobbleAmp: Math.random() * 1.5 + 0.5,
        wobbleAngle: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.4 + 0.45,
        maxLife: Math.random() * 140 + 90,
        life: 0,
        isEmber: isEmber
      };
    }

    for (let i = 0; i < count; i++) {
      particles.push(createParticle(true));
    }

    let animId = null;
    let isRunning = true;

    function render() {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count; i++) {
        const p = particles[i];
        p.life++;

        p.wobbleAngle += p.wobbleSpeed;
        p.x += p.speedX + Math.sin(p.wobbleAngle) * p.wobbleAmp * 0.14;
        p.y += p.speedY;

        const lifeFraction = p.life / p.maxLife;
        p.r = Math.max(0.3, p.baseR * (1 - lifeFraction * 0.65));
        const currentAlpha = Math.max(0, p.alpha * (1 - lifeFraction));

        // Reaparece suavemente no fundo ao expirar ou sair da tela
        if (p.life >= p.maxLife || p.y < -15) {
          particles[i] = createParticle(false);
          continue;
        }

        if (p.x < -15) p.x = width + 15;
        if (p.x > width + 15) p.x = -15;

        if (p.isEmber) {
          // Brasa Incandescente com Núcleo Dourado e Halo Térmico Rubi/Âmbar
          const grad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.r * 2.2
          );
          grad.addColorStop(0, `rgba(255, 252, 230, ${currentAlpha * 0.95})`);
          grad.addColorStop(0.3, `rgba(251, 146, 60, ${currentAlpha * 0.85})`);
          grad.addColorStop(0.7, `rgba(239, 68, 68, ${currentAlpha * 0.45})`);
          grad.addColorStop(1, 'rgba(185, 28, 28, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Fagulha Rápida / Sparkle
          const sparkGrad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.r * 1.5
          );
          sparkGrad.addColorStop(0, `rgba(255, 255, 255, ${currentAlpha})`);
          sparkGrad.addColorStop(0.4, `rgba(253, 186, 116, ${currentAlpha * 0.8})`);
          sparkGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

          ctx.fillStyle = sparkGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isRunning = false;
        if (animId) cancelAnimationFrame(animId);
      } else {
        isRunning = true;
        animId = requestAnimationFrame(render);
      }
    });

    animId = requestAnimationFrame(render);
  }

  // Filtro de Busca Instantânea para Público-Alvo / Grupos na Criação de Campanhas
  const campTargetSearch = document.getElementById('camp-target-search');
  if (campTargetSearch) {
    campTargetSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const select = document.getElementById('camp-target');
      if (!select) return;

      let visibleCount = 0;
      const optgroups = select.querySelectorAll('optgroup');
      optgroups.forEach((group) => {
        let groupHasMatch = false;
        const options = group.querySelectorAll('option');
        options.forEach((opt) => {
          const match = opt.textContent.toLowerCase().includes(q);
          opt.style.display = match ? '' : 'none';
          if (match) {
            groupHasMatch = true;
            visibleCount++;
          }
        });
        group.style.display = groupHasMatch ? '' : 'none';
      });

      const firstOpt = select.querySelector('option[value="todos"]');
      if (firstOpt) {
        const matchTodos = 'todos os contatos da base geral'.includes(q) || !q;
        firstOpt.style.display = matchTodos ? '' : 'none';
        if (matchTodos) visibleCount++;
      }

      const counterSpan = document.getElementById('camp-target-counter');
      if (counterSpan) {
        counterSpan.textContent = q ? `${visibleCount} opções encontradas` : '';
      }
    });
  }

  // Configuração Dinâmica dos Links de Alternância de Cockpits (Replicador Água)
  function setupCockpitSwitchers() {
    const proto = window.location.protocol;
    const hostname = window.location.hostname;
    const targetUrl = `${proto}//${hostname}:3000`;

    const topBtn = document.getElementById('btn-switch-replica');
    const sidebarBtn = document.getElementById('sidebar-switch-replica');

    [topBtn, sidebarBtn].forEach((btn) => {
      if (btn) {
        btn.href = targetUrl;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.onclick = (e) => {
          e.preventDefault();
          window.open(targetUrl, '_blank');
        };
      }
    });
  }

  // Inicialização
  initFireParticles();
  setupCockpitSwitchers();
  setupFinancasListeners();
  loadStatus();
  loadPastasLeads();
  initSSE();
  setInterval(loadStatus, 10000);
});



