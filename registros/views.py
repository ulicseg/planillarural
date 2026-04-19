import json
from functools import wraps

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import HttpResponseBadRequest, HttpResponseForbidden, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_http_methods

from .corrales_layout import CORRALES_DISPONIBLES, CORRALES_LAYOUT, MAP_COLS, MAP_ROWS
from .models import Registro


CATEGORIAS_PREDEFINIDAS = {"Novillo", "Novillito", "Vaca", "Ternero", "Ternera", "Vaquilla", "Vaquillita", "Toro"}
ESTADOS_PREDEFINIDOS_MAP = {
	"muy bueno": "muy bueno",
	"bueno": "bueno",
	"regular": "regular",
	"gordo": "gordo",
	"invernada": "invernada",
	"para cría": "para cría",
}
PASILLO_LABEL = "PASILLO"
TORIL_CORRAL_ID = "1"


def is_operador(user):
	return user.is_authenticated and user.username in settings.OPERADOR_USERNAMES


def require_api_login(view_func):
	@wraps(view_func)
	def wrapped(request, *args, **kwargs):
		if not request.user.is_authenticated:
			return JsonResponse({"error": "Autenticacion requerida."}, status=401)
		if not is_operador(request.user):
			return JsonResponse({"error": "Usuario sin permisos de operador."}, status=403)
		return view_func(request, *args, **kwargs)

	return wrapped


@login_required
def index(request):
	if not is_operador(request.user):
		return HttpResponseForbidden("Usuario sin permisos de operador.")
	return render(request, "registros/index.html")


@require_http_methods(["GET"])
def pwa_manifest(request):
	return render(request, "registros/manifest.webmanifest", content_type="application/manifest+json")


@require_http_methods(["GET"])
def pwa_service_worker(request):
	response = render(request, "registros/service-worker.js", content_type="application/javascript")
	response["Service-Worker-Allowed"] = "/"
	response["Cache-Control"] = "no-cache"
	return response


def parse_json_body(request):
	try:
		payload = json.loads(request.body.decode("utf-8"))
		return payload if isinstance(payload, dict) else None
	except (UnicodeDecodeError, json.JSONDecodeError):
		return None


def parse_cantidad(raw_value):
	if raw_value in (None, ""):
		return None
	try:
		cantidad = int(raw_value)
		return cantidad if cantidad >= 0 else None
	except (TypeError, ValueError):
		return None


def parse_bool(raw_value):
	if isinstance(raw_value, bool):
		return raw_value
	if isinstance(raw_value, str):
		value = raw_value.strip().lower()
		return value in {"1", "true", "yes", "on"}
	if isinstance(raw_value, (int, float)):
		return raw_value != 0
	return False


def normalize_text_key(value):
	"""Normalize text for fuzzy matching: lowercase, remove accents."""
	import unicodedata
	text = (value or "").strip().lower()
	# Remove accents
	text = unicodedata.normalize("NFD", text)
	text = "".join(c for c in text if unicodedata.category(c) != "Mn")
	return text


def parse_estado(raw_value):
	"""Parse and validate estado field.
	
	Accepts:
	- List of strings: ["bueno", "gordo"]
	- Comma-separated string: "bueno, gordo"
	- Single string: "bueno"
	
	Returns: (normalized_estado_string, error_message)
	"""
	if not raw_value:
		return None, None
	
	# Convert to list
	if isinstance(raw_value, list):
		values = raw_value
	else:
		# If it's a comma-separated string, split it
		if isinstance(raw_value, str) and "," in raw_value:
			values = raw_value.split(",")
		else:
			values = [raw_value]
	
	# Validate each value
	normalized_values = []
	for val in values:
		val_str = (val or "").strip()
		if not val_str:
			continue
		
		# Try to find matching key in map
		normalized_key = normalize_text_key(val_str)
		found = False
		for key, canonical in ESTADOS_PREDEFINIDOS_MAP.items():
			if normalize_text_key(key) == normalized_key:
				if canonical not in normalized_values:  # Avoid duplicates
					normalized_values.append(canonical)
				found = True
				break
		
		if not found:
			return None, "Estado invalido"
	
	if not normalized_values:
		return None, "Estado invalido"
	
	return ", ".join(normalized_values), None


