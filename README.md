# Icon Browser (Local Flask App)

A lightweight, offline-friendly Flask app to browse, search, preview, and work with local SVG icons (light and dark variants). Copy SVG/PNG to clipboard and download individual assets. Per‑icon preview supports a Dark BG toggle to evaluate contrast.

## Quick start

1) Install dependencies

```
pip install -r requirements.txt
```

2) Build the icon index (scans ./icons and writes data/icons.json)

```
python tools/build_icon_index.py --icons-dir ./icons --out ./data/icons.json
```

3) Run the app (either way works)

```
flask --app run.py --debug run
# or
python run.py
```

Open http://127.0.0.1:5000/

## Icon naming rules

- Each icon should have light and/or dark variants.
- Filenames must end with pre-defined suffixes:
  - Like `_l.svg` for light, `_d.svg` for dark
- Examples:
  - `handshake_l.svg` → theme: light → icn_name: `handshake_light`
  - `handshake_d.svg` → theme: dark  → icn_name: `handshake_dark`
- The index builder produces entries with schema:

```
{ "icn_name": "handshake_light", "icn_loc": "./icons/handshake_l.svg", "theme": "light" }
```

## Regenerate the index

Run the CLI whenever you add/edit icons:

```
python tools/build_icon_index.py --icons-dir ./icons --out ./data/icons.json
```

The script is idempotent and prints stats and non-fatal warnings (duplicates, missing pairs, irregular names). Exit code is always 0.

## Web UI features

- Sticky header with search (debounced) and theme filters (All/Light/Dark).
- Responsive grid using CSS Grid (auto-fit/minmax).
- Icon cards show an inline SVG preview, name, theme, and actions:
  - Copy SVG (raw text to clipboard)
  - Copy PNG (renders SVG to a canvas at chosen size; tries clipboard, falls back to download)
  - Download SVG
  - Download PNG
  - Toggle Dark BG on preview
- PNG size control (128/256/512/1024). The last chosen size is saved in localStorage.
- Pagination (60 per page by default) to keep the UI fast with hundreds of icons.
- Accessibility: visible focus rings, aria-labels, aria-live toasts, keyboard navigation.

## Keyboard shortcuts

- `/` focus search
- `?` show shortcuts hint (toast)
- Arrow keys: move between cards
- `Enter` on a card: primary action (Copy SVG)

## Testing

Install dev requirements and run pytest:

```
pip install -r requirements-dev.txt
pytest -q
```

## Troubleshooting

- Clipboard permissions: Some browsers require user interaction or HTTPS-equivalent context for clipboard writes. If copying PNG fails, the app falls back to downloading the PNG.
- Missing icons in the UI: Re-run the index builder to refresh data/icons.json.
- Empty state: Check your search query and theme filters.

## Adding new icons

1) Place your new `*_l.svg` and/or `*_d.svg` files under `./icons/`.
2) Run the index builder:

```
python tools/build_icon_index.py
```

3) Refresh the page.

