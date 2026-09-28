# Converter Hub — Starter Project

## Files
- `index.html` — main entry and views (landing, unit, currency, other)
- `css/styles.css` — styles
- `js/units.js` — unit conversion logic
- `js/currency.js` — currency rates and conversion helpers
- `js/app.js` — app wiring, navigation, block & summary logic

## How to run
1. Open the project folder in VS Code.
2. Use Live Server extension or open `index.html` in your browser.
3. The app starts on the Home (landing) page. Use the sidebar or the Open buttons to navigate.

## Notes
- Sidebar is the single navigation source. Header Home button returns to landing.
- Unit and Currency converters support multiple blocks; each block updates the summary on the right in the same order as blocks.
- Currency rates use exchangerate.host (no API key). If the network fails, sample rates are used.
- To extend: add persistence (localStorage), refresh rates control, or convert to a React app.

