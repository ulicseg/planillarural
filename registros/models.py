from django.conf import settings
from django.db import models
from django.utils import timezone


class Remate(models.Model):
	nombre = models.CharField(max_length=140)
	fecha = models.DateField(null=True, blank=True)
	lugar = models.CharField(max_length=160, blank=True)
	finalizado = models.BooleanField(default=False)
	finalizado_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-created_at", "-id"]

	def __str__(self):
		estado = "finalizado" if self.finalizado else "abierto"
		return f"{self.nombre} ({estado})"

	def finalizar(self):
		if self.finalizado:
			return
		self.finalizado = True
		self.finalizado_at = timezone.now()
		self.save(update_fields=["finalizado", "finalizado_at", "updated_at"])

	def to_dict(self):
		return {
			"id": self.id,
			"nombre": self.nombre,
			"fecha": self.fecha.isoformat() if self.fecha else None,
			"lugar": self.lugar,
			"finalizado": self.finalizado,
			"finalizadoAt": self.finalizado_at.isoformat() if self.finalizado_at else None,
			"createdAt": self.created_at.isoformat(),
			"updatedAt": self.updated_at.isoformat(),
		}


class PreferenciaRemateUsuario(models.Model):
	usuario = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="preferencia_remate",
	)
	remate = models.ForeignKey(
		Remate,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="preferencias_usuario",
	)
	updated_at = models.DateTimeField(auto_now=True)


class Registro(models.Model):
	remate = models.ForeignKey(Remate, on_delete=models.SET_NULL, null=True, blank=True, related_name="registros")
	corral = models.CharField(max_length=40)
	remitente = models.CharField(max_length=140)
	categoria = models.CharField(max_length=80, blank=True)
	cantidad = models.PositiveIntegerField(null=True, blank=True)
	estado = models.CharField(max_length=80, blank=True)
	observaciones = models.TextField(blank=True)
	marca_imagen = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-updated_at"]

	def __str__(self):
		return f"Corral {self.corral} - {self.remitente}"

	def to_dict(self):
		return {
			"id": self.id,
			"remateId": self.remate_id,
			"remateNombre": self.remate.nombre if self.remate_id else "",
			"remateFinalizado": self.remate.finalizado if self.remate_id else False,
			"corral": self.corral,
			"remitente": self.remitente,
			"categoria": self.categoria,
			"cantidad": self.cantidad,
			"estado": self.estado,
			"observaciones": self.observaciones,
			"marcaImagen": f"/api/registros/{self.id}/foto/" if self.marca_imagen else "",
			"createdAt": self.created_at.isoformat(),
			"updatedAt": self.updated_at.isoformat(),
		}
