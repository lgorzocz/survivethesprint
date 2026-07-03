# Survive the Sprint — hudba (AI-generovaná)

Adaptivní hudba je už **napojená v kódu** ([src/audio/AudioSystem.ts](../src/audio/AudioSystem.ts)).
Chybí jen dva zvukové soubory — jakmile je vložíš, hudba naskočí sama. Do té
doby hra běží bez hudby (nic se nerozbije).

## Co dodat

**Bezešvě smyčkovatelné** loopy do `public/audio/`:

| Soubor | Role | Povinný? |
|---|---|---|
| `public/audio/music-calm.ogg` | in-game: klidná vrstva (málo bugů) | ano |
| `public/audio/music-intense.ogg` | in-game: napjatá/glitch vrstva (hodně bugů) | ano |
| `public/audio/music-menu.ogg` | hlavní menu | volitelný — když chybí, menu použije `music-calm.ogg` |

**Jak to funguje:** obě smyčky hrají současně a synchronně; podle bug metru se
crossfadují — klidná ustupuje, napjatá sílí. **Proto musí mít oba loopy stejné
tempo (BPM) i délku** (aby seděly na sebe). Ideálně vygeneruj „intense" jako
variantu „calm" (stejný beat, přidané napětí), nebo použij **stemy** z jednoho
tracku.

> **Aktuální stav:** menu i in-game hraje CC0 track „Bossa Nova" od *Joth*
> (`music-menu.mp3` = `music-calm.mp3`, viz [CREDITS.md](../CREDITS.md)).
> `music-intense.mp3` zatím chybí → in-game jede jednovrstvě (steady calm).
> Jakmile dodáš intense loop (stejné BPM/délka), naskočí adaptivní crossfade.

## Technická specifikace

- Formát: **MP3** nebo **OGG** (kód teď hledá `.mp3`; pro OGG přejmenuj cesty v
  AudioSystem `MUSIC_*_URL`).
- Délka: **30–60 s**, **seamless loop** (konec navazuje na začátek bez cvaknutí).
- Tempo: **stejné BPM** u obou (doporučeno ~70–85 BPM lo-fi).
- Velikost: každý ideálně **< 1 MB** (kvůli instant-play sdílení). Klidně
  mono/22–44 kHz.
- Instrumentální, **bez vokálů**.

## ⚠ Licence (důležité)

Hra míří na monetizaci a **sponzory** (viz CLAUDE.md §12), takže hudba musí mít
**jasná komerční práva**:

- Bezpečné (dělané na royalty-free do her): **Soundraw, Mubert, Beatoven.ai, AIVA**.
- **Suno / Udio / Stable Audio** — komerční use jen na **placeném** tarifu; ověř
  podmínky (a případně stáhni i stemy).
- Open-source & plná kontrola: **Meta MusicGen / AudioCraft** (běží lokálně).
- U jakékoli AI hudby ulož si doklad o licenci pro daný výstup.

## Prompty

### Calm (music-calm.ogg)
> Chill lo-fi hip-hop, 78 BPM, mellow Rhodes piano, soft boom-bap drums, warm
> vinyl crackle, gentle sub bass, relaxed "coding at night" mood, instrumental,
> no vocals, seamless loop.

### Intense (music-intense.ogg) — stejný beat, napjatější
> Same 78 BPM lo-fi beat but tense and glitchy: faster hi-hats, slightly detuned
> keys, distorted/driving bass, subtle alarm and error undertones, rising sense
> of panic, instrumental, no vocals, seamless loop.

### (volitelně) menu / title
> Calm lo-fi intro loop, 78 BPM, dreamy pads, soft piano melody, hopeful but
> laid-back, instrumental, seamless loop.

## Ladění v kódu

V [AudioSystem.ts](../src/audio/AudioSystem.ts):

- `MUSIC_VOL` — celková hlasitost hudby (0..1).
- Crossfade křivka je v `audio.setMusic()` (jak rychle a jak moc calm ustupuje /
  intense sílí).
- Cesty k souborům: `MUSIC_CALM_URL` / `MUSIC_INTENSE_URL`.

Hudba se pouští po prvním gestu (kliknutí HRÁT) a řídí se přepínačem **Zvuk** v
menu (společný se SFX). Oddělenou hlasitost hudba/SFX a vlastní přepínač hudby
lze doplnit později.
