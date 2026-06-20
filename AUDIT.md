# Auditoría técnica — Planilla Rural

> Auditoría exhaustiva del codebase buscando problemas no detectados.
> Fecha: 2026-06-15. Basada en lectura directa del código (no se ejecutó análisis dinámico).
> Para cada hallazgo: **archivo:línea · severidad · por qué · sugerencia** (sin implementar).

## Aclaración previa importante (afecta varias preguntas del pedido)

El pedido asume un **sistema de pujas en vivo** (race conditions en pujas, cierre por tiempo, montos, ganador). **Ese sistema no existe en el código.** No hay modelo de puja/bid, ni campo de monto/precio, ni ganador, ni timers de cierre. Un `Remate` es un evento; un `Registro` es un lote de ganado en un corral. Por lo tanto:

- **"Race conditions en pujas"** → no aplica (no hay pujas). Sí analizo las concurrencias reales que sí existen (ocupación de corral, preferencia de remate, finalización).
- **"Cierre por tiempo / reinicio antes del cierre"** → no aplica (el cierre es manual, no por timer). Ver hallazgo SEC/LOG sobre finalización.
- **"Validaciones de montos"** → no aplica (no hay montos). Sí analizo validaciones de fecha, cantidad, corral, estado.
- **"Puja con datos manipulados"** → lo reinterpreto como **alta/edición de Registro con payload manipulado** desde el cliente.

---

## 🟥 CRÍTICO

### C-1 · Defaults inseguros de `SECRET_KEY` y `DEBUG` sin fail-fast
**`config/settings.py:28,31`** · Crítico (configuración)
```python
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-insecure-key-change-this')
DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() == 'true'
```
**Por qué:** si en producción (PythonAnywhere) **no** se define la variable de entorno, la app arranca igual con una `SECRET_KEY` pública conocida (firma de sesiones/CSRF comprometida → secuestro de sesión, forja de cookies) y/o con `DEBUG=True` (que expone tracebacks, settings, y bypassa `ALLOWED_HOSTS`). El deploy depende 100% de que un humano recuerde exportar las variables; no hay red de seguridad. Las variables se exportan en una shell Bash (README §deploy) y es fácil que no persistan tras reiniciar la consola/web app.
**Sugerencia:** en producción (`DEBUG=False`) hacer *fail-fast*: si `SECRET_KEY` es el default o `DEBUG` no fue seteada explícitamente, lanzar `ImproperlyConfigured` al iniciar. Validar con `python manage.py check --deploy` en el pipeline de deploy y documentar persistencia de env vars (ej. archivo `.env` cargado por el WSGI, no `export` en shell efímera).

### C-2 · `DATA_UPLOAD_MAX_MEMORY_SIZE = 100 MB` → DoS por memoria
**`config/settings.py:157`** · Crítico (disponibilidad)
```python
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv('DATA_UPLOAD_MAX_MEMORY_SIZE', 100 * 1024 * 1024))
```
**Por qué:** cada request puede cargar hasta 100 MB en memoria, y el cuerpo se parsea entero (`json.loads(request.body)` en `parse_json_body`) **antes** de validar nada. En PythonAnywhere (tiers con poca RAM y pocos workers) bastan unas pocas requests concurrentes de un usuario autenticado (operador *o* invitado, porque el body se lee antes del check de método) para agotar memoria y tumbar el proceso. Además las imágenes se guardan como base64 dentro de una fila de SQLite (`Registro.marca_imagen` TextField), inflando la DB y la RAM en cada `to_dict`/lectura.
**Sugerencia:** bajar el límite a un valor realista por request (p. ej. 8–12 MB), limitar el número/peso de imágenes en `resolve_marca_imagen_list`, y a mediano plazo mover las imágenes a `ImageField`/almacenamiento de archivos en vez de base64 en la DB. Considerar validar `Content-Length` antes de leer el body.

### C-3 · Doble handler de click en `cardsContainer` → ejecución duplicada de acciones
**`registros/templates/registros/index.html:2454` y `:2735`** · Crítico (corrección funcional)
**Por qué:** hay **dos** `cardsContainer.addEventListener("click", async …)` registrados. Ambos hacen `event.target.closest("button[data-action]")` y ambos manejan `edit` y `add-photo`. En un click sobre "editar", `setEditState(registro)` corre **dos veces**; sobre "agregar foto", `openCameraCapture(...)` se dispara dos veces (puede abrir la cámara/selector dos veces). El borrado lo maneja solo el handler de 2454 (el de 2735 no tiene rama `delete`), así que el comportamiento es inconsistente según la acción. Es un bug latente fácil de pasar por alto porque "parece" funcionar.
**Sugerencia:** unificar en **un solo** listener delegado en `cardsContainer` que maneje `data-image-open` + todas las `data-action`. Eliminar el segundo registro. Auditar de paso que `renderCards()` no dependa de que el handler esté duplicado.

---

## 🟧 IMPORTANTE

