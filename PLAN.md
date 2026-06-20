# PLAN.md — Hoja de ruta consolidada (correcciones + nuevas funcionalidades)

> Generado el 2026-06-15 a partir de `AUDIT.md` y del diseño de "mapas múltiples por lugar".
> Combina: (a) correcciones del audit priorizadas por severidad, (b) la nueva funcionalidad, y (c) el orden y la paralelización entre todo.
> Para el detalle paso-a-paso de la feature, ver `docs/superpowers/plans/2026-06-15-mapas-multiples-por-lugar.md`.

## Cómo leer este plan

- **Fases:** se ejecutan en orden (0 → 1 → 2 → 3). Dentro de una fase puede haber paralelismo.
- **Marcas de concurrencia:**
  - 🟢 **Paralelizable** — toca archivos propios; se puede hacer al mismo tiempo que otras 🟢 de la misma fase (idealmente en ramas separadas).
  - 🔴 **Secuencial** — comparte archivo con otra(s) tarea(s); hacerlas en cadena para evitar conflictos de merge.
  - ⛓️ **Depende de X** — no empezar hasta terminar X.
- **Regla base de paralelismo:** tareas que tocan archivos **disjuntos** son seguras en paralelo; tareas que tocan el **mismo archivo** van en cadena. Los archivos "imán de conflictos" son `config/settings.py`, `registros/views.py`, `registros/templates/registros/index.html` y `service-worker.js`.

## Cadenas por archivo (quién choca con quién)

| Archivo | Tareas que lo tocan (orden sugerido) |
|---------|--------------------------------------|
| `config/settings.py` | C-1 → C-2 → I-6 → M-3 → S-1 |
| `registros/views.py` | VIS-1 → I-1(parcial) → I-2 → M-1 → V-1 → E-3 → E-4 → M-6 |
| `registros/models.py` | I-1(parcial) → E-1 → E-2 |
| `registros/view_helpers.py` | VIS-2 → M-2 |
| `registros/templates/registros/index.html` | C-3 → I-4/VIS-3 → I-5 → VIS-5 → E-5 → L-1 → L-2 |
| `registros/templates/registros/service-worker.js` | I-3/VIS-6 → M-4 |
| `requirements.txt` | DEP-1 |

---

# FASE 0 — Críticos: seguridad, disponibilidad y bug funcional

> Máxima prioridad (el audit los marca como remediación #1 y #2). Bajo esfuerzo, alto impacto. Casi todos en archivos disjuntos → **muy paralelizables entre sí**.

### 0.1 · DEP-1 — Actualizar Django a 5.2.15 🟢
- **Por qué:** 45 CVEs conocidos en 5.2.3, incluida inyección SQL (PYSEC-2025-108/105) que afecta SQLite.
- **Archivos:** `requirements.txt` (línea `Django==5.2.3` → `Django==5.2.15`).
- **Éxito verificable:** `pip install -r requirements.txt` OK; `python manage.py test registros` verde; `pip-audit` (temporal) **no** reporta CVEs de Django; `python manage.py check --deploy` sin errores nuevos.
- **Concurrencia:** independiente de todo. Hacer primero (toca solo `requirements.txt`).

### 0.2 · C-1 — Fail-fast de `SECRET_KEY`/`DEBUG` en producción 🔴 (settings.py)
- **Por qué:** si falta la env var, la app arranca con `SECRET_KEY` pública y/o `DEBUG=True`.
- **Archivos:** `config/settings.py:28,31`.
- **Éxito verificable:** con `DJANGO_DEBUG=False` y `SECRET_KEY` = default → arranque lanza `ImproperlyConfigured`; con vars válidas arranca normal; test nuevo que cubra ambos casos.
- **Concurrencia:** cadena `settings.py` — hacer antes que C-2/I-6/M-3/S-1.

### 0.3 · C-2 — Bajar `DATA_UPLOAD_MAX_MEMORY_SIZE` y acotar imágenes 🔴 (settings.py + views.py)
- **Por qué:** 100 MB por request parseados en memoria antes de validar → DoS en PythonAnywhere.
- **Archivos:** `config/settings.py:157` (bajar a ~10 MB), `registros/views.py` (`resolve_marca_imagen_list`: limitar cantidad/peso de imágenes).
- **Éxito verificable:** request > límite devuelve 413 con mensaje claro; alta normal con 1-3 fotos sigue funcionando; test que postee un payload sobredimensionado y espere 413.
- **Concurrencia:** ⛓️ después de C-1 (mismo `settings.py`); la parte de `views.py` choca con la cadena de `views.py` → coordinar con VIS-1/I-1.

### 0.4 · C-3 — Unificar el doble handler de click en `cardsContainer` 🔴 (index.html)
- **Por qué:** `setEditState`/`openCameraCapture` corren dos veces; borrado inconsistente.
- **Archivos:** `registros/templates/registros/index.html:2454,2735`.
- **Éxito verificable:** un click en "editar" abre el editor **una** vez; "agregar foto" abre la cámara **una** vez; borrar funciona; queda **un solo** `addEventListener("click")` en `cardsContainer` (verificable por búsqueda).
- **Concurrencia:** cadena `index.html` — hacer primero de esa cadena. 🟢 respecto de Fase 0 (archivo propio).

**Paralelismo Fase 0:** 0.1 ∥ (0.2→0.3) ∥ 0.4 son tres frentes en archivos disjuntos (`requirements.txt`, `settings.py`, `index.html`). Seguros en paralelo.

---

# FASE 1 — Importantes: fundacionales para la feature + seguridad/UX

> Remediación #3 y #4 del audit. Incluye los tres ítems **prerequisito de la nueva funcionalidad** (ver recuadro). Hacer esta fase antes de la Fase 2.

## Prerrequisitos reales de la feature de mapas

La feature se diseñó (Opción A: importación por comando) para **no depender** de C-2 ni de un upload web. Aclaración importante:

- **C-2 NO es bloqueante** de la feature: la conversión Excel→JSON corre por comando de management, fuera del path HTTP. (Igual se arregla en Fase 0 por su propio mérito de seguridad.)
- **DEP-2 (openpyxl ghost dep) lo resuelve la feature:** en vez de desinstalarlo, openpyxl pasa a `requirements-dev.txt` porque el comando `importar_mapa` lo usa. No hacer la acción de DEP-2 por separado.
- **Prerrequisitos fundacionales (hacer antes de la Fase 2 para no reescribir el mismo código dos veces):** **VIS-1**, **VIS-2** e **I-1**, porque la Fase 2 refactoriza exactamente esos endpoints/helpers (`api_registros` POST/PUT, `get_remate_activo`/`get_mapa_activo`, serialización con FK nuevo).

### 1.1 · VIS-1 — Rechazar escrituras en remate finalizado ⛓️🔴 (views.py) — **PREREQUISITO**
- **Por qué:** POST/PUT/mover/borrar sobre un remate `finalizado` devuelven 201/200; "finalizar" no cierra nada.
- **Archivos:** `registros/views.py:336-402` (POST), `:405-460` (PUT/DELETE), `:498-528` (mover); opcional banner en `index.html`.
- **Éxito verificable:** `POST/PUT/DELETE/mover` sobre remate finalizado → **409** con mensaje; sobre remate abierto → normal; tests para cada verbo.
- **Concurrencia:** cabeza de la cadena `views.py` en esta fase. Hacer **antes** de la Fase 2 (la feature toca esos mismos endpoints).

### 1.2 · VIS-2 — Fallback de remate activo prefiere remate abierto ⛓️🔴 (view_helpers.py) — **PREREQUISITO**
- **Por qué:** `get_remate_activo` cae en el remate más nuevo aunque esté cerrado/vacío.
- **Archivos:** `registros/view_helpers.py:43-47`.
- **Éxito verificable:** sin preferencia, el fallback devuelve el remate **abierto** más reciente; si no hay abiertos, redirige al selector (o devuelve None y la vista redirige); test que cree un cerrado más nuevo + uno abierto viejo y verifique que elige el abierto.
- **Concurrencia:** cabeza de la cadena `view_helpers.py`. Hacer antes de la Fase 2 (`get_mapa_activo` se agrega al lado).

### 1.3 · I-1 — `select_related` para matar el N+1 ⛓️🔴 (models.py + views.py + view_helpers.py) — **PREREQUISITO**
- **Por qué:** `to_dict()` accede a `self.remate.*` sin `select_related` → 1 query por registro.
- **Archivos:** `registros/views.py:366`, `registros/view_helpers.py:208,216-220`, (opcional `registros/models.py:152` pasando el remate a `to_dict`).
- **Éxito verificable:** test con `assertNumQueries` sobre `/api/registros/` con N registros → cantidad de queries **constante** (no crece con N).
- **Concurrencia:** toca varias cadenas; coordinar con VIS-1 (views.py). Hacer antes de la Fase 2 para que el FK `mapa` se sume al `select_related` desde el principio.

### 1.4 · I-3 + VIS-6 — El SW no debe cachear navegaciones autenticadas 🟢🔴 (service-worker.js + index.html)
- **Por qué:** `/` y `/remates/` cacheados "hornean" `ES_OPERADOR`/`REMATE_ID` de sesiones previas → rol/remate equivocado offline.
- **Archivos:** `registros/templates/registros/service-worker.js:73-89`; posiblemente `index.html:714-715` (mover `ES_OPERADOR`/`REMATE_ID` a un endpoint `/api/` no cacheable) o limpiar `APP_CACHE` en logout.
- **Éxito verificable:** tras logout, `caches` ya no sirve `/` con datos de la sesión anterior; inspección de `caches` no muestra navegaciones autenticadas; un invitado no ve `ES_OPERADOR=true` cacheado.
- **Concurrencia:** cadena `service-worker.js` (antes de M-4). 🟢 respecto de la cadena `views.py`/`settings.py`.

### 1.5 · I-4 + VIS-3 — Manejo de fallo de red + degradar a cache offline 🔴 (index.html)
- **Por qué:** los `fetch` no están en try/catch; `ultimos-cambios` (no cacheable) explota primero y aborta la cadena antes de usar el cache de `/api/registros/`. App queda vacía sin aviso.
- **Archivos:** `registros/templates/registros/index.html` (`:1274,:1300,:2005,:2077,:2084` y los `fetch` de escritura `:2499,:2684,:2769`).
- **Éxito verificable:** con servidor apagado y recarga: aparece banner "Sin conexión", se muestran los datos cacheados (no 0 cabezas), no hay `TypeError` sin capturar en consola; un alta offline avisa en vez de fallar en silencio.
- **Concurrencia:** ⛓️ después de C-3 (misma cadena `index.html`).

### 1.6 · I-2 — `Cache-Control: private` en fotos 🔴 (views.py)
- **Por qué:** fotos privadas servidas con `public` → caches compartidos pueden reservirlas a otros.
- **Archivos:** `registros/views.py:322,330`.
- **Éxito verificable:** `GET /api/registros/<id>/foto/...` responde `Cache-Control: private, max-age=86400`; test que lo verifique.
- **Concurrencia:** cadena `views.py` (después de VIS-1/I-1).

### 1.7 · I-6 + E-1 — `LOGGING` + loguear el except de thumbnails 🔴🔴 (settings.py + models.py)
- **Por qué:** sin `LOGGING` y con `except Exception` mudos, los fallos en producción no dejan rastro; E-1 devuelve la imagen full como "thumbnail" sin avisar.
- **Archivos:** `config/settings.py` (bloque `LOGGING`), `registros/models.py:98-99` (`logging.exception`).
- **Éxito verificable:** un thumbnail que falla deja una entrada de log (WARNING+); `LOGGING` definido y `check --deploy` OK.
- **Concurrencia:** ⛓️ después de C-1/C-2 (settings.py) y E-1 encabeza la cadena `models.py` tras I-1.

**Paralelismo Fase 1:** tres frentes seguros en paralelo → **(VIS-1→I-1→I-2 en views.py)** ∥ **(I-3/VIS-6→… en service-worker.js)** ∥ **(C-3 ya hecho → I-4/VIS-3 en index.html)**. VIS-2 (view_helpers) y I-6 (settings) se intercalan donde no choquen.

---

# FASE 2 — Nueva funcionalidad: mapas múltiples por lugar

> ⛓️ **Empezar solo después de VIS-1, VIS-2 e I-1** (Fase 1). El resto de Fase 1 puede seguir en paralelo en otra rama porque la feature toca mayormente código nuevo + `view_helpers`/`views` ya estabilizados por los prerequisitos.

**Plan detallado (8 tasks TDD, con código y comandos):** `docs/superpowers/plans/2026-06-15-mapas-multiples-por-lugar.md`. Resumen:

| Task | Qué hace | Archivos | Éxito verificable |
|------|----------|----------|-------------------|
| F2.1 | `validar_layout` + constantes | crear `registros/mapas.py`; `view_helpers.py` | `MapaValidacionTests` verde (8 tests, incl. plano real válido) |
| F2.2 | Modelo `Mapa` + FK `Remate.mapa` + migración esquema | `models.py`; `migrations/0004_*` | `MapaModelTests` verde; `full_clean` rechaza layout inválido |
| F2.3 | Seed del mapa default | `migrations/0005_*` | `MapaSeedTests` verde; existe 1 mapa `es_default` que replica el plano |
| F2.4 | `get_mapa_activo` (fallback) | `view_helpers.py` | `MapaActivoTests` verde |
| F2.5 | Helpers + `normalize_corral` map-aware + call sites | `view_helpers.py`, `views.py` | `NormalizeCorralMapaTests` verde; suite completa verde |
| F2.6 | `GET /api/mapas/` | `views.py`, `urls.py` | `ApiMapasTests` verde; lista incluye el default |
| F2.7 | Elegir mapa al crear remate | `views.py`, `remates.html` | `CrearRemateMapaTests` verde; `mapa_id` inválido → 400 |
| F2.8 | Conversor Excel→JSON + comando | crear `mapas.py`(parse), `management/commands/importar_mapa.py`, `requirements-dev.txt` | `ImportarMapaCommandTests` verde; `importar_mapa --dry-run` imprime JSON |

- **Concurrencia interna:** F2.1→F2.2→F2.3→F2.4→F2.5 son **secuenciales** (dependencias de tipo/modelo). F2.6, F2.7 y F2.8 son **🟢 paralelizables entre sí** una vez listo F2.5 (tocan archivos/áreas distintas: endpoint, template+crear_remate, comando).
- **Verificación end-to-end:** crear remate eligiendo un mapa nuevo, ver el render correcto en mobile y desktop; `importar_mapa` con un Excel real estilo `PLANO RURAL.xlsx`.

---

# FASE 3 — Menores (oportunistas)

> Hacer "cuando se toque la zona" o en una pasada de limpieza. Casi todos 🟢 entre sí salvo los que comparten archivo (ver cadenas).

| ID | Tarea | Archivos | Éxito verificable | Concurrencia |
|----|-------|----------|-------------------|--------------|
| M-1 | `finalizar_remate` atómico (`filter().update()`) | `views.py:262-272` | dos cierres concurrentes no pisan `finalizado_at`; test | cadena views.py |
| M-2 | `PreferenciaRemateUsuario` sin carrera | `view_helpers.py:27-29` | `update_or_create`/try-IntegrityError; sin 500 en doble pestaña | cadena view_helpers |
| M-3 | localhost en `CSRF_TRUSTED_ORIGINS` solo en DEBUG | `settings.py:38-40` | con `DEBUG=False` no aparece localhost; test | cadena settings.py |
| M-4 | Versionar `API_CACHE` a v2 | `service-worker.js:1-3,22-24` | las 3 caches en v2; bump documentado | cadena sw.js |
| M-5 | Extraer JS a `static/` + Tailwind compilado | `index.html`, `static/` | JS servido como asset cacheable; sin CDN runtime | cadena index.html (grande) |
| M-6 | Índices/FTS para búsqueda | `views.py:347-359`, migración | búsqueda sin table scan (EXPLAIN) | cadena views.py |
| V-1 | Validar longitud de `remitente`/`observaciones` | `views.py:378,398` | payload sobre-largo → 400; test | cadena views.py |
| V-2 | Documentar que `allowPasillo` es del cliente | doc/código | nota en código/README | 🟢 |
| S-1 | Headers de hardening (`SSL_REDIRECT`, `HSTS`) | `settings.py:148-151` | `check --deploy` sin warnings de seguridad | cadena settings.py |
| E-2 | Loguear JSON corrupto en `_parse_marca_images` | `models.py:107-110` | log en parseo fallido | cadena models.py |
| E-3 | Loguear/400 en `resolve_marca_imagen_list` | `views.py:120-122` | payload no parseable → log/400 | cadena views.py |
| E-4 | Distinguir foto corrupta vs ausente | `views.py:324-333` | log de decode fallido; (opcional 422) | cadena views.py |
| E-5 | `console.warn` si el SW no registra | `index.html:3340-3342` | warning visible en consola | cadena index.html |
| L-1 | `mousemove/mouseup` solo durante drag | `index.html:1016,1028,3097,3106` | listeners removidos en `mouseup` | cadena index.html |
| L-2 | Revisar listener global de `focus` | `index.html:3209` | no se re-registra | cadena index.html |
| VIS-4 | "Finalizado el sin fecha" condicional | `remates.html`/`remate_selected.html` | sin fecha → texto correcto | 🟢 |
| VIS-5 | Header móvil no trunca el remate | `partials/index_header.html` | nombre legible a 390px | cadena index.html-ish (parcial) |
| DEP-3 | `pip install --upgrade pip` (venv) | (entorno local) | `pip-audit` sin CVEs de pip | 🟢 |

> **DEP-2 ya no se hace por separado** — lo absorbe F2.8 (openpyxl → `requirements-dev.txt`).

---

# Resumen de orden y paralelismo

```
FASE 0 (críticos)         FASE 1 (importantes)              FASE 2 (feature)        FASE 3 (menores)
─────────────────         ────────────────────              ────────────────        ────────────────
DEP-1 ─┐                  VIS-1 ─┐ (views)                  (tras VIS-1/VIS-2/I-1)  oportunista,
C-1→C-2┤ (settings)       I-1   ─┤  PREREQUISITOS  ───────► F2.1→…→F2.5             por cadena de
C-3   ─┘ (index)          VIS-2 ─┘ (helpers)                   └─ F2.6 ∥ F2.7 ∥ F2.8 archivo
   (3 frentes ∥)          I-3/VIS-6 (sw) ∥ I-4/VIS-3 (index)
                          I-2 (views) · I-6+E-1 (settings/models)
```

- **Seguro en paralelo:** tareas de fases distintas NO; dentro de una fase, las que tocan archivos **disjuntos** sí (ej. en Fase 0: `requirements.txt` ∥ `settings.py` ∥ `index.html`).
- **Siempre secuencial:** todo lo que comparte `settings.py`, `views.py`, `index.html` o `service-worker.js` (ver tabla de cadenas).
- **Gate de la Fase 2:** no arrancar la feature hasta cerrar **VIS-1, VIS-2 e I-1**.
