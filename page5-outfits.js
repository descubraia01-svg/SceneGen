/* ===========================================
   Page 5 — Outfits
   Separated from character DNA definition.
   Per-character outfit management with optional
   reference image per outfit.
   =========================================== */

const Page5 = (() => {

  function init() {
    document.getElementById('btnBack5').addEventListener('click', () => App.goToPage(4));
    document.getElementById('btnNext5').addEventListener('click', () => { saveOutfits(); App.goToPage(6); });
  }

  function render() {
    const list = document.getElementById('outfitsList');
    list.innerHTML = '';
    const chars = (App.state.characters || []).filter(c => c.character_dna && Object.keys(c.character_dna).length > 0);

    if (chars.length === 0) {
      list.innerHTML = `
        <div style="text-align:center; padding:48px; color: var(--text-tertiary)">
          <div style="font-size:2.5rem; margin-bottom:12px">👗</div>
          <p>Nenhum personagem com DNA definido ainda.</p>
          <p style="font-size:0.85rem; margin-top:8px">Volte ao passo anterior e use "Descrever com IA" para gerar o DNA de cada personagem.</p>
        </div>`;
      return;
    }

    chars.forEach((char, charIdx) => {
      const realIdx = App.state.characters.indexOf(char);
      list.appendChild(createCharacterOutfitBlock(char, realIdx));
    });
  }

  function createCharacterOutfitBlock(char, charIdx) {
    const wrap = document.createElement('div');
    wrap.className = 'card character-outfit-group';
    wrap.style.marginBottom = '20px';

    const outfits = char.outfits || [];
    const firstRef = char._references?.[0];
    const thumbSrc = firstRef ? `data:${firstRef.mime || 'image/jpeg'};base64,${firstRef.data}` : null;

    wrap.innerHTML = `
      <div class="character-block-header">
        ${thumbSrc ? `<img src="${thumbSrc}" alt="">` : '<div style="width:56px;height:56px;border-radius:12px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:1.5rem">👤</div>'}
        <div style="flex:1">
          <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:var(--text)">${escHtml(char.name)}</h3>
          <div style="display:flex; align-items:center; gap:8px; margin-top:4px">
            <span class="chip">${outfits.length} figurinos</span>
            <span class="chip" style="opacity:0.6">${escHtml(char.role || 'Personagem')}</span>
          </div>
        </div>
        <div>
          <button class="btn btn-secondary btn-sm btn-add-outfit" data-char-idx="${charIdx}">+ Novo Figurino</button>
        </div>
      </div>
      <div class="card-body" id="outfitCards_${charIdx}">
        ${outfits.length === 0 ? `<div style="text-align:center; padding:32px; color:var(--text-tertiary); font-size:0.9rem">Nenhum figurino detectado. Adicione o figurino para este personagem.</div>` : ''}
      </div>
    `;


    // Render existing outfits
    const outfitContainer = wrap.querySelector(`#outfitCards_${charIdx}`);
    if (outfits.length > 0) {
      outfits.forEach((outfit, oIdx) => {
        outfitContainer.appendChild(createOutfitEntry(charIdx, oIdx, outfit));
      });
    }

    // Add Outfit Event
    wrap.querySelector('.btn-add-outfit').addEventListener('click', () => {
      const id = `outfit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      App.state.characters[charIdx].outfits.push({
        outfit_id: id,
        outfit_name: `Figurino ${App.state.characters[charIdx].outfits.length + 1}`,
        full_description: '',
        scenes: '',
        refData: null,
        refMime: null
      });
      render();
    });

    return wrap;
  }

  function createOutfitEntry(charIdx, oIdx, outfit) {
    const div = document.createElement('div');
    div.className = 'outfit-entry';

    const thumbEl = outfit.refData
      ? `<img src="data:${outfit.refMime || 'image/jpeg'};base64,${outfit.refData}" style="width:72px;height:72px;border-radius:12px;object-fit:cover;flex-shrink:0" alt="outfit ref">`
      : `<div class="ref-add-thumb" style="width:72px;height:72px;font-size:1.2rem;flex-shrink:0">👕</div>`;

    div.innerHTML = `
      <label style="cursor:pointer;flex-shrink:0">
        ${thumbEl}
        <input type="file" accept="image/*" style="display:none" class="outfit-ref-input">
      </label>
      <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:12px">
        <div style="display:flex; gap:12px; align-items:center">
          <input type="text" class="input-field outfit-name" value="${escHtml(outfit.outfit_name)}" placeholder="Nome do figurino..." style="font-weight:700; flex:1">
          <button class="btn-icon-sm btn-remove-outfit" title="Remover">🗑</button>
        </div>
        <textarea class="input-field outfit-desc" rows="3" placeholder="Descreva o figurino completo...">${escHtml(outfit.full_description)}</textarea>
        <div style="display:flex; align-items:center; gap:8px">
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-tertiary); text-transform:uppercase">Cenas:</span>
          <input type="text" class="input-field outfit-scenes" value="${escHtml(outfit.scenes || '')}" placeholder="Ex. 1-10, 15..." style="padding:6px 12px; font-size:0.85rem">
        </div>
      </div>
    `;


    // Outfit ref upload
    div.querySelector('.outfit-ref-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const { data, mimeType } = await FileParser.readAsBase64(file);
      
      const char = App.state.characters[charIdx];
      char.outfits[oIdx].refData = data;
      char.outfits[oIdx].refMime = mimeType;
      
      // Sync to centralized refs (Error 11)
      if (!App.state.outfitRefs) App.state.outfitRefs = {};
      App.state.outfitRefs[outfit.outfit_id] = [{ data, mimeType }];
      
      render();
    });

    // Name update
    div.querySelector('.outfit-name').addEventListener('change', (e) => {
      App.state.characters[charIdx].outfits[oIdx].outfit_name = e.target.value.trim();
    });

    // Description update
    div.querySelector('.outfit-desc').addEventListener('change', (e) => {
      App.state.characters[charIdx].outfits[oIdx].full_description = e.target.value.trim();
    });

    // Scenes update
    div.querySelector('.outfit-scenes').addEventListener('change', (e) => {
      App.state.characters[charIdx].outfits[oIdx].scenes = e.target.value.trim();
    });

    // Remove outfit
    div.querySelector('.btn-remove-outfit').addEventListener('click', () => {
      if (App.state.outfitRefs) delete App.state.outfitRefs[outfit.outfit_id];
      App.state.characters[charIdx].outfits.splice(oIdx, 1);
      render();
    });

    return div;
  }

  function saveOutfits() {
    Storage.saveState('characters', App.state.characters);
    Storage.saveState('outfitRefs', App.state.outfitRefs || {});
  }

  function escHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

  return { init, render, saveOutfits };
})();