### I-1 · N+1 queries al serializar listados de registros
**`registros/models.py:152-153`** (acceso a `self.remate.nombre` / `self.remate.finalizado`) disparado desde **`registros/views.py:366`** y **`registros/view_helpers.py:208,216-220`** · Importante (performance)
**Por qué:** `to_dict()` accede a `self.remate.*`. Las listas se arman con `[item.to_dict() for item in registros]` sobre un queryset que **no** usa `select_related("remate")`. Resultado: 1 query por el listado + 1 query extra por cada registro para traer su `Remate`. Con un remate cargado de cientos de lotes, la lista (`/api/registros/`), la ocupación (`get_ocupacion_detalle`) y el mapa se vuelven lentos. Como el remate es el mismo para todos (ya está scopeado), las queries son redundantes.
**Sugerencia:** `Registro.objects.filter(remate=remate).select_related("remate")` en `api_registros`, `api_registro_detail`, `get_ocupacion_corrales` y `get_ocupacion_detalle`. Alternativamente, como el `remate` ya se resolvió en la vista, pasarlo a `to_dict()` para evitar el acceso lazy del todo.

### I-2 · Imágenes privadas servidas con `Cache-Control: public`
**`registros/views.py:322,330`** · Importante (seguridad/privacidad)
```python
response["Cache-Control"] = "public, max-age=86400"
```
**Por qué:** `api_registro_foto` está detrás de `@require_api_login` (contenido privado), pero responde `public`. Proxies intermedios y caches compartidos pueden almacenar y reservir las fotos de marca a otros usuarios. En el contexto PWA, además, queda en caches que no distinguen sesión.
**Sugerencia:** usar `Cache-Control: private, max-age=86400`. Si se quiere invalidación correcta, agregar `ETag` basado en `registro.updated_at` (ya se usa el patrón en otros endpoints).

### I-3 · El service worker cachea páginas autenticadas (rol/remate "horneados")
**`registros/templates/registros/service-worker.js:73-89`** · Importante (corrección/seguridad)
**Por qué:** las navegaciones se cachean en `APP_CACHE` (`cache.put(request, copy)`). Pero `index.html` incrusta en el JS valores server-side: `ES_OPERADOR` y `REMATE_ID` (`index.html:714-715`). Si el usuario cambia de remate, cambia de rol, o cierra sesión, una navegación offline (o servida desde cache) puede devolver una página con **otro remate o el rol equivocado**. Un invitado podría ver la UI con `ES_OPERADOR=true` cacheada de una sesión previa de operador en el mismo dispositivo (los chequeos del servidor siguen protegiendo las escrituras, pero la UI miente y el `REMATE_ID` puede apuntar a un remate ajeno).
**Sugerencia:** no cachear respuestas de navegación autenticadas, o servir el shell sin datos de sesión y resolver `ES_OPERADOR`/`REMATE_ID` vía un endpoint `/api/` (no cacheable). Como mínimo, limpiar `APP_CACHE` en logout (hoy solo se borra `API_CACHE` en escrituras a `/api/` y `/remates/`).

### I-4 · `fetch()` sin manejo de fallo de red → la app "se cuelga" offline
**`registros/templates/registros/index.html`** — múltiples: `:1274`, `:1300`, `:2005`, y los `fetch` de escritura (`:2499`, `:2684`, `:2769`, etc.) · Importante (UX mobile/offline)
**Por qué:** el código maneja `response.json().catch(...)` y `!response.ok`, pero **no** envuelve el `fetch` en sí en try/catch. Si la red cae (caso común en mobile en el campo) y el SW no tiene respuesta en cache, `fetch` **rechaza** y la promesa de `refreshAllData()`/handlers queda sin capturar → no se muestra mensaje al usuario, la acción queda a medias y puede quedar un spinner colgado. `fetchRegistrosSyncMeta` (`:2004`) hace `fetch` directo sin red de seguridad.
**Sugerencia:** envolver cada `fetch` en try/catch (o un wrapper `apiFetch()` único) que detecte error de red, muestre "Sin conexión, reintentá" y deje la UI en estado consistente. Es especialmente relevante dado que la app es PWA mobile.

### I-5 · Regla CSS `.es-invitado` muerta: layout de invitado nunca se aplica
**`registros/templates/registros/index.html:228`** · Importante (UI, inconsistencia mobile/desktop)
```css
.desktop-view.es-invitado #registrosSection { ... }
```
**Por qué:** existe la regla que ajusta el layout de escritorio para invitados, pero **no hay ningún `classList.add("es-invitado")`** en todo el JS (confirmado por búsqueda). La clase nunca se aplica al `body`/shell, así que el invitado en modo escritorio ve un layout pensado para operador (con espacio para controles que no puede usar). Es justamente el tipo de "diferencia de comportamiento mobile/desktop que no debería existir" que pedías revisar.
**Sugerencia:** aplicar `es-invitado` al contenedor cuando `!ES_OPERADOR` (en `applyDesktopView`/init), o eliminar la regla si ya no se usa. Decidir cuál es el comportamiento correcto y dejarlo consistente entre modos.

