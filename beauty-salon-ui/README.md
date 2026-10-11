# Beauty Salon Reservation System: UI prototype

HTML, CSS and vanilla JavaScript prototype for the diploma project.
No backend, database, login or real payments. All data is demo data.

## How to open

1. Open this folder.
2. Double-click `index.html`. It opens in your browser (Chrome, Edge or Firefox).
3. Pick an interface on the welcome screen. Every interface has **Back to Welcome** in the dark bar at the top.

Optional: in VS Code, the "Live Server" extension gives auto-reload while editing.

Icons work offline (Lucide is bundled in `assets/vendor`). Fonts load from Google Fonts when online; offline they fall back to Segoe UI / Georgia.

## Folder structure

```
index.html              Welcome / interface selection screen
design-system.html      Colours, logo, type, buttons, forms, tables, modals
client/index.html       Client (customer) interface          → Phase 2
business/index.html     Business Owner interface              → Phase 3
employee/index.html     Employee interface                    → Phase 4
admin/index.html        Platform Administration interface     → Phase 5
assets/
  css/tokens.css        All colours, spacing, radius, shadows (light + dark)
  css/base.css          Reset, typography, focus styles, utilities
  css/components.css    Buttons, inputs, chips, badges, cards, tables, modal, toast
  css/layout.css        Demo bar, client header, bottom nav, dashboard sidebar
  css/welcome.css       Welcome screen only
  js/theme.js           Light/dark theme (localStorage + device preference)
  js/ui.js              Logo, toast, modal / bottom sheet, confirm dialog
  js/shell.js           Builds header / sidebar / mobile nav and page routing
  logo/logo-symbol.png  Supplied symbol logo
  vendor/lucide.min.js  Icon library
```

## Replacing the combination logo

The combination logo (symbol + brand name) has not been supplied yet, so a
placeholder is built from the symbol and the text "Beauty Salon".
To use the real file:

1. Copy it into `assets/logo/`, e.g. `assets/logo/logo-combination.png`.
2. In `assets/js/ui.js`, set `combination: "assets/logo/logo-combination.png"`.

## Theme

- First visit follows the device's light/dark setting.
- The moon / sun button switches theme; the choice is saved and applies to all four interfaces.

## Responsive targets

- Phone 320–767px: symbol logo, bottom navigation (client, employee) or slide-out menu (business, admin), bottom sheets.
- Tablet 768–1023px: combination logo in the client header, icon-only sidebar in dashboards.
- Desktop 1024px+: combination logo, full sidebar, wider layouts.

## Build phases

1. **Foundation**: done. Structure, design system, themes, logo handling, navigation, welcome screen.
2. Client interface
3. Business Owner interface
4. Employee interface
5. Platform Administration interface
6. Final review
