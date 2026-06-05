# SPEC: Vista General del Remate

**Version:** 1.0
**Date:** 2026-06-02
**Status:** Draft
**Author:** Equipo Planilla Rural

## Overview
Rediseñar la vista principal del sistema como una vista general y completa del remate en curso, con foco en claridad operativa, lectura rápida y uso simultaneo en celular y escritorio.

## Objetivo
- Mantener una unica pagina para operar todo el remate.
- Priorizar una experiencia mobile-first sin perder una vista de escritorio completa.
- Evitar controles duplicados o ambiguos.
- Hacer que el flujo de carga, busqueda y gestion de corrales sea inmediato.

## Principios de UX/UI
- Jerarquia visual clara: resumen primero, acciones despues, listado al final.
- Un solo control por accion principal.
- Estados visibles para remate, vista y seleccion de corral.
- Dise;o limpio, institucional y sobrio.
- Escalabilidad visual para muchos registros.

## Layout Esperado
### Mobile
1. Header del remate activo.
2. Bloque resumido de estado.
3. Formulario de carga.
4. Buscador y ordenamiento.
5. Listado de registros.
6. Vista de corrales.
7. Detalle de corral seleccionado.

### Desktop
1. Barra superior con remate activo, fecha, lugar y acciones globales.
2. Columna izquierda con mapa de corrales y resumen operativo.
3. Columna derecha con formulario de carga, buscador, listado y detalle del corral.
4. Controles pegajosos para mantener contexto al desplazarse.

## Interaction Rules
- La vista por defecto debe ser responsive para celular.
- Debe existir un boton unico para alternar entre modo movil y modo escritorio.
- En escritorio deben verse simultaneamente el mapa y el panel de registros.
- No deben existir botones repetidos para la misma accion.
- El listado debe soportar volumen alto de registros sin perder legibilidad.

## Data Display
### Remate activo
- Nombre.
- Fecha.
- Lugar.
- Estado: activo o finalizado.

### Registros
- Corral.
- Remitente.
- Categoria.
- Cantidad.
- Estado.
- Observaciones.
- Foto de marca.
- Acciones: editar, eliminar, agregar foto.

### Corrales
- Mapa completo.
- Total de cabezas.
- Corral seleccionado.
- Registros del corral.
- Acciones contextuales.

## Quality Gates
- Crear, editar, eliminar y buscar siguen funcionando sin recarga.
- El mapa sigue seleccionando corrales correctamente.
- El modo escritorio no rompe el modo movil.
- No se duplican acciones visibles.
- La vista sigue siendo usable con muchos registros.

## Scope
- Frontend template principal.
- Estilos y organizacion de la vista.
- Ajustes menores en comportamiento cliente si hacen falta para el nuevo layout.

## Non-Goals
- Cambios de base de datos.
- Cambios en el modelo de dominio.
- Cambios en reglas de negocio del backend.
