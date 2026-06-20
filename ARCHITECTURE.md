# Arquitectura — Planilla Rural

> Documento de referencia técnica generado a partir del análisis del codebase.
> Describe **lo que el código realmente hace**, no lo que el nombre "remate" podría sugerir.

## Resumen en una línea

App web Django 5 (app única `registros`, SQLite) para **cargar y gestionar lotes de ganado durante un remate**, con vista de mapa de corrales. El frontend es una sola página de HTML+JS vanilla servida por Django que consume una API JSON interna. Es además una PWA instalable. Pensada para desplegarse en PythonAnywhere vía WSGI. Idioma y vocabulario de dominio: español (es-AR).

---

## 1. Arquitectura general

### Capas del backend

El backend sigue una arquitectura por capas estricta, con las vistas "delgadas":

```
URL (registros/urls.py)
  → Vista (registros/views.py)          ← solo orquestación HTTP
    → Helpers (registros/view_helpers.py) ← validación, normalización, auth, queries
      → Modelos (registros/models.py)     ← persistencia + serialización to_dict()
```

- **`config/`** — proyecto Django (settings, urls raíz, wsgi/asgi). `config/urls.py` solo monta `admin/` e incluye `registros.urls`.
- **`registros/`** — la única app de negocio. Contiene modelos, vistas, helpers, layout de corrales, comandos de management, migraciones, tests y todos los templates.
- **Regla de oro del repo:** la lógica de negocio (validación, normalización, chequeos de permisos, armado de queries) vive en `view_helpers.py`, **no** en las vistas. Las vistas solo parsean el request, llaman al helper y devuelven `JsonResponse`/`render`.

### Cómo se sirve el frontend

No hay build step, ni framework SPA, ni bundler. El frontend es:

- **Páginas HTML renderizadas por Django Templates:**
  - `index.html` — la UI principal; el markup vive acá y el JS (~2600 líneas) se carga desde `static/registros/js/app.js`.
  - `remates.html` — selector/gestor de remates.
  - `login.html` — login.
  - `base.html` — layout común de login/remates.
  - Parciales en `templates/registros/partials/`.
- **Tailwind pre-compilado:** el CSS se genera una vez con `npx tailwindcss@3` (config en `tailwind.config.js`) y se commitea en `static/registros/css/app.css`, servido vía `{% static %}`. **Ya no se usa el CDN runtime** (`cdn.tailwindcss.com`). Esto mantiene "sin build step" en deploy: el CSS viaja ya compilado; se regenera localmente al agregar clases nuevas.
- **CDNs externos restantes:** Google Fonts (Manrope) y jsPDF.
- **Assets estáticos:** el ícono de la app (`static/registros/icons/app-icon.svg`), `app.js` y `app.css`.
- **Flags inyectados por el template** que el JS lee: `ES_OPERADOR`, `REMATE_ID` y `REMATE_FINALIZADO` (este último activa un banner de solo-lectura y deshabilita el formulario cuando el remate está cerrado). A un invitado se le aplica la clase `es-invitado` en el shell para su layout de escritorio.
- **CI:** `.github/workflows/ci.yml` corre tests + `check --deploy` + `pip-audit` en cada push a `main` y cada PR.

### Cómo se comunican frontend y backend

El JS inline de `index.html` llama directamente a la API JSON con `fetch()`. Flujo típico:

1. Django renderiza `index.html` inyectando dos variables de plantilla en el JS:
   - `const ES_OPERADOR = {{ es_operador|yesno:"true,false" }};` (línea 714)
   - `const REMATE_ID = "{{ remate_activo.id }}";` (línea 715)
2. El JS hace `fetch` a los endpoints `/api/...` (GET para leer, POST/PUT/DELETE para escribir).
3. Las escrituras envían el header `X-CSRFToken` leído de la cookie (`getCookie("csrftoken")`).
4. Django valida en `view_helpers.py`, persiste en SQLite y responde JSON.
5. El frontend re-renderiza llamando a `refreshAllData()`.

