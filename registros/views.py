import base64
import hashlib
import json
import re
from datetime import datetime
from functools import wraps

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.exceptions import RequestDataTooBig
from django.db import transaction
from django.db.models import Count, Max, Q
from django.http import (
	Http404,
	HttpResponse,
	HttpResponseBadRequest,
	HttpResponseForbidden,
	HttpResponseNotModified,
	JsonResponse,
)
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.utils.http import http_date
from django.views.decorators.http import require_http_methods

from .corrales_layout import MAP_COLS, MAP_ROWS
from .models import Registro, Remate
from .view_helpers import (
	CATEGORIAS_PREDEFINIDAS,
	build_layout_with_pasillos_numerados,
	get_corrales_disponibles,
	get_ocupacion_corrales,
	get_ocupacion_detalle,
	get_pasillos_disponibles,
	get_preferencia_remate,
	get_remate_activo,
	get_ubicaciones_disponibles,
	is_operador,
	normalize_corral,
	parse_bool,
	parse_cantidad,
	parse_estado,
	require_api_login,
	set_remate_seleccionado,
)


def parse_json_body(request):
	try:
		payload = json.loads(request.body.decode("utf-8"))
		return payload if isinstance(payload, dict) else None
	except RequestDataTooBig:
		# Signal to caller that payload exceeded allowed size
		return {"__error__": "payload_too_large"}
	except (UnicodeDecodeError, json.JSONDecodeError):
		return None


def apply_browser_cache_headers(response, etag_value, last_modified=None):
	response["ETag"] = f'"{etag_value}"'
	response["Cache-Control"] = "private, max-age=0, must-revalidate"
	if last_modified is not None:
		response["Last-Modified"] = http_date(last_modified.timestamp())
	return response


def etag_matches_request(request, etag_value):
	if not etag_value:
		return False
	request_etag = request.META.get("HTTP_IF_NONE_MATCH", "")
	return f'"{etag_value}"' in request_etag


def make_registros_list_etag(queryset, query_text=""):
	stats = queryset.aggregate(total=Count("id"), latest=Max("updated_at"))
	latest = stats.get("latest")
	parts = ["registros-list", f"q={query_text}", f"total={stats.get('total', 0)}", f"latest={latest.isoformat() if latest else ''}"]
	digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()
	return digest, latest


def make_registro_detail_etag(registro, include_full=False):
	parts = ["registro-detail", str(registro.id), registro.updated_at.isoformat(), f"full={int(bool(include_full))}"]
	return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest(), registro.updated_at


def get_registros_sync_meta(queryset=None):
	queryset = queryset if queryset is not None else Registro.objects.all()
	stats = queryset.aggregate(total=Count("id"), latest=Max("updated_at"))
	latest = stats.get("latest")
	signature = hashlib.sha1(
		"|".join([
			"registros-sync",
			str(stats.get("total", 0)),
			latest.isoformat() if latest else "",
		]).encode("utf-8")
	).hexdigest()
	return {
		"signature": signature,
		"lastUpdatedAt": latest.isoformat() if latest else None,
		"total": stats.get("total", 0),
	}


