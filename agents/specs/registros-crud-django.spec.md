# SPEC: Sistema Basico de Registros Ganaderos

**Version:** 1.0
**Date:** 2026-04-03
**Status:** In Development
**Author:** Equipo Planilla Rural

## Overview
Implementar un sistema basico con frontend y backend definidos usando Django + SQLite.

### Context
- Ya existia una version frontend aislada.
- Se necesita persistencia real y API propia.
- El deploy objetivo es PythonAnywhere.

## Actors
1. Operador de carga: crea y actualiza registros.
2. Supervisor: consulta y elimina registros incorrectos.

## Use Cases
### UC-1: Crear registro
**Actor:** Operador
**Precondition:** Formulario visible
**Flow:**
1. Completa remitente (obligatorio).
2. Completa campos opcionales.
3. Guarda registro.
**Postcondition:** Registro guardado en SQLite y visible en listado.

### UC-2: Buscar registro
**Actor:** Operador / Supervisor
**Flow:**
1. Escribe texto en buscador global.
2. Sistema filtra por cualquier campo relevante.
**Postcondition:** Se muestran solo resultados coincidentes.

### UC-3: Gestionar lotes en mapa de corrales
**Actor:** Operador
**Flow:**
1. Abre la seccion Corrales en navegacion mobile.
2. Selecciona un corral del mapa grid.
3. Visualiza lotes del corral, edita o mueve un lote a otro corral.
**Postcondition:** El lote queda actualizado y visible en el nuevo corral.

## Data Model
Entity Registro:
- id
- corral
- remitente
- categoria
- cantidad
- estado
- observaciones
- marca_imagen
- created_at
- updated_at

## API Endpoints
1. GET /api/registros/?q=texto
2. POST /api/registros/
3. PUT /api/registros/{id}/
4. DELETE /api/registros/{id}/
5. GET /api/corrales/mapa/
6. POST /api/registros/{id}/mover/

## Business Rules
- BR-1: Solo remitente es obligatorio.
- BR-2: Cantidad, si existe, debe ser entero >= 0.
- BR-3: El buscador global consulta campos textuales y cantidad.
- BR-4: El destino de movimiento debe ser un corral valido del plano.

## Security
- CSRF activo para operaciones POST/PUT/DELETE.
- Errores internos no se exponen al cliente.

## Edge Cases & Validations
1. JSON invalido -> 400.
2. Campos obligatorios vacios -> 400.
3. Registro inexistente en update/delete -> 404.

## Deliverables
### Backend
- [x] Modelo Registro
- [x] Endpoints CRUD
- [ ] Tests unitarios

### Frontend
- [x] Formulario de carga
- [x] Buscador global
- [x] Listado con editar/eliminar

## Implementation Plan
### Phase 1
- Crear proyecto Django, app y modelo.
- Exponer API CRUD.

### Phase 2
- Integrar frontend a API.
- Validar flujo end-to-end.

### Phase 3
- Preparar docs de deploy PythonAnywhere.

## Dependencies
### Depends on:
- Django 5.x
- SQLite

### Is a dependency of:
- Reportes y autenticacion futura

## Technical Notes
1. Se mantiene una sola app para simplicidad inicial.
2. Arquitectura aplicada: View(API Controller) -> Modelo/ORM.