**Endpoints API** (todos bajo `/api/`, ver `registros/urls.py`):

| Método | Ruta | Propósito |
|--------|------|-----------|
| GET/POST | `/api/registros/` | Listar (con `?q=` búsqueda) / crear lote |
| GET/PUT/DELETE | `/api/registros/<id>/` | Detalle / editar / borrar lote |
| GET | `/api/registros/ultimos-cambios/` | Firma liviana para detectar cambios (polling) |
| GET | `/api/registros/<id>/foto/[<index>]/` | Servir bytes de imagen (decodifica base64) |
| POST | `/api/registros/<id>/mover/` | Mover lote a otro corral |
| GET | `/api/corrales/mapa/` | Layout del mapa + ocupación |
| GET | `/api/corrales/<corral>/ocupacion/` | Detalle de ocupación de un corral |

**Resolución del remate activo** (clave en casi toda vista): `get_remate_activo(user)` devuelve el remate seleccionado por el usuario (vía `PreferenciaRemateUsuario`), con fallback al más reciente. Si no resuelve ninguno, los endpoints API devuelven **HTTP 409** ("Debes seleccionar un remate") y la página `index` redirige al selector de remates. Toda query de `Registro` se scopea por remate: `Registro.objects.filter(remate=remate)`.

### Roles y autenticación

Dos roles, **sin** usar grupos/permisos de Django — el rol se deriva del username:

- **Operador:** username está en `settings.OPERADOR_USERNAMES`. Lectura + escritura. `is_operador(user)` es la única fuente de verdad.
- **Invitado:** cualquier otro usuario autenticado. Solo lectura.

Enforcement en **tres capas que deben mantenerse consistentes**:
1. Decorador `@require_api_login` (`view_helpers.py:50`): rechaza no autenticados (401) y rechaza métodos no-GET de invitados (403).
2. Vistas POST de página (`crear_remate`, `finalizar_remate`): chequean `is_operador` explícitamente y devuelven `HttpResponseForbidden`.
3. Frontend: muestra formularios/botones a invitados pero intercepta las escrituras con alertas (`if (!ES_OPERADOR) { showMessage("...solo lectura...") }`). **Esto es cosmético** — el guard real es el servidor.

### Caching de la API

Endpoints GET de listado y detalle usan ETag/Last-Modified (`make_*_etag` + `apply_browser_cache_headers` + `etag_matches_request`), devolviendo **304** cuando no cambió nada. `/api/registros/ultimos-cambios/` expone una firma SHA1 liviana (total + último `updated_at`) que el frontend usa para decidir si recargar.

---

## 2. Cambio de vista mobile/desktop

**Qué lo determina:** es un **toggle manual del usuario**, NO una media query ni detección de dispositivo. Vive **100% en el frontend** (no hay nada en el backend al respecto).

- Estado persistido en `localStorage` bajo la clave `planillaDesktopView` (`"1"` = escritorio, `"0"` = móvil). Línea 812:
  ```js
  let desktopViewEnabled = localStorage.getItem("planillaDesktopView") === "1";
  ```
- El botón `toggleDesktopViewBtn` invoca `applyDesktopView(!desktopViewEnabled)` (línea 3026).
- `applyDesktopView(enabled)` (línea 1930):
  - Guarda la preferencia en `localStorage`.
  - Togglea clases CSS: `.desktop-view` (en `workspaceShell` y `appMain`) y `.desktop-body` (en `<body>`).
  - Cambia los límites de ancho de Tailwind: móvil usa `max-w-md`/`sm:max-w-xl`; escritorio usa `max-w-7xl`.
  - Re-ajusta el mapa al viewport (`fitMapToViewport()`).
- `setSection(section)` (línea 1906) usa el flag para decidir el layout de secciones:
  - **Móvil:** muestra una sección a la vez (Registros *o* Corrales), togglea `hidden`.
  - **Escritorio:** muestra ambas secciones simultáneamente y hace scroll suave a la activa.
