# Advanced Prompt Engineering for Nano Banana Pro & Nano Banana 2
## A Production-Grade Research Report for 2D Animated Series Pipelines

***

## 1. EXECUTIVE SUMMARY

Nano Banana Pro (Gemini 3 Pro Image) and Nano Banana 2 (Gemini 3.1 Flash Image) are the two most capable native-multimodal image generation systems available for professional animation pipelines as of March 2026. Unlike diffusion-based models that treat prompts as weighted token bags, both Gemini image models process prompts through a deep multimodal reasoning pipeline that understands creative intent, narrative context, and spatial physics. This architectural difference is what makes them uniquely suitable for a production app targeting 2D animated series — and it changes how prompts must be written.[^1][^2][^3]

**The most important findings for this use case:**

1. **Character consistency depends on reference-first, not text-first workflows.** Uploading up to 5 reference images and explicitly stating identity-preservation instructions dramatically outperforms text-only description for face stability.[^4][^5]
2. **Multi-turn chat is the official recommended method for iterative generation.** It preserves visual context across generations within a session, functioning as a soft memory layer.[^6][^7]
3. **Nano Banana 2 is the superior choice for animation app iteration** at 95% of Pro's quality, with 3-5x speed advantage, Thinking Mode, and lower cost. Pro should be reserved for final hero frames.[^3][^1]
4. **The model responds to natural language narratives, not keyword stacks.** A descriptive paragraph beats a comma-separated list of adjectives every time.[^8]
5. **2D cel animation aesthetics require explicit anti-drift instructions** to prevent the model defaulting to concept art, storyboard sketch, or generic AI illustration texture.[^9][^10]
6. **Prompt architecture should be modular**: fixed blocks (CHARACTER_DNA, STYLE_CORE) combined with variable blocks (SHOT_DESIGN, ACTION, SCENE_CONTEXT) at runtime.
7. **Face drift is primarily caused by prompt variation, not just generation count.** Changing wording order, synonyms, or adding multiple simultaneous variables causes drift.[^11][^4]

***

## 2. SOURCE MAP

| Source | Type | Reliability (1–5) | Why It Matters | Consensus Position |
|---|---|---|---|---|
| ai.google.dev/gemini-api/docs/image-generation | Official Documentation | 5 | Definitive API spec, model limits, reference image caps, aspect ratios, resolution tiers | Primary reference |
| deepmind.google/models/gemini-image/pro | Official Product Page | 5 | Verified capabilities, Thinking Mode, subject consistency claims, up to 5 character refs | Supports community findings |
| developers.googleblog.com (Gemini 2.5 Flash Image prompting guide) | Official Developer Blog | 5 | Expert prompt templates, official style transfer techniques, character consistency guidelines | Core methodology |
| firebase.google.com/docs/ai-logic/generate-images-gemini | Official Firebase Docs | 5 | Multi-turn chat as recommended method (confirmed) | Supports multi-turn as primary strategy |
| tinystruggles.com (Storylearner pipeline) | Production Case Study | 4 | Real production pipeline, 100s of consistent images, identifies failure modes including long-session degradation | Partially complicates — warns about context limits |
| fal.ai/learn/tools/nano-banana-pro-vs-nano-banana-2 | Technical Comparison | 4 | Side-by-side tests, API schema parity, cost analysis, routing logic | Strongly supports NB2 for most use cases |
| useneospark.com (10-dimension review) | Independent Testing | 4 | Cross-validated test results, NB2 wins 9/10 dimensions, Pro wins high-speed action only | NB2 preferred for composition and multi-character |
| kartaca.com (Brand Storyboarding Blueprints) | Technical Blog | 4 | 8 production blueprints for mascot consistency with Gemini 3.1 Flash, referenceId system | Strongly supports structured DNA approach |
| github.com/ZeroLu/awesome-nanobanana-pro | Community Curation | 3 | 100+ battle-tested prompts, JSON prompting patterns, face preservation techniques | Community consensus on structured prompts |
| hyper.ai (Felt Robot narrative story) | Production Demo | 4 | Demonstrated multi-scene consistency from one reference, directed graph asset tracking | Supports reference-chain consistency system |
| neolemon.com (Art Style Guide) | Expert Blog | 4 | Style Stack system, Style Bible concept, 180+ copy-paste style tokens, separation of identity from scene | Strong consensus on modularity |
| hailuoai.video (Cinematic prompt engineering) | Expert Blog | 4 | Shot design before prompt, information density vs. prompt overload, three-point lighting in prompts | Complicates "longer is better" — warns against wall-of-adjectives |
| sparkco.ai (Character Consistency Guide) | Community Blog | 2 | Multi-turn editing, core feature locking; some statistics appear unverified | Supports official guidance directionally |
| reddit.com/r/GeminiAI and r/PromptEngineering | Community Forum | 2 | Anecdotal prompt patterns, seed behavior, experimental techniques | Corroborates official findings; some cargo-cult prompting present |
| arxiv.org/html/2502.07802 (Movie Weaver) | Academic Research | 4 | Anchored prompts / concept embeddings as anchor tokens for multi-concept generation | Experimental — supports identity anchor direction |
| arxiv.org/html/2404.18919 (TheaterGen) | Academic Research | 3 | LLM-managed character management for multi-turn generation | Experimental — relevant to app architecture |

***

## 3. VERIFIED FINDINGS

These findings are supported by at least two independent high-reliability sources.

### A. Prompt Language and Model Behavior

**F1. Natural language paragraphs outperform keyword stacks.**
The official Gemini developer blog states the model's "core strength is its deep language understanding" and that "a narrative, descriptive paragraph will almost always produce a better, more coherent image than a simple list of disconnected words." This is confirmed by the fal.ai architecture analysis: "Both models understand creative intent, not just keywords. Tell either one '1960s aesthetic', and it'll make choices about film grain, desaturated color palettes, and period-appropriate composition without you specifying those details."[^8][^1]

**F2. Longer prompts are not always better — information density matters.**
The hailuoai.video expert guide specifically warns against "wall of adjectives" prompts: "dozens of camera, lighting, and style tokens packed into one line cause models to average out conflicting instructions, producing fuzzy intent." The practical recommendation is to prioritize two or three specific cinematic cues. This is consistent with neolemon.com's finding that limiting the style stack to 5–7 tokens beats over-specified prompts.[^12][^9]

**F3. Multi-turn chat is the officially recommended method for iteration.**
Both Firebase docs and the main Google AI developer documentation explicitly state: "Chat or multi-turn conversation is the recommended way to iterate on images." The tinystruggles.com production pipeline independently confirmed that persistent chat sessions help maintain consistency within a generation set.[^13][^7][^4]

**F4. Seeds behave counterintuitively with reference images.**
The tinystruggles.com production report found that when using a reference image with a similar prompt, using the same seed as the reference generation can cause over-rigid locked results. The recommendation: change seed or do not set it when using reference images.[^4]

**F5. The model supports up to 14 reference images total.**
Official API documentation confirms: Nano Banana Pro supports up to 5 character references + up to 6 object references (total 14). Nano Banana 2 supports up to 4 character references + up to 10 object references (total 14).[^7][^1]

### B. Character Consistency

**F6. Reference-image anchoring dramatically outperforms text-only description.**
The hyper.ai felt-robot production study demonstrated that "the key to consistency was the use of explicit image references in prompts" with explicit wording like "Image 1: Robot character sheet" and "Image 2: Previous scene." The tinystruggles.com pipeline independently found that the reference image approach is "the most reliable method for maintaining character consistency."[^5][^4]

**F7. Identity drift is primarily caused by prompt variation, not generation count alone.**
The tinystruggles.com study found that "small prompt variations can dramatically alter the output" even with the same seed, and that "slightly altered prompt + same seed = often produces a different character entirely." This means word-for-word repetition of character description is more important than it appears.[^4]

**F8. Character DNA must be restated verbatim in every prompt.**
Both neolemon.com's systematic analysis and the kartaca.com blueprint framework independently conclude that AI models have zero memory of prior generations — the complete character description must be repeated in full every time.[^14][^9]

**F9. Face drift increases with multiple simultaneous variable changes.**
The sparkco.ai research found that 72% of users experienced character drift after more than three edits. The hailuoai.video expert guide confirms: "Adjust one axis per iteration — motion, lighting, or framing — not all at once."[^12][^11]

### C. Style and Rendering

**F10. Detailed style specifications outperform style name shortcuts.**
The tinystruggles.com production guide explicitly found that "detailed, specific style descriptions work better than simple style names." The neolemon.com analysis confirms that "fewer, more specific tokens beat more, vague tokens every time" and that style keywords modify four types of statistical patterns: medium patterns, rendering patterns, design language, and camera/lighting patterns.[^9][^4]

