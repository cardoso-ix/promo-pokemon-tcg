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
      const msgAdms = data.adminsIgnorados > 0 ? ` (${data.adminsIgnorados} ADMs protegidos/ignorados)` : '';
      showToast(`Sucesso! ${data.total} novos membros extraídos do grupo "${data.grupoNome}"${msgAdms}.`, 'success');
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
      const res = await fetch('/api/contatos/pasta', {
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
    const res = await fetch('/api/contatos/pastas');
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
      const res = await fetch(`/api/contatos/${id}`, { method: 'DELETE' });
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
    const res = await fetch(`/api/contatos?limit=250&busca=${encodeURIComponent(busca)}&pasta=${encodeURIComponent(pasta)}`);
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
  // Clear Contatos
  document.getElementById('btn-clear-contatos').addEventListener('click', async () => {
    if (confirm('Tem certeza que deseja apagar todos os contatos da base?')) {
      await fetch('/api/contatos', { method: 'DELETE' });
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
      const res = await fetch('/api/contatos/import', {
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

  window.openNovaCampanhaModal = async function(selectedTarget = 'todos') {
    const select = document.getElementById('camp-target');
    select.innerHTML = '<option value="todos">Todos os Contatos da Base Geral</option>';

    try {
      const [resPastas, resGrupos] = await Promise.all([
        fetch('/api/contatos/pastas').then(r => r.json()).catch(() => ({ pastas: [] })),
        fetch('/api/grupos').then(r => r.json()).catch(() => ({ grupos: [] }))
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
    } catch (e) {
      console.warn('Erro ao carregar alvos de campanha:', e);
    }

    if (selectedTarget) {
      select.value = selectedTarget;
    }
    updateWhatsAppPreview();
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

  // Listeners de digitação para o preview ao vivo do WhatsApp
  document.getElementById('camp-template')?.addEventListener('input', updateWhatsAppPreview);
  document.getElementById('camp-media')?.addEventListener('input', updateWhatsAppPreview);
  document.getElementById('btn-shuffle-spintax')?.addEventListener('click', () => {
    updateWhatsAppPreview();
  });

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
      template: `{Olá|Fala|Oi} {nome}! {Tudo bem com você|Como estão as coisas}? Vi seu contato no grupo {grupo}! 🎴⚡\n\nCriei um grupo VIP exclusivo onde solto diariamente promoções com até *50% OFF* em Boosters, Boxes, Decks e Fichários (a maioria com frete Full grátis no Mercado Livre)!\n\nSe você curte colecionar ou jogar e quer pegar as melhores ofertas antes de esgotar, entra por aqui:\n👉 https://chat.whatsapp.com/invite\n\nTe espero lá!`,
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
    let targetPastaNome = null;

    if (targetVal.startsWith('grupo:')) {
      targetType = 'grupo';
      targetGroupJid = targetVal.replace('grupo:', '');
    } else if (targetVal.startsWith('pasta:')) {
      targetType = 'pasta';
      targetPastaNome = targetVal.replace('pasta:', '');
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
          targetPastaNome,
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
          const res = await fetch('/api/warmup/reset', { method: 'POST' });
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
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch {}
        window.location.href = '/login.html';
      }
    });
  }

  // Inicialização
  loadStatus();
  loadPastasLeads();
  initSSE();
});