- En el arranque, `applyDesktopView(desktopViewEnabled)` (línea 3332) aplica la preferencia guardada.

La diferencia visual entre modos está implementada con reglas CSS bajo selectores `body.desktop-body ...` y `.desktop-view ...` (definidas alrededor de las líneas 154–302 del `index.html`). El `<meta name="viewport">` es responsive estándar; el resto del responsive es Tailwind (`sm:`, `lg:`) más estas clases manuales.

---

## 3. Comportamiento PWA

La app es instalable y funciona parcialmente offline. Piezas:

### Manifest
- Template `registros/templates/registros/manifest.webmanifest`, servido por la vista `pwa_manifest` en la ruta `/manifest.webmanifest` con `Content-Type: application/manifest+json`.
- `display: standalone`, `start_url: /`, `scope: /`, ícono SVG `any maskable`, colores de tema (`#2f6e5a` / `#ece8dc`).

### Service Worker
- Template `registros/templates/registros/service-worker.js`, servido por `pwa_service_worker` en `/sw.js` con headers `Service-Worker-Allowed: /` y `Cache-Control: no-cache`.
- Registrado desde el frontend en `index.html:3338` (`navigator.serviceWorker.register("/sw.js")`).
- **Tres caches versionados:** `APP_CACHE` (app shell), `STATIC_CACHE` (estáticos), `API_CACHE` (respuestas de API).
- **App shell** precacheado en `install`: `/login/`, `/manifest.webmanifest`, el ícono. `skipWaiting()` al instalar; `clients.claim()` y limpieza de caches viejos en `activate`.

### Estrategias de caché (evento `fetch`)
- **Navegación (`mode === "navigate"`):** network-first; si falla, cae al cache de la request o al `/login/` cacheado.
- **API cacheable (`isApiCacheable`):** **stale-while-revalidate** — responde del cache al instante y refresca en segundo plano. Aplica a `/api/registros/...` y `/api/corrales/...`. **Excluye** explícitamente `ultimos-cambios` (debe ser siempre fresco para detectar cambios) y todo lo que no sea GET del mismo origen.
- **Estáticos (`/static/...` y el manifest):** cache-first con revalidación en background.
- **Invalidación en escrituras:** cualquier request no-GET a rutas `/api/` o `/remates/` dispara `caches.delete(API_CACHE)`, garantizando que tras una mutación el cache de API se reconstruya.

### Polling de cambios (no es realtime)
No hay WebSockets ni `setInterval`. La sincronización es **bajo demanda**: `refreshAllData()` se llama al inicio, al tocar "refrescar", y después de cada escritura. Primero pide `/api/registros/ultimos-cambios/`, compara la `signature` con `lastRegistrosSyncSignature` (persistida en `sessionStorage`) y solo recarga la lista completa si cambió. Esto evita transferir datos innecesariamente.

### Manejo offline
`ultimos-cambios` se excluye del caché del SW (debe ser fresco), así que en una recarga sin red ese `fetch` falla. `refreshAllData()` detecta ese caso (`OFFLINE_SENTINEL`) y, en vez de abortar, **degrada a leer la lista que el SW sí cacheó** (`/api/registros/`), evitando que la app quede vacía. Las escrituras (`fetch` POST/PUT/DELETE) están envueltas en try/catch que muestran "Sin conexión …" ante caída de red en lugar de lanzar un rechazo no capturado. Listeners `online`/`offline` avisan al usuario y re-sincronizan al volver la conexión.

---

## 4. Flujos de "remate" — aclaración importante

> **Esto NO es un sistema de subasta en vivo / pujas.** A pesar del nombre "remate", el código **no tiene** modelo de puja (bid), ni lógica de "ganador", ni timers de cuenta regresiva o cierre automático. Conviene aclararlo porque la intuición sobre "remates online" no aplica.