def get_corrales_disponibles():
	corrales = [TORIL_CORRAL_ID]
	for corral in CORRALES_DISPONIBLES:
		if corral != TORIL_CORRAL_ID:
			corrales.append(corral)
	return corrales


def get_pasillos_disponibles():
	pasillos = []
	for index, cell in enumerate((item for item in CORRALES_LAYOUT if item.get("kind") == "pasillo"), start=1):
		pasillos.append(f"{PASILLO_LABEL} {index}")
	return pasillos


def build_layout_with_pasillos_numerados():
	layout = []
	pasillo_index = 0
	for cell in CORRALES_LAYOUT:
		if cell.get("kind") == "toril":
			cell_copy = dict(cell)
			cell_copy["corral_id"] = TORIL_CORRAL_ID
			cell_copy["display_label"] = TORIL_CORRAL_ID
			layout.append(cell_copy)
			continue

		if cell.get("kind") != "pasillo":
			layout.append(cell)
			continue

		pasillo_index += 1
		cell_copy = dict(cell)
		cell_copy["pasillo_id"] = f"{PASILLO_LABEL} {pasillo_index}"
		cell_copy["display_label"] = f"P{pasillo_index}"
		layout.append(cell_copy)

	return layout


def get_ubicaciones_disponibles(include_pasillos=False, pasillos=None):
	ubicaciones = get_corrales_disponibles()
	if include_pasillos:
		ubicaciones.extend(pasillos or get_pasillos_disponibles())
	return ubicaciones


def normalize_corral(raw_value, allow_pasillo=False, strict_known_corrales=False, pasillos_validos=None):
	corral = (raw_value or "").strip().upper()
	if not corral:
		return "", None

	pasillos = set(pasillos_validos or get_pasillos_disponibles())
	corrales_validos = set(get_corrales_disponibles())

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


def get_ocupacion_corrales():
	ocupacion = {}
	for item in Registro.objects.exclude(corral=""):
		key = str(item.corral).strip()
		if not key:
			continue
		ocupacion[key] = ocupacion.get(key, 0) + 1
	return ocupacion


def get_ocupacion_detalle(corral, exclude_id=None):
	queryset = Registro.objects.filter(corral=corral)
	if exclude_id is not None:
		queryset = queryset.exclude(id=exclude_id)
	return [item.to_dict() for item in queryset]


@require_http_methods(["GET", "POST"])
@require_api_login
def api_registros(request):
	if request.method == "GET":
		query = (request.GET.get("q") or "").strip()
		registros = Registro.objects.all()

		if query:
			filters = (
				Q(corral__icontains=query)
				| Q(remitente__icontains=query)
				| Q(categoria__icontains=query)
				| Q(estado__icontains=query)
				| Q(observaciones__icontains=query)
			)

			if query.isdigit():
				filters |= Q(cantidad=int(query))

			registros = registros.filter(filters)

		return JsonResponse({"data": [item.to_dict() for item in registros]})

	payload = parse_json_body(request)
	if payload is None:
		return HttpResponseBadRequest("JSON invalido")

	pasillos_disponibles = get_pasillos_disponibles()
	allow_pasillo = parse_bool(payload.get("allowPasillo"))
	corral, corral_error = normalize_corral(payload.get("corral"), allow_pasillo=allow_pasillo, pasillos_validos=pasillos_disponibles)
	remitente = (payload.get("remitente") or "").strip()
	categoria = (payload.get("categoria") or "").strip()
	estado, estado_error = parse_estado(payload.get("estado"))

	if corral_error:
		return JsonResponse({"error": corral_error}, status=400)
	if not remitente:
		return JsonResponse({"error": "Remitente es obligatorio."}, status=400)
	if categoria and categoria not in CATEGORIAS_PREDEFINIDAS:
		return JsonResponse({"error": "Categoria invalida. Debe ser una categoria predefinida."}, status=400)
	if estado_error:
		return JsonResponse({"error": estado_error}, status=400)

	registro = Registro.objects.create(
		corral=corral,
		remitente=remitente,
		categoria=categoria,
		cantidad=parse_cantidad(payload.get("cantidad")),
		estado=estado or "",
		observaciones=(payload.get("observaciones") or "").strip(),
		marca_imagen=payload.get("marcaImagen") or "",
	)

	return JsonResponse({"data": registro.to_dict()}, status=201)


