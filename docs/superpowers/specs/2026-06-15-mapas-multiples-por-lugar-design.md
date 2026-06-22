# Mapas múltiples por lugar — Diseño

> Fecha: 2026-06-15
> Estado: propuesto (pendiente de aprobación del usuario antes del plan de implementación)

## Objetivo

Permitir que Planilla Rural maneje **distintos mapas de corrales según el lugar del remate** (ej. Sociedad Rural, Margarita Belén). Hoy hay un único layout global hardcodeado; queremos que cada remate use el mapa de su lugar.

## Estado actual (lo que se toca)

- `registros/corrales_layout.py`: layout **único y global** — `MAP_ROWS=35`, `MAP_COLS=47`, `CORRALES_DISPONIBLES` (IDs "2"–"130"), `CORRALES_LAYOUT` (celdas con `row/col/row_span/col_span/kind/label`).
- `registros/models.py`: `Registro.corral` es un `CharField` que guarda la etiqueta ("5", "PASILLO 1", "1"=TORIL). No hay entidad corral.
- `registros/view_helpers.py`: `get_corrales_disponibles()`, `get_pasillos_disponibles()`, `build_layout_with_pasillos_numerados()`, `normalize_corral()` **leen globals de módulo** — no reciben remate ni mapa.
- `registros/views.py`: `api_corrales_mapa` (mapa + ocupación), `api_registros` POST/PUT (alta/edición), `api_registro_mover` (mover) usan esos helpers.
- `templates/registros/index.html`: el render del mapa **ya es agnóstico al layout** — usa `corralesMapa.cols/rows/layout` de la API (`repeat(${cols}, 28px)`, líneas ~851-852, ~2166-2167) y ya pasa `REMATE_ID` al endpoint del mapa (~1993). Tiene pan/zoom para mapas grandes.
- `Remate.lugar` ya existe como texto libre (hoy cosmético).

## Decisiones cerradas (del brainstorming)

1. **Formato interno: JSON.** El layout se guarda como JSON validado en la DB. La app nunca parsea Excel en runtime.
2. **El Excel llega en formato "plano dibujado"** (celdas combinadas, como `PLANO RURAL.xlsx`). Es convertible automáticamente: las celdas combinadas dan `row/col/row_span/col_span`; el `kind` se deduce del texto ("PISTA"/"PASILLO"/"TORIL"/número→corral).
3. **Conversión vía comando de management (Opción A)**, corrido por el dev en local o en la consola de PythonAnywhere. openpyxl queda como **dependencia solo de desarrollo**. No hay upload web (Opción B descartada): esquiva C-2, no agrega superficie de ataque ni UI nueva en `index.html`.

## Diseño

### 1. Modelo de datos

Nuevo modelo `Mapa`:

