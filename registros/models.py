import base64
import json
from io import BytesIO

from django.db import models
from PIL import Image


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
		first_img = thumbs[0] if thumbs else (fulls[0] if fulls else "")

		return {
			"id": self.id,
			"corral": self.corral,
			"remitente": self.remitente,
			"categoria": self.categoria,
			"cantidad": self.cantidad,
			"estado": self.estado,
			"observaciones": self.observaciones,
			# legacy field (string) kept for compatibility
			"marcaImagen": first_img,
			# new field: thumbnails always array
			"marcaImagenes": thumbs,
			# full images only when caller asks for them
			**({"marcaImagenesFull": fulls} if include_full else {}),
			"createdAt": self.created_at.isoformat(),
			"updatedAt": self.updated_at.isoformat(),
		}
