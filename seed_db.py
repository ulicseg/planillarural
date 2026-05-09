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
    "", "3M 4H", "-1 toro.", "Llegaron con retraso", 
    "Falta revisar caravanas", "Se apartaron 2 enfermos", "Todo en orden", 
    "Lote muy parejo", "", "", "1 rengo.", "Requieren tratamiento"
]

def run():
    print("Limpiando la base de datos actual...")
    Registro.objects.all().delete()
    
    print("Generando nuevos registros de prueba (1000 cabezas en 121 corrales)...")
    
    categorias = list(CATEGORIAS_PREDEFINIDAS)
    estados = list(ESTADOS_PREDEFINIDOS_MAP.keys())
    
    registros_a_crear = []
    
    total_cabezas_objetivo = 1000
    cabezas_actuales = 0
    total_corrales = 121
    
    corrales_list = list(range(1, total_corrales + 1))
    
    # Bucle hasta alcanzar exactamente 1000 cabezas
    while cabezas_actuales < total_cabezas_objetivo:
        # Elegimos un corral aleatorio (1 a 121)
        corral_elegido = random.choice(corrales_list)
        
        # Determinar cantidad para este lote (sin pasarnos del limite total de 1000)
        cabezas_restantes = total_cabezas_objetivo - cabezas_actuales
        
        if cabezas_restantes < 5:
            cantidad = cabezas_restantes
        else:
            cantidad = random.randint(5, min(25, cabezas_restantes))
            
        reg = Registro(
            corral=str(corral_elegido),
            remitente=random.choice(REMITENTES_POSIBLES),
            categoria=random.choice(categorias),
            cantidad=cantidad,
            estado=random.choice(estados),
            observaciones=random.choice(OBSERVACIONES_POSIBLES),
            marca_imagen="" # Sin foto
        )
        registros_a_crear.append(reg)
        cabezas_actuales += cantidad
            
    Registro.objects.bulk_create(registros_a_crear)
    
    print(f"¡Éxito! Se generaron {len(registros_a_crear)} lotes sumando exactamente {cabezas_actuales} cabezas, distribuidas de forma aleatoria en hasta {total_corrales} corrales con diferentes remitentes por corral.")

if __name__ == "__main__":
    run()
