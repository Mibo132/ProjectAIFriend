# Kindred

Design AI companions (friends, girlfriends, boyfriends, partners, mentors, or anything custom) and talk to them in character.

## Features

- **Companion designer** with five tabs: identity (name, age 18+, gender, pronouns, relationship), look (photo upload or generated avatar, appearance), personality (traits plus warmth, humor, flirtiness, energy and boldness sliders), story (backstory, interests, likes, dislikes, quirks) and chat style (speaking voice, first message, starting scene, reply length, boundaries).
- **Draft with AI**: describe an idea in one line and the form fills itself in.
- **Chat** with streaming replies, *asterisk actions*, stop, regenerate with alternate replies (‹ 1/3 ›), and edit, copy or delete on any message.
- **Memories**: pin any message, add notes, or let the companion pull durable facts out of the chat. Memories go into every reply.
- **Bond levels** (Just met → Inseparable) grow as you chat and shape how familiar the companion is.
- **Scenes**: set where you are ("rooftop picnic at sunset").
- **Mature content gate**: an 18+ confirmation plus a global switch unlock a per-companion 18+ setting. Every companion must be an adult. What's actually allowed depends on the AI provider you use.
- **Import and export** of companions, chats and memories as JSON.

## AI providers

Pick one in Settings:

| Provider | Where it works | Notes |
| --- | --- | --- |
| Claude (built-in) | The claude.ai link | Uses your Claude account. Keeps to Anthropic's usage policies. |
| OpenAI-compatible | Running locally | OpenRouter, OpenAI, LM Studio (`http://localhost:1234/v1`), Ollama (`http://localhost:11434/v1`), and so on. Your choice of model. |
| Anthropic API | Running locally | Your own API key. |
| Demo mode | Anywhere | Canned replies, for testing the interface with no AI. |

API keys stay in your browser's localStorage and are sent only to the provider you configure.

## Running locally

```sh
node scripts/build.mjs        # writes index.html from src/kindred.html
npx serve .                   # or: python3 -m http.server
```

Then open http://localhost:3000 (or :8000). Opening `index.html` directly also works for most providers.

## Testing

```sh
node scripts/smoke-test.mjs   # headless Chromium, Demo mode, writes screenshots to test-output/
```

## Project layout

- `src/kindred.html`: the whole app (HTML, CSS, JS in one file). This is also what gets published as the live claude.ai artifact.
- `scripts/build.mjs`: wraps it into a standalone `index.html`.
- `scripts/smoke-test.mjs`: end-to-end browser test.