def resolve_marca_imagen_list(payload_value, current_registro=None):
	"""
	Parses and resolves the incoming brand image payload.
	Resolves relative URLs pointing to /api/registros/<id>/foto/<index>/ by cloning the actual image
	data from the referenced registration.
	Returns a JSON string representing the list of resolved image objects (each with 'full' and 'thumb').
	"""
	if not payload_value:
		return "[]"

	if isinstance(payload_value, list):
		raw_items = payload_value
	else:
		if isinstance(payload_value, str) and payload_value.strip().startswith("["):
			try:
				raw_items = json.loads(payload_value)
			except Exception:
				raw_items = [payload_value]
		else:
			raw_items = [payload_value]

	resolved_items = []

	for item in raw_items:
		if not item:
			continue

		full_val = ""
		thumb_val = ""
		if isinstance(item, dict):
			full_val = item.get("full") or item.get("image") or item.get("src") or item.get("url") or ""
			thumb_val = item.get("thumb") or item.get("thumbnail") or ""
		elif isinstance(item, str):
			full_val = item

		full_val = full_val.strip() if isinstance(full_val, str) else ""
		thumb_val = thumb_val.strip() if isinstance(thumb_val, str) else ""

		# Check if full_val points to an API photo URL: /api/registros/<id>/foto/ or /api/registros/<id>/foto/<index>/
		match = re.search(r"/api/registros/(\d+)/foto/(?:(\d+)/)?", full_val)
		if match:
			target_id = int(match.group(1))
			target_index = int(match.group(2)) if match.group(2) is not None else 0

			if current_registro and current_registro.id == target_id:
				curr_images = current_registro._parse_marca_images()
				if 0 <= target_index < len(curr_images):
					resolved_items.append(curr_images[target_index])
					continue
			else:
				try:
					target_reg = Registro.objects.get(id=target_id)
					target_images = target_reg._parse_marca_images()
					if 0 <= target_index < len(target_images):
						resolved_items.append(target_images[target_index])
						continue
				except Registro.DoesNotExist:
					pass
			continue

		if full_val.startswith("data:image/"):
			resolved_items.append({
				"full": full_val,
				"thumb": thumb_val if thumb_val.startswith("data:image/") else ""
			})
			continue

		if isinstance(item, dict) and (full_val or thumb_val):
			resolved_items.append({
				"full": full_val,
				"thumb": thumb_val
			})
			continue

	final_items = []
	for item in resolved_items:
		full = item.get("full") or ""
		thumb = item.get("thumb") or ""

		if not full and thumb:
			full = thumb
		if not thumb and full and full.startswith("data:image/"):
			thumb = Registro._make_thumbnail_data_url(full)

		if full:
			final_items.append({
				"full": full,
				"thumb": thumb or full
			})

	return json.dumps(final_items)


# PAGES VIEWS

@login_required
def index(request):
	remate = get_remate_activo(request.user)
	if remate is None:
		return redirect("remates-home")
	return render(request, "registros/index.html", {
		"remate_activo": remate,
		"es_operador": is_operador(request.user),
	})


@login_required
def remates_home(request):
	preferencia = get_preferencia_remate(request.user)
	remates = Remate.objects.all()
	return render(
		request,
		"registros/remates.html",
		{
			"remate_seleccionado": preferencia.remate,
			"remates_abiertos": remates.filter(finalizado=False),
			"remates_finalizados": remates.filter(finalizado=True),
			"es_operador": is_operador(request.user),
		},
	)


@login_required
@require_http_methods(["POST"])
def crear_remate(request):
	if not is_operador(request.user):
		return HttpResponseForbidden("Usuario sin permisos de operador.")

	nombre = (request.POST.get("nombre") or "").strip()
	fecha_raw = (request.POST.get("fecha") or "").strip()
	lugar = (request.POST.get("lugar") or "").strip()
	fecha = None
	if fecha_raw:
		try:
			fecha = datetime.strptime(fecha_raw, "%Y-%m-%d").date()
		except ValueError:
			return HttpResponseBadRequest("Fecha de remate invalida.")
	if not nombre:
		nombre = f"Remate {timezone.localdate().strftime('%Y-%m')}"

	with transaction.atomic():
		remate = Remate.objects.create(nombre=nombre, fecha=fecha, lugar=lugar)
		set_remate_seleccionado(request.user, remate)

	return redirect("home")


@login_required
@require_http_methods(["POST"])
def seleccionar_remate(request, remate_id):
	remate = get_object_or_404(Remate, id=remate_id)
	set_remate_seleccionado(request.user, remate)
	return redirect("home")


@login_required
@require_http_methods(["POST"])
def finalizar_remate(request, remate_id):
	if not is_operador(request.user):
		return HttpResponseForbidden("Usuario sin permisos de operador.")

	remate = get_object_or_404(Remate, id=remate_id)
	if not remate.finalizado:
		remate.finalizado = True
		remate.finalizado_at = timezone.now()
		remate.save(update_fields=["finalizado", "finalizado_at", "updated_at"])

	return redirect("remates-home")


@require_http_methods(["GET"])
def pwa_manifest(request):
	return render(request, "registros/manifest.webmanifest", content_type="application/manifest+json")


@require_http_methods(["GET"])
def pwa_service_worker(request):
	response = render(request, "registros/service-worker.js", content_type="application/javascript")
	response["Service-Worker-Allowed"] = "/"
	response["Cache-Control"] = "no-cache"
	return response


@require_http_methods(["GET"])
def catch_empty_array(request):
	return HttpResponse(status=204)


# API VIEWS

