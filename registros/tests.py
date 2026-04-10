from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test import override_settings
from django.urls import reverse

from .models import Registro


@override_settings(OPERADOR_USERNAMES=["operador1", "operador2"])
class RegistrosApiTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(username="operador1", password="Clave12345")
		self.non_operator = get_user_model().objects.create_user(username="visitante", password="Clave12345")
		self.client.login(username="operador1", password="Clave12345")

	def test_requires_authentication(self):
		self.client.logout()

		api_response = self.client.get(reverse("api-registros"))
		self.assertEqual(api_response.status_code, 401)

		web_response = self.client.get(reverse("home"))
		self.assertEqual(web_response.status_code, 302)
		self.assertIn(reverse("login"), web_response.url)

	def test_denies_authenticated_non_operator(self):
		self.client.logout()
		self.client.login(username="visitante", password="Clave12345")

		api_response = self.client.get(reverse("api-registros"))
		self.assertEqual(api_response.status_code, 403)

		web_response = self.client.get(reverse("home"))
		self.assertEqual(web_response.status_code, 403)

	def test_create_and_list_registro(self):
		create_response = self.client.post(
			reverse("api-registros"),
			data={
				"corral": "12",
				"remitente": "Jose Luis Gutierrez",
				"categoria": "Vaca",
				"cantidad": 30,
				"estado": "Bueno",
				"observaciones": "Sin dato",
				"marcaImagen": "",
			},
			content_type="application/json",
		)

		self.assertEqual(create_response.status_code, 201)
		self.assertEqual(Registro.objects.count(), 1)

		list_response = self.client.get(reverse("api-registros"))
		self.assertEqual(list_response.status_code, 200)
		self.assertEqual(len(list_response.json()["data"]), 1)

	def test_create_requires_only_remitente(self):
		ok_without_corral = self.client.post(
			reverse("api-registros"),
			data={
				"corral": "",
				"remitente": "Solo remitente",
			},
			content_type="application/json",
		)

		self.assertEqual(ok_without_corral.status_code, 201)

		response = self.client.post(
			reverse("api-registros"),
			data={
				"corral": "",
				"remitente": "",
			},
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)

	def test_create_rejects_non_predefined_categoria(self):
		response = self.client.post(
			reverse("api-registros"),
			data={
				"corral": "12",
				"remitente": "Proveedor X",
				"categoria": "Categoria Libre",
			},
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)

	def test_update_and_delete_registro(self):
		registro = Registro.objects.create(corral="10", remitente="Pedro")

		update_response = self.client.put(
			reverse("api-registro-detail", kwargs={"registro_id": registro.id}),
			data={
				"corral": "11",
				"remitente": "Pedro Gomez",
				"categoria": "Novillo",
				"cantidad": 18,
				"estado": "Bueno",
				"observaciones": "Actualizado",
				"marcaImagen": "",
			},
			content_type="application/json",
		)

		self.assertEqual(update_response.status_code, 200)
		registro.refresh_from_db()
		self.assertEqual(registro.corral, "11")
		self.assertEqual(registro.remitente, "Pedro Gomez")

		delete_response = self.client.delete(reverse("api-registro-detail", kwargs={"registro_id": registro.id}))
		self.assertEqual(delete_response.status_code, 200)
		self.assertEqual(Registro.objects.count(), 0)

	def test_corrales_mapa_and_move(self):
		registro = Registro.objects.create(corral="10", remitente="Mover")

		mapa_response = self.client.get(reverse("api-corrales-mapa"))
		self.assertEqual(mapa_response.status_code, 200)
		data = mapa_response.json()["data"]
		self.assertIn("layout", data)
		self.assertIn("corrales", data)
		self.assertIn("pasillos", data)
		self.assertIn("ubicaciones", data)
		self.assertIn("1", data["corrales"])
		self.assertIn("1", data["ubicaciones"])
		self.assertTrue(len(data["pasillos"]) > 0)
		self.assertNotIn("PASILLO 1", data["ubicaciones"])

		mover_response = self.client.post(
			reverse("api-registro-mover", kwargs={"registro_id": registro.id}),
			data={"destinoCorral": "12"},
			content_type="application/json",
		)
		self.assertEqual(mover_response.status_code, 200)
		registro.refresh_from_db()
		self.assertEqual(registro.corral, "12")

	def test_create_pasillo_requires_allow_flag(self):
		pasillo = self.client.get(reverse("api-corrales-mapa")).json()["data"]["pasillos"][0]

		rejected = self.client.post(
			reverse("api-registros"),
			data={
				"corral": pasillo,
				"remitente": "Proveedor pasillo",
				"categoria": "Vaca",
			},
			content_type="application/json",
		)

		self.assertEqual(rejected.status_code, 400)

		accepted = self.client.post(
			reverse("api-registros"),
			data={
				"corral": pasillo,
				"allowPasillo": True,
				"remitente": "Proveedor pasillo",
				"categoria": "Vaca",
			},
			content_type="application/json",
		)

		self.assertEqual(accepted.status_code, 201)
		self.assertEqual(accepted.json()["data"]["corral"], pasillo)

	def test_move_to_pasillo_requires_allow_flag(self):
		registro = Registro.objects.create(corral="10", remitente="Mover pasillo")
		pasillo = self.client.get(reverse("api-corrales-mapa")).json()["data"]["pasillos"][0]

		rejected = self.client.post(
			reverse("api-registro-mover", kwargs={"registro_id": registro.id}),
			data={"destinoCorral": pasillo},
			content_type="application/json",
		)
		self.assertEqual(rejected.status_code, 400)

		accepted = self.client.post(
			reverse("api-registro-mover", kwargs={"registro_id": registro.id}),
			data={"destinoCorral": pasillo, "allowPasillo": True},
			content_type="application/json",
		)
		self.assertEqual(accepted.status_code, 200)
		registro.refresh_from_db()
		self.assertEqual(registro.corral, pasillo)

	def test_corral_ocupacion_detail(self):
		uno = Registro.objects.create(corral="20", remitente="Remitente Uno", cantidad=10, categoria="Vaca", estado="Bueno")
		Registro.objects.create(corral="20", remitente="Remitente Dos", cantidad=5, categoria="Novillo", estado="Regular")

		ocupado_response = self.client.get(reverse("api-corral-ocupacion", kwargs={"corral": "20"}))
		self.assertEqual(ocupado_response.status_code, 200)
		payload = ocupado_response.json()["data"]
		self.assertTrue(payload["ocupado"])
		self.assertEqual(len(payload["registros"]), 2)

		exclude_response = self.client.get(reverse("api-corral-ocupacion", kwargs={"corral": "20"}) + f"?exclude_id={uno.id}")
		self.assertEqual(exclude_response.status_code, 200)
		exclude_payload = exclude_response.json()["data"]
		self.assertEqual(len(exclude_payload["registros"]), 1)

		vacio_response = self.client.get(reverse("api-corral-ocupacion", kwargs={"corral": "130"}))
		self.assertEqual(vacio_response.status_code, 200)
		self.assertFalse(vacio_response.json()["data"]["ocupado"])