**F11. Semantic negative prompts (positive framing of what to avoid) work better than explicit exclusions.**
The official Google developer guide recommends: "Instead of saying 'no cars,' describe the desired scene positively: 'an empty, deserted street with no signs of traffic.'" However, technical exclusion lists for specific artifacts remain useful as supplemental constraints.[^15][^8]

***

## 4. COMMUNITY CONSENSUS FINDINGS

These tactics are strongly repeated across credible community discussions and independently verified in multiple sources, but not explicitly confirmed in official documentation.

**C1. JSON-structured prompts provide greater control over identity preservation.**
Across GitHub repos and community examples, JSON-formatted prompts with explicit named fields ("face.preserve_original: true", "hair.color", "clothing.fit") appear in the majority of expert-level face-preservation prompts. These explicit field names communicate intent more precisely than narrative descriptions alone for specific anatomical features.[^16]

**C2. Face preservation explicit commands are widely used and appear effective.**
Phrases like "Keep the facial features of the person in the uploaded image exactly consistent," "do not change the face," and "preserve the original face with 100% accuracy" appear in virtually all high-quality face-consistent prompt examples in the community. The phrasing is direct, not subtle.[^16]

**C3. The 360° character turnaround sheet as first step is considered best practice.**
Multiple sources — kartaca.com, hyper.ai, and community workflows — independently conclude that generating a front/side/back/close-up character sheet before any scene generation is essential. This "Master Reference" then becomes the anchor for all subsequent generations.[^5][^14]

**C4. referenceId notation helps prevent character identity blending in multi-character scenes.**
The kartaca.com framework introduces `[referenceId: 1]`, `[referenceId: 2]` notation in prompts to explicitly signal which reference image corresponds to which character, "ensuring their facial features and textures do not bleed into one another." This appears to be a community-discovered tactic rather than an official API feature.[^14]

**C5. Cinematic language is more effective than casual descriptions.**
Venice.ai and hailuoai.video both document that professional cinematography terms ("35mm lens", "shallow depth of field", "Dutch angle", "over-the-shoulder shot", "medium tracking shot") produce dramatically more controlled compositions than casual descriptions like "wide photo of a woman." The venice.ai analysis states: "AI models respond best to professional filmmaking language, not everyday descriptions."[^17][^12]

**C6. Limiting style tokens to 5–7 per prompt reduces style drift.**
Neolemon.com's systematic analysis found that "more style words = more style soup = more drift" and recommends capping the style stack at 5–7 tokens maximum. This is corroborated by the hailuoai.video guide warning against conflicting instructions.[^12][^9]

***

## 5. WEAK SIGNAL / EXPERIMENTAL TACTICS

These are interesting but weakly verified — worth testing, but treat as hypotheses.

**W1. Gemini Gem (system prompt container) for character DNA.**
Community workflow documented on YouTube suggests using a Gemini Gem with a pre-loaded character JSON as a persistent system context, turning the image generation prompt into a shorter instruction that references the Gem rather than restating DNA inline. This is architecturally interesting for an app but not confirmed by official sources.[^18]

**W2. Face Mesh control images for anatomy-locked pose variation.**
The kartaca.com blueprint references a `REFERENCE_TYPE_CONTROL` face mesh input to guide bone structure during high-intensity poses without losing facial identity. This appears to be a Vertex AI feature not documented in standard Gemini API reference, and its availability through the standard API is unconfirmed.[^14]

**W3. "Contextual Description Persistence" reduces drift in long sequences.**
Kartaca.com's framework recommends repeating the character's name and distinctive traits in every frame prompt to "reinforce the model's memory of the referenceId" over long sequences. This is directionally consistent with verified findings but the specific phrasing strategy is untested independently.[^14]

**W4. Asset graph tracking for reproducibility.**
The hyper.ai production study built a directed graph tracking how each image was generated from its predecessors, enabling automated pipeline reproducibility. This is an architectural approach rather than a prompting tactic, but highly relevant to the app design.[^5]

**W5. Style reference image as separate slot from character reference image.**
Community practice suggests treating style references and character identity references as distinct input slots, ordering them: [style_ref] → [character_ref] → [scene_ref] → [prompt text]. The ordering of multi-image inputs appears to affect which image's properties dominate, but this is not officially documented.

***

## 6. FALSE OR MISLEADING ADVICE

**M1. "More description always leads to better images."**
Contradicted by both official and expert sources. Conflicting or over-specified prompts cause averaging. Prioritize two to three concrete cinematic cues over exhaustive noun lists.[^8][^12]

**M2. "Using the same seed guarantees consistency with reference images."**
False in the Gemini architecture. Seeds can cause over-rigid locking when combined with reference images and similar prompts, producing worse results than no seed. The tinystruggles.com production pipeline explicitly warns against this.[^4]

**M3. "You can maintain a character across hundreds of images in a single chat session."**
Overstated. Long chat sessions degrade and can insert visual elements from earlier generations into later outputs ("object bleeding"). The tinystruggles.com report notes: "it often works until a point, and at some point it fails poorly." Production pipelines need session reset strategies.[^4]

**M4. "The word 'cinematic' is enough to create cinematic compositions."**
Cargo-cult prompting. "Cinematic" alone is a vague modifier that produces inconsistent results. Venice.ai explicitly states: "Treating 'cinematic' as a combination of motion, framing, color, and lighting, not a single adjective" is the correct approach.[^17]

**M5. "Negative prompts should list everything you don't want."**
Overloaded negative prompts fragment attention like overloaded positive prompts do. LTX Studio's guide recommends building modular, project-specific negative prompt lists rather than exhaustive catch-all lists.[^15]

**M6. "Nano Banana Pro is always better than Nano Banana 2."**
False for this use case. Independent 10-dimension testing shows NB2 wins 9/10 dimensions including composition balance, multi-person scene handling, and text rendering. Pro only wins in high-speed action photography.[^3]

***

## 7. PROMPT ENGINEERING PRINCIPLES

The following rules are derived from verified findings and cross-validated across sources.

### Core Principles

**P1: Write narrative paragraphs, not keyword lists.**
Describe the scene as a film director briefing a cinematographer. Use active voice and physical specificity.[^8]

**P2: Separate what must never change (identity + style) from what is allowed to change (pose + angle + scene + mood).**
This is the fundamental architecture principle. The neolemon.com framework calls this "separation of identity from scene."[^9]

**P3: Repeat character DNA verbatim in every single prompt.**
Every generation is a stateless fresh start. There is no memory. Full character description must be present in every call.[^14][^4]

**P4: Change only one variable per iteration.**
Changing angle + outfit + expression + pose simultaneously multiplies drift probability. Lock all other variables, change one.[^11][^12]

**P5: Use reference images as anchors, not descriptions.**
A good reference image is worth more than 200 words of text description for face stability. Upload reference + add explicit preservation instruction.[^5][^4]

**P6: Write style as a Style Stack, not a style name.**
Layer: Format → Medium → Linework → Shading → Color Palette → Texture → Lighting → Composition.[^9]

**P7: Use cinematography language, not casual language.**
"Medium shot from low angle, 35mm lens, Dutch tilt 15°, shallow depth of field" outperforms "cool photo from below."[^17][^12]

**P8: Provide context and purpose in the prompt.**
"Create a dramatic animation frame for a 2D series in 1990s TV style" yields better results than "create an animation frame."[^8]

**P9: Use semantic negative framing for large exclusions.**
"An empty rural road with no vehicles or people" is better than "no cars, no people."[^8]

**P10: Use explicit negative constraints for technical artifacts.**
Direct exclusions work best for specific artifact types: "no storyboard look", "no concept art sketching", "no rough linework."[^15]

**P11: Route by task: NB2 for iteration and exploration, Pro for final hero frames.**
Both share the same API schema; routing is a one-line endpoint change.[^1]

**P12: Use Thinking Mode on NB2 — set to Dynamic for animation scenes.**
Dynamic mode automatically adjusts reasoning depth based on prompt complexity, balancing speed and quality without manual selection.[^2][^1]

***

## 8. PROMPT FORMULAS

### 8.1 Universal Master Prompt Structure

```
[SHOT TYPE + CAMERA ANGLE] of [CHARACTER DNA — inline], [ACTION/POSE].
[SCENE CONTEXT: location, time of day, atmosphere].
[RENDERING LANGUAGE: 2D animation style stack].
[LIGHTING: key + fill + rim described physically].
[COMPOSITION: specific framing, depth, negative space].
[CONTINUITY LOCK: "The character must match the reference image exactly"].
[RENDERING QUALITY: resolution, aspect ratio].
```

**Example:**
```
A low-angle medium shot of MARA — a 17-year-old girl with asymmetric short black hair with a red streak on the right side, round amber eyes, small upturned nose, pale skin with a single cheek freckle, wearing a yellow hooded jacket with a broken zipper, dark cargo pants — standing at the edge of a rain-soaked rooftop at dusk. The city glows below her in amber and neon blue. Render in clean 2D cel animation style: crisp ink outlines, flat cel shading, two-tone shadows, limited warm palette, no texture noise, matte color fills. Soft diffused key light from city glow below, cool blue backlight from overcast sky, no specular highlights. Rule of thirds framing, figure left of center, vast empty sky in negative space to the right. The character's face, hair, and jacket must exactly match the attached reference image. 2K resolution, 16:9.
```

### 8.2 Character Consistency Prompt

```
[referenceId: 1] Using the attached character reference image as the identity anchor, generate [scene description].
IDENTITY LOCK — preserve exactly:
- Face shape: [e.g., heart-shaped, soft jaw]
- Eyes: [e.g., round amber, heavy upper lash, inner corner highlight]
- Hair: [e.g., asymmetric bob, black with red streak right side, textured ends]
- Skin: [e.g., cool-toned pale with single right cheek freckle]
- Signature outfit: [e.g., yellow hooded jacket, broken center zipper, dark cargo pants]
- Body proportions: [e.g., slight frame, head slightly large relative to body]
CHANGE ONLY: [pose / expression / angle / scene — state exactly one]
Style: [STYLE_CORE].
```

### 8.3 Real-Photo-to-2D-Style Prompt

```
Transform the reference photo of a real person into the established 2D animation style.
IDENTITY: Preserve the person's facial identity — their specific face shape, eye set, nose shape, jawline, and hair style and color — translated into stylized form. Do NOT preserve photographic realism. Do NOT preserve skin texture, photographic bokeh, or camera grain. 
STYLE TRANSLATION: Render the face using [style: crisp ink outline, flat cel shading, two-tone shadows, limited palette, clean matte fills]. Simplify facial geometry to match the animation's art style while keeping the person recognizably them.
COSTUME: [Describe animation-world costume].
SCENE: [Describe animation-world setting].
Style: [STYLE_CORE].
```

### 8.4 Angle Variation Prompt

```
[referenceId: 1] The SAME character from the attached reference image, now shown from [new camera angle].
LOCKED: Face, hair, outfit, body proportions, color palette, art style — all identical to reference.
CHANGED: Camera angle only → [e.g., 3/4 rear view, slight high angle, slight upward tilt].
The character is [same action/neutral pose as reference].
Do not modify facial features, hair style, clothing, or color palette.
Render in [STYLE_CORE].
[LIGHTING_BLOCK].
[COMPOSITION_BLOCK].
```

### 8.5 Cinematic Composition Prompt

```
[SHOT TYPE]: [e.g., extreme wide establishing shot / over-the-shoulder medium / Dutch angle low shot]
[LENS]: [e.g., 24mm wide angle / 85mm portrait / fisheye]
[COMPOSITION RULE]: [e.g., rule of thirds / leading lines / foreground occlusion / negative space / asymmetric framing]
[DEPTH]: [e.g., foreground element in soft focus, character in middle ground in sharp focus, layered deep background]
[CHARACTER PLACEMENT]: [e.g., subject positioned at left golden mean intersection, face in upper third, body leading into frame]
The composition should feel like a deliberate film frame, NOT a centered default AI composition.
[CHARACTER DNA].
[SCENE CONTEXT].
[STYLE_CORE].
```

### 8.6 High-Fidelity Facial Preservation Prompt

```
Portrait of [CHARACTER NAME] using [referenceId: 1] as identity anchor.
FACE — preserve with absolute fidelity:
• Eye shape, iris color, pupil size, lash style
• Exact nose shape: [e.g., small button, slightly upturned]
• Mouth: [e.g., thin upper lip, full lower lip, slight resting smile]
• Jaw and cheekbone structure: [e.g., soft angular jaw, high cheekbones]
• Hairline and hair mass: [e.g., center part, falls to chin, slight wave]
• Any distinctive marks: [e.g., mole left cheek, scar right eyebrow]
DO NOT alter the face for aesthetic reasons. DO NOT smooth asymmetries. DO NOT default to generic AI face.
Expression: [e.g., quiet determination, slight frown, looking camera-right]
Render: [STYLE_CORE]. [LIGHTING_BLOCK]. Resolution: 2K.
```

### 8.7 Negative Prompt Block

```
NOT: storyboard sketch, rough draft, production notes, panel borders, frame labels, pencil annotations.
NOT: concept art rendering, character design sheet, turnaround overlay, technical callouts.
NOT: generic AI face, default AI illustration texture, oversaturated colors, plastic skin, AI glow.
NOT: photorealistic skin pores, bokeh photography, camera grain, HDR photography look.
NOT: 3D render, CGI shading, volumetric 3D light, rounded 3D normal maps.
NOT: comic book panels, manga screentone dots, graphic novel borders.
NOT: multiple face versions, off-model face, identity drift, blended character features.
NOT: centered symmetrical composition, floating subject on blank background.
NOT: extra limbs, deformed hands, wrong proportions, inconsistent anatomy.
```

### 8.8 Environment Consistency Block

```
SCENE: [Location name, a single descriptive phrase, e.g., "rain-soaked downtown alley, late night"]
PALETTE: [e.g., dominant warm amber street glow, secondary cool desaturated blues in shadow]
LIGHTING LOGIC: [e.g., primary light source is neon signs at street level, fills from below; secondary diffuse overcast sky from above]
TIME + ATMOSPHERE: [e.g., post-rain wet asphalt, steam rising, distant city noise implied through visual depth]
STYLE: The background must read as a painted animation background plate, NOT a photo, NOT a 3D render, NOT a stock background.
Soft detail gradient from foreground (detailed) to background (simplified silhouettes).
```

### 8.9 Style Anchor Block (STYLE_CORE)

```
STYLE_CORE:
Hand-drawn 2D cel animation style.
Clean crisp ink outlines with moderate line weight variation (thicker on outer silhouette, thinner on interior detail).
Flat cel shading with exactly two shadow tones (midtone + shadow, no gradient blending).
Matte flat color fills — no texture noise, no digital grain, no watercolor bleed.
Limited color palette: [e.g., 6–8 colors total per scene, no oversaturation].
Painted animation background plate for environment, NOT photo-textured.
Final frame must look like a production cel from a 2D animated TV series — NOT a storyboard, NOT a character design sheet, NOT a concept art render, NOT a comic panel, NOT a 3D render.
```

### 8.10 Anti-Generic-AI-Look Block

```
The output must NOT exhibit any of the following AI generation artifacts:
- Generic centered floating-subject composition
- Oversaturated "AI vibrant" color handling  
- Plastic smooth skin texture with AI-typical rim glow
- Default AI face with symmetrical doe eyes and generic beauty
- Blurred or muddy backgrounds with no readable depth layers
- Inconsistent line weight or ink line quality
- Over-rendered texture noise on flat surfaces
The frame must look intentionally art-directed: asymmetric composition, purposeful negative space, controlled color temperature per lighting logic, readable silhouette at any scale.
```

***

## 9. APP-SAFE MODULAR PROMPT ARCHITECTURE

The following block system forms the internal prompt engine of the production app.

### BLOCK 1: STYLE_CORE

**Purpose:** Defines the locked visual language of the animated series — the aesthetic bible translated to prompt form.

**When to use:** In every single prompt, without exception. This is the global style anchor.

**Example contents:**
```
2D cel animation style, clean ink outline, flat cel shading, two-tone shadows, matte color fills, limited palette, painted background plate, hand-drawn animated series frame aesthetic.
```

**Common mistakes:**
- Mixing incompatible style tokens (e.g., "watercolor" + "cel shading" + "3D render" = style soup)
- Changing synonym wording between prompts (use exact same string every time)
- Using only a style name ("Ghibli") instead of describing the actual style attributes

***

### BLOCK 2: CHARACTER_IDENTITY_CORE

**Purpose:** The canonical description of who this character is, at the level of geometry, color, and key visual markers.

**When to use:** Fully included in every prompt involving this character.

**Example structure:**
```
CHARACTER [NAME]:
• Age/build: [17-year-old, slight frame, head-to-body ratio slightly larger than realistic]
• Face geometry: [heart-shaped face, soft angular jaw, high subtle cheekbones]
• Eyes: [round amber iris, heavy upper lash, subtle inner corner highlight dot]
• Nose: [small, slightly upturned button nose]
• Mouth: [thin upper lip, full lower lip, slight natural resting upturn]
• Hair: [asymmetric bob, black with a red streak on the right side, textured blunt cut]
• Skin: [cool-toned pale, single freckle right cheek, no other markings]
• Signature outfit: [yellow hooded jacket, broken center zipper, collar tag visible, dark cargo pants with right-side buckle strap]
• Footwear: [worn white canvas sneakers, left toe scuff]
• NEVER CHANGE: eye shape, face geometry, hair silhouette, jacket color, cheek freckle
```

