# Pixel Study OS – ASSETS.md

This document tracks all third‑party art and UI assets used in Pixel Study OS and how they may be used and redistributed.

- **LPC (Liberated Pixel Cup) assets** → CC BY‑SA 3.0 / GPL 3.0 (share‑alike / copyleft).
- **Kenney + other CC0 assets** → CC0 (public domain).
- **Fonts** → CC0 or OFL (must confirm per font).

Keep this file up to date whenever you add or remove assets.

---

## 1. Folder Structure

Suggested structure:

- `assets/lpc/` – all LPC characters, animals, tiles, and any derivatives.
- `assets/cc0/` – Kenney UI, CC0 icons, CC0/OFL fonts, custom work based on CC0 sources.
- `assets/custom/` – hand‑drawn assets created specifically for Pixel Study OS.

LPC content **must not** be mixed with CC0/custom content in a way that hides attribution or licensing requirements.

---

## 2. LPC Characters & Clothing

### 2.1 Universal LPC Spritesheet / Character Generator

- **Name:** Universal LPC Spritesheet & Character Generator  
- **Source:** GitHub – Liberated Pixel Cup / makrohn / community  
- **URLs:**  
  - Repo: https://github.com/makrohn/Universal-LPC-spritesheet  
  - Generator: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator[web:80][web:7]  
- **What we use:**
  - Human base bodies (male/female, multiple builds).
  - Heads, hairstyles, clothing, accessories exported as layered spritesheets.
- **License:**
  - Assets in the LPC ecosystem are typically dual‑licensed **CC BY‑SA 3.0** and **GPL 3.0**.  
  - The Universal generator combines multiple sources; some parts are CC0/CC BY, but the **most restrictive license in any composite (often CC BY‑SA / GPL) governs the output**.[web:7][web:80][web:86]
- **Usage rules:**
  - We export our character sprites from the LPC generator and store them under `assets/lpc/characters/…`.
  - For each export, we keep the generator’s **CREDITS file** or a copy of its attribution text in this repo.[web:7][web:86]
  - We do **not** sell LPC sprites as standalone assets or lock them behind DRM; they remain share‑alike / GPL compatible.
  - Any modifications (recolors, new outfits) are treated as CC BY‑SA / GPL derivatives.

### 2.2 LPC Character Sprite Collections (OpenGameArt)

- **Name:** LPC Character Sprites  
- **Source:** OpenGameArt – LPC collection  
- **URL:** https://opengameart.org/content/lpc-character-sprites[web:82]  
- **What we use:**
  - Additional character bases and clothing sets that match the LPC style.
- **License:**
  - CC BY‑SA 3.0 / GPL 3.0 (per LPC rules).[web:12][web:82]
- **Usage rules:**
  - Downloaded sheets are stored under `assets/lpc/characters/…`.
  - Individual authors listed on the OpenGameArt page are credited in the “Art Credits” section of the app and in this file (below).
  - Same share‑alike / GPL constraints as above.

> **TODO:** When you decide exactly which character packs from this page you use, list each pack title and author here.

---

## 3. LPC Animals & “Bad Guy” Creatures

### 3.1 Fantasy Monster & Animal Sprites (LPC)

- **Name:** Fantasy Monster & Animal Sprites – Liberated Pixel Cup  
- **Source:** OpenGameArt (LPC collection)  
- **URL:** https://lpc.opengameart.org/content/fantasy-monster-animal-sprites[web:88]  
- **What we use:**
  - Non‑aggressive animals (cats, birds, etc.) as **pets**.
  - Select monsters/creatures as symbolic “Bad Guys” for cognitive obstacles (procrastination, confusion).
- **License:**
  - CC BY‑SA 3.0 / GPL 3.0 (LPC standard).[web:12][web:88]
- **Usage rules:**
  - Stored under `assets/lpc/animals/…`.
  - Authors named on the OpenGameArt page are added to the credits.
  - Derivatives remain share‑alike.

> **TODO:** Once you finalize which specific animals you use as pets, list sprite filenames here.

### 3.2 Companion Pets (Nora original sprites)

- **Name:** Nora companion sprites
- **Source:** Generated specifically for Nora and committed under `public/sprites/pets/{id}.gif`
- **What we use:**
  - Small animated pixel companions for the study pet / room companion.
  - Companion IDs are stable so existing saved `pet_type` values continue to work.
- **License:**
  - MIT, as original project assets.
- **Usage rules:**
  - These sprites can be redistributed with Nora under the repository license.
  - Do not replace them with third-party character art without updating this file and `LICENSE-ASSETS`.

---

## 4. LPC Environment Tiles

### 4.1 LPC Tile Atlas

- **Name:** LPC Tile Atlas  
- **Source:** OpenGameArt (LPC)  
- **URL:** https://opengameart.org/content/lpc-tile-atlas[web:87]  
- **What we use:**
  - Base indoor/outdoor tiles (floors, walls, terrain, props) for the study room and backgrounds.
- **License:**
  - CC BY‑SA 3.0 / GPL 3.0.[web:12][web:87]
- **Usage rules:**
  - Stored under `assets/lpc/tiles/…`.
  - Refer to the Tile Atlas page for author names; add them to credits.
  - We may pre‑compose some tiles into static backgrounds, but they remain LPC‑licensed.

