# VitalCheck agent

Proof of concept AI agent for clinical decision support. A junior clinician or nurse describes a patient's vitals and presentation in plain language in a chat box, and the agent:

- Interprets the parameters using NEWS2-style early warning reasoning (respiratory rate, SpO2, oxygen use, systolic BP, heart rate, temperature, consciousness)
- Asks follow-up questions if key information is missing
- Logs a one-line summary and risk level to a running shift log once it has enough to give an assessment

**Not validated for clinical use.** This is a demo only and must not be used on real patients or replace clinical judgment and facility protocols.

## How it works

Single-page static app: `index.html`, `src/styles.css`, `src/app.js`. No build step, no backend. It calls the Anthropic API (`api.anthropic.com/v1/messages`) directly from the browser using an API key the user provides.

## Running it

1. Open `index.html` in a browser (locally, or via GitHub Pages once enabled on this repo).
2. Paste an Anthropic API key into the field at the top. Get one at [console.anthropic.com](https://console.anthropic.com).
3. Describe a patient, e.g. "45yo male, RR 26, SpO2 91% on room air, BP 100/70, HR 118, confused."

The key is stored only in your own browser's local storage and is sent only to Anthropic's API. It is never committed to this repo and never shared with anyone else who opens the page, each person needs to paste in their own key.

## Known limitations (read before demoing)

- **No hardcoded key.** Never edit the code to bake in an API key. Anyone viewing the page source could read it and misuse it.
- **Client-side only.** This is a prototype pattern, not production architecture. A real deployment needs a backend that holds the API key server-side, with auth, rate limiting, and logging.
- **No persistence.** The shift log clears on page reload. Nothing is saved to a database.
- **Not clinically validated.** The scoring logic and reasoning have not been reviewed by a clinician against real cases or a facility's actual protocol.

## Suggested next steps

- Add a backend proxy so users never see or handle an API key
- Persist the shift log (database or backend storage)
- Validate scoring thresholds against NEWS2/MEWS or whatever protocol the target facility actually uses
- Add a senior-clinician review flow for flagged high-risk cases