**Common mistakes:**
- Using vague descriptors like "cute face" or "stylish clothes"
- Omitting identity-critical details (it only takes one missing marker for drift)
- Phrasing in negatives: "no beard" instead of "clean-shaven"

***

### BLOCK 3: CHARACTER_INVARIANTS

**Purpose:** A compact "must never change" lock repeated at the end of prompts containing CHARACTER_IDENTITY_CORE. Acts as a reinforcing explicit instruction.

**When to use:** End of every character-containing prompt.

**Example:**
```
INVARIANTS — must match reference exactly:
• Amber round eyes, heavy upper lash
• Asymmetric black bob with right-side red streak
• Single right-cheek freckle
• Yellow hooded jacket, broken center zipper
• The character must not appear older/younger, heavier/lighter, or more conventionally attractive.
• Do not alter any of these features for aesthetic or compositional reasons.
```

**Common mistakes:**
- Writing invariants only at the beginning (reinforcing at the end increases compliance)
- Including too many invariants (5 max; prioritize the most identity-critical)

***

### BLOCK 4: SCENE_CONTEXT

**Purpose:** Establishes the location, time, atmosphere, and narrative context of the scene.

**When to use:** Every generation except pure character sheet / turnaround passes.

**Example:**
```
SCENE: Interior of an abandoned subway car, late night.
ATMOSPHERE: Dim flickering overhead fluorescents casting cool blue-white light, warm amber emergency lighting strips along the floor. Graffiti on corrugated metal walls. Sense of isolation and quiet tension.
PALETTE: Dominant desaturated cool blues and greys, accent warm ambers and rust tones, single red accent element.
TIME: Deep night, no exterior light.
```

**Common mistakes:**
- Leaving the scene context generic ("a room", "outside")
- Overloading with too many atmosphere words — pick 3–5 strong descriptors

***

### BLOCK 5: SHOT_DESIGN

**Purpose:** Defines the type of shot, narrative function, and what must be visible/readable.

**When to use:** Every generation. Shot type determines all other blocks' weights.

**Example:**
```
SHOT TYPE: Over-the-shoulder dialogue shot
NARRATIVE FUNCTION: Character A is confronting Character B — reveal Character A's emotional state
REQUIRED VISIBILITY: Character A's shoulder/back in foreground (silhouette only, partial), Character B's face in middle ground, background environment implied but simplified
FOCAL CHARACTER: Character B (face must be fully on-model, expression readable)
EMOTIONAL REGISTER: Confrontation — Character B's expression: defensive, slightly afraid
```

**Common mistakes:**
- Selecting a shot type without defining what must be visible and what can be abstracted
- Not specifying which character carries the emotional content of the frame

***

### BLOCK 6: CAMERA_AND_STAGING

**Purpose:** Defines exact camera position, lens choice, depth of field, and character staging within the frame.

**When to use:** Every generation.

**Example:**
```
CAMERA: Over-the-shoulder, slightly behind and above Character A (left of frame), aimed at Character B.
LENS: 50mm moderate — no extreme distortion, natural perspective.
ANGLE: Slight low angle on Character B to create mild sense of power reversal.
DEPTH OF FIELD: Character A (foreground silhouette): slightly soft. Character B (middle ground face): sharp focus. Background: simplified and out of focus.
FRAMING: Character B at right-of-center, rule of thirds. Character A's shoulder/back occupies lower-left quadrant. Large negative space upper left.
DEPTH: Foreground (silhouette) → mid (face, sharp) → background (simplified painted plate, 3 depth planes).
```

**Common mistakes:**
- Not specifying foreground/background depth layers (leads to flat centered default compositions)
- Using "close-up" without specifying what is close-up (face? upper body? hands?)

***

### BLOCK 7: RENDERING_LANGUAGE

**Purpose:** Explicitly describes the visual rendering system beyond just the style name — linework quality, shading type, color application, finish.

**When to use:** Every generation (can be part of STYLE_CORE if identical across the project).

**Example:**
```
LINEWORK: Crisp ink outline with variable weight — thicker outer silhouette (~2pt), thinner interior construction lines (~0.75pt). NO rough sketch texture, NO jittery lines.
SHADING: Flat cel shading, two tones only (midtone fill + one shadow, no gradients). Shadow shapes are hard-edged, not soft-blurred.
COLORS: Matte flat fills only. No digital texture noise. No glossy highlights unless contextually justified (e.g., glass surface). Colors from pre-established series palette only.
FINISH: Hand-drawn animated series production frame. Looks like a final composite cel with painted background plate. NOT a storyboard, NOT a sketch, NOT concept art.
```

***

### BLOCK 8: NEGATIVE_CONSTRAINTS

**Purpose:** Prevents the model's default tendencies from overriding the desired output.

**When to use:** Every generation.

**Taxonomy of constraints (add/remove by shot type):**

```
ANTI-STORYBOARD: [no rough sketch lines, no draft annotation, no panel borders]
ANTI-AI-LOOK: [no generic AI composition, no AI glow, no plastic texture, no oversaturated digital noise]
ANTI-REALISM: [no photographic skin, no camera bokeh, no grain, no HDR]
ANTI-3D: [no 3D rendering shading, no normal maps, no volumetric light beams]
ANTI-COMIC: [no speech bubble, no panel border, no screentone dots, no manga grid]
ANTI-DRIFT: [no identity alteration, no merged faces, no off-model features]
ANTI-DEFAULT-FRAMING: [no centered symmetrical composition, no floating figure on blank BG]
ANTI-ANATOMY: [no extra fingers, no deformed hands, no wrong body proportions]
```

***

### BLOCK 9: REFERENCE_INTERPRETATION_RULES

**Purpose:** Explicitly tells the model how to use the attached reference images, since the model's interpretation differs by reference type.

**When to use:** Any generation using attached reference images.

**Example for character reference:**
```
REFERENCE USAGE:
[Image 1] = CHARACTER IDENTITY REFERENCE. Use this image to match: face geometry, hair style, skin tone, eye shape, outfit design. DO NOT copy the pose, camera angle, or background from this reference.
[Image 2] = STYLE REFERENCE. Use this image to match: art style, line quality, color treatment, shading approach. DO NOT copy any character features from this image.
[Image 3] = SCENE REFERENCE. Use this image for: location, background design, lighting setup. DO NOT copy any character features from this image.
```

**Common mistakes:**
- Not specifying which image is which reference type (the model may copy pose from a character reference)
- Uploading references without instructions (the model may treat a style reference as a character reference)

***

### BLOCK 10: CONTINUITY_LOCKS

**Purpose:** Explicit statements of what must remain constant across this generation and all future generations in the same scene or sequence.

**When to use:** Long sequences, action sequences, multi-angle explorations.

**Example:**
```
CONTINUITY:
• Time of day: deep night (no daylight, no sunrise/sunset transition)
• Lighting setup: cool fluorescent overhead + warm amber floor strips — do not change direction or color temperature
• Weather/environment: dry interior (no rain, no atmospheric haze)
• Character outfit: yellow jacket MUST remain yellow, cargo pants MUST remain dark — do not recolor
• Character physical state: [e.g., no injuries, neutral resting posture not affected by previous actions]
```

***

### BLOCK 11: VARIATION_RULES

**Purpose:** Defines the envelope of allowed variation for this prompt — what CAN change.

**When to use:** Turnaround sessions, angle exploration, expression sheets.

**Example:**
```
ALLOWED VARIATION:
• Camera angle: any angle except front-facing full portrait (see other prompt slot)
• Character expression: may vary — current expression target: [describe]
• Background detail level: may simplify or elaborate — maintain SCENE palette and lighting logic
• Pose: may change — maintain overall body proportions and outfit
LOCKED (do not vary): face identity, hair silhouette, outfit colors, art style, line quality
```

***

## 10. SHOT TAXONOMY FOR THE APP

### Tier 1: Character-Centric Shots

| Shot Type | Camera Distance | Camera Angle | Primary Use | Key Prompt Instructions |
|---|---|---|---|---|
| **Extreme Close-Up (ECU)** | Face only / eyes + forehead | Eye level or slight tilt | Emotional apex, reaction | Face lock is critical; specify exact expression zone; remove all body; background abstracted to color only |
| **Close-Up (CU)** | Head and upper shoulders | Eye level to slight low | Dialogue, reaction, emphasis | Full face + hair silhouette visible; CHARACTER_INVARIANTS on max; maintain neck/shoulder proportions |
| **Medium Close-Up (MCU)** | Mid-chest to top of head | Eye level | Primary dialogue shot | Upper torso + face; costume visible as identity marker; moderate depth |
| **Medium Shot (MS)** | Waist to head | Eye level | Standard narrative shot | Body language + face; outfit fully visible; environment begins to matter |
| **Medium Wide (MW)** | Thighs to head | Eye level to slight high | Action with context | Character proportion lock + body language; environment present but secondary |
| **Wide Shot (WS)** | Full body with space above/below | Eye level to low angle | Establishing character in space | Body proportions readable; face simplified but on-model; environment prominent |

