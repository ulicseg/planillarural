import base64
import json
from io import BytesIO

from django.conf import settings
from django.db import models
from django.utils import timezone
from PIL import Image


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

	@staticmethod
	def _make_thumbnail_data_url(data_url, max_size=260):
		if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
			return data_url or ""

		try:
			header, encoded = data_url.split(",", 1)
			raw_bytes = base64.b64decode(encoded)
			with Image.open(BytesIO(raw_bytes)) as image:
				if image.mode not in ("RGB", "L"):
					image = image.convert("RGB")
				image.thumbnail((max_size, max_size))
				buffer = BytesIO()
				image.save(buffer, format="WEBP", quality=72, method=6)
				thumb = base64.b64encode(buffer.getvalue()).decode("ascii")
				return f"data:image/webp;base64,{thumb}"
		except Exception:
			return data_url

	def _parse_marca_images(self):
		"""Return normalized image records with full and thumbnail data URLs."""
		items = []
		if not self.marca_imagen:
			return items

		try:
			parsed = json.loads(self.marca_imagen)
		except Exception:
			parsed = self.marca_imagen

		if isinstance(parsed, list):
			raw_items = parsed
		elif parsed:
			raw_items = [parsed]
		else:
			raw_items = []

		for item in raw_items:
			full = ""
			thumb = ""

			if isinstance(item, dict):
				full = (item.get("full") or item.get("image") or item.get("src") or item.get("url") or "").strip()
				thumb = (item.get("thumb") or item.get("thumbnail") or "").strip()
			elif isinstance(item, str):
				full = item.strip()

			if not full and thumb:
				full = thumb
			if not thumb and full:
				thumb = self._make_thumbnail_data_url(full)

			if full:
				items.append({"full": full, "thumb": thumb or full})

		return items

	def to_dict(self, include_full=False):
		images = self._parse_marca_images()
		thumbs = [item["thumb"] for item in images if item.get("thumb")]
		fulls = [item["full"] for item in images if item.get("full")]

		# Replace base64 values with lightweight relative API URLs to avoid sending megabytes of base64 data
		thumb_urls = [f"/api/registros/{self.id}/foto/{i}/?thumb=1" for i in range(len(thumbs))]
		full_urls = [f"/api/registros/{self.id}/foto/{i}/" for i in range(len(fulls))]
		first_img_url = f"/api/registros/{self.id}/foto/" if thumbs else ""

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
			# legacy field (string) kept for compatibility
			"marcaImagen": first_img_url,
			# new field: thumbnails always array
			"marcaImagenes": thumb_urls,
			# full images only when caller asks for them
			**({"marcaImagenesFull": full_urls} if include_full else {}),
			"createdAt": self.created_at.isoformat(),
			"updatedAt": self.updated_at.isoformat(),
		}
