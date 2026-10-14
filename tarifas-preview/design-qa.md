# Design QA

Viewport checked: desktop browser preview at 1180 × 1080.

- `final result: passed`
- Visual hierarchy matches the supplied tarifas reference: sidebar, commerce header, page heading, KPI cards, tabs, filters, tarifa table, calculation preview, and surcharge card.
- Default calculation matches the reference: 2.8 km, C$50 base, C$27 additional distance, C$77 estimated total.
- Verified interactions: `Nueva tarifa` opens and closes its modal; search filters the table and can be cleared; tab navigation and surcharge configuration are wired.
- React Doctor: 100/100 on the isolated preview.
- Remaining note: the shared workspace currently has other active Codex sessions editing the root prototype entrypoint, so this QA applies to `tarifas-preview/` and its dedicated preview server.
