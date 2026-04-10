from django.db import models


class Registro(models.Model):
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
			"corral": self.corral,
			"remitente": self.remitente,
			"categoria": self.categoria,
			"cantidad": self.cantidad,
			"estado": self.estado,
			"observaciones": self.observaciones,
			"marcaImagen": self.marca_imagen,
			"createdAt": self.created_at.isoformat(),
			"updatedAt": self.updated_at.isoformat(),
		}
