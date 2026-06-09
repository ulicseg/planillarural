import json
from functools import wraps

from django.conf import settings
from django.http import JsonResponse

from .corrales_layout import CORRALES_DISPONIBLES, CORRALES_LAYOUT
from .models import PreferenciaRemateUsuario, Registro, Remate


CATEGORIAS_PREDEFINIDAS = {"Novillo", "Novillito", "Vaca", "Ternero", "Ternera", "Ternera/o", "Vaquilla", "Vaquillita", "Toro"}
ESTADOS_PREDEFINIDOS_MAP = {
	"conserva": "conserva",
	"invernada normal": "invernada normal",
	"invernada buena": "invernada buena",
	"gordo": "gordo",
	"para cría": "para cría",
}
PASILLO_LABEL = "PASILLO"
TORIL_CORRAL_ID = "1"


def is_operador(user):
	return user.is_authenticated and user.username in settings.OPERADOR_USERNAMES


def get_preferencia_remate(usuario):
	preferencia, _ = PreferenciaRemateUsuario.objects.get_or_create(usuario=usuario)
	return preferencia


def get_remate_seleccionado(usuario):
	return get_preferencia_remate(usuario).remate


def set_remate_seleccionado(usuario, remate):
	preferencia = get_preferencia_remate(usuario)
	preferencia.remate = remate
	preferencia.save(update_fields=["remate", "updated_at"])
	return preferencia


def get_remate_activo(usuario):
	remate = get_remate_seleccionado(usuario)
	if remate is not None:
		return remate
	return Remate.objects.order_by("-created_at", "-id").first()


def require_api_login(view_func):
	@wraps(view_func)
	def wrapped(request, *args, **kwargs):
		if not request.user.is_authenticated:
			return JsonResponse({"error": "Autenticacion requerida."}, status=401)
		if not is_operador(request.user):
			if request.method != "GET":
				return JsonResponse({"error": "Acceso denegado. Rol de invitado es de solo lectura."}, status=403)
		return view_func(request, *args, **kwargs)

	return wrapped


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
	import unicodedata

	text = (value or "").strip().lower()
	text = unicodedata.normalize("NFD", text)
	return "".join(c for c in text if unicodedata.category(c) != "Mn")


def parse_estado(raw_value):
	if not raw_value:
		return None, None

	if isinstance(raw_value, list):
		values = raw_value
	else:
		if isinstance(raw_value, str) and "," in raw_value:
			values = raw_value.split(",")
		else:
			values = [raw_value]

	normalized_values = []
	for val in values:
		val_str = (val or "").strip()
		if not val_str:
			continue

		normalized_key = normalize_text_key(val_str)
		found = False
		for key, canonical in ESTADOS_PREDEFINIDOS_MAP.items():
			if normalize_text_key(key) == normalized_key:
				if canonical not in normalized_values:
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


def get_ocupacion_corrales(remate):
	ocupacion = {}
	for item in Registro.objects.filter(remate=remate).exclude(corral=""):
		key = str(item.corral).strip()
		if not key:
			continue
		ocupacion[key] = ocupacion.get(key, 0) + 1
	return ocupacion


def get_ocupacion_detalle(corral, remate, exclude_id=None):
	queryset = Registro.objects.filter(corral=corral, remate=remate)
	if exclude_id is not None:
		queryset = queryset.exclude(id=exclude_id)
	return [item.to_dict() for item in queryset]