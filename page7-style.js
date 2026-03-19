/* ===========================================
   Page 7 — Style References & Color Grading
   v3.0: Batch generation with real progress,
         full scene coverage fix
   =========================================== */

const Page7 = (() => {
  const PRESETS = {
    warm: 'Tons de âmbar quente, luz solar suave de fim de tarde, sombras levemente púrpuras, saturação vibrante.',
    neon: 'Estética vaporwave/cyberpunk. Contrastes fortes entre azul ciano e magenta neon. Sombras profundas e luzes de alta intensidade.',
    vintage: 'Estética de película antiga. Tons desbotados, cores ligeiramente lavadas, contraste suave, preto levemente acinzentado.',
    moon: 'Luz prateada de luar. Tons de azul frio e azul marinho, sombras nítidas, destaques brancos contrastantes.',
    custom: ''
  };

  const BATCH_SIZE = 5; // Gera 5 cenas por chamada à API

  function init() {
    document.getElementById('btnBack7').addEventListener('click', () => {
      Page6.saveLocations();
      App.goToPage(6);
    });

    document.getElementById('btnNext7').addEventListener('click', () => {
      saveStyle();
      generateAllPrompts();
    });

    // Color presets
    document.getElementById('colorPresets').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#colorPresets .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const preset = chip.dataset.preset;
      const cgField = document.getElementById('colorGrading');
      if (PRESETS[preset] !== undefined) {
        cgField.value = PRESETS[preset];
        if (preset === 'custom') cgField.focus();
      }
    });

    // Style ref upload
    const fileInput = document.getElementById('styleRefUpload').querySelector('input[type="file"]');
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!App.state.styleRefs) App.state.styleRefs = [];
      const maxNew = 3 - App.state.styleRefs.length;
      for (const file of files.slice(0, maxNew)) {
        const { data, mimeType } = await FileParser.readAsBase64(file);
        const refId = `style_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await Storage.saveImage(refId, data, 'style_reference', mimeType);
        App.state.styleRefs.push({ id: refId, mimeType });
      }
      renderStyleRefs();
      e.target.value = '';
    });

    // Restore saved values
    const savedStyle = Storage.getLocal('styleDescription', '');
    if (savedStyle) document.getElementById('styleDescription').value = savedStyle;
    const savedCg = Storage.getLocal('colorGrading', '');
    if (savedCg) document.getElementById('colorGrading').value = savedCg;
  }

  function render() { renderStyleRefs(); }

  function renderStyleRefs() {
    const container = document.getElementById('styleRefImages');
    if (!container) return;
    container.innerHTML = '';
    const refs = App.state.styleRefs || [];
    refs.forEach((ref, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'ref-thumb-wrapper';
      thumb.innerHTML = `<img src="" alt="Referência de estilo"><button class="btn-remove-ref" data-ref-idx="${i}">✕</button>`;
      Storage.getImage(ref.id).then(img => {
        if (img) thumb.querySelector('img').src = `data:${img.mimeType};base64,${img.data}`;
      });
      thumb.querySelector('.btn-remove-ref').addEventListener('click', async () => {
        await Storage.deleteImage(ref.id);
        App.state.styleRefs.splice(i, 1);
        renderStyleRefs();
      });
      container.appendChild(thumb);
    });
  }

  function saveStyle() {
    const styleDesc = document.getElementById('styleDescription').value;
    const colorGrading = document.getElementById('colorGrading').value;
    Storage.setLocal('styleDescription', styleDesc);
    Storage.setLocal('colorGrading', colorGrading);
    Storage.saveState('styleRefs', App.state.styleRefs || []);
    App.state.styleDescription = styleDesc;
    App.state.colorGrading = colorGrading;
  }

  // UI helpers for the button state
  function setBtnLoading(loading) {
    const btnText = document.getElementById('btnNext7Text');
    const btnLoading = document.getElementById('btnNext7Loading');
    const btn = document.getElementById('btnNext7');
    if (btnText) btnText.style.display = loading ? 'none' : '';
    if (btnLoading) btnLoading.style.display = loading ? 'flex' : 'none';
    if (btn) btn.disabled = loading;
  }

  // =============================================
  // MAIN: Generate ALL prompts in batches
  // =============================================
  async function generateAllPrompts() {
    saveStyle();
    const config = Page1.getConfig();

    setBtnLoading(true);
    App.setStepStatus(8, 'loading');

    // --- Step 1: Ensure we have scenes ---
    if (!App.state.scenes || App.state.scenes.length === 0) {
      try {
        await runFullAnalysis(config);
      } catch (e) {
        setBtnLoading(false);
        App.setStepStatus(8, 'pending');
        return;
      }
    }

    if (!App.state.scenes || App.state.scenes.length === 0) {
      App.showToast('Nenhuma cena encontrada. Volte e analise o roteiro.', 'error');
      setBtnLoading(false);
      App.setStepStatus(8, 'pending');
      return;
    }

    const totalScenes = App.state.scenes.length;
    console.log(`[Page7] Starting batch prompt generation for ${totalScenes} scenes`);

    // --- Step 2: Navigate to page 8 and show loading ---
    App.goToPage(8);
    setBtnLoading(false);

    const overlay = document.getElementById('promptGenerating');
    const statusEl = document.getElementById('promptGeneratingStatus');
    const progressFill = document.getElementById('promptProgressFill');
    const progressInfo = document.getElementById('promptProgressInfo');

    if (overlay) overlay.style.display = 'flex';
    if (progressInfo) progressInfo.style.display = 'block';

    const updateStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };
    const updateProgress = (done, total) => {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressInfo) progressInfo.textContent = `${done} / ${total} cenas processadas`;
    };

    // --- Step 3: Generate in batches ---
    const allPrompts = [];
    const scenes = App.state.scenes;
    const batches = [];
    for (let i = 0; i < scenes.length; i += BATCH_SIZE) {
      batches.push(scenes.slice(i, i + BATCH_SIZE));
    }

    console.log(`[Page7] ${batches.length} batches of up to ${BATCH_SIZE} scenes each`);

    let totalDone = 0;
    let failedScenes = [];

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const sceneNums = batch.map(s => s.scene_number || (scenes.indexOf(s) + 1)).join(', ');
      updateStatus(`Gerando cenas ${sceneNums} (Lote ${batchIdx + 1}/${batches.length})...`);

      let batchSuccess = false;
      let batchRetries = 0;

      while (!batchSuccess && batchRetries < 3) {
        try {
          const onRetry = (wait, attempt, max) => {
            App.showToast(`API: aguardando ${Math.round(wait)}s... (tentativa ${attempt}/${max})`, 'warning');
            updateStatus(`Aguardando API (${Math.round(wait)}s) — Lote ${batchIdx + 1}/${batches.length}`);
          };

          const batchPrompts = await API.generatePrompts(config.apiKey, {
            characters: App.state.characters,
            locations: App.state.locations,
            scenes: batch,
            styleDescription: App.state.styleDescription,
            colorGrading: App.state.colorGrading,
            config
          }, onRetry);

          if (batchPrompts && batchPrompts.length > 0) {
            allPrompts.push(...batchPrompts);
            totalDone += batch.length;
            updateProgress(totalDone, totalScenes);
            batchSuccess = true;
            console.log(`[Page7] Batch ${batchIdx + 1} OK: ${batchPrompts.length} prompts`);
          } else {
            throw new Error('Batch returned 0 prompts');
          }
        } catch (e) {
          batchRetries++;
          console.warn(`[Page7] Batch ${batchIdx + 1} failed (attempt ${batchRetries}):`, e.message);

          if (batchRetries >= 3) {
            // Fallback: generate scene by scene for this batch
            console.warn(`[Page7] Falling back to per-scene generation for batch ${batchIdx + 1}`);
            updateStatus(`Recuperando individualmente — Lote ${batchIdx + 1}...`);

            for (const scene of batch) {
              try {
                const singlePrompt = await API.generatePrompts(config.apiKey, {
                  characters: App.state.characters,
                  locations: App.state.locations,
                  scenes: [scene],
                  styleDescription: App.state.styleDescription,
                  colorGrading: App.state.colorGrading,
                  config
                });
                if (singlePrompt && singlePrompt[0]) {
                  allPrompts.push(singlePrompt[0]);
                  console.log(`[Page7] Scene ${scene.scene_number} recovered OK`);
                } else {
                  failedScenes.push(scene.scene_number || '?');
                }
              } catch (err2) {
                failedScenes.push(scene.scene_number || '?');
                console.error(`[Page7] Scene ${scene.scene_number} failed permanently:`, err2.message);
              }
              totalDone++;
              updateProgress(totalDone, totalScenes);
            }
            batchSuccess = true; // We handled it (even with some failures)
          } else {
            const waitMs = batchRetries * 3000;
            updateStatus(`Tentativa ${batchRetries}/3 — aguardando ${waitMs/1000}s...`);
            await new Promise(r => setTimeout(r, waitMs));
          }
        }
      }
    }

    // --- Step 4: Sort by scene number and finalize ---
    allPrompts.sort((a, b) => (a.scene_number || 0) - (b.scene_number || 0));

    // --- Step 5: Cross-reference with acts ---
    if (App.state.acts && App.state.acts.length > 0) {
      reconcileActsWithPrompts(allPrompts);
    }

    App.state.prompts = allPrompts;
    await Storage.saveState('prompts', allPrompts);

    if (overlay) overlay.style.display = 'none';
    Page8.render();
    App.setStepStatus(8, 'completed');

    if (failedScenes.length > 0) {
      App.showToast(`⚠️ ${allPrompts.length} prompts gerados. ${failedScenes.length} cenas falharam: ${failedScenes.slice(0, 5).join(', ')}`, 'warning');
    } else {
      App.showToast(`✅ ${allPrompts.length} prompts prontos para produção!`, 'success');
    }

    console.log(`[Page7] DONE: ${allPrompts.length}/${totalScenes} prompts generated`);
  }

  // Ensure prompts have correct scene_ids matching act.scene_ids
  function reconcileActsWithPrompts(prompts) {
    const acts = App.state.acts || [];
    acts.forEach(act => {
      const correctedIds = [];
      act.scene_ids.forEach(sid => {
        // Try to match by scene_id directly
        const found = prompts.find(p => p.scene_id === sid);
        if (found) {
          correctedIds.push(sid);
          return;
        }
        // Try to match by scene_number extracted from scene_id like "scene_001"
        const numMatch = sid.match(/(\d+)/);
        if (numMatch) {
          const num = parseInt(numMatch[1]);
          const byNum = prompts.find(p => p.scene_number === num);
          if (byNum) {
            correctedIds.push(byNum.scene_id);
          }
        }
      });
      act.scene_ids = correctedIds;
    });
    Storage.saveState('acts', acts);
  }

  // Full analysis only when needed
  async function runFullAnalysis(config) {
    const scriptText = await Storage.getState('scriptFullText');
    if (!scriptText) {
      App.showToast('Roteiro não encontrado. Volte para o Passo 2.', 'error');
      return;
    }

    App.setStepStatus(8, 'loading');
    const statusEl = document.getElementById('promptGeneratingStatus');
    if (statusEl) statusEl.textContent = 'Executando análise completa de cenas...';

    try {
      const result = await API.analyzeScript(config.apiKey, scriptText);
      if (result.scenes && result.scenes.length > 0) {
        App.state.scenes = result.scenes;
        App.state.acts = result.acts || [];
        App.state.projectTitle = result.project_title || App.state.projectTitle;

        const titleEl = document.getElementById('projectTitleDisplay');
        if (titleEl) titleEl.textContent = App.state.projectTitle;

        await Storage.saveState('analysisResult', result);
        await Storage.saveState('acts', App.state.acts);
        Storage.setLocal('projectTitle', App.state.projectTitle);

        console.log(`[Page7] Full analysis: ${result.scenes.length} scenes, ${result.acts?.length || 0} acts`);
      } else {
        throw new Error('A IA não conseguiu identificar cenas claras no roteiro.');
      }
    } catch (e) {
      App.showToast('Erro na análise: ' + e.message, 'error');
      App.setStepStatus(8, 'pending');
      throw e;
    }
  }

  function getStyleDescription() {
    return document.getElementById('styleDescription')?.value || Storage.getLocal('styleDescription', '');
  }
  function getColorGrading() {
    return document.getElementById('colorGrading')?.value || Storage.getLocal('colorGrading', '');
  }

  return { init, render, saveStyle, getStyleDescription, getColorGrading };
})();
