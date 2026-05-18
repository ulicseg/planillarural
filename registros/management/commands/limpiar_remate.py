from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand, CommandError

from registros.models import Registro


class Command(BaseCommand):
	help = "Limpia los registros operativos y sesiones para dejar la base lista para un remate real"

	def add_arguments(self, parser):
		parser.add_argument(
			"--force",
			action="store_true",
			help="Ejecuta la limpieza sin pedir confirmacion",
		)

	def handle(self, *args, **options):
		if not options["force"]:
			raise CommandError(
				"Debes confirmar la limpieza con --force. Ejemplo: python manage.py limpiar_remate --force"
			)

		registros_eliminados, _ = Registro.objects.all().delete()
		sesiones_eliminadas, _ = Session.objects.all().delete()

		self.stdout.write(
			self.style.SUCCESS(
				f"Base preparada para remate real: {registros_eliminados} registros y {sesiones_eliminadas} sesiones eliminadas."
			)
		)