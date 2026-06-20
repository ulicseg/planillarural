# Mapas múltiples por lugar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada remate use el mapa de corrales de su lugar (ej. Margarita Belén), cargado desde Excel vía un comando, en vez del único layout global hardcodeado.

**Architecture:** Nuevo modelo `Mapa` (layout en JSONField) + FK `Remate.mapa` con fallback a un mapa default sembrado desde el layout actual. Los helpers de layout/validación dejan de leer globals de módulo y reciben el mapa del remate activo. Un comando de management convierte Excel→JSON (openpyxl, dep solo de desarrollo); el frontend del mapa ya es agnóstico al layout y no se toca.

**Tech Stack:** Django 5.2, SQLite, JSONField, Django unittest (`manage.py test`), openpyxl (solo dev).

---

## Convenciones (leer antes de empezar)

- **Indentación: TABs** en todos los archivos `.py` (convención del repo). `config/settings.py` usa espacios, pero acá no lo tocamos.
- **Tests:** Django `TestCase`, se corren con `python manage.py test registros.tests.<Clase>.<metodo>`. No es pytest. Los tests nuevos van como **clases nuevas** al final de `registros/tests.py`.
- **Idioma:** mensajes de error y dominio en español (es-AR), igual que el código existente.
- **Commits:** Conventional Commits (`feat:`, `refactor:`, `test:`), como el historial del repo.
- Hay un hook `PostToolUse` que corre `manage.py test registros` tras cada edición en `registros/`. Es esperable que quede en rojo entre el paso "test que falla" y el paso "implementación".

## Estructura de archivos

- **Crear** `registros/mapas.py` — lógica de dominio pura de mapas: constantes reservadas, `validar_layout()`, `parsear_excel()`. Sin imports de modelos (evita ciclos). openpyxl se importa **lazy** dentro de `parsear_excel`.
- **Modificar** `registros/models.py` — modelo `Mapa`, FK `Remate.mapa`, `Mapa.clean()`/`to_dict()`.
- **Crear** `registros/migrations/0004_mapa_remate_mapa.py` — esquema (generado con `makemigrations`).
- **Crear** `registros/migrations/0005_seed_mapa_default.py` — siembra el mapa default desde `corrales_layout.py`.
- **Modificar** `registros/view_helpers.py` — helpers map-aware + `get_mapa_activo()`. Las constantes `PASILLO_LABEL`/`TORIL_CORRAL_ID` se mueven a `mapas.py` y se reimportan.
- **Modificar** `registros/views.py` — call sites map-aware + endpoint `api_mapas` + `mapa_id` en `crear_remate`/`remates_home`.
- **Modificar** `registros/urls.py` — ruta `/api/mapas/`.
- **Modificar** `registros/templates/registros/remates.html` — `<select name="mapa_id">` en el form de nuevo remate.
- **Crear** `registros/management/commands/importar_mapa.py` — comando conversor.
- **Crear** `requirements-dev.txt` — openpyxl.
- **Modificar** `registros/tests.py` — clases de test nuevas.

---

## Task 1: Dominio de mapas — constantes y `validar_layout`

**Files:**
- Create: `registros/mapas.py`
- Modify: `registros/view_helpers.py:7,19-20`
- Test: `registros/tests.py` (clase nueva `MapaValidacionTests`)

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `registros/tests.py`:

```python
from .corrales_layout import MAP_ROWS, MAP_COLS, CORRALES_LAYOUT
from .mapas import validar_layout


class MapaValidacionTests(TestCase):
	def test_layout_valido_no_devuelve_errores(self):
		layout = [
			{"row": 1, "col": 1, "row_span": 2, "col_span": 3, "kind": "toril", "label": "TORIL"},
			{"row": 1, "col": 4, "row_span": 2, "col_span": 3, "kind": "corral", "label": "2"},
		]
		self.assertEqual(validar_layout(4, 6, layout), [])

	def test_celda_fuera_de_grilla(self):
		layout = [{"row": 1, "col": 5, "row_span": 1, "col_span": 4, "kind": "corral", "label": "2"}]
		errores = validar_layout(4, 6, layout)
		self.assertTrue(any("grilla" in e for e in errores))

	def test_celdas_solapadas(self):
		layout = [
			{"row": 1, "col": 1, "row_span": 2, "col_span": 2, "kind": "corral", "label": "2"},
			{"row": 2, "col": 2, "row_span": 1, "col_span": 1, "kind": "corral", "label": "3"},
		]
		errores = validar_layout(4, 4, layout)
		self.assertTrue(any("solapa" in e for e in errores))

	def test_kind_invalido(self):
		layout = [{"row": 1, "col": 1, "row_span": 1, "col_span": 1, "kind": "rampa", "label": "x"}]
		self.assertTrue(any("kind" in e for e in validar_layout(4, 4, layout)))

	def test_label_corral_reservado_toril(self):
		layout = [{"row": 1, "col": 1, "row_span": 1, "col_span": 1, "kind": "corral", "label": "1"}]
		self.assertTrue(any("reservado" in e for e in validar_layout(4, 4, layout)))

	def test_sin_corrales(self):
		layout = [{"row": 1, "col": 1, "row_span": 1, "col_span": 1, "kind": "pasillo", "label": "PASILLO"}]
		self.assertTrue(any("corral" in e for e in validar_layout(4, 4, layout)))

	def test_labels_corral_duplicados(self):
		layout = [
			{"row": 1, "col": 1, "row_span": 1, "col_span": 1, "kind": "corral", "label": "2"},
			{"row": 2, "col": 1, "row_span": 1, "col_span": 1, "kind": "corral", "label": "2"},
		]
		self.assertTrue(any("duplicad" in e for e in validar_layout(4, 4, layout)))

	def test_layout_real_es_valido(self):
		# El plano real (que será el mapa default) debe pasar la validación.
		self.assertEqual(validar_layout(MAP_ROWS, MAP_COLS, list(CORRALES_LAYOUT)), [])
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python manage.py test registros.tests.MapaValidacionTests`
Expected: FAIL con `ModuleNotFoundError: No module named 'registros.mapas'`.

