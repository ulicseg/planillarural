"""Dominio puro de mapas de corrales: constantes, validacion y parseo de Excel.

No importa modelos de Django para evitar ciclos. openpyxl se importa lazy
dentro de parsear_excel (dependencia solo de desarrollo).
"""

PASILLO_LABEL = "PASILLO"
TORIL_CORRAL_ID = "1"
KINDS_VALIDOS = {"corral", "pasillo", "toril", "pista"}
MAX_GRID = 200


def validar_layout(rows, cols, layout):
	"""Devuelve una lista de mensajes de error. Lista vacia => layout valido."""
	errores = []

	if not isinstance(rows, int) or not isinstance(cols, int) or rows < 1 or cols < 1:
		return ["rows y cols deben ser enteros >= 1."]
	if rows > MAX_GRID or cols > MAX_GRID:
		return [f"rows y cols no pueden superar {MAX_GRID}."]
	if not isinstance(layout, list) or not layout:
		return ["El layout debe ser una lista no vacia de celdas."]

	ocupadas = set()
	labels_corral = []
	toriles = 0
	corrales = 0

	for i, celda in enumerate(layout):
		if not isinstance(celda, dict):
			errores.append(f"Celda {i}: debe ser un objeto.")
			continue

		kind = celda.get("kind")
		if kind not in KINDS_VALIDOS:
			errores.append(f"Celda {i}: kind invalido ({kind!r}).")
			continue

		try:
			row = int(celda["row"])
			col = int(celda["col"])
			row_span = int(celda.get("row_span", 1))
			col_span = int(celda.get("col_span", 1))
		except (KeyError, TypeError, ValueError):
			errores.append(f"Celda {i}: row/col/row_span/col_span deben ser enteros.")
			continue

		if row < 1 or col < 1 or row_span < 1 or col_span < 1:
			errores.append(f"Celda {i}: row/col/spans deben ser >= 1.")
			continue

		if row + row_span - 1 > rows or col + col_span - 1 > cols:
			errores.append(f"Celda {i}: se sale de la grilla {rows}x{cols}.")
			continue

		celda_ocupa = [(r, c) for r in range(row, row + row_span) for c in range(col, col + col_span)]
		solapa = [p for p in celda_ocupa if p in ocupadas]
		if solapa:
			errores.append(f"Celda {i}: se solapa con otra celda en {solapa[0]}.")
		ocupadas.update(celda_ocupa)

		label = str(celda.get("label", "")).strip()
		if kind == "toril":
			toriles += 1
		if kind == "corral":
			corrales += 1
			labels_corral.append(label)

	if corrales == 0:
		errores.append("Debe haber al menos un corral.")
	if toriles > 1:
		errores.append("Solo puede haber un toril.")

	duplicados = sorted({l for l in labels_corral if labels_corral.count(l) > 1})
	if duplicados:
		errores.append(f"Labels de corral duplicados: {duplicados}.")
	if TORIL_CORRAL_ID in labels_corral:
		errores.append(f"Ningun corral puede tener el label reservado '{TORIL_CORRAL_ID}' (TORIL).")

	return errores
