/* ===========================================
   Page 1 — Configuration
   =========================================== */

const Page1 = (() => {
  const COST_TABLE = {
    'gemini-3.1-flash-image-preview': { '0.5K': 0.06, '1K': 0.08, '2K': 0.12, '4K': 0.16 },
    'gemini-3-pro-image-preview': { '0.5K': null, '1K': 0.15, '2K': 0.20, '4K': 0.30 }
  };

  const NB2_ONLY_ASPECTS = ['4:1', '1:4'];

  function init() {
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('modelSelect');
    const resSelect = document.getElementById('resolutionSelect');
    const aspectSelect = document.getElementById('aspectRatioSelect');
    const delaySlider = document.getElementById('delaySlider');
    const delayValue = document.getElementById('delayValue');
    const thinkingGroup = document.getElementById('thinkingModeGroup');
    const thinkingMode = document.getElementById('thinkingMode');
    const btnNext = document.getElementById('btnNext1');

    // Restore saved settings
    apiKeyInput.value = App.DEFAULT_API_KEY;
    apiKeyInput.readOnly = true;
    
    modelSelect.value = Storage.getLocal('model', 'gemini-3.1-flash-image-preview');
    resSelect.value = Storage.getLocal('resolution', '2K');
    aspectSelect.value = Storage.getLocal('aspectRatio', '16:9');
    delaySlider.value = Storage.getLocal('delay', 8);
    delayValue.textContent = delaySlider.value;
    thinkingMode.value = Storage.getLocal('thinkingMode', 'DYNAMIC');

    // Automatic API check
    checkApiConnection();

    // Events
    modelSelect.addEventListener('change', () => {
      Storage.setLocal('model', modelSelect.value);
      updateConditionalUI();
      updateCost();
    });

    resSelect.addEventListener('change', () => {
      Storage.setLocal('resolution', resSelect.value);
      updateConditionalUI();
      updateCost();
    });

    aspectSelect.addEventListener('change', () => {
      Storage.setLocal('aspectRatio', aspectSelect.value);
      updateConditionalUI();
    });

    delaySlider.addEventListener('input', () => {
      delayValue.textContent = delaySlider.value;
      Storage.setLocal('delay', parseInt(delaySlider.value));
    });

    thinkingMode.addEventListener('change', () => {
      Storage.setLocal('thinkingMode', thinkingMode.value);
    });

    btnNext.addEventListener('click', () => {
      if (!validate()) return;
      saveAll();
      App.goToPage(2);
    });

    const btnDirect = document.getElementById('btnContinueDirect');
    if (btnDirect) {
      btnDirect.addEventListener('click', () => {
        saveAll();
        App.goToPage(2);
      });
    }

    const btnManual = document.getElementById('btnConfigManual');
    if (btnManual) {
      btnManual.addEventListener('click', () => {
        document.getElementById('directHomeBlock').style.display = 'none';
        document.getElementById('technicalBlock').style.display = 'block';
      });
    }

    updateConditionalUI();
    updateCost();
  }

  let retryTimer = null;

  async function checkApiConnection() {
    const statusEl = document.getElementById('apiStatus');
    statusEl.innerHTML = '<span style="color:var(--text-tertiary); font-size:0.75rem">⚡ Conectando à API...</span>';
    
    // Assume success until proven otherwise to keep flow "direct"
    Storage.setLocal('apiTested', true);

    if (retryTimer) { clearInterval(retryTimer); retryTimer = null; }

    try {
      await API.testConnection(App.DEFAULT_API_KEY);
      showApiStatus(true);
      Storage.setLocal('apiTested', true);
    } catch (e) {
      const isTransient = e.status === 429 || e.status === 503 || e.message.toLowerCase().includes('high demand');
      if (isTransient) {
        // Silent retry for high demand
        setTimeout(checkApiConnection, 30000);
        showApiStatus(true); // Don't block
      } else {
        Storage.setLocal('apiTested', false);
        showApiStatus(false, e.message);
      }
    }
  }

  function showApiStatus(success, message) {
    const el = document.getElementById('apiStatus');
    if (success) {
      el.innerHTML = '<span style="color:var(--success); font-size:0.75rem; display:flex; align-items:center; gap:4px"><span class="pulse-dot green" style="width:6px; height:6px"></span> API Pronta</span>';
    } else {
      el.innerHTML = `<span style="color:var(--error); font-size:0.75rem; cursor:pointer" onclick="Page1.checkApiConnection()" title="${message || ''}">⚠️ Erro na API</span>`;
    }
  }

  function saveAll() {
    Storage.setLocal('apiKey', App.DEFAULT_API_KEY);
    Storage.setLocal('model', document.getElementById('modelSelect').value);
    Storage.setLocal('resolution', document.getElementById('resolutionSelect').value);
    Storage.setLocal('aspectRatio', document.getElementById('aspectRatioSelect').value);
    Storage.setLocal('delay', parseInt(document.getElementById('delaySlider').value));
    Storage.setLocal('thinkingMode', document.getElementById('thinkingMode').value);
  }

  function validate() {
    return true; // Non-blocking — errors handled when they happen
  }

  function updateConditionalUI() {
    // Show/hide thinking mode
    document.getElementById('thinkingModeGroup').style.display = 'none'; // Always hidden for simplicity
  }

  function updateCost() {
    const model = document.getElementById('modelSelect').value;
    const res = document.getElementById('resolutionSelect').value;
    const cost = COST_TABLE[model]?.[res] || 0.12;
    document.getElementById('costPerImage').textContent = `~$${cost.toFixed(2)}`;

    // Update branding labels
    const friendlyName = model === 'gemini-3.1-flash-image-preview' ? 'Nano Banana 2' : 'Nano Banana Pro';
    if (document.getElementById('imageModelDisplay')) document.getElementById('imageModelDisplay').innerText = friendlyName;
    if (document.getElementById('analysisModelDisplay')) document.getElementById('analysisModelDisplay').innerText = friendlyName;
    if (document.getElementById('textModelDisplay')) document.getElementById('textModelDisplay').innerText = friendlyName;
  }

  function getConfig() {
    return {
      apiKey: Storage.getLocal('apiKey', App.DEFAULT_API_KEY || ''),
      model: Storage.getLocal('model', 'gemini-3.1-flash-image-preview'),
      textModel: Storage.getLocal('textModel', 'gemini-3-flash-preview'),
      resolution: Storage.getLocal('resolution', '2K'),
      aspectRatio: Storage.getLocal('aspectRatio', '16:9'),
      delaySeconds: Storage.getLocal('delay', 8),
      thinkingMode: Storage.getLocal('thinkingMode', 'DYNAMIC')
    };
  }

  function getCostPerImage() {
    const c = getConfig();
    return COST_TABLE[c.model]?.[c.resolution] || 0;
  }

  return { init, getConfig, getCostPerImage, validate, checkApiConnection };
})();