- [ ] **Step 3: Crear `registros/mapas.py`**

```python
"""Dominio puro de mapas de corrales: constantes, validacion y parseo de Excel.

No importa modelos de Django para evitar ciclos. openpyxl se importa lazy
dentro de parsear_excel (es dependencia solo de desarrollo).
"""

PASILLO_LABEL = "PASILLO"
TORIL_CORRAL_ID = "1"
KINDS_VALIDOS = {"corral", "pasillo", "toril", "pista"}
MAX_GRID = 200


def validar_layout(rows, cols, layout):
	"""Devuelve una lista de mensajes de error. Lista vacia => layout valido."""
	errores = []

	if not isinstance(rows, int) or not isinstance(cols, int) or rows < 1 or cols < 1:
		return ["rows y cols deben ser enteros >= 1."]
	if rows > MAX_GRID or cols > MAX_GRID:
		return [f"rows y cols no pueden superar {MAX_GRID}."]
	if not isinstance(layout, list) or not layout:
		return ["El layout debe ser una lista no vacia de celdas."]

	ocupadas = set()
	labels_corral = []
	toriles = 0
	corrales = 0

	for i, celda in enumerate(layout):
		if not isinstance(celda, dict):
			errores.append(f"Celda {i}: debe ser un objeto.")
			continue

		kind = celda.get("kind")
		if kind not in KINDS_VALIDOS:
			errores.append(f"Celda {i}: kind invalido ({kind!r}).")
			continue

		try:
			row = int(celda["row"])
			col = int(celda["col"])
			row_span = int(celda.get("row_span", 1))
			col_span = int(celda.get("col_span", 1))
		except (KeyError, TypeError, ValueError):
			errores.append(f"Celda {i}: row/col/row_span/col_span deben ser enteros.")
			continue

		if row < 1 or col < 1 or row_span < 1 or col_span < 1:
			errores.append(f"Celda {i}: row/col/spans deben ser >= 1.")
			continue

		if row + row_span - 1 > rows or col + col_span - 1 > cols:
			errores.append(f"Celda {i}: se sale de la grilla {rows}x{cols}.")
			continue

		celda_ocupa = [(r, c) for r in range(row, row + row_span) for c in range(col, col + col_span)]
		solapa = [p for p in celda_ocupa if p in ocupadas]
		if solapa:
			errores.append(f"Celda {i}: se solapa con otra celda en {solapa[0]}.")
		ocupadas.update(celda_ocupa)

		label = str(celda.get("label", "")).strip()
		if kind == "toril":
			toriles += 1
		if kind == "corral":
			corrales += 1
			labels_corral.append(label)

	if corrales == 0:
		errores.append("Debe haber al menos un corral.")
	if toriles > 1:
		errores.append("Solo puede haber un toril.")

	duplicados = sorted({l for l in labels_corral if labels_corral.count(l) > 1})
	if duplicados:
		errores.append(f"Labels de corral duplicados: {duplicados}.")
	if TORIL_CORRAL_ID in labels_corral:
		errores.append(f"Ningun corral puede tener el label reservado '{TORIL_CORRAL_ID}' (TORIL).")

	return errores
```

- [ ] **Step 4: Mover las constantes a `mapas.py` desde `view_helpers.py`**

En `registros/view_helpers.py`, reemplazar las líneas 19-20:

```python
PASILLO_LABEL = "PASILLO"
TORIL_CORRAL_ID = "1"
```

por una reimportación (dejar el resto del archivo igual por ahora):

```python
from .mapas import PASILLO_LABEL, TORIL_CORRAL_ID
```

Mover esa línea de import al bloque de imports superior (junto al `from .corrales_layout import ...` de la línea 7). El `from .corrales_layout import CORRALES_DISPONIBLES, CORRALES_LAYOUT` se deja por ahora (se quita en Task 5).

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `python manage.py test registros.tests.MapaValidacionTests`
Expected: PASS (8 tests). Si `test_layout_real_es_valido` falla por solapamiento, revisar `validar_layout` contra los datos reales de `corrales_layout.py` antes de continuar.

Run también la suite completa para confirmar que el move de constantes no rompió nada:
Run: `python manage.py test registros`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add registros/mapas.py registros/view_helpers.py registros/tests.py
git commit -m "feat(mapas): agregar validacion de layout y constantes de dominio"
```

---

## Task 2: Modelo `Mapa` y FK `Remate.mapa`

**Files:**
- Modify: `registros/models.py:11-44` (Remate) y final del archivo (Mapa)
- Create: `registros/migrations/0004_mapa_remate_mapa.py` (vía makemigrations)
- Test: `registros/tests.py` (clase nueva `MapaModelTests`)

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `registros/tests.py`:

```python
from django.core.exceptions import ValidationError
from .models import Mapa


