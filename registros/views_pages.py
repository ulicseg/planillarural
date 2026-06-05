from datetime import datetime

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpResponseBadRequest, HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from .models import Remate
from .view_helpers import get_preferencia_remate, get_remate_activo, is_operador, set_remate_seleccionado


@login_required
def index(request):
	if not is_operador(request.user):
		return HttpResponseForbidden("Usuario sin permisos de operador.")
	remate = get_remate_activo(request.user)
	if remate is None:
		return redirect("remates-home")
	return render(request, "registros/index.html", {"remate_activo": remate})


@login_required
def remates_home(request):
	if not is_operador(request.user):
		return HttpResponseForbidden("Usuario sin permisos de operador.")

	preferencia = get_preferencia_remate(request.user)
	remates = Remate.objects.all()
	return render(
		request,
		"registros/remates.html",
		{
			"remate_seleccionado": preferencia.remate,
			"remates_abiertos": remates.filter(finalizado=False),
			"remates_finalizados": remates.filter(finalizado=True),
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
	if not is_operador(request.user):
		return HttpResponseForbidden("Usuario sin permisos de operador.")

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