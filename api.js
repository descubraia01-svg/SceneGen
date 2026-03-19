/* ===========================================
   API Module — Gemini API Wrapper
   =========================================== */

const API = (() => {
  const BASE_URL_V1BETA = 'https://generativelanguage.googleapis.com/v1beta/models';

  // Image generation models
  function getImageModel() {
    return Storage.getLocal('model', 'gemini-3.1-flash-image-preview');
  }

  function getTextModel() {
    console.log('[API] Using preview text model: gemini-3-flash-preview');
    return 'gemini-3-flash-preview';
  }

  // Legacy alias
  function getModel() { return getImageModel(); }

  // --- Helper: Fetch with Retry & Exponential Backoff ---
  async function fetchWithRetry(url, options, maxRetries = 5, timeoutMs = 120000, onRetry = null) {
    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const fetchOptions = { ...options, signal: controller.signal };

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        if (response.ok) return response;

        const errData = await response.json().catch(() => ({}));
        const message = errData.error?.message || `HTTP ${response.status}`;
        
        if (response.status === 429 || response.status === 503 || message.toLowerCase().includes('high demand')) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i + 1) * 1000;
          
          if (onRetry) onRetry(waitTime / 1000, i + 1, maxRetries);
          console.warn(`API Error ${response.status}. Retrying in ${waitTime}ms... (${i+1}/${maxRetries})`);
          
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }

        const error = new Error(message);
        error.status = response.status;
        throw error;

      } catch (err) {
        if (err.name === 'AbortError') {
          lastError = new Error('Timeout: A API demorou demais para responder (120s). Tente novamente ou use um roteiro menor.');
          if (i === maxRetries - 1) break;
          const wait = Math.pow(2, i + 1) * 1000;
          if (onRetry) onRetry(wait / 1000, i + 1, maxRetries);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        if (err.status && ![429, 503].includes(err.status)) throw err;
        lastError = err;
        if (i === maxRetries - 1) break;
        const wait = Math.pow(2, i + 1) * 1000;
        if (onRetry) onRetry(wait / 1000, i + 1, maxRetries);
        await new Promise(r => setTimeout(r, wait));
      }
    }
    throw lastError || new Error('Max retries reached');
  }

  function reportUsage(data) {
    if (data.usageMetadata && API.onTokenUsage) {
      API.onTokenUsage(data.usageMetadata);
    }
  }

  // --- Helper: Clean JSON response from LLM
  function cleanJSONResponse(text) {
    let cleanJson = text.trim();
    if (cleanJson.includes('```')) {
      const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanJson = match[1];
    }
    cleanJson = cleanJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
    return cleanJson;
  }

  // [CORREÇÃO] Post-AI Validation & Normalization (Error 2, 6, 8)
  function validateAndNormalize(rawResult) {
    const idMap = {};
    const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. Normalize Characters & Generate Canonical IDs
    const characters = (rawResult.characters || []).map(c => {
      const canonicalId = generateId('char');
      idMap[c.temp_id || c.name] = canonicalId;
      
      const outfits = (c.outfits || []).map(o => {
        const outfitCanonicalId = generateId('outfit');
        idMap[o.temp_outfit_id || o.outfit_name || o.name] = outfitCanonicalId;
        return {
          outfit_id: outfitCanonicalId,
          outfit_name: o.outfit_name || o.name || 'Figurino',
          full_description: o.full_description || o.description || '',
          scenes: Array.isArray(o.scenes) ? o.scenes : []
        };
      });

      return {
        id: canonicalId,
        name: c.name,
        role: c.role || 'supporting',
        description: c.description || '',
        physical_traits: c.physical_traits || {},
        outfits: outfits,
        character_dna: {},
        character_invariants: [],
        scenes_appearing: []
      };
    });

    // 2. Normalize Locations & Generate Canonical IDs
    const locations = (rawResult.locations || []).map(l => {
      const canonicalId = generateId('loc');
      idMap[l.temp_id || l.name] = canonicalId;
      return {
        ...l,
        id: canonicalId,
        description: l.description || '',
        time_of_day: l.time_of_day || 'unspecified'
      };
    });

    // 3. Normalize Scenes & Reconcile IDs (Error 2)
    const scenes = (rawResult.scenes || []).map(s => {
      const scene_id = `scene_${String(s.scene_number || 0).padStart(3, '0')}`;
      
      // Map character present IDs
      const characters_present = (s.characters_present || []).map(tid => idMap[tid] || tid);
      
      // Map outfits
      const character_outfits = {};
      if (s.character_outfits) {
        for (const [tid, toid] of Object.entries(s.character_outfits)) {
          character_outfits[idMap[tid] || tid] = idMap[toid] || toid;
        }
      }

      return {
        ...s,
        scene_id,
        primary_character: idMap[s.primary_character] || s.primary_character,
        characters_present,
        character_outfits,
        location: idMap[s.location] || s.location
      };
    });

    // 4. Reconcile scenes_appearing (Error 6)
    characters.forEach(char => {
      char.scenes_appearing = scenes
        .filter(s => s.characters_present && s.characters_present.includes(char.id))
        .map(s => s.scene_number);
    });

    // 5. Normalize Acts
    const acts = (rawResult.acts || []).map(a => ({
      ...a,
      scene_ids: (a.scene_ids || []).map(sid => {
        // Reconcile scene IDs if they were temp IDs
        const found = scenes.find(s => s.scene_id === sid || `scene_${String(s.scene_number).padStart(3, '0')}` === sid);
        return found ? found.scene_id : sid;
      })
    }));

    return {
      project_title: rawResult.project_title || 'Projeto Sem Título',
      acts,
      characters,
      locations,
      scenes,
      total_scenes: scenes.length
    };
  }

  // --- Test Connection ---
  async function testConnection(apiKey) {
    // Use text model for connection test (image models don't handle simple text)
    const model = getTextModel();
    const url = `${BASE_URL_V1BETA}/${model}:generateContent`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Respond with exactly: CONNECTION_OK' }] }],
        generationConfig: { maxOutputTokens: 20 }
      })
    }, 3, 30000); // 30s for test connection
    const data = await response.json();
    reportUsage(data);
    const ok = data.candidates?.[0]?.content?.parts?.[0]?.text?.includes('CONNECTION_OK') || data.candidates?.length > 0;
    if (ok) console.log(`[API] Connected via ${model} ✓`);
    return ok;
  }

  // --- Analyze Script Light (extract characters, locations, scene count) ---
  async function analyzeScriptLight(apiKey, scriptText, progressCb = null, onRetry = null) {
    let model = getTextModel();
    let url = `${BASE_URL_V1BETA}/${model}:generateContent`;
    
    // Chunking: ~15k chars per chunk
    const CHUNK_SIZE = 15000;
    const chunks = [];
    for (let i = 0; i < scriptText.length; i += CHUNK_SIZE) {
      chunks.push(scriptText.substring(i, i + CHUNK_SIZE));
    }

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      if (progressCb) progressCb(i + 1, chunks.length);
      
      const prompt = `You are an expert script analyst for 2D animation production.
Analyze this PART (${i + 1}/${chunks.length}) of a script/storyboard.

EXTRACT ALL characters mentioned and ALL locations/settings.
Count the number of distinct scenes (marked as [CENA XX] or similar headers, including "telas pretas" title screens).

Rules:
- Each character MUST have: "id" (lowercase_snake_case), "name", "role" (protagonist/supporting/background/silhouette), "description" (brief visual description)
- Each location MUST have: "id" (lowercase_snake_case), "name"
- Include ALL characters even if they appear briefly, as silhouettes, or only mentioned by name
- Keep character names and location names in their ORIGINAL language
- If a character appears at different ages (e.g. "Toguro aos 13", "Toguro adulto"), list them as ONE character with a note about age variants

Return ONLY valid JSON:
{
  "project_title": "title or empty string",
  "characters": [
    {
      "id": "char_id",
      "name": "Name",
      "role": "protagonist/supporting/background",
      "description": "Visual description",
      "outfits": [
        {"name": "Casual", "description": "Black t-shirt, jeans", "scenes": "1-5"}
      ]
    }
  ],
  "locations": [
    {
      "id": "loc_id",
      "name": "Name",
      "description": "Brief setting description",
      "time_of_day": "day/night/dusk/dawn",
      "mood": "Atmosphere description",
      "lighting_logic": "Light source/direction",
      "color_palette": {"dominant": "color", "secondary": "color", "accent": "color"}
    }
  ],
  "total_scenes": 0
}

IMPORTANT: Keep character and location names in Portuguese if they are in the script. Descriptions and other values can be in English or Portuguese (app handles both).

SCRIPT PART:
${chunks[i]}`;

      let response;
      try {
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 16384 }
          })
        }, 3, 120000, onRetry); 
      } catch (err) {
        // AUTOMATIC FALLBACK to gemini-1.5-flash (most stable)
        if (err.status === 503 || err.status === 429 || err.name === 'AbortError') {
          const fallbackModel = getImageModel(); // Use v1beta model for fallback
          console.warn(`Model ${model} unavailable (Error ${err.status}). Falling back to ${fallbackModel}...`);
          const fallbackUrl = `${BASE_URL_V1BETA}/${fallbackModel}:generateContent`;
          response = await fetchWithRetry(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
            })
          }, 5);
        } else {
          throw err;
        }
      }

      const data = await response.json();
      reportUsage(data);
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error('Empty response from API for chunk', i + 1, data);
        const finishReason = data.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY') throw new Error('Conteúdo bloqueado pelo filtro de segurança.');
        if (!data.candidates || data.candidates.length === 0) throw new Error('API não retornou resposta. Verifique sua chave API e tente novamente.');
        continue;
      }
      
      // More aggressive JSON cleaning
      let cleanJson = text.trim();
      if (cleanJson.includes('```')) {
        const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) cleanJson = match[1];
      }
      cleanJson = cleanJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters

      try {
        results.push(JSON.parse(cleanJson));
      } catch (e) {
        console.error('Failed to parse chunk JSON:', cleanJson.substring(0, 500), e);
        // Last resort: try to find anything that looks like JSON
        const fallbackMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (fallbackMatch) {
          try {
            results.push(JSON.parse(fallbackMatch[0]));
          } catch (e2) {
             console.error('Ultimate JSON fallback failed');
          }
        }
      }
    }

    if (results.length === 0) {
      throw new Error('Nenhum resultado da análise. Verifique sua conexão e tente novamente.');
    }

    // Merge results from all chunks
    const final = {
      project_title: results.find(r => r.project_title)?.project_title || 'Projeto Sem Título',
      characters: [],
      locations: [],
      total_scenes: 0,
      briefing_questions: []
    };

    const charNames = new Set();
    const locNames = new Set();

    results.forEach(res => {
      (res.characters || []).forEach(c => {
        const key = c.name?.toLowerCase();
        if (key && !charNames.has(key)) {
          charNames.add(key);
          if (!c.id) c.id = 'char_' + key.replace(/[^a-z0-9]/g, '_');
          final.characters.push(c);
        }
      });
      (res.locations || []).forEach(l => {
        const key = l.name?.toLowerCase();
        if (key && !locNames.has(key)) {
          locNames.add(key);
          if (!l.id) l.id = 'loc_' + key.replace(/[^a-z0-9]/g, '_');
          final.locations.push(l);
        }
      });
      final.total_scenes += (res.total_scenes || 0);
    });

    // Generate briefing questions in PORTUGUESE
    if (final.characters.length > 0) {
      try {
        const charList = final.characters.map(c => `${c.name} (${c.role || 'unknown'})`).join(', ');
        const locList = final.locations.map(l => l.name).join(', ');
        const qPrompt = `Você é um diretor de arte para animação 2D.
Baseado nestes personagens: [${charList}] e locações: [${locList}], gere de 3 a 5 perguntas de briefing em PORTUGUÊS para esclarecer detalhes visuais da produção.

Exemplos de boas perguntas:
- Qual o estilo artístico de referência para os personagens?
- Há alguma paleta de cores específica para cada ato?
- Os personagens devem ter proporções realistas ou estilizadas?

Retorne APENAS JSON: { "questions": ["pergunta 1", "pergunta 2"] }`;
        
        const qResp = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: qPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
          })
        }, 2, 30000);
        const qData = await qResp.json();
        const qText = qData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const qClean = qText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
        final.briefing_questions = JSON.parse(qClean).questions || [];
      } catch(e) {
        console.warn('Briefing questions fallback:', e.message);
        // Fallback hardcoded Portuguese questions
        final.briefing_questions = [
          'Qual o estilo visual de referência principal para os personagens?',
          'Há variações de idade dos personagens que precisam ser representadas?',
          'Qual a paleta de cores predominante para cada ato da história?',
          'Os cenários devem ter qual nível de detalhe (minimalista, médio, detalhado)?'
        ];
      }
    }

    return final;
  }

  // --- Describe Character from Reference Images ---
  async function describeCharacterFromReference(apiKey, character, referenceImages, onRetry = null) {
    if (!referenceImages || referenceImages.length === 0) throw new Error('No reference images provided.');

    const prompt = `You are a Character Consistency Director. Analyze the provided ${referenceImages.length} reference image(s) for the character "${character.name}".
    EXTRACT and DEFINE the "Character DNA" as a set of immutable visual rules.
    
    If multiple images are provided, compare them to find the most consistent features (hair geometry, eye shape, nose bridge, etc.).
    
    Return ONLY valid JSON with this exact structure (all values in ENGLISH):
    {
      "description": "Short visual summary",
      "character_dna": {
        "age_build": "Detailed age and body type description",
        "face_geometry": "Specific facial shape, jawline, chin type",
        "hair_geometry": "Geometry, volume, strand logic, hairline",
        "eye_specs": "Shape, eyelid type, pupil details, lash density",
        "skin_texture": "Pore detail, scars, freckles, or clean cel-style description",
        "clothing_logic": "Typical silhouettes, fabric weights, favorite colors",
        "proportions": "Anatomical ratios (e.g. 7 heads tall, wide shoulders)",
        "distinctive_marks": "Moles, tattoos, specific scars, jewelry",
        "posture": "Stance, weight distribution, typical hand positions",
        "natural_asymmetries": "Specific non-symmetrical facial features"
      },
      "character_invariants": [
        "Invariant 1: [Most critical feature]",
        "Invariant 2: [Hair consistency rule]",
        "Invariant 3: [Eye/Gaze rule]",
        "Invariant 4: [Proportion/Scale rule]",
        "Invariant 5: [Unique anatomical detail]"
      ],
      "physical_traits": {
        "hair": "color/style",
        "eyes": "color/shape",
        "build": "body type"
      }
    }

    Context about the character: ${character.context || 'None'}.
    JSON ONLY.`;

    const parts = referenceImages.map(img => ({
      inlineData: { mimeType: img.mime || 'image/jpeg', data: img.data }
    }));
    parts.push({ text: prompt });

    let model = getTextModel(); // Uses vision-capable text model for image+text analysis
    let url = `${BASE_URL_V1BETA}/${model}:generateContent`;
    let response;
    try {
      response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
        })
      }, 5, 120000, onRetry);
    } catch (err) {
      const fallbackModel = getImageModel(); // Use v1beta model for fallback
      if (err.status === 503 || err.status === 429 || err.name === 'AbortError') {
        console.warn(`Model ${model} unavailable. Falling back to ${fallbackModel} (Nano Banana 2) for DNA...`);
        const fallbackUrl = `${BASE_URL_V1BETA}/${fallbackModel}:generateContent`;
        response = await fetchWithRetry(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
          })
        }, 5);
      } else {
        throw err;
      }
    }

    const data = await response.json();
    reportUsage(data);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let cleanJson = text.trim();
    if (cleanJson.includes('```')) {
      const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanJson = match[1];
    }
    cleanJson = cleanJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn('JSON.parse failed in describeCharacter, trying manual fix...', e);
      const start = cleanJson.indexOf('{');
      const end = cleanJson.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(cleanJson.substring(start, end + 1));
        } catch (e2) {
          console.error('Manual JSON fix failed', e2);
        }
      }
      throw e;
    }
  }

  // --- Analyze Script (full) ---
  async function analyzeScript(apiKey, scriptText, onRetry = null) {
    const systemPrompt = `You are a script analyst for 2D animation production.
    Analyze the provided script and extract ALL characters, their outfits, and ALL locations.
    
    CRITICAL: Segment the script into logical ACTS (ATOS). Usually 3 acts for short narratives.
    CRITICAL: Give each scene an estimated "duration_seconds" (timing) based on its content density.

    Return ONLY valid JSON matching this EXACT structure:
    {
      "project_title": "string",
      "acts": [
        {
          "id": "act_1",
          "title": "Act I: Title",
          "description": "Summary",
          "scene_ids": ["scene_001", "scene_002"]
        }
      ],
      "characters": [
        {
          "temp_id": "char_1",
          "name": "Character Name",
          "role": "protagonist | supporting | silhouette",
          "description": "Physical description",
          "outfits": [
            {
              "temp_outfit_id": "outfit_1_1",
              "outfit_name": "Name",
              "full_description": "Look description",
              "scenes": [1, 2]
            }
          ],
          "physical_traits": { "face_shape": "...", "eye_description": "...", "hair_description": "...", "skin_tone": "...", "body_type": "...", "age_approximate": "..." }
        }
      ],
      "locations": [
        { "temp_id": "loc_1", "name": "Location Name", "description": "...", "time_of_day": "...", "mood": "...", "lighting_logic": "...", "color_palette": { "dominant": "hex", "secondary": "hex", "accent": "hex" } }
      ],
      "scenes": [
        {
          "scene_id": "scene_001",
          "scene_number": 1,
          "scene_title": "Scene Title",
          "duration_seconds": 8,
          "primary_character": "char_1",
          "characters_present": ["char_1", "char_2"],
          "character_outfits": { "char_1": "outfit_1_1" },
          "location": "loc_1",
          "summary": "...",
          "shot_type": "Full Shot | Medium Shot | Close Up",
          "camera_angle": "Eye Level | High Angle | Low Angle"
        }
      ]
    }. Return JSON ONLY.`;


    const prompt = `${systemPrompt}\n\nSCRIPT TEXT:\n${scriptText}`;

    let model = getTextModel();
    let url = `${BASE_URL_V1BETA}/${model}:generateContent`;
    let response;
    try {
      response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 65536 }
        })
      }, 5, 120000, onRetry);
    } catch (err) {
      const fallbackModel = getImageModel(); // Use v1beta model for fallback
      if (err.status === 503 || err.status === 429 || err.name === 'AbortError') {
        console.warn(`Model ${model} unavailable during full analysis. Falling back to ${fallbackModel} (Nano Banana 2)...`);
        const fallbackUrl = `${BASE_URL_V1BETA}/${fallbackModel}:generateContent`;
        response = await fetchWithRetry(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 65536 }
          })
        }, 5);
      } else {
        throw err;
      }
    }

    const data = await response.json();
    reportUsage(data);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let cleanJson = text.trim();
    if (cleanJson.includes('```')) {
      const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanJson = match[1];
    }
    cleanJson = cleanJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    return JSON.parse(cleanJson);
  }

  // --- Generate Prompts (Technical 11-Block Architecture) ---
  async function generatePrompts(apiKey, data, onRetry = null) {
    const { characters, locations, scenes, styleDescription, colorGrading, config } = data;
    
    // Build context strings for Characters and Locations
    const charContext = characters.map(c => {
      const dna = c.character_dna ? Object.entries(c.character_dna).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
      const invariants = Array.isArray(c.character_invariants) ? c.character_invariants.join('. ') : '';
      return `CHARACTER: [${c.id}] ${c.name}. Visual Traits: ${JSON.stringify(c.physical_traits || {})}. DNA Summary: ${dna}. Key Invariants: ${invariants}`;
    }).join('\n');

    const locContext = locations.map(l => {
      return `LOCATION: [${l.id}] ${l.name}. Description: ${l.description}. Atmosphere: ${l.mood || l.atmosphere}. Lighting: ${l.lighting_logic}. Palette: ${JSON.stringify(l.color_palette || {})}`;
    }).join('\n');

    const systemPrompt = `You are a Cinema Prompt Engineer for a high-end 2D Animation Production. Your task is to generate production-grade prompts for each scene based on the provided script analysis and SPECIFIC character/location definitions.

    PRODUCTION CONTEXT:
    ${charContext}
    ---
    ${locContext}

    PROMPT ARCHITECTURE (11 BLOCKS):
    1. SUBJECT ANCHOR: Use [Image ID] reference for the primary character to anchor identity.
    2. ACTION & EXPRESSION: Detailed description of what the character is doing and their emotional state.
    3. CINEMATOGRAPHY: Shot type and camera angle.
    4. ENVIRONMENT: Setting details from the location definition.
    5. PHYSICAL DESCRIPTION: Integrate character DNA and physical traits into a natural, descriptive narrative. 
       CRITICAL: DO NOT use labels like "DNA:" or "Traits:". Describe them as part of the visual reality.
    6. COSTUME: Integrate specific outfit details naturally.
    7. LIGHTING & ATMOSPHERE: Light sources, intensity, and mood.
    8. STYLE CORE: (From Config: ${styleDescription})
    9. COLOR GRADING: (From Config: ${colorGrading})
    10. NEGATIVE CONSTRAINTS: "NEGATIVE: ANTI-STORYBOARD: No rough sketch lines, no pencil draft marks. ANTI-AI-LOOK: No plastic skin, no AI glow. ANTI-DRIFT: No identity alteration. ANTI-3D: No CGI rendering. ANTI-GENERIC: No default faces. NO TEXT, NO WATERMARKS."
    11. TECHNICAL SPECS: Resolution, aspect ratio, and production quality.

    GUIDELINES:
    - Use clear, descriptive technical English. Ensure EVERY block from 1 to 11 is explicitly detailed.
    - Ensure identity consistency by explicitly describing the unique visual markers of the characters in every prompt.
    - NEVER include technical meta-labels or system notes like "DNA:" or "Invariants:" in the prompt_text.
    - RETURN A JSON ARRAY of objects. Each object MUST have:
    {
      "scene_number": number,
      "scene_title": "string",
      "shot_type": "string",
      "camera_angle": "string",
      "primary_character": "char_id",
      "location": "loc_id",
      "prompt_text": "THE FULL 11-BLOCK PROMPT STRING",
      "reference_images": {
        "character_refs": ["char_id"],
        "style_ref": true,
        "location_ref": "loc_id"
      }
    }

    Scenes to process: ${JSON.stringify(scenes)}`;

    let model = getTextModel();
    let url = `${BASE_URL_V1BETA}/${model}:generateContent`;
    let response;
    try {
      response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 65536 }
        })
      }, 3);
    } catch (err) {
      const fallbackModel = getImageModel(); // Use v1beta model for fallback
      if (err.status === 503 || err.status === 429 || err.name === 'AbortError') {
        console.warn(`Model ${model} unavailable during prompt generation. Falling back to ${fallbackModel} (Nano Banana 2)...`);
        const fallbackUrl = `${BASE_URL_V1BETA}/${fallbackModel}:generateContent`;
        response = await fetchWithRetry(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 65536 }
          })
        }, 5);
      } else {
        throw err;
      }
    }

    const respData = await response.json();
    reportUsage(respData);
    const text = respData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let cleanJson = text.trim();
    if (cleanJson.includes('```')) {
      const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanJson = match[1];
    }
    cleanJson = cleanJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    try {
      let parsed = JSON.parse(cleanJson);
      if (parsed.prompts && Array.isArray(parsed.prompts)) parsed = parsed.prompts;
      else if (parsed.scenes && Array.isArray(parsed.scenes)) parsed = parsed.scenes;
      else if (parsed.data && Array.isArray(parsed.data)) parsed = parsed.data;
      
      if (Array.isArray(parsed)) {
        // Validation: ensure each object has the minimum required fields
        return parsed.map(p => ({
          scene_id: p.scene_id || `scene_${String(p.scene_number || 0).padStart(3, '0')}`,
          scene_number: p.scene_number || 0,
          scene_title: p.scene_title || 'Sem título',
          duration_seconds: p.duration_seconds || 0,
          shot_type: p.shot_type || 'N/A',
          camera_angle: p.camera_angle || 'N/A',
          primary_character: p.primary_character || null,
          location: p.location || null,
          prompt_text: p.prompt_text || '',
          reference_images: p.reference_images || {}
        }));
      }
      return [];
    } catch (e) {
      console.warn('Primary JSON parse failed, trying fallback brackets...', e);
      const fallbackMatch = cleanJson.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (fallbackMatch) {
        try {
          return JSON.parse(fallbackMatch[0]);
        } catch (e2) {
          console.error('Final prompt parsing fallback failed', e2);
        }
      }
      throw e;
    }
  }

  // --- Generate Image ---
  async function generateImage(apiKey, model, prompt, referenceImages = [], config = {}) {
    const url = `${BASE_URL_V1BETA}/${model}:generateContent`;
    const parts = [];
    if (referenceImages) {
      for (const ref of referenceImages) {
        if (ref.data) {
          parts.push({ inlineData: { mimeType: ref.mimeType || 'image/png', data: ref.data } });
        }
      }
    }
    parts.push({ text: prompt });

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: config.aspectRatio, imageSize: config.resolution }
      }
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    reportUsage(data);
    const result = { image: null, text: null };

    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) result.image = { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
        if (part.text) result.text = part.text;
      }
    }

    if (!result.image) {
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') throw new Error('Image blocked by safety filter.');
      throw new Error('No image returned.');
    }

    return result;
  }

  let onTokenUsage = null;

  return { testConnection, analyzeScriptLight, analyzeScript, describeCharacterFromReference, generatePrompts, generateImage, set onTokenUsage(cb) { onTokenUsage = cb; }, get onTokenUsage() { return onTokenUsage; } };
})();