### I-6 · Sin configuración de `LOGGING` → errores invisibles en producción
**`config/settings.py` (ausencia)** · Importante (observabilidad)
**Por qué:** no hay bloque `LOGGING`. Combinado con los `except Exception` silenciosos (ver sección Errores silenciosos) y con `DEBUG=False`, los fallos en producción no dejan rastro útil. Si una imagen no decodifica, si un payload se trunca, o si el thumbnail falla, nadie se entera. En PythonAnywhere los errores irían al server log genérico, pero sin contexto.
**Sugerencia:** definir `LOGGING` con un handler a archivo/console y nivel `WARNING`+, y loguear explícitamente en los `except` de manejo de imágenes y parsing (ver E-1…E-4).

---

## 🟨 MENOR

### M-1 · Concurrencia en `finalizar_remate` (idempotente pero sin lock)
**`registros/views.py:262-272`** · Menor
**Por qué:** dos operadores finalizando el mismo remate a la vez hacen read-then-write sin `select_for_update`. El efecto es benigno (ambos setean `finalizado=True`; `finalizado_at` podría sobrescribirse con el segundo timestamp), pero no es atómico.
**Sugerencia:** si la marca de tiempo de cierre importa, usar `Remate.objects.filter(id=…, finalizado=False).update(finalizado=True, finalizado_at=now)` (atómico) en lugar de read-modify-save.

### M-2 · Concurrencia/duplicado en `PreferenciaRemateUsuario`
**`registros/view_helpers.py:27-29`** · Menor
**Por qué:** `get_or_create(usuario=usuario)` bajo dos requests simultáneas del mismo usuario (p. ej. dos pestañas) podría intentar crear dos filas; el `OneToOneField` lo previene a nivel DB (IntegrityError) pero no se captura, podría devolver 500 en un caso de carrera muy puntual.
**Sugerencia:** envolver en try/except IntegrityError con reintento de `get`, o usar `update_or_create`.

### M-3 · `CSRF_TRUSTED_ORIGINS` incluye localhost incluso en producción
**`config/settings.py:38-40`** · Menor
**Por qué:** cuando no se setea `DJANGO_CSRF_TRUSTED_ORIGINS`, el fallback agrega siempre `http://127.0.0.1` y `http://localhost`. En producción son orígenes innecesarios en la lista de confianza.
**Sugerencia:** agregar localhost solo cuando `DEBUG=True`.

### M-4 · `API_CACHE` versionado en `v1` mientras el resto está en `v2`
**`registros/templates/registros/service-worker.js:1-3,22-24`** · Menor
**Por qué:** `APP_CACHE`/`STATIC_CACHE` son `…-v2` pero `API_CACHE` quedó en `…-v1` y `activate` lo preserva. Si la forma de las respuestas de API cambia, los clientes pueden seguir sirviendo respuestas viejas (stale-while-revalidate igual refresca, pero la primera lectura tras un deploy puede ser obsoleta).
**Sugerencia:** versionar las tres caches juntas y bumpearlas en cada release que cambie contratos.

### M-5 · `index.html` ~3350 líneas con todo el JS inline, sin minificar
**`registros/templates/registros/index.html`** · Menor (performance/mantenibilidad)
**Por qué:** ~2600 líneas de JS viajan inline en cada navegación (no se cachea como asset separado; el HTML cacheado por el SW arrastra rol/remate, ver I-3). Tailwind se carga desde el CDN de runtime (`cdn.tailwindcss.com`), que está pensado para desarrollo, no producción (compila CSS en el cliente en cada carga).
**Sugerencia:** extraer el JS a `static/` (cacheable, versionable), y usar Tailwind compilado (CLI/build) en lugar del CDN de runtime. Evaluado como menor por el alcance del proyecto, pero impacta la carga inicial en mobile.

### M-6 · Búsqueda con `icontains` sin índices
**`registros/views.py:347-359`** · Menor (performance)
**Por qué:** la búsqueda hace `OR` de 5 `icontains` sobre campos sin índice. En SQLite con muchos registros, son table scans. Hoy el volumen por remate probablemente sea bajo, por eso es menor.
**Sugerencia:** si el volumen crece, agregar índices o FTS de SQLite. Monitorear.

---

## Validaciones (alta/edición de Registro con datos manipulados)

**Estado general: razonablemente robusto.** El servidor revalida todo lo que importa, sin confiar en el cliente:
- `corral` → `normalize_corral` valida contra `CORRALES_DISPONIBLES`/pasillos (`view_helpers.py:182`).
- `categoria` → debe estar en `CATEGORIAS_PREDEFINIDAS` (`views.py:386`).
- `estado` → `parse_estado` valida contra mapa predefinido (`view_helpers.py:100`).
- `cantidad` → `parse_cantidad` fuerza entero ≥ 0 o `None` (`view_helpers.py:71`).
- `fecha` de remate → parseada con formato estricto (`views.py:238`).
- Escrituras de invitado → bloqueadas server-side por `require_api_login` (403).

Hallazgos puntuales:

### V-1 · `remitente` y `observaciones` sin límite de longitud en la validación
**`registros/views.py:378,398`** · Menor
**Por qué:** `remitente` se guarda en `CharField(max_length=140)` pero la vista no trunca/valida; un payload con 10.000 chars provocaría error de DB (o truncado silencioso según backend) en vez de un 400 claro. `observaciones` es TextField (sin tope). No es crítico pero es validación faltante.
**Sugerencia:** validar longitudes máximas en la vista y devolver 400 con mensaje claro.

### V-2 · `allowPasillo` permite al cliente habilitar pasillos saltando la UI
**`registros/views.py:376`, `view_helpers.py:182-198`** · Menor (por diseño, documentar)
**Por qué:** el checkbox "habilitar pasillos" está deshabilitado para invitados en la UI, pero `allowPasillo` viene del payload. Un invitado no puede escribir igual (403), así que no hay impacto real; pero para un operador, la "regla" de activar pasillos en la UI es puramente cosmética (puede mandar `allowPasillo:true` siempre). Es consistente con la filosofía "UI cosmética, servidor manda", pero conviene tenerlo explícito.
**Sugerencia:** ninguna acción urgente; documentar que `allowPasillo` es decisión del cliente y el servidor solo valida que el pasillo exista.

---

## Seguridad — resumen

| Área | Estado |
|------|--------|
| **Endpoints sin auth** | ✅ OK. Todos los `/api/` usan `@require_api_login`. Las vistas de página usan `@login_required`. Públicos a propósito: `/login/`, `/manifest.webmanifest`, `/sw.js`, `/[]` (204). Correcto. |
| **SQL injection** | ✅ No detectada. Todo usa el ORM con `Q()` y filtros parametrizados; `query.isdigit()` antes de `int()`. No hay `raw()`/`extra()`/f-strings en SQL. |
| **Secrets hardcodeados** | ⚠️ Ver **C-1**. No hay credenciales reales en el repo (SQLite sin password, sin API keys), pero los **defaults inseguros** de `SECRET_KEY`/`DEBUG` son el riesgo. |
| **CORS** | ✅ No hay `django-cors-headers` ni `Access-Control-Allow-Origin`; la API es same-origin y se apoya en sesión + CSRF. Correcto para esta arquitectura (no es API pública). |
| **CSRF** | ✅ `CsrfViewMiddleware` activo, sin `@csrf_exempt`; el front manda `X-CSRFToken`. OK. |
| **Cookies seguras** | ✅ `SESSION/CSRF_COOKIE_SECURE` y `SECURE_PROXY_SSL_HEADER` se activan con `DEBUG=False`. Falta `SECURE_HSTS_SECONDS`, `SECURE_SSL_REDIRECT` (menor). |

### S-1 · Faltan headers de hardening en producción
**`config/settings.py:148-151`** · Menor
**Por qué:** con `DEBUG=False` se activan cookies seguras y el proxy SSL header, pero no `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`. `python manage.py check --deploy` los marcaría.
**Sugerencia:** agregarlos bajo el bloque `if not DEBUG:`.

---

## Errores silenciosos

### E-1 · `_make_thumbnail_data_url` traga toda excepción y devuelve el original
**`registros/models.py:98-99`** · Importante
```python
except Exception:
    return data_url
```
**Por qué:** si Pillow falla (imagen corrupta, formato raro, OOM), se devuelve la imagen full como "thumbnail" sin avisar. Resultado: thumbnails que en realidad son imágenes de tamaño completo → listados pesadísimos (anula la optimización de `to_dict`) y nadie se entera de por qué la app está lenta.
**Sugerencia:** loguear el error (con `logging.exception`) y, si se quiere, marcar el item como sin-thumbnail en vez de devolver el full silenciosamente.

### E-2 · `_parse_marca_images` cae a string crudo ante JSON inválido
**`registros/models.py:107-110`** · Menor
**Por qué:** `except Exception: parsed = self.marca_imagen` — si el campo tiene JSON corrupto, se reinterpreta como string suelto sin loguear. Puede enmascarar corrupción de datos.
**Sugerencia:** loguear cuando el parseo falla.

### E-3 · `resolve_marca_imagen_list` ignora errores de parseo de payload
**`registros/views.py:120-122`** · Menor
**Por qué:** `except Exception: raw_items = [payload_value]` — si el cliente manda algo inesperado, se procesa como si fuera una sola imagen, sin señal.
**Sugerencia:** loguear y/o devolver 400 ante payload no parseable.

### E-4 · `api_registro_foto` convierte fallos de decodificación en 404 genérico
**`registros/views.py:324-325,332-333`** · Menor
**Por qué:** un `base64.b64decode` que falla (dato corrupto en DB) se reporta como "foto no encontrada" (404). El operador no distingue "no hay foto" de "la foto está corrupta", y no queda log de la corrupción.
**Sugerencia:** loguear la excepción real; opcionalmente devolver 422/500 para señalar corrupción vs ausencia.

### E-5 · Registro del service worker falla en silencio
**`registros/templates/registros/index.html:3340-3342`** · Menor
**Por qué:** `.catch(() => {})` — si el SW no se registra (la PWA no funciona offline), no hay ninguna señal ni en consola.
**Sugerencia:** al menos `console.warn` del error para diagnóstico.

---

## Memory leaks / recursos (JS)

**Estado general: bajo riesgo.** Es una SPA-de-una-página que nunca se desmonta; los listeners se registran una sola vez a nivel top-level (no dentro de `renderCards`/loops), y **no hay `setInterval`** (la sincronización es bajo demanda). Eso elimina las dos fuentes clásicas de leak.

Observaciones:
- **L-1 · `window`-level mousemove/mouseup duplicados** — `index.html:1016,1028` (pan del mapa) y `:3097,:3106` (zoom de imagen) agregan listeners globales de `mousemove`/`mouseup` que quedan vivos toda la sesión. No es un leak creciente (cantidad fija), pero filtran eventos globales permanentemente. **Menor.** Sugerencia: agregar `mousemove`/`mouseup` solo mientras hay drag activo y removerlos en `mouseup`.
- **L-2 · `document.addEventListener('focus', …)`** en `index.html:3209` — listener de captura global que nunca se remueve. Menor; revisar que no se re-registre.
- El doble handler de C-3 también implica trabajo duplicado por click (no es leak, es ejecución redundante).

---

## Performance — resumen

- **N+1** → ver **I-1** (el más impactante).
- **Assets** → ver **M-5** (JS inline sin minificar + Tailwind CDN de runtime) y **C-2** (imágenes base64 en DB).
- **Búsqueda** → ver **M-6**.
- **`/api/corrales/mapa/`** reconstruye el layout completo y recalcula ocupación en cada llamada (`views.py:478-495`); el layout es estático y podría cachearse en memoria del proceso. **Menor.**

---

## Tabla resumen

| ID | Severidad | Área | Archivo:línea |
|----|-----------|------|---------------|
| C-1 | 🟥 Crítico | Seguridad/config | settings.py:28,31 |
| C-2 | 🟥 Crítico | DoS/memoria | settings.py:157 |
| C-3 | 🟥 Crítico | Bug funcional | index.html:2454,2735 |
| I-1 | 🟧 Importante | Performance (N+1) | models.py:152 · views.py:366 · view_helpers.py:208,216 |
| I-2 | 🟧 Importante | Privacidad/cache | views.py:322,330 |
| I-3 | 🟧 Importante | SW/seguridad | service-worker.js:73-89 |
| I-4 | 🟧 Importante | Offline/UX | index.html (fetch sin catch) |
| I-5 | 🟧 Importante | UI mobile/desktop | index.html:228 |
| I-6 | 🟧 Importante | Observabilidad | settings.py (sin LOGGING) |
| M-1 | 🟨 Menor | Concurrencia | views.py:262-272 |
| M-2 | 🟨 Menor | Concurrencia | view_helpers.py:27-29 |
| M-3 | 🟨 Menor | Config CSRF | settings.py:38-40 |
| M-4 | 🟨 Menor | SW versionado | service-worker.js:1-3 |
| M-5 | 🟨 Menor | Assets | index.html (global) |
| M-6 | 🟨 Menor | Performance | views.py:347-359 |
| V-1 | 🟨 Menor | Validación | views.py:378,398 |
| V-2 | 🟨 Menor | Diseño | views.py:376 |
| S-1 | 🟨 Menor | Hardening | settings.py:148-151 |
| E-1 | 🟧 Importante | Error silencioso | models.py:98 |
| E-2..E-5 | 🟨 Menor | Error silencioso | models.py:107 · views.py:120,324 · index.html:3340 |
| L-1, L-2 | 🟨 Menor | Listeners JS | index.html:1016,1028,3097,3106,3209 |

## Prioridad sugerida de remediación
1. **C-1, C-2** — riesgo de seguridad/disponibilidad en producción, bajo esfuerzo.
2. **C-3** — bug funcional concreto, fácil de arreglar.
3. **I-1, I-2, I-3, I-4** — performance, privacidad y robustez offline (impacto directo en el uso real mobile en el campo).
4. **I-6 + E-1** — visibilidad de errores antes de seguir.
5. El resto (menores) según se vaya tocando cada zona.

---

# Hallazgos visuales (navegación en vivo)

> Auditoría dinámica ejecutada el 2026-06-15 levantando el proyecto localmente y navegándolo con un navegador real (Playwright), en modo escritorio y móvil, como usuario **operador**.

## Setup necesario para levantarlo (hallazgo de entorno)
La DB local (`db.sqlite3`) estaba en un estado **previo a la migración 0002**: la tabla `registros_remate` no existía y la app crasheaba al consultar remates. Para poder correrla hubo que:
- `migrate` (aplicó `0002` y `0003`),
- resetear la clave de los operadores (`setup_operadores --password`) — quedó `operador1` / `TestRemate2026` (valor de prueba, cambialo),
- crear 2 remates (uno abierto "Remate Junio 2026" con ~420 cabezas, uno cerrado) y sembrar lotes.

Las capturas referenciadas (`01-…png` … `08-…png`) quedaron en la raíz del repo.

---

# Dependencias

> Análisis ejecutado el 2026-06-15 con `pip-audit` (OSVM/PyPI Advisory DB) sobre el entorno virtual del proyecto.
> Herramienta: `pip-audit` instalada temporalmente, desinstalada tras el análisis.
> **`requirements.txt` declara solo 2 paquetes:** `Django==5.2.3` y `Pillow==12.2.0`.

---

## 🟥 CRÍTICO

### DEP-1 · Django 5.2.3 tiene 45 vulnerabilidades de seguridad conocidas — actualizar a 5.2.15
**`requirements.txt`** · Crítico (seguridad)

`pip-audit` encontró 45 registros contra Django 5.2.3. Las más relevantes para este proyecto (SQLite, sin PostGIS, sin autenticación HTTP vía mod_wsgi):

| ID | Fix | Descripción |
|----|-----|-------------|
| PYSEC-2025-108 | 5.2.8 | **SQL injection** vía argumento `_connector` en `QuerySet.filter()`, `.exclude()` y `.get()` — afecta cualquier backend incluyendo SQLite |
| PYSEC-2025-105 | 5.2.6 | **SQL injection** en `FilteredRelation` + `QuerySet.annotate()`/`alias()` vía expansión de kwargs — backend-agnóstico |
| PYSEC-2025-107 | 5.2.8 | **DoS** por normalización NFKC lenta en `HttpResponseRedirect` con entrada Unicode de muchos caracteres — relevante en Windows (entorno dev) |
| CVE-2025-59682 | 5.2.7 | **Directory traversal parcial** en `django.utils.archive.extract()` (usado por `startapp/startproject --template`) |
| PYSEC-2026-42  | 5.2.11 | **Enumeración de usuarios** vía timing attack en `check_password()` de `mod_wsgi` — PythonAnywhere corre Apache+mod_wsgi, aunque este proyecto usa autenticación de sesión, no HTTP auth |
| PYSEC-2026-201 | 5.2.15 | **Cache-Control** no comparado case-insensitive en `UpdateCacheMiddleware` → respuestas cacheadas incorrectamente leíbles por terceros |

CVEs menos relevantes para este proyecto (solo afectan MySQL/MariaDB o PostGIS): PYSEC-2025-106, PYSEC-2025-104, PYSEC-2026-44, PYSEC-2026-46, entre otros.

**Por qué:** Django 5.2 LTS está soportado hasta abril 2028 — no es necesario saltar a 6.x. Pero la versión pinneada está 12 patches atrás y acumula vulns de inyección SQL confirmadas.

**Sugerencia:** cambiar `requirements.txt` a `Django==5.2.15` y desplegar. El upgrade de patch dentro de la serie 5.2 no tiene breaking changes. Verificar con `python manage.py check --deploy` tras actualizar. Agregar `pip-audit` al proceso de deploy o CI.

---

## 🟨 MENOR

### DEP-2 · `openpyxl` instalado en el venv pero no declarado en `requirements.txt` y sin uso en runtime
**`(venv local)`** · Menor (orden)

`openpyxl 3.1.5` (y su dependencia `et_xmlfile 2.0.0`) están instalados en el venv pero **no aparecen en `requirements.txt`** y **no hay ningún `import openpyxl` en el código**. El comentario en `registros/corrales_layout.py:1` confirma que el archivo fue *derivado* del Excel de plano, pero la lectura de ese archivo ya no ocurre en runtime — `corrales_layout.py` es puro Python estático.

**Por qué:** no es un riesgo de seguridad en producción (pip install -r requirements.txt no lo instala en PythonAnywhere), pero confunde a futuros contribuidores sobre qué es realmente necesario, y puede generar discrepancias entre el venv local y el entorno de deploy.

**Sugerencia:** `pip uninstall openpyxl et_xmlfile -y` para limpiar el venv local. Si en algún momento se necesita regenerar `corrales_layout.py` desde el Excel, usar un script de utilidad separado (no parte del proyecto) o documentarlo en el README como herramienta de desarrollo puntual.

### DEP-3 · `pip` del venv tiene 5 vulnerabilidades propias (menor impacto operativo)
**`(venv local)`** · Menor (tooling)

`pip 25.0.1` tiene CVEs conocidos (path traversal en extracción de wheels, tar/ZIP ambiguo, importación prematura de módulos recién instalados). Ninguno afecta el runtime de la app, pero sí pueden afectar la seguridad del proceso de instalación de dependencias.

**Sugerencia:** `python -m pip install --upgrade pip` para llevar a `26.1.2+`. Bajo costo, cero riesgo de breaking change.

---

## Resumen de dependencias