### Tier 2: Composition-Driven Shots

| Shot Type | Definition | Key Prompt Instructions |
|---|---|---|
| **Over-the-Shoulder (OTS)** | Camera behind Character A, shooting Character B | "[Char A] seen from behind, shoulder/head as foreground silhouette, partial. [Char B] in middle ground, face fully visible. Slight low angle on [Char B]. 50mm lens." |
| **Dutch Angle** | Camera tilted 15–45° on z-axis | "Camera tilted [15/30/45]° Dutch angle. Subject remains upright — camera is tilted, not subject. Tension and instability implied. Same lighting logic." |
| **High Angle** | Camera above subject, looking down | "Bird's eye perspective at [30/45/60]° down angle. Character appears smaller, more vulnerable. Background occupies upper portion of frame." |
| **Low Angle / Worm's Eye** | Camera below subject, looking up | "Low angle looking up at [character]. Makes subject appear powerful, imposing. Sky or ceiling visible. Slight fisheye distortion acceptable." |
| **Asymmetric Framing** | Subject off-center with strong negative space | "Subject positioned at far right/left of frame. [%] of frame is negative space on opposite side. The negative space should have [reason: implied off-screen presence / vastness / isolation]." |
| **Foreground Occlusion** | Object in very near foreground partially obscures view | "Foreground element [describe: e.g., a bent metal bar, a leaf, a window frame edge] in extreme close-up and slight blur at frame edge, partially obscuring the character in middle ground. Creates depth and discovered viewpoint." |
| **Two-Shot** | Two characters sharing frame | "Medium shot of both [Char A] and [Char B] in frame simultaneously. [Char A] left, [Char B] right. Space between them expresses [tension/closeness]. Both faces must be on-model." |

### Tier 3: Environmental Shots

| Shot Type | Definition | Prompt Focus |
|---|---|---|
| **Establishing Shot** | Wide scene-setting frame | "Wide establishing shot of [location]. No character required. Background design must match the series' painted plate style. Deep depth with 3 readable planes." |
| **Insert Shot** | Extreme close-up of an object | "Extreme close-up of [object]. No character visible. Object must match established series style. Tell a story through the object alone." |
| **Environment Only / Background Plate** | Scene with no characters | "A painted 2D animation background plate of [location]. No characters. Painterly depth. Far background simplified to silhouettes. Style matches [STYLE_CORE]." |
| **Crowd/Public Space** | Character in populated environment | "Character [NAME] visible in mid-ground, surrounded by [crowd/environment]. Character on-model. Crowd characters simplified to stylized silhouettes, not detailed faces." |

***

## 11. CHARACTER CONSISTENCY SYSTEM

### Phase 1: Character Bible Creation

Before any scene generation, create the Character Bible — a set of canonical assets stored in the app.

**Required assets:**
1. **Master Character Reference Sheet** — a single generated image showing front / 3/4 / profile / back views of the character at medium shot, neutral pose, uniform lighting, clean white or neutral grey background.[^14]
2. **Expression Sheet** — 6–8 expressions from the same front view: neutral, happy, sad, surprised, angry, concentrated, smiling, afraid.
3. **Costume Variation Sheet** (if applicable) — alternate outfits each with a clear annotation block.
4. **Close-Up Face Reference** — extreme close-up of the face, emphasizing eye, nose, and mouth geometry.

**Character DNA Block** — a text database entry with all fields filled (see BLOCK 2 above).

### Phase 2: Reference Pack Per Character

For each scene generation, the app assembles a Reference Pack from stored assets:

```
REFERENCE PACK COMPOSITION:
Slot 1: Master Reference Sheet (identity anchor)
Slot 2: Expression / emotion reference closest to target emotion (optional)
Slot 3: Style reference (for new art direction or style drift correction)
Maximum 3 image slots per single character in standard mode
```

### Phase 3: Generation Routing Logic

```
IF: New scene, same character, same angle family → use Slot 1 (character reference) + STYLE_CORE + SHOT_DESIGN
IF: New angle exploration → use Slot 1 + CAMERA_AND_STAGING with VARIATION_RULES specifying angle only
IF: Two characters in same scene → use Slot 1 (Char A) + Slot 2 (Char B) + [referenceId] notation
IF: Character has drifted (face off-model) → restart with fresh chat session, use Master Reference as Slot 1, add IDENTITY CORRECTION instruction
IF: Style has drifted → inject STYLE_CORE block explicitly, add Anti-Generic-AI-Look block
```

### Phase 4: Drift Detection and Recovery

**Session reset triggers:**
- Face proportions visibly wrong (eyes too close/far, nose enlarged/diminished)
- Hair silhouette has changed
- Outfit colors have shifted
- Art style has moved toward concept art or storyboard sketch

**Recovery protocol:**
1. Close current chat session
2. Open new session
3. Start with Character Reference Sheet as Slot 1 image
4. Inject full CHARACTER_IDENTITY_CORE + INVARIANTS
5. Add explicit "IDENTITY CORRECTION" instruction: "Previous generation drifted from the reference. This generation must re-anchor to the attached reference image exactly."

***

## 12. NEGATIVE PROMPT LIBRARY

### Library A: Anti-Storyboard

```
no rough pencil draft, no production sketch marks, no panel borders, no frame annotation, no draft lines, no loose unfinished linework, no note callouts, no storyboard grid, no thumbnail quality, no animation rough pass
```

### Library B: Anti-Generic-AI-Look

```
no AI illustration glow, no AI-typical oversaturation, no AI plastic skin smoothing, no generic AI beauty face, no floating subject on empty background, no centered symmetrical default composition, no diffusion model texture artifact, no unnatural synthetic sheen
```

### Library C: Anti-Photorealism

```
no photographic realism, no skin pore texture, no camera lens bokeh, no DSLR grain, no HDR look, no photorealistic material rendering, no photo-composited elements, no stock photo background
```

### Library D: Anti-3D

```
no 3D render shading, no Pixar/CGI look, no subsurface scattering glow, no normal map highlights, no ambient occlusion shadows, no volumetric 3D light shaft, no 3D cel shader (target is 2D drawn, not 3D toon-shaded)
```

### Library E: Anti-Comic/Manga

```
no speech bubble, no thought cloud, no action lines, no manga screentone dots, no panel border, no comic grid, no speedlines, no halftone printing artifact, no manga motion blur frame, no bande dessinée panel
```

### Library F: Anti-Face-Drift

```
no off-model face, no identity alteration, no merged character features, no blended identity, no composite face, no generic anime face replacing character identity, no symmetry correction distorting natural asymmetries, no beauty smoothing that changes facial structure
```

### Library G: Anti-Bad-Anatomy

```
no extra fingers, no deformed hands, no malformed wrists, no extra limbs, no fused limbs, no wrong body proportions, no floating body parts, no disconnected silhouette, no anatomy inconsistency between arms
```

### Library H: Anti-Muddy-Background

```
no blurry undefined background, no muddy texture fill, no undefined depth planes, no solid color wash background, no photographic background mixed with illustrated foreground
```

### Library I: Anti-Over-Rendering

```
no excessive detail noise, no overworked texture, no maximum-detail-everywhere approach, no information overload composition, no equal visual weight on all elements — foreground should be most detailed, background least
```

### Library J: Anti-Random-Costume-Drift

```
no costume color change, no outfit element modification, no outfit simplification or elaboration not in brief, no fashion style substitution, no seasonal outfit interpretation without instruction
```

***

## 13. BEST PRACTICES FOR REFERENCE ATTACHMENTS

The behavior of reference images varies significantly depending on the reference type. The app must handle each differently.[^4][^8]

### 13.1 Real Photo as Character Reference

**Goal:** Preserve identity, translate into animation style.

**Prompting approach:**
```
The attached image is a real photograph. Use it to extract the person's facial identity — face geometry, eye shape and color, nose shape, jawline, hair silhouette and color. Do NOT preserve photographic realism. Do NOT reproduce photographic lighting, skin texture, bokeh, or camera artifacts. TRANSLATE the person's identity into the established 2D animation style: [STYLE_CORE]. The output should look like this person drawn by the animation series' art director, not like a filtered photograph.
```

**Key risk:** The model may try to preserve the photographic look of the reference. The TRANSLATION instruction counteracts this.

### 13.2 Already-Stylized Character Image as Reference

**Goal:** Maintain existing style + extend to new scene.