class MapaModelTests(TestCase):
	def _layout_valido(self):
		return [
			{"row": 1, "col": 1, "row_span": 2, "col_span": 3, "kind": "toril", "label": "TORIL"},
			{"row": 1, "col": 4, "row_span": 2, "col_span": 3, "kind": "corral", "label": "2"},
		]

	def test_mapa_valido_pasa_full_clean(self):
		mapa = Mapa(nombre="Test", rows=4, cols=6, layout=self._layout_valido())
		mapa.full_clean()  # no debe levantar

	def test_mapa_invalido_levanta_validation_error(self):
		mapa = Mapa(nombre="Roto", rows=4, cols=6, layout=[
			{"row": 1, "col": 1, "row_span": 1, "col_span": 1, "kind": "corral", "label": "1"},
		])
		with self.assertRaises(ValidationError):
			mapa.full_clean()

	def test_to_dict_es_liviano(self):
		mapa = Mapa.objects.create(nombre="Test", rows=4, cols=6, layout=self._layout_valido())
		d = mapa.to_dict()
		self.assertEqual(set(d.keys()), {"id", "nombre", "rows", "cols"})

	def test_remate_tiene_fk_mapa(self):
		mapa = Mapa.objects.create(nombre="Test", rows=4, cols=6, layout=self._layout_valido())
		remate = Remate.objects.create(nombre="R con mapa", mapa=mapa)
		self.assertEqual(remate.mapa_id, mapa.id)
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python manage.py test registros.tests.MapaModelTests`
Expected: FAIL con `ImportError: cannot import name 'Mapa'`.

- [ ] **Step 3: Implementar el modelo `Mapa` y la FK**

En `registros/models.py`, agregar el import al inicio (junto a los otros):

```python
from django.core.exceptions import ValidationError
```

Agregar el modelo `Mapa` **antes** de la clase `Remate`:

```python
class Mapa(models.Model):
	nombre = models.CharField(max_length=160, unique=True)
	rows = models.PositiveSmallIntegerField()
	cols = models.PositiveSmallIntegerField()
	layout = models.JSONField()
	es_default = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["nombre"]

	def __str__(self):
		return self.nombre

	def clean(self):
		from .mapas import validar_layout
		errores = validar_layout(self.rows, self.cols, self.layout)
		if errores:
			raise ValidationError({"layout": errores})

	def to_dict(self):
		return {
			"id": self.id,
			"nombre": self.nombre,
			"rows": self.rows,
			"cols": self.cols,
		}
```

En la clase `Remate`, agregar el campo FK (debajo de `finalizado_at`):

```python
	mapa = models.ForeignKey("Mapa", on_delete=models.SET_NULL, null=True, blank=True, related_name="remates")
```

- [ ] **Step 4: Generar la migración de esquema (con nombre forzado)**

Run: `python manage.py makemigrations registros --name mapa_remate_mapa`
Expected: crea exactamente `registros/migrations/0004_mapa_remate_mapa.py` con `CreateModel(Mapa)` y `AddField(remate.mapa)`. (Forzar `--name` garantiza que la migración de datos de la Task 3 pueda depender de `0004_mapa_remate_mapa`.)

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `python manage.py test registros.tests.MapaModelTests`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add registros/models.py registros/migrations/0004_mapa_remate_mapa.py registros/tests.py
git commit -m "feat(mapas): modelo Mapa y FK Remate.mapa con validacion en clean"
```

---

## Task 3: Migración de datos — sembrar el mapa default

**Files:**
- Create: `registros/migrations/0005_seed_mapa_default.py`
- Test: `registros/tests.py` (clase nueva `MapaSeedTests`)

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `registros/tests.py`:

```python
class MapaSeedTests(TestCase):
	def test_existe_un_unico_mapa_default(self):
		defaults = Mapa.objects.filter(es_default=True)
		self.assertEqual(defaults.count(), 1)

	def test_mapa_default_replica_el_plano_actual(self):
		mapa = Mapa.objects.get(es_default=True)
		self.assertEqual(mapa.rows, MAP_ROWS)
		self.assertEqual(mapa.cols, MAP_COLS)
		self.assertEqual(len(mapa.layout), len(CORRALES_LAYOUT))
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python manage.py test registros.tests.MapaSeedTests`
Expected: FAIL — `Mapa.objects.filter(es_default=True).count()` es 0 (la migración de datos todavía no existe).

- [ ] **Step 3: Crear la migración de datos**

Crear `registros/migrations/0005_seed_mapa_default.py`:

```python
from django.db import migrations

from registros.corrales_layout import MAP_ROWS, MAP_COLS, CORRALES_LAYOUT


def crear_mapa_default(apps, schema_editor):
	Mapa = apps.get_model("registros", "Mapa")
	if Mapa.objects.filter(es_default=True).exists():
		return
	Mapa.objects.create(
		nombre="Sociedad Rural",
		rows=MAP_ROWS,
		cols=MAP_COLS,
		layout=[dict(celda) for celda in CORRALES_LAYOUT],
		es_default=True,
	)


def borrar_mapa_default(apps, schema_editor):
	Mapa = apps.get_model("registros", "Mapa")
	Mapa.objects.filter(nombre="Sociedad Rural", es_default=True).delete()


class Migration(migrations.Migration):
	dependencies = [
		("registros", "0004_mapa_remate_mapa"),
	]
	operations = [
		migrations.RunPython(crear_mapa_default, borrar_mapa_default),
	]
```