| Paquete | Versión actual | Última | Estado |
|---------|---------------|--------|--------|
| Django | 5.2.3 | **5.2.15** | 🟥 45 CVEs — actualizar |
| Pillow | 12.2.0 | 12.2.0 | ✅ Al día |
| openpyxl | 3.1.5 | 3.1.5 | 🟨 Ghost dep — desinstalar del venv |
| asgiref | 3.11.1 | — | ✅ Dep transitiva de Django |
| sqlparse | 0.5.5 | — | ✅ Dep transitiva de Django |
| tzdata | 2026.1 | — | ✅ Dep transitiva de Django |

**Acción inmediata:** `pip install Django==5.2.15` + actualizar `requirements.txt` + redeploy.

## Flujos documentados — Modo escritorio
1. **Login** (`01`) → tras autenticar, la app **no** va al selector de remates: aterriza directo en la UI principal con un remate resuelto por *fallback* (ver **VIS-2**).
2. **Selector de remates** (`02`) → tarjetas "Remates vigentes" / "Remates finalizados", con "Trabajar aquí" / "Finalizar" / "Ver remate". Limpio y claro.
3. **Vista principal escritorio** (`03`) → layout de **3 columnas simultáneas**: Mapa de Corrales | Lista de Lotes | Registrar ingreso. Header con total de cabezas (420). Sólido, sin elementos rotos.
4. **Selección de corral** (`04`) → click en el mapa resalta el corral, llena el panel "Corral Seleccionado" con botón "Nuevo Lote Aquí" y filtra la lista a ese corral. Funciona bien.
5. **Alta de lote / escritura** (`05`) → completar el form y "Guardar Registro" → mensaje "Registro creado.", total actualizado **420 → 427** y refresco automático de la lista. La "actualización en tiempo real" es en realidad un **refresh post-escritura** (`refreshAllData`), no realtime/WebSocket — coincide con lo descripto en la arquitectura.

## Flujos documentados — Modo móvil
- **Registros** (`06`, viewport 390×844): columna única, formulario completo, bottom-nav fijo (Registros/Corrales). Correcto.
- **Corrales** (`07`): mapa con controles de zoom (+ / − / centrar), leyenda (Ocupado / Vacío / Pasillo / Pasillo habilitado / Toril) y panel "Corral Seleccionado". Funcional.

## Comparación escritorio vs móvil
- **Diferencia de layout (esperada y correcta):** escritorio muestra mapa + lista + form a la vez; móvil muestra **una sección por vez** alternando con el bottom-nav. No falta funcionalidad en ninguna de las dos: todo lo de escritorio es accesible en móvil con un toque extra.
- **No se observaron elementos rotos ni desalineados** en el uso normal (operador) en ninguno de los dos modos. 0 errores de consola en operación normal.
- **Diferencia de layout para invitado NO verificable como operador**, pero el código confirma que la regla `.desktop-view.es-invitado` (ver **I-5**) **nunca se aplica** porque no hay `classList.add("es-invitado")`. → un invitado en escritorio ve el layout de operador. Queda pendiente de prueba con un usuario invitado.

## Nuevos hallazgos (no detectados en la auditoría estática)

### VIS-1 · Se pueden crear/editar lotes en un remate FINALIZADO
**Backend `registros/views.py:336-402` (`api_registros` POST) y `:405-460` (PUT)** · **Importante** (lógica de negocio)
**Evidencia:** seleccioné el remate cerrado (id=3) y un `POST /api/registros/` devolvió **201** con `"remateFinalizado": true` — el lote se creó en una subasta ya finalizada. Confirmado en vivo.
**Por qué:** ni el POST ni el PUT chequean `remate.finalizado` antes de escribir. "Finalizar" un remate no lo cierra realmente: solo cambia una etiqueta. Además, la UI muestra el formulario "Registrar ingreso" totalmente editable sobre un remate cerrado, **sin ningún cartel de "cerrado / solo lectura"** (visto en `01`, header "Remate Mayo 2026 (cerrado)" con el form activo).
**Sugerencia:** rechazar escrituras (crear/editar/mover/borrar) cuando `remate.finalizado` (HTTP 409/403 con mensaje claro), y en el front deshabilitar el form + mostrar banner "Remate finalizado (solo lectura)" cuando `remateFinalizado`.

### VIS-2 · El *fallback* de remate activo aterriza en el remate más nuevo aunque esté cerrado/vacío
**`registros/view_helpers.py:43-47` (`get_remate_activo`)** · **Importante** (UX / corrección)
**Evidencia:** recién logueado, sin preferencia explícita, la app abrió **"Remate Mayo 2026 (cerrado)"** mostrando **0 cabezas / "No hay registros"**, mientras el selector decía *"Todavía no hay un remate seleccionado"*. El operador queda trabajando en un remate cerrado y vacío sin haberlo elegido.
**Por qué:** el fallback es `order_by("-created_at").first()` — toma el último creado, sin filtrar `finalizado=False`. Combinado con VIS-1, es fácil cargar lotes en el remate equivocado.
**Sugerencia:** el fallback debería preferir el remate **abierto** más reciente (`filter(finalizado=False)`), y/o forzar la elección explícita redirigiendo al selector cuando no hay preferencia. Mostrar coherencia entre "remate activo" del header y "remate seleccionado" del picker.

### VIS-3 · Offline: el shell carga, pero el refresh explota sin aviso y no usa el cache de datos (confirma y agrava I-4)
**`registros/templates/registros/index.html:2077` (`fetchRegistrosSyncMeta`) → `:2084` (`refreshAllData`)** · **Importante** (offline/UX)
**Evidencia (servidor apagado, recarga real, `08`):** el SW sirve el shell cacheado (la app "abre" offline ✔), pero la consola muestra `TypeError: Failed to fetch` **no capturado** en `fetchRegistrosSyncMeta` (endpoint `ultimos-cambios`, que el SW **excluye** del cache a propósito). El header queda en **0 cabezas**, **0 tarjetas**, y **no se muestra ningún indicador de "sin conexión"**. La app parece funcional pero está vacía.
**Agravante encontrado en vivo:** como `refreshAllData` llama **primero** a `ultimos-cambios` (no cacheable) y ese `fetch` lanza, la cadena se aborta **antes** de leer el `/api/registros/` que el SW sí cachea (stale-while-revalidate). Es decir: **el cache de datos offline existe pero nunca se usa** en una recarga, por el orden de las llamadas. Peor aún, el form sigue visible y editable: un alta offline fallaría en silencio (no hay cola de reintento).
**Sugerencia:** (1) envolver los `fetch` en try/catch con banner "Sin conexión"; (2) si `ultimos-cambios` falla, **degradar a leer la lista cacheada** en vez de abortar; (3) deshabilitar/avisar en el form mientras no haya red; (4) opcional: cola de escrituras offline.

### VIS-4 · Tarjeta de remate finalizado renderiza "Finalizado el sin fecha"
**`registros/templates/registros/partials/remate_selected.html` / `remates.html` (render de `finalizado_at`)** · **Menor** (visual)
**Evidencia (`02`):** la tarjeta del remate cerrado muestra el texto *"Finalizado el sin fecha"* cuando `finalizado_at` es `None`.
**Por qué:** el template concatena "Finalizado el " + fecha sin verificar nulos. (Se ve fácil con datos donde `finalizado=True` pero `finalizado_at=None`.)
**Sugerencia:** condicionar el sufijo de fecha (`{% if remate.finalizado_at %}…{% endif %}`) o usar un default ("sin fecha registrada" como texto completo, no concatenado).

### VIS-5 · Header móvil trunca el nombre del remate a algo ilegible
**`registros/templates/registros/partials/index_header.html` (móvil)** · **Menor** (visual)
**Evidencia (`06`/`08`):** en 390px el header muestra el remate como **"Re…"** y la fecha como **"20/…"**, prácticamente ilegibles. El operador no puede confirmar de un vistazo en qué remate está cargando.
**Sugerencia:** permitir 1–2 líneas para el nombre, reducir el peso de los íconos, o mostrar un nombre corto. Dado VIS-1/VIS-2, saber el remate activo de un vistazo importa.

### VIS-6 · El SW cachea navegaciones autenticadas (confirma I-3, evidencia en vivo)
**`registros/templates/registros/service-worker.js:73-89`** · **Importante**
**Evidencia:** inspección de `caches` en vivo mostró en `planilla-rural-v2` las entradas `/`, `/remates/` y hasta el POST-redirect `/remates/2/seleccionar/`. Offline, `/` se sirve desde ahí con `ES_OPERADOR`/`REMATE_ID` "horneados" del estado anterior.
**Sugerencia:** ver I-3 (no cachear navegaciones autenticadas o limpiar `APP_CACHE` en logout/cambio de remate).

## Lo que funcionó bien (verificado en vivo)
- Login, navegación y CRUD de lotes sin errores de consola en operación normal.
- Alta de lote con refresh y recálculo de totales correcto (420→427).
- Mapa de corrales: render, zoom, selección y filtrado por corral — OK en escritorio y móvil.
- Layout escritorio de 3 columnas y layout móvil de sección única: ambos sólidos, sin roturas visuales.
- El SW hace que la app **abra** offline (shell cacheado) — la base de PWA funciona; lo que falta es el manejo de **datos** offline (VIS-3).

## Resumen de severidades (visuales)
| ID | Severidad | Tipo | Referencia |
|----|-----------|------|------------|
| VIS-1 | 🟧 Importante | Lógica negocio | views.py:336,405 |
| VIS-2 | 🟧 Importante | UX/corrección | view_helpers.py:43-47 |
| VIS-3 | 🟧 Importante | Offline (confirma I-4) | index.html:2077,2084 |
| VIS-4 | 🟨 Menor | Template | remate_selected.html |
| VIS-5 | 🟨 Menor | Visual móvil | index_header.html |
| VIS-6 | 🟧 Importante | SW (confirma I-3) | service-worker.js:73-89 |
