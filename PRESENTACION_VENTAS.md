# Planilla Rural — Dossier de Presentación Comercial

Este documento recopila la propuesta de valor, las funcionalidades clave y el potencial comercial de **Planilla Rural**, diseñado como base para presentaciones a potenciales clientes (firmas consignatarias, rematadoras) o inversores.

---

## 1. Resumen Ejecutivo

**Planilla Rural** es una plataforma móvil-first de última generación diseñada para digitalizar la carga, el control y la logística de hacienda en remates ferias ganaderas. La aplicación reemplaza las ineficientes planillas de papel por un sistema digital intuitivo que integra un mapa de corrales interactivo en tiempo real y el registro fotográfico de marcas a fuego. Gracias a su arquitectura como Web App Progresiva (PWA), permite a los operadores del predio trabajar directamente desde sus celulares con tolerancia a los cortes de señal típicos del ámbito rural. El resultado es una drástica reducción en los tiempos de ingreso, eliminación de errores de transcripción y absoluta transparencia en el control de stock ganadero.

---

## 2. El Problema

Los remates ferias tradicionales siguen operando bajo un esquema analógico que genera severas pérdidas de eficiencia y costos ocultos:

*   **Manejo en papel propenso a pérdidas:** El registro de lotes de animales, remitentes y corrales asignados se anota a mano en planillas que sufren el desgaste físico del trabajo a la intemperie (barro, lluvia, pérdidas accidentales).
*   **Errores humanos de transcripción:** La información anotada en los corrales debe transcribirse manualmente a los sistemas de facturación de la oficina de la feria. Esto genera demoras y costosas discrepancias de stock o facturación (cabezas mal contadas, categorías erróneas).
*   **Logística ciega en los corrales:** El personal del predio no sabe qué corrales están libres o qué remitentes están asignados en cada sector sin recorrer físicamente las instalaciones o comunicarse constantemente por radio.
*   **Falta de trazabilidad e identidad visual:** Las marcas a fuego del ganado (clave para verificar la propiedad legítima de los animales) se describen de manera textual o simple, sin un respaldo visual rápido, lo que dificulta la resolución de disputas de propiedad al finalizar la subasta.
*   **Fallas de conectividad rural:** Las aplicaciones tradicionales en la nube fallan por completo en predios rurales con nula o escasa señal de datos móviles, dejando a los operadores sin sistema a mitad de la jornada.

---

## 3. La Solución

**Planilla Rural** transforma la operatoria de los corrales mediante una solución digital ágil, robusta y adaptada a la realidad del campo:

*   **Digitalización en el origen (a pie de corral):** Los operadores ingresan los lotes directamente en sus teléfonos móviles a medida que los animales bajan del camión.
*   **Logística visual en tiempo real:** Un mapa interactivo del predio muestra de un vistazo qué corrales están ocupados, cuáles libres y los detalles de cada lote simplemente tocando la pantalla.
*   **Trazabilidad visual de marcas:** Permite capturar imágenes de las marcas de los animales directamente con la cámara del celular, guardándolas de forma digital y asociándolas de inmediato al lote correspondiente.
*   **Resiliencia ante la falta de señal:** Gracias a tecnologías de almacenamiento local y service workers, la aplicación permite seguir consultando los datos almacenados y el mapa de corrales aun si la señal de internet se corta por completo durante la feria.
*   **Integración y reporte inmediato:** Genera automáticamente planillas de control en formato PDF con el diseño clásico y espacios en blanco adicionales para que la transición digital sea amigable y no genere fricciones en el personal.

---

## 4. Funcionalidades Principales y sus Beneficios

| Funcionalidad | Descripción Técnica | Beneficio Comercial / Valor |
| :--- | :--- | :--- |
| **Carga Digital de Lotes** | Interfaz ágil con autocompletado de remitentes, categorías predefinidas y estados múltiples. | **Cero errores de escritura y velocidad de ingreso:** Reduce los tiempos de admisión de camiones al eliminar la escritura manual y prevenir errores en categorías o nombres de remitentes. |
| **Mapa Interactivo de Corrales** | Representación digital del layout del predio (CSS Grid) con colores de ocupación en tiempo real. | **Optimización del espacio y logística inteligente:** El capataz visualiza al instante los corrales disponibles sin tener que recorrer el predio, reduciendo el estrés animal y los tiempos de arreo. |
| **Registro de Marcas con Foto** | Captura múltiple de imágenes (hasta 5 fotos por lote) con visor interactivo de zoom. | **Seguridad jurídica y resolución de disputas:** Respaldo fotográfico instantáneo que vincula la marca a fuego física del ganado con el remitente del lote, eliminando reclamos y confusiones post-remate. |
| **Tolerancia Offline (PWA)** | Caché inteligente y service worker que permiten el acceso sin conexión a internet. | **Continuidad operativa total:** Garantiza que el sistema siga respondiendo y visualizándose en áreas rurales de baja conectividad. El remate no se detiene si se cae internet. |
| **Habilitación de Pasillos** | Opción para habilitar pasillos de tránsito como corrales temporales si la feria se satura. | **Flexibilidad logística ante sobredemanda:** Permite responder con agilidad ante ingresos inesperados de hacienda, manteniendo la consistencia de los datos en el mapa interactivo. |
| **Exportación PDF Automatizada** | Generador de planillas apaisadas ordenadas por corral con espacios para anotaciones manuales. | **Administración fluida y control final rápido:** Entrega inmediata de la planilla consolidada a la administración y martilleros, acelerando la liquidación final y la entrega de los animales. |

