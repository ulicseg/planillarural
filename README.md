# Planilla Rural

Aplicacion web para carga y gestion de lotes ganaderos, con formulario de registros y vista de corrales sobre un mapa.

## Stack
- Backend: Django 5
- Frontend: Django Templates + JavaScript
- Base de datos: SQLite
- Hosting objetivo: PythonAnywhere (WSGI)

## Arquitectura
- UI principal: `registros/templates/registros/index.html`
- Endpoints API: `registros/views.py`
- Modelo de datos: `registros/models.py`

Flujo principal:
1. El operador inicia sesion.
2. Carga o edita un lote desde la UI.
3. El frontend consume la API (`/api/registros/`, `/api/corrales/*`).
4. Django valida y persiste en SQLite.
5. La seccion Corrales renderiza mapa, detalle y edicion por lote.

## Requisitos previos
- Python 3.11 o superior
- pip actualizado
- Git

## Instalacion local
1. Clonar el repositorio.
2. Crear y activar entorno virtual.

En PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Instalar dependencias:

```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno (desarrollo):

```powershell
$env:DJANGO_SECRET_KEY="dev-insecure-key-change-this"
$env:DJANGO_DEBUG="True"
$env:DJANGO_ALLOWED_HOSTS="127.0.0.1,localhost"
$env:DJANGO_CSRF_TRUSTED_ORIGINS=""
$env:OPERADOR_USERNAMES="operador1,operador2"
```

5. Ejecutar migraciones:

```bash
python manage.py migrate
```

6. Crear operadores:

```bash
python manage.py setup_operadores --password "TuClaveSegura"
```

7. Levantar servidor:

```bash
python manage.py runserver
```

8. Verificar:
- http://127.0.0.1:8000/
- http://127.0.0.1:8000/admin/

## Variables de entorno
- `DJANGO_SECRET_KEY`: clave secreta de Django.
- `DJANGO_DEBUG`: `True` para local, `False` para produccion.
- `DJANGO_ALLOWED_HOSTS`: hosts permitidos separados por coma.
- `DJANGO_CSRF_TRUSTED_ORIGINS`: origenes confiables (URLs HTTPS) separados por coma.
- `OPERADOR_USERNAMES`: usuarios operadores permitidos, separados por coma.

## Endpoints API
- `GET /api/registros/?q=texto`
- `POST /api/registros/`
- `PUT /api/registros/{id}/`
- `DELETE /api/registros/{id}/`
- `POST /api/registros/{id}/mover/`
- `GET /api/corrales/mapa/`
- `GET /api/corrales/{corral}/ocupacion/?exclude_id={id_opcional}`

## Publicacion en GitHub
Si el repo es nuevo o estas iniciando desde cero:

```bash
git init
git branch -M main
git remote add origin https://github.com/tu_usuario/tu_repo.git
git add .
git commit -m "feat(app): iniciar planilla rural con django"
git push -u origin main
```

Si el remoto ya existe (caso habitual):

```bash
git add .
git commit -m "docs(readme): actualizar guia de uso y deploy"
git push origin main
```

## Despliegue en PythonAnywhere (paso a paso)
1. Crear cuenta en PythonAnywhere.
2. En Dashboard, abrir una consola Bash.
3. Clonar el repo en tu home:

```bash
cd ~
git clone https://github.com/ulicseg/planillarural.git
cd planillarural
```

4. Crear virtualenv e instalar dependencias:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

5. Definir variables de entorno en Bash (y luego persistirlas en tu configuracion):

```bash
export DJANGO_SECRET_KEY="cambia-esto-por-una-clave-segura"
export DJANGO_DEBUG="False"
export DJANGO_ALLOWED_HOSTS="tuusuario.pythonanywhere.com"
export DJANGO_CSRF_TRUSTED_ORIGINS="https://tuusuario.pythonanywhere.com"
export OPERADOR_USERNAMES="operador1,operador2"
```

6. Ejecutar migraciones y estaticos:

```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py setup_operadores --password "TuClaveSegura"
```

7. Crear una Web App en PythonAnywhere (Manual configuration, Python 3.11).
8. Configurar virtualenv de la web app a: `/home/tuusuario/planillarural/.venv`.
9. Editar archivo WSGI de PythonAnywhere y dejarlo asi:

```python
import os
import sys

project_home = "/home/tuusuario/planillarural"
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

10. En la pestana Web de PythonAnywhere:
- Static files: mapear `/static/` a `/home/tuusuario/planillarural/staticfiles`.
- Reload de la web app.

11. Smoke checks post deploy:
- Abrir `https://tuusuario.pythonanywhere.com/login/`.
- Iniciar sesion con operador.
- Crear, editar y eliminar un registro.
- Abrir Corrales y verificar carga de mapa.

## Comandos utiles
```bash
python manage.py test registros
python manage.py check --deploy
python manage.py createsuperuser
```

## Gobernanza AI
- Reglas globales: `.github/instructions/copilot.instructions.md`
- Agentes por dominio: `agents/*`
- Especificacion inicial: `agents/specs/registros-crud-django.spec.md`
