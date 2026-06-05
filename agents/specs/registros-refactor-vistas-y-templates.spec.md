# SPEC: Refactor de vistas y templates de Registros

**Version:** 1.0
**Date:** 2026-06-02
**Status:** Draft
**Author:** Equipo Planilla Rural

## Overview
Separar la capa de presentación y la capa de vistas del app `registros` en módulos y templates reutilizables, manteniendo el comportamiento actual y mejorando mantenibilidad, carga y claridad del proyecto.

## Objetivo
- Dividir las vistas Django por responsabilidad funcional.
- Reducir duplicación de HTML compartido en páginas auxiliares.
- Mantener compatibilidad con las rutas existentes.
- Preparar una base para seguir extrayendo UI en parciales sin tocar reglas de negocio.

## Alcance
### Backend
- Helpers comunes en un módulo dedicado.
- Vistas de página separadas de las vistas de API.
- URLs apuntando a funciones importadas por responsabilidad.

### Frontend
- Template base compartido para autenticación y gestión de remates.
- Parciales reutilizables para bloques de UI repetidos.
- Conservación del layout y comportamiento actual de cada pantalla.

## Estructura Esperada
### Python
- `registros/view_helpers.py`
- `registros/views_pages.py`
- `registros/views_api.py`
- `registros/views.py` como shim de compatibilidad

### Templates
- `registros/templates/registros/base.html`
- `registros/templates/registros/login.html`
- `registros/templates/registros/remates.html`
- `registros/templates/registros/partials/remate_selected.html`

## Reglas
- No cambiar reglas de negocio del modelo `Registro` o `Remate`.
- No modificar contratos de endpoints existentes.
- No romper el flujo de login, selección de remate ni CRUD de registros.
- Mantener el HTML válido y compilable por Django.

## Quality Gates
- `python manage.py check` sin errores.
- `get_template()` carga `login.html` y `remates.html` sin errores de sintaxis.
- Las URLs continúan resolviendo a las mismas rutas públicas.
- El comportamiento de API sigue siendo idéntico para cliente y navegador.

## Deliverables
- Vistas separadas por capa.
- Base template compartido.
- Parcial reutilizable para el remate seleccionado.
- Documentación de refactor agregada al repo.