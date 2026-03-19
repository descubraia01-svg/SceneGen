/* ===========================================
   App.js — Main Orchestrator v3.0
   Lateral Slide Navigation + Enhanced UX
   =========================================== */
console.log('%c [SISTEMA] Versão 3.0 Carregada ✓', 'color: #4F8EF7; font-weight: bold; background: #0D1117; padding: 5px 10px; border-radius: 4px;');

const App = (() => {
  const DEFAULT_API_KEY = "AIzaSyAN3pV06XMpie6JJNV62icO6zGTMplB4kg";
  let currentPage = 1;
  let isNavigating = false; // Prevent rapid clicks during animation

  const state = {
    analysis: null,
    lightAnalysis: null,
    briefingAnswers: {},
    characters: [],
    locations: [],
    scenes: [],
    prompts: [],
    acts: [],
    characterRefs: {},
    outfitRefs: {},
    locationRefs: {},
    styleRefs: [],
    styleDescription: '',
    tokensSpent: 0,
    tokensTotal: 500000,
    colorGrading: '',
    scenesToGenerate: [],
    stepStatuses: {}
  };

  function init() {
    initDarkMode();

    // Initialize all pages
    Page1.init();
    Page2.init();
    Page3.init();
    Page4.init();
    Page5.init();
    Page6.init();
    Page7.init();
    Page8.init();
    Page9.init();

    // Sidebar actions
    document.getElementById('btnSidebarExport').addEventListener('click', exportProject);
    document.getElementById('btnSidebarImport').addEventListener('click', () => document.getElementById('importFileInput').click());
    document.getElementById('importFileInput').addEventListener('change', importProject);
    document.getElementById('btnSidebarNew').addEventListener('click', newSession);
    document.getElementById('btnSidebarDarkMode').addEventListener('click', toggleDarkMode);
    document.getElementById('btnSidebarSave').addEventListener('click', manualSave);
    const btnGalleryReset = document.getElementById('btnNewProjectGallery');
    if (btnGalleryReset) btnGalleryReset.addEventListener('click', newSession);

    // Stepper: click to navigate
    document.querySelectorAll('.step').forEach(step => {
      step.addEventListener('click', () => {
        const page = parseInt(step.dataset.step);
        if (isNavigating) return;
        if (page <= currentPage || page === currentPage + 1) {
          goToPage(page);
        }
      });
    });

    // Show first page initially
    const firstPage = document.getElementById('page1');
    if (firstPage) firstPage.classList.add('page-active');

    // Restore session
    restoreSession();

    // Token Tracker
    updateTokenUI();

    // Token callback
    API.onTokenUsage = (usage) => {
      state.tokensSpent += (usage.totalTokenCount || 0);
      Storage.setLocal('tokensSpent', state.tokensSpent);
      updateTokenUI();
    };

    // Auto-save every 30s
    setInterval(() => saveAllState(true), 30000);

    updateStepper();
  }

  async function restoreSession() {
    try {
      const savedChars = await Storage.getState('characters');
      if (savedChars) state.characters = savedChars;
      const savedLocs = await Storage.getState('locations');
      if (savedLocs) state.locations = savedLocs;
      const savedLight = await Storage.getState('lightAnalysis');
      if (savedLight) state.lightAnalysis = savedLight;
      const savedAnalysis = await Storage.getState('analysisResult');
      if (savedAnalysis) {
        state.analysis = savedAnalysis;
        state.scenes = savedAnalysis.scenes || [];
      }
      const savedPrompts = await Storage.getState('prompts');
      if (savedPrompts) state.prompts = savedPrompts;
      const savedCharRefs = await Storage.getState('characterRefs');
      if (savedCharRefs) state.characterRefs = savedCharRefs;
      const savedOutfitRefs = await Storage.getState('outfitRefs');
      if (savedOutfitRefs) state.outfitRefs = savedOutfitRefs;
      const savedLocRefs = await Storage.getState('locationRefs');
      if (savedLocRefs) state.locationRefs = savedLocRefs;
      const savedStyleRefs = await Storage.getState('styleRefs');
      if (savedStyleRefs) state.styleRefs = savedStyleRefs;
      const savedActs = await Storage.getState('acts');
      if (savedActs) state.acts = savedActs;

      state.styleDescription = Storage.getLocal('styleDescription', '');
      state.colorGrading = Storage.getLocal('colorGrading', '');
      state.tokensSpent = Storage.getLocal('tokensSpent', 0);

      const briefingStr = Storage.getLocal('briefingAnswers', '');
      if (briefingStr) { try { state.briefingAnswers = JSON.parse(briefingStr); } catch (e) {} }

      const lastPage = Storage.getLocal('lastPage', 1);
      if (lastPage > 1 && (state.lightAnalysis || state.characters.length > 0)) {
        goToPage(Math.min(lastPage, 7), true); // skip animation on restore
      }
    } catch (e) {
      console.warn('Session restore error:', e);
    }
  }

  // =============================================
  // LATERAL SLIDE NAVIGATION
  // =============================================
  function goToPage(page, skipAnimation = false) {
    if (page === currentPage) return;
    if (isNavigating && !skipAnimation) return;

    // Save current page state
    if (currentPage === 3) Page3.saveAnswers();
    if (currentPage === 4) Page4.saveCharacters();
    if (currentPage === 5) Page5.saveOutfits();
    if (currentPage === 6) Page6.saveLocations();
    if (currentPage === 7) Page7.saveStyle();
    if (currentPage === 8) Storage.saveState('prompts', state.prompts);

    const direction = page > currentPage ? 'forward' : 'backward';
    const prevPage = document.getElementById(`page${currentPage}`);
    const nextPage = document.getElementById(`page${page}`);

    if (!nextPage) return;

    if (skipAnimation || !prevPage) {
      // Instant switch (restore session or no prev page)
      document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('page-active', 'slide-in-right', 'slide-in-left', 'slide-out-right', 'slide-out-left');
        p.style.display = '';
      });
      nextPage.classList.add('page-active');
      currentPage = page;
      Storage.setLocal('lastPage', page);
      updateStepper();
      renderPageContent(page);
      return;
    }

    isNavigating = true;

    // Outgoing animation
    const outClass = direction === 'forward' ? 'slide-out-left' : 'slide-out-right';
    // Incoming animation
    const inClass = direction === 'forward' ? 'slide-in-right' : 'slide-in-left';

    prevPage.classList.remove('page-active');
    prevPage.classList.add(outClass);

    nextPage.classList.remove('page-active', 'slide-in-right', 'slide-in-left', 'slide-out-right', 'slide-out-left');
    nextPage.classList.add(inClass);

    const ANIM_DURATION = 400;

    setTimeout(() => {
      // Clean up outgoing
      prevPage.classList.remove(outClass);

      // Finalize incoming
      nextPage.classList.remove(inClass);
      nextPage.classList.add('page-active');

      currentPage = page;
      Storage.setLocal('lastPage', page);
      updateStepper();
      renderPageContent(page);

      // Scroll to top of new page
      nextPage.scrollTo(0, 0);

      isNavigating = false;
    }, ANIM_DURATION);
  }

  function renderPageContent(page) {
    if (page === 3) Page3.render();
    if (page === 4) Page4.render();
    if (page === 5) Page5.render();
    if (page === 6) Page6.render();
    if (page === 7) Page7.render();
    if (page === 8 && state.prompts?.length > 0) Page8.render();
  }

  function updateStepper() {
    document.querySelectorAll('.step').forEach(step => {
      const page = parseInt(step.dataset.step);
      step.classList.remove('active', 'completed', 'loading', 'locked');

      const status = state.stepStatuses[page];
      if (status === 'loading') {
        step.classList.add('loading');
      } else if (status === 'completed' || page < currentPage) {
        step.classList.add('completed');
      } else if (page > currentPage + 1) {
        step.classList.add('locked');
      }

      if (page === currentPage) {
        step.classList.add('active');
        step.classList.remove('locked');
      }
    });
  }

  function updateTokenUI() {
    const spentEl = document.getElementById('tokensSpent');
    const totalEl = document.getElementById('tokensTotal');
    if (spentEl) spentEl.textContent = state.tokensSpent.toLocaleString('pt-BR');
    if (totalEl) totalEl.textContent = state.tokensTotal.toLocaleString('pt-BR');
  }

  function setStepStatus(page, status) {
    state.stepStatuses[page] = status;
    updateStepper();
  }

  // =============================================
  // DARK MODE
  // =============================================
  function initDarkMode() {
    const saved = Storage.getLocal('darkMode', null);
    if (saved !== null) {
      document.documentElement.setAttribute('data-theme', saved ? 'dark' : 'light');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateDarkModeIcon();
  }

  function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    Storage.setLocal('darkMode', !isDark);
    updateDarkModeIcon();
  }

  function updateDarkModeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const sun = document.querySelector('.sun-icon');
    const moon = document.querySelector('.moon-icon');
    if (sun) sun.style.display = isDark ? 'none' : '';
    if (moon) moon.style.display = isDark ? '' : 'none';
  }

  // =============================================
  // TOASTS
  // =============================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 300ms ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // =============================================
  // EXPORT / IMPORT
  // =============================================
  async function exportProject() {
    try {
      showToast('Exportando projeto...', 'info');
      const data = await Storage.exportProject();
      data.appState = state;
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      saveAs(blob, `scenegen_project_${new Date().toISOString().slice(0, 10)}.json`);
      showToast('Projeto exportado!', 'success');
    } catch (e) {
      showToast('Erro ao exportar: ' + e.message, 'error');
    }
  }

  async function importProject(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version) { showToast('Arquivo de projeto inválido', 'error'); return; }
      if (!confirm('Importar projeto? Isso substituirá a sessão atual.')) return;
      await Storage.importProject(data);
      if (data.appState) Object.assign(state, data.appState);
      showToast('Projeto importado! Recarregando...', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      showToast('Erro ao importar: ' + err.message, 'error');
    }
    e.target.value = '';
  }

  // =============================================
  // SAVE
  // =============================================
  async function manualSave() {
    const btn = document.getElementById('btnSidebarSave');
    if (btn) btn.classList.add('saving');
    await saveAllState(false);
    setTimeout(() => {
      if (btn) btn.classList.remove('saving');
      showToast('Progresso salvo localmente!', 'success');
    }, 600);
  }

  async function saveAllState(quiet = false) {
    try {
      const indicator = document.getElementById('saveIndicator');
      if (indicator) {
        indicator.textContent = 'Salvando...';
        indicator.classList.add('visible');
      }

      const savePromises = [
        Storage.saveState('characters', state.characters),
        Storage.saveState('locations', state.locations),
        Storage.saveState('lightAnalysis', state.lightAnalysis),
        Storage.saveState('analysisResult', state.analysis),
        Storage.saveState('prompts', state.prompts),
        Storage.saveState('characterRefs', state.characterRefs),
        Storage.saveState('outfitRefs', state.outfitRefs),
        Storage.saveState('locationRefs', state.locationRefs),
        Storage.saveState('styleRefs', state.styleRefs),
        Storage.saveState('briefingAnswers', state.briefingAnswers),
        Storage.saveState('acts', state.acts)
      ];
      await Promise.all(savePromises);

      Storage.setLocal('currentPage', currentPage);
      Storage.setLocal('styleDescription', state.styleDescription);
      Storage.setLocal('colorGrading', state.colorGrading);
      Storage.setLocal('tokensSpent', state.tokensSpent);
      Storage.setLocal('stepStatuses', state.stepStatuses);

      if (indicator) {
        indicator.textContent = 'Sincronizado ✓';
        setTimeout(() => indicator.classList.remove('visible'), 2500);
      }
    } catch (e) {
      console.error('Falha no auto-save:', e);
      if (!quiet) showToast('Erro ao salvar progresso.', 'warning');
    }
  }

  // =============================================
  // NEW SESSION
  // =============================================
  async function newSession() {
    if (!confirm('Iniciar novo projeto? Todo o progresso atual será limpo.')) return;
    showToast('Limpando ambiente...', 'info');
    state.characters = [];
    state.locations = [];
    state.scenes = [];
    state.prompts = [];
    state.acts = [];
    state.lightAnalysis = null;
    state.analysis = null;
    state.stepStatuses = {};
    currentPage = 1;
    await Storage.clearAll();
    localStorage.removeItem('sg_scriptText');
    showToast('Projeto reiniciado!', 'success');
    setTimeout(() => location.reload(), 800);
  }

  return {
    init,
    state,
    goToPage,
    showToast,
    setStepStatus,
    currentPage: () => currentPage,
    DEFAULT_API_KEY
  };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
