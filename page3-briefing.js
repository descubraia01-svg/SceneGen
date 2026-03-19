/* ===========================================
   Page 3 — Briefing
   Displays script summary + clarifying questions
   User can import characters from Library here
   =========================================== */

const Page3 = (() => {
  let answers = {};

  function init() {
    document.getElementById('btnBack3').addEventListener('click', () => App.goToPage(2));
    document.getElementById('btnNext3').addEventListener('click', () => {
      saveAnswers();
      App.goToPage(4);
    });
  }

  function render() {
    const analysis = App.state.lightAnalysis || {};
    answers = {};

    // Summary banner
    const banner = document.getElementById('briefingAnalysisSummary');
    if (analysis.project_title || analysis.total_scenes) {
      banner.style.display = 'block';
      banner.innerHTML = `
        <strong>${escHtml(analysis.project_title || 'Roteiro')}</strong>
        &ensp;·&ensp; ${analysis.characters?.length || 0} personagens
        &ensp;·&ensp; ${analysis.locations?.length || 0} locações
        &ensp;·&ensp; ${analysis.total_scenes || '?'} cenas identificadas
      `;
    }

    // Questions
    const qList = document.getElementById('briefingQuestions');
    qList.innerHTML = '';

    const questions = analysis.briefing_questions || [];

    if (questions.length === 0) {
      qList.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:32px; font-size:0.9rem">Nenhuma pergunta de briefing necessária para este roteiro.</p>';
    } else {
      const sectionTitle = document.createElement('h3');
      sectionTitle.style.cssText = 'margin-bottom: 20px; font-size: 1rem; color: var(--text); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;';
      sectionTitle.textContent = '💬 Perguntas de Refinamento';
      qList.appendChild(sectionTitle);

      questions.forEach((q, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'form-group card';
        wrap.style.padding = '24px';
        wrap.innerHTML = `
          <label for="briefingQ_${i}" style="font-size:0.95rem; line-height:1.5">${i + 1}. ${escHtml(q)}</label>
          <textarea id="briefingQ_${i}" class="input-field" rows="2" placeholder="Sua resposta ajuda a IA a entender melhor o tom da cena..."></textarea>
        `;
        qList.appendChild(wrap);
      });
    }

    // Character age variant notice
    const chars = analysis.characters || [];
    const withVariants = chars.filter(c => c.has_age_variants);
    if (withVariants.length > 0) {
      const notice = document.createElement('div');
      notice.className = 'info-banner';
      notice.style.marginTop = '24px';
      notice.innerHTML = `<strong>⚠️ Variantes de idade detectadas:</strong> ${withVariants.map(c => escHtml(c.name) + (c.age_variant_note ? ` — ${escHtml(c.age_variant_note)}` : '')).join('; ')}. O sistema gerará versões separadas para cada fase de idade.`;
      qList.appendChild(notice);
    }

    // --- NEW: Character Cast Management ---
    renderCastManagement(qList);

    // Library import
    loadLibrarySection();
  }

  function renderCastManagement(container) {
    const castSection = document.createElement('div');
    castSection.className = 'cast-management-section';
    castSection.style.cssText = 'margin-top:40px; padding-top:40px; border-top:1px solid var(--border)';
    
    const titleRow = document.createElement('div');
    titleRow.className = 'card-header';
    titleRow.style.marginBottom = '20px';
    titleRow.innerHTML = `
      <h3 style="margin:0; font-size: 1rem; color: var(--text); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">🎭 Gestão do Elenco</h3>
      <button class="btn btn-secondary btn-sm" id="btnAddCastMember">+ Adicionar Membro</button>
    `;
    castSection.appendChild(titleRow);

    const castList = document.createElement('div');
    castList.className = 'cast-compact-list';
    castList.style.cssText = 'display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:12px';

    const chars = App.state.characters || [];
    if (chars.length === 0) {
      castList.innerHTML = '<p style="grid-column:1/-1; color:var(--text-tertiary); font-size:0.9rem; text-align:center; padding:20px">Nenhum personagem identificado. Adicione manualmente ou importe da biblioteca.</p>';
    } else {
      chars.forEach((char, idx) => {
        const item = document.createElement('div');
        item.className = 'card';
        item.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:12px';
        item.innerHTML = `
          <div style="flex:1; font-size:0.9rem; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escHtml(char.name)}</div>
          <button class="btn-icon-sm" data-idx="${idx}" style="color:var(--error); font-size:12px" title="Remover">🗑</button>
        `;
        item.querySelector('button').addEventListener('click', () => {
          if (confirm(`Remover "${char.name}" do elenco?`)) {
            App.state.characters.splice(idx, 1);
            render();
          }
        });
        castList.appendChild(item);
      });
    }


    castSection.appendChild(castList);
    container.appendChild(castSection);

    document.getElementById('btnAddCastMember').addEventListener('click', () => {
      const name = prompt('Nome do novo personagem:');
      if (name && name.trim()) {
        App.state.characters.push({
          id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: name.trim(),
          role: 'supporting',
          character_dna: {},
          character_invariants: [],
          physical_traits: {},
          description: '',
          outfits: [],
          scenes_appearing: []
        });
        render();
      }
    });
  }

  function saveAnswers() {
    const analysis = App.state.lightAnalysis || {};
    const questions = analysis.briefing_questions || [];
    const answersMap = {};
    questions.forEach((q, i) => {
      const el = document.getElementById(`briefingQ_${i}`);
      if (el && el.value.trim()) answersMap[q] = el.value.trim();
    });
    App.state.briefingAnswers = answersMap;
    Storage.setLocal('briefingAnswers', answersMap);
  }

  async function loadLibrarySection() {
    try {
      const chars = await CharacterLibrary.list();
      const section = document.getElementById('briefingLibrarySection');
      const grid = document.getElementById('briefingLibraryGrid');

      if (chars.length === 0) { section.style.display = 'none'; return; }

      section.style.display = 'block';
      grid.innerHTML = '';
      chars.forEach(char => {
        const card = document.createElement('div');
        card.className = 'library-card';
        card.innerHTML = `
          ${char.thumbnail
            ? `<img src="data:${char.thumbnailMime || 'image/jpeg'};base64,${char.thumbnail}" class="library-card-thumb" alt="${escHtml(char.name)}">`
            : `<div class="library-card-thumb library-card-placeholder">👤</div>`}
          <div class="library-card-name">${escHtml(char.name)}</div>
          <button class="btn btn-secondary btn-sm" data-lib-id="${char.id}">Importar</button>
        `;
        card.querySelector('[data-lib-id]').addEventListener('click', () => importFromLibrary(char));
        grid.appendChild(card);
      });
    } catch (e) {
      console.warn('Library load error:', e);
    }
  }

  function importFromLibrary(libChar) {
    // Add to project characters if not already there
    const existing = App.state.characters.find(c => c.name === libChar.name);
    if (existing) {
      // Merge DNA if missing
      if (!existing.character_dna || Object.keys(existing.character_dna).length === 0) {
        Object.assign(existing, {
          character_dna: libChar.character_dna,
          character_invariants: libChar.character_invariants,
          physical_traits: libChar.physical_traits,
          description: libChar.description,
          _fromLibrary: true,
          _libraryId: libChar.id,
          _libraryThumbnail: libChar.thumbnail,
          _libraryThumbnailMime: libChar.thumbnailMime
        });
        App.showToast(`✅ DNA de "${libChar.name}" importado da Biblioteca!`, 'success');
      } else {
        App.showToast(`"${libChar.name}" já está no projeto com DNA definido.`, 'warning');
      }
    } else {
      App.state.characters.push({
        id: `char_${Date.now()}`,
        name: libChar.name,
        role: 'imported',
        character_dna: libChar.character_dna,
        character_invariants: libChar.character_invariants,
        physical_traits: libChar.physical_traits,
        description: libChar.description,
        outfits: [],
        scenes_appearing: [],
        _fromLibrary: true,
        _libraryId: libChar.id,
        _libraryThumbnail: libChar.thumbnail,
        _libraryThumbnailMime: libChar.thumbnailMime
      });
      App.showToast(`✅ "${libChar.name}" importado da Biblioteca!`, 'success');
    }
    render();
  }

  function escHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

  return { init, render, saveAnswers };
})();