En este dominio, un **Remate** es simplemente un *evento de subasta ganadera* (un día de remate en un predio), y la app sirve para que los operadores **registren los lotes de animales y los ubiquen en corrales** durante ese evento. El martillero/sistema de pujas real ocurre fuera de esta app.

### Cómo se crea un remate
1. Operador entra a `/remates/` (`remates_home`), que lista remates abiertos y finalizados.
2. Envía el form a `/remates/nuevo/` → vista `crear_remate` (`views.py:229`).
3. La vista verifica `is_operador` (si no, `HttpResponseForbidden`), parsea `nombre`, `fecha` (formato `%Y-%m-%d`), `lugar`. Si no hay nombre, genera uno tipo `"Remate 2026-06"`.
4. En una transacción: crea el `Remate` y lo deja **seleccionado** para ese usuario vía `set_remate_seleccionado` (escribe en `PreferenciaRemateUsuario`).
5. Redirige a `home` (la UI principal, ya scopeada a ese remate).

### Cómo se "carga un lote" (el equivalente más cercano a una "puja")
No hay puja; la acción central es **dar de alta / editar un Registro (lote)**:
1. En `index.html`, el operador completa el form (corral, remitente, categoría, cantidad, estado, observaciones, fotos de marca).
2. `POST /api/registros/` → `api_registros` (`views.py:338`).
3. Validaciones en cadena: corral normalizado (`normalize_corral`), remitente obligatorio, categoría debe estar en `CATEGORIAS_PREDEFINIDAS`, estado validado por `parse_estado`.
4. Las fotos llegan como base64 y se procesan con `resolve_marca_imagen_list` (genera thumbnails WEBP server-side con Pillow).
5. Se crea el `Registro` ligado al remate activo y se devuelve `201` con el `to_dict`.
6. **Mover un lote de corral:** `POST /api/registros/<id>/mover/` → `api_registro_mover`, valida el corral destino y actualiza `registro.corral`.

### Cómo se "determina el ganador"
**No existe** tal concepto en el código. No hay campo de precio, de comprador ganador, ni de adjudicación. Si se necesitara, habría que modelarlo desde cero (no está implementado).

### Cómo se actualizan tiempos / cierre
- **No hay timers ni cierre automático.** El único mecanismo de "cierre" es **finalizar el remate manualmente**: `POST /remates/<id>/finalizar/` → `finalizar_remate` (`views.py:262`), que requiere operador, setea `finalizado = True` y graba `finalizado_at = timezone.now()`.
- Los timestamps automáticos de las entidades son `created_at` (`auto_now_add`) y `updated_at` (`auto_now`), usados para ordenar y para el caching por ETag/firma — no para lógica de subasta.
- Hay un comando para **resetear** entre remates reales: `python manage.py limpiar_remate --force` borra todos los `Registro` y todas las `Session`.

---

## 5. Base de datos y modelo

- **Motor:** SQLite (`db.sqlite3` en `BASE_DIR`). Configurado en `config/settings.py:88`. Una sola base, sin réplicas.
- **Migraciones:** `registros/migrations/0001` → `0003`.

### Entidades (`registros/models.py`)

```
Remate (1) ──< (N) Registro
   │
   └──< (N) PreferenciaRemateUsuario >── (1) User
```

**`Remate`** — un evento de subasta.
- `nombre`, `fecha` (opcional), `lugar`, `finalizado` (bool), `finalizado_at`, `created_at`, `updated_at`.
- Método `finalizar()` y `to_dict()`. Orden por `-created_at`.

**`Registro`** — un lote de ganado asignado a un corral. Es el corazón operativo.
- `remate` (FK, `SET_NULL`), `corral` (CharField), `remitente`, `categoria`, `cantidad`, `estado`, `observaciones`.
- `marca_imagen` (**TextField**): guarda una **lista JSON de objetos `{full, thumb}` con imágenes en base64 (data URLs)**. Por eso `DATA_UPLOAD_MAX_MEMORY_SIZE` se sube a 100MB en settings.
- `to_dict()` **no** devuelve los bytes: reemplaza las imágenes por URLs relativas (`/api/registros/<id>/foto/<i>/?thumb=1`) que sirve `api_registro_foto`, para no mandar megabytes de base64 en los listados.
- Helpers de imagen: `_make_thumbnail_data_url` (genera WEBP con Pillow) y `_parse_marca_images`.

**`PreferenciaRemateUsuario`** — "remate actualmente seleccionado" por usuario.
- `OneToOneField` a User, FK a `Remate` (`SET_NULL`), `updated_at`.
- Es **cómo la app sabe en qué remate trabaja cada usuario**: no hay un remate "activo global".

**Usuarios:** se usa el modelo `User` estándar de Django. Los operadores se crean/resetean con `setup_operadores --password` (exige exactamente 2 usernames en `OPERADOR_USERNAMES`).

### El manejo de imágenes (lo no obvio)
- **Escritura:** un campo de imagen en el payload puede ser un data URL `data:image/...` (subida nueva) **o** una URL de referencia `/api/registros/<id>/foto/<i>/` (imagen existente sin cambios). `resolve_marca_imagen_list` resuelve la referencia clonando los datos guardados.
- **Lectura:** `api_registro_foto` decodifica el base64 y responde con `Content-Type: image/*` y `Cache-Control: public, max-age=86400` (1 día).

---

## 6. Configuración para PythonAnywhere

### `config/wsgi.py` (el del repo)
Mínimo y estándar:
```python
import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()
```
`WSGI_APPLICATION = 'config.wsgi.application'` en settings.

> ⚠️ **Archivo crítico para el deploy.** En PythonAnywhere el archivo WSGI real es **otro** (el que provee PythonAnywhere en su panel), y debe ajustar `sys.path` para incluir el home del proyecto. El README documenta esa versión:
> ```python
> import os, sys
> project_home = "/home/tuusuario/planillarural"
> if project_home not in sys.path:
>     sys.path.insert(0, project_home)
> os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
> from django.core.wsgi import get_wsgi_application
> application = get_wsgi_application()
> ```

### Variables de entorno (defaults solo aptos para dev)
Leídas en `config/settings.py`:

| Variable | Uso | Default (dev) |
|----------|-----|---------------|
| `DJANGO_SECRET_KEY` | clave secreta | `dev-insecure-key-change-this` |
| `DJANGO_DEBUG` | `False` en prod | `True` |
| `DJANGO_ALLOWED_HOSTS` | hosts (coma) | `127.0.0.1,localhost` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | orígenes HTTPS confiables | derivado de ALLOWED_HOSTS |
| `OPERADOR_USERNAMES` | usernames operadores (coma) | `operador1,operador2` |
| `DATA_UPLOAD_MAX_MEMORY_SIZE` | límite payload | 100MB |

Cuando `DEBUG=False`, settings activa `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` y `SECURE_PROXY_SSL_HEADER` (para el proxy HTTPS de PythonAnywhere).

### Estáticos y paths
- `STATIC_URL = 'static/'`, `STATIC_ROOT = BASE_DIR / 'staticfiles'`.
- En PythonAnywhere: correr `collectstatic --noinput` y mapear `/static/` → `.../staticfiles` en la pestaña Web.
- Zona horaria `America/Argentina/Buenos_Aires`, idioma `es-ar`, `USE_TZ = True`.

### Secuencia de deploy (resumida del README)
1. Clonar repo, crear venv (`python3.11 -m venv .venv`), `pip install -r requirements.txt`.
2. Exportar variables de entorno.
3. `migrate` + `collectstatic --noinput` + `setup_operadores` + `limpiar_remate --force`.
4. Crear Web App (Manual config, Python 3.11), apuntar virtualenv, editar el WSGI del panel, mapear estáticos, **Reload**.
5. Smoke checks: login, CRUD de un registro, carga del mapa de corrales.