**Prompting approach:**
```
The attached image is an existing animation frame featuring [CHARACTER NAME]. Use this image to maintain exact character consistency: same face, same hair, same outfit, same art style, same line quality. Generate a NEW scene described below while keeping ALL character and style attributes from this reference. Do NOT add new stylistic elements not present in the reference.
```

**Key risk:** The model may interpret the scene context as permission to change character details. Restate INVARIANTS explicitly.

### 13.3 Location Photo as Scene Reference

**Goal:** Use real photo for spatial/compositional reference, but output must be in animation style.

**Prompting approach:**
```
The attached image is a reference photograph of [location]. Use it for: spatial layout, major architectural/environmental features, approximate lighting direction, and depth composition. Do NOT reproduce photographic texture, photographic color grading, or photographic atmosphere. Translate the space into a painted 2D animation background plate: [STYLE_CORE for backgrounds]. The output should look like a painted background from a 2D animated series, not a stylized photograph.
```

### 13.4 Style Reference Image

**Goal:** Use an existing visual to define the target aesthetic — NOT to define characters or scenes.

**Prompting approach:**
```
The attached image is a STYLE REFERENCE ONLY. Use it to match: the art style, line weight treatment, shading approach, color palette range, and overall aesthetic feel. Do NOT copy any specific characters, objects, scenes, or compositions from this reference image. Apply this style to the following description: [scene prompt].
```

**Key risk:** The model may copy characters or objects from the style reference. The explicit "ONLY extract style, not content" instruction is essential.

### 13.5 Prop Reference

**Goal:** Include a specific object with visual accuracy in the scene.

**Prompting approach:**
```
The attached image shows a [prop name]. Include this prop in the scene with visual fidelity to its design — match its shape, color, and key visual features. Translate its appearance into the established animation style: [STYLE_CORE]. The prop should look like it belongs in the animated world, not like a photo-realistic insert.
```

### 13.6 Multiple Mixed References

**When using multiple reference images of different types, always explicitly label each:**

```
[Image 1] = CHARACTER IDENTITY (face, hair, outfit)
[Image 2] = SCENE ENVIRONMENT (spatial layout, lighting)
[Image 3] = STYLE TARGET (art style, line quality)

Use each image ONLY for its labeled purpose. Do NOT cross-apply attributes between images.
```

Ordering guidance: place the most identity-critical reference first in the input array. The model tends to weight the first image more heavily for identity properties.[^8]

***

## 14. COMPARISON TABLE: Nano Banana Pro vs Nano Banana 2

| Dimension | Nano Banana Pro | Nano Banana 2 | Recommendation for Animation App |
|---|---|---|---|
| **Architecture** | Gemini 3 Pro Image | Gemini 3.1 Flash Image | Both available via same API schema |
| **Launch date** | Late 2025 | Feb 26, 2026 | NB2 is newer |
| **Generation speed (1K)** | ~10–20s | ~4–6s | NB2: 3–5x faster iteration |
| **Image quality** | Maximum fidelity | ~95% of Pro | Pro for final hero frames only |
| **Thinking Mode** | ❌ Not available | ✅ Minimal / High / Dynamic | Use NB2 Dynamic for animation scenes |
| **Character consistency** | Up to 5 refs | Up to 4 refs | Both sufficient; Pro has slight edge |
| **Object fidelity slots** | Up to 6 objects | Up to 10 objects | NB2 better for prop-heavy shots |
| **Total reference images** | 14 max | 14 max | Equivalent |
| **Image search grounding** | ❌ | ✅ | NB2 advantage for location research |
| **0.5K (512px) preview tier** | ❌ | ✅ ($0.06) | NB2 for rapid prompt exploration |
| **Resolution support** | 1K, 2K, 4K | 0.5K, 1K, 2K, 4K | NB2 more flexible |
| **Aspect ratios** | 10–11 types | 14 types (incl. ultra-wide 8:1) | NB2 more flexible |
| **Price (1K)** | ~$0.15/image | ~$0.08/image | NB2 nearly half cost |
| **Price (4K)** | ~$0.30/image | ~$0.16/image | NB2 significantly cheaper at scale |
| **Free tier** | ❌ | ✅ (5,000/month AI Studio) | NB2 for prototyping |
| **Multi-person composition** | Good | Better (wins test) | NB2 preferred for ensemble scenes |
| **Complex composition adherence** | Better for very complex prompts | Very close to Pro | Pro only for 8+ element complex scenes |
| **Text rendering** | ~94% accuracy | ~92% accuracy | Pro for text-heavy frames |
| **API schema** | Shared with NB2 | Shared with Pro | One-line endpoint swap for routing |
| **Batch generation** | Multiple images | 1–4 per request | Pro for mass parallel generation |
| **Best animation use case** | Final hero frames, complex multi-element key moments | All iteration, most final production, volume generation | **Default to NB2; escalate to Pro only for final key frames** |

*Sources: *[^7][^2][^1][^3]

***

## 15. FINAL OUTPUT: READY-TO-USE PROMPT TEMPLATES

> **Note:** In all prompts below, `[referenceId: 1]` assumes the character reference sheet is the first uploaded image. Replace `[SERIES_STYLE]` with your STYLE_CORE block. Replace `[CHARACTER_MARA]` with your CHARACTER_IDENTITY_CORE block. Adapt CHARACTER_INVARIANTS accordingly.

***

### TEMPLATE 01 — Consistent Character Front Portrait

```
[referenceId: 1] Front portrait of [CHARACTER NAME] as established in the attached reference image. Face centered in upper half of frame, body from mid-chest to top of head visible. Expression: [neutral / specify]. Flat uniform studio lighting, no dominant directional shadow — intended as production reference image. Clean mid-grey neutral background, no environmental context. [CHARACTER_IDENTITY_CORE]. The portrait must exactly match the reference: same eye shape, same hair mass and silhouette, same skin tone, same facial proportions. [SERIES_STYLE]. 2K resolution, 2:3 aspect ratio.
```

***

### TEMPLATE 02 — 3/4 View

```
[referenceId: 1] Three-quarter view (camera positioned at approximately 45° to the right of the character's front axis, slight low angle). [CHARACTER NAME] stands at loose neutral pose, looking toward camera but eyes slightly past it. Body from waist to top of head. [CHARACTER_IDENTITY_CORE]. Hair visibility: left side of hair fully visible, right side partially visible behind face. Ear visible on right side. [SERIES_STYLE]. Neutral grey background, ambient lighting. This is a character reference sheet frame — no environmental context. 2K, 2:3 ratio.
```

***

### TEMPLATE 03 — Side Profile (Pure)

```
[referenceId: 1] Strict side profile of [CHARACTER NAME] — camera positioned exactly 90° to the character's right (character faces screen left). Only the profile visible: one eye, nose silhouette, lip profile, chin and jaw profile, hair from this angle. [CHARACTER_IDENTITY_CORE]. Emphasize: nose shape profile, lip profile, chin angle, hairline from side. [SERIES_STYLE]. Neutral background. 2K.
```

***

### TEMPLATE 04 — Rear View

```
[referenceId: 1] Rear view of [CHARACTER NAME] — camera directly behind, character faces away from us. Character is [standing / walking away]. Visible: full back of head, hair from behind, back of outfit, posture, body proportions. Hair must match reference when seen from this angle: [e.g., "short asymmetric bob with red streak visible on right side of hair when seen from behind"]. Outfit back visible: [describe back of outfit]. [SERIES_STYLE]. Environment: [specify or "neutral background"]. 2K.
```

***

### TEMPLATE 05 — Over-the-Shoulder Dialogue Shot

```
[referenceId: 1] for [CHARACTER B]. Over-the-shoulder shot. FOREGROUND: [CHARACTER A] — shoulder and partial head visible as dark silhouette, slightly blurred, lower-left quadrant of frame. MIDDLE GROUND: [CHARACTER B] — full face visible, center-right of frame, sharp focus, emotionally readable expression: [describe]. [CHARACTER B IDENTITY_CORE + INVARIANTS]. [SERIES_STYLE]. Camera: 50mm equivalent, slight low angle on Character B. Depth: foreground (soft) → Character B (sharp) → background (simplified painted plate). [SCENE_CONTEXT]. Not a storyboard — this is a final animation frame. 2K, 16:9.
```

***

### TEMPLATE 06 — Wide Environmental Shot

```
Wide establishing shot of [LOCATION] — no characters, or characters as small silhouettes only. This is a background plate in 2D animation style. Foreground: [describe closest elements, e.g., wet pavement edge, a railing, some foliage]. Mid-ground: [the main subject of the location, e.g., the abandoned factory, the city street, the school courtyard]. Background: [simplified far elements, e.g., city skyline silhouettes, distant hills, sky]. Three readable depth planes. [SCENE_CONTEXT with full palette and lighting logic]. STYLE: Painted 2D animation background plate — NOT a photograph, NOT a 3D render, NOT a concept art matte painting. Soft depth gradient from foreground detail to background simplification. [SERIES_STYLE applied to environment]. 2K, 16:9.
```