@require_api_login
def api_registro_foto(request, registro_id, index=0):
	registro = get_object_or_404(Registro, id=registro_id)
	images = registro._parse_marca_images()
	if not images:
		raise Http404("Este registro no tiene foto.")

	if index < 0 or index >= len(images):
		raise Http404("Indice de foto invalido.")

	img_obj = images[index]
	is_thumb = (request.GET.get("thumb") == "1")
	image_data_url = img_obj.get("thumb") if is_thumb else img_obj.get("full")

	if not image_data_url:
		image_data_url = img_obj.get("full") or img_obj.get("thumb") or ""

	if not image_data_url:
		raise Http404("La foto no esta disponible.")

	if image_data_url.startswith("data:image/"):
		try:
			header, base64_data = image_data_url.split(",", 1)
			content_type = header.split(";")[0].split(":")[1]
			image_data = base64.b64decode(base64_data)

			response = HttpResponse(image_data, content_type=content_type)
			response["Cache-Control"] = "public, max-age=86400"  # Cache por 1 dia
			return response
		except Exception:
			raise Http404("La foto esta dañada.")
	else:
		try:
			image_data = base64.b64decode(image_data_url)
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

		etag_value, last_modified = make_registros_list_etag(registros, query_text=query)
		if etag_matches_request(request, etag_value):
			response = HttpResponseNotModified()
			return apply_browser_cache_headers(response, etag_value, last_modified)

		response = JsonResponse({"data": [item.to_dict(include_full=False) for item in registros]})
		return apply_browser_cache_headers(response, etag_value, last_modified)

	payload = parse_json_body(request)
	if payload is None:
		return HttpResponseBadRequest("JSON invalido")
	if isinstance(payload, dict) and payload.get("__error__") == "payload_too_large":
		return JsonResponse({"error": "Carga demasiado grande. Reduce el tamaño de las fotos o subilas individualmente."}, status=413)

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
		marca_imagen=resolve_marca_imagen_list(payload.get("marcaImagen")),
	)

	return JsonResponse({"data": registro.to_dict(include_full=True)}, status=201)


@require_http_methods(["GET", "PUT", "DELETE"])
@require_api_login
def api_registro_detail(request, registro_id):
	remate = get_remate_activo(request.user)
	if remate is None:
		return JsonResponse({"error": "Debes seleccionar un remate."}, status=409)

	registro = get_object_or_404(Registro, id=registro_id, remate=remate)

	if request.method == "GET":
		etag_value, last_modified = make_registro_detail_etag(registro, include_full=True)
		if etag_matches_request(request, etag_value):
			response = HttpResponseNotModified()
			return apply_browser_cache_headers(response, etag_value, last_modified)

		response = JsonResponse({"data": registro.to_dict(include_full=True)})
		return apply_browser_cache_headers(response, etag_value, last_modified)

	if request.method == "DELETE":
		registro.delete()
		return JsonResponse({"ok": True})

	payload = parse_json_body(request)
	if payload is None:
		return HttpResponseBadRequest("JSON invalido")
	if isinstance(payload, dict) and payload.get("__error__") == "payload_too_large":
		return JsonResponse({"error": "Carga demasiado grande. Reduce el tamaño de las fotos o subilas individualmente."}, status=413)

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
	registro.marca_imagen = resolve_marca_imagen_list(payload.get("marcaImagen"), current_registro=registro)
	registro.save()

	etag_value, last_modified = make_registro_detail_etag(registro, include_full=True)
	response = JsonResponse({"data": registro.to_dict(include_full=True)})
	return apply_browser_cache_headers(response, etag_value, last_modified)


@require_http_methods(["GET"])
@require_api_login
def api_registros_ultimos_cambios(request):
	remate = get_remate_activo(request.user)
	if remate is None:
		return JsonResponse({"error": "Debes seleccionar un remate."}, status=409)

	queryset = Registro.objects.filter(remate=remate)
	meta = get_registros_sync_meta(queryset)
	response = JsonResponse({"data": meta})
	return apply_browser_cache_headers(response, meta["signature"], None)


@require_http_methods(["GET"])
@require_api_login
def api_corrales_mapa(request):
	remate = get_remate_activo(request.user)
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
	if isinstance(payload, dict) and payload.get("__error__") == "payload_too_large":
		return JsonResponse({"error": "Carga demasiado grande. Reduce el tamaño de las fotos o subilas individualmente."}, status=413)

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
