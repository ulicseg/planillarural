from django.db import migrations

from registros.corrales_layout import MAP_ROWS, MAP_COLS, CORRALES_LAYOUT


def crear_mapa_default(apps, schema_editor):
    Mapa = apps.get_model("registros", "Mapa")
    if Mapa.objects.filter(es_default=True).exists():
        return
    Mapa.objects.create(
        nombre="Sociedad Rural",
        rows=MAP_ROWS,
        cols=MAP_COLS,
        layout=[dict(celda) for celda in CORRALES_LAYOUT],
        es_default=True,
    )


def borrar_mapa_default(apps, schema_editor):
    Mapa = apps.get_model("registros", "Mapa")
    Mapa.objects.filter(nombre="Sociedad Rural", es_default=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("registros", "0004_mapa_remate_mapa"),
    ]
    operations = [
        migrations.RunPython(crear_mapa_default, borrar_mapa_default),
    ]