- [ ] **Step 4: Aplicar y correr los tests**

Run: `python manage.py migrate`
Expected: aplica `0004` y `0005` sin error.

Run: `python manage.py test registros.tests.MapaSeedTests`
Expected: PASS (2 tests). (Django re-corre migraciones al crear la DB de test, así que el default queda sembrado.)

- [ ] **Step 5: Commit**

```bash
git add registros/migrations/0005_seed_mapa_default.py registros/tests.py
git commit -m "feat(mapas): sembrar mapa default Sociedad Rural desde el plano actual"
```

---

## Task 4: Resolver `get_mapa_activo`

**Files:**
- Modify: `registros/view_helpers.py` (agregar función tras `get_remate_activo`, ~línea 47)
- Test: `registros/tests.py` (clase nueva `MapaActivoTests`)

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `registros/tests.py`:

```python
from .view_helpers import get_mapa_activo


class MapaActivoTests(TestCase):
	def test_remate_sin_mapa_cae_al_default(self):
		remate = Remate.objects.create(nombre="Sin mapa")
		mapa = get_mapa_activo(remate)
		self.assertTrue(mapa.es_default)

	def test_remate_con_mapa_devuelve_su_mapa(self):
		otro = Mapa.objects.create(nombre="Margarita Belen", rows=4, cols=6, layout=[
			{"row": 1, "col": 1, "row_span": 1, "col_span": 1, "kind": "corral", "label": "2"},
		])
		remate = Remate.objects.create(nombre="Con mapa", mapa=otro)
		self.assertEqual(get_mapa_activo(remate).id, otro.id)

	def test_remate_none_cae_al_default(self):
		self.assertTrue(get_mapa_activo(None).es_default)
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python manage.py test registros.tests.MapaActivoTests`
Expected: FAIL con `ImportError: cannot import name 'get_mapa_activo'`.

- [ ] **Step 3: Implementar `get_mapa_activo`**

En `registros/view_helpers.py`, agregar el import de `Mapa` (en la línea 8, junto a los otros modelos):

```python
from .models import Mapa, PreferenciaRemateUsuario, Registro, Remate
```

Agregar la función después de `get_remate_activo` (tras la línea 47):

```python
def get_mapa_activo(remate):
	if remate is not None and remate.mapa_id:
		return remate.mapa
	return Mapa.objects.filter(es_default=True).first()
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `python manage.py test registros.tests.MapaActivoTests`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add registros/view_helpers.py registros/tests.py
git commit -m "feat(mapas): resolver get_mapa_activo con fallback al default"
```

---

## Task 5: Helpers de layout map-aware + call sites

**Files:**
- Modify: `registros/view_helpers.py:7,136-203` (helpers)
- Modify: `registros/views.py:28-45,375-377,433-435,478-495,511-518`
- Test: `registros/tests.py` (clase nueva `NormalizeCorralMapaTests`)

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `registros/tests.py`:

```python
from .view_helpers import (
	get_corrales_disponibles,
	get_pasillos_disponibles,
	normalize_corral,
)


class NormalizeCorralMapaTests(TestCase):
	def setUp(self):
		self.mapa = Mapa.objects.create(nombre="MB", rows=6, cols=6, layout=[
			{"row": 1, "col": 1, "row_span": 2, "col_span": 2, "kind": "toril", "label": "TORIL"},
			{"row": 1, "col": 3, "row_span": 2, "col_span": 2, "kind": "corral", "label": "2"},
			{"row": 3, "col": 1, "row_span": 1, "col_span": 4, "kind": "pasillo", "label": "PASILLO"},
		])

	def test_corrales_disponibles_incluye_toril_y_corrales(self):
		corrales = get_corrales_disponibles(self.mapa)
		self.assertIn("1", corrales)   # TORIL
		self.assertIn("2", corrales)
		self.assertNotIn("3", corrales)

	def test_pasillos_numerados_desde_el_mapa(self):
		self.assertEqual(get_pasillos_disponibles(self.mapa), ["PASILLO 1"])

	def test_normalize_corral_valido(self):
		corral, error = normalize_corral("2", self.mapa)
		self.assertEqual(corral, "2")
		self.assertIsNone(error)

	def test_normalize_corral_inexistente_estricto(self):
		corral, error = normalize_corral("99", self.mapa, strict_known_corrales=True)
		self.assertIsNone(corral)
		self.assertIsNotNone(error)

	def test_normalize_pasillo_requiere_allow(self):
		corral, error = normalize_corral("PASILLO 1", self.mapa, allow_pasillo=False)
		self.assertIsNone(corral)
		self.assertIn("activar", error)

	def test_normalize_pasillo_con_allow(self):
		corral, error = normalize_corral("PASILLO 1", self.mapa, allow_pasillo=True)
		self.assertEqual(corral, "PASILLO 1")
		self.assertIsNone(error)
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python manage.py test registros.tests.NormalizeCorralMapaTests`
Expected: FAIL — `get_corrales_disponibles()` actual no acepta argumento `mapa` (TypeError).

- [ ] **Step 3: Reescribir los helpers para que reciban `mapa`**

En `registros/view_helpers.py`, quitar de la línea 7 el import de los globals (ya no se usan):

```python
# borrar esta linea:
from .corrales_layout import CORRALES_DISPONIBLES, CORRALES_LAYOUT
```

