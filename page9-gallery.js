/* ===========================================
   Page 7 — Gallery & Render Queue
   =========================================== */

const Page9 = (() => {
  let queue = [];
  let currentIndex = 0;
  let isRunning = false;
  let isPaused = false;
  let startTime = 0;
  let fullscreenIndex = -1;
  const MAX_RETRIES_PER_SCENE = 5;

  function init() {
    document.getElementById('btnBack9').addEventListener('click', () => {
      if (isRunning) {
        if (!confirm('A geração está em andamento. Deseja pausar e voltar?')) return;
        isPaused = true;
        isRunning = false;
      }
      App.goToPage(8);
    });
    document.getElementById('btnPauseQueue').addEventListener('click', togglePause);
    document.getElementById('btnCancelQueue').addEventListener('click', cancelQueue);
    document.getElementById('btnDownloadAll').addEventListener('click', downloadAll);

    // Fullscreen viewer
    document.getElementById('btnCloseFullscreen').addEventListener('click', closeFullscreen);
    document.getElementById('fullscreenViewer').querySelector('.fullscreen-backdrop').addEventListener('click', closeFullscreen);
    document.getElementById('btnPrevImage').addEventListener('click', () => navFullscreen(-1));
    document.getElementById('btnNextImage').addEventListener('click', () => navFullscreen(1));
    document.getElementById('btnFullscreenDownload').addEventListener('click', () => downloadSingle(fullscreenIndex));
    document.getElementById('btnFullscreenRegenerate').addEventListener('click', () => { closeFullscreen(); regenerateScene(fullscreenIndex); });
    document.getElementById('btnFullscreenPrompt').addEventListener('click', () => showPromptModal(fullscreenIndex));

    // Prompt modal
    document.getElementById('btnClosePromptModal').addEventListener('click', () => document.getElementById('promptModal').style.display = 'none');
    document.getElementById('btnClosePromptModal2').addEventListener('click', () => document.getElementById('promptModal').style.display = 'none');
    document.getElementById('btnCopyPrompt').addEventListener('click', () => {
      const text = document.getElementById('promptModalText').textContent;
      navigator.clipboard.writeText(text).then(() => App.showToast('Prompt copiado!', 'success'));
    });

    // Keyboard nav in fullscreen
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('fullscreenViewer').style.display === 'none') return;
      if (e.key === 'Escape') closeFullscreen();
      if (e.key === 'ArrowLeft') navFullscreen(-1);
      if (e.key === 'ArrowRight') navFullscreen(1);
    });
  }

  function startQueue(sceneIndices) {
    const prompts = App.state.prompts || [];
    queue = sceneIndices.map(i => ({
      index: i,
      prompt: prompts[i],
      status: 'pending',
      generatedImage: null,
      versions: [],
      error: null,
      retryCount: 0
    }));

    currentIndex = 0;
    isRunning = true;
    isPaused = false;
    startTime = Date.now();
    
    App.setStepStatus(9, 'loading');

    renderGrid();
    updateProgress();
    processNext();
  }

  async function processNext() {
    if (!isRunning || isPaused || currentIndex >= queue.length) {
      if (currentIndex >= queue.length) {
        isRunning = false;
        App.setStepStatus(9, 'completed');
        document.getElementById('btnDownloadAll').style.display = 'inline-flex';
        document.getElementById('gallerySubtitle').textContent = 'Geração completa!';
        App.showToast('Todas as imagens foram geradas!', 'success');
        showSessionSummary();
      }
      return;
    }

    const item = queue[currentIndex];
    item.status = 'generating';
    updateGridItem(currentIndex);
    updateProgress();

    const config = Page1.getConfig();
    const baseDelay = (config.delaySeconds || 8) * 1000;

    try {
      const refImages = await collectReferences(item.prompt);
      const result = await API.generateImage(
        config.apiKey, config.model, item.prompt.prompt_text, refImages, config
      );

      if (result.image) {
        if (item.generatedImage) {
          item.versions.push({ data: item.generatedImage.data, mimeType: item.generatedImage.mimeType, timestamp: Date.now() });
        }
        item.generatedImage = result.image;
        item.aiNotes = result.text;
        item.status = 'completed';
        item.retryCount = 0;
        await Storage.saveGenerated(`scene_${item.index}`, {
          imageData: result.image.data, mimeType: result.image.mimeType,
          aiNotes: result.text, versions: item.versions
        });
      } else {
        item.status = 'error';
        item.error = 'Nenhuma imagem retornada';
      }

    } catch (e) {
      // Exponential Backoff for 429 (Rate Limit) and 503 (High Demand)
      const isRetryable = e.status === 429 || e.status === 503 || (e.message || '').toLowerCase().includes('high demand');

      if (isRetryable && item.retryCount < MAX_RETRIES_PER_SCENE) {
        item.retryCount++;
        // backoffDelay = baseDelay * 2^retryCount (e.g., 8s, 16s, 32s, 64s, 128s)
        const backoffDelay = baseDelay * Math.pow(2, item.retryCount);
        const backoffSecs = Math.round(backoffDelay / 1000);

        item.status = 'retrying';
        item.retryMessage = `Tentativa ${item.retryCount}/${MAX_RETRIES_PER_SCENE}... aguardando ${backoffSecs}s`;
        updateGridItem(currentIndex);

        App.showToast(`🔄 Cena ${item.prompt?.scene_number || currentIndex + 1}: Limite atingido. Tentando em ${backoffSecs}s (tentativa ${item.retryCount}/${MAX_RETRIES_PER_SCENE})`, 'warning');

        // Live countdown on the grid item
        let remaining = backoffSecs;
        const countdownInterval = setInterval(() => {
          remaining--;
          if (remaining <= 0 || !isRunning) { clearInterval(countdownInterval); return; }
          item.retryMessage = `Tentativa ${item.retryCount}/${MAX_RETRIES_PER_SCENE}... aguardando ${remaining}s`;
          updateGridItem(currentIndex);
        }, 1000);

        await sleep(backoffDelay);
        clearInterval(countdownInterval);

        if (isRunning && !isPaused) processNext();
        return;
      }

      item.status = 'error';
      item.error = e.message || 'Erro desconhecido';
      item.retryCount = 0;
    }

    updateGridItem(currentIndex);
    updateProgress();
    currentIndex++;

    if (isRunning && !isPaused && currentIndex < queue.length) {
      await sleep(baseDelay);
      processNext();
    } else if (currentIndex >= queue.length) {
      isRunning = false;
      document.getElementById('btnDownloadAll').style.display = 'inline-flex';
      document.getElementById('gallerySubtitle').textContent = 'Geração completa!';
      App.showToast('Todas as imagens foram geradas!', 'success');
      showSessionSummary();
    }
  }

  async function collectReferences(prompt) {
    const refs = [];
    const refInfo = prompt.reference_images || {};

    // 1. Character references (Top Priority)
    if (refInfo.character_refs) {
      for (const charId of refInfo.character_refs) {
        const char = (App.state.characters || []).find(c => c.id === charId);
        if (char && char._references && char._references.length > 0) {
          for (const ref of char._references) {
            if (refs.length >= 6) break;
            refs.push({ data: ref.data, mimeType: ref.mime || 'image/jpeg' });
          }
        }
      }
    }

    // 2. Style reference
    if (refs.length < 6 && refInfo.style_ref && App.state.styleRefs?.length > 0) {
      const styleRef = App.state.styleRefs[0];
      const img = await Storage.getImage(styleRef.id);
      if (img) refs.push({ data: img.data, mimeType: img.mimeType });
    }

    // 3. Location reference
    if (refs.length < 6 && refInfo.location_ref) {
      const locIdx = (App.state.locations || []).findIndex(l => l.id === refInfo.location_ref);
      if (locIdx >= 0 && App.state.locationRefs?.[locIdx]?.length > 0) {
        // Collect all available location refs for this scene's loc (up to limit)
        for (const refData of App.state.locationRefs[locIdx]) {
          if (refs.length >= 6) break;
          const img = await Storage.getImage(refData.id);
          if (img) refs.push({ data: img.data, mimeType: img.mimeType });
        }
      }
    }

    // 4. Outfit reference (if specifically requested or from the character's active outfit)
    if (refs.length < 6 && refInfo.character_refs) {
      for (const charId of refInfo.character_refs) {
        const char = (App.state.characters || []).find(c => c.id === charId);
        if (char && char.outfits) {
          // Look for an outfit with a reference image
          for (const outfit of char.outfits) {
            if (refs.length >= 6) break;
            if (outfit.refData) {
              refs.push({ data: outfit.refData, mimeType: outfit.refMime || 'image/jpeg' });
            }
          }
        }
      }
    }

    return refs.slice(0, 6);
  }

  function renderGrid() {
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = '';
    const config = Page1.getConfig();
    const ar = config.aspectRatio || '16:9';

    queue.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.id = `galleryItem_${idx}`;
      const prompt = item.prompt || {};
      div.innerHTML = `
        <div class="gallery-item-image" style="aspect-ratio:${ar.replace(':', '/')}" data-idx="${idx}">
          <span class="placeholder-text">Cena ${prompt.scene_number || idx + 1}</span>
        </div>
        <div class="gallery-item-footer">
          <span class="gallery-item-title">Cena ${prompt.scene_number || idx + 1} — ${escHtml((prompt.scene_title || '').substring(0, 30))}</span>
          <div class="gallery-item-actions">
            <button data-action="fullscreen" data-idx="${idx}" title="Tela Cheia">🔍</button>
            <button data-action="download" data-idx="${idx}" title="Baixar">💾</button>
            <button data-action="regenerate" data-idx="${idx}" title="Regerar">🔄</button>
            <button data-action="prompt" data-idx="${idx}" title="Ver prompt">📝</button>
          </div>
        </div>
      `;

      // Events
      div.querySelector('.gallery-item-image').addEventListener('click', () => openFullscreen(idx));
      div.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const i = parseInt(btn.dataset.idx);
          if (action === 'fullscreen') openFullscreen(i);
          else if (action === 'download') downloadSingle(i);
          else if (action === 'regenerate') regenerateScene(i);
          else if (action === 'prompt') showPromptModal(i);
        });
      });

      grid.appendChild(div);
    });
  }

  function updateGridItem(idx) {
    const item = queue[idx];
    if (!item) return;
    const container = document.querySelector(`#galleryItem_${idx} .gallery-item-image`);
    if (!container) return;

    if (item.status === 'generating') {
      container.innerHTML = `<div class="generating-spinner"><div class="spinner-lg"></div><span>Gerando...</span></div>`;
    } else if (item.status === 'retrying') {
      container.innerHTML = `
        <div class="generating-spinner">
          <div class="spinner-lg" style="border-top-color: var(--warning)"></div>
          <span style="color:var(--warning); font-size:0.78rem; text-align:center; padding:0 8px">
            🔄 ${escHtml(item.retryMessage || 'Aguardando...')}
          </span>
          <span style="font-size:0.7rem; color: var(--text-tertiary); margin-top:4px">
            Tentativa ${item.retryCount}/${MAX_RETRIES_PER_SCENE}
          </span>
        </div>`;
    } else if (item.status === 'completed' && item.generatedImage) {
      container.innerHTML = `<img src="data:${item.generatedImage.mimeType};base64,${item.generatedImage.data}" alt="Cena ${idx + 1}">`;
      // Show retry count badge if retries were needed
      if (item.retryCount > 0) {
        const badge = document.createElement('span');
        badge.style.cssText = 'position:absolute;top:6px;right:6px;background:var(--warning);color:#fff;border-radius:10px;padding:2px 7px;font-size:0.7rem;font-weight:600;pointer-events:none;';
        badge.textContent = `${item.retryCount} tentativa(s)`;
        container.style.position = 'relative';
        container.appendChild(badge);
      }
    } else if (item.status === 'error') {
      container.innerHTML = `<div class="error-icon">❌ ${escHtml(item.error || 'Erro')}<br><button class="btn btn-secondary btn-sm" onclick="Page9.regenerateScene(${idx})" style="margin-top:8px">Tentar novamente</button></div>`;
    }
  }

  function updateProgress() {
    const completed = queue.filter(q => q.status === 'completed').length;
    const total = queue.length;
    const pct = total > 0 ? (completed / total) * 100 : 0;

    document.getElementById('progressFill').style.width = `${pct}%`;
    document.getElementById('progressText').textContent = `${completed}/${total} concluídos`;

    // ETA
    if (completed > 0 && completed < total) {
      const elapsed = Date.now() - startTime;
      const perImage = elapsed / completed;
      const remaining = (total - completed) * perImage;
      const mins = Math.ceil(remaining / 60000);
      document.getElementById('progressEta').textContent = `~${mins} min restantes`;
    } else {
      document.getElementById('progressEta').textContent = '';
    }
  }

  function togglePause() {
    const btn = document.getElementById('btnPauseQueue');
    if (isPaused) {
      isPaused = false;
      isRunning = true;
      btn.textContent = '⏸ Pausar';
      App.showToast('Geração retomada', 'info');
      processNext();
    } else {
      isPaused = true;
      btn.textContent = '▶ Retomar';
      App.showToast('Geração pausada', 'warning');
    }
  }

  function cancelQueue() {
    if (!confirm('Cancelar fila de geração?')) return;
    isRunning = false;
    isPaused = false;
    App.setStepStatus(9, 'pending');
    App.showToast('Fila cancelada', 'warning');
    document.getElementById('btnDownloadAll').style.display = 'inline-flex';
  }

  async function regenerateScene(idx) {
    const item = queue[idx];
    if (!item) return;

    // Save previous version
    if (item.generatedImage) {
      item.versions.push({ data: item.generatedImage.data, mimeType: item.generatedImage.mimeType, timestamp: Date.now() });
    }

    item.status = 'generating';
    item.generatedImage = null;
    item.error = null;
    updateGridItem(idx);

    const config = Page1.getConfig();
    try {
      const refImages = await collectReferences(item.prompt);
      const result = await API.generateImage(config.apiKey, config.model, item.prompt.prompt_text, refImages, config);
      if (result.image) {
        item.generatedImage = result.image;
        item.aiNotes = result.text;
        item.status = 'completed';
        await Storage.saveGenerated(`scene_${item.index}`, {
          imageData: result.image.data, mimeType: result.image.mimeType,
          aiNotes: result.text, versions: item.versions
        });
        App.showToast(`Cena ${item.prompt.scene_number || idx + 1} regerada!`, 'success');
      }
    } catch (e) {
      item.status = 'error';
      item.error = e.message;
      App.showToast('Erro: ' + e.message, 'error');
    }

    updateGridItem(idx);
    updateProgress();
  }

  function openFullscreen(idx) {
    const item = queue[idx];
    if (!item || !item.generatedImage) return;
    fullscreenIndex = idx;
    const viewer = document.getElementById('fullscreenViewer');
    viewer.style.display = 'flex';
    document.getElementById('fullscreenImage').src = `data:${item.generatedImage.mimeType};base64,${item.generatedImage.data}`;
    document.getElementById('fullscreenTitle').textContent = `Cena ${item.prompt?.scene_number || idx + 1} — ${item.prompt?.scene_title || ''}`;
    document.body.style.overflow = 'hidden';
  }

  function closeFullscreen() {
    document.getElementById('fullscreenViewer').style.display = 'none';
    document.body.style.overflow = '';
    fullscreenIndex = -1;
  }

  function navFullscreen(dir) {
    let newIdx = fullscreenIndex + dir;
    // Find next completed scene
    while (newIdx >= 0 && newIdx < queue.length) {
      if (queue[newIdx].generatedImage) { openFullscreen(newIdx); return; }
      newIdx += dir;
    }
  }

  function showPromptModal(idx) {
    const item = queue[idx];
    if (!item) return;
    document.getElementById('promptModalTitle').textContent = `Prompt — Cena ${item.prompt?.scene_number || idx + 1}`;
    document.getElementById('promptModalText').textContent = item.prompt?.prompt_text || '';
    document.getElementById('promptModal').style.display = 'flex';
  }

  function downloadSingle(idx) {
    const item = queue[idx];
    if (!item || !item.generatedImage) { App.showToast('Imagem não disponível', 'warning'); return; }
    const link = document.createElement('a');
    link.href = `data:${item.generatedImage.mimeType};base64,${item.generatedImage.data}`;
    const title = (item.prompt?.scene_title || 'cena').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    link.download = `cena_${String(item.prompt?.scene_number || idx + 1).padStart(3, '0')}_${title}.png`;
    link.click();
  }

  async function downloadAll() {
    const completed = queue.filter(q => q.generatedImage);
    if (completed.length === 0) { App.showToast('Nenhuma imagem para baixar', 'warning'); return; }

    App.showToast('Preparando ZIP...', 'info');
    const zip = new JSZip();

    // Add images
    completed.forEach(item => {
      const title = (item.prompt?.scene_title || 'cena').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const filename = `cena_${String(item.prompt?.scene_number || item.index + 1).padStart(3, '0')}_${title}.png`;
      zip.file(filename, item.generatedImage.data, { base64: true });
    });

    // Add manifest
    const manifest = completed.map(item => ({
      scene_number: item.prompt?.scene_number,
      scene_title: item.prompt?.scene_title,
      prompt_text: item.prompt?.prompt_text,
      shot_type: item.prompt?.shot_type,
      camera_angle: item.prompt?.camera_angle,
      ai_notes: item.aiNotes
    }));
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `scene_gen_${new Date().toISOString().slice(0, 10)}.zip`);
    App.showToast('Download concluído!', 'success');
  }

  function showSessionSummary() {
    const completed = queue.filter(q => q.status === 'completed').length;
    const errors = queue.filter(q => q.status === 'error').length;
    const totalRetries = queue.reduce((sum, q) => sum + (q.retryCount || 0), 0);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;

    const msg = `✅ Sessão concluída: ${completed} imagens geradas${errors > 0 ? `, ❌ ${errors} erros` : ''}${totalRetries > 0 ? `, 🔄 ${totalRetries} tentativas` : ''} — Tempo total: ${mins}m ${secs}s`;
    App.showToast(msg, completed === queue.length ? 'success' : 'warning');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function escHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

  return { init, startQueue, regenerateScene, render: renderGrid };
})();