### 4.2 16×16 RPG Tileset (LPC‑style)

- **Name:** 16×16 RPG Tileset  
- **Source:** OpenGameArt  
- **URL:** https://opengameart.org/content/16x16-rpg-tileset[web:81]  
- **What we use:**
  - Supplemental tiles for trees, plants, buildings, and interior decorations if they visually match our style.
- **License:**
  - CC BY‑SA 3.0 (and/or LPC‑compatible) – check the specific license text on the page.[web:81]
- **Usage rules:**
  - Also under `assets/lpc/tiles/…`.
  - Credit original authors as listed.

> **NOTE:** For every LPC tile set actually used, record its name, URL, and authors under this section.

---

## 5. UI Assets (CC0)

### 5.1 Kenney Pixel UI Pack

- **Name:** Pixel UI Pack  
- **Author:** Kenney  
- **Source:** Kenney.nl  
- **URL:** https://kenney.nl/assets/pixel-ui-pack[web:83]  
- **License:** CC0 (Public Domain).[web:83][web:84][web:89][web:90]
- **What we use:**
  - Buttons, sliders, panels, frames, progress bars.
- **Usage rules:**
  - Stored under `assets/cc0/ui/kenney/…`.
  - Free to use, modify, recolor, and ship in commercial products; attribution not required but appreciated.
  - We adapt the color palette to match LPC characters and tiles.

### 5.2 Additional CC0 UI & Icon Sets

- **Name:** Free Game UI Assets (icons, panels, gauges)  
- **Source:** free‑ui‑assets.yurinchi2525.com  
- **URL:** https://free-ui-assets.yurinchi2525.com[web:91]  
- **License:** CC0 (as stated on the site).[web:91]
- **What we use:**
  - Supplemental icons, small gauges, and panels for stats and settings.
- **Usage rules:**
  - Stored under `assets/cc0/ui/icons/…`.
  - No attribution required; we still mention the site in credits.

> **NOTE:** For each external CC0 UI set you actually import, add its name and URL here.

---

## 6. Fonts

We aim to use pixel fonts that are **CC0** or **OFL** (Open Font License). Always verify the license on the font’s official page before including it.

### 6.1 Planned fonts (examples)

These are common pixel fonts; check and record the exact license and URL when you choose them:

- **m5x7** – widely used pixel font (typically under a permissive license).  
- **Monogram** – minimalist pixel font (OFL).  
- **Pixeloid** – retro pixel font (OFL).

> **TODO:**  
> - When you select final fonts, list each font name, author, license, and download URL here.  
> - Store fonts under `assets/cc0/fonts/…` or `assets/custom/fonts/…` depending on license.

For reference, there are curated gists and lists of free game dev assets (including fonts) you can inspect, but always follow the official font page for license details.[web:85]

---

## 7. How We Combine LPC and CC0 Assets

- **Characters, environment** → LPC (CC BY‑SA 3.0 / GPL 3.0)  
  - Count as “share‑alike” art; our combinations stay under compatible licenses.
- **Companion pets** → PokéAPI sprites (see §3.2) — trademarked Pokémon content, used non-commercially for demonstration only; not merged into LPC files.
- **UI frames, icons, fonts (where possible)** → CC0 / OFL  
  - No license conflicts, because CC0/OFL assets are not being *merged into* LPC sprites; they’re used as separate layers (UI) in the app.[web:83][web:84][web:91]

We avoid compositing LPC art and CC0 art into single textures when that would change the licensing story. Instead we:

- Keep LPC characters/tiles as separate spritesheets.
- Keep Kenney UI and CC0 icons as distinct UI files (frames, HUD, buttons).
- Overlay them at runtime via CSS/canvas, which does not create a new combined asset file that would confuse licensing.

---

## 8. In‑App Credits Screen

The game must include an in‑app **“Art & Asset Credits”** view that:

1. Lists **LPC contributors** (characters, tiles, animals) with links to:
   - Liberated Pixel Cup GitHub: https://github.com/OpenGameArt/LiberatedPixelCup[web:12]
   - OpenGameArt LPC collections used (character sprites, tile atlas, animals).[web:82][web:87][web:88]
2. Mentions that LPC assets are used under **CC BY‑SA 3.0 / GPL 3.0**, and that derived art is share‑alike.
3. Lists Kenney as a UI asset provider (even though CC0) and links to:
   - https://kenney.nl[web:83][web:84][web:89]
4. Mentions any CC0 UI sites and fonts used, with URLs.

This screen should be reachable from settings (e.g., “Credits & Licenses”).

---

## 9. Checklist When Adding New Assets

Before adding a new art asset:

1. **Check license:**
   - If LPC → CC BY‑SA / GPL → put in `assets/lpc/` and update this file.
   - If CC0 / OFL → put in `assets/cc0/` and update this file.
2. **Record metadata:**
   - Name, author(s), URL, license.
3. **Update credits:**
   - Add authors to the in‑app credits list if needed.
4. **Avoid mixing:** 
   - Do not raster‑merge LPC + CC0 into a single new sprite if you’re not sure how licensing would apply. Keep them layered.

By keeping ASSETS.md and the in‑app credits page aligned, Pixel Study OS respects original artists and stays legally safe.