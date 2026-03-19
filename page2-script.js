/* ===========================================
   Page 2 — Script Upload & Light Analysis
   Only extracts names/scenes (cheap call)
   =========================================== */

const Page2 = (() => {
  let extractedFileText = '';

  function init() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const textarea = document.getElementById('scriptTextarea');
    const charCounter = document.getElementById('charCounter');

    const savedText = Storage.getLocal('scriptText', '');
    if (savedText) { textarea.value = savedText; updateCharCount(); }

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) await handleFile(file);
    });

    document.getElementById('btnChooseFile').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => { if (fileInput.files[0]) await handleFile(fileInput.files[0]); });

    document.getElementById('btnRemoveFile').addEventListener('click', () => {
      extractedFileText = '';
      document.getElementById('filePreview').style.display = 'none';
      document.getElementById('dropZone').style.display = 'flex';
      fileInput.value = '';
    });

    textarea.addEventListener('input', () => { updateCharCount(); Storage.setLocal('scriptText', textarea.value); });
    document.getElementById('btnAnalyze').addEventListener('click', () => handleAnalyze());
    document.getElementById('btnBack2').addEventListener('click', () => App.goToPage(1));
  }

  async function handleFile(file) {
    const validExts = ['pdf', 'md', 'txt', 'docx'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(ext)) { App.showToast('Formato não suportado. Use .pdf, .md, .txt ou .docx', 'error'); return; }
    try {
      App.showToast('Extraindo texto...', 'info');
      const text = await FileParser.parseFile(file);
      extractedFileText = text;
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileTextPreview').textContent = text.substring(0, 2000) + (text.length > 2000 ? '...' : '');
      document.getElementById('filePreview').style.display = 'flex';
      document.getElementById('dropZone').style.display = 'none';
      App.showToast('Texto extraído com sucesso!', 'success');
    } catch (e) { App.showToast('Erro ao ler arquivo: ' + e.message, 'error'); }
  }

  function updateCharCount() {
    const textarea = document.getElementById('scriptTextarea');
    document.getElementById('charCounter').textContent = `${textarea.value.length} caracteres`;
  }

  function getFullText() {
    const textarea = document.getElementById('scriptTextarea');
    const manualText = textarea ? textarea.value.trim() : '';
    const parts = [];
    if (extractedFileText) parts.push(extractedFileText);
    if (manualText) parts.push(manualText);
    return parts.join('\n\n---\n\n');
  }

  function setStatusIcon(type) {
    const icon = document.getElementById('analysisStatusIcon');
    if (!icon) return;
    icon.style.display = type ? 'inline-block' : 'none';
    icon.className = 'status-icon ' + (type || '');
  }

  async function handleAnalyze() {
    const script = getFullText();
    if (!script || script.length < 20) {
      App.showToast('Por favor, insira o roteiro (mínimo 20 caracteres).', 'error');
      return;
    }

    const btn = document.getElementById('btnAnalyze');
    const text = btn.querySelector('.btn-text');
    const loading = btn.querySelector('.btn-loading');

    try {
      if (text) text.style.display = 'none';
      if (loading) loading.style.display = 'flex';
      
      // Clear Stale Data BEFORE new analysis
      App.state.scenes = [];
      App.state.prompts = [];
      App.state.generatedImages = {};
      await Storage.saveState('scenes', []);
      await Storage.saveState('prompts', []);
      await Storage.deleteState('analysisResult'); 

      const config = Page1.getConfig();
      
      const onProgress = (current, total) => {
        if (text) {
          text.style.display = 'flex';
          text.textContent = `Analisando parte ${current}/${total}...`;
        }
        App.showToast(`Analisando parte ${current} de ${total}...`, 'info');
      };

      const onRetry = (wait, attempt, max) => {
        App.showToast(`Limite atingido. Aguardando ${Math.round(wait)}s para retomar...`, 'warning');
        if (text) text.textContent = `Aguardando (${Math.round(wait)}s)...`;
      };

      const result = await API.analyzeScriptLight(config.apiKey, script, onProgress, onRetry);

      if (text) text.textContent = 'Analisar Roteiro'; 
      await Storage.saveState('scriptFullText', script);
      await Storage.saveState('lightAnalysis', result);

      App.state.lightAnalysis = result;
      App.state.projectTitle = result.project_title || 'Projeto Sem Título';
      App.state.acts = result.acts || [];
      Storage.setLocal('projectTitle', App.state.projectTitle);
      document.getElementById('projectTitleDisplay').textContent = App.state.projectTitle;

      const seededChars = (result.characters || []).map(c => ({
        ...c,
        character_dna: {},
        character_invariants: [],
        outfits: (c.outfits || []).map(o => ({
          outfit_id: `outfit_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          outfit_name: o.name || 'Figurino',
          full_description: o.description || '',
          scenes: o.scenes || '',
          refData: null,
          refMime: null
        })),
        physical_traits: {},
        scenes_appearing: []
      }));
      const seededLocs = (result.locations || []).map(l => ({
        ...l,
        description: l.description || '',
        atmosphere: l.mood || '',
        mood: l.mood || '',
        color_dominant: l.color_palette?.dominant || '',
        color_secondary: l.color_palette?.secondary || '',
        color_accent: l.color_palette?.accent || '',
        lighting_logic: l.lighting_logic || '',
        time_of_day: l.time_of_day || 'unspecified'
      }));

      App.state.characters = seededChars;
      App.state.locations = seededLocs;
      await Storage.saveState('characters', seededChars);
      await Storage.saveState('locations', seededLocs);
      await Storage.saveState('acts', App.state.acts);

      App.setStepStatus(2, 'completed');
      App.showToast(`✅ Análise concluída! ${result.characters?.length || 0} personagens identificados`, 'success');
      
      setTimeout(() => App.goToPage(3), 600);
    } catch (e) {
      console.error(e);
      App.setStepStatus(2, 'pending');
      App.showToast('Erro na análise: ' + e.message, 'error');
    } finally {
      if (text) text.style.display = 'flex';
      if (loading) loading.style.display = 'none';
      if (text && text.textContent.includes('Analisando')) text.textContent = 'Analisar Roteiro';
    }
  }


  return { init, handleAnalyze, getFullText };
})();
