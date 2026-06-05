from django.contrib import admin

from .models import PreferenciaRemateUsuario, Registro, Remate


@admin.register(Remate)
class RemateAdmin(admin.ModelAdmin):
	list_display = ("id", "nombre", "finalizado", "finalizado_at", "created_at", "updated_at")
	list_filter = ("finalizado",)
	search_fields = ("nombre",)
	ordering = ("-created_at",)


@admin.register(PreferenciaRemateUsuario)
class PreferenciaRemateUsuarioAdmin(admin.ModelAdmin):
	list_display = ("usuario", "remate", "updated_at")
	search_fields = ("usuario__username", "remate__nombre")


@admin.register(Registro)
class RegistroAdmin(admin.ModelAdmin):
	list_display = ("id", "remate", "corral", "remitente", "categoria", "cantidad", "estado", "updated_at")
	search_fields = ("corral", "remitente", "categoria", "estado", "observaciones")