@require_http_methods(["PUT", "DELETE"])
@require_api_login
def api_registro_detail(request, registro_id):
	registro = get_object_or_404(Registro, id=registro_id)

	if request.method == "DELETE":
		registro.delete()
		return JsonResponse({"ok": True})

	payload = parse_json_body(request)
	if payload is None:
		return HttpResponseBadRequest("JSON invalido")

	pasillos_disponibles = get_pasillos_disponibles()
	allow_pasillo = parse_bool(payload.get("allowPasillo"))
	corral, corral_error = normalize_corral(payload.get("corral"), allow_pasillo=allow_pasillo, pasillos_validos=pasillos_disponibles)
	remitente = (payload.get("remitente") or "").strip()
	categoria = (payload.get("categoria") or "").strip()
	estado, estado_error = parse_estado(payload.get("estado"))

	if corral_error:
		return JsonResponse({"error": corral_error}, status=400)
	if not remitente:
		return JsonResponse({"error": "Remitente es obligatorio."}, status=400)
	if categoria and categoria not in CATEGORIAS_PREDEFINIDAS:
		return JsonResponse({"error": "Categoria invalida. Debe ser una categoria predefinida."}, status=400)
	if estado_error:
		return JsonResponse({"error": estado_error}, status=400)

	registro.corral = corral
	registro.remitente = remitente
	registro.categoria = categoria
	registro.cantidad = parse_cantidad(payload.get("cantidad"))
	registro.estado = estado or ""
	registro.observaciones = (payload.get("observaciones") or "").strip()
	registro.marca_imagen = payload.get("marcaImagen") or ""
	registro.save()

	return JsonResponse({"data": registro.to_dict()})


@require_http_methods(["GET"])
@require_api_login
def api_corrales_mapa(request):
	pasillos = get_pasillos_disponibles()
	layout = build_layout_with_pasillos_numerados()
	corrales = get_corrales_disponibles()
	return JsonResponse(
		{
			"data": {
				"rows": MAP_ROWS,
				"cols": MAP_COLS,
				"layout": layout,
				"corrales": corrales,
				"pasillos": pasillos,
				"ubicaciones": get_ubicaciones_disponibles(include_pasillos=False, pasillos=pasillos),
				"ocupacion": get_ocupacion_corrales(),
			}
		}
	)


@require_http_methods(["POST"])
@require_api_login
def api_registro_mover(request, registro_id):
	payload = parse_json_body(request)
	if payload is None:
		return HttpResponseBadRequest("JSON invalido")

	pasillos_disponibles = get_pasillos_disponibles()
	allow_pasillo = parse_bool(payload.get("allowPasillo"))
	destino_corral, corral_error = normalize_corral(
		payload.get("destinoCorral"),
		allow_pasillo=allow_pasillo,
		strict_known_corrales=True,
		pasillos_validos=pasillos_disponibles,
	)
	if not destino_corral:
		return JsonResponse({"error": "Debe indicar el corral destino."}, status=400)
	if corral_error:
		return JsonResponse({"error": corral_error}, status=400)

	registro = get_object_or_404(Registro, id=registro_id)
	registro.corral = destino_corral
	registro.save()

	return JsonResponse({"data": registro.to_dict()})


@require_http_methods(["GET"])
@require_api_login
def api_corral_ocupacion(request, corral):
	corral_clean = (corral or "").strip().upper()
	if not corral_clean:
		return JsonResponse({"error": "Corral invalido."}, status=400)

	exclude_id_raw = (request.GET.get("exclude_id") or "").strip()
	exclude_id = None
	if exclude_id_raw:
		if not exclude_id_raw.isdigit():
			return JsonResponse({"error": "exclude_id invalido."}, status=400)
		exclude_id = int(exclude_id_raw)

	registros = get_ocupacion_detalle(corral_clean, exclude_id=exclude_id)
	return JsonResponse({"data": {"corral": corral_clean, "ocupado": len(registros) > 0, "registros": registros}})
