import base64
import re
from django.db.models import Q
from django.http import Http404, HttpResponse, HttpResponseBadRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from .corrales_layout import MAP_COLS, MAP_ROWS
from .models import Registro
from .view_helpers import (
	CATEGORIAS_PREDEFINIDAS,
	build_layout_with_pasillos_numerados,
	get_corrales_disponibles,
	get_ocupacion_corrales,
	get_ocupacion_detalle,
	get_pasillos_disponibles,
	get_remate_activo,
	get_ubicaciones_disponibles,
	normalize_corral,
	parse_bool,
	parse_cantidad,
	parse_estado,
	parse_json_body,
	require_api_login,
)


def resolve_marca_imagen(payload_value, current_registro=None):
	if not payload_value:
		return ""

	if payload_value.startswith("data:image/"):
		return payload_value

	# Patrón para detectar URLs del endpoint
	match = re.search(r"/api/registros/(\d+)/foto/?", payload_value)
	if match:
		target_id = int(match.group(1))
		if current_registro and current_registro.id == target_id:
			return current_registro.marca_imagen

		try:
			target_reg = Registro.objects.get(id=target_id)
			return target_reg.marca_imagen
		except Registro.DoesNotExist:
			return ""

	if current_registro and f"/api/registros/{current_registro.id}/foto/" in payload_value:
		return current_registro.marca_imagen

	if current_registro:
		return current_registro.marca_imagen

	return ""


@require_api_login
def api_registro_foto(request, registro_id):
	registro = get_object_or_404(Registro, id=registro_id)
	if not registro.marca_imagen:
		raise Http404("Este registro no tiene foto.")

	if registro.marca_imagen.startswith("data:image/"):
		try:
			header, base64_data = registro.marca_imagen.split(",", 1)
			content_type = header.split(";")[0].split(":")[1]
			image_data = base64.b64decode(base64_data)

			response = HttpResponse(image_data, content_type=content_type)
			response["Cache-Control"] = "public, max-age=86400"  # Cache por 1 día
			return response
		except Exception:
			raise Http404("La foto de este registro está dañada.")
	else:
		try:
			image_data = base64.b64decode(registro.marca_imagen)
			response = HttpResponse(image_data, content_type="image/webp")
			response["Cache-Control"] = "public, max-age=86400"
			return response
		except Exception:
			raise Http404("La foto no se pudo procesar.")


@require_http_methods(["GET", "POST"])
@require_api_login
def api_registros(request):
	remate = get_remate_activo(request.user)
	if remate is None:
		return JsonResponse({"error": "Debes seleccionar un remate."}, status=409)

	if request.method == "GET":
		query = (request.GET.get("q") or "").strip()
		registros = Registro.objects.filter(remate=remate)

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
		remate=remate,
		corral=corral,
		remitente=remitente,
		categoria=categoria,
		cantidad=parse_cantidad(payload.get("cantidad")),
		estado=estado or "",
		observaciones=(payload.get("observaciones") or "").strip(),
		marca_imagen=resolve_marca_imagen(payload.get("marcaImagen")),
	)

	return JsonResponse({"data": registro.to_dict()}, status=201)


@require_http_methods(["PUT", "DELETE"])
@require_api_login
def api_registro_detail(request, registro_id):
	remate = get_remate_activo(request.user)
	if remate is None:
		return JsonResponse({"error": "Debes seleccionar un remate."}, status=409)

	registro = get_object_or_404(Registro, id=registro_id, remate=remate)

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
	registro.marca_imagen = resolve_marca_imagen(payload.get("marcaImagen"), current_registro=registro)
	registro.save()

	return JsonResponse({"data": registro.to_dict()})


@require_http_methods(["GET"])
@require_api_login
def api_corrales_mapa(request):
	remate = get_remate_activo(request.user)
	pasillos = get_pasillos_disponibles()
	return JsonResponse(
		{
			"data": {
				"rows": MAP_ROWS,
				"cols": MAP_COLS,
				"layout": build_layout_with_pasillos_numerados(),
				"corrales": get_corrales_disponibles(),
				"pasillos": pasillos,
				"ubicaciones": get_ubicaciones_disponibles(include_pasillos=False, pasillos=pasillos),
				"ocupacion": get_ocupacion_corrales(remate),
			}
		}
	)


@require_http_methods(["POST"])
@require_api_login
def api_registro_mover(request, registro_id):
	remate = get_remate_activo(request.user)
	if remate is None:
		return JsonResponse({"error": "Debes seleccionar un remate."}, status=409)

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

	registro = get_object_or_404(Registro, id=registro_id, remate=remate)
	registro.corral = destino_corral
	registro.save()

	return JsonResponse({"data": registro.to_dict()})


@require_http_methods(["GET"])
@require_api_login
def api_corral_ocupacion(request, corral):
	remate = get_remate_activo(request.user)
	if remate is None:
		return JsonResponse({"error": "Debes seleccionar un remate."}, status=409)

	corral_clean = (corral or "").strip().upper()
	if not corral_clean:
		return JsonResponse({"error": "Corral invalido."}, status=400)

	exclude_id_raw = (request.GET.get("exclude_id") or "").strip()
	exclude_id = None
	if exclude_id_raw:
		if not exclude_id_raw.isdigit():
			return JsonResponse({"error": "exclude_id invalido."}, status=400)
		exclude_id = int(exclude_id_raw)

	registros = get_ocupacion_detalle(corral_clean, remate, exclude_id=exclude_id)
	return JsonResponse({"data": {"corral": corral_clean, "ocupado": len(registros) > 0, "registros": registros}})