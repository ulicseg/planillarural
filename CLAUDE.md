# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Respondé siempre en español.

## What this is

Planilla Rural is a Django 5 web app for loading and managing livestock lots ("lotes") during a cattle auction ("remate"), with a map view of pens ("corrales"). Single Django app (`registros`), SQLite, deployed to PythonAnywhere via WSGI. UI language and domain vocabulary are Spanish (es-AR).

## Commands

```bash
# Activate venv first (Windows PowerShell): .\.venv\Scripts\Activate.ps1
python manage.py runserver              # dev server at 127.0.0.1:8000
python manage.py migrate
python manage.py test registros         # full test suite
python manage.py test registros.tests.RegistrosApiTests.test_guest_role_permissions   # single test
python manage.py check --deploy         # production sanity check
python manage.py collectstatic --noinput

# Domain-specific management commands (in registros/management/commands/):
python manage.py setup_operadores --password "<clave>"   # create/reset the 2 operator users
python manage.py limpiar_remate --force                  # wipe all Registro rows + sessions to prep a real auction

# Regenerate the compiled Tailwind CSS after adding new utility classes (requires Node):
npx tailwindcss@3 -c tailwind.config.js -i registros/static/registros/css/tailwind.src.css -o registros/static/registros/css/app.css --minify
```

CI runs the test suite, `check --deploy`, and `pip-audit` on every push to `main` and every PR (`.github/workflows/ci.yml`).

Required env vars (defaults are dev-only): `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `OPERADOR_USERNAMES`. See README.md for the full PythonAnywhere deploy walkthrough.

## Architecture

Layered: URL (`registros/urls.py`) → view (`registros/views.py`) → helpers (`registros/view_helpers.py`) → models (`registros/models.py`). Views stay thin; validation, normalization, and auth checks live in `view_helpers.py`. Put new business logic there, not in views.

Three domain models (`models.py`):
- **Remate** — an auction. Has `finalizado` flag. Most data is scoped to the active remate.
- **Registro** — a livestock lot assigned to a `corral`, belongs to a `Remate`.
- **PreferenciaRemateUsuario** — per-user "currently selected remate" (one-to-one). This is how the app knows which auction a user is working in; there is no global "active" auction.

**Active-remate resolution** drives almost every view. `get_remate_activo(user)` returns the user's selected remate, falling back to the most recent one. API endpoints return HTTP 409 ("Debes seleccionar un remate") when none resolves, and `index` redirects to the remates picker. Always scope `Registro` queries by the active remate (`Registro.objects.filter(remate=remate)`).

### Roles & auth

Two roles, no Django groups/permissions — role is derived from username:
- **Operador**: username is in `settings.OPERADOR_USERNAMES`. Full read/write. `is_operador(user)` is the single source of truth.
- **Invitado (guest)**: any other authenticated user. Read-only.

Enforcement is layered and must stay consistent across all three:
- `@require_api_login` decorator (`view_helpers.py`): rejects unauthenticated (401), and rejects non-GET methods from guests (403). Use this on all API views.
- Page POST views (`crear_remate`, `finalizar_remate`) check `is_operador` explicitly and return `HttpResponseForbidden`.
- The frontend shows forms/buttons to guests but intercepts writes with warning alerts — server-side checks are the real guard, the UI is cosmetic.

When adding a write endpoint, enforce the operator check server-side; never rely on the UI hiding controls.

### Corral layout & map

`corrales_layout.py` is static data derived from an Excel plan (`PLANO RURAL.xlsx`): `CORRALES_DISPONIBLES` (valid pen IDs) and `CORRALES_LAYOUT` (grid cells with row/col/span and `kind`: corral / pasillo / toril / pista). `MAP_ROWS`/`MAP_COLS` define the grid. Helpers in `view_helpers.py` (`build_layout_with_pasillos_numerados`, `get_pasillos_disponibles`, `normalize_corral`) turn this into the map served by `/api/corrales/mapa/`. Pasillos (aisles) are numbered dynamically (`PASILLO 1`, `PASILLO 2`...) and only accept a lote when the request sets `allowPasillo`. Corral `"1"` is the special TORIL.

### Image handling (the non-obvious part)

Lot photos ("marca") are stored as base64 data URLs inside `Registro.marca_imagen` (a TextField holding a JSON list of `{full, thumb}` objects). This is why `DATA_UPLOAD_MAX_MEMORY_SIZE` is raised to 100MB in settings.

To avoid shipping megabytes of base64 in list responses:
- `to_dict()` replaces image data with relative URLs (`/api/registros/<id>/foto/<i>/?thumb=1`); the actual bytes are served by `api_registro_foto`, which decodes base64 and returns an `image/*` response with a 1-day cache header.
- On write, `resolve_marca_imagen_list()` (`views.py`) parses incoming payloads: a payload field can be a raw `data:image/` URL (new upload) OR a reference URL like `/api/registros/<id>/foto/<i>/` (unchanged existing image), which it resolves by cloning the stored image data. Thumbnails are generated server-side via Pillow (`_make_thumbnail_data_url`, WEBP).

### Caching

List and detail GET endpoints use ETag/Last-Modified via `make_*_etag` + `apply_browser_cache_headers` + `etag_matches_request`, returning 304 when unchanged. `/api/registros/ultimos-cambios/` exposes a lightweight signature for the frontend to poll for changes.

### Frontend

No build step and no SPA framework. The ~2600 lines of vanilla JS live in `static/registros/js/app.js` (loaded by `index.html`); the UI markup is in `templates/registros/index.html` (with partials in `templates/registros/partials/`). The JS calls the JSON API directly. It's also a PWA (`manifest.webmanifest`, service worker at `/sw.js`).

`index.html` injects three server-side values the JS reads: `ES_OPERADOR` (role), `REMATE_ID` (active auction), and `REMATE_FINALIZADO` (whether the active remate is closed — drives a read-only banner and disables the form). A guest gets the `es-invitado` class on the shell for its desktop layout.

**Tailwind is pre-compiled, not the runtime CDN.** The CSS is generated once with `npx tailwindcss@3` (config in `tailwind.config.js`, input in `static/registros/css/tailwind.src.css`) and committed as `static/registros/css/app.css`, served via `{% static %}`. This keeps "no build step" at deploy time — regenerate locally and commit when you add new classes (see Commands). jsPDF and fonts still load from CDNs. Static assets: the app icon, `app.js`, and `app.css`.

**Offline (PWA):** the service worker serves the cached registro list via stale-while-revalidate. On an offline reload, `refreshAllData()` falls back to that cache instead of blanking the page, and write `fetch`es are wrapped so a network failure shows "Sin conexión …" instead of throwing.

## Project conventions

This repo uses an "AI governance" convention (see `AI-GOVERNANCE-SYSTEM.md`): domain rules live in `agents/<rol>/{agent.md,rules.md,templates.md}` and feature contracts in `agents/specs/*.spec.md`. `.github/instructions/copilot.instructions.md` asks to read the relevant `agents/` files before working in a domain, diagnose root cause before fixing bugs, run a verification step after changes, and use Conventional Commits. Recent git history follows Conventional Commits (`feat:`, `fix(ui):`, `perf:`).

Note: source files mix tabs (most `.py` files) and spaces (`config/settings.py`) — match the existing indentation of the file you're editing.
