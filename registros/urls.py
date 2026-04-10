from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    path("login/", auth_views.LoginView.as_view(template_name="registros/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("manifest.webmanifest", views.pwa_manifest, name="pwa-manifest"),
    path("sw.js", views.pwa_service_worker, name="pwa-service-worker"),
    path("", views.index, name="home"),
    path("api/registros/", views.api_registros, name="api-registros"),
    path("api/registros/<int:registro_id>/", views.api_registro_detail, name="api-registro-detail"),
    path("api/registros/<int:registro_id>/mover/", views.api_registro_mover, name="api-registro-mover"),
    path("api/corrales/mapa/", views.api_corrales_mapa, name="api-corrales-mapa"),
    path("api/corrales/<str:corral>/ocupacion/", views.api_corral_ocupacion, name="api-corral-ocupacion"),
]
