// Estado Global da Aplicação
const state = {
  activeTab: 'dashboard',
  whatsapp: { status: 'disconnected', qrDataUrl: null, pairingCode: null, userPhone: null },
  metricas: { totalContatos: 0, totalGrupos: 0, enviosHoje: 0, falhasHoje: 0, respostasIaHoje: 0 },
  grupos: [],
  contatos: [],
  campanhas: [],
  configs: {}
};

// Toast de Notificação
function showToast(message, type = 'info') {
  const toast = document.getElementById('app-toast');
  toast.innerText = message;
  toast.style.display = 'block';
  toast.style.borderColor = type === 'error' ? 'var(--google-red)' : 'var(--google-blue)';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
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

  // Resolver Spintax e substituir variáveis simuladas
  let rendered = resolveSpintaxText(template);
  rendered = rendered
    .replace(/\{nome\}/gi, 'Carlos')
    .replace(/\{saudacao\}/gi, saudacao)
    .replace(/\{grupo\}/gi, 'Pokémon TCG VIP')
    .replace(/\{numero\}/gi, '55 11 99999-9999');

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
  if (tabId === 'contatos') loadContatos();
  if (tabId === 'campanhas') loadCampanhas();
  if (tabId === 'deepseek' || tabId === 'configuracoes') loadConfigs();
  if (tabId === 'logs') loadLogs();
}

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
}

// Conectar via SSE para tempo real
function initSSE() {
  const eventSource = new EventSource('/api/events');

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
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.whatsapp) updateWhatsAppUI(data.whatsapp);
    if (data.metricas) updateMetricasUI(data.metricas);
    if (data.configs) state.configs = data.configs;
  } catch (err) {
    console.warn('Falha ao carregar status inicial:', err);
  }
}

// Grupos
async function loadGrupos(refetch = true) {
  const container = document.getElementById('grupos-list');
  const counter = document.getElementById('grupos-counter');
  const searchInput = document.getElementById('grupos-search');
  const query = (searchInput?.value || '').toLowerCase().trim();

  try {
    if (refetch || !state.grupos || state.grupos.length === 0) {
      const res = await fetch('/api/grupos');
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
    const res = await fetch('/api/grupos/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupJid: jid })
    });
    const data = await res.json();
    if (data.ok) {
      showToast(`Sucesso! ${data.total} novos membros extraídos do grupo "${data.grupoNome}".`, 'success');
      loadStatus();
      loadContatos();
    } else {
      showToast(data.message || 'Falha na extração.', 'error');
    }
  } catch (err) {
    showToast(`Erro na extração: ${err.message}`, 'error');
  }
};

// Contatos
async function loadContatos() {
  const tbody = document.getElementById('contatos-tbody');
  const counter = document.getElementById('contatos-counter');
  const busca = (document.getElementById('contatos-search')?.value || '').trim();

  try {
    const res = await fetch(`/api/contatos?limit=100&busca=${encodeURIComponent(busca)}`);
    const { contatos, total } = await res.json();
    state.contatos = contatos || [];

    if (counter) {
      counter.innerText = `${total} contatos cadastrados`;
    }

    if (!contatos || contatos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhum contato encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = contatos.map(c => `
      <tr>
        <td><strong>+${c.numero}</strong></td>
        <td>${escapeHtml(c.nome) || '<span class="text-muted">Sem nome</span>'}</td>
        <td>${escapeHtml(c.grupo_nome) || '<span class="text-muted">Manual</span>'}</td>
        <td><span class="badge info">${c.origem_tipo}</span></td>
        <td>${c.criado_em ? c.criado_em.split(' ')[0] : '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro: ${err.message}</td></tr>`;
  }
}

// Campanhas
async function loadCampanhas(refetch = true) {
  const container = document.getElementById('campanhas-container');
  const counter = document.getElementById('campanhas-counter');
  const query = (document.getElementById('campanhas-search')?.value || '').toLowerCase().trim();

  try {
    if (refetch || !state.campanhas || state.campanhas.length === 0) {
      const res = await fetch('/api/campanhas');
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
  await fetch(`/api/campanhas/${id}/start`, { method: 'POST' });
  showToast('Campanha iniciada! Disparos rodando em segundo plano.', 'success');
  loadCampanhas();
};

window.pauseCampanha = async function(id) {
  await fetch(`/api/campanhas/${id}/pause`, { method: 'POST' });
  showToast('Campanha pausada.', 'info');
  loadCampanhas();
};

window.cancelCampanha = async function(id) {
  if (confirm('Tem certeza que deseja cancelar esta campanha?')) {
    await fetch(`/api/campanhas/${id}/cancel`, { method: 'POST' });
    showToast('Campanha cancelada.', 'warn');
    loadCampanhas();
  }
};

window.deleteCampanha = async function(id, nome) {
  if (confirm(`Deseja realmente excluir a campanha "${nome}"?\nTodos os disparos pendentes desta fila também serão removidos.`)) {
    try {
      const res = await fetch(`/api/campanhas/${id}`, { method: 'DELETE' });
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
    const res = await fetch('/api/config');
    const cfg = await res.json();
    state.configs = cfg;

    // DeepSeek Form
    document.getElementById('deepseek-ativo-toggle').checked = cfg.deepseek_ativo === 'true';
    document.getElementById('deepseek-key-input').value = cfg.deepseek_api_key || '';
    document.getElementById('deepseek-url-input').value = cfg.deepseek_base_url || 'https://api.deepseek.com/v1';
    document.getElementById('deepseek-model-input').value = cfg.deepseek_model || 'deepseek-chat';
    document.getElementById('deepseek-prompt-textarea').value = cfg.deepseek_prompt_sistema || '';
    document.getElementById('deepseek-delay-min').value = cfg.deepseek_delay_min || '3';
    document.getElementById('deepseek-delay-max').value = cfg.deepseek_delay_max || '6';

    // Anti-ban Form
    document.getElementById('cfg-delay-min').value = cfg.disparo_delay_min || '30';
    document.getElementById('cfg-delay-max').value = cfg.disparo_delay_max || '65';
    document.getElementById('cfg-pausa-cada').value = cfg.disparo_pausa_a_cada || '20';
    document.getElementById('cfg-pausa-minutos').value = cfg.disparo_pausa_tempo_minutos || '5';
    document.getElementById('cfg-hora-inicio').value = cfg.disparo_horario_inicio || '08:00';
    document.getElementById('cfg-hora-fim').value = cfg.disparo_horario_fim || '21:30';
    document.getElementById('cfg-limite-diario').value = cfg.disparo_limite_diario || '100';
  } catch (err) {
    console.warn('Erro ao carregar configs:', err);
  }
}

async function saveConfigs(updates) {
  try {
    const res = await fetch('/api/config', {
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

// Logs
async function loadLogs(refetch = true) {
  const terminal = document.getElementById('terminal-logs');
  const searchInput = document.getElementById('logs-search');
  const query = (searchInput?.value || '').toLowerCase().trim();

  try {
    if (refetch || !state.logs || state.logs.length === 0) {
      const res = await fetch('/api/logs?limit=120');
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
    await fetch('/api/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairingPhone: phone || undefined })
    });
  });

  // Disconnect WhatsApp Button
  document.getElementById('btn-disconnect').addEventListener('click', async () => {
    if (confirm('Deseja desconectar e resetar a sessão do WhatsApp?')) {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      showToast('WhatsApp desconectado.', 'info');
    }
  });

  // Sync All
  document.getElementById('btn-sync-all').addEventListener('click', async () => {
    showToast('Sincronizando grupos e status...', 'info');
    await fetch('/api/grupos/sync', { method: 'POST' });
    await loadStatus();
    showToast('Sincronização concluída!', 'success');
  });

  document.getElementById('btn-refresh-grupos').addEventListener('click', async () => {
    showToast('Sincronizando grupos...', 'info');
    await fetch('/api/grupos/sync', { method: 'POST' });
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
  document.getElementById('btn-clear-contatos').addEventListener('click', async () => {
    if (confirm('Tem certeza que deseja apagar todos os contatos da base?')) {
      await fetch('/api/contatos', { method: 'DELETE' });
      showToast('Base de contatos limpa.', 'warn');
      loadContatos();
    }
  });

  // Import Modal
  const modalImport = document.getElementById('modal-import');
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
    const rawText = document.getElementById('import-textarea').value.trim();
    const grupoNome = document.getElementById('import-grupo-nome').value.trim();
    if (!rawText) return alert('Insira ao menos um número.');

    const res = await fetch('/api/contatos/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, grupoNome })
    });
    const data = await res.json();
    if (data.ok) {
      showToast(`${data.totalImported} contatos importados com sucesso!`, 'success');
      modalImport.style.display = 'none';
      document.getElementById('import-textarea').value = '';
      loadContatos();
    }
  });

  // Nova Campanha Modal & Simulador WhatsApp Live
  const modalCampanha = document.getElementById('modal-campanha');
  document.getElementById('btn-open-nova-campanha').addEventListener('click', async () => {
    // Carregar grupos no select
    const select = document.getElementById('camp-target');
    select.innerHTML = '<option value="todos">Todos os Contatos da Base</option>';
    const res = await fetch('/api/grupos');
    const { grupos } = await res.json();
    if (grupos) {
      grupos.forEach(g => {
        select.innerHTML += `<option value="grupo:${g.jid}">Apenas Membros de: ${escapeHtml(g.nome)}</option>`;
      });
    }
    updateWhatsAppPreview();
    modalCampanha.style.display = 'flex';
  });

  document.getElementById('btn-close-campanha-modal').addEventListener('click', () => {
    modalCampanha.style.display = 'none';
  });
  document.getElementById('btn-cancel-campanha').addEventListener('click', () => {
    modalCampanha.style.display = 'none';
  });

  // Listeners de digitação para o preview ao vivo do WhatsApp
  document.getElementById('camp-template')?.addEventListener('input', updateWhatsAppPreview);
  document.getElementById('camp-media')?.addEventListener('input', updateWhatsAppPreview);
  document.getElementById('btn-shuffle-spintax')?.addEventListener('click', () => {
    updateWhatsAppPreview();
  });

  // Click tag to insert in template and update preview
  document.querySelectorAll('.tags-hint code').forEach(code => {
    code.addEventListener('click', () => {
      const textarea = document.getElementById('camp-template');
      textarea.value += code.innerText;
      textarea.focus();
      updateWhatsAppPreview();
    });
  });

  document.getElementById('btn-save-campanha').addEventListener('click', async () => {
    const nome = document.getElementById('camp-nome').value.trim();
    const targetVal = document.getElementById('camp-target').value;
    const template = document.getElementById('camp-template').value.trim();
    const media = document.getElementById('camp-media').value.trim();

    if (!nome || !template) return alert('Preencha o nome e o modelo da mensagem.');

    let targetType = 'todos';
    let targetGroupJid = null;
    if (targetVal.startsWith('grupo:')) {
      targetType = 'grupo';
      targetGroupJid = targetVal.replace('grupo:', '');
    }

    try {
      const res = await fetch('/api/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          mensagemTemplate: template,
          targetType,
          targetGroupJid,
          mediaPath: media || undefined
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Campanha criada com ${data.totalDestinatarios} mensagens!`, 'success');
        modalCampanha.style.display = 'none';
        document.getElementById('camp-nome').value = '';
        document.getElementById('camp-template').value = '';
        document.getElementById('camp-media').value = '';
        loadCampanhas(true);
      } else {
        alert(data.message || 'Erro ao criar campanha.');
      }
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  });

  // Save DeepSeek Configs
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

  // Test DeepSeek
  document.getElementById('btn-test-deepseek').addEventListener('click', async () => {
    const input = document.getElementById('deepseek-test-input').value.trim();
    const output = document.getElementById('deepseek-test-output');
    output.style.display = 'block';
    output.innerText = 'Pensando com DeepSeek... Aguarde...';

    try {
      const res = await fetch('/api/deepseek/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input || undefined })
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

  // Save Anti-Ban Configs
  document.getElementById('btn-save-configs').addEventListener('click', () => {
    saveConfigs({
      disparo_delay_min: document.getElementById('cfg-delay-min').value,
      disparo_delay_max: document.getElementById('cfg-delay-max').value,
      disparo_pausa_a_cada: document.getElementById('cfg-pausa-cada').value,
      disparo_pausa_tempo_minutos: document.getElementById('cfg-pausa-minutos').value,
      disparo_horario_inicio: document.getElementById('cfg-hora-inicio').value,
      disparo_horario_fim: document.getElementById('cfg-hora-fim').value,
      disparo_limite_diario: document.getElementById('cfg-limite-diario').value
    });
  });

  // Refresh Logs Button
  document.getElementById('btn-refresh-logs').addEventListener('click', loadLogs);

  // Inicialização
  loadStatus();
  initSSE();
});
