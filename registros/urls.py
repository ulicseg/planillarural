from django.contrib.auth import views as auth_views
from django.urls import path

from .views_api import api_corral_ocupacion, api_corrales_mapa, api_registro_detail, api_registro_foto, api_registro_mover, api_registros
from .views_pages import crear_remate, finalizar_remate, index, pwa_manifest, pwa_service_worker, remates_home, seleccionar_remate

urlpatterns = [
    path("login/", auth_views.LoginView.as_view(template_name="registros/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("manifest.webmanifest", pwa_manifest, name="pwa-manifest"),
    path("sw.js", pwa_service_worker, name="pwa-service-worker"),
    path("remates/", remates_home, name="remates-home"),
    path("remates/nuevo/", crear_remate, name="crear-remate"),
    path("remates/<int:remate_id>/seleccionar/", seleccionar_remate, name="seleccionar-remate"),
    path("remates/<int:remate_id>/finalizar/", finalizar_remate, name="finalizar-remate"),
    path("", index, name="home"),
    path("api/registros/", api_registros, name="api-registros"),
    path("api/registros/<int:registro_id>/", api_registro_detail, name="api-registro-detail"),
    path("api/registros/<int:registro_id>/foto/", api_registro_foto, name="api-registro-foto"),
    path("api/registros/<int:registro_id>/mover/", api_registro_mover, name="api-registro-mover"),
    path("api/corrales/mapa/", api_corrales_mapa, name="api-corrales-mapa"),
    path("api/corrales/<str:corral>/ocupacion/", api_corral_ocupacion, name="api-corral-ocupacion"),
]