---

## 5. Público Objetivo

La plataforma está diseñada específicamente para atender las necesidades de los actores clave de las ferias de hacienda:

1.  **Firmas Consignatarias y Empresas Rematadoras:** Quienes organizan la feria. Se benefician de la reducción de tiempos, mayor volumen de procesamiento de animales y eliminación de errores que impactan en su rentabilidad.
2.  **Operadores de Corrales (Pisteros y Capataces):** Los usuarios que cargan los datos y manejan el ganado. Se benefician de una herramienta intuitiva que simplifica su trabajo y les da una visión completa del predio.
3.  **Martilleros:** Se benefician al contar con información exacta y fotos de marcas para llevar a cabo la subasta con confianza y rapidez.
4.  **Productores, Compradores y Vendedores (Invitados):** Acceden en modo "solo lectura" para buscar lotes específicos, revisar fotos de marcas y exportar la planilla en PDF de manera transparente, mejorando su experiencia de compra.

---

## 6. Diferenciadores Comerciales

¿Por qué **Planilla Rural** es superior a las hojas de papel, planillas Excel o sistemas genéricos?

*   **Instalación Cero e Instantánea:** Al ser una PWA, no requiere descargas pesadas desde las tiendas App Store o Google Play. El usuario escanea un código QR o accede a un enlace y ya tiene la aplicación instalada con un ícono en su pantalla [VERIFICAR].
*   **Fidelidad al Layout Físico del Cliente:** El mapa no es un gráfico genérico; se adapta al plano de corrales real del predio del cliente, permitiendo que operadores experimentados pero no tecnológicos se familiaricen en segundos.
*   **Tratamiento Inteligente de Imágenes en Zonas Rurales:** El sistema reduce de forma automática y transparente el peso de las fotos tomadas en el corral antes de subirlas al servidor (conversión a WebP livianos y generación de miniaturas) [VERIFICAR]. Esto permite cargar fotos incluso con conexiones 3G/4G inestables y lentas sin saturar la red.
*   **Roles Claros sin Fricciones:** Acceso simplificado para invitados (sin registro obligatorio) y acceso seguro con usuario y contraseña para operadores encargados de cargar datos.

---

## 7. Casos de Uso Típicos: "Un día en la Feria"

### 7:00 AM — El Ingreso de Hacienda
El camión jaula llega al predio. El operador abre **Planilla Rural** en su celular desde el corral de descarga. A medida que bajan las vacas, el operador crea un nuevo lote en el corral asignado, selecciona la categoría "Vaca", ingresa la cantidad (18 cabezas) y toma dos fotografías nítidas de la marca a fuego del ganado. El sistema genera de forma transparente una miniatura liviana WebP de la foto y la sube al servidor. En la oficina de la feria, la administración ya visualiza que el corral está ocupado.

### 11:30 AM — El Control de Corrales
El capataz de la feria, recorriendo las pasarelas, necesita verificar la disponibilidad. Abre la pestaña **Corrales** en su tablet y ve un mapa interactivo con la distribución exacta. Al ver un corral pintado de azul oscuro (ocupado), lo toca y de inmediato ve que corresponde a "Estancia La Paz" con 15 Novillitos. Nota que en el corral contiguo hay espacio libre pintado de azul claro. Habilita temporalmente un pasillo como corral transitorio desde la app porque la feria está al límite de su capacidad.

### 2:00 PM — El Momento del Remate
El martillero comienza la subasta. Los compradores interesados (quienes ingresaron a la aplicación con el perfil de **Invitado** desde el comedor del predio) buscan en el buscador general "Vaca con cría". Al instante filtran los corrales donde están esos lotes, tocan las fichas y ven las marcas a fuego digitalizadas con zoom para verificar la procedencia sin tener que caminar hasta el corral bajo el sol.

### 5:30 PM — La Liquidación y Entrega
Finalizado el remate, el operador de corrales toca **"Descargar PDF"** en la app. Al instante genera un documento ordenado y prolijo con los corrales, remitentes y cantidades definitivas. Imprime dos copias en la oficina: una para el control físico de los camiones de salida y otra para la firma de conformidad del comprador. La jornada cierra sin un solo error de stock ni anotaciones ilegibles.

---

## 8. Escalabilidad y Futuras Integraciones

La arquitectura modular de **Planilla Rural** (Django backend con endpoints API desacoplados y base de datos relacional) permite proyectar las siguientes extensiones de negocio:

*   **Integración con Caravanas Electrónicas (RFID):** Conectividad directa vía Bluetooth con bastones lectores de caravanas ganaderas (RFID) para que al escanear un animal se cargue automáticamente la información en la planilla digital sin intervención manual [VERIFICAR].
*   **Conexión con Balanzas y Básculas:** Interfaz de comunicación con balanzas electrónicas en la pista de remate para registrar el peso exacto por lote en tiempo real [VERIFICAR].
*   **Históricos de Precios y Analítica:** Módulo administrativo para ingresar los precios de martillo de cada lote, generando gráficos automáticos de precios promedio por categoría y reportes comerciales históricos para la firma consignataria [VERIFICAR].
*   **Sincronización Multidispositivo Avanzada:** Implementación de WebSockets para actualizar en tiempo real los mapas y planillas de todos los operadores conectados de forma simultánea, sin necesidad de refrescar la pantalla manualmente [VERIFICAR].
