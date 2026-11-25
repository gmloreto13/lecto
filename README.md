# Lecto · Lector en voz alta

Lecto convierte tus **PDF, EPUB, TXT y Markdown** en audio con la Web Speech API, resalta la frase que se está leyendo y guarda tu progreso en el propio dispositivo. Está pensada primero para el móvil.

## Novedades de la versión 2.0

1. **Marcadores y notas.** Toca una frase para escucharla, marcarla con un color o añadirle una nota. Los marcadores se listan por documento y se exportan a Markdown.
2. **Búsqueda en el documento.** Sin distinguir mayúsculas ni acentos, con fragmento de contexto y salto directo a la frase.
3. **Temporizador de sueño y estadísticas.** Detén la lectura a los 5–90 minutos, al terminar la página o el capítulo. La sección *Progreso* muestra minutos de hoy, racha, meta diaria, últimos 7 y 30 días y lo más escuchado.
4. **App instalable sin conexión (PWA).** Manifiesto, iconos y service worker que precarga todos los recursos. Incluye controles en la pantalla de bloqueo (Media Session) y mantiene la pantalla encendida mientras escuchas (Wake Lock).
5. **Diccionario de pronunciación.** Reglas «texto escrito → cómo debe sonar» (siglas, nombres, abreviaturas) aplicadas solo a la voz, con prueba en vivo.

Además: rediseño completo móvil primero (navegación inferior, hojas deslizables, gestos para pasar página), tres temas (claro, sepia, oscuro), ajuste de interlineado, estimación del tiempo restante y mini reproductor fuera del lector.

## Desarrollo

```bash
npm install
npm run dev          # servidor local
npm run build        # sitio estático con PWA en dist/
npm run build:single # un único index.html autocontenido en dist-single/
```

Cada push a `main` publica el sitio en GitHub Pages (`.github/workflows/deploy.yml`).

## Estructura

```
src/
  App.tsx                 Orquestador: vistas, carga de archivos, persistencia, voz, temporizador, PWA
  types/document.ts       Tipos y MAX_DOCUMENT_PAGES = 1000
  data/sampleDocuments.ts Textos de ejemplo
  parsers/                PDF (pdfjs-dist), EPUB (jszip + DOMParser), TXT/Markdown
  utils/                  Segmentación, almacenamiento (IndexedDB + localStorage), búsqueda,
                          pronunciación y estadísticas
  hooks/useSpeechReader   Motor de voz: velocidad 0,5×–3,0× en vivo, avance automático
  components/             TopBar/BottomNav, LibraryView, ReaderView, ReaderViewport, ReaderSidebar,
                          AudioDock, SearchPanel, BookmarksPanel, StatsView, SettingsView,
                          PronunciationPanel, ShortcutsModal, Sheet
public/                   Manifiesto, service worker e iconos
```

## Atajos de teclado

Espacio (reproducir/pausar) · ←/→ (oración) · Mayús+←/→ (página) · ↑/↓ (velocidad) · 1–4 (velocidades) · / (buscar) · B (marcar) · T (índice) · D (tema) · ? (ayuda)
