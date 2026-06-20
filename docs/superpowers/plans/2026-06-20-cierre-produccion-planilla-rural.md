# Cierre de producción Planilla Rural — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar las brechas funcionales de frontend (offline, remate finalizado, rol invitado), corregir el bug de encoding visible al usuario, y dejar la base lista para producción (Tailwind compilado, CI, repo ordenado).

**Architecture:** El backend ya está endurecido y con 57 tests verdes; este plan toca casi todo en el frontend (`app.js`, `index.html`, `base.html`) más infraestructura (CI, `.gitignore`, CSS compilado). El backend solo gana un test del flag de remate finalizado que ya se renderiza vía contexto de plantilla. La verificación de los cambios JS/CSS es manual con Playwright porque el proyecto no tiene runner de tests JS.

**Tech Stack:** Django 5.2.15, JS vanilla (sin framework), Tailwind (a compilar con `npx tailwindcss@3`), GitHub Actions, SQLite.

---

## Estructura de archivos

| Archivo | Responsabilidad | Tareas |
|---------|-----------------|--------|
| `registros/static/registros/js/app.js` | Lógica de UI: corregir encoding, gating de finalizado, offline en escrituras y degradación a caché, clase `es-invitado` | 1, 2, 3, 4 |
| `registros/templates/registros/index.html` | App principal: corregir encoding, inyectar flag `REMATE_FINALIZADO`, banner, link a CSS compilado | 1, 2, 5 |
| `registros/templates/registros/base.html` | Layout login/remates: link a CSS compilado, quitar CDN runtime | 5 |
| `registros/tests.py` | Test del flag de remate finalizado en el render de `index` | 2 |
| `tailwind.config.js` (nuevo) | Config de generación de Tailwind (content + theme) | 5 |
| `registros/static/registros/css/tailwind.src.css` (nuevo) | Entrada de directivas `@tailwind` | 5 |
| `registros/static/registros/css/app.css` (nuevo, generado) | CSS de Tailwind compilado y commiteado | 5 |
| `.github/workflows/ci.yml` (nuevo) | Tests + check --deploy + pip-audit en cada push/PR | 6 |
| `.gitignore` (nuevo) | Ignorar screenshots, DB, staticfiles, artefactos de tooling | 7 |
| `CLAUDE.md`, `ARCHITECTURE.md`, `PLAN.md`, `AUDIT.md` | Docs valiosos a commitear; actualizar tras cambios | 7, 8 |

**Orden y dependencias:**
- **Tareas 1 → 2 → 3 → 4** tocan `app.js`/`index.html` → secuenciales (mismo archivo, evitar conflictos).
- **Tarea 5** (Tailwind) toca `index.html` + `base.html` + nuevos archivos → hacerla después de 2 (que también edita `index.html`).
- **Tareas 6 y 7** son independientes (archivos disjuntos).
- **Tarea 8** (verificación + docs) va al final.

---

## Task 1: Corregir el bug de encoding (mojibake) en strings visibles

**Contexto:** `app.js` (18 ocurrencias) e `index.html` (11) tienen acentos doble-codificados (ej. "conexiÃ³n" en vez de "conexión", "â€"" en vez de "—"). Son visibles al usuario. Ambos archivos son UTF-8 con BOM.

**Files:**
- Create: `scripts/fix_mojibake.py` (utilidad de un solo uso, se borra al final del task)
- Modify: `registros/static/registros/js/app.js`
- Modify: `registros/templates/registros/index.html`

- [ ] **Step 1: Verificar el estado actual (cuántas ocurrencias)**

Run:
```bash
grep -c "Ã\|â€" registros/static/registros/js/app.js registros/templates/registros/index.html
```
Expected: `app.js:18` y `index.html:11` (o números similares > 0).

- [ ] **Step 2: Escribir el script de corrección con mapeo explícito**

Crear `scripts/fix_mojibake.py`:
```python
"""Corrige acentos doble-codificados (mojibake) en archivos UTF-8.
Reemplazo dirigido de secuencias conocidas; preserva el BOM."""
import sys

REPLACEMENTS = {
    "Ã¡": "á", "Ã©": "é", "Ã­": "í", "Ã³": "ó", "Ãº": "ú", "Ã±": "ñ", "Ã¼": "ü",
    "Ã": "Á", "Ã‰": "É", "Ã": "Í", "Ã“": "Ó", "Ãš": "Ú", "Ã‘": "Ñ",
    "â€”": "—", "â€“": "–", "â€œ": "“", "â€\x9d": "”", "â€™": "’", "â€˜": "‘",
    "Â¿": "¿", "Â¡": "¡", "Âº": "º", "Âª": "ª", "Â°": "°", "Â": "",
}

def fix(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        content = f.read()
    original = content
    for bad, good in REPLACEMENTS.items():
        content = content.replace(bad, good)
    if content != original:
        with open(path, "w", encoding="utf-8-sig") as f:
            f.write(content)
        print(f"Corregido: {path}")
    else:
        print(f"Sin cambios: {path}")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        fix(p)
```

- [ ] **Step 3: Ejecutar el script sobre los dos archivos**

Run:
```bash
.venv/Scripts/python.exe scripts/fix_mojibake.py registros/static/registros/js/app.js registros/templates/registros/index.html
```
Expected: `Corregido: ...app.js` y `Corregido: ...index.html`.

- [ ] **Step 4: Verificar que no quedan ocurrencias**

Run:
```bash
grep -c "Ã\|â€" registros/static/registros/js/app.js registros/templates/registros/index.html
```
Expected: ambos en `0` (grep devuelve `:0` para cada archivo).

- [ ] **Step 5: Revisar visualmente un par de strings clave**

Run:
```bash
grep -n "conexión\|guardó\|Cámara\|móvil" registros/static/registros/js/app.js | head
```
Expected: aparecen con acentos correctos (no Ã³).

- [ ] **Step 6: Borrar el script de un solo uso y commitear**

```bash
rm scripts/fix_mojibake.py
git add registros/static/registros/js/app.js registros/templates/registros/index.html
git commit -m "fix(ui): corregir acentos doble-codificados (mojibake) en mensajes de UI"
```

---

## Task 2: Remate finalizado — UI de solo lectura

**Contexto:** El backend ya rechaza escrituras en remate finalizado con 409 (commit `cf301f3`), pero la UI muestra el formulario editable sin aviso. La vista `index` ya pasa `remate_activo` al contexto, así que el flag sale directo de la plantilla sin tocar `views.py`.

**Files:**
- Modify: `registros/templates/registros/index.html:714-715` (agregar const) y zona del header (banner)
- Modify: `registros/static/registros/js/app.js` (gating en init)
- Test: `registros/tests.py`

- [ ] **Step 1: Escribir el test del flag en el render de `index`**

`registros/tests.py` ya importa `get_user_model`, `TestCase` y `Remate` (líneas 1, 4, 8). Falta `set_remate_seleccionado`: agregar al tope del archivo, junto a los imports existentes de la app:
```python
from .view_helpers import set_remate_seleccionado
```
Luego agregar la clase de tests al archivo:
```python
class IndexPageTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="operador1", password="x")

    def test_index_marca_remate_finalizado_true(self):
        remate = Remate.objects.create(nombre="Cerrado", finalizado=True)
        set_remate_seleccionado(self.user, remate)
        self.client.force_login(self.user)
        resp = self.client.get("/")
        self.assertContains(resp, "const REMATE_FINALIZADO = true;")

    def test_index_marca_remate_finalizado_false(self):
        remate = Remate.objects.create(nombre="Abierto", finalizado=False)
        set_remate_seleccionado(self.user, remate)
        self.client.force_login(self.user)
        resp = self.client.get("/")
        self.assertContains(resp, "const REMATE_FINALIZADO = false;")
```
Nota: `set_remate_seleccionado(usuario, remate)` está definido en `registros/view_helpers.py:41`.

- [ ] **Step 2: Correr el test y verificar que falla**

Run:
```bash
.venv/Scripts/python.exe manage.py test registros.tests.IndexPageTests -v 2
```
Expected: FAIL — el HTML no contiene `const REMATE_FINALIZADO`.

- [ ] **Step 3: Inyectar el flag en `index.html`**

En `registros/templates/registros/index.html`, después de la línea 715 (`const REMATE_ID = "{{ remate_activo.id }}";`), agregar:
```html
      const REMATE_FINALIZADO = {{ remate_activo.finalizado|yesno:"true,false" }};
```

- [ ] **Step 4: Agregar el banner de solo-lectura en el header de `index.html`**

Justo después de la apertura del `<body>` (o dentro del header principal; ubicarlo donde sea visible en mobile y desktop), agregar un banner oculto por defecto:
```html
    <div id="remateFinalizadoBanner" class="hidden bg-app-clay/15 border-b border-app-clay/40 text-app-clay text-center text-sm font-bold py-2 px-3">
      Remate finalizado — solo lectura
    </div>
```

- [ ] **Step 5: Implementar el gating en `app.js`**

En `registros/static/registros/js/app.js`, justo antes de la línea `applyDesktopView(desktopViewEnabled);` (≈línea 2609), agregar:
```javascript
      function aplicarModoFinalizado() {
        if (typeof REMATE_FINALIZADO === "undefined" || !REMATE_FINALIZADO) {
          return;
        }
        const banner = document.getElementById("remateFinalizadoBanner");
        if (banner) banner.classList.remove("hidden");
        const form = document.getElementById("registroForm");
        if (form) {
          form.querySelectorAll("input, select, textarea, button").forEach((el) => {
            el.disabled = true;
          });
        }
        document.querySelectorAll('button[data-action]').forEach((btn) => {
          const action = btn.getAttribute("data-action");
          if (action === "edit" || action === "delete" || action === "add-photo") {
            btn.disabled = true;
          }
        });
      }
      aplicarModoFinalizado();
```

Nota: `renderCards()` re-crea las tarjetas con sus botones `data-action`. Agregar al final de la función `renderCards` (buscar `function renderCards`) una llamada de cierre:
```javascript
        aplicarModoFinalizado();
```
para que los botones recién renderizados también queden deshabilitados.

- [ ] **Step 6: Correr el test y verificar que pasa**

Run:
```bash
.venv/Scripts/python.exe manage.py test registros.tests.IndexPageTests -v 2
```
Expected: PASS (2 tests).

- [ ] **Step 7: Verificación manual con Playwright**

Levantar el server (`.venv/Scripts/python.exe manage.py runserver`), loguear como operador, seleccionar un remate finalizado y confirmar: banner visible, form deshabilitado, botones editar/borrar/foto deshabilitados. En un remate abierto: todo editable, sin banner.

- [ ] **Step 8: Commit**

```bash
git add registros/templates/registros/index.html registros/static/registros/js/app.js registros/tests.py
git commit -m "feat(ui): modo solo-lectura en el front cuando el remate está finalizado"
```

---

## Task 3: Offline UX — escrituras seguras y degradación a caché

**Contexto:** Las lecturas ya manejan offline con `OFFLINE_SENTINEL` (app.js:1289-1311), pero (a) en una recarga offline `refreshAllData` retorna temprano sin intentar leer la lista cacheada por el SW (agravante VIS-3), y (b) los `fetch` de escritura (ej. app.js:1988) no están en try/catch → un fallo de red lanza un rechazo no capturado. Hay además código de debug temporal a limpiar (app.js:2006).

**Files:**
- Modify: `registros/static/registros/js/app.js`

- [ ] **Step 1: Hacer que `refreshAllData` use el caché en recarga offline**

En `registros/static/registros/js/app.js`, reemplazar el bloque del sentinel offline (≈líneas 1305-1311):
```javascript
        if (meta === OFFLINE_SENTINEL) {
          const hasDataLoaded = (registrosAll && registrosAll.length) || (registros && registros.length);
          if (hasDataLoaded) {
            showMessage("Sin conexión — mostrando datos guardados.", "error");
          }
          return;
        }
```
por:
```javascript
        if (meta === OFFLINE_SENTINEL) {
          // Recarga offline: el SW puede servir /api/registros/ desde caché aunque
          // ultimos-cambios (no cacheable) haya fallado. Intentar leer la lista igual.
          const yaHabiaDatos = (registrosAll && registrosAll.length) || (registros && registros.length);
          if (!yaHabiaDatos) {
            try {
              await fetchRegistrosAll();
              registros = Array.isArray(registrosAll) ? registrosAll.slice() : [];
              renderCards();
              if (!corralesMapaLoaded) {
                await fetchCorralesMapa();
              }
            } catch (e) {
              // sin caché disponible tampoco; seguimos al aviso
            }
          }
          showMessage("Sin conexión — mostrando datos guardados.", "error");
          return;
        }
```

- [ ] **Step 2: Envolver el `fetch` de guardado en try/catch**

En la función de guardado (≈línea 1988), reemplazar:
```javascript
          const response = await fetch(url, {
            method,
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(payload),
          });

          if (handleAuthError(response)) return;
          let body = {};
          try {
            body = await response.json();
          } catch (err) {
            // ignore json parse error
          }

          if (!response.ok) {
            // Temporary debug: show status and server response text if available
            let text = body && body.error ? body.error : null;
            if (!text) {
              try {
                const txt = await response.text();
                if (txt) text = txt;
              } catch (e) {
                // ignore
              }
            }
            console.error('Save registro failed', response.status, text, body);
            showMessage(text || `No se pudo guardar el registro. (status ${response.status})`, "error");
            return;
          }
```
por:
```javascript
          let response;
          try {
            response = await fetch(url, {
              method,
              headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
              },
              body: JSON.stringify(payload),
            });
          } catch (err) {
            showMessage("Sin conexión — no se pudo guardar. Reintentá cuando vuelva la red.", "error");
            return;
          }

          if (handleAuthError(response)) return;
          let body = {};
          try {
            body = await response.json();
          } catch (err) {
            // ignore json parse error
          }

          if (!response.ok) {
            let text = body && body.error ? body.error : null;
            if (!text) {
              try {
                const txt = await response.text();
                if (txt) text = txt;
              } catch (e) {
                // ignore
              }
            }
            showMessage(text || `No se pudo guardar el registro. (status ${response.status})`, "error");
            return;
          }
```

- [ ] **Step 3: Envolver el `fetch` de borrado en try/catch**

Hay dos puntos de borrado (≈app.js:1800 y :2169) y uno de movimiento (≈:2252). Para cada `const response = await fetch(...)` que sea método `DELETE`/`POST` de escritura y NO esté ya en try/catch, envolverlo con el mismo patrón:
```javascript
          let response;
          try {
            response = await fetch(/* ...args existentes... */);
          } catch (err) {
            showMessage("Sin conexión — no se pudo completar la acción.", "error");
            return;
          }
```
Aplicar a los tres call sites manteniendo los argumentos originales del `fetch`.

- [ ] **Step 4: Agregar banner reactivo a eventos online/offline**

Antes del bloque de init (≈línea 2609, junto a `aplicarModoFinalizado()`), agregar:
```javascript
      window.addEventListener("offline", () => {
        showMessage("Sin conexión — trabajando con datos guardados.", "error");
      });
      window.addEventListener("online", () => {
        showMessage("Conexión restablecida.");
        refreshAllData();
      });
```

- [ ] **Step 5: Verificación manual de red caída con Playwright**

Levantar el server, cargar la app, luego apagar el server (o usar el modo offline del navegador) y recargar: debe aparecer el aviso "Sin conexión" y los datos cacheados (no 0 cabezas / pantalla vacía). Intentar guardar un lote offline: debe mostrar "Sin conexión — no se pudo guardar", sin `TypeError` no capturado en consola.

- [ ] **Step 6: Commit**

```bash
git add registros/static/registros/js/app.js
git commit -m "fix(offline): degradar a caché en recarga offline y manejar fallo de red en escrituras"
```

---

## Task 4: Aplicar la clase `es-invitado` para layout consistente

**Contexto:** La regla CSS `.desktop-view.es-invitado #registrosSection` (index.html:228) existe pero nunca se aplica — no hay `classList.add("es-invitado")` en el JS (I-5). Un invitado en escritorio ve el layout de operador.

**Files:**
- Modify: `registros/static/registros/js/app.js` (función `applyDesktopView`, ≈línea 1215)

- [ ] **Step 1: Localizar `applyDesktopView`**

Run:
```bash
grep -n "function applyDesktopView" registros/static/registros/js/app.js
```
Expected: una línea (≈1215).

- [ ] **Step 2: Aplicar/quitar `es-invitado` según el rol dentro de `applyDesktopView`**

Dentro de `applyDesktopView(enabled)`, donde se togglean las clases del shell/body (buscar `classList` con `desktop-view`/`desktop-body`), agregar la sincronización de la clase de invitado. Inmediatamente después de aplicar las clases de desktop, insertar:
```javascript
        const shell = document.getElementById("workspaceShell") || document.body;
        if (!ES_OPERADOR) {
          shell.classList.add("es-invitado");
          document.body.classList.add("es-invitado");
        } else {
          shell.classList.remove("es-invitado");
          document.body.classList.remove("es-invitado");
        }
```
(El selector CSS es `.desktop-view.es-invitado`; ambas clases deben convivir en el mismo elemento — verificar en index.html sobre qué elemento está `.desktop-view` y aplicar `es-invitado` ahí. Si `.desktop-view` está en `workspaceShell`, basta con agregarla a `shell`.)

- [ ] **Step 3: Verificación manual con Playwright como invitado**

Crear/loguear un usuario que NO esté en `OPERADOR_USERNAMES`, activar modo escritorio y confirmar que el layout de `#registrosSection` aplica la regla `.es-invitado` (inspeccionar que el elemento tenga ambas clases). Como operador, confirmar que `es-invitado` NO está presente.

- [ ] **Step 4: Commit**

```bash
git add registros/static/registros/js/app.js
git commit -m "fix(ui): aplicar clase es-invitado para layout de escritorio del rol invitado"
```

---

## Task 5: Tailwind pre-compilado (eliminar el CDN runtime)

**Contexto:** Tanto `index.html:18` como `base.html:18` cargan `https://cdn.tailwindcss.com` (CDN runtime, compila en el navegador — no apto para producción). Generamos el CSS una vez con `npx tailwindcss@3` (Node v22 disponible) y lo commiteamos como asset estático. NO se agrega `package.json` ni build al deploy. El tema custom (colores `app.*`, fuente Manrope, sombra `card`) vive hoy inline en la config de Tailwind de ambos HTML.

**Files:**
- Create: `tailwind.config.js`
- Create: `registros/static/registros/css/tailwind.src.css`
- Create (generado): `registros/static/registros/css/app.css`
- Modify: `registros/templates/registros/index.html` (quitar CDN + config inline, agregar `<link>`)
- Modify: `registros/templates/registros/base.html` (idem)

- [ ] **Step 1: Crear `tailwind.config.js` con el tema actual**

Crear `tailwind.config.js` en la raíz:
```javascript
/** Config de generación de Tailwind (uso de desarrollo; el CSS resultante se commitea). */
module.exports = {
  content: [
    "./registros/templates/**/*.html",
    "./registros/static/registros/js/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        app: {
          ink: "#0f1f1b",
          mint: "#9cc9b1",
          leaf: "#1f5f48",
          clay: "#7a461f",
          cream: "#ece8dc",
        },
      },
      boxShadow: {
        card: "0 18px 36px -24px rgba(10, 26, 21, 0.55)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Crear el archivo de entrada de directivas**

Crear `registros/static/registros/css/tailwind.src.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Generar el CSS compilado**

Run:
```bash
npx tailwindcss@3 -c tailwind.config.js -i registros/static/registros/css/tailwind.src.css -o registros/static/registros/css/app.css --minify
```
Expected: crea `registros/static/registros/css/app.css` (varios KB). Si `npx` pide instalar, aceptar.

- [ ] **Step 4: Verificar que el CSS incluye las clases custom**

Run:
```bash
grep -o "app-leaf\|app-clay\|Manrope\|shadow-card" registros/static/registros/css/app.css | sort -u
```
Expected: aparecen las clases custom (confirma que el tema se aplicó y el content scan funcionó).

- [ ] **Step 5: Reemplazar el CDN en `index.html`**

En `registros/templates/registros/index.html`, eliminar la línea 18 (`<script src="https://cdn.tailwindcss.com"></script>`) y el bloque `<script> tailwind.config = { ... } </script>` (líneas ≈21-41). En su lugar, agregar dentro del `<head>` (después del `<link>` de fuentes):
```html
        <link rel="stylesheet" href="{% static 'registros/css/app.css' %}" />
```
Mantener el `<script>` de jsPDF (líneas 19-20) intacto.

- [ ] **Step 6: Reemplazar el CDN en `base.html`**

En `registros/templates/registros/base.html`, eliminar la línea del CDN (≈18) y el bloque `tailwind.config` inline (≈20-41). Agregar (asegurar `{% load static %}` al tope del archivo si no está):
```html
    <link rel="stylesheet" href="{% static 'registros/css/app.css' %}" />
```

- [ ] **Step 7: Verificación visual con Playwright**

Levantar el server y recorrer login, remates e index (mobile y desktop): el estilo debe verse idéntico a antes (colores app-*, fuente Manrope, sombras de tarjeta). Confirmar en la consola del navegador que ya NO aparece el warning de `cdn.tailwindcss.com` ("should not be used in production").

- [ ] **Step 8: Documentar cómo regenerar y commitear**

Agregar al README (o a `CLAUDE.md`, sección Commands) una nota:
```
# Regenerar el CSS de Tailwind cuando se agreguen clases nuevas (requiere Node):
npx tailwindcss@3 -c tailwind.config.js -i registros/static/registros/css/tailwind.src.css -o registros/static/registros/css/app.css --minify
```
Luego:
```bash
git add tailwind.config.js registros/static/registros/css/tailwind.src.css registros/static/registros/css/app.css registros/templates/registros/index.html registros/templates/registros/base.html README.md
git commit -m "perf(css): compilar Tailwind a asset estático y quitar el CDN runtime"
```

---

## Task 6: CI con GitHub Actions

**Contexto:** No hay CI. Queremos correr tests + `check --deploy` + `pip-audit` en cada push/PR. `check --deploy` necesita `DEBUG=False` y un `SECRET_KEY` válido (por el fail-fast de C-1).

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Crear el workflow**

Crear `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Instalar dependencias
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements-dev.txt
      - name: Correr tests
        run: python manage.py test registros
      - name: Check de deploy
        env:
          DJANGO_DEBUG: "False"
          DJANGO_SECRET_KEY: "ci-secret-key-no-usar-en-produccion-1234567890abcdef"
          DJANGO_ALLOWED_HOSTS: "example.com"
        run: python manage.py check --deploy
      - name: Auditar dependencias
        run: |
          pip install pip-audit
          pip-audit -r requirements.txt
```

- [ ] **Step 2: Validar la sintaxis YAML localmente**

Run:
```bash
.venv/Scripts/python.exe -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml',encoding='utf-8')); print('YAML OK')"
```
Expected: `YAML OK`.

- [ ] **Step 3: Verificar localmente que los comandos del CI corren**

Run (replica del paso check del CI):
```bash
DJANGO_DEBUG=False DJANGO_SECRET_KEY=ci-secret-key-no-usar-en-produccion-1234567890abcdef DJANGO_ALLOWED_HOSTS=example.com .venv/Scripts/python.exe manage.py check --deploy
```
Expected: corre sin lanzar `ImproperlyConfigured` (puede emitir warnings de seguridad de Django; eso es esperado y no falla el comando).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: tests, check --deploy y pip-audit en cada push/PR"
```

---

## Task 7: Higiene del repositorio

**Contexto:** La raíz tiene 8 PNGs de screenshots, `.playwright-mcp/`, `.mcp.json` y la DB sin trackear, mientras que docs valiosos (`ARCHITECTURE.md`, `AUDIT.md`, `PLAN.md`, `CLAUDE.md`) tampoco están commiteados.

**Files:**
- Create: `.gitignore`
- Add: docs valiosos

- [ ] **Step 1: Crear `.gitignore`**

Crear `.gitignore` en la raíz:
```gitignore
# Python
__pycache__/
*.py[cod]
.venv/

# Django
db.sqlite3
staticfiles/

# Screenshots de auditoría / artefactos locales
*.png
.playwright-mcp/
.mcp.json
.claude/

# OS
Thumbs.db
.DS_Store
```

- [ ] **Step 2: Confirmar que los artefactos quedan ignorados**

Run:
```bash
git status --short | grep -E "\.png|playwright-mcp|\.mcp\.json|db\.sqlite3"
```
Expected: salida vacía (ya ignorados).

- [ ] **Step 3: Commitear docs valiosos + .gitignore**

```bash
git add .gitignore ARCHITECTURE.md AUDIT.md PLAN.md CLAUDE.md docs/
git commit -m "chore: agregar .gitignore y commitear documentación del proyecto"
```

- [ ] **Step 4: Verificar el árbol limpio**

Run:
```bash
git status --short
```
Expected: sin archivos `.png`, `.mcp.json`, `db.sqlite3` ni `.playwright-mcp/` listados como untracked.

---

## Task 8: Verificación end-to-end y actualización de documentación

**Contexto:** Cierre: la suite completa debe seguir verde y los docs deben reflejar los cambios (flag `REMATE_FINALIZADO`, asset `app.css`, manejo offline, CI).

**Files:**
- Modify: `CLAUDE.md`, `ARCHITECTURE.md`

- [ ] **Step 1: Correr la suite completa**

Run:
```bash
.venv/Scripts/python.exe manage.py test registros
```
Expected: OK, con al menos 59 tests (57 previos + 2 de `IndexPageTests`).

- [ ] **Step 2: Verificación E2E manual con Playwright (los 3 escenarios)**

Levantar el server y validar de punta a punta:
- **Remate finalizado:** banner visible + form deshabilitado.
- **Offline:** recarga sin red muestra aviso + datos cacheados (no pantalla vacía); guardado offline avisa sin error de consola.
- **Invitado en escritorio:** layout `.es-invitado` aplicado; escrituras siguen bloqueadas server-side.

- [ ] **Step 3: Actualizar `CLAUDE.md`**

En la sección de Frontend de `CLAUDE.md`, reflejar: (a) el JS vive en `registros/static/registros/js/app.js` (ya no inline en index.html), (b) Tailwind se sirve compilado desde `static/registros/css/app.css` (no CDN; regenerar con el comando de Task 5), (c) la plantilla inyecta `ES_OPERADOR`, `REMATE_ID` y `REMATE_FINALIZADO`, (d) hay CI en `.github/workflows/ci.yml`.

- [ ] **Step 4: Actualizar `ARCHITECTURE.md`**

Actualizar las secciones de Frontend y PWA en `ARCHITECTURE.md` para que coincidan con el estado real: JS extraído, CSS compilado, manejo offline mejorado (degradación a caché en recarga, escrituras con try/catch), modo solo-lectura para remate finalizado.

- [ ] **Step 5: Commit final**

```bash
git add CLAUDE.md ARCHITECTURE.md
git commit -m "docs: actualizar CLAUDE.md y ARCHITECTURE.md con cambios de frontend, CSS compilado y CI"
```

- [ ] **Step 6: Resumen de cierre**

Confirmar que: suite verde, los 3 escenarios E2E OK, repo limpio, CI presente. Reportar el estado final al usuario.

---

## Notas finales

- **Fuera de alcance (YAGNI):** cola de escrituras offline (reintento automático), índices/FTS de búsqueda (M-6), upgrade de `pip` local (DEP-3). Quedan documentados en `AUDIT.md`/`PLAN.md` por si se retoman.
- **Verificación JS:** el proyecto no tiene runner de tests JS; los cambios de `app.js` se verifican manualmente con Playwright (Tasks 2, 3, 4, 5, 8). Solo el flag de `index` tiene test Python (Task 2).
- **Riesgo conocido:** Task 5 depende de `npx tailwindcss@3` (Node v22 confirmado disponible). Si la generación fallara, el fallback es revertir a la línea del CDN en ambos HTML hasta resolver el tooling.
