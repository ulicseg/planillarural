import os
import django
import random

# Configurar el entorno de Django para usar sus modelos
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from registros.models import Registro
from registros.views import CATEGORIAS_PREDEFINIDAS, ESTADOS_PREDEFINIDOS_MAP

REMITENTES_POSIBLES = [
    "Juan Perez", "Estancia La Paz", "Agropecuaria del Sur", 
    "Hermanos Gomez", "Fideicomiso Ganadero", "Establecimiento El Ombú",
    "Los Pinos S.A.", "Martin Rodriguez", "Cabaña Santa Clara", "Don Luis"
]

OBSERVACIONES_POSIBLES = [
    "", "Llegaron con retraso", "Falta revisar caravanas",
    "Se apartaron 2 enfermos", "Todo en orden", "Lote muy parejo",
    "", "", "Mucha merma en el viaje", "Requieren tratamiento"
]

def run():
    print("Limpiando la base de datos actual...")
    Registro.objects.all().delete()
    
    print("Generando nuevos registros de prueba (Corrales 1 al 100)...")
    
    categorias = list(CATEGORIAS_PREDEFINIDAS)
    estados = list(ESTADOS_PREDEFINIDOS_MAP.keys())
    
    registros_a_crear = []
    
    for i in range(1, 101):
        # Ocasionalmente dejamos algunos corrales vacíos
        if random.random() < 0.1:
            continue
            
        # Crear de 1 a 3 lotes por corral ocupado
        num_lotes = random.randint(1, 3)
        for _ in range(num_lotes):
            reg = Registro(
                corral=str(i),
                remitente=random.choice(REMITENTES_POSIBLES),
                categoria=random.choice(categorias),
                cantidad=random.randint(10, 80),
                estado=random.choice(estados),
                observaciones=random.choice(OBSERVACIONES_POSIBLES),
                marca_imagen="" # Sin foto como solicitaste
            )
            registros_a_crear.append(reg)
            
    Registro.objects.bulk_create(registros_a_crear)
    
    print(f"¡Éxito! Se generaron {len(registros_a_crear)} registros aleatorios distribuidos en la mayoría de los primeros 100 corrales.")

if __name__ == "__main__":
    run()
