// Client-side Dashboard Application
(function () {
  let ws = null;
  let allChats = [];
  let allRotas = [];

  // Elementos DOM
  const waStatusBadge = document.getElementById('wa-status-badge');
  const waStatusText = document.getElementById('wa-status-text');
  const masterToggle = document.getElementById('master-toggle');

  const kpiStatus = document.getElementById('kpi-status');
  const kpiSubStatus = document.getElementById('kpi-sub-status');
  const kpiToday = document.getElementById('kpi-today');
  const kpiHour = document.getElementById('kpi-hour');
  const kpiWa = document.getElementById('kpi-wa');
  const kpiPhoneSub = document.getElementById('kpi-phone-sub');

  const rotasCount = document.getElementById('rotas-count');
  const feedList = document.getElementById('feed-list');
  const rotasGrid = document.getElementById('rotas-list');

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
      console.log('WebSocket desconectado. Tentando reconectar em 3s...');
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
        appendFeedItem(data, true);
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
        }
        break;
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
      cfgFrases.value = data.configs.frases_remover || '';

      updateMasterSwitch(data.configs.ativo === 'true');
    }

    // 3. Rotas & Chats
    allChats = data.chats || [];
    allRotas = data.rotas || [];
    renderRotas(allRotas);

    // 4. Logs no Feed
    if (data.logs && data.logs.length > 0) {
      feedList.innerHTML = '';
      data.logs.forEach((log) => appendFeedItem(log, false));
    }

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

  function appendFeedItem(log, isNew = false) {
    const emptyState = feedList.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const item = document.createElement('div');
    item.className = 'feed-item';

    const statusBadge =
      log.status === 'enviado'
        ? '<span class="badge badge-connected">Enviado</span>'
        : log.status === 'ignorado'
        ? '<span class="badge badge-qr">Ignorado</span>'
        : '<span class="badge badge-disconnected">Erro</span>';

    const timeFormatted = log.criado_em
      ? new Date(log.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : new Date().toLocaleTimeString('pt-BR');

    item.innerHTML = `
      <div class="feed-header">
        <span class="feed-origem">Origem: ${escapeHtml(log.origem_nome || log.origem_chat_id || 'Grupo Desconhecido')}</span>
        <div class="feed-meta">
          <span>${timeFormatted}</span>
          ${statusBadge}
        </div>
      </div>
      <div class="feed-body">${escapeHtml(log.texto_publicado || log.texto_original || '(Sem texto)')}</div>
      <div class="feed-footer">
        <span>Destino: ${escapeHtml(log.destino_chat_id || 'Nenhum')}</span>
        <span>${log.tem_foto ? '📷 Com Foto' : '📝 Somente Texto'} · ${log.links_convertidos || 0} links ML</span>
      </div>
    `;

    if (isNew) {
      feedList.prepend(item);
    } else {
      feedList.appendChild(item);
    }
  }

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

  // Ações de Botões e Eventos
  masterToggle.addEventListener('change', async () => {
    const ativo = masterToggle.checked;
    await fetch('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'ativo', valor: ativo ? 'true' : 'false' })
    });
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

      configStatusMsg.textContent = 'Salvo com sucesso!';
      configStatusMsg.style.color = 'var(--accent-green)';
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
  });

  btnWaLogout.addEventListener('click', async () => {
    if (confirm('Deseja desconectar o WhatsApp? Um novo QR Code será gerado para escanear.')) {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
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
