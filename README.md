# Ficha pública del Anchor (Alyto + Cowrie Exchange)

Dashboard client-side (HTML + CSS + JS) que lee en vivo SEP-1, SEP-24 y SEP-31.
El selector ofrece solo 2 Anchors: Alyto (por defecto) y Cowrie Exchange.

## Estructura
    alyto-anchor-viewer/
    ├─ index.html
    ├─ vercel.json
    ├─ README.md
    ├─ css/ styles.css, splash.css
    └─ js/ api.js, app.js, smol-toml.js, splash.js

## Ejecutar en local (Windows, cmd)
    cd C:\Users\LENOVO\Downloads\alyto-anchor-viewer
    python -m http.server 8000
Abrir http://localhost:8000 (Ctrl+F5 para limpiar caché).

## Desplegar
Netlify Drop, GitHub Pages o `npx vercel` dentro de la carpeta.