***

### TEMPLATE 07 — Emotional Close-Up

```
[referenceId: 1] Extreme close-up of [CHARACTER NAME]'s face — frame cuts at mid-forehead top, mid-neck bottom, ears just outside frame. Expression: [describe precisely: e.g., "eyes welling with unshed tears, brows slightly furrowed, mouth in soft sad closed line, not overtly crying but clearly holding back emotion"]. [CHARACTER_IDENTITY_CORE]. FACE LOCK — absolutely no modification to: eye shape, nose shape, face geometry, hair silhouette, skin tone. Only expression changes. [SERIES_STYLE]. LIGHTING: [e.g., "soft cool-toned light from slightly above left, slight amber edge rim from behind-right"]. Background: abstracted to single color gradient, no readable environment. 2K, 1:1 or 4:5.
```

***

### TEMPLATE 08 — Dynamic Action Frame

```
[referenceId: 1] [CHARACTER NAME] in dynamic action pose — [describe action: e.g., "mid-leap from one rooftop to the next, arms extended, coat trailing in wind"]. ANGLE: [e.g., "low angle, near-worm's eye, looking up at character mid-air against open sky"]. [CHARACTER_IDENTITY_CORE + INVARIANTS]. Face: partially visible from this angle — [e.g., "3/4 profile left, determined expression"]. Body proportions must match reference. ACTION STAGING: The key line of action runs diagonally [lower-left to upper-right / specify]. Implied motion: motion lines or frame composition only — no literal motion blur on face. [SERIES_STYLE]. LIGHTING: [describe dynamic light source for action]. Background: simplified to imply speed and environment, not fully rendered. 2K, 16:9. NOT a storyboard sketch.
```

***

### TEMPLATE 09 — Real-Photo-to-Cartoon Adaptation

```
The attached image is a real photograph of a person. Transform this person into the established 2D animation style of [SERIES NAME].
IDENTITY TO PRESERVE: Extract and maintain the person's specific facial structure — their actual face shape, eye spacing and shape, nose shape, jaw profile, and hair color and general style. This person should be recognizable in the animation output.
DO NOT PRESERVE: photographic skin texture, bokeh, camera grain, realistic shadow rendering, or any photographic qualities.
STYLE TRANSLATION: Render this person as they would appear in a 2D TV animation with the following style — [SERIES_STYLE]. Simplify features to match the series' visual language while keeping the person's identifying characteristics intact.
SCENE: [Describe the animation scene they should appear in].
OUTPUT: A final 2D animation frame, NOT a stylized photo, NOT a filtered selfie, NOT a caricature. 2K.
```

***

### TEMPLATE 10 — Style-Consistent Multi-Character Scene

```
[referenceId: 1] = [CHARACTER A] identity reference.
[referenceId: 2] = [CHARACTER B] identity reference.

A scene featuring both characters: [describe scene and relative positions — e.g., "CHARACTER A (foreground, facing right) and CHARACTER B (mid-ground, facing left), separated by 2 meters of space, in a tense standoff. Camera angle: medium two-shot, eye level."].

CHARACTER A [IDENTITY_CORE + INVARIANTS].
CHARACTER B [IDENTITY_CORE + INVARIANTS].

Both characters must exactly match their respective references. Their faces must NOT blend into each other. DO NOT apply CHARACTER A's features to CHARACTER B or vice versa. [referenceId: 1] is exclusively for CHARACTER A. [referenceId: 2] is exclusively for CHARACTER B.

[SCENE_CONTEXT]. [SERIES_STYLE]. [CAMERA_AND_STAGING]. [NEGATIVE_CONSTRAINTS]. 2K, 16:9.
```

***

### TEMPLATE 11 — Angle Exploration from One Reference

```
[referenceId: 1] Character turnaround exploration — using the attached character reference, generate the same character from [3 / 5 / 8] different camera angles.

LOCKED across all views:
• All physical character attributes as described in reference
• Same neutral expression
• Same outfit
• Same art style and line quality
• Same lighting logic (soft neutral studio light)

VARY:
• Camera angle only — generate from: [list target angles, e.g., front / 3/4 left / pure profile right / 3/4 rear left / rear / low angle front / high angle front]

OUTPUT FORMAT: Arrange all views in a single reference sheet — clean neutral grey background, character centered in each panel, consistent scale, labeled with angle name. This is a character model sheet, NOT a scene. 2K, wide aspect ratio to accommodate all panels.
```

***

### TEMPLATE 12 — Difficult Composition with Cinematic Asymmetry

```
[referenceId: 1] [CHARACTER NAME] in a highly composed cinematic frame.
SHOT TYPE: [e.g., wide shot / medium shot].
CAMERA ANGLE: [e.g., "slight Dutch tilt 12°, camera positioned at character's 5-o'clock, looking back toward character from behind and below"].
COMPOSITION: [CHARACTER NAME] occupies lower-right quadrant of frame, approximately 30% of frame area. Upper-left 70% of frame is deliberately open negative space showing [environment: e.g., the vast empty sky / the dark corridor / the burning horizon]. Subject is NOT centered. Rule of thirds NOT used — strong diagonal line from character to horizon creates frame tension.
FOREGROUND OCCLUSION: [e.g., a bent street sign in extreme near-field left edge, partial, slightly blurred, frames character].
CHARACTER: [CHARACTER_IDENTITY_CORE + INVARIANTS].
[SCENE_CONTEXT with full palette and lighting logic].
[SERIES_STYLE].
The composition must feel intentionally directed — like a frame from a prestige 2D animated series. NOT a default AI composition. 2K, 16:9 or 21:9.
```

***

## 16. APPENDIX: TOP 10 NON-OBVIOUS FINDINGS

1. **The model does not have format amnesia — it has content amnesia.** It remembers the style of an image within a chat session, but not specific character features. This means style drift is rarer than identity drift in multi-turn sessions, but character drift is nearly guaranteed without restating DNA.

2. **Reference image ordering affects which image's properties dominate.** The first image in a multi-image input appears to have higher identity weight. For character consistency, always place the character reference sheet first.[^8]

3. **Nano Banana 2's Thinking Mode (Dynamic setting) is effectively a free quality upgrade** for complex animation scenes and should be the default for all animation shot types.[^2][^1]

4. **Long chat sessions develop a "visual vocabulary" that can become a consistency asset, but then becomes a liability.** Objects, colors, and shapes from earlier in the session begin appearing uninvited. Plan session structure — do not generate indefinitely in one session.[^4]

5. **The model responds to the word "production" — framing outputs as "production cel" or "production frame" versus "storyboard" or "concept art" significantly shifts the rendering register.** This is an undocumented but consistently reported community finding.

6. **Face drift in 2D animation style prompts often comes from the style tokens themselves** — highly painterly or textured styles (impressionist, painterly concept art) drift faster than clean minimal styles (flat cel, clean line). Simpler animation styles are inherently more consistent.[^9]

7. **The model has strong priors for "AI-attractive" faces.** Without explicit identity locks, it will subtly make faces more symmetrical, eyes larger, and features more generically beautiful — drifting away from any character's specific identity. The explicit "do not correct natural asymmetries" instruction is critical.[^16]

8. **Negative prompts that are too long compete for attention with positive prompts.** A focused negative block of 15–20 specific exclusions outperforms a 50-item catchall list.[^15]

9. **The best character consistency technique is not any single prompt — it is a generation chain.** Each output becomes the next generation's reference input, creating a chain of visual continuity that compounds coherence rather than drifting.[^5]

10. **The model understands cinematography at a director's level, not a camera operator's level.** Describing intent ("this shot should make the character feel isolated and small against the world") combined with technical camera language produces better composition than technical specs alone.[^12][^8]

***

## 17. SINGLE BEST UNIVERSAL PROMPT TEMPLATE

```
[REFERENCE BLOCK]
[referenceId: 1] = CHARACTER IDENTITY REFERENCE

[SHOT_DESIGN]
[Shot type and distance]: [e.g., Medium shot, waist to crown]
[Camera angle]: [e.g., Slight low angle, 10° upward tilt, camera positioned at character's left 2-o'clock]
[Composition]: [e.g., Character at left-of-center, rule of thirds. Strong negative space to right implied by narrative context.]

[ACTION + NARRATIVE BEAT]
[CHARACTER NAME] is [single, specific, clear action]. Expression: [precise emotional description]. Body language: [describe tension/posture].

[SCENE_CONTEXT]
[Location, time, atmosphere — 2–3 lines maximum]

[CHARACTER_IDENTITY_CORE]
[Full DNA block — exact text, reused verbatim from character bible]

[CHARACTER_INVARIANTS]
[5 must-never-change attributes]

[STYLE_CORE]
Hand-drawn 2D cel animation style. Clean crisp ink outlines with variable weight. Flat cel shading, two shadow tones only. Matte flat color fills, no texture noise. Painted background plate. This is a FINAL ANIMATION FRAME — not a storyboard, not concept art, not a 3D render.

[NEGATIVE_CONSTRAINTS]
[Anti-storyboard + Anti-AI-look + Anti-drift — see library above]

[TECHNICAL]
[Resolution: 2K or 4K]. [Aspect ratio: 16:9 or specify]. [Model: Nano Banana 2 with Thinking Mode: Dynamic].
```

