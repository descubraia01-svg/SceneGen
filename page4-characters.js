/* ===========================================
   Page 4 — Characters & References
   Reference-first: user uploads image,
   AI describes DNA based on the photo
   =========================================== */

const Page4 = (() => {

  function init() {
    document.getElementById('btnBack4').addEventListener('click', () => App.goToPage(3));
    document.getElementById('btnNext4').addEventListener('click', () => { saveCharacters(); App.goToPage(5); });
    document.getElementById('btnAddCharacter').addEventListener('click', () => addCharacter());
  }

  function render() {
    const list = document.getElementById('charactersList');
    list.innerHTML = '';
    const chars = App.state.characters || [];
    chars.forEach((char, idx) => list.appendChild(createCharacterCard(char, idx)));
  }

  function addCharacter() {
    const name = prompt('Nome do personagem:');
    if (!name) return;
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

  function createCharacterCard(char, idx) {
    const card = document.createElement('div');
    card.className = 'card character-card';
    card.dataset.charIdx = idx;

    const refs = char._references || [];
    const hasDNA = char.character_dna && Object.keys(char.character_dna).length > 0;
    const isFromLibrary = !!char._fromLibrary;

    // References Gallery
    let refsHtml = '';
    if (refs.length > 0) {
      refsHtml = refs.map((ref, rIdx) => `
        <div class="ref-thumb-wrapper">
          <img src="data:${ref.mime || 'image/jpeg'};base64,${ref.data}" class="char-ref-thumb" alt="ref">
          <button class="btn-remove-ref" data-char-idx="${idx}" data-ref-idx="${rIdx}">×</button>
        </div>
      `).join('');
    }

    if (refs.length < 5) {
      refsHtml += `
        <label class="ref-add-thumb">
          ➕
          <input type="file" accept="image/*" class="multi-ref-input" style="display:none" data-char-idx="${idx}">
        </label>
      `;
    }

    const dnaHtml = hasDNA ? Object.entries(char.character_dna).slice(0, 10).map(([k, v]) =>
      `<div class="dna-item"><span class="dna-label">${k.replace(/_/g, ' ')}</span><span class="dna-value">${escHtml(String(v))}</span></div>`
    ).join('') : '';

    card.innerHTML = `
      <div class="card-header">
        <div style="display:flex; flex-direction:column; gap:16px; width:100%">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <input type="text" class="input-field char-name-input" value="${escHtml(char.name)}" style="font-weight:700; font-size:1.25rem; flex:1; min-width:200px">
            ${isFromLibrary ? '<span class="chip chip-accent">📚 Biblioteca</span>' : ''}
            <span class="chip">${escHtml(char.role || 'personagem')}</span>
            ${hasDNA ? '<span class="chip chip-success">✓ DNA Pronto</span>' : '<span class="chip" style="opacity:0.6">⏳ Sem DNA</span>'}
            <button class="btn-icon-sm btn-remove-char" title="Remover personagem" style="margin-left:auto">🗑</button>
          </div>
          <div class="refs-gallery">
            ${refsHtml}
          </div>
          <textarea class="input-field char-context-input" rows="2" placeholder="Contexto adicional (idade, personalidade, papel)..." style="font-size:0.9rem">${escHtml(char.context || '')}</textarea>
        </div>
      </div>
      <div class="card-body">
        <div class="card-body-actions">
          <button class="btn btn-primary btn-sm btn-describe-ai" data-char-idx="${idx}" ${refs.length === 0 ? 'disabled title="Suba pelo menos uma referência"' : ''}>
            ✨ Descrever DNA com IA (${refs.length}/5 fotos)
          </button>
          <button class="btn btn-secondary btn-sm btn-save-library" data-char-idx="${idx}" ${!hasDNA ? 'disabled' : ''}>
            💾 Salvar na Biblioteca
          </button>
        </div>
        ${hasDNA ? `<div class="dna-preview-mini">${dnaHtml}</div>` : ''}
        <div class="char-ai-result" id="charResult_${idx}"></div>
      </div>
    `;

    // Event Listeners
    card.querySelector('.char-name-input').addEventListener('change', (e) => {
      App.state.characters[idx].name = e.target.value.trim();
    });

    card.querySelector('.char-context-input').addEventListener('change', (e) => {
      App.state.characters[idx].context = e.target.value.trim();
    });

    card.querySelector('.btn-remove-char').addEventListener('click', () => {
      if (confirm(`Remover "${char.name}"?`)) { App.state.characters.splice(idx, 1); render(); }
    });

    // Multi-ref upload
    const multiInput = card.querySelector('.multi-ref-input');
    if (multiInput) {
      multiInput.addEventListener('change', async () => {
        const file = multiInput.files[0];
        if (!file) return;
        const { data, mimeType } = await FileParser.readAsBase64(file);
        
        if (!char._references) char._references = [];
        char._references.push({ data, mime: mimeType });
        
        // Sync to centralized refs (Error 11)
        if (!App.state.characterRefs) App.state.characterRefs = {};
        App.state.characterRefs[char.id] = char._references;
        
        render();
      });
    }

    // Remove ref
    card.querySelectorAll('.btn-remove-ref').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rIdx = parseInt(btn.dataset.refIdx);
        char._references.splice(rIdx, 1);
        
        // Sync to centralized refs (Error 11)
        if (App.state.characterRefs) App.state.characterRefs[char.id] = char._references;
        
        render();
      });
    });

    // Describe AI
    card.querySelector('.btn-describe-ai').addEventListener('click', async () => {
      const c = App.state.characters[idx];
      const refs = c._references || [];
      if (refs.length === 0) { App.showToast('Suba pelo menos uma foto!', 'warning'); return; }

      const btn = card.querySelector('.btn-describe-ai');
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = '⏳ Analisando...';

      // Inject script context to prevent gender/role contamination (Error 5)
      const scriptContext = `Nome: ${c.name}. Papel: ${c.role}. Contexto: ${c.context || ''}`;

      const resultEl = document.getElementById(`charResult_${idx}`);
      resultEl.innerHTML = `<div style="text-align:center;padding:12px;color:var(--text-secondary);font-size:0.85rem">
        <span class="spinner" style="display:inline-block;margin-right:8px"></span>
        Analisando ${refs.length} referências para criar DNA visual...
      </div>`;

      try {
        const config = Page1.getConfig();
        const result = await API.describeCharacterFromReference(config.apiKey, c, refs);

        App.state.characters[idx].character_dna = result.character_dna || {};
        App.state.characters[idx].character_invariants = result.character_invariants || [];
        App.state.characters[idx].physical_traits = result.physical_traits || {};
        App.state.characters[idx].description = result.description || '';

        App.showToast(`✅ DNA de "${c.name}" gerado com sucesso!`, 'success');
        
        // Check if all characters have DNA
        const allDone = App.state.characters.every(ch => ch.character_dna && Object.keys(ch.character_dna).length > 0);
        if (allDone) App.setStepStatus(4, 'completed');

        render();
      } catch (e) {
        console.error(e);
        resultEl.innerHTML = `<div style="color:var(--error);font-size:0.85rem;padding:8px">Erro na IA: ${escHtml(e.message)}</div>`;
        btn.disabled = false;
        btn.textContent = '✨ Reconectar e Tentar';
      }
    });

    // Save to Library
    card.querySelector('.btn-save-library').addEventListener('click', async () => {
      const c = App.state.characters[idx];
      const thumb = c._references?.[0];
      try {
        await CharacterLibrary.save({
          ...c,
          thumbnail: thumb ? thumb.data : null,
          thumbnailMime: thumb ? thumb.mime : 'image/jpeg'
        });
        App.showToast(`💾 "${c.name}" salvo na biblioteca!`, 'success');
      } catch (e) { App.showToast('Erro: ' + e.message, 'error'); }
    });

    return card;
  }

  function saveCharacters() {
    Storage.saveState('characters', App.state.characters);
    Storage.saveState('characterRefs', App.state.characterRefs || {});
  }

  function escHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

  return { init, render, saveCharacters };
})();
