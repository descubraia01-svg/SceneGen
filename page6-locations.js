/* ===========================================
   Page 6 — Locações e Cenários
   (Sem chamadas de API — apenas edição de texto)
   =========================================== */

const Page6 = (() => {

  function init() {
    document.getElementById('btnBack6').addEventListener('click', () => { Page5.saveOutfits(); App.goToPage(5); });
    document.getElementById('btnNext6').addEventListener('click', () => { saveLocations(); App.goToPage(7); });
    document.getElementById('btnAddLocation').addEventListener('click', () => addLocation());
  }

  function render() {
    const list = document.getElementById('locationsList');
    list.innerHTML = '';
    const locs = App.state.locations || [];
    locs.forEach((loc, idx) => list.appendChild(createLocationCard(loc, idx)));
  }

  function createLocationCard(loc, idx) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.locIdx = idx;

    card.innerHTML = `
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:12px;flex:1">
          <input type="text" class="input-field" value="${escHtml(loc.name)}"
            data-field="name" style="font-size:1.5rem;font-weight:800; border:none; background:transparent; padding:0">
          <span class="chip chip-accent">${loc.scenes_count || loc.scenes_appearing?.length || 0} cenas</span>
        </div>
        <div class="card-header-actions">
          <button class="btn-icon-sm btn-remove-loc" title="Remover locação">🗑</button>
        </div>
      </div>
      <div class="card-body" style="display:flex; flex-direction:column; gap:24px">
        <div class="form-group">
          <label style="font-weight:700; font-size:0.85rem; text-transform:uppercase; color:var(--text-tertiary)">Descrição Visual do Ambiente</label>
          <textarea class="input-field" data-field="description" rows="3" placeholder="Descreva os elementos visuais, arquitetura, clima...">${escHtml(loc.description || '')}</textarea>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px">
          <div class="form-group">
            <label style="font-weight:700; font-size:0.85rem; text-transform:uppercase; color:var(--text-tertiary)">Hora do Dia</label>
            <select class="input-field" data-field="time_of_day">
              <option value="day" ${loc.time_of_day === 'day' ? 'selected' : ''}>Dia</option>
              <option value="night" ${loc.time_of_day === 'night' ? 'selected' : ''}>Noite</option>
              <option value="dusk" ${loc.time_of_day === 'dusk' ? 'selected' : ''}>Entardecer</option>
              <option value="dawn" ${loc.time_of_day === 'dawn' ? 'selected' : ''}>Amanhecer</option>
              <option value="unspecified" ${!loc.time_of_day || loc.time_of_day === 'unspecified' ? 'selected' : ''}>Automático / Variável</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight:700; font-size:0.85rem; text-transform:uppercase; color:var(--text-tertiary)">Atmosfera / Mood</label>
            <input type="text" class="input-field" value="${escHtml(loc.atmosphere || loc.mood || '')}" data-field="mood" placeholder="ex. Tenso, pacífico...">
          </div>
        </div>
        <div class="form-group">
          <label style="font-weight:700; font-size:0.85rem; text-transform:uppercase; color:var(--text-tertiary)">Lógica de Iluminação</label>
          <input type="text" class="input-field" value="${escHtml(loc.lighting_logic || '')}" data-field="lighting_logic" placeholder="ex. Luz principal da esquerda...">
        </div>
        
        <div style="background:var(--bg-tertiary); border-radius:16px; padding:20px; border:1px solid var(--border)">
          <h4 style="margin-top:0; font-size:0.85rem; text-transform:uppercase; font-weight:800; color:var(--text-secondary); margin-bottom:16px">Paleta de Cores Sugerida</h4>
          <div class="color-swatch-grid">
            <div class="color-swatch-item"><label>Dominante</label><input type="text" value="${escHtml(loc.color_dominant || '')}" data-field="color_dominant" placeholder="ex. #223344" class="input-field"></div>
            <div class="color-swatch-item"><label>Secundária</label><input type="text" value="${escHtml(loc.color_secondary || '')}" data-field="color_secondary" placeholder="ex. Âmbar" class="input-field"></div>
            <div class="color-swatch-item"><label>Acento</label><input type="text" value="${escHtml(loc.color_accent || '')}" data-field="color_accent" placeholder="ex. Dourado" class="input-field"></div>
          </div>
        </div>
        
        <div>
          <h4 style="font-size:0.85rem; text-transform:uppercase; font-weight:800; color:var(--text-secondary); margin-bottom:12px">Referências Visuais (${(App.state.locationRefs?.[loc.id] || []).length}/5)</h4>
          <div class="refs-gallery">
            <div class="ref-images" id="locRefs_${idx}" style="display:flex; gap:12px; flex-wrap:wrap"></div>
            <label class="ref-add-thumb">
              ➕
              <input type="file" accept="image/*" multiple style="display:none" data-ref-type="location_reference" data-loc-idx="${idx}">
            </label>
          </div>
        </div>
      </div>
    `;


    card.querySelector('.btn-remove-loc').addEventListener('click', () => {
      if (confirm('Remover esta locação?')) { App.state.locations.splice(idx, 1); render(); }
    });

    const refInput = card.querySelector('[data-ref-type="location_reference"]');
    refInput.addEventListener('change', (e) => handleLocRefUpload(e, idx));
    setTimeout(() => renderLocRefs(idx), 0);

    return card;
  }

  async function handleLocRefUpload(e, locIdx) {
    const loc = App.state.locations[locIdx];
    if (!loc) return;
    const files = Array.from(e.target.files);
    if (!App.state.locationRefs) App.state.locationRefs = {};
    if (!App.state.locationRefs[loc.id]) App.state.locationRefs[loc.id] = [];
    const maxNew = 5 - App.state.locationRefs[loc.id].length;
    const toUpload = files.slice(0, maxNew);
    for (const file of toUpload) {
      const { data, mimeType } = await FileParser.readAsBase64(file);
      const refId = `loc_${loc.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await Storage.saveImage(refId, data, 'location_reference', mimeType);
      App.state.locationRefs[loc.id].push({ id: refId, mimeType });
    }
    renderLocRefs(locIdx);
    e.target.value = '';
  }

  function renderLocRefs(locIdx) {
    const container = document.getElementById(`locRefs_${locIdx}`);
    if (!container) return;
    const loc = App.state.locations[locIdx];
    if (!loc) return;
    container.innerHTML = '';
    const refs = App.state.locationRefs?.[loc.id] || [];
    refs.forEach((ref, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'ref-thumb-wrapper';
      thumb.innerHTML = `<img src="" alt="Referência de locação"><button class="btn-remove-ref" data-ref-idx="${i}">✕</button>`;
      Storage.getImage(ref.id).then(img => { if (img) thumb.querySelector('img').src = `data:${img.mimeType};base64,${img.data}`; });
      thumb.querySelector('.btn-remove-ref').addEventListener('click', async () => {
        await Storage.deleteImage(ref.id);
        App.state.locationRefs[loc.id].splice(i, 1);
        renderLocRefs(locIdx);
      });
      container.appendChild(thumb);
    });

  }

  function addLocation() {
    const id = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    App.state.locations.push({ id, name: 'Nova Locação', description: '', time_of_day: 'day', mood: '', lighting_logic: '', color_dominant: '', color_secondary: '', color_accent: '', scenes_appearing: [] });
    render();
  }

  function saveLocations() {
    document.querySelectorAll('#locationsList .card').forEach((card, idx) => {
      const loc = App.state.locations[idx];
      if (!loc) return;
      card.querySelectorAll('[data-field]').forEach(el => { loc[el.dataset.field] = el.value; });
    });
    Storage.saveState('locations', App.state.locations);
    Storage.saveState('locationRefs', App.state.locationRefs || {});
  }

  function escHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

  return { init, render, saveLocations };
})();
