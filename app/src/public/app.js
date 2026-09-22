// Client-side Dashboard Application — Cockpit Autônomo
(function () {
  let ws = null;
  let allChats = [];
  let allRotas = [];
  let feedLogs = [];
  let currentFilter = 'all';
  let searchQuery = '';

  // Áudio Chime (Web Audio API)
  let soundEnabled = localStorage.getItem('replica_sound_enabled') !== 'false';

  function playChime() {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc2.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.36);
      osc2.stop(ctx.currentTime + 0.36);
    } catch (e) {
      console.warn('Áudio não inicializado:', e);
    }
  }

  // Elementos DOM Principais
  const waStatusBadge = document.getElementById('wa-status-badge');
  const waStatusText = document.getElementById('wa-status-text');
  const meliStatusBadge = document.getElementById('meli-status-badge');
  const meliStatusText = document.getElementById('meli-status-text');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');
  const masterToggle = document.getElementById('master-toggle');

  const kpiStatus = document.getElementById('kpi-status');
  const kpiSubStatus = document.getElementById('kpi-sub-status');
  const kpiToday = document.getElementById('kpi-today');
  const kpiHour = document.getElementById('kpi-hour');
  const kpiWa = document.getElementById('kpi-wa');
  const kpiPhoneSub = document.getElementById('kpi-phone-sub');

  // Pokémon TCG HP Meter & Sentinel DOM elements
  const hpMeterFill = document.getElementById('hp-meter-fill');
  const hpMeterPercent = document.getElementById('hp-meter-percent');
  const cookieSentinelBanner = document.getElementById('cookie-sentinel-banner');
  const sentinelTitle = document.getElementById('sentinel-title');
  const sentinelDesc = document.getElementById('sentinel-desc');
  const btnRecheckCookie = document.getElementById('btn-recheck-cookie');
  const btnFixCookie = document.getElementById('btn-fix-cookie');

  const rotasCount = document.getElementById('rotas-count');
  const feedList = document.getElementById('feed-list');
  const feedSearch = document.getElementById('feed-search');
  const filterChips = document.querySelectorAll('.filter-chip');
  const rotasGrid = document.getElementById('rotas-list');
  const btnSyncChats = document.getElementById('btn-sync-chats');

  const qrBox = document.getElementById('qr-box');
  const waConnectedBox = document.getElementById('wa-connected-box');
  const waConnectedPhone = document.getElementById('wa-connected-phone');
  const btnWaLogout = document.getElementById('btn-wa-logout');
  const waDisconnectedActions = document.getElementById('wa-disconnected-actions');
  const btnWaForceQr = document.getElementById('btn-wa-force-qr');

  // Config inputs
  const cfgMattWord = document.getElementById('cfg-matt-word');
  const cfgMattTool = document.getElementById('cfg-matt-tool');
  const cfgDelay = document.getElementById('cfg-delay');
  const cfgTeto = document.getElementById('cfg-teto');
  const cfgMaxDelay = document.getElementById('cfg-max-delay');
  const cfgMeliCookie = document.getElementById('cfg-meli-cookie');
  const cfgMeliTag = document.getElementById('cfg-meli-tag');
  const cfgLinkVitrineCurto = document.getElementById('cfg-link-vitrine-curto');
  const btnDetectarVitrine = document.getElementById('btn-detectar-vitrine');
  const vitrineDetectFeedback = document.getElementById('vitrine-detect-feedback');
  const cfgSomenteMeli = document.getElementById('cfg-somente-meli');
  const cfgReplicarComunicados = document.getElementById('cfg-replicar-comunicados');
  const cfgTemplateModo = document.getElementById('cfg-template-modo');
  const cfgCooldownDuplicidade = document.getElementById('cfg-cooldown-duplicidade');
  const cfgFiltroApenasTcg = document.getElementById('cfg-filtro-apenas-tcg');
  const btnSwitchDisparador = document.getElementById('btn-switch-disparador');
  const btnTestarCookie = document.getElementById('btn-testar-cookie');
  const cookieTestFeedback = document.getElementById('cookie-test-feedback');
  const cfgFrases = document.getElementById('cfg-frases');
  const cfgSheetsAtivo = document.getElementById('cfg-sheets-ativo');
  const cfgSheetsWebhook = document.getElementById('cfg-sheets-webhook');
  const btnTestarSheets = document.getElementById('btn-testar-sheets');
  const sheetsTestFeedback = document.getElementById('sheets-test-feedback');
  const sheetsScriptCode = document.getElementById('sheets-script-code');
  const btnCopiarScript = document.getElementById('btn-copiar-script');
  const cfgMsgAberturaAtivo = document.getElementById('cfg-msg-abertura-ativo');
  const cfgMsgAberturaHorario = document.getElementById('cfg-msg-abertura-horario');
  const cfgMsgAberturaTexto = document.getElementById('cfg-msg-abertura-texto');
  const msgAberturaStatusBadge = document.getElementById('msg-abertura-status-badge');
  const btnTestarMsgAbertura = document.getElementById('btn-testar-msg-abertura');
  const btnRestaurarMsgAbertura = document.getElementById('btn-restaurar-msg-abertura');
  const msgAberturaFeedback = document.getElementById('msg-abertura-feedback');
  const btnSalvarConfig = document.getElementById('btn-salvar-config');
  const configStatusMsg = document.getElementById('config-status-msg');

  if (btnSwitchDisparador) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    btnSwitchDisparador.href = isLocal
      ? 'http://localhost:3333'
      : 'https://bot-disparador-ia-production.up.railway.app';
  }

  // Modal Rota
  const modalRota = document.getElementById('modal-rota');
  const modalRotaTitle = document.getElementById('modal-rota-title');
  const modalRotaClose = document.getElementById('modal-rota-close');
  const btnCancelarRota = document.getElementById('btn-cancelar-rota');
  const btnSalvarRota = document.getElementById('btn-salvar-rota');
  const btnNovaRota = document.getElementById('btn-nova-rota');
  const rotaEditId = document.getElementById('rota-edit-id');
  const rotaNome = document.getElementById('rota-nome');
  const origensSelector = document.getElementById('origens-selector');
  const destinosSelector = document.getElementById('destinos-selector');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // Inicializar estado do Som
  function updateSoundUI() {
    if (soundEnabled) {
      btnSoundToggle.classList.remove('muted');
      soundIcon.textContent = '🔔';
      soundLabel.textContent = 'Som: ON';
    } else {
      btnSoundToggle.classList.add('muted');
      soundIcon.textContent = '🔕';
      soundLabel.textContent = 'Som: OFF';
    }
  }
  updateSoundUI();

  btnSoundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('replica_sound_enabled', String(soundEnabled));
    updateSoundUI();
    if (soundEnabled) playChime();
    showToast(soundEnabled ? 'Notificações sonoras ativadas 🔔' : 'Notificações sonoras em silêncio 🔕');
  });

  // Botão Sair / Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('Deseja realmente sair do painel Réplica Promo?')) {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch {}
        window.location.href = '/login.html';
      }
    });
  }

  // Toasts
  function showToast(message, duration = 3000) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `<span>✨</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOutToast 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const tabTarget = document.getElementById(`tab-${btn.dataset.tab}`);
      if (tabTarget) tabTarget.classList.add('active');
    });
  });

  // Conexão WebSocket
  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws`);

    ws.onopen = () => {
      console.log('Conectado ao WebSocket do servidor');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsEvent(msg.event, msg.data);
      } catch (e) {
        console.error('Erro ao processar mensagem do WebSocket:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket desconectado. Reconectando em 3s...');
      setTimeout(connectWebSocket, 3000);
    };
  }

  function handleWsEvent(event, data) {
    switch (event) {
      case 'init':
        handleInit(data);
        break;
      case 'whatsapp_state':
        updateWhatsAppUI(data);
        break;
      case 'new_log':
        handleNewLog(data);
        break;
      case 'rotas_updated':
        allRotas = data;
        renderRotas(data);
        renderAnuncioDestinos();
        break;
      case 'chats_updated':
        allChats = data;
        renderAnuncioDestinos();
        break;
      case 'stats_update':
        updateStats(data);
        break;
      case 'cookie_status':
        updateCookieSentinelUI(data);
        break;
      case 'config_updated':
        if (data.chave === 'ativo') {
          updateMasterSwitch(data.valor === 'true');
        } else if (data.chave === 'meli_cookie') {
          updateMeliBadge(data.valor);
        }
        break;
    }
  }

  function updateCookieSentinelUI(cookieStatus) {
    if (!cookieSentinelBanner || !cookieStatus) return;

    if (cookieStatus.status === 'expired' || cookieStatus.status === 'warning') {
      cookieSentinelBanner.style.display = 'flex';
      cookieSentinelBanner.className = 'cookie-sentinel-banner';
      if (sentinelTitle) sentinelTitle.textContent = 'Alerta Sentinel · Cookie Mercado Livre Expirado';
      if (sentinelDesc) sentinelDesc.textContent = cookieStatus.message || 'Sua sessão de afiliado expirou. Renove o cookie para continuar gerando links oficiais meli.la.';
      if (meliStatusBadge) {
        meliStatusBadge.className = 'badge badge-disconnected';
        meliStatusText.textContent = 'meli.la Inativo';
      }
    } else if (cookieStatus.status === 'missing') {
      cookieSentinelBanner.style.display = 'flex';
      cookieSentinelBanner.className = 'cookie-sentinel-banner';
      if (sentinelTitle) sentinelTitle.textContent = 'Cookie Mercado Livre Não Configurado';
      if (sentinelDesc) sentinelDesc.textContent = 'Para utilizar o encurtador oficial meli.la e obter a foto oficial do anúncio, configure o cookie de sessão.';
      if (meliStatusBadge) {
        meliStatusBadge.className = 'badge badge-neutral';
        meliStatusText.textContent = 'Modo Padrão';
      }
    } else if (cookieStatus.status === 'valid') {
      cookieSentinelBanner.style.display = 'none';
      if (meliStatusBadge) {
        meliStatusBadge.className = 'badge badge-meli';
        meliStatusText.textContent = 'meli.la Operacional ✓';
      }
    }
  }

  if (btnFixCookie) {
    btnFixCookie.addEventListener('click', () => {
      const configTabBtn = document.querySelector('.tab-btn[data-tab="config"]');
      if (configTabBtn) configTabBtn.click();
      setTimeout(() => {
        if (cfgMeliCookie) {
          cfgMeliCookie.focus();
          cfgMeliCookie.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    });
  }

  if (btnRecheckCookie) {
    btnRecheckCookie.addEventListener('click', async () => {
      btnRecheckCookie.disabled = true;
      const originalText = btnRecheckCookie.textContent;
      btnRecheckCookie.textContent = '⏳ Verificando...';
      try {
        const res = await fetch('/api/cookie/check', { method: 'POST' });
        const data = await res.json();
        updateCookieSentinelUI(data);
        showToast(data.status === 'valid' ? 'Cookie verificado e válido! ✓' : 'Aviso: Cookie recusado pelo Mercado Livre');
      } catch (e) {
        showToast('Erro ao testar cookie');
      } finally {
        btnRecheckCookie.disabled = false;
        btnRecheckCookie.textContent = originalText;
      }
    });
  }

  function updateMeliBadge(cookieValue) {
    if (!meliStatusBadge) return;
    const hasCookie = Boolean(cookieValue && cookieValue.trim().length > 10);
    if (hasCookie) {
      meliStatusBadge.className = 'badge badge-meli';
      meliStatusText.textContent = 'meli.la Ativo';
    } else {
      meliStatusBadge.className = 'badge badge-neutral';
      meliStatusText.textContent = 'Fallback Ativo';
    }
  }

  function handleInit(data) {
    // 1. WhatsApp State
    updateWhatsAppUI(data.whatsapp);

    // 2. Configs
    if (data.configs) {
      cfgMattWord.value = data.configs.affiliate_matt_word || '';
      cfgMattTool.value = data.configs.affiliate_matt_tool || '';
      cfgDelay.value = data.configs.delay_segundos || '5';
      cfgTeto.value = data.configs.teto_hora || '40';
      cfgMaxDelay.value = data.configs.atraso_maximo_segundos || '600';
      if (cfgMeliCookie) cfgMeliCookie.value = data.configs.meli_cookie || '';
      if (cfgMeliTag) cfgMeliTag.value = data.configs.meli_tag || '';
      if (cfgLinkVitrineCurto) cfgLinkVitrineCurto.value = data.configs.link_vitrine_curto || 'https://mercadolivre.com/sec/2rM6RPm';
      if (cfgSomenteMeli) cfgSomenteMeli.checked = data.configs.somente_mercadolivre !== 'false';
      if (cfgReplicarComunicados) cfgReplicarComunicados.checked = data.configs.replicar_comunicados_texto === 'true';
      if (cfgTemplateModo) cfgTemplateModo.value = data.configs.template_modo || 'padrao';
      if (cfgCooldownDuplicidade) cfgCooldownDuplicidade.value = data.configs.cooldown_duplicidade_minutos || '30';
      if (cfgFiltroApenasTcg) cfgFiltroApenasTcg.checked = data.configs.filtro_apenas_tcg !== 'false';
      if (cfgSheetsWebhook) cfgSheetsWebhook.value = data.configs.google_sheets_webhook_url || '';
      if (cfgSheetsAtivo) cfgSheetsAtivo.checked = data.configs.google_sheets_ativo !== 'false';
      if (cfgMsgAberturaAtivo) cfgMsgAberturaAtivo.checked = data.configs.msg_abertura_ativa !== 'false';
      if (cfgMsgAberturaHorario) cfgMsgAberturaHorario.value = data.configs.msg_abertura_horario || '07:00';
      if (cfgMsgAberturaTexto) cfgMsgAberturaTexto.value = data.configs.msg_abertura_texto || '';
      cfgFrases.value = data.configs.frases_remover || '';

      carregarStatusAgendador();

      updateMasterSwitch(data.configs.ativo === 'true');
      updateMeliBadge(data.configs.meli_cookie);

      // Carregar código do script do Google Apps Script
      fetch('/api/sheets/config')
        .then((r) => r.json())
        .then((res) => {
          if (sheetsScriptCode && res.appsScriptCode) {
            sheetsScriptCode.value = res.appsScriptCode;
          }
        })
        .catch(() => {});
    }

    // 3. Rotas & Chats
    allChats = data.chats || [];
    allRotas = data.rotas || [];
    renderRotas(allRotas);
    renderAnuncioDestinos();

    // 4. Logs no Feed
    feedLogs = data.logs || [];
    renderFeed();

    // 5. Stats
    if (data.stats) {
      updateStats(data.stats);
    }

    // 6. Cookie Sentinel Status
    if (data.cookieStatus) {
      updateCookieSentinelUI(data.cookieStatus);
    }
  }

  function updateWhatsAppUI(state) {
    if (!state) return;

    waStatusBadge.className = 'badge';

    if (state.status === 'connected') {
      waStatusBadge.classList.add('badge-connected');
      waStatusText.textContent = 'Conectado';
      kpiWa.textContent = 'CONECTADO';
      kpiWa.className = 'kpi-value text-green';
      kpiPhoneSub.textContent = `Aparelho: ${state.userPhone || 'Ativo'}`;

      qrBox.style.display = 'none';
      waConnectedBox.style.display = 'block';
      waConnectedPhone.textContent = `Número: ${state.userPhone || 'Conectado'}`;
      if (waDisconnectedActions) waDisconnectedActions.style.display = 'none';
    } else if (state.status === 'qr' && state.qrDataUrl) {
      waStatusBadge.classList.add('badge-qr');
      waStatusText.textContent = 'Ler QR Code';
      kpiWa.textContent = 'AGUARDANDO QR';
      kpiWa.className = 'kpi-value text-gold';
      kpiPhoneSub.textContent = 'Abra a aba Conectar para escanear';

      qrBox.style.display = 'inline-block';
      waConnectedBox.style.display = 'none';
      qrBox.innerHTML = `<img src="${state.qrDataUrl}" alt="QR Code WhatsApp">`;
      if (waDisconnectedActions) waDisconnectedActions.style.display = 'block';
    } else {
      waStatusBadge.classList.add('badge-disconnected');
      waStatusText.textContent = state.status === 'connecting' ? 'Conectando...' : 'Desconectado';
      kpiWa.textContent = state.status === 'connecting' ? 'CONECTANDO' : 'DESCONECTADO';
      kpiWa.className = 'kpi-value text-danger';
      kpiPhoneSub.textContent = state.status === 'connecting' ? 'Preparando conexão' : 'Conexão inativa';

      qrBox.style.display = 'inline-block';
      waConnectedBox.style.display = 'none';
      qrBox.innerHTML = `
        <div class="qr-placeholder">
          <div class="spinner"></div>
          <span>${state.status === 'connecting' ? 'Conectando ao WhatsApp...' : 'Aguardando inicialização do QR Code...'}</span>
        </div>
      `;
      if (waDisconnectedActions) waDisconnectedActions.style.display = 'block';
    }
  }

  function updateMasterSwitch(isActive) {
    masterToggle.checked = isActive;
    if (isActive) {
      kpiStatus.textContent = 'ATIVO';
      kpiStatus.className = 'kpi-value text-gold';
      kpiSubStatus.textContent = 'Monitorando grupos normalmente';
    } else {
      kpiStatus.textContent = 'PAUSADO';
      kpiStatus.className = 'kpi-value text-muted';
      kpiSubStatus.textContent = 'Réplica desativada pelo operador';
    }
  }

  function updateStats(stats) {
    const teto = parseInt(cfgTeto?.value || '40', 10);
    if (stats.postsLastHour !== undefined) {
      kpiHour.innerHTML = `${stats.postsLastHour} <span class="kpi-limit">/ ${teto}</span>`;

      if (hpMeterFill && hpMeterPercent) {
        const percent = Math.min(100, Math.round((stats.postsLastHour / Math.max(teto, 1)) * 100));
        hpMeterFill.style.width = `${percent}%`;
        hpMeterPercent.textContent = `${percent}%`;

        hpMeterFill.classList.remove('warning', 'critical');
        if (percent >= 80) {
          hpMeterFill.classList.add('critical');
        } else if (percent >= 50) {
          hpMeterFill.classList.add('warning');
        }
      }
    }
    if (stats.totalEnviadosHoje !== undefined) {
      kpiToday.textContent = stats.totalEnviadosHoje;
    }
  }

  // Feed de Atividades com Filtro e Pesquisa
  function handleNewLog(log) {
    feedLogs.unshift(log);
    if (feedLogs.length > 80) feedLogs.pop();
    renderFeed(log.id || 'new');

    if (log.status === 'enviado') {
      playChime();
      showToast('Nova oferta replicada com sucesso! 📦⚡');
    }
  }

  function renderFeed(highlightId = null) {
    let filtered = feedLogs;

    // Filtro por status
    if (currentFilter === 'enviado') {
      filtered = filtered.filter((l) => l.status === 'enviado');
    } else if (currentFilter === 'ignorado') {
      filtered = filtered.filter((l) => l.status !== 'enviado');
    }

    // Busca por texto
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((l) => {
        const text = (l.texto_publicado || l.texto_original || '').toLowerCase();
        const origem = (l.origem_nome || l.origem_chat_id || '').toLowerCase();
        return text.includes(q) || origem.includes(q);
      });
    }

    if (filtered.length === 0) {
      feedList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📡</div>
          <h3>Nenhuma mensagem encontrada</h3>
          <p>${searchQuery ? 'Nenhum resultado para a busca aplicada.' : 'Aguardando ofertas nos grupos de origem monitorados...'}</p>
        </div>
      `;
      return;
    }

    feedList.innerHTML = '';
    filtered.forEach((log) => {
      const item = createFeedElement(log, highlightId && (log.id === highlightId || highlightId === 'new'));
      feedList.appendChild(item);
    });
  }

  function createFeedElement(log, isHighlight) {
    const item = document.createElement('div');
    item.className = 'feed-item holo-foil' + (isHighlight ? ' new-arrival' : '');

    const isEnviado = log.status === 'enviado';
    let statusBadge = '';
    if (isEnviado) {
      if (log.motivo === 'comunicado_replicado') {
        statusBadge = '<span class="badge badge-meli" title="Comunicado ou aviso de texto replicado"><span class="indicator-dot"></span>📢 Comunicado</span>';
      } else {
        statusBadge = '<span class="badge badge-connected"><span class="indicator-dot"></span>⚡ Enviado</span>';
      }
    } else if (log.status === 'ignorado') {
      const motivo = log.motivo || '';
      if (motivo.includes('cooldown')) {
        statusBadge = `<span class="badge badge-purple" title="Bloqueado pelo Anti-Flood Multi-Grupo (já postado recentemente)"><span class="indicator-dot"></span>⏱️ Anti-Dup Multi-Grupo</span>`;
      } else if (motivo === 'fora_nicho_tcg') {
        statusBadge = `<span class="badge badge-neutral" title="Ignorado pelo Guardião de Nicho: produto fora do universo TCG"><span class="indicator-dot"></span>🚫 Fora do Nicho TCG</span>`;
      } else if (motivo === 'marketplace_concorrente') {
        statusBadge = `<span class="badge badge-neutral" title="Ignorado: link de marketplace concorrente (Amazon, Shopee, etc.)"><span class="indicator-dot"></span>🚫 Marketplace Concorrente</span>`;
      } else if (motivo === 'comunicado_desativado') {
        statusBadge = `<span class="badge badge-neutral" title="Ignorado: comunicados e mensagens de texto desativados"><span class="indicator-dot"></span>🔇 Comunicado Desativado</span>`;
      } else if (motivo === 'sem_link_mercadolivre') {
        statusBadge = `<span class="badge badge-neutral" title="Ignorado: sem link do Mercado Livre"><span class="indicator-dot"></span>🛍️ Sem Link ML</span>`;
      } else {
        statusBadge = `<span class="badge badge-qr" title="${escapeHtml(motivo)}"><span class="indicator-dot"></span>🛡️ Ignorado</span>`;
      }
    } else {
      statusBadge = `<span class="badge badge-disconnected" title="${escapeHtml(log.motivo || '')}"><span class="indicator-dot"></span>🔥 Erro</span>`;
    }

    const timeFormatted = log.criado_em
      ? new Date(log.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : new Date().toLocaleTimeString('pt-BR');

    const rawContent = log.texto_publicado || log.texto_original || '(Sem texto)';
    const bubbleClass = isEnviado ? 'feed-body' : 'feed-body inbound-bubble';
    const checkmarks = isEnviado ? '<span class="wa-ticks">✓✓</span>' : '';

    item.innerHTML = `
      <div class="feed-header">
        <span class="feed-origem">⚡ Origem: ${escapeHtml(log.origem_nome || log.origem_chat_id || 'Grupo Desconhecido')}</span>
        <div class="feed-meta">
          <span>${timeFormatted}</span>
          ${statusBadge}
        </div>
      </div>
      <div class="${bubbleClass}">
        <div>${escapeHtml(rawContent)}</div>
        <div class="wa-bubble-footer">
          <span>${timeFormatted}</span>
          ${checkmarks}
        </div>
      </div>
      <div class="feed-footer">
        <span>Destino: ${escapeHtml(log.destino_chat_id || 'Nenhum')} · ${log.tem_foto ? '📷 Com Foto' : '📝 Somente Texto'} · ${log.links_convertidos || 0} links ML</span>
        <button class="btn-copy-card" data-content="${encodeURIComponent(rawContent)}" title="Copiar texto tratado para a área de transferência">
          📋 Copiar Post
        </button>
      </div>
    `;

    const copyBtn = item.querySelector('.btn-copy-card');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const content = decodeURIComponent(copyBtn.dataset.content);
        navigator.clipboard.writeText(content).then(() => {
          showToast('Texto copiado com sucesso! ✓');
        });
      });
    }

    return item;
  }

  // Filtros e busca no Feed
  if (feedSearch) {
    feedSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderFeed();
    });
  }

  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderFeed();
    });
  });

  // Renderização de Rotas
  function renderRotas(rotas) {
    rotasCount.textContent = rotas.length;

    if (rotas.length === 0) {
      rotasGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">🔀</div>
          <h3>Nenhuma rota criada</h3>
          <p>Clique no botão <strong>+ Nova Rota</strong> acima para vincular os grupos de origem ao seu grupo de destino.</p>
        </div>
      `;
      return;
    }

    rotasGrid.innerHTML = '';
    rotas.forEach((r) => {
      const card = document.createElement('div');
      card.className = 'rota-card';

      const origensNames = r.origens.map((id) => getChatTitle(id)).join(', ') || 'Nenhuma selecionada';
      const destinosNames = r.destinos.map((id) => getChatTitle(id)).join(', ') || 'Nenhum selecionado';

      card.innerHTML = `
        <div class="rota-header">
          <span class="rota-title">${escapeHtml(r.nome)}</span>
          <label class="switch">
            <input type="checkbox" class="rota-toggle" data-id="${r.id}" ${r.ativa ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>
        <div class="rota-box">
          <span class="rota-label">Origens (${r.origens.length})</span>
          <span>${escapeHtml(origensNames)}</span>
        </div>
        <div class="rota-box">
          <span class="rota-label">Destinos (${r.destinos.length})</span>
          <span>${escapeHtml(destinosNames)}</span>
        </div>
        <div class="rota-actions">
          <button class="btn btn-ghost btn-editar-rota" data-id="${r.id}">Editar</button>
          <button class="btn btn-danger btn-excluir-rota" data-id="${r.id}">Excluir</button>
        </div>
      `;

      rotasGrid.appendChild(card);
    });

    // Listeners de toggle
    rotasGrid.querySelectorAll('.rota-toggle').forEach((toggle) => {
      toggle.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        await fetch(`/api/rotas/${id}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativa: e.target.checked })
        });
        showToast('Status da rota atualizado!');
      });
    });

    // Listeners de editar
    rotasGrid.querySelectorAll('.btn-editar-rota').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rota = allRotas.find((r) => r.id === parseInt(btn.dataset.id, 10));
        if (rota) openModalRota(rota);
      });
    });

    // Listeners de excluir
    rotasGrid.querySelectorAll('.btn-excluir-rota').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja excluir esta rota?')) {
          await fetch(`/api/rotas/${btn.dataset.id}`, { method: 'DELETE' });
          showToast('Rota removida com sucesso!');
        }
      });
    });
  }

  function getChatTitle(chatId) {
    const found = allChats.find((c) => c.chat_id === chatId);
    return found ? found.nome : chatId;
  }

  function openModalRota(rota = null) {
    modalRotaTitle.textContent = rota ? 'Editar Rota' : 'Nova Rota de Promoções';
    rotaEditId.value = rota ? rota.id : '';
    rotaNome.value = rota ? rota.nome : '';

    renderChatSelectors(rota ? rota.origens : [], rota ? rota.destinos : []);
    modalRota.style.display = 'flex';
  }

  function renderChatSelectors(selectedOrigens = [], selectedDestinos = []) {
    origensSelector.innerHTML = '';
    destinosSelector.innerHTML = '';

    if (allChats.length === 0) {
      origensSelector.innerHTML = '<p class="field-hint" style="padding: 0.5rem;">Nenhum grupo detectado ainda. Conecte o WhatsApp para sincronizar.</p>';
      destinosSelector.innerHTML = '<p class="field-hint" style="padding: 0.5rem;">Nenhum grupo detectado ainda.</p>';
      return;
    }

    allChats.forEach((chat) => {
      // Origens
      const labelOrigem = document.createElement('label');
      labelOrigem.className = 'chat-option';
      labelOrigem.innerHTML = `
        <input type="checkbox" name="origens" value="${chat.chat_id}" ${selectedOrigens.includes(chat.chat_id) ? 'checked' : ''}>
        <span>${escapeHtml(chat.nome)}</span>
      `;
      origensSelector.appendChild(labelOrigem);

      // Destinos
      const labelDestino = document.createElement('label');
      labelDestino.className = 'chat-option';
      labelDestino.innerHTML = `
        <input type="checkbox" name="destinos" value="${chat.chat_id}" ${selectedDestinos.includes(chat.chat_id) ? 'checked' : ''}>
        <span>${escapeHtml(chat.nome)}</span>
      `;
      destinosSelector.appendChild(labelDestino);
    });
  }

  // Sincronizar Grupos Instantaneamente
  if (btnSyncChats) {
    btnSyncChats.addEventListener('click', async () => {
      btnSyncChats.disabled = true;
      btnSyncChats.textContent = '⏳ Buscando...';
      try {
        const res = await fetch('/api/chats/sync', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          allChats = data.chats || allChats;
          showToast(`Grupos sincronizados! (${data.total || allChats.length} grupos ativos)`);
          renderRotas(allRotas);
        } else {
          showToast('Falha ao sincronizar grupos.');
        }
      } catch (err) {
        showToast('Erro de rede ao sincronizar grupos.');
      } finally {
        btnSyncChats.disabled = false;
        btnSyncChats.textContent = '🔄 Atualizar Grupos';
      }
    });
  }

  // Ações de Configurações
  masterToggle.addEventListener('change', async () => {
    const ativo = masterToggle.checked;
    await fetch('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'ativo', valor: ativo ? 'true' : 'false' })
    });
    showToast(ativo ? 'Esteira de réplica ligada!' : 'Esteira pausada.');
  });

  btnSalvarConfig.addEventListener('click', async () => {
    btnSalvarConfig.disabled = true;
    configStatusMsg.textContent = 'Gravando...';
    configStatusMsg.style.color = 'var(--text-muted)';

    try {
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'affiliate_matt_word', valor: cfgMattWord.value.trim() })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'affiliate_matt_tool', valor: cfgMattTool.value.trim() })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'delay_segundos', valor: cfgDelay.value })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'teto_hora', valor: cfgTeto.value })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'atraso_maximo_segundos', valor: cfgMaxDelay.value })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'meli_cookie', valor: cfgMeliCookie ? cfgMeliCookie.value.trim() : '' })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'meli_tag', valor: cfgMeliTag ? cfgMeliTag.value.trim() : '' })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'link_vitrine_curto', valor: cfgLinkVitrineCurto ? cfgLinkVitrineCurto.value.trim() : '' })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'frases_remover', valor: cfgFrases.value })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'somente_mercadolivre', valor: cfgSomenteMeli && cfgSomenteMeli.checked ? 'true' : 'false' })
      });
      if (cfgReplicarComunicados) {
        await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'replicar_comunicados_texto', valor: cfgReplicarComunicados.checked ? 'true' : 'false' })
        });
      }
      if (cfgTemplateModo) {
        await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'template_modo', valor: cfgTemplateModo.value })
        });
      }
      if (cfgCooldownDuplicidade) {
        await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'cooldown_duplicidade_minutos', valor: cfgCooldownDuplicidade.value })
        });
      }
      if (cfgFiltroApenasTcg) {
        await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'filtro_apenas_tcg', valor: cfgFiltroApenasTcg.checked ? 'true' : 'false' })
        });
      }
      if (cfgSheetsWebhook) {
        await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'google_sheets_webhook_url', valor: cfgSheetsWebhook.value.trim() })
        });
      }
      if (cfgSheetsAtivo) {
        await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'google_sheets_ativo', valor: cfgSheetsAtivo.checked ? 'true' : 'false' })
        });
      }
      if (cfgMsgAberturaAtivo) {
        await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'msg_abertura_ativa', valor: cfgMsgAberturaAtivo.checked ? 'true' : 'false' })
        });
      }
      if (cfgMsgAberturaHorario) {
        await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'msg_abertura_horario', valor: cfgMsgAberturaHorario.value.trim() })
        });
      }
      if (cfgMsgAberturaTexto) {
        await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chave: 'msg_abertura_texto', valor: cfgMsgAberturaTexto.value.trim() })
        });
      }
      carregarStatusAgendador();

      updateMeliBadge(cfgMeliCookie ? cfgMeliCookie.value.trim() : '');
      configStatusMsg.textContent = 'Salvo com sucesso!';
      configStatusMsg.style.color = 'var(--accent-green)';
      showToast('Configurações salvas com sucesso! ✓');
      setTimeout(() => (configStatusMsg.textContent = ''), 3000);
    } catch (e) {
      configStatusMsg.textContent = 'Erro ao salvar.';
      configStatusMsg.style.color = 'var(--accent-danger)';
    } finally {
      btnSalvarConfig.disabled = false;
    }
  });

  if (btnTestarCookie) {
    btnTestarCookie.addEventListener('click', async () => {
      const cookie = cfgMeliCookie ? cfgMeliCookie.value.trim() : '';
      if (!cookie) {
        cookieTestFeedback.textContent = '❌ Cole o cookie antes de testar.';
        cookieTestFeedback.style.color = 'var(--accent-danger)';
        return;
      }

      btnTestarCookie.disabled = true;
      cookieTestFeedback.textContent = '⏳ Testando com o Mercado Livre...';
      cookieTestFeedback.style.color = 'var(--text-muted)';

      try {
        const res = await fetch('/api/test-meli-cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie, tag: cfgMeliTag ? cfgMeliTag.value.trim() : '' })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          cookieTestFeedback.textContent = `✅ ${data.message}`;
          cookieTestFeedback.style.color = 'var(--accent-green)';
          showToast('Cookie validado e funcionando com meli.la! ✓');
        } else {
          cookieTestFeedback.textContent = `❌ ${data.error || 'Cookie inválido'}`;
          cookieTestFeedback.style.color = 'var(--accent-danger)';
        }
      } catch (err) {
        cookieTestFeedback.textContent = '❌ Erro de conexão ao testar.';
        cookieTestFeedback.style.color = 'var(--accent-danger)';
      } finally {
        btnTestarCookie.disabled = false;
      }
    });
  }

  if (btnDetectarVitrine) {
    btnDetectarVitrine.addEventListener('click', async () => {
      const mattWord = cfgMattWord ? cfgMattWord.value.trim() : '';
      btnDetectarVitrine.disabled = true;
      vitrineDetectFeedback.textContent = '⏳ Buscando link oficial...';
      vitrineDetectFeedback.style.color = 'var(--text-muted)';

      try {
        const res = await fetch('/api/detect-social-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mattWord })
        });
        const data = await res.json();
        if (res.ok && data.ok && data.shortLink) {
          if (cfgLinkVitrineCurto) cfgLinkVitrineCurto.value = data.shortLink;
          vitrineDetectFeedback.textContent = `✅ Encontrado: ${data.shortLink}`;
          vitrineDetectFeedback.style.color = 'var(--accent-green)';
          showToast('Link oficial detectado! Salve para aplicar. ✓');
        } else {
          vitrineDetectFeedback.textContent = `❌ ${data.error || 'Não encontrado'}`;
          vitrineDetectFeedback.style.color = 'var(--accent-danger)';
        }
      } catch (err) {
        vitrineDetectFeedback.textContent = '❌ Erro de conexão.';
        vitrineDetectFeedback.style.color = 'var(--accent-danger)';
      } finally {
        btnDetectarVitrine.disabled = false;
      }
    });
  }

  // Google Sheets: Teste de Disparo
  if (btnTestarSheets) {
    btnTestarSheets.addEventListener('click', async () => {
      const webhookUrl = cfgSheetsWebhook ? cfgSheetsWebhook.value.trim() : '';
      if (!webhookUrl) {
        sheetsTestFeedback.textContent = '❌ Cole a URL do Webhook do Google Apps Script antes de testar.';
        sheetsTestFeedback.style.color = 'var(--accent-danger)';
        return;
      }

      btnTestarSheets.disabled = true;
      const originalText = btnTestarSheets.textContent;
      btnTestarSheets.textContent = '⏳ Testando...';
      sheetsTestFeedback.textContent = 'Enviando linha de teste para a planilha...';
      sheetsTestFeedback.style.color = 'var(--text-muted)';

      try {
        const res = await fetch('/api/sheets/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          sheetsTestFeedback.textContent = '✅ Sucesso! Linha adicionada na planilha com sucesso.';
          sheetsTestFeedback.style.color = 'var(--accent-green)';
          showToast('Linha de teste gravada no Google Planilhas! 📊✨');
          playChime();
        } else {
          sheetsTestFeedback.textContent = `❌ ${data.error || 'Falha ao conectar com o Google.'}`;
          sheetsTestFeedback.style.color = 'var(--accent-danger)';
        }
      } catch (err) {
        sheetsTestFeedback.textContent = '❌ Erro de rede ao conectar ao Google.';
        sheetsTestFeedback.style.color = 'var(--accent-danger)';
      } finally {
        btnTestarSheets.disabled = false;
        btnTestarSheets.textContent = originalText;
      }
    });
  }

  // Google Sheets: Copiar Script do Apps Script
  if (btnCopiarScript) {
    btnCopiarScript.addEventListener('click', async () => {
      if (!sheetsScriptCode || !sheetsScriptCode.value) return;
      try {
        await navigator.clipboard.writeText(sheetsScriptCode.value);
        showToast('Código do Apps Script copiado! 📋');
      } catch {
        sheetsScriptCode.select();
        document.execCommand('copy');
        showToast('Código copiado! 📋');
      }
    });
  }

  // Agendador: Texto padrão e ações da Mensagem Diária de Abertura
  const DEFAULT_TEXTO_ABERTURA = `@pokemon_tcg_promo

🌅 *BOM DIA, TREINADORES E COLECIONADORES!* ⚡
O nosso grupo oficial de ofertas de Pokémon TCG está oficialmente *ABERTO* para o dia de hoje!

Quero agradecer imensamente a cada um de vocês por fazer parte da nossa comunidade. É muito gratificante ver a nossa família de colecionadores crescendo todos os dias! 🙏✨

🔎 Nossa equipe e nossos robôs já estão a postos monitorando os estoques, cupons relâmpago e promoções exclusivas em boosters, boxes, latas, ETBs e cartas lacradas para trazer os menores preços reais para vocês.

👥 *Dica especial:* Se você tem amigos, conhecidos ou colecionadores que também amam Pokémon TCG e querem economizar de verdade sem pagar preços abusivos, fiquem 100% à vontade para adicioná-los ou mandar o link do grupo! Bora crescer a nossa comunidade juntos! 🚀

Tenham todos um dia incrível e cheio de bons pulls! 🔥`;

  async function carregarStatusAgendador() {
    try {
      const res = await fetch('/api/agendador/status');
      if (!res.ok) return;
      const data = await res.json();
      if (cfgMsgAberturaAtivo) cfgMsgAberturaAtivo.checked = data.ativo;
      if (cfgMsgAberturaHorario && data.horario) cfgMsgAberturaHorario.value = data.horario;
      if (cfgMsgAberturaTexto && !cfgMsgAberturaTexto.value && data.texto) {
        cfgMsgAberturaTexto.value = data.texto;
      }

      if (msgAberturaStatusBadge) {
        if (data.ativo) {
          const ultimo = data.ultimoEnvio ? ` • Último envio: ${data.ultimoEnvio}` : ' • Nenhum envio hoje ainda';
          msgAberturaStatusBadge.innerHTML = `<span style="color: var(--accent-green); font-weight: 500;">🟢 Ativo às ${data.horario} BRT (Hora atual: ${data.horaAtualBrasilia}) • ${data.destinosCount} grupo(s) de destino${ultimo}</span>`;
        } else {
          msgAberturaStatusBadge.innerHTML = `<span style="color: var(--text-muted); font-weight: 500;">⏸️ Agendamento pausado no momento</span>`;
        }
      }
    } catch {}
  }

  if (btnRestaurarMsgAbertura && cfgMsgAberturaTexto) {
    btnRestaurarMsgAbertura.addEventListener('click', () => {
      cfgMsgAberturaTexto.value = DEFAULT_TEXTO_ABERTURA;
      showToast('Texto padrão restaurado! Clique em "Salvar Todas as Configurações" para aplicar.');
    });
  }

  if (btnTestarMsgAbertura) {
    btnTestarMsgAbertura.addEventListener('click', async () => {
      btnTestarMsgAbertura.disabled = true;
      msgAberturaFeedback.textContent = '⏳ Disparando mensagem nos grupos de destino...';
      msgAberturaFeedback.className = 'action-feedback';

      try {
        const res = await fetch('/api/agendador/testar', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.ok) {
          msgAberturaFeedback.textContent = `✅ ${data.message}`;
          msgAberturaFeedback.className = 'action-feedback success';
          showToast(`Mensagem de abertura enviada com sucesso para ${data.totalEnviados} grupo(s)! 🚀`);
          playChime();
          carregarStatusAgendador();
        } else {
          msgAberturaFeedback.textContent = `❌ ${data.error || 'Falha ao enviar mensagem de abertura.'}`;
          msgAberturaFeedback.className = 'action-feedback error';
        }
      } catch (err) {
        msgAberturaFeedback.textContent = '❌ Erro de rede ao disparar teste.';
        msgAberturaFeedback.className = 'action-feedback error';
      } finally {
        btnTestarMsgAbertura.disabled = false;
        setTimeout(() => {
          if (msgAberturaFeedback.className.includes('success')) {
            msgAberturaFeedback.textContent = '';
          }
        }, 5000);
      }
    });
  }

  btnNovaRota.addEventListener('click', () => openModalRota());
  modalRotaClose.addEventListener('click', () => (modalRota.style.display = 'none'));
  btnCancelarRota.addEventListener('click', () => (modalRota.style.display = 'none'));

  btnSalvarRota.addEventListener('click', async () => {
    const nome = rotaNome.value.trim();
    if (!nome) {
      alert('Por favor, informe o nome da rota.');
      return;
    }

    const origens = Array.from(origensSelector.querySelectorAll('input:checked')).map((i) => i.value);
    const destinos = Array.from(destinosSelector.querySelectorAll('input:checked')).map((i) => i.value);

    const payload = {
      nome,
      ativa: true,
      origens,
      destinos
    };

    const id = rotaEditId.value;
    if (id) payload.id = parseInt(id, 10);

    await fetch('/api/rotas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    modalRota.style.display = 'none';
    showToast('Rota salva com sucesso! 🔀');
  });

  btnWaLogout.addEventListener('click', async () => {
    if (confirm('Deseja desconectar o WhatsApp? Um novo QR Code será gerado para escanear.')) {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      showToast('Sessão do WhatsApp desconectada.');
    }
  });

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // GERADOR DE ANÚNCIOS POR LINK
  // ==========================================
  const anuncioUrl = document.getElementById('anuncio-url');
  const anuncioCupom = document.getElementById('anuncio-cupom');
  const anuncioPrecoDe = document.getElementById('anuncio-preco-de');
  const anuncioPrecoPor = document.getElementById('anuncio-preco-por');
  const btnGerarAnuncio = document.getElementById('btn-gerar-anuncio');
  const btnGerarSpinner = document.getElementById('btn-gerar-spinner');
  const btnGerarLabel = document.getElementById('btn-gerar-label');
  const btnLimparAnuncio = document.getElementById('btn-limpar-anuncio');
  const anuncioFeedback = document.getElementById('anuncio-feedback');

  const anuncioStatusBadge = document.getElementById('anuncio-status-badge');
  const anuncioImagePlaceholder = document.getElementById('anuncio-image-placeholder');
  const anuncioImagePreview = document.getElementById('anuncio-image-preview');
  const anuncioHdBadge = document.getElementById('anuncio-hd-badge');

  const anuncioTextoFinal = document.getElementById('anuncio-texto-final');
  const anuncioCharCounter = document.getElementById('anuncio-char-counter');
  const btnSelectAllDestinos = document.getElementById('btn-select-all-destinos');
  const anuncioDestinosList = document.getElementById('anuncio-destinos-list');

  const btnPublicarAnuncio = document.getElementById('btn-publicar-anuncio');
  const btnPublicarSpinner = document.getElementById('btn-publicar-spinner');
  const btnPublicarLabel = document.getElementById('btn-publicar-label');
  const btnCopiarAnuncio = document.getElementById('btn-copiar-anuncio');
  const anuncioPublishStatus = document.getElementById('anuncio-publish-status');

  let currentAnuncioData = null;

  function renderAnuncioDestinos() {
    if (!anuncioDestinosList) return;
    if (!allChats || allChats.length === 0) {
      anuncioDestinosList.innerHTML = '<span class="text-muted" style="font-size: 0.8rem;">Nenhum grupo sincronizado. Conecte o WhatsApp para listar seus grupos.</span>';
      return;
    }

    // Coletar destinos configurados nas rotas ativas
    const rotaDestinosSet = new Set();
    if (allRotas) {
      for (const r of allRotas) {
        if (r.ativa && r.destinos) {
          for (const d of r.destinos) {
            rotaDestinosSet.add(d);
          }
        }
      }
    }

    anuncioDestinosList.innerHTML = '';
    allChats.forEach((chat) => {
      const isRouteDest = rotaDestinosSet.has(chat.chat_id);
      const item = document.createElement('label');
      item.className = 'destino-item';
      item.innerHTML = `
        <input type="checkbox" value="${escapeHtml(chat.chat_id)}" ${isRouteDest ? 'checked' : ''}>
        <span>${escapeHtml(chat.nome || chat.chat_id)}</span>
        ${isRouteDest ? '<span class="badge badge-meli" style="margin-left: auto; font-size: 0.7rem; padding: 2px 6px;">Destino Rota</span>' : ''}
      `;
      anuncioDestinosList.appendChild(item);
    });
  }

  if (anuncioTextoFinal && anuncioCharCounter) {
    anuncioTextoFinal.addEventListener('input', () => {
      anuncioCharCounter.textContent = `${anuncioTextoFinal.value.length} caracteres`;
    });
  }

  if (btnSelectAllDestinos) {
    btnSelectAllDestinos.addEventListener('click', () => {
      const checkboxes = anuncioDestinosList.querySelectorAll('input[type="checkbox"]');
      const allChecked = Array.from(checkboxes).every((c) => c.checked);
      checkboxes.forEach((c) => (c.checked = !allChecked));
      btnSelectAllDestinos.textContent = allChecked ? 'Marcar Todos os Grupos' : 'Desmarcar Todos';
    });
  }

  if (btnLimparAnuncio) {
    btnLimparAnuncio.addEventListener('click', () => {
      anuncioUrl.value = '';
      anuncioCupom.value = '';
      anuncioPrecoDe.value = '';
      anuncioPrecoPor.value = '';
      anuncioFeedback.textContent = '';
      anuncioFeedback.className = 'action-feedback';
      anuncioTextoFinal.value = '';
      anuncioCharCounter.textContent = '0 caracteres';
      anuncioImagePreview.src = '';
      anuncioImagePreview.style.display = 'none';
      anuncioImagePlaceholder.style.display = 'flex';
      anuncioHdBadge.style.display = 'none';
      anuncioStatusBadge.style.display = 'none';
      btnPublicarAnuncio.disabled = true;
      anuncioPublishStatus.textContent = '';
      currentAnuncioData = null;
    });
  }

  if (btnCopiarAnuncio) {
    btnCopiarAnuncio.addEventListener('click', async () => {
      const text = anuncioTextoFinal.value;
      if (!text) {
        showToast('Nenhum texto para copiar!');
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast('Mensagem copiada para a área de transferência! 📋');
      } catch {
        anuncioTextoFinal.select();
        document.execCommand('copy');
        showToast('Mensagem copiada! 📋');
      }
    });
  }

  if (btnGerarAnuncio) {
    btnGerarAnuncio.addEventListener('click', async () => {
      const url = (anuncioUrl.value || '').trim();
      if (!url) {
        anuncioFeedback.textContent = '⚠️ Informe a URL do produto ou link de afiliado.';
        anuncioFeedback.className = 'action-feedback error';
        anuncioUrl.focus();
        return;
      }

      btnGerarAnuncio.disabled = true;
      btnGerarSpinner.style.display = 'inline-block';
      btnGerarLabel.textContent = 'Extraindo dados...';
      anuncioFeedback.textContent = 'Conectando ao Mercado Livre e buscando foto HD...';
      anuncioFeedback.className = 'action-feedback';

      try {
        const payload = {
          url,
          cupom: (anuncioCupom.value || '').trim(),
          precoDe: (anuncioPrecoDe.value || '').trim(),
          precoPor: (anuncioPrecoPor.value || '').trim()
        };

        const res = await fetch('/api/anuncio/extrair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Falha ao processar dados do anúncio.');
        }

        currentAnuncioData = data;

        // Atualizar imagem
        if (data.imageUrl) {
          anuncioImagePreview.src = data.imageUrl;
          anuncioImagePreview.style.display = 'block';
          anuncioImagePlaceholder.style.display = 'none';
          anuncioHdBadge.style.display = 'block';
        } else {
          anuncioImagePreview.style.display = 'none';
          anuncioImagePlaceholder.style.display = 'flex';
          anuncioHdBadge.style.display = 'none';
        }

        // Atualizar copy
        anuncioTextoFinal.value = data.textoGerado;
        anuncioCharCounter.textContent = `${data.textoGerado.length} caracteres`;

        // Ativar botão de publicar
        btnPublicarAnuncio.disabled = false;
        anuncioStatusBadge.style.display = 'inline-flex';
        anuncioStatusBadge.className = 'badge badge-connected';
        anuncioStatusBadge.textContent = 'Pronto para Postar';

        anuncioFeedback.textContent = '✅ Anúncio e foto oficial 2X HD gerados com sucesso!';
        anuncioFeedback.className = 'action-feedback success';

        showToast('Anúncio e foto oficial 2X HD gerados com sucesso! ✨');
        playChime();
      } catch (err) {
        console.error('Erro ao gerar anúncio:', err);
        anuncioFeedback.textContent = `❌ ${err.message || 'Erro ao conectar.'}`;
        anuncioFeedback.className = 'action-feedback error';
        showToast(`Falha: ${err.message || 'Erro ao extrair dados.'}`);
      } finally {
        btnGerarAnuncio.disabled = false;
        btnGerarSpinner.style.display = 'none';
        btnGerarLabel.textContent = '⚡ Puxar Dados & Gerar Anúncio';
      }
    });
  }

  if (btnPublicarAnuncio) {
    btnPublicarAnuncio.addEventListener('click', async () => {
      const texto = (anuncioTextoFinal.value || '').trim();
      if (!texto) {
        showToast('O texto do anúncio não pode estar vazio!');
        return;
      }

      const checkboxes = anuncioDestinosList.querySelectorAll('input[type="checkbox"]:checked');
      const destinos = Array.from(checkboxes).map((c) => c.value);

      if (destinos.length === 0) {
        alert('Selecione pelo menos um grupo de destino para publicar o anúncio.');
        return;
      }

      if (!confirm(`Deseja disparar este anúncio com foto para ${destinos.length} grupo(s) no WhatsApp?`)) {
        return;
      }

      btnPublicarAnuncio.disabled = true;
      btnPublicarSpinner.style.display = 'inline-block';
      btnPublicarLabel.textContent = 'Publicando...';
      anuncioPublishStatus.textContent = `Disparando para ${destinos.length} grupo(s)...`;
      anuncioPublishStatus.className = 'action-feedback';

      try {
        const payload = {
          destinos,
          texto,
          imageUrl: currentAnuncioData?.imageUrl || undefined
        };

        const res = await fetch('/api/anuncio/publicar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Falha ao publicar anúncio.');
        }

        anuncioPublishStatus.textContent = `✅ ${data.message}`;
        anuncioPublishStatus.className = 'action-feedback success';
        showToast(data.message);
        playChime();
      } catch (err) {
        console.error('Erro ao publicar anúncio:', err);
        anuncioPublishStatus.textContent = `❌ ${err.message || 'Falha ao disparar.'}`;
        anuncioPublishStatus.className = 'action-feedback error';
        showToast(`Erro no envio: ${err.message}`);
      } finally {
        btnPublicarAnuncio.disabled = false;
        btnPublicarSpinner.style.display = 'none';
        btnPublicarLabel.textContent = '🚀 Publicar no WhatsApp';
      }
    });
  }

  if (btnWaLogout) {
    btnWaLogout.addEventListener('click', async () => {
      if (!confirm('Deseja realmente desconectar o WhatsApp? Será necessário ler o QR Code novamente.')) {
        return;
      }
      btnWaLogout.disabled = true;
      btnWaLogout.textContent = 'Desconectando...';
      try {
        const res = await fetch('/api/whatsapp/logout', { method: 'POST' });
        const data = await res.json();
        showToast(data.message || 'Desconectado com sucesso!');
      } catch (err) {
        showToast('Erro ao desconectar WhatsApp');
      } finally {
        setTimeout(() => {
          btnWaLogout.disabled = false;
          btnWaLogout.textContent = 'Desconectar / Trocar Aparelho';
        }, 2000);
      }
    });
  }

  if (btnWaForceQr) {
    btnWaForceQr.addEventListener('click', async () => {
      btnWaForceQr.disabled = true;
      const originalText = btnWaForceQr.innerHTML;
      btnWaForceQr.innerHTML = '⏳ Resetando sessão e gerando QR...';
      try {
        const res = await fetch('/api/whatsapp/reset', { method: 'POST' });
        const data = await res.json();
        showToast(data.message || 'Sessão limpa! Aguardando novo QR Code...');
      } catch (err) {
        showToast('Erro ao solicitar novo QR Code');
      } finally {
        setTimeout(() => {
          btnWaForceQr.disabled = false;
          btnWaForceQr.innerHTML = originalText;
        }, 4000);
      }
    });
  }

  // Iniciar WebSocket
  connectWebSocket();
})();
