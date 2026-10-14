# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable prototype feedback

- The Reportes screen should follow the attached desktop reference: white sidebar and topbar, navy typography, green performance accents, KPI cards, orders/income chart, order status bars, courier-performance table, operational alerts, and fuel summary.
- La experiencia completa debe priorizar una interfaz web moderna, ligera y muy fácil de usar: jerarquía clara, responsive real, accesibilidad, estados de interacción consistentes y carga rápida.
- Las optimizaciones deben respetar el alcance actual del prototipo: no inventar llamadas de red ni capas de datos; reducir trabajo de render, peso de assets/CSS y consultas futuras sin romper el empaquetado de Sites.
- Preferencia tecnológica: usar React con Vite en este prototipo; considerar Next.js solo para una futura migración de arquitectura. Para estilos, preferir Tailwind CSS o componentes shadcn/ui cuando reduzcan complejidad y peso, evitando migraciones grandes que no aporten valor inmediato.
- La app de administración y la PWA deben ser responsive de extremo a extremo en teléfonos y tabletas: sin overflow horizontal, controles táctiles cómodos, jerarquía legible, layout fluido y una apariencia fina, elegante y moderna.
