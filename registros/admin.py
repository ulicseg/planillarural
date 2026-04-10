from django.contrib import admin

from .models import Registro


@admin.register(Registro)
class RegistroAdmin(admin.ModelAdmin):
	list_display = ("id", "corral", "remitente", "categoria", "cantidad", "estado", "updated_at")
	search_fields = ("corral", "remitente", "categoria", "estado", "observaciones")