```python
class Mapa(models.Model):
    nombre = models.CharField(max_length=160, unique=True)
    rows = models.PositiveSmallIntegerField()
    cols = models.PositiveSmallIntegerField()
    layout = models.JSONField()          # lista de celdas: {row, col, row_span, col_span, kind, label}
    es_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

- `es_default`: exactamente un `Mapa` con `True` (el sembrado desde `corrales_layout.py`). Es el fallback.
- `Mapa.to_dict()` devuelve `{id, nombre, rows, cols}` para listados livianos (sin el layout completo).

`Remate` suma:

```python
mapa = models.ForeignKey(Mapa, on_delete=models.SET_NULL, null=True, blank=True, related_name="remates")
```

- `on_delete=SET_NULL`: borrar un `Mapa` no destruye remates; caen al default.
- Si `remate.mapa` es null (remates legacy) → se usa el `Mapa` default.

### 2. Migración y seed

- Migración de esquema crea `Mapa` y agrega `Remate.mapa`.
- Migración de datos (o `RunPython`) crea el `Mapa` default ("Sociedad Rural") a partir de `MAP_ROWS/MAP_COLS/CORRALES_LAYOUT` actuales, con `es_default=True`.
- `corrales_layout.py` **se mantiene** como fuente del seed (no se borra).

### 3. Refactor map-aware (prerrequisito central)

Los helpers dejan de leer globals y reciben el `Mapa`:

- `get_corrales_disponibles(mapa)` → lee `mapa.layout`.
- `get_pasillos_disponibles(mapa)` → numera pasillos por orden dentro de `mapa.layout`.
- `build_layout_with_pasillos_numerados(mapa)` → idem, sobre `mapa.layout`.
- `normalize_corral(raw_value, mapa, allow_pasillo=..., strict_known_corrales=..., pasillos_validos=...)` → valida contra el mapa.
- Nuevo resolver: `get_mapa_activo(remate)` → `remate.mapa or Mapa.objects.filter(es_default=True).first()`.

Las vistas (`api_corrales_mapa`, `api_registros` POST/PUT, `api_registro_mover`) resuelven `mapa = get_mapa_activo(remate)` y se lo pasan a los helpers.

### 4. Selección de mapa al crear remate

- `crear_remate` (POST, ya operador-only) acepta `mapa_id`. Si no viene, usa el default.
- Nuevo endpoint `GET /api/mapas/` → `[{id, nombre}]` para poblar el `<select>` del formulario de creación de remate.
- El formulario de "nuevo remate" (página de remates) suma un `<select>` de mapas disponibles.

### 5. Conversor Excel→JSON (comando de management)

`registros/management/commands/importar_mapa.py`:

```
python manage.py importar_mapa --excel margarita_belen.xlsx --nombre "Margarita Belén"
```

- Usa openpyxl: itera `ws.merged_cells.ranges` (→ row/col/spans) y celdas sueltas con valor.
- Deduce `kind` del texto: "PISTA"→pista, "PASILLO"→pasillo, "TORIL"→toril, numérico→corral.
- Calcula `rows`/`cols` desde el rango usado.
- **Valida** el layout (ver reglas abajo) antes de crear el `Mapa`. Si falla, aborta con mensaje claro y no escribe nada.
- Flags: `--default` (marca este mapa como default, desmarca el anterior), `--dry-run` (imprime el JSON sin guardar).

openpyxl va a `requirements-dev.txt` (nuevo), **no** a `requirements.txt`.

### Reglas de validación del layout (compartidas por el comando y el modelo)

Una función `validar_layout(rows, cols, layout)` (en `view_helpers.py` o módulo nuevo `mapas.py`) que el comando llama y que también corre en `Mapa.clean()`:

- `layout` es lista no vacía de dicts.
- Cada celda: `row`, `col`, `row_span`, `col_span` enteros ≥1; `kind` ∈ {`corral`, `pasillo`, `toril`, `pista`}; `label` str.
- Cada celda entra dentro de la grilla: `row+row_span-1 ≤ rows` y `col+col_span-1 ≤ cols`.
- **Sin solapamientos** entre celdas (ocupación de grilla).
- `rows` y `cols` dentro de límites sanos (ej. 1..200) → evita DoS de render.
- Labels de `kind=corral` **únicos**.
- Al menos un `corral`.
- Como máximo un `toril`; el TORIL toma `corral_id="1"`. Ningún corral puede tener label "1" (colisión con TORIL).

## Las 4 dimensiones analizadas

### Interacción con AUDIT.md
- **C-2 (upload 100MB):** **esquivado** por la Opción A — no hay upload web de Excel. El comando corre fuera del path HTTP.
- **Auth operador-only:** crear remate (con su mapa) ya es operador-only en `crear_remate`. El comando corre en consola (solo el dev). No se agregan endpoints de escritura nuevos salvo `GET /api/mapas/` (lectura, `@require_api_login`).
- **I-1 (N+1 en `to_dict`):** agregar `Remate.mapa` no debe sumar queries; usar `select_related("mapa")` donde se serialicen remates si hiciera falta. El layout se lee una sola vez por request (no por registro).
- **C-3 (doble listener en `index.html`):** esta feature **no toca** la zona del bug (solo agrega un `<select>` en la página de remates, no en el `cardsContainer`). No bloqueante.
- **VIS-1 (escritura a remate finalizado):** relacionado pero **no bloqueante**. Sí aplicamos el bloqueo de "cambiar mapa de remate finalizado" como regla nueva (ver edge cases).

**Prerrequisito real:** el refactor map-aware (sección 3). No es un bug del AUDIT, es la base arquitectónica sin la cual el resto no se sostiene.

### Mobile vs desktop
- **Ver** un mapa distinto: el front ya es layout-agnóstico → renderiza solo en ambas vistas. Mapas muy anchos (cols grande) se manejan con el pan/zoom existente; en mobile siguen siendo más incómodos (limitación ya conocida del AUDIT, no la empeoramos).
- **Selección de mapa:** el `<select>` en el form de nuevo remate funciona igual en ambas vistas.
- **No hay editor in-app** → no hay drag/drop en celular. Evitado a propósito.

### Cambios de modelo
Sí: nuevo modelo `Mapa` + FK `Remate.mapa` + migración de esquema + migración de datos (seed del default). Detallado en secciones 1–2.

### Edge cases
- **Cambiar el mapa de un remate que ya tiene registros** → bloqueado (`Registro.objects.filter(remate=remate).exists()`). El mapa se fija al crear el remate y no se cambia después si hay datos.
- **Remate finalizado** → no se puede cambiar su mapa.
- **Remate legacy sin mapa** → fallback al default.
- **Excel inválido** (IDs duplicados, celdas solapadas, fuera de grilla, sin TORIL, sin corrales, rows/cols gigantes, JSON/encoding roto) → `validar_layout` aborta el comando con mensaje claro, no crea nada.
- **Pasillos numerados por orden** → "PASILLO 3" no significa lo mismo entre mapas; por eso un registro queda atado al mapa de su remate y no se migra entre mapas.
- **Colisión de labels con IDs reservados** (TORIL="1", prefijo "PASILLO") → validada.
- **Concurrencia** al importar el mismo nombre de mapa → `nombre` es `unique`; el segundo import falla limpio (o se actualiza con `--default`/re-import explícito; el comando avisa si ya existe).

## No-objetivos (fuera de alcance)
- Editor visual de mapas in-app (posible fase 2; el modelo de datos queda listo para soportarlo).
- Upload web de Excel (Opción B, descartada).
- Editar la geometría de un mapa ya cargado desde la app (se re-importa con el comando).
- Migrar registros de un mapa a otro.

## Testing
- `registros/tests.py` + el hook `run_tests` (corre `manage.py test registros` tras cada edición en `registros/`).
- Casos: `validar_layout` (válidos e inválidos), conversor `importar_mapa` (con un `.xlsx` sintético creado con openpyxl en el test), `normalize_corral` map-aware, `api_corrales_mapa` devuelve el mapa correcto por remate, fallback al default, bloqueo de cambio de mapa con registros / remate finalizado, `crear_remate` con `mapa_id`.

## Archivos afectados (resumen)
- `registros/models.py` — modelo `Mapa`, FK `Remate.mapa`, `Mapa.to_dict()`/`clean()`.
- `registros/migrations/000X_*.py` — esquema + seed del default.
- `registros/view_helpers.py` — helpers map-aware + `get_mapa_activo` + `validar_layout`.
- `registros/views.py` — `api_corrales_mapa`, `api_registros` POST/PUT, `api_registro_mover`, `crear_remate` (mapa_id), nuevo `api_mapas`.
- `registros/urls.py` — ruta `/api/mapas/`.
- `registros/management/commands/importar_mapa.py` — conversor (nuevo).
- `registros/templates/registros/` — `<select>` de mapa en el form de nuevo remate.
- `requirements-dev.txt` — openpyxl (nuevo archivo).
- `registros/corrales_layout.py` — se mantiene como fuente del seed.
