# Kindred

Design AI companions (friends, girlfriends, boyfriends, partners, mentors, or anything custom) with a face, a voice and a memory, then talk to them in character. Runs entirely in the browser and installs as an app.

## Features

**Create**
- **AI Creator**: describe someone in a line, or pick one of 12 archetypes, then get a full profile with a portrait, voice and scene sound. Choose "Another take", fine-tune it, or start chatting.
- **Designer** with six tabs: identity, look (portrait generation, photo upload, image style), personality (traits and temperament sliders), story, voice and sound, and chat style.

**Chat**
- Streaming replies, *asterisk actions*, stop, alternate replies (‹ 1/3 ›), and edit, copy or delete on any message.
- **Moods**: companions tag how they feel; it shows in the header and shapes the next reply.
- **Memories**: pin messages, add notes, or extract facts from the chat automatically.
- **Bond levels** (Just met → Inseparable) grow as you chat.
- **Scenes** with **background sound**: rain, café, ocean, fireplace, summer night, all synthesized live.
- **Photos**: ask "send me a selfie" and they send one, or tap the camera button.

**Look and sound**
- Light, dark or device theme, 8 accent colors, chat backgrounds tinted to each companion or set from their gallery, animated messages.
- Replies read aloud with a per-companion voice, speed and pitch (device voices or an OpenAI-compatible speech API), voice input, and message chimes.

**Image studio**
- Portraits, selfies, outfits and scenes in six styles and three shapes. Every image lands in the companion's gallery and can become their avatar or chat background.
- Providers: Pollinations (free, no key), OpenAI-compatible image APIs, Stable Diffusion WebUI or Forge (local, any checkpoint), Claude SVG illustrations (inside claude.ai), or offline placeholder art.

**18+**
- Turning it on takes an age confirmation plus a global switch, then a per-companion switch and a per-image switch in the studio.
- Every companion must be 18 or older, and every image prompt is checked so it never depicts minors, whatever the setting.
- What's actually allowed depends on the AI and image providers you connect.

**App**
- Installable (manifest and service worker) and works offline for everything except the AI calls.
- Import and export of companions, chats and memories.

## AI providers

| Chat provider | Where it works | Notes |
| --- | --- | --- |
| Claude (built-in) | The claude.ai artifact | Uses your Claude account and follows Anthropic's usage policies. |
| OpenAI-compatible | Hosted or local | OpenRouter, OpenAI, LM Studio (`http://localhost:1234/v1`), Ollama (`http://localhost:11434/v1`), and others. |
| Anthropic API | Hosted or local | Your own key. |
| Demo mode | Anywhere | Canned replies, for trying the interface. |

API keys stay in your browser's localStorage and are sent only to the provider you configure. The claude.ai artifact can't reach outside services, so use a hosted or local copy for other providers.

## Running it

```sh
node scripts/build.mjs        # builds dist/ (index.html, manifest, service worker, icons)
npx serve dist                # or: cd dist && python3 -m http.server
```

Open the printed address, then use the browser's "Install" option or the button in the sidebar. `dist/` is a static site, so you can host it anywhere: GitHub Pages, Netlify, Cloudflare Pages, Render, and so on.

## Testing

```sh
node scripts/build.mjs && node scripts/smoke-test.mjs   # headless Chromium, Demo mode, screenshots in test-output/
```

## Project layout

- `src/kindred.html`: the whole app (HTML, CSS, JS in one file). This is also what's published as the claude.ai artifact.
- `public/`: manifest, service worker and icons. `scripts/make-icons.mjs` renders the PNG icons from `icon.svg`.
- `scripts/build.mjs`: assembles `dist/`.
- `scripts/smoke-test.mjs`: end-to-end browser test.
