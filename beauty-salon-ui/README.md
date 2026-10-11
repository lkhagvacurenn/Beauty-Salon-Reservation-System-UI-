# Bloom: Beauty Salon Reservation System UI prototype

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
  css/client.css        Client interface (home, salon cards, …)
  css/client-pages.css  Search + map, salon detail, booking flow
  js/theme.js           Light/dark theme (localStorage + device preference)
  js/ui.js              Logo, toast, modal / bottom sheet, confirm dialog
  js/shell.js           Builds header / sidebar / mobile nav and page routing
  js/client/data.js     Client demo data: salons, services, Discount Hours, ads
  js/client/data-extra.js  Branches, specialists, schedules, reviews, promo codes
  js/client/engine.js   Mock availability + price engine (slots, Discount Hour, promo)
  js/client/client.js   Home, favourites, simulated login, shared components
  js/client/discover.js Salon search + demo map + floating filter
  js/client/salon.js    Salon detail page
  js/client/booking.js  Booking flow (branch → service → specialist → time → review)
  js/client/pay.js      QPay-style deposit payment (demo QR, timer, statuses)
  js/client/account.js  My bookings (cancel, pay, review) and profile
  js/client/auth.js     Login, sign-up, email code, forgot password (UI only)
  css/business.css      Business Owner pages (dashboard, calendars, forms)
  js/business/biz-data.js      Demo store for the salon owner ("bloom-biz" in localStorage)
  js/business/biz-core.js      Shared helpers: status labels, charts, tables, modals, free slots, invoices
  js/business/biz-dashboard.js Dashboard
  js/business/biz-bookings.js  Bookings: list, day / week / month calendar, detail, new booking
  js/business/biz-salon.js     Salon info and branches (hours, images, IBAN)
  js/business/biz-services.js  Services (per-branch prices, deposit, cancellation)
  js/business/biz-employees.js Employees (schedule, breaks, days off, permissions)
  js/business/biz-marketing.js Promo codes, Discount Hour, reviews
  js/business/biz-finance.js   Reports (CSV export) and platform invoices
  css/employee.css      Employee pages (today, schedule, bookings, balance QR)
  js/employee/emp-core.js  Signed-in specialist, permissions, booking detail and status
  js/employee/emp-pages.js Today, My schedule, My bookings
  js/employee/emp-pay.js   Remaining balance payment (demo QR, timer, status check)
  css/admin.css         Platform Administration pages (on top of business.css)
  js/admin/adm-data.js     Admin demo store ("bloom-admin"): salons, applications, users, bookings, reviews, ads, activity
  js/admin/adm-core.js     Admin helpers + dashboard
  js/admin/adm-users.js    Users: search, filters, details, activate / deactivate
  js/admin/adm-salons.js   Salon applications (approve / reject), salon monitoring, suspend
  js/admin/adm-bookings.js Booking and payment monitoring (read-only)
  js/admin/adm-reviews.js  Review moderation (keep, hide, delete)
  js/admin/adm-ads.js      Ads: create / edit, image, link, placement, dates, active, preview
  js/admin/adm-invoices.js Fee rule, salon-wise monthly invoices, payment confirmation
  logo/logo-symbol.png  Supplied symbol logo
banks logo/             Bank app logos used on the client deposit payment page
  vendor/lucide.min.js  Icon library
```

## Logo

- Symbol logo: `assets/logo/logo-symbol.png` (the supplied flower image).
- Combination logo: the same flower + the "Bloom" wordmark written in HTML/CSS
  (see `UI.logo()` in `assets/js/ui.js`), so it follows light/dark theme.
- Phones show the symbol only; tablet and desktop show the combination logo.

## Salon photos

Salon photos are linked from Unsplash and only appear when you are online.
Offline (or if a photo fails), each card shows a soft pink gradient with an icon.
To use your own photos, put them in `assets/img/` and change the `photo`
value for each salon in `assets/js/client/data.js`.

## Theme

- First visit follows the device's light/dark setting.
- The moon / sun button switches theme; the choice is saved and applies to all four interfaces.

## Responsive targets

- Phone 320–767px: symbol logo, bottom navigation (client, employee) or slide-out menu (business, admin), bottom sheets.
- Tablet 768–1023px: combination logo in the client header, icon-only sidebar in dashboards.
- Desktop 1024px+: combination logo, full sidebar, wider layouts.

## Build phases

1. **Foundation**: done. Structure, design system, themes, logo handling, navigation, welcome screen.
2. Client interface (in progress: home, search + map, salon detail, booking flow, deposit payment, bookings, reviews, profile, login done; next: final client QA)
3. **Business Owner interface**: done. Dashboard, bookings (list + calendars), salon and branches, services, employees, promotions, reviews, reports, platform invoices.
4. **Employee interface**: done. Today, my schedule (day / week), my bookings, remaining balance QR. Uses the same data as the business owner.
5. **Platform Administration interface**: done. Dashboard, users, salon approval, bookings and payments, review moderation, ads, fee and invoices.
6. Final review

## Demo login

Email nomin.demo@bloom.mn, password Bloom2026. Email verification code: 123456.
To reset the demo data, clear the site's localStorage in the browser.

## Demo promo codes

BLOOM10, SARNAI15 (Төв салбар), ZAISAN5000 (Зайсан салбар), NOMIN20. Error examples: NAMAR20 (expired), TSETSEG5 (limit reached).

## Business Owner demo

Owner: Ганцэцэг Батсүх, Сарнай Бьюти Студио (same salon the client sees).
Platform fee rule (mock, set by the admin): first 50 completed bookings free for the salon's whole lifetime, then 100₮ per completed booking. Customers never pay it.
To reset the owner's demo data, remove "bloom-biz" from localStorage.

## Employee demo

Signed in as Хулан Б. (staff). The Today page has a demo switch to view the app as another specialist, for example Анужин Г. (manager) who can also see the whole branch's bookings and add days off.
Permissions come from Business Owner → Ажилтан → Эрх. Status changes and payments made here also show in the Business Owner interface.
The remaining balance QR is a clearly marked demo QR: "Төлбөр шалгах" says not paid on the first press and paid on the second.

## Platform Administration demo

Signed in as Админ Бат-Очир. Сарнай Бьюти Студио uses the Business Owner's data, so:
- a review the owner reports ("Админд мэдэгдэх") appears under Сэтгэгдэл хянах, and the admin's decision shows back on the owner's page;
- an invoice the owner marks "Төлсөн гэж мэдэгдэх" waits for the admin's confirmation under Шимтгэл ба нэхэмжлэх;
- the fee rule the admin saves (amount, free bookings, lifetime or monthly) is the one the owner sees.
Ads saved here appear in the client app: "Нүүр хуудасны баннер" on the home page, "Салон хайлтын жагсаалт" above search results, only while active and within their dates.
Approving, rejecting, suspending and deactivating only change demo statuses. No e-mails or notifications are sent.
To reset the admin demo data, remove "bloom-admin" from localStorage.