Reemplazar `get_corrales_disponibles`, `get_pasillos_disponibles`, `build_layout_with_pasillos_numerados`, `get_ubicaciones_disponibles` y `normalize_corral` (líneas 136-203) por:

```python
def get_corrales_disponibles(mapa):
	corrales = [TORIL_CORRAL_ID]
	for celda in (mapa.layout if mapa else []):
		if celda.get("kind") == "corral":
			label = str(celda.get("label", "")).strip()
			if label and label != TORIL_CORRAL_ID:
				corrales.append(label)
	return corrales


def get_pasillos_disponibles(mapa):
	pasillos = []
	index = 0
	for celda in (mapa.layout if mapa else []):
		if celda.get("kind") == "pasillo":
			index += 1
			pasillos.append(f"{PASILLO_LABEL} {index}")
	return pasillos


def build_layout_with_pasillos_numerados(mapa):
	layout = []
	pasillo_index = 0
	for celda in (mapa.layout if mapa else []):
		kind = celda.get("kind")
		if kind == "toril":
			cell_copy = dict(celda)
			cell_copy["corral_id"] = TORIL_CORRAL_ID
			cell_copy["display_label"] = TORIL_CORRAL_ID
			layout.append(cell_copy)
			continue
		if kind != "pasillo":
			layout.append(dict(celda))
			continue
		pasillo_index += 1
		cell_copy = dict(celda)
		cell_copy["pasillo_id"] = f"{PASILLO_LABEL} {pasillo_index}"
		cell_copy["display_label"] = f"P{pasillo_index}"
		layout.append(cell_copy)
	return layout


def get_ubicaciones_disponibles(mapa, include_pasillos=False, pasillos=None):
	ubicaciones = get_corrales_disponibles(mapa)
	if include_pasillos:
		ubicaciones.extend(pasillos or get_pasillos_disponibles(mapa))
	return ubicaciones


def normalize_corral(raw_value, mapa, allow_pasillo=False, strict_known_corrales=False):
	corral = (raw_value or "").strip().upper()
	if not corral:
		return "", None

	pasillos = set(get_pasillos_disponibles(mapa))
	corrales_validos = {c.upper() for c in get_corrales_disponibles(mapa)}

	if corral in corrales_validos:
		return corral, None

	if corral.startswith(PASILLO_LABEL):
		if corral not in pasillos:
			return None, "Pasillo invalido. Debe seleccionar un pasillo numerado existente."
		if not allow_pasillo:
			return None, "Para guardar en pasillos debes activar la opcion en Corrales."
		return corral, None

	if strict_known_corrales:
		return None, "Corral invalido. Debe ser un corral disponible o PASILLO con permiso activo."

	return corral, None
```

- [ ] **Step 4: Actualizar los call sites en `views.py`**

(a) En el import desde `view_helpers` (líneas 28-45), agregar `get_mapa_activo`:

```python
	get_mapa_activo,
```

(b) `api_corrales_mapa` (líneas 478-495). Reemplazar el cuerpo por:

```python
def api_corrales_mapa(request):
	remate = get_remate_activo(request.user)
	mapa = get_mapa_activo(remate)
	pasillos = get_pasillos_disponibles(mapa)
	layout = build_layout_with_pasillos_numerados(mapa)
	corrales = get_corrales_disponibles(mapa)
	return JsonResponse(
		{
			"data": {
				"rows": mapa.rows if mapa else MAP_ROWS,
				"cols": mapa.cols if mapa else MAP_COLS,
				"layout": layout,
				"corrales": corrales,
				"pasillos": pasillos,
				"ubicaciones": get_ubicaciones_disponibles(mapa, include_pasillos=False, pasillos=pasillos),
				"ocupacion": get_ocupacion_corrales(remate),
				"mapaNombre": mapa.nombre if mapa else "",
			}
		}
	)
```

(El import `from .corrales_layout import MAP_COLS, MAP_ROWS` de la línea 26 se mantiene: es el fallback cuando todavía no hay ningún mapa.)

(c) `api_registros` POST (líneas 375-377). Reemplazar:

```python
	pasillos_disponibles = get_pasillos_disponibles()
	allow_pasillo = parse_bool(payload.get("allowPasillo"))
	corral, corral_error = normalize_corral(payload.get("corral"), allow_pasillo=allow_pasillo, pasillos_validos=pasillos_disponibles)
```

por:

```python
	mapa = get_mapa_activo(remate)
	allow_pasillo = parse_bool(payload.get("allowPasillo"))
	corral, corral_error = normalize_corral(payload.get("corral"), mapa, allow_pasillo=allow_pasillo)
```

(d) `api_registro_detail` PUT (líneas 433-435). Reemplazar exactamente igual que en (c):

```python
	mapa = get_mapa_activo(remate)
	allow_pasillo = parse_bool(payload.get("allowPasillo"))
	corral, corral_error = normalize_corral(payload.get("corral"), mapa, allow_pasillo=allow_pasillo)
```

(e) `api_registro_mover` (líneas 511-518). Reemplazar:

```python
	pasillos_disponibles = get_pasillos_disponibles()
	allow_pasillo = parse_bool(payload.get("allowPasillo"))
	destino_corral, corral_error = normalize_corral(
		payload.get("destinoCorral"),
		allow_pasillo=allow_pasillo,
		strict_known_corrales=True,
		pasillos_validos=pasillos_disponibles,
	)
```