---

## 7. Los archivos más importantes

| # | Archivo | Por qué importa |
|---|---------|-----------------|
| 1 | `registros/views.py` | Todos los endpoints HTTP/API. Punto de entrada de cada request. Vistas delgadas que orquestan helpers. |
| 2 | `registros/view_helpers.py` | **El cerebro del backend.** Validación, normalización de corrales, auth (`is_operador`, `require_api_login`), resolución de remate activo, ocupación. La lógica de negocio vive acá. |
| 3 | `registros/models.py` | Las 3 entidades, el truco de imágenes base64 en `marca_imagen`, `to_dict()` con URLs livianas, thumbnails WEBP. |
| 4 | `registros/templates/registros/index.html` | **Toda la UI + ~2600 líneas de JS vanilla inline.** Frontend, llamadas a la API, toggle mobile/desktop, mapa con zoom/pan, polling, registro de SW. El archivo más grande y central del front. |
| 5 | `config/settings.py` | Configuración completa: DB, roles (`OPERADOR_USERNAMES`), límites de upload, flags de seguridad por `DEBUG`, i18n. (Ojo: indentado con espacios, a diferencia de los `.py` de la app que usan tabs.) |
| 6 | `registros/urls.py` | Mapa de rutas página + API. La referencia rápida de qué endpoints existen. |
| 7 | `registros/corrales_layout.py` | Datos estáticos del mapa (`CORRALES_DISPONIBLES`, `CORRALES_LAYOUT`, `MAP_ROWS/COLS`) derivados del Excel `PLANO RURAL.xlsx`. Define la geografía de corrales/pasillos/toril. |
| 8 | `config/wsgi.py` | Punto de entrada de producción. Crítico para PythonAnywhere (ver §6). |
| 9 | `registros/templates/registros/service-worker.js` | Lógica PWA: estrategias de caché (stale-while-revalidate para API, network-first para navegación), invalidación en escrituras. |
| 10 | `registros/templates/registros/manifest.webmanifest` | Hace la app instalable (servido como template para usar `{% static %}`). |
| 11 | `registros/templates/registros/base.html` | Layout común: carga de Tailwind/fuentes/jsPDF desde CDN, tema de colores, metadatos PWA/iOS. |
| 12 | `registros/templates/registros/remates.html` | Flujo de gestión de remates (crear, seleccionar, finalizar) — el punto de entrada antes de la UI operativa. |
| 13 | `registros/management/commands/limpiar_remate.py` | Resetea la base (borra Registros + Sessions) entre remates reales. Operación destructiva, exige `--force`. |
| 14 | `registros/management/commands/setup_operadores.py` | Crea/resetea los 2 operadores. Necesario en cada deploy. |
| 15 | `registros/tests.py` | Suite de tests (428 líneas) — incluye chequeos de permisos de invitado/operador. Red de seguridad para cambios en la lógica de auth y CRUD. |

### Otros directorios notables
- **`agents/`** + **`AI-GOVERNANCE-SYSTEM.md`** + **`.github/instructions/copilot.instructions.md`** — convención de "gobernanza AI" del repo: reglas de dominio por rol (`agents/<rol>/{agent,rules,templates}.md`) y contratos de features (`agents/specs/*.spec.md`). Pide leer los `agents/` relevantes antes de tocar un dominio, diagnosticar causa raíz antes de arreglar bugs, verificar tras cambios y usar Conventional Commits.

---

## Convenciones del proyecto (para tener en cuenta)

- **Indentación mixta:** la mayoría de los `.py` de la app usan **tabs**; `config/settings.py` usa **espacios**. Hay que respetar el estilo del archivo que se edita.
- **Conventional Commits:** el historial usa `feat:`, `fix(ui):`, `perf:`, etc.
- **Idioma:** UI, dominio y mensajes en español (es-AR).
- **Sin build step:** no tocar buscando `package.json`/webpack — no existen. Todo el front es template + CDN + JS inline.
