/* ===========================================
   Page 8 — Prompts Review
   v3.0: Acts organization, timing badges,
         per-act generation, full prompt management
   =========================================== */

const Page8 = (() => {

  function init() {
    document.getElementById('btnBack8').addEventListener('click', () => App.goToPage(7));
    document.getElementById('btnGenerateAll').addEventListener('click', () => startGeneration(false));
    document.getElementById('btnGenerateSelected').addEventListener('click', () => startGeneration(true));
  }

  function render() {
    const list = document.getElementById('promptsList');
    if (!list) return;
    list.innerHTML = '';

    const prompts = App.state.prompts || [];
    const acts = App.state.acts || [];

    if (prompts.length === 0) {
      list.innerHTML = `
        <div style="text-align:center; padding:80px 32px; color: var(--text-tertiary)">
          <div style="font-size:3rem; margin-bottom:16px">🎬</div>
          <p style="font-size:1.1rem; font-weight:600; color:var(--text-secondary)">Nenhum prompt gerado ainda.</p>
          <p style="font-size:0.88rem; margin-top:8px">Volte para o Passo 7 e clique em "Gerar Prompts".</p>
        </div>`;
      return;
    }

    // Update cost estimate
    const cost = Page1.getCostPerImage();
    const total = (cost * prompts.length).toFixed(2);
    const costEl = document.getElementById('totalCostEstimate');
    if (costEl) costEl.innerHTML = `<strong>${prompts.length} cenas</strong> · ~$${total}`;

    // === Render with Acts grouping ===
    if (acts.length > 0) {
      const totalDuration = prompts.reduce((acc, p) => acc + (p.duration_seconds || 0), 0);
      
      // Summary header
      const summary = document.createElement('div');
      summary.style.cssText = 'margin-bottom:32px; padding:16px 20px; background:var(--bg); border-radius:14px; border:1px solid var(--border); display:flex; gap:24px; align-items:center; flex-wrap:wrap;';
      summary.innerHTML = `
        <div style="flex:1">
          <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-tertiary); font-weight:700; margin-bottom:4px">Produção Total</div>
          <div style="font-size:1.5rem; font-weight:800; color:var(--text)">${prompts.length} cenas</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-tertiary); font-weight:700; margin-bottom:4px">Duração Total</div>
          <div style="font-size:1.25rem; font-weight:700; color:var(--accent)">${formatDuration(totalDuration)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-tertiary); font-weight:700; margin-bottom:4px">Atos</div>
          <div style="font-size:1.25rem; font-weight:700; color:var(--text)">${acts.length}</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="Page8.regenerateAllPrompts()">🔄 Regerar Todos</button>
      `;
      list.appendChild(summary);

      acts.forEach((act, actIdx) => {
        const actScenePrompts = act.scene_ids
          .map(sid => prompts.findIndex(p => p.scene_id === sid))
          .filter(i => i !== -1)
          .map(i => ({ prompt: prompts[i], idx: i }));

        if (actScenePrompts.length === 0) return;

        const actDuration = actScenePrompts.reduce((acc, { prompt }) => acc + (prompt.duration_seconds || 0), 0);

        const actSection = document.createElement('div');
        actSection.className = 'act-section';
        actSection.dataset.actIdx = actIdx;

        actSection.innerHTML = `
          <div class="act-header">
            <div class="act-header-left">
              <div class="act-title-box">
                <h3>${escHtml(act.title || `Ato ${actIdx + 1}`)}</h3>
                <p>${escHtml(act.description || '')}</p>
              </div>
            </div>
            <div class="act-header-right">
              <div class="act-timing-badge">⏱ ${formatDuration(actDuration)}</div>
              <span style="font-size:0.78rem; color:var(--text-tertiary)">${actScenePrompts.length} cenas</span>
              <button class="btn btn-primary btn-sm btn-generate-act" data-act-idx="${actIdx}">
                ▶ Gerar Ato ${actIdx + 1}
              </button>
            </div>
          </div>
          <div class="act-progress-bar" id="actProgress_${actIdx}">
            <div class="act-progress-fill" style="width:0%"></div>
          </div>
          <div class="act-prompts-grid" id="actGrid_${actIdx}" style="display:flex; flex-direction:column; gap:12px"></div>
        `;

        const grid = actSection.querySelector(`#actGrid_${actIdx}`);
        actScenePrompts.forEach(({ prompt, idx }) => {
          grid.appendChild(createPromptCard(prompt, idx));
        });

        actSection.querySelector('.btn-generate-act').addEventListener('click', () => generateAct(actIdx));
        list.appendChild(actSection);
      });

      // Orphan prompts (not in any act)
      const allActSceneIds = new Set(acts.flatMap(a => a.scene_ids));
      const orphans = prompts.map((p, i) => ({ p, i })).filter(({ p }) => !allActSceneIds.has(p.scene_id));
      if (orphans.length > 0) {
        const orphanSection = document.createElement('div');
        orphanSection.className = 'act-section';
        orphanSection.innerHTML = `
          <div class="act-header">
            <div class="act-header-left"><div class="act-title-box"><h3>Cenas Adicionais</h3><p>Cenas não agrupadas em atos</p></div></div>
            <div class="act-header-right">
              <div class="act-timing-badge">⏱ ${formatDuration(orphans.reduce((a, { p }) => a + (p.duration_seconds || 0), 0))}</div>
              <span style="font-size:0.78rem; color:var(--text-tertiary)">${orphans.length} cenas</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px"></div>
        `;
        const grid = orphanSection.querySelector('div:last-child');
        orphans.forEach(({ p, i }) => grid.appendChild(createPromptCard(p, i)));
        list.appendChild(orphanSection);
      }

    } else {
      // Fallback: No acts — flat list
      prompts.forEach((p, idx) => list.appendChild(createPromptCard(p, idx)));
    }
  }

  function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }

  function createPromptCard(prompt, idx) {
    const card = document.createElement('div');
    card.className = 'card prompt-card';
    card.dataset.promptIdx = idx;

    const status = prompt.status || 'pending';
    const durationBadge = prompt.duration_seconds > 0
      ? `<span class="act-timing-badge" style="font-size:0.72rem; padding:3px 10px">⏱ ${prompt.duration_seconds}s</span>`
      : '';

    card.innerHTML = `
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:1">
          <span style="font-size:0.82rem; background:var(--accent-light); padding:4px 10px; border-radius:8px; font-weight:800; color:var(--accent); flex-shrink:0">${String(prompt.scene_number || idx + 1).padStart(2, '0')}</span>
          <h3 style="font-size:1rem; margin:0; flex:1; min-width:100px">${escHtml(prompt.scene_title || 'Cena sem título')}</h3>
          <span class="prompt-status status-${status}">${statusLabel(status)}</span>
          ${durationBadge}
        </div>
        <div class="card-header-actions">
          <button class="btn btn-secondary btn-sm btn-regen-prompt" title="Regerar prompt">🔄</button>
          <button class="btn-icon-sm btn-remove-prompt" title="Remover cena">🗑</button>
        </div>
      </div>
      <div class="prompt-meta">
        <span>📷 ${escHtml(prompt.shot_type || 'Plano')}</span>
        <span>🎥 ${escHtml(prompt.camera_angle || 'Ângulo')}</span>
        <span>👤 ${escHtml(getCharName(prompt.primary_character) || '—')}</span>
        <span>📍 ${escHtml(getLocName(prompt.location) || '—')}</span>
      </div>
      <textarea class="input-field prompt-textarea" data-prompt-idx="${idx}">${escHtml(prompt.prompt_text || '')}</textarea>
      <div class="prompt-actions-row">
        <div class="prompt-check">
          <input type="checkbox" id="promptCheck_${idx}" checked>
          <label for="promptCheck_${idx}">Incluir na geração</label>
        </div>
        <div class="prompt-char-count">${(prompt.prompt_text || '').length} caracteres</div>
      </div>
    `;

    card.querySelector('.btn-remove-prompt').addEventListener('click', () => {
      if (confirm('Remover esta cena?')) {
        App.state.prompts.splice(idx, 1);
        Storage.saveState('prompts', App.state.prompts);
        render();
      }
    });

    card.querySelector('.btn-regen-prompt').addEventListener('click', () => regeneratePrompt(idx));

    const textarea = card.querySelector('.prompt-textarea');
    textarea.addEventListener('input', () => {
      App.state.prompts[idx].prompt_text = textarea.value;
      card.querySelector('.prompt-char-count').textContent = `${textarea.value.length} caracteres`;
      Storage.saveState('prompts', App.state.prompts);
    });

    return card;
  }

  async function generateAct(actIdx) {
    const act = App.state.acts[actIdx];
    if (!act) return;

    const sceneIndices = act.scene_ids
      .map(sid => App.state.prompts.findIndex(p => p.scene_id === sid))
      .filter(i => i !== -1);

    if (sceneIndices.length === 0) {
      App.showToast('Nenhuma cena encontrada para este ato.', 'warning');
      return;
    }

    // Show act progress bar
    const progressBar = document.getElementById(`actProgress_${actIdx}`);
    if (progressBar) progressBar.classList.add('visible');

    App.state.scenesToGenerate = sceneIndices;
    App.goToPage(9);
    Page9.startQueue(sceneIndices);
  }

  async function regeneratePrompt(idx) {
    const config = Page1.getConfig();
    const scene = App.state.scenes[idx];
    if (!scene) {
      App.showToast('Cena não encontrada para regeração.', 'error');
      return;
    }
    App.showToast('Regerando prompt...', 'info');
    try {
      const prompts = await API.generatePrompts(config.apiKey, {
        characters: App.state.characters,
        locations: App.state.locations,
        scenes: [scene],
        styleDescription: Page7.getStyleDescription(),
        colorGrading: Page7.getColorGrading(),
        config
      });
      if (prompts && prompts.length > 0) {
        App.state.prompts[idx] = { ...App.state.prompts[idx], ...prompts[0] };
        await Storage.saveState('prompts', App.state.prompts);
        render();
        App.showToast('Prompt regerado com sucesso!', 'success');
      }
    } catch (e) {
      App.showToast('Erro ao regerar: ' + e.message, 'error');
    }
  }

  async function regenerateAllPrompts() {
    if (!confirm('Regerar todos os prompts? O conteúdo atual será substituído.')) return;
    App.state.prompts = [];
    await Storage.saveState('prompts', []);
    App.goToPage(7);
    setTimeout(() => {
      Page7.saveStyle();
      // Trigger generation from page7
      document.getElementById('btnNext7')?.click();
    }, 500);
  }

  function startGeneration(selectedOnly) {
    let scenesToGenerate;
    if (selectedOnly) {
      scenesToGenerate = [];
      document.querySelectorAll('[id^="promptCheck_"]').forEach(cb => {
        const idx = parseInt(cb.id.split('_')[1]);
        if (cb.checked && App.state.prompts[idx]) scenesToGenerate.push(idx);
      });
      if (scenesToGenerate.length === 0) {
        App.showToast('Selecione ao menos uma cena', 'warning');
        return;
      }
    } else {
      scenesToGenerate = App.state.prompts.map((_, i) => i);
    }

    App.state.scenesToGenerate = scenesToGenerate;
    Storage.saveState('prompts', App.state.prompts);
    App.goToPage(9);
    Page9.startQueue(scenesToGenerate);
  }

  function statusLabel(s) {
    const labels = { pending: '⏳ Pendente', generating: '🔄 Gerando', completed: '✅ Concluído', error: '❌ Erro' };
    return labels[s] || s;
  }
  function getCharName(id) {
    const c = (App.state.characters || []).find(c => c.id === id);
    return c ? c.name : (id || '');
  }
  function getLocName(id) {
    const l = (App.state.locations || []).find(l => l.id === id);
    return l ? l.name : (id || '');
  }
  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  return { init, render, regenerateAllPrompts };
})();
