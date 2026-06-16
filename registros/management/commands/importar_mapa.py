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
