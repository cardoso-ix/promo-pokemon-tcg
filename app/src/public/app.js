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

  // Config inputs
  const cfgMattWord = document.getElementById('cfg-matt-word');
  const cfgMattTool = document.getElementById('cfg-matt-tool');
  const cfgDelay = document.getElementById('cfg-delay');
  const cfgTeto = document.getElementById('cfg-teto');
  const cfgMaxDelay = document.getElementById('cfg-max-delay');
  const cfgMeliCookie = document.getElementById('cfg-meli-cookie');
  const cfgMeliTag = document.getElementById('cfg-meli-tag');
  const cfgSomenteMeli = document.getElementById('cfg-somente-meli');
  const btnTestarCookie = document.getElementById('btn-testar-cookie');
  const cookieTestFeedback = document.getElementById('cookie-test-feedback');
  const cfgFrases = document.getElementById('cfg-frases');
  const btnSalvarConfig = document.getElementById('btn-salvar-config');
  const configStatusMsg = document.getElementById('config-status-msg');

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

  // Laboratório de Testes
  const labInputText = document.getElementById('lab-input-text');
  const labCharCounter = document.getElementById('lab-char-counter');
  const btnRunSimulation = document.getElementById('btn-run-simulation');
  const btnClearLab = document.getElementById('btn-clear-lab');
  const labFeedback = document.getElementById('lab-feedback');
  const labResultPlaceholder = document.getElementById('lab-result-placeholder');
  const labResultContent = document.getElementById('lab-result-content');
  const labModeBadge = document.getElementById('lab-mode-badge');
  const labLinksBadge = document.getElementById('lab-links-badge');
  const labHasMlBadge = document.getElementById('lab-has-ml-badge');
  const labCaptionHealth = document.getElementById('lab-caption-health');

  // WhatsApp Mockup & Diff
  const labWaImgContainer = document.getElementById('lab-wa-img-container');
  const labWaImg = document.getElementById('lab-wa-img');
  const labWaText = document.getElementById('lab-wa-text');
  const labWaTime = document.getElementById('lab-wa-time');
  const labDiffOrig = document.getElementById('lab-diff-orig');
  const labDiffProc = document.getElementById('lab-diff-proc');
  const btnCopyLabText = document.getElementById('btn-copy-lab-text');

  // Disparo Real no WhatsApp
  const labTargetChat = document.getElementById('lab-target-chat');
  const btnLabSendReal = document.getElementById('btn-lab-send-real');
  const labRealSendStatus = document.getElementById('lab-real-send-status');

  let lastSimulatedData = null;

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
        break;
      case 'chats_updated':
        allChats = data;
        break;
      case 'stats_update':
        updateStats(data);
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
      if (cfgSomenteMeli) cfgSomenteMeli.checked = data.configs.somente_mercadolivre !== 'false';
      cfgFrases.value = data.configs.frases_remover || '';

      updateMasterSwitch(data.configs.ativo === 'true');
      updateMeliBadge(data.configs.meli_cookie);
    }

    // 3. Rotas & Chats
    allChats = data.chats || [];
    allRotas = data.rotas || [];
    renderRotas(allRotas);

    // 4. Logs no Feed
    feedLogs = data.logs || [];
    renderFeed();

    // 5. Stats
    if (data.stats) {
      updateStats(data.stats);
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
    } else if (state.status === 'qr' && state.qrDataUrl) {
      waStatusBadge.classList.add('badge-qr');
      waStatusText.textContent = 'Ler QR Code';
      kpiWa.textContent = 'AGUARDANDO QR';
      kpiWa.className = 'kpi-value text-gold';
      kpiPhoneSub.textContent = 'Abra a aba Conectar para escanear';

      qrBox.style.display = 'inline-block';
      waConnectedBox.style.display = 'none';
      qrBox.innerHTML = `<img src="${state.qrDataUrl}" alt="QR Code WhatsApp">`;
    } else {
      waStatusBadge.classList.add('badge-disconnected');
      waStatusText.textContent = 'Desconectado';
      kpiWa.textContent = 'DESCONECTADO';
      kpiWa.className = 'kpi-value text-danger';
      kpiPhoneSub.textContent = 'Conexão inativa';

      qrBox.style.display = 'inline-block';
      waConnectedBox.style.display = 'none';
      qrBox.innerHTML = `
        <div class="qr-placeholder">
          <div class="spinner"></div>
          <span>Gerando QR Code...</span>
        </div>
      `;
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
    if (stats.postsLastHour !== undefined) {
      const teto = cfgTeto.value || '40';
      kpiHour.innerHTML = `${stats.postsLastHour} <span class="kpi-limit">/ ${teto}</span>`;
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
    item.className = 'feed-item' + (isHighlight ? ' new-arrival' : '');

    const statusBadge =
      log.status === 'enviado'
        ? '<span class="badge badge-connected">Enviado</span>'
        : log.status === 'ignorado'
        ? `<span class="badge badge-qr" title="${escapeHtml(log.motivo || '')}">Ignorado</span>`
        : `<span class="badge badge-disconnected" title="${escapeHtml(log.motivo || '')}">Erro</span>`;

    const timeFormatted = log.criado_em
      ? new Date(log.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : new Date().toLocaleTimeString('pt-BR');

    const rawContent = log.texto_publicado || log.texto_original || '(Sem texto)';

    item.innerHTML = `
      <div class="feed-header">
        <span class="feed-origem">Origem: ${escapeHtml(log.origem_nome || log.origem_chat_id || 'Grupo Desconhecido')}</span>
        <div class="feed-meta">
          <span>${timeFormatted}</span>
          ${statusBadge}
        </div>
      </div>
      <div class="feed-body">${escapeHtml(rawContent)}</div>
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

  // Laboratório de Testes: Presets
  const LAB_PRESETS = {
    'ml-direto': `🔥 OFERTA IMPERDÍVEL POKÉMON TCG! 🔥\nDeck Pokémon Espada e Escudo Rillaboom Copag Original Lacrado!\nDe R$ 89,90 por apenas R$ 49,90 com envio FULL no Mercado Livre!\n\nGaranta o seu deck no link oficial:\nhttps://www.mercadolivre.com.br/deck-pokemon-espada-e-escudo-rillaboom-copag/p/MLB27197917\n\nEstoque super limitado!`,
    'spam-concorrente': `⚡ SUPER PROMOÇÃO DE BOOSTER PACK! ⚡\nBox Pokémon TCG Coleção Especial de Batalha com cartas holográficas raras!\nPreço promocional imperdível: R$ 139,90 parcelado sem juros!\n\nLink da oferta oficial:\nhttps://www.mercadolivre.com.br/deck-pokemon-espada-e-escudo-rillaboom-copag/p/MLB27197917\n\n_Siga nosso canal concorrente @rasgabooster.tcg_\n#rasgaboot #pokemontcg #cartas\nEntre no grupo VIP!`,
    'multi-links': `💥 COMBO DUPLO POKÉMON COPAG! 💥\nGaranta os dois decks mais fortes do formato com super desconto!\n\nDeck 1 - Rillaboom (R$ 49,90):\nhttps://www.mercadolivre.com.br/deck-pokemon-espada-e-escudo-rillaboom-copag/p/MLB27197917\n\nDeck 2 - Cinderace (R$ 54,90):\nhttps://www.mercadolivre.com.br/deck-pokemon-espada-e-escudo-cinderace-copag/p/MLB27197918\n\nAproveite o frete único no carrinho!`,
    'cupom': `🎟️ SUPER CUPOM MERCADO LIVRE ATIVO! 🎟️\nR$ 50 OFF em compras acima de R$ 250 em colecionáveis Pokémon!\n\nCódigo do Cupom: POKESTOCK50\nVálido até 23:59 de hoje ou até esgotar!\n\nAtive o cupom e aproveite no link:\nhttps://www.mercadolivre.com.br/deck-pokemon-espada-e-escudo-rillaboom-copag/p/MLB27197917`,
    'amazon': `📦 OFERTA POKÉMON TCG NA AMAZON BRASIL! 📦\nLata Pokémon Coleção Destinos Brilhantes Copag Original!\nPor apenas R$ 119,00 para membros Prime com entrega grátis!\n\nAcesse na Amazon:\nhttps://www.amazon.com.br/dp/B08WPNQ9PZ\n\nPreço exclusivo para assinantes!`
  };

  function updateLabCharCounter() {
    if (!labCharCounter || !labInputText) return;
    const len = (labInputText.value || '').length;
    labCharCounter.textContent = `${len} caracteres`;
  }

  if (labInputText) {
    labInputText.addEventListener('input', updateLabCharCounter);
  }

  document.querySelectorAll('.btn-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.preset;
      if (LAB_PRESETS[key]) {
        labInputText.value = LAB_PRESETS[key];
        updateLabCharCounter();
        showToast(`Modelo carregado: ${btn.textContent} ⚡`);
        if (btnRunSimulation) btnRunSimulation.click();
      }
    });
  });

  if (btnClearLab) {
    btnClearLab.addEventListener('click', () => {
      labInputText.value = '';
      updateLabCharCounter();
      labResultContent.style.display = 'none';
      labResultPlaceholder.style.display = 'flex';
      labFeedback.textContent = '';
      lastSimulatedData = null;
    });
  }

  // Switcher de Visualização (WhatsApp vs Diff)
  document.querySelectorAll('.view-switch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-switch-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.lab-view-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(`lab-view-${btn.dataset.view}`);
      if (target) target.classList.add('active');
    });
  });

  function populateLabTargetChats() {
    if (!labTargetChat) return;
    const current = labTargetChat.value;
    labTargetChat.innerHTML = '<option value="">Selecione um grupo de teste...</option>';
    allChats.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.chat_id;
      opt.textContent = c.nome;
      if (c.chat_id === current) opt.selected = true;
      labTargetChat.appendChild(opt);
    });
  }

  function formatTextForWhatsAppPreview(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);
    // Transforma links em tags <a> estilizadas
    escaped = escaped.replace(/(https?:\/\/[^\s]+)/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    // Transforma negrito (*texto*)
    escaped = escaped.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');
    return escaped;
  }

  if (btnRunSimulation) {
    btnRunSimulation.addEventListener('click', async () => {
      const text = labInputText.value.trim();
      if (!text) {
        labFeedback.textContent = '❌ Cole ou digite um texto para simular.';
        labFeedback.style.color = 'var(--accent-danger)';
        return;
      }

      btnRunSimulation.disabled = true;
      labFeedback.textContent = '⏳ Processando simulação...';
      labFeedback.style.color = 'var(--text-muted)';

      try {
        const res = await fetch('/api/test-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const data = await res.json();

        if (res.ok && data.ok) {
          labFeedback.textContent = '✅ Simulação concluída com sucesso!';
          labFeedback.style.color = 'var(--accent-green)';

          labResultPlaceholder.style.display = 'none';
          labResultContent.style.display = 'block';

          // Modo do encurtador
          labModeBadge.style.display = 'inline-block';
          labModeBadge.textContent = data.shortenerMode || 'meli.la Oficial';

          // Tags de métricas
          labLinksBadge.textContent = `🔗 ${data.linksConvertidos || 0} Link(s)`;
          labHasMlBadge.textContent = data.contemMercadoLivre ? '📦 Mercado Livre' : 'ℹ️ Sem ML';

          const textLen = (data.novoTexto || '').length;
          if (textLen <= 1024) {
            labCaptionHealth.className = 'meta-tag meta-tag-ok';
            labCaptionHealth.textContent = `✅ Legenda OK (${textLen}/1024)`;
          } else {
            labCaptionHealth.className = 'meta-tag meta-tag-warn';
            labCaptionHealth.textContent = `⚠️ Legenda Longa (${textLen}/1024)`;
          }

          // WhatsApp Mockup View
          if (data.imagePreviewUrl) {
            labWaImgContainer.style.display = 'block';
            labWaImg.src = data.imagePreviewUrl;
          } else {
            labWaImgContainer.style.display = 'none';
          }

          labWaText.innerHTML = formatTextForWhatsAppPreview(data.novoTexto);
          labWaTime.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          // Diff View
          labDiffOrig.textContent = data.originalText || '';
          labDiffProc.textContent = data.novoTexto || '';

          // Salvar para envio real opcional
          lastSimulatedData = {
            text: data.novoTexto,
            imageBase64: data.imagePreviewUrl
          };

          populateLabTargetChats();
          showToast('Simulação calculada com sucesso! 🧪');
        } else {
          labFeedback.textContent = `❌ ${data.error || 'Erro ao simular'}`;
          labFeedback.style.color = 'var(--accent-danger)';
        }
      } catch (err) {
        labFeedback.textContent = '❌ Falha ao conectar ao servidor.';
        labFeedback.style.color = 'var(--accent-danger)';
      } finally {
        btnRunSimulation.disabled = false;
      }
    });
  }

  if (btnCopyLabText) {
    btnCopyLabText.addEventListener('click', () => {
      const text = (lastSimulatedData && lastSimulatedData.text) || labDiffProc.textContent;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          showToast('Texto do laboratório copiado! ✓');
        });
      }
    });
  }

  // Disparo de Teste Real no WhatsApp
  if (btnLabSendReal) {
    btnLabSendReal.addEventListener('click', async () => {
      if (!lastSimulatedData || !lastSimulatedData.text) {
        alert('Simule uma mensagem antes de disparar o teste.');
        return;
      }

      const targetChat = labTargetChat.value;
      if (!targetChat) {
        labRealSendStatus.textContent = '❌ Selecione o grupo de teste.';
        labRealSendStatus.style.color = 'var(--accent-danger)';
        return;
      }

      btnLabSendReal.disabled = true;
      btnLabSendReal.textContent = '⏳ Enviando...';
      labRealSendStatus.textContent = '';

      try {
        const res = await fetch('/api/test-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: targetChat,
            text: lastSimulatedData.text,
            imageBase64: lastSimulatedData.imageBase64
          })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          labRealSendStatus.textContent = `✅ ${data.message}`;
          labRealSendStatus.style.color = 'var(--accent-green)';
          showToast('Mensagem de teste enviada no WhatsApp! 🚀');
        } else {
          labRealSendStatus.textContent = `❌ ${data.error || 'Falha ao enviar'}`;
          labRealSendStatus.style.color = 'var(--accent-danger)';
        }
      } catch (err) {
        labRealSendStatus.textContent = '❌ Erro de conexão com o servidor.';
        labRealSendStatus.style.color = 'var(--accent-danger)';
      } finally {
        btnLabSendReal.disabled = false;
        btnLabSendReal.textContent = 'Enviar Agora';
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
        body: JSON.stringify({ chave: 'frases_remover', valor: cfgFrases.value })
      });
      await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'somente_mercadolivre', valor: cfgSomenteMeli && cfgSomenteMeli.checked ? 'true' : 'false' })
      });

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
          body: JSON.stringify({
            cookie,
            tag: (cfgMeliTag && cfgMeliTag.value.trim()) || (cfgMattWord && cfgMattWord.value.trim()) || 'myshoplist'
          })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          cookieTestFeedback.textContent = `✅ ${data.message}`;
          cookieTestFeedback.style.color = 'var(--accent-green)';
          updateMeliBadge(cookie);
          showToast('Cookie do Mercado Livre validado com sucesso! ⚡');
        } else {
          cookieTestFeedback.textContent = `❌ ${data.error || 'Cookie inválido ou rejeitado'}`;
          cookieTestFeedback.style.color = 'var(--accent-danger)';
        }
      } catch (err) {
        cookieTestFeedback.textContent = '❌ Falha de rede ao testar.';
        cookieTestFeedback.style.color = 'var(--accent-danger)';
      } finally {
        btnTestarCookie.disabled = false;
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

  // Iniciar WebSocket
  connectWebSocket();
})();