***

## 18. MODULAR APP ARCHITECTURE SUMMARY

```
APP PROMPT ENGINE
│
├── CHARACTER DATABASE
│   ├── character_dna.json  (per character: all identity attributes)
│   ├── character_invariants.json  (per character: 5 locked features)
│   └── character_reference_pack/  (4 images: master sheet, expression, style, closeup)
│
├── SCENE DATABASE
│   ├── scene_context_library.json  (per location: description, palette, lighting logic)
│   └── background_plate_library/  (generated BG plates, tagged by scene)
│
├── STYLE DATABASE
│   └── series_style_core.txt  (single canonical style token sequence)
│
├── SHOT GRAMMAR DATABASE
│   └── shot_taxonomy.json  (all shot types with prompt template per type)
│
├── PROMPT ASSEMBLER
│   ├── fixed_blocks: [STYLE_CORE, CHARACTER_IDENTITY_CORE, CHARACTER_INVARIANTS]
│   ├── variable_blocks: [SHOT_DESIGN, CAMERA_AND_STAGING, SCENE_CONTEXT, ACTION]
│   ├── reference_assembler: [selects and orders reference images by type]
│   ├── negative_assembler: [builds negative block from shot-type modular library]
│   └── routing_logic: [NB2 Dynamic for iteration → NB Pro for final hero frames]
│
└── GENERATION MANAGER
    ├── session_manager: [tracks turns, triggers session reset at drift or limit]
    ├── chain_manager: [stores previous output as next input reference]
    └── quality_router: [routes to NB2 for exploration, NB Pro for final delivery]
```

***

## 19. MOST IMPORTANT WARNINGS

1. **Never change more than one variable at a time.** Every additional variable multiplied per generation adds exponential drift probability.

2. **Never use the same seed with a reference image and a similar prompt.** This causes paradoxical over-locking and poor quality.

3. **Never describe what you want to avoid only — always describe what you want instead.** Semantic positive framing beats pure negation.

4. **Never extend a chat session indefinitely.** Plan resets. Past a certain context depth, the model begins bleeding visual elements from earlier generations into current outputs.

5. **Never omit the "this is a final animation frame, not a storyboard/concept art" instruction.** Without it, the model defaults toward sketch or concept-art registers — especially on character-light or environment-heavy prompts.

6. **Never accept identity drift without correction.** Drifted frames used as references in subsequent generations compound the drift geometrically. Correct immediately at detection.

7. **Never use only one reference image for a character used in many angles.** The model's spatial understanding of a character is dramatically better with front + 3/4 + side views than with only one angle.

***

## 20. PRIORITIZED ROADMAP

### Sprint 0 (Foundation — Before Any Prompting)
- Build CHARACTER_DATABASE with full DNA blocks per character
- Generate Master Reference Sheets for all characters (360° turnaround)
- Write canonical SERIES_STYLE_CORE block
- Define SCENE_CONTEXT blocks for all major locations
- Build NEGATIVE_CONSTRAINTS library

### Sprint 1 (App Core)
- Implement PROMPT_ASSEMBLER: fixed + variable block system
- Build SHOT_GRAMMAR_DATABASE with all 12+ shot types and templates
- Implement REFERENCE_ASSEMBLER: image slot management and ordering
- Build ROUTING_LOGIC: NB2 (Dynamic) for iteration → NB Pro for hero

### Sprint 2 (Consistency Infrastructure)
- Build SESSION_MANAGER with drift detection triggers and reset protocol
- Implement GENERATION_CHAIN: previous output as next reference input
- Build CHARACTER_DRIFT_DETECTOR: visual comparison hooks
- Add VARIATION_RULES per prompt type

### Sprint 3 (Quality and Volume)
- Implement batch generation via NB2 at 0.5K for rapid exploration
- Add 4K upscaling pass via NB Pro for approved frames
- Build STYLE_DRIFT_MONITOR: periodic style consistency check
- Create SHOT_SEQUENCE_PLANNER: plan angle variations before generation

### Sprint 4 (Production Hardening)
- Add generation provenance graph (asset lineage tracking)
- Implement prompt versioning and A/B testing
- Build character bible export (PDF asset package per character)
- Add cost management: route by quality tier, batch discount logic

---

## References

1. [Nano Banana Pro vs. Nano Banana 2: What's The Difference? - Fal.ai](https://fal.ai/learn/tools/nano-banana-pro-vs-nano-banana-2) - Compare Nano Banana Pro and Nano Banana 2 by architecture, speed, image quality, pricing, and best u...

2. [Nano Banana 2 vs Nano Banana Pro (2026): Speed or Quality ...](https://www.nanobananaimages.com/blog/nano-banana-2-vs-nano-banana-pro)

3. [Nano Banana 2 vs Pro In-Depth Review: 10 Dimensions Compared](https://useneospark.com/blog/nano-banana-2-vs-pro-review/) - Comprehensive comparison of Nano Banana 2 and Nano Banana Pro across 10 test dimensions including ar...

4. [Generating Hundreds of Consistent Illustrations with Gemini ...](https://www.tinystruggles.com/posts/illustrations_with_gemini/) - The Reference Image Approach. The most reliable method we found for maintaining character consistenc...

5. [Creating Consistent Character Imagery with Gemini 2.5 ...](https://hyper.ai/en/headlines/d4203a9324c52f3263a13a0e523a45bc) - Build the Future of Artificial Intelligence

6. [Native Image Generation with Multimodal Context in Gemini 2.5 ...](https://www.zenml.io/llmops-database/native-image-generation-with-multimodal-context-in-gemini-2-5-flash) - Google DeepMind released an updated native image generation capability in Gemini 2.5 Flash that repr...

7. [Image generation with Gemini (aka Nano Banana 🍌) | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/image-generation/) - Get started generating images with the Gemini API

8. [How to prompt Gemini 2.5 Flash Image Generation for the best results](https://developers.googleblog.com/ja/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/) - Learn how to use Gemini 2.5 Flash Image to generate, edit, and compose images through detailed promp...

9. [List of Art Styles For AI Prompts: 180+ Templates](https://www.neolemon.com/blog/list-of-art-styles-for-ai-prompts/) - Master AI art style consistency with 180+ templates for children's books, animation, comics, and mor...

10. [The Best 25 Stable Diffusion Prompts for 2D Cartoon - AI Art Generator](https://openart.ai/blog/post/stable-diffusion-prompts-for-2d-cartoon) - Here're the best Stable Diffusion 2D Cartoon prompts to generate the highest-quality images possible...

11. [Mastering Character Consistency in Gemini Nano Banana](https://sparkco.ai/blog/mastering-character-consistency-in-gemini-nano-banana)

12. [Prompt Engineering: Master Cinematic AI Video Control](https://hailuoai.video/pages/knowledge/prompt-engineering-cinematic-ai-video-workflow) - This guide details prompt engineering for cinematic AI video, covering spatial control, consistent c...

13. [Generate & edit images using Gemini (aka "Nano Banana") - Firebase](https://firebase.google.com/docs/ai-logic/generate-images-gemini) - A guide to generating and editing images using Gemini models via the Firebase AI Logic client SDKs.

14. [Mastering Character Consistency with Gemini 3.1 Flash Image](https://kartaca.com/en/brand-storyboarding-mastering-character-consistency-with-gemini-3-1-flash-image/) - As organizations move beyond the experimental allure of early generative AI, the focus has shifted t...

15. [Negative Prompts: What They Are & How To Use Them](https://ltx.studio/blog/negative-prompts) - Discover how negative prompts work and why they matter. See examples and learn how to use them to co...

16. [Awesome Nano Banana Pro](https://github.com/ZeroLu/awesome-nanobanana-pro) - An awesome list of curated Nano Banana pro prompts and examples. Your go-to resource for mastering p...

17. [The Complete Guide to AI Video Prompt Engineering](https://venice.ai/blog/the-complete-guide-to-ai-video-prompt-engineering) - Master professional AI video generation with a six-layer framework for creating cinematic content co...

18. [my Gemini Gem + Veo3.1 = Lock Character Consistency](https://www.youtube.com/watch?v=Cs4B5kiq4nM) - Master consistent AI characters using this Nano Banana Pro tutorial. Learn the AI character consiste...

