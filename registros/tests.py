from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.core.management import call_command
from django.test import TestCase
from django.test import override_settings
from django.urls import reverse

from .models import PreferenciaRemateUsuario, Registro, Remate


@override_settings(OPERADOR_USERNAMES=["operador1", "operador2"])
class RegistrosApiTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(username="operador1", password="Clave12345")
		self.non_operator = get_user_model().objects.create_user(username="visitante", password="Clave12345")
		self.remate = Remate.objects.create(nombre="Remate junio 2026")
		PreferenciaRemateUsuario.objects.create(usuario=self.user, remate=self.remate)
		self.client.login(username="operador1", password="Clave12345")

	def test_requires_authentication(self):
		self.client.logout()

		api_response = self.client.get(reverse("api-registros"))
		self.assertEqual(api_response.status_code, 401)

		web_response = self.client.get(reverse("home"))
		self.assertEqual(web_response.status_code, 302)
		self.assertIn(reverse("login"), web_response.url)

	def test_guest_role_permissions(self):
		self.client.logout()
		self.client.login(username="visitante", password="Clave12345")

		# Guest can view the home page
		web_response = self.client.get(reverse("home"))
		self.assertEqual(web_response.status_code, 200)

		# Guest can view the remates page
		remates_response = self.client.get(reverse("remates-home"))
		self.assertEqual(remates_response.status_code, 200)

		# The guest can change the selected auction to observe
		select_response = self.client.post(reverse("seleccionar-remate", kwargs={"remate_id": self.remate.id}))
		self.assertEqual(select_response.status_code, 302)

		# Guest can call GET API endpoints
		api_list_response = self.client.get(reverse("api-registros"))
		self.assertEqual(api_list_response.status_code, 200)

		api_map_response = self.client.get(reverse("api-corrales-mapa"))
		self.assertEqual(api_map_response.status_code, 200)

		# Guest is blocked (403 Forbidden) from POST write operations
		api_post_response = self.client.post(
			reverse("api-registros"),
			data={
				"corral": "12",
				"remitente": "Jose Luis Gutierrez",
				"categoria": "Vaca",
				"cantidad": 30,
			},
			content_type="application/json",
		)
		self.assertEqual(api_post_response.status_code, 403)

		# Guest is blocked (403 Forbidden) from PUT edit operations
		registro = Registro.objects.create(remate=self.remate, corral="10", remitente="Pedro")
		api_put_response = self.client.put(
			reverse("api-registro-detail", kwargs={"registro_id": registro.id}),
			data={
				"corral": "11",
				"remitente": "Pedro Gomez",
			},
			content_type="application/json",
		)
		self.assertEqual(api_put_response.status_code, 403)

		# Guest is blocked (403 Forbidden) from DELETE operations
		api_delete_response = self.client.delete(reverse("api-registro-detail", kwargs={"registro_id": registro.id}))
		self.assertEqual(api_delete_response.status_code, 403)

		# Guest is blocked from moving lots
		api_move_response = self.client.post(
			reverse("api-registro-mover", kwargs={"registro_id": registro.id}),
			data={"destinoCorral": "12"},
			content_type="application/json",
		)
		self.assertEqual(api_move_response.status_code, 403)

		# Guest is blocked from creating/finalizing auctions
		crear_remate_response = self.client.post(reverse("crear-remate"), data={"nombre": "Remate Invitado"})
		self.assertEqual(crear_remate_response.status_code, 403)

		finalizar_remate_response = self.client.post(reverse("finalizar-remate", kwargs={"remate_id": self.remate.id}))
		self.assertEqual(finalizar_remate_response.status_code, 403)

	def test_create_and_list_registro(self):
		create_response = self.client.post(
			reverse("api-registros"),
			data={
				"corral": "12",
				"remitente": "Jose Luis Gutierrez",
				"categoria": "Vaca",
				"cantidad": 30,
				"estado": "gordo",
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

		etag = list_response.headers.get("ETag")
		self.assertTrue(etag)
		cached_response = self.client.get(reverse("api-registros"), HTTP_IF_NONE_MATCH=etag)
		self.assertEqual(cached_response.status_code, 304)

	def test_sync_meta_endpoint(self):
		Registro.objects.create(remate=self.remate, corral="1", remitente="Sync A")
		Registro.objects.create(remate=self.remate, corral="2", remitente="Sync B")

		response = self.client.get(reverse("api-registros-ultimos-cambios"))
		self.assertEqual(response.status_code, 200)
		data = response.json()["data"]
		self.assertTrue(data["signature"])
		self.assertEqual(data["total"], 2)
		self.assertTrue(data["lastUpdatedAt"])

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

	def test_create_rejects_invalid_estado(self):
		response = self.client.post(
			reverse("api-registros"),
			data={
				"corral": "12",
				"remitente": "Proveedor X",
				"categoria": "Vaca",
				"estado": "excelente",
			},
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)
		self.assertIn("Estado invalido", response.json().get("error", ""))

	def test_update_and_delete_registro(self):
		registro = Registro.objects.create(remate=self.remate, corral="10", remitente="Pedro")

		get_response = self.client.get(reverse("api-registro-detail", kwargs={"registro_id": registro.id}))
		self.assertEqual(get_response.status_code, 200)
		self.assertIn("marcaImagenesFull", get_response.json()["data"])
		self.assertTrue(get_response.headers.get("ETag"))

		update_response = self.client.put(
			reverse("api-registro-detail", kwargs={"registro_id": registro.id}),
			data={
				"corral": "11",
				"remitente": "Pedro Gomez",
				"categoria": "Novillo",
				"cantidad": 18,
				"estado": "gordo",
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
		registro = Registro.objects.create(remate=self.remate, corral="10", remitente="Mover")

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
		registro = Registro.objects.create(remate=self.remate, corral="10", remitente="Mover pasillo")
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
		uno = Registro.objects.create(remate=self.remate, corral="20", remitente="Remitente Uno", cantidad=10, categoria="Vaca", estado="gordo")
		Registro.objects.create(remate=self.remate, corral="20", remitente="Remitente Dos", cantidad=5, categoria="Novillo", estado="invernada normal")

		# Registro de otro remate no debe figurar en la ocupacion del remate actual
		otro_remate = Remate.objects.create(nombre="Otro remate")
		Registro.objects.create(remate=otro_remate, corral="20", remitente="Remitente de otro remate", cantidad=8, categoria="Toro")

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

	def test_remates_selector_persists_selection(self):
		nuevo_remate = Remate.objects.create(nombre="Remate julio 2026")
		response = self.client.post(reverse("seleccionar-remate", kwargs={"remate_id": nuevo_remate.id}))
		self.assertEqual(response.status_code, 302)
		preferencia = PreferenciaRemateUsuario.objects.get(usuario=self.user)
		self.assertEqual(preferencia.remate_id, nuevo_remate.id)

	def test_remates_home_lists_selector(self):
		response = self.client.get(reverse("remates-home"))
		self.assertEqual(response.status_code, 200)
		self.assertContains(response, "Gestión de remates")

	def test_image_optimization_flow(self):
		# 1. Crear un registro con una imagen en Base64
		sample_base64 = "data:image/webp;base64,UklGRi4AAABXRUJQVlA4TCEAAAAvAUAAEB8wAiMwAgSSNtse/cXjEaBt20xy7zz1Pn///wA="
		create_response = self.client.post(
			reverse("api-registros"),
			data={
				"corral": "15",
				"remitente": "Remitente Foto",
				"categoria": "Novillo",
				"cantidad": 5,
				"marcaImagen": sample_base64,
			},
			content_type="application/json",
		)
		self.assertEqual(create_response.status_code, 201)
		reg_id = create_response.json()["data"]["id"]
		expected_url = f"/api/registros/{reg_id}/foto/"

		# 2. Verificar que en la serialización to_dict / listado no se expone el Base64 sino la URL
		self.assertEqual(create_response.json()["data"]["marcaImagen"], expected_url)
		
		db_reg = Registro.objects.get(id=reg_id)
		self.assertEqual(db_reg._parse_marca_images()[0]["full"], sample_base64)

		list_response = self.client.get(reverse("api-registros"))
		self.assertEqual(list_response.status_code, 200)
		self.assertEqual(list_response.json()["data"][0]["marcaImagen"], expected_url)

		# 3. Solicitar el endpoint de la foto y verificar que devuelve el binario con Cache-Control
		foto_response = self.client.get(reverse("api-registro-foto", kwargs={"registro_id": reg_id}))
		self.assertEqual(foto_response.status_code, 200)
		self.assertEqual(foto_response["Content-Type"], "image/webp")
		self.assertIn("max-age=86400", foto_response["Cache-Control"])
		self.assertTrue(len(foto_response.content) > 0)

		# 4. Actualizar el registro enviando su propia URL (no debería modificar la foto en BD)
		update_response = self.client.put(
			reverse("api-registro-detail", kwargs={"registro_id": reg_id}),
			data={
				"corral": "15",
				"remitente": "Remitente Foto",
				"categoria": "Novillo",
				"cantidad": 5,
				"marcaImagen": expected_url,
			},
			content_type="application/json",
		)
		self.assertEqual(update_response.status_code, 200)
		db_reg.refresh_from_db()
		self.assertEqual(db_reg._parse_marca_images()[0]["full"], sample_base64)

		# 5. Crear otro registro reutilizando la URL del primero (debería clonar la foto en BD)
		clone_response = self.client.post(
			reverse("api-registros"),
			data={
				"corral": "16",
				"remitente": "Remitente Clon",
				"categoria": "Novillo",
				"cantidad": 10,
				"marcaImagen": expected_url,
			},
			content_type="application/json",
		)
		self.assertEqual(clone_response.status_code, 201)
		clone_id = clone_response.json()["data"]["id"]
		db_clone = Registro.objects.get(id=clone_id)
		self.assertEqual(db_clone._parse_marca_images()[0]["full"], sample_base64)

		# 6. Actualizar enviando vacío (debería borrar la foto)
		clear_response = self.client.put(
			reverse("api-registro-detail", kwargs={"registro_id": reg_id}),
			data={
				"corral": "15",
				"remitente": "Remitente Foto",
				"categoria": "Novillo",
				"cantidad": 5,
				"marcaImagen": "",
			},
			content_type="application/json",
		)
		self.assertEqual(clear_response.status_code, 200)
		db_reg.refresh_from_db()
		self.assertEqual(len(db_reg._parse_marca_images()), 0)


@override_settings(OPERADOR_USERNAMES=["operador1", "operador2"])
class LimpiezaRemateTests(TestCase):
	def test_limpiar_remate_elimina_registros_y_sesiones_sin_borrar_usuarios(self):
		user_model = get_user_model()
		user_model.objects.create_user(username="operador1", password="Clave12345")
		user_model.objects.create_user(username="operador2", password="Clave12345")
		remate = Remate.objects.create(nombre="Remate limpieza")
		Registro.objects.create(remate=remate, corral="12", remitente="Proveedor X")
		Session.objects.create(session_key="abc123", session_data="e30:1", expire_date="2099-01-01T00:00:00Z")

		self.assertEqual(Registro.objects.count(), 1)
		self.assertEqual(Session.objects.count(), 1)
		self.assertEqual(user_model.objects.count(), 2)

		call_command("limpiar_remate", force=True)

		self.assertEqual(Registro.objects.count(), 0)
		self.assertEqual(Session.objects.count(), 0)
		self.assertEqual(user_model.objects.count(), 2)
