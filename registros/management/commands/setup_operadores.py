from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Crea o actualiza los dos usuarios operadores definidos en settings.OPERADOR_USERNAMES"

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            required=True,
            help="Contrasena comun para ambos operadores",
        )

    def handle(self, *args, **options):
        operadores = settings.OPERADOR_USERNAMES
        if len(operadores) != 2:
            raise CommandError("OPERADOR_USERNAMES debe contener exactamente 2 usuarios.")

        password = options["password"]
        user_model = get_user_model()

        for username in operadores:
            user, created = user_model.objects.get_or_create(
                username=username,
                defaults={
                    "is_staff": False,
                    "is_superuser": False,
                    "is_active": True,
                },
            )
            user.set_password(password)
            user.is_staff = False
            user.is_superuser = False
            user.is_active = True
            user.save()

            action = "creado" if created else "actualizado"
            self.stdout.write(self.style.SUCCESS(f"Operador {username} {action}."))