por:

```python
	mapa = get_mapa_activo(remate)
	allow_pasillo = parse_bool(payload.get("allowPasillo"))
	destino_corral, corral_error = normalize_corral(
		payload.get("destinoCorral"),
		mapa,
		allow_pasillo=allow_pasillo,
		strict_known_corrales=True,
	)
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `python manage.py test registros.tests.NormalizeCorralMapaTests`
Expected: PASS (6 tests).

Run la suite completa (los call sites cambiaron):
Run: `python manage.py test registros`
Expected: PASS — incluido `test_guest_role_permissions` que llama a `api-corrales-mapa` y a alta/edición/mover.

- [ ] **Step 6: Commit**

```bash
git add registros/view_helpers.py registros/views.py registros/tests.py
git commit -m "refactor(mapas): helpers de layout y normalize_corral reciben el mapa del remate activo"
```

---

## Task 6: Endpoint `GET /api/mapas/`

**Files:**
- Modify: `registros/views.py:27` (import) y final del archivo (vista nueva)
- Modify: `registros/urls.py:23-24`
- Test: `registros/tests.py` (clase nueva `ApiMapasTests`)

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `registros/tests.py`:

```python
@override_settings(OPERADOR_USERNAMES=["operador1"])
class ApiMapasTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(username="operador1", password="Clave12345")
		self.client.login(username="operador1", password="Clave12345")

	def test_lista_mapas_incluye_default(self):
		response = self.client.get(reverse("api-mapas"))
		self.assertEqual(response.status_code, 200)
		nombres = [m["nombre"] for m in response.json()["data"]]
		self.assertIn("Sociedad Rural", nombres)

	def test_requiere_autenticacion(self):
		self.client.logout()
		response = self.client.get(reverse("api-mapas"))
		self.assertEqual(response.status_code, 401)
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python manage.py test registros.tests.ApiMapasTests`
Expected: FAIL con `NoReverseMatch: 'api-mapas' not found`.

- [ ] **Step 3: Implementar la vista y la ruta**

En `registros/views.py`, actualizar el import de modelos (línea 27):

```python
from .models import Mapa, Registro, Remate
```

Agregar la vista al final del archivo:

```python
@require_http_methods(["GET"])
@require_api_login
def api_mapas(request):
	mapas = Mapa.objects.all()
	return JsonResponse({"data": [mapa.to_dict() for mapa in mapas]})
```

En `registros/urls.py`, agregar la ruta tras la línea 23 (`api/corrales/mapa/`):

```python
    path("api/mapas/", views.api_mapas, name="api-mapas"),
```

(Nota: `urls.py` usa espacios para indentar — respetar eso en este archivo.)

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `python manage.py test registros.tests.ApiMapasTests`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add registros/views.py registros/urls.py registros/tests.py
git commit -m "feat(mapas): endpoint GET /api/mapas/ para listar mapas disponibles"
```

---

## Task 7: Selección de mapa al crear remate

**Files:**
- Modify: `registros/views.py:212-249` (`remates_home` y `crear_remate`)
- Modify: `registros/templates/registros/remates.html:27-32`
- Test: `registros/tests.py` (clase nueva `CrearRemateMapaTests`)

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `registros/tests.py`:

```python
@override_settings(OPERADOR_USERNAMES=["operador1"])
class CrearRemateMapaTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(username="operador1", password="Clave12345")
		PreferenciaRemateUsuario.objects.create(usuario=self.user, remate=None)
		self.client.login(username="operador1", password="Clave12345")

	def test_crear_remate_con_mapa_explicito(self):
		mapa = Mapa.objects.create(nombre="Margarita Belen", rows=4, cols=6, layout=[
			{"row": 1, "col": 1, "row_span": 1, "col_span": 1, "kind": "corral", "label": "2"},
		])
		response = self.client.post(reverse("crear-remate"), data={"nombre": "Remate MB", "mapa_id": str(mapa.id)})
		self.assertEqual(response.status_code, 302)
		remate = Remate.objects.get(nombre="Remate MB")
		self.assertEqual(remate.mapa_id, mapa.id)

	def test_crear_remate_sin_mapa_usa_default(self):
		response = self.client.post(reverse("crear-remate"), data={"nombre": "Remate sin mapa"})
		self.assertEqual(response.status_code, 302)
		remate = Remate.objects.get(nombre="Remate sin mapa")
		self.assertTrue(remate.mapa.es_default)

	def test_crear_remate_con_mapa_inexistente_400(self):
		response = self.client.post(reverse("crear-remate"), data={"nombre": "X", "mapa_id": "99999"})
		self.assertEqual(response.status_code, 400)

	def test_remates_home_pasa_mapas_al_contexto(self):
		response = self.client.get(reverse("remates-home"))
		self.assertIn("mapas", response.context)
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python manage.py test registros.tests.CrearRemateMapaTests`
Expected: FAIL — `test_crear_remate_con_mapa_explicito` da `remate.mapa_id` None (todavía no se lee `mapa_id`).

- [ ] **Step 3: Implementar la lectura de `mapa_id` y el contexto**

En `registros/views.py`, en `remates_home` (líneas 215-224), agregar `mapas` al contexto del `render`:

```python
	return render(
		request,
		"registros/remates.html",
		{
			"remate_seleccionado": preferencia.remate,
			"remates_abiertos": remates.filter(finalizado=False),
			"remates_finalizados": remates.filter(finalizado=True),
			"es_operador": is_operador(request.user),
			"mapas": Mapa.objects.all(),
		},
	)
```

En `crear_remate`, después de calcular `lugar` (línea 235) y antes del bloque `with transaction.atomic()`, agregar la resolución del mapa:

```python
	mapa_id_raw = (request.POST.get("mapa_id") or "").strip()
	mapa = None
	if mapa_id_raw:
		if not mapa_id_raw.isdigit():
			return HttpResponseBadRequest("Mapa invalido.")
		mapa = Mapa.objects.filter(id=int(mapa_id_raw)).first()
		if mapa is None:
			return HttpResponseBadRequest("Mapa inexistente.")
	if mapa is None:
		mapa = Mapa.objects.filter(es_default=True).first()
```

Y en la creación del remate (línea 246), pasar el mapa:

```python
		remate = Remate.objects.create(nombre=nombre, fecha=fecha, lugar=lugar, mapa=mapa)
```

- [ ] **Step 4: Agregar el `<select>` en el template**

En `registros/templates/registros/remates.html`, después del input de `lugar` (línea 32), agregar:

```html
            <select name="mapa_id" class="rounded-md border border-app-leaf/45 bg-white px-3 py-2.5 text-sm font-semibold">
              {% for mapa in mapas %}
              <option value="{{ mapa.id }}"{% if mapa.es_default %} selected{% endif %}>{{ mapa.nombre }}</option>
              {% endfor %}
            </select>
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `python manage.py test registros.tests.CrearRemateMapaTests`
Expected: PASS (4 tests).

Run la suite completa:
Run: `python manage.py test registros`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add registros/views.py registros/templates/registros/remates.html registros/tests.py
git commit -m "feat(mapas): elegir mapa al crear remate (select + validacion server-side)"
```

---

## Task 8: Conversor Excel→JSON y comando `importar_mapa`

**Files:**
- Modify: `registros/mapas.py` (agregar `parsear_excel` y helpers)
- Create: `registros/management/commands/importar_mapa.py`
- Create: `requirements-dev.txt`
- Test: `registros/tests.py` (clase nueva `ImportarMapaCommandTests`)

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `registros/tests.py`:

```python
import tempfile
from pathlib import Path
from django.core.management import CommandError


@override_settings(OPERADOR_USERNAMES=["operador1"])
class ImportarMapaCommandTests(TestCase):
	def _crear_xlsx(self, ruta):
		from openpyxl import Workbook
		wb = Workbook()
		ws = wb.active
		ws.merge_cells("A1:C2")
		ws["A1"] = "TORIL"
		ws.merge_cells("D1:F2")
		ws["D1"] = "2"
		ws["A3"] = "PASILLO"
		wb.save(ruta)

	def test_importar_crea_mapa_desde_excel(self):
		with tempfile.TemporaryDirectory() as tmp:
			ruta = Path(tmp) / "mb.xlsx"
			self._crear_xlsx(ruta)
			call_command("importar_mapa", excel=str(ruta), nombre="Margarita Belen")

		mapa = Mapa.objects.get(nombre="Margarita Belen")
		self.assertEqual(mapa.cols, 6)
		self.assertEqual(mapa.rows, 3)
		kinds = {(c["kind"], c["label"]) for c in mapa.layout}
		self.assertIn(("toril", "TORIL"), kinds)
		self.assertIn(("corral", "2"), kinds)
		self.assertIn(("pasillo", "PASILLO"), kinds)

	def test_importar_nombre_duplicado_falla(self):
		Mapa.objects.create(nombre="Margarita Belen", rows=4, cols=6, layout=[
			{"row": 1, "col": 1, "row_span": 1, "col_span": 1, "kind": "corral", "label": "2"},
		])
		with tempfile.TemporaryDirectory() as tmp:
			ruta = Path(tmp) / "mb.xlsx"
			self._crear_xlsx(ruta)
			with self.assertRaises(CommandError):
				call_command("importar_mapa", excel=str(ruta), nombre="Margarita Belen")

	def test_importar_archivo_inexistente_falla(self):
		with self.assertRaises(CommandError):
			call_command("importar_mapa", excel="no_existe.xlsx", nombre="X")
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python manage.py test registros.tests.ImportarMapaCommandTests`
Expected: FAIL con `CommandError: Unknown command: 'importar_mapa'`.

- [ ] **Step 3: Implementar `parsear_excel` en `mapas.py`**

Agregar al final de `registros/mapas.py`:

```python
def _kind_desde_valor(valor):
	texto = str(valor).strip().upper()
	if texto == "PISTA":
		return "pista", "PISTA"
	if texto.startswith(PASILLO_LABEL):
		return "pasillo", PASILLO_LABEL
	if texto == "TORIL":
		return "toril", "TORIL"
	return "corral", texto


def _agregar_celda(layout, vistas, row, col, row_span, col_span, valor):
	if valor is None or str(valor).strip() == "":
		return
	kind, label = _kind_desde_valor(valor)
	layout.append({
		"row": row,
		"col": col,
		"row_span": row_span,
		"col_span": col_span,
		"kind": kind,
		"label": label,
	})
	for r in range(row, row + row_span):
		for c in range(col, col + col_span):
			vistas.add((r, c))


def parsear_excel(path):
	"""Convierte un Excel (plano dibujado con celdas combinadas) en (rows, cols, layout).

	openpyxl es dependencia solo de desarrollo: se importa aca, no a nivel de modulo.
	"""
	from openpyxl import load_workbook

	wb = load_workbook(path, data_only=True)
	ws = wb.active
	layout = []
	vistas = set()

	for rango in ws.merged_cells.ranges:
		valor = ws.cell(row=rango.min_row, column=rango.min_col).value
		_agregar_celda(
			layout, vistas,
			rango.min_row, rango.min_col,
			rango.max_row - rango.min_row + 1,
			rango.max_col - rango.min_col + 1,
			valor,
		)

	for fila in ws.iter_rows():
		for cell in fila:
			if cell.value is None:
				continue
			if (cell.row, cell.column) in vistas:
				continue
			_agregar_celda(layout, vistas, cell.row, cell.column, 1, 1, cell.value)

	rows = max((c["row"] + c["row_span"] - 1 for c in layout), default=0)
	cols = max((c["col"] + c["col_span"] - 1 for c in layout), default=0)
	return rows, cols, layout
```

- [ ] **Step 4: Crear el comando de management**

Crear `registros/management/commands/importar_mapa.py`:

```python
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from registros.mapas import parsear_excel, validar_layout
from registros.models import Mapa


class Command(BaseCommand):
	help = "Importa un mapa de corrales desde un Excel (plano dibujado) y crea un Mapa."

	def add_arguments(self, parser):
		parser.add_argument("--excel", required=True, help="Ruta al archivo .xlsx")
		parser.add_argument("--nombre", required=True, help="Nombre del mapa (unico)")
		parser.add_argument("--default", action="store_true", help="Marca este mapa como el default")
		parser.add_argument("--dry-run", action="store_true", help="Imprime el JSON sin guardar")

	def handle(self, *args, **opts):
		ruta = Path(opts["excel"])
		if not ruta.exists():
			raise CommandError(f"No existe el archivo: {ruta}")

		rows, cols, layout = parsear_excel(str(ruta))
		errores = validar_layout(rows, cols, layout)
		if errores:
			raise CommandError("Layout invalido:\n- " + "\n- ".join(errores))

		if opts["dry_run"]:
			self.stdout.write(json.dumps(
				{"nombre": opts["nombre"], "rows": rows, "cols": cols, "layout": layout},
				ensure_ascii=False, indent=2,
			))
			return

		if Mapa.objects.filter(nombre=opts["nombre"]).exists():
			raise CommandError(f"Ya existe un mapa con nombre {opts['nombre']!r}.")

		with transaction.atomic():
			if opts["default"]:
				Mapa.objects.filter(es_default=True).update(es_default=False)
			Mapa.objects.create(
				nombre=opts["nombre"],
				rows=rows,
				cols=cols,
				layout=layout,
				es_default=opts["default"],
			)

		self.stdout.write(self.style.SUCCESS(
			f"Mapa {opts['nombre']!r} creado ({rows}x{cols}, {len(layout)} celdas)."
		))
```

- [ ] **Step 5: Crear `requirements-dev.txt`**

Crear `requirements-dev.txt` en la raíz:

```
-r requirements.txt
openpyxl==3.1.5
```

- [ ] **Step 6: Correr los tests para verificar que pasan**

Run: `python manage.py test registros.tests.ImportarMapaCommandTests`
Expected: PASS (3 tests).

Run la suite completa:
Run: `python manage.py test registros`
Expected: PASS (todas las clases).

- [ ] **Step 7: Commit**

```bash
git add registros/mapas.py registros/management/commands/importar_mapa.py requirements-dev.txt registros/tests.py
git commit -m "feat(mapas): comando importar_mapa (Excel->JSON) con openpyxl como dep de desarrollo"
```

---

## Verificación final

- [ ] **Suite completa verde:** `python manage.py test registros` → PASS.
- [ ] **Check de deploy:** `python manage.py check --deploy` → sin errores nuevos.
- [ ] **Prueba manual del comando** (opcional, con un Excel real): `python manage.py importar_mapa --excel PLANO_MB.xlsx --nombre "Margarita Belén" --dry-run` → imprime JSON; sin `--dry-run` crea el mapa.
- [ ] **Prueba manual end-to-end:** crear un remate eligiendo "Margarita Belén" en el select, entrar al mapa y verificar que rendea el layout nuevo en mobile y desktop.

## Notas de diseño (referencia)

- **YAGNI — sin endpoint para cambiar el mapa de un remate existente.** El mapa se fija al crear el remate. No hay UI para cambiarlo, así que el edge case "cambiar mapa con registros cargados" no puede ocurrir desde la app. Si en el futuro se agrega esa función, hay que bloquear el cambio cuando `Registro.objects.filter(remate=remate).exists()` o el remate está finalizado.
- **C-2 esquivado:** el Excel se convierte vía comando (fuera del path HTTP). openpyxl no entra a producción (`requirements.txt` queda con solo Django + Pillow; openpyxl vive en `requirements-dev.txt`).
- **Sin N+1 nuevo:** `Mapa` se resuelve una vez por request en las vistas; `Registro.to_dict()` no toca `mapa`. El N+1 preexistente (I-1, `to_dict` → `self.remate`) queda igual, fuera de alcance.
- **Frontend del mapa intacto:** ya consume `cols/rows/layout` de la API (`index.html` ~851-852, ~2166-2167) y pasa `REMATE_ID`. Un layout con otras dimensiones rendea solo con el pan/zoom existente.
