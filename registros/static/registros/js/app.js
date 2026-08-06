      const form = document.getElementById("registroForm");
      const registroIdInput = document.getElementById("registroId");
      const guardarBtn = document.getElementById("guardarBtn");
      const cancelarEdicionBtn = document.getElementById("cancelarEdicion");
      const abrirCamaraBtn = document.getElementById("abrirCamaraBtn");
      const marcaInput = document.getElementById("marca");
      const estadoOptions = document.getElementById("estadoOptions");
      const previewWrap = document.getElementById("previewWrap");
      const previewGrid = document.getElementById("previewGrid");
      const quitarImagenBtn = document.getElementById("quitarImagen");
      const MAX_MARCA_IMAGES = 6;
      const buscadorGeneral = document.getElementById("buscadorGeneral");
      const ordenRegistros = document.getElementById("ordenRegistros");
      const cardsContainer = document.getElementById("cardsContainer");
      const mensaje = document.getElementById("mensaje");
      const corralInput = document.getElementById("corral");
      const remitenteInput = document.getElementById("remitente");
      const remitentesDatalist = document.getElementById("remitentesDatalist");
      const remitenteMarcasWrap = document.getElementById("remitenteMarcasWrap");
      const remitenteMarcasGrid = document.getElementById("remitenteMarcasGrid");
      const corralOcupacionAviso = document.getElementById("corralOcupacionAviso");
      const ubicacionesDatalist = document.getElementById("ubicacionesDatalist");
      const marcaRapidaInput = document.getElementById("marcaRapidaInput");
      const exportPdfBtn = document.getElementById("exportPdfBtn");
      const limpiarFiltroCorralBtn = document.getElementById("limpiarFiltroCorralBtn");
      const imageViewerContent = document.getElementById("imageViewerContent");
      const imgZoomInBtn = document.getElementById("imgZoomInBtn");
      const imgZoomOutBtn = document.getElementById("imgZoomOutBtn");
      const imgZoomResetBtn = document.getElementById("imgZoomResetBtn");

      const registrosSection = document.getElementById("registrosSection");
      const corralesSection = document.getElementById("corralesSection");
      const workspaceShell = document.getElementById("workspaceShell");
      const appMain = document.getElementById("appMain");
      const navRegistros = document.getElementById("navRegistros");
      const navCorrales = document.getElementById("navCorrales");
      const toggleDesktopViewBtn = document.getElementById("toggleDesktopViewBtn");
      const refrescarRegistrosBtn = document.getElementById("refrescarRegistrosBtn");
      const refrescarCorralesBtn = document.getElementById("refrescarCorralesBtn");

      const mapaGrid = document.getElementById("mapaGrid");
      const mapaCanvas = document.getElementById("mapaCanvas");
      const mapaViewport = document.getElementById("mapaViewport");
      const habilitarPasillosInput = document.getElementById("habilitarPasillos");
      const zoomOutBtn = document.getElementById("zoomOutBtn");
      const zoomInBtn = document.getElementById("zoomInBtn");
      const centerCorralBtn = document.getElementById("centerCorralBtn");
      const corralDetalleTitulo = document.getElementById("corralDetalleTitulo");
      const corralDetalleSubtitulo = document.getElementById("corralDetalleSubtitulo");
      const corralDetalleContainer = document.getElementById("corralDetalleContainer");
      const nuevoEnCorralBtn = document.getElementById("nuevoEnCorralBtn");
      const desktopCorralBar = document.getElementById("desktopCorralBar");
      const desktopCorralNombre = document.getElementById("desktopCorralNombre");
      const desktopCorralResumen = document.getElementById("desktopCorralResumen");
      const desktopNuevoEnCorralBtn = document.getElementById("desktopNuevoEnCorralBtn");
      const desktopCorralCerrar = document.getElementById("desktopCorralCerrar");
      const editarLoteModal = document.getElementById("editarLoteModal");
      const cerrarModalBtn = document.getElementById("cerrarModalBtn");
      const editarLoteForm = document.getElementById("editarLoteForm");
      const editarLoteId = document.getElementById("editarLoteId");
      const modalCorral = document.getElementById("modalCorral");
      const modalCorralOcupacionAviso = document.getElementById("modalCorralOcupacionAviso");
      const modalRemitente = document.getElementById("modalRemitente");
      const modalCategoria = document.getElementById("modalCategoria");
      const modalCantidad = document.getElementById("modalCantidad");
      const modalEstadoOptions = document.getElementById("modalEstadoOptions");
      const modalObservaciones = document.getElementById("modalObservaciones");
      const cameraModal = document.getElementById("cameraModal");
      const cameraVideo = document.getElementById("cameraVideo");
      const cameraStatus = document.getElementById("cameraStatus");
      const tomarFotoBtn = document.getElementById("tomarFotoBtn");
      const cerrarCamaraBtn = document.getElementById("cerrarCamaraBtn");
      const usarArchivoFallbackBtn = document.getElementById("usarArchivoFallbackBtn");
      const imageViewerModal = document.getElementById("imageViewerModal");
      const imageViewerImg = document.getElementById("imageViewerImg");
      const cerrarImageViewerBtn = document.getElementById("cerrarImageViewerBtn");
      const deleteConfirmModal = document.getElementById("deleteConfirmModal");
      const deleteConfirmTitle = document.getElementById("deleteConfirmTitle");
      const deleteConfirmMessage = document.getElementById("deleteConfirmMessage");
      const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
      const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

      let imagenBase64Actual = [];
      let registros = [];
      let registrosAll = [];
      let corralesMapa = null;
      let selectedCorral = "";
      let corralesDisponibles = [];
      let pasillosDisponibles = [];
      let ocupacionCorralActual = null;
      let ocupacionModalCorralActual = null;
      let pendingMarcaRegistroId = null;
      let cameraStream = null;
      let cameraTrack = null;
      let cameraCaptureReadyAt = 0;
      let cameraTarget = "form";
      let cameraRegistroId = null;
      let pendingDeleteConfirmResolve = null;
      let remitenteMarcasActuales = [];
      let isSavingRegistro = false;
      let currentSection = "registros";
      let desktopViewEnabled = localStorage.getItem("planillaDesktopView") === "1";
      let registroDetailCache = new Map();
      let lastRegistrosSyncSignature = sessionStorage.getItem("registrosSyncSignature") || "";
      let buscadorDebounceTimer = null;
      let ultimoQueryProcesado = "";
      let corralesMapaLoaded = false;

      let zoomScale = 0.55;
      let panX = 0;
      let panY = 0;
      let touchMode = "";
      let startPanX = 0;
      let startPanY = 0;
      let startTouchX = 0;
      let startTouchY = 0;
      let pinchStartDistance = 0;
      let pinchStartScale = 0;
      let pinchCenterX = 0;
      let pinchCenterY = 0;
      let hasDragged = false;

      let imageZoomScale = 1;
      let imagePanX = 0;
      let imagePanY = 0;
      let isDraggingImg = false;
      let imgDragStartX = 0;
      let imgDragStartY = 0;
      let imgPanStartX = 0;
      let imgPanStartY = 0;

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function getMapSize() {
        if (!corralesMapa) {
          return { width: 0, height: 0 };
        }

        // Medir el bounding box REAL de las celdas. No usar scrollWidth/scrollHeight:
        // el grid se estira para llenar el viewport cuando el mapa es mas chico que
        // este (mapas angostos como el de Frias), y entonces scrollWidth/Height
        // reportan el tamaño del contenedor estirado, no el del mapa. offsetLeft/Top/
        // Width/Height ignoran el transform de zoom y dan la geometria real del contenido.
        if (mapaGrid) {
          const celdas = mapaGrid.querySelectorAll(".mapa-cell");
          if (celdas.length) {
            let width = 0;
            let height = 0;
            celdas.forEach((celda) => {
              width = Math.max(width, celda.offsetLeft + celda.offsetWidth);
              height = Math.max(height, celda.offsetTop + celda.offsetHeight);
            });
            if (width > 0 && height > 0) {
              // sumar el padding del grid (4px por lado)
              return { width: width + 4, height: height + 4 };
            }
          }
        }

        // Fallback matemático de respaldo por si el mapa está oculto en display: none
        const cols = corralesMapa.cols || 13;
        const rows = corralesMapa.rows || 35;
        return {
          width: cols * 30 + 6,
          height: rows * 30 + 50,
        };
      }

      function clampPan() {
        const viewportWidth = mapaViewport.clientWidth - 16;
        const viewportHeight = mapaViewport.clientHeight - 16;
        const mapSize = getMapSize();

        const scaledWidth = mapSize.width * zoomScale;
        const scaledHeight = mapSize.height * zoomScale;

        if (scaledWidth <= viewportWidth) {
          panX = (viewportWidth - scaledWidth) / 2;
        } else {
          panX = clamp(panX, viewportWidth - scaledWidth, 0);
        }

        if (scaledHeight <= viewportHeight) {
          panY = (viewportHeight - scaledHeight) / 2;
        } else {
          panY = clamp(panY, viewportHeight - scaledHeight, 0);
        }
      }

      function applyMapTransform() {
        clampPan();
        mapaCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
      }

      function fitMapToViewport() {
        if (!corralesMapa) return;
        const mapSize = getMapSize();
        if (mapSize.width === 0 || mapSize.height === 0) return;
        const vw = mapaViewport.clientWidth - 16;
        const vh = mapaViewport.clientHeight - 16;
        const zoomX = vw / mapSize.width;
        const zoomY = vh / mapSize.height;
        // Acercamos un poco mas que el "fit" exacto para que el mapa no se vea lejano;
        // queda pannable y centrado en el viewport.
        const contain = Math.min(zoomX, zoomY);
        zoomScale = clamp(contain * 1.2, 0.3, 3.0);
        const scaledW = mapSize.width * zoomScale;
        const scaledH = mapSize.height * zoomScale;
        panX = (mapaViewport.clientWidth - scaledW) / 2;
        panY = (mapaViewport.clientHeight - scaledH) / 2;
        applyMapTransform();
      }


      function zoomAround(targetScale, originX, originY) {
        const nextScale = clamp(targetScale, 0.25, 3);
        const worldX = (originX - panX) / zoomScale;
        const worldY = (originY - panY) / zoomScale;

        zoomScale = nextScale;
        panX = originX - worldX * zoomScale;
        panY = originY - worldY * zoomScale;
        applyMapTransform();
      }

      function centerOnCorral(corral) {
        if (!corral) {
          showMessage("Selecciona un corral para centrar.", "error");
          return;
        }

        const element = mapaGrid.querySelector(`[data-map-corral="${corral}"]`);
        if (!element) {
          showMessage("No se pudo ubicar el corral seleccionado.", "error");
          return;
        }

        const row = Number(element.dataset.row || 1);
        const col = Number(element.dataset.col || 1);
        const rowSpan = Number(element.dataset.rowSpan || 1);
        const colSpan = Number(element.dataset.colSpan || 1);

        const viewportWidth = mapaViewport.clientWidth - 16;
        const viewportHeight = mapaViewport.clientHeight - 16;

        // Considera el ancho de celda de 28px, gap de 2px y padding inicial de 4px en el cálculo preciso del centro
        const centerX = 3 + (col - 1) * 30 + colSpan * 15;
        const centerY = 3 + (row - 1) * 30 + rowSpan * 15;

        panX = viewportWidth / 2 - centerX * zoomScale;
        panY = viewportHeight / 2 - centerY * zoomScale;
        applyMapTransform();
      }

      function getTouchDistance(touchA, touchB) {
        const dx = touchA.clientX - touchB.clientX;
        const dy = touchA.clientY - touchB.clientY;
        return Math.hypot(dx, dy);
      }

      function setupTouchNavigation() {
        mapaViewport.addEventListener("touchstart", (event) => {
          hasDragged = false;
          if (event.touches.length === 2) {
            touchMode = "pinch";
            pinchStartDistance = getTouchDistance(event.touches[0], event.touches[1]);
            pinchStartScale = zoomScale;

            const rect = mapaViewport.getBoundingClientRect();
            pinchCenterX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left - 8;
            pinchCenterY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top - 8;
            return;
          }

          if (event.touches.length === 1) {
            touchMode = "pan";
            startPanX = panX;
            startPanY = panY;
            startTouchX = event.touches[0].clientX;
            startTouchY = event.touches[0].clientY;
          }
        }, { passive: true });

        mapaViewport.addEventListener("touchmove", (event) => {
          if (touchMode === "pinch" && event.touches.length === 2) {
            event.preventDefault();
            const currentDistance = getTouchDistance(event.touches[0], event.touches[1]);
            const ratio = currentDistance / Math.max(pinchStartDistance, 1);
            zoomAround(pinchStartScale * ratio, pinchCenterX, pinchCenterY);
            return;
          }

          if (touchMode === "pan" && event.touches.length === 1) {
            event.preventDefault();
            const dx = event.touches[0].clientX - startTouchX;
            const dy = event.touches[0].clientY - startTouchY;
            if (Math.hypot(dx, dy) > 5) {
              hasDragged = true;
            }
            panX = startPanX + dx;
            panY = startPanY + dy;
            applyMapTransform();
          }
        }, { passive: false });

        mapaViewport.addEventListener("touchend", () => {
          if (touchMode === "pinch") {
            touchMode = "";
            return;
          }
          if (touchMode === "pan") {
            touchMode = "";
          }
        });
      }

      function setupMouseNavigation() {
        let isMouseDown = false;
        let startMouseX = 0;
        let startMouseY = 0;
        let startPanX = 0;
        let startPanY = 0;

        mapaViewport.addEventListener("mousedown", (event) => {
          if (event.button !== 0) return;
          isMouseDown = true;
          hasDragged = false;
          startMouseX = event.clientX;
          startMouseY = event.clientY;
          startPanX = panX;
          startPanY = panY;
          mapaViewport.style.cursor = "grabbing";
          document.body.classList.add("dragging-map");

          function onMouseMove(event) {
            const dx = event.clientX - startMouseX;
            const dy = event.clientY - startMouseY;
            if (Math.hypot(dx, dy) > 5) {
              hasDragged = true;
            }
            panX = startPanX + dx;
            panY = startPanY + dy;
            applyMapTransform();
          }
          function onMouseUp() {
            isMouseDown = false;
            mapaViewport.style.cursor = "grab";
            document.body.classList.remove("dragging-map");
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("selectstart", onSelectStart);
          }
          function onSelectStart(e) {
            e.preventDefault();
          }
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
          window.addEventListener("selectstart", onSelectStart);
        });

        // Rueda / trackpad: panea el mapa (vertical y horizontal). El zoom sigue
        // siendo con los botones o pinch. clampPan (dentro de applyMapTransform)
        // limita el paneo para que se pueda llegar hasta la ultima fila.
        mapaViewport.addEventListener("wheel", (event) => {
          event.preventDefault();
          const factor = event.deltaMode === 1 ? 16 : 1; // lineas vs pixeles
          panY -= event.deltaY * factor;
          panX -= event.deltaX * factor;
          applyMapTransform();
        }, { passive: false });
      }

      function getCookie(name) {
        const cookies = document.cookie ? document.cookie.split(";") : [];
        for (const cookie of cookies) {
          const parts = cookie.trim().split("=");
          if (parts[0] === name) {
            return decodeURIComponent(parts.slice(1).join("="));
          }
        }
        return "";
      }

      function redirectToLogin() {
        window.location.href = `/login/?next=${encodeURIComponent(window.location.pathname)}`;
      }

      function handleAuthError(response) {
        if (response.status === 401) {
          redirectToLogin();
          return true;
        }
        if (response.status === 403) {
          showMessage("Tu usuario no tiene permisos para esta accion.", "error");
          return true;
        }
        return false;
      }

      function showMessage(text, kind = "ok") {
        mensaje.textContent = text;
        mensaje.classList.remove("hidden", "border-red-200", "bg-red-50", "text-red-700", "border-emerald-200", "bg-emerald-50", "text-emerald-700");

        if (kind === "error") {
          mensaje.classList.add("border-red-200", "bg-red-50", "text-red-700");
        } else {
          mensaje.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-700");
        }
      }

      function clearMessage() {
        mensaje.classList.add("hidden");
        mensaje.textContent = "";
      }

      function hideCorralOcupacionAviso() {
        corralOcupacionAviso.classList.add("hidden");
        corralOcupacionAviso.innerHTML = "";
      }

      function pasillosHabilitados() {
        return Boolean(habilitarPasillosInput.checked);
      }

      function getUbicacionesDisponibles() {
        if (pasillosHabilitados()) {
          return [...corralesDisponibles, ...pasillosDisponibles];
        }
        return [...corralesDisponibles];
      }

      function syncUbicacionesDatalist() {
        const options = getUbicacionesDisponibles()
          .map((item) => `<option value="${item}"></option>`)
          .join("");
        ubicacionesDatalist.innerHTML = options;
      }

      function normalizeRemitenteText(value) {
        return (value || "").toString().trim().toLowerCase();
      }

      function syncRemitentesDatalist() {
        const seen = new Set();
        const remitentes = [];

        for (const item of registrosAll) {
          const remitente = (item.remitente || "").toString().trim();
          if (!remitente) continue;

          const key = normalizeRemitenteText(remitente);
          if (seen.has(key)) continue;

          seen.add(key);
          remitentes.push(remitente);
        }

        remitentesDatalist.innerHTML = remitentes.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
      }

      function getMarcasByRemitente(remitenteNormalizado) {
        if (!remitenteNormalizado) return [];

        const seen = new Set();
        const marcas = [];

        for (const item of registrosAll) {
          if (normalizeRemitenteText(item.remitente) !== remitenteNormalizado) continue;

          // support multiple saved images per registro
          const imgs = (item.marcaImagenes && item.marcaImagenes.length) ? item.marcaImagenes : (item.marcaImagen ? [item.marcaImagen] : []);
          for (const m of imgs) {
            const marca = (m || "").toString().trim();
            if (!marca || seen.has(marca)) continue;
            seen.add(marca);
            marcas.push(marca);
          }
        }

        return marcas;
      }

      function hideRemitenteMarcas() {
        remitenteMarcasActuales = [];
        remitenteMarcasGrid.innerHTML = "";
        remitenteMarcasWrap.classList.add("hidden");
      }

      function renderRemitenteMarcas(remitenteNormalizado) {
        if (!remitenteNormalizado) {
          hideRemitenteMarcas();
          return;
        }

        const marcas = getMarcasByRemitente(remitenteNormalizado);
        remitenteMarcasActuales = marcas;
        if (!marcas.length) {
          hideRemitenteMarcas();
          return;
        }

        remitenteMarcasGrid.innerHTML = marcas
          .map((marca, index) => {
            const isSelected = Array.isArray(imagenBase64Actual)
              ? imagenBase64Actual.includes(marca)
              : imagenBase64Actual === marca;
            const selectedClass = isSelected ? "ring-2 ring-app-leaf ring-offset-1" : "ring-1 ring-app-ink/20";
            return `
              <button
                type="button"
                class="zoomable-photo group rounded-md bg-white p-1 ${selectedClass}"
                data-image-open="remitente"
                data-remitente-marca-index="${index}"
                title="Usar marca ${index + 1}"
              >
                <img src="${escapeHtml(marca)}" alt="Marca ${index + 1}" class="h-14 w-full cursor-pointer rounded object-cover" />
              </button>
            `;
          })
          .join("");

        remitenteMarcasWrap.classList.remove("hidden");
      }

      function tryAutofillMarcaByRemitente() {
        const remitente = normalizeRemitenteText(remitenteInput.value);
        if (!remitente) {
          hideRemitenteMarcas();
          return;
        }

        const marcas = getMarcasByRemitente(remitente);
        renderRemitenteMarcas(remitente);
        if (!marcas.length) return;

        // If any of the autofill marcas is already selected, keep current selection.
        const alreadySelected = Array.isArray(imagenBase64Actual)
          ? imagenBase64Actual.some((m) => marcas.includes(m))
          : imagenBase64Actual && marcas.includes(imagenBase64Actual);
        if (alreadySelected) return;

        // Default to the first marca (store as array for multi-select)
        imagenBase64Actual = [marcas[0]];
        showImagePreview(imagenBase64Actual);
        renderRemitenteMarcas(remitente);
      }

      function renderCorralOcupacionAviso(data) {
        if (!data || !data.ocupado || !Array.isArray(data.registros) || !data.registros.length) {
          hideCorralOcupacionAviso();
          return;
        }

        const rows = data.registros
          .map((item) => {
            const cantidad = emptyText(item.cantidad, "Sin cantidad");
            const categoria = emptyText(item.categoria, "Sin categoria");
            const estado = emptyText(item.estado, "Sin estado");
            const remitente = emptyText(item.remitente, "Sin remitente");
            return `<li><span class="font-bold">${escapeHtml(remitente)}</span>: ${escapeHtml(cantidad)} - ${escapeHtml(categoria)} - estado ${escapeHtml(estado)}</li>`;
          })
          .join("");

        corralOcupacionAviso.innerHTML = `
          <p class="font-extrabold">Atencion: corral ${escapeHtml(data.corral)} ocupado.</p>
          <ul class="mt-1 list-disc pl-4">${rows}</ul>
        `;
        corralOcupacionAviso.classList.remove("hidden");
      }

      function hideModalCorralOcupacionAviso() {
        modalCorralOcupacionAviso.classList.add("hidden");
        modalCorralOcupacionAviso.innerHTML = "";
      }

      function renderModalCorralOcupacionAviso(data) {
        if (!data || !data.ocupado || !Array.isArray(data.registros) || !data.registros.length) {
          hideModalCorralOcupacionAviso();
          return;
        }

        const rows = data.registros
          .map((item) => {
            const cantidad = emptyText(item.cantidad, "Sin cantidad");
            const categoria = emptyText(item.categoria, "Sin categoria");
            const estado = emptyText(item.estado, "Sin estado");
            const remitente = emptyText(item.remitente, "Sin remitente");
            return `<li><span class="font-bold">${escapeHtml(remitente)}</span>: ${escapeHtml(cantidad)} - ${escapeHtml(categoria)} - estado ${escapeHtml(estado)}</li>`;
          })
          .join("");

        modalCorralOcupacionAviso.innerHTML = `
          <p class="font-extrabold">Atencion: corral ${escapeHtml(data.corral)} ocupado.</p>
          <ul class="mt-1 list-disc pl-4">${rows}</ul>
        `;
        modalCorralOcupacionAviso.classList.remove("hidden");
      }

      async function checkCorralOcupacion() {
        const corral = corralInput.value.trim();
        const currentId = registroIdInput.value.trim();

        ocupacionCorralActual = null;
        if (!corral) {
          hideCorralOcupacionAviso();
          return null;
        }

        const excludePart = currentId ? `?exclude_id=${encodeURIComponent(currentId)}` : "";
        const separator = excludePart ? "&" : "?";
        const response = await fetch(`/api/corrales/${encodeURIComponent(corral)}/ocupacion/${excludePart}${separator}remate_id=${REMATE_ID}`);
        if (handleAuthError(response)) return null;

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          hideCorralOcupacionAviso();
          return null;
        }

        ocupacionCorralActual = body.data || null;
        renderCorralOcupacionAviso(ocupacionCorralActual);
        return ocupacionCorralActual;
      }

      async function checkModalCorralOcupacion() {
        const corral = modalCorral.value.trim();
        const currentId = editarLoteId.value.trim();

        ocupacionModalCorralActual = null;
        if (!corral) {
          hideModalCorralOcupacionAviso();
          return null;
        }

        const excludePart = currentId ? `?exclude_id=${encodeURIComponent(currentId)}` : "";
        const separator = excludePart ? "&" : "?";
        const response = await fetch(`/api/corrales/${encodeURIComponent(corral)}/ocupacion/${excludePart}${separator}remate_id=${REMATE_ID}`);
        if (handleAuthError(response)) return null;

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          hideModalCorralOcupacionAviso();
          return null;
        }

        ocupacionModalCorralActual = body.data || null;
        renderModalCorralOcupacionAviso(ocupacionModalCorralActual);
        return ocupacionModalCorralActual;
      }

      function emptyText(value, fallback = "Sin dato") {
        const cleaned = (value || "").toString().trim();
        return cleaned || fallback;
      }

      function getCorralSortKey(value) {
        const cleaned = (value || "").toString().trim();
        if (!cleaned) {
          return { rank: 0, number: Number.NEGATIVE_INFINITY, text: "" };
        }

        const numberMatch = cleaned.match(/\d+/);
        if (numberMatch) {
          return { rank: 1, number: Number(numberMatch[0]), text: cleaned.toLowerCase() };
        }

        return { rank: 2, number: Number.POSITIVE_INFINITY, text: cleaned.toLowerCase() };
      }

      function sortRegistrosByCorral(list, descending = false) {
        return [...list].sort((a, b) => {
          const corralA = getCorralSortKey(a.corral);
          const corralB = getCorralSortKey(b.corral);

          if (corralA.rank !== corralB.rank) {
            return corralA.rank - corralB.rank;
          }

          if (corralA.rank === 1 && corralA.number !== corralB.number) {
            return descending ? corralB.number - corralA.number : corralA.number - corralB.number;
          }

          return descending
            ? corralB.text.localeCompare(corralA.text, "es", { sensitivity: "base", numeric: true })
            : corralA.text.localeCompare(corralB.text, "es", { sensitivity: "base", numeric: true });
        });
      }

      function getIngresoSortValue(registro) {
        const raw = registro.createdAt || registro.updatedAt || "";
        const parsed = Date.parse(raw);
        return Number.isFinite(parsed) ? parsed : 0;
      }

      function normalizeEstadoKey(value) {
        return (value || "")
          .toString()
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      }

      function parseEstadoValue(rawEstado) {
        if (Array.isArray(rawEstado)) {
          return rawEstado.map((item) => (item || "").toString().trim()).filter(Boolean);
        }
        return (rawEstado || "")
          .toString()
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      function getEstadoSelection(container) {
        const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
        return selected.join(", ");
      }

      function setEstadoSelection(container, rawEstado) {
        const selectedKeys = new Set(parseEstadoValue(rawEstado).map(normalizeEstadoKey));
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
          checkbox.checked = selectedKeys.has(normalizeEstadoKey(checkbox.value));
        });
      }

      function getLotesLabel(count) {
        return count === 1 ? "1 lote" : `${count} lotes`;
      }

      async function fileToOptimizedImageData(file) {
        const image = await new Promise((resolve, reject) => {
          const objectUrl = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("No se pudo leer la imagen."));
          };
          img.src = objectUrl;
        });

        const width = image.naturalWidth || image.width || 1200;
        const height = image.naturalHeight || image.height || 1200;

        // 1. Generate optimized full image (max size 1200, quality 0.8)
        const maxSizeFull = 1200;
        const scaleFull = Math.min(1, maxSizeFull / Math.max(width, height));
        const targetWFull = Math.max(1, Math.round(width * scaleFull));
        const targetHFull = Math.max(1, Math.round(height * scaleFull));

        const canvasFull = document.createElement("canvas");
        canvasFull.width = targetWFull;
        canvasFull.height = targetHFull;
        const ctxFull = canvasFull.getContext("2d");
        if (!ctxFull) throw new Error("No se pudo preparar la imagen.");
        ctxFull.drawImage(image, 0, 0, targetWFull, targetHFull);
        let fullDataUrl = canvasFull.toDataURL("image/webp", 0.8);
        if (!fullDataUrl.startsWith("data:image/webp")) {
          fullDataUrl = canvasFull.toDataURL("image/jpeg", 0.8);
        }

        // 2. Generate thumbnail image (max size 260, quality 0.7)
        const maxSizeThumb = 260;
        const scaleThumb = Math.min(1, maxSizeThumb / Math.max(width, height));
        const targetWThumb = Math.max(1, Math.round(width * scaleThumb));
        const targetHThumb = Math.max(1, Math.round(height * scaleThumb));

        const canvasThumb = document.createElement("canvas");
        canvasThumb.width = targetWThumb;
        canvasThumb.height = targetHThumb;
        const ctxThumb = canvasThumb.getContext("2d");
        if (!ctxThumb) throw new Error("No se pudo preparar la miniatura.");
        ctxThumb.drawImage(image, 0, 0, targetWThumb, targetHThumb);
        let thumbDataUrl = canvasThumb.toDataURL("image/webp", 0.7);
        if (!thumbDataUrl.startsWith("data:image/webp")) {
          thumbDataUrl = canvasThumb.toDataURL("image/jpeg", 0.7);
        }

        return {
          full: fullDataUrl,
          thumb: thumbDataUrl
        };
      }

      function setCameraCaptureReady(ready, statusText = "") {
        tomarFotoBtn.disabled = !ready;
        tomarFotoBtn.classList.toggle("opacity-60", !ready);
        tomarFotoBtn.classList.toggle("cursor-not-allowed", !ready);
        if (statusText) {
          cameraStatus.textContent = statusText;
        }
      }

      async function getCameraCaptureBlob() {
        if (cameraTrack && "ImageCapture" in window) {
          try {
            const imageCapture = new ImageCapture(cameraTrack);
            const blob = await imageCapture.takePhoto();
            if (blob) {
              return blob;
            }
          } catch {
            // Si no soporta captura nativa, se usa fallback con canvas.
          }
        }

        if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) {
          return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = cameraVideo.videoWidth;
        canvas.height = cameraVideo.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return null;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
        return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
      }

      function openNativeCameraInput(target, registroId = null) {
        if (target === "quick") {
          pendingMarcaRegistroId = registroId;
          marcaRapidaInput.value = "";
          marcaRapidaInput.click();
          return;
        }

        marcaInput.value = "";
        marcaInput.click();
      }

      function shouldUseNativeCameraOnThisDevice() {
        const ua = navigator.userAgent || "";
        const uaDataBrands = navigator.userAgentData && Array.isArray(navigator.userAgentData.brands)
          ? navigator.userAgentData.brands.map((item) => item.brand).join(" ")
          : "";
        const haystack = `${ua} ${uaDataBrands}`.toLowerCase();
        // Prefer the in-browser camera (mediaDevices) when available because
        // it allows taking multiple photos in a session. Fall back to the
        // native camera picker only when getUserMedia is not available.
        const isAndroid = haystack.includes("android");
        const supportsMediaDevices = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        return isAndroid && !supportsMediaDevices;
      }

      async function openCameraCapture(target, registroId = null) {
        cameraTarget = target;
        cameraRegistroId = registroId;

        if (shouldUseNativeCameraOnThisDevice()) {
          openNativeCameraInput(target, registroId);
          return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showMessage("Este dispositivo no permite abrir la camara desde el navegador.", "error");
          openNativeCameraInput(target, registroId);
          return;
        }

        try {
          setCameraCaptureReady(false, "Ajustando enfoque...");
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });

          const tracks = cameraStream.getVideoTracks();
          cameraTrack = tracks.length ? tracks[0] : null;

          if (cameraTrack && cameraTrack.applyConstraints) {
            try {
              await cameraTrack.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
            } catch {
              // Algunos navegadores no soportan focusMode.
            }
          }

          cameraVideo.srcObject = cameraStream;
          await cameraVideo.play().catch(() => {});

          cameraCaptureReadyAt = Date.now() + 450;
          setTimeout(() => {
            setCameraCaptureReady(true, "Acerca y mantén estable para mejor nitidez.");
          }, 450);

          cameraModal.classList.remove("hidden");
          cameraModal.classList.add("flex");
        } catch {
          showMessage("No se pudo abrir la camara. Revisa permisos o usa archivo.", "error");
          openNativeCameraInput(target, registroId);
        }
      }

      function closeCameraCapture() {
        cameraModal.classList.add("hidden");
        cameraModal.classList.remove("flex");
        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop());
          cameraStream = null;
        }
        cameraTrack = null;
        cameraCaptureReadyAt = 0;
        cameraVideo.srcObject = null;
        setCameraCaptureReady(true, "Ajustando enfoque...");
      }

      async function takePhotoFromCamera() {
        if (Date.now() < cameraCaptureReadyAt) {
          showMessage("Espera un instante para que la camara termine de enfocar.", "error");
          return;
        }

        if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) {
          showMessage("La camara aun no esta lista. Intenta de nuevo.", "error");
          return;
        }

        const blob = await getCameraCaptureBlob();
        if (!blob) {
          showMessage("No se pudo capturar la foto.", "error");
          return;
        }

        const extension = (blob.type || "image/webp").includes("jpeg") ? "jpg" : "webp";
        const capturedFile = new File([blob], `captura.${extension}`, { type: blob.type || "image/webp" });

        try {
          const optimizedDataUrl = await fileToOptimizedImageData(capturedFile);
          if (cameraTarget === "quick" && cameraRegistroId) {
            const registroId = cameraRegistroId;
            closeCameraCapture();
            cameraRegistroId = null;
            await actualizarMarcaRegistro(registroId, optimizedDataUrl);
            return;
          }

          // append captured photo to current images array (keep compatibility)
          if (!Array.isArray(imagenBase64Actual)) imagenBase64Actual = imagenBase64Actual ? [imagenBase64Actual] : [];
          if (imagenBase64Actual.length >= MAX_MARCA_IMAGES) {
            showMessage(`Solo se permiten hasta ${MAX_MARCA_IMAGES} fotos.`, "error");
            closeCameraCapture();
            return;
          }
          imagenBase64Actual.push(optimizedDataUrl);
          if (imagenBase64Actual.length > MAX_MARCA_IMAGES) imagenBase64Actual = imagenBase64Actual.slice(0, MAX_MARCA_IMAGES);
          showImagePreview(imagenBase64Actual);
          closeCameraCapture();
        } catch {
          showMessage("No se pudo procesar la foto. Intenta otra vez.", "error");
        }
      }

      function isPasilloValue(value) {
        return (value || "").toString().trim().toUpperCase() === "PASILLO";
      }

      function validatePasilloAllowed(corral, allowPasillo, sourceLabel = "este formulario") {
        if (isPasilloValue(corral) && !allowPasillo) {
          showMessage(`Para usar pasillos debes activar la opcion en Corrales (${sourceLabel}).`, "error");
          return false;
        }
        return true;
      }

      function escapeHtml(value) {
        return (value || "")
          .toString()
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      let lastThumbnailTouchAt = 0;

      function getEventElement(event) {
        return event && event.target && event.target instanceof Element ? event.target : null;
      }

      function handleThumbnailActivation(event, onActivate) {
        const target = getEventElement(event);
        if (!target) return;

        const button = target.closest("button[data-image-open]");
        if (!button) return;

        if (event.type === "touchend") {
          lastThumbnailTouchAt = Date.now();
          event.preventDefault();
          event.stopPropagation();
        } else if (event.type === "click" && Date.now() - lastThumbnailTouchAt < 700) {
          return;
        }

        const result = onActivate(button);
        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
      }

      function showImagePreview(base64OrArray) {
        let arr = [];
        if (!base64OrArray) arr = [];
        else if (Array.isArray(base64OrArray)) arr = base64OrArray.filter(Boolean);
        else arr = [base64OrArray];

        // respect max limit
        arr = arr.slice(0, MAX_MARCA_IMAGES);

        if (!arr.length) {
          previewWrap.classList.add("hidden");
          previewWrap.classList.remove("flex");
          previewGrid.innerHTML = "";
          return;
        }

        previewGrid.innerHTML = "";
        for (const item of arr) {
          const img = document.createElement("img");
          const src = (typeof item === "object" && item !== null) ? (item.thumb || item.full) : item;
          img.src = src;
          img.alt = "Vista previa";
          img.className = "zoomable-photo h-14 w-14 cursor-zoom-in rounded-md object-cover";
          previewGrid.appendChild(img);
        }

        previewWrap.classList.remove("hidden");
        previewWrap.classList.add("flex");
      }

      function applyImageZoomTransform() {
        imageZoomScale = Math.min(5, Math.max(1, imageZoomScale));
        if (imageZoomScale === 1) {
          imagePanX = 0;
          imagePanY = 0;
          if (imageViewerContent) {
            imageViewerContent.style.cursor = "grab";
          }
        } else {
          if (imageViewerContent) {
            imageViewerContent.style.cursor = "grabbing";
          }
        }
        imageViewerImg.style.transform = `translate(${imagePanX}px, ${imagePanY}px) scale(${imageZoomScale})`;
      }

      function zoomImage(factor) {
        imageZoomScale *= factor;
        applyImageZoomTransform();
      }

      function resetImageZoom() {
        imageZoomScale = 1;
        imagePanX = 0;
        imagePanY = 0;
        applyImageZoomTransform();
      }

      function openImageViewer(src) {
        if (!src) return;
        imageViewerImg.src = src;
        imageZoomScale = 1;
        imagePanX = 0;
        imagePanY = 0;
        applyImageZoomTransform();
        imageViewerModal.classList.remove("hidden");
        imageViewerModal.classList.add("flex");
      }

      async function getRegistroDetailCached(registroId) {
        const key = String(registroId);
        if (registroDetailCache.has(key)) {
          return registroDetailCache.get(key);
        }

        const response = await fetch(`/api/registros/${encodeURIComponent(key)}/`);
        if (handleAuthError(response)) return null;

        const body = await response.json().catch(() => ({}));
        const data = body.data || null;
        if (data) {
          registroDetailCache.set(key, data);
        }
        return data;
      }

      async function openRegistroImageViewer(registroId, imageIndex = 0) {
        const registro = await getRegistroDetailCached(registroId);
        if (!registro) return;

        const fulls = Array.isArray(registro.marcaImagenesFull) && registro.marcaImagenesFull.length
          ? registro.marcaImagenesFull
          : (registro.marcaImagenes || []);
        const src = fulls[imageIndex] || fulls[0] || registro.marcaImagen || "";
        openImageViewer(src);
      }

      function closeImageViewer() {
        imageViewerModal.classList.add("hidden");
        imageViewerModal.classList.remove("flex");
        imageViewerImg.src = "";
        resetImageZoom();
      }

      function invalidateRegistroDetailCache(registroId = null) {
        if (!registroId) {
          registroDetailCache.clear();
          return;
        }
        registroDetailCache.delete(String(registroId));
      }

      function openDeleteConfirmModal(message, title = "Confirmar eliminacion") {
        if (pendingDeleteConfirmResolve) {
          pendingDeleteConfirmResolve(false);
          pendingDeleteConfirmResolve = null;
        }

        deleteConfirmTitle.textContent = title;
        deleteConfirmMessage.textContent = message;
        deleteConfirmModal.classList.remove("hidden");
        deleteConfirmModal.classList.add("flex");

        return new Promise((resolve) => {
          pendingDeleteConfirmResolve = resolve;
        });
      }

      function closeDeleteConfirmModal(confirmed) {
        deleteConfirmModal.classList.add("hidden");
        deleteConfirmModal.classList.remove("flex");

        if (pendingDeleteConfirmResolve) {
          const resolve = pendingDeleteConfirmResolve;
          pendingDeleteConfirmResolve = null;
          resolve(Boolean(confirmed));
        }
      }

      function resetFormState() {
        form.reset();
        registroIdInput.value = "";
        imagenBase64Actual = "";
        hideRemitenteMarcas();
        ocupacionCorralActual = null;
        hideCorralOcupacionAviso();
        showImagePreview("");
        guardarBtn.textContent = "Guardar Registro";
        cancelarEdicionBtn.classList.add("hidden");
        document.getElementById("categoria").dispatchEvent(new Event("change"));
      }

      function setGuardarLoading(loading) {
        isSavingRegistro = loading;
        guardarBtn.disabled = loading;
        guardarBtn.classList.toggle("opacity-70", loading);
        guardarBtn.classList.toggle("cursor-not-allowed", loading);

        if (loading) {
          guardarBtn.innerHTML = `
            <span class="inline-flex items-center justify-center gap-2">
              <svg class="app-spinner h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.35" stroke-width="3"></circle>
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
              </svg>
              Guardando...
            </span>
          `;
          return;
        }

        guardarBtn.textContent = registroIdInput.value ? "Guardar Cambios" : "Guardar Registro";
      }

      function openEditarLoteModal(registro) {
        editarLoteId.value = registro.id;
        modalCorral.value = registro.corral || "";
        modalRemitente.value = registro.remitente || "";
        modalCategoria.value = registro.categoria || "";
        modalCategoria.dispatchEvent(new Event("change"));
        modalCantidad.value = registro.cantidad || "";
        setEstadoSelection(modalEstadoOptions, registro.estado || "");
        modalObservaciones.value = registro.observaciones || "";
        const modalRpInput = document.getElementById("modalRp");
        if (modalRpInput) {
          modalRpInput.value = registro.rp || "";
        }
        ocupacionModalCorralActual = null;
        hideModalCorralOcupacionAviso();

        // Force centered modal even if an old cached class list still has items-end.
        editarLoteModal.classList.remove("items-end");
        editarLoteModal.classList.add("items-center", "justify-center");
        editarLoteModal.classList.remove("hidden");
        editarLoteModal.classList.add("flex");
        checkModalCorralOcupacion();
      }

      function closeEditarLoteModal() {
        editarLoteModal.classList.add("hidden");
        editarLoteModal.classList.remove("flex");
        editarLoteForm.reset();
        modalCategoria.dispatchEvent(new Event("change"));
        editarLoteId.value = "";
        ocupacionModalCorralActual = null;
        hideModalCorralOcupacionAviso();
      }

      function setEditState(registro) {
        registroIdInput.value = registro.id;
        document.getElementById("corral").value = registro.corral || "";
        if (isPasilloValue(registro.corral)) {
          habilitarPasillosInput.checked = true;
          syncUbicacionesDatalist();
        }
        document.getElementById("remitente").value = registro.remitente || "";
        document.getElementById("categoria").value = registro.categoria || "";
        document.getElementById("categoria").dispatchEvent(new Event("change"));
        document.getElementById("cantidad").value = registro.cantidad || "";
        setEstadoSelection(estadoOptions, registro.estado || "");
        document.getElementById("observaciones").value = registro.observaciones || "";
        const rpInput = document.getElementById("rp");
        if (rpInput) {
          rpInput.value = registro.rp || "";
        }

        imagenBase64Actual = (registro.marcaImagenes && registro.marcaImagenes.length) ? registro.marcaImagenes : (registro.marcaImagen ? [registro.marcaImagen] : []);
        showImagePreview(imagenBase64Actual);
        renderRemitenteMarcas(normalizeRemitenteText(registro.remitente));
        marcaInput.value = "";

        guardarBtn.textContent = "Guardar Cambios";
        cancelarEdicionBtn.classList.remove("hidden");
        setSection("registros");
        window.scrollTo({ top: 0, behavior: "smooth" });
        checkCorralOcupacion();
      }

      function setSection(section) {
        currentSection = section;
        const isRegistros = section === "registros";
        if (desktopViewEnabled) {
          registrosSection.classList.remove("hidden");
          corralesSection.classList.remove("hidden");
        } else {
          registrosSection.classList.toggle("hidden", !isRegistros);
          corralesSection.classList.toggle("hidden", isRegistros);
          window.scrollTo(0, 0);
        }

        const activeClass = "rounded-xl bg-app-leaf px-3 py-2.5 text-sm font-extrabold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-transparent";
        const inactiveClass = "rounded-xl border border-app-leaf/50 bg-white/95 px-3 py-2.5 text-sm font-extrabold text-app-ink transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]";

        navRegistros.className = isRegistros ? activeClass : inactiveClass;
        navCorrales.className = !isRegistros ? activeClass : inactiveClass;

        if (desktopViewEnabled) {
          const targetSection = section === "corrales" ? corralesSection : registrosSection;
          targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      function applyDesktopView(enabled) {
        desktopViewEnabled = enabled;
        localStorage.setItem("planillaDesktopView", enabled ? "1" : "0");
        workspaceShell.classList.toggle("desktop-view", enabled);
        appMain.classList.toggle("desktop-view", enabled);
        workspaceShell.classList.toggle("es-invitado", !ES_OPERADOR);
        appMain.classList.toggle("es-invitado", !ES_OPERADOR);
        document.body.classList.toggle("desktop-body", enabled);
        const viewModeLabel = document.getElementById("viewModeLabel");
        if (viewModeLabel) {
          viewModeLabel.textContent = enabled ? "Modo escritorio" : "Modo móvil";
        }
        appMain.classList.toggle("max-w-md", !enabled);
        appMain.classList.toggle("sm:max-w-xl", !enabled);
        appMain.classList.toggle("max-w-7xl", enabled);
        appMain.classList.toggle("sm:max-w-7xl", enabled);
        if (toggleDesktopViewBtn) {
          toggleDesktopViewBtn.title = enabled ? "Modo móvil" : "Modo escritorio";
          const toggleSpan = toggleDesktopViewBtn.querySelector("span");
          if (toggleSpan) {
            toggleSpan.textContent = enabled ? "Modo móvil" : "Modo escritorio";
          }
        }
        setSection(currentSection);
        // Re-fit the map after layout reflow so pan/zoom match the new viewport size
        setTimeout(() => { fitMapToViewport(); }, 80);
      }

      async function fetchRegistrosFiltered() {
        const rawQuery = buscadorGeneral.value.trim();
        if (!rawQuery) {
          ultimoQueryProcesado = "";
          registros = Array.isArray(registrosAll) ? registrosAll.slice() : [];
          renderCards();
          return;
        }

        if (rawQuery === ultimoQueryProcesado) {
          return;
        }

        ultimoQueryProcesado = rawQuery;

        const q = encodeURIComponent(rawQuery);
        const response = await fetch(`/api/registros/?q=${q}&remate_id=${REMATE_ID}`);
        if (handleAuthError(response)) return;
        const body = await response.json();
        registros = body.data || [];
        renderCards();
      }

      async function fetchRegistrosAll() {
        const response = await fetch(`/api/registros/?remate_id=${REMATE_ID}`);
        if (handleAuthError(response)) return;
        const body = await response.json();
        registrosAll = body.data || [];
        syncRemitentesDatalist();
        renderRemitenteMarcas(normalizeRemitenteText(remitenteInput.value));
      }

      async function fetchCorralesMapa() {
        if (corralesMapaLoaded) {
          return;
        }

        const response = await fetch(`/api/corrales/mapa/?remate_id=${REMATE_ID}`);
        if (handleAuthError(response)) return;
        const body = await response.json();
        corralesMapa = body.data;
        corralesDisponibles = corralesMapa.corrales || [];
        pasillosDisponibles = corralesMapa.pasillos || [];
        syncUbicacionesDatalist();
        renderMapaCorrales(true);
        corralesMapaLoaded = true;
      }

      const OFFLINE_SENTINEL = { __offline: true };

      async function fetchRegistrosSyncMeta() {
        try {
          const response = await fetch(`/api/registros/ultimos-cambios/?remate_id=${REMATE_ID}`);
          if (handleAuthError(response)) return null;
          const body = await response.json().catch(() => ({}));
          return body.data || null;
        } catch (e) {
          return OFFLINE_SENTINEL;
        }
      }

      async function refreshAllData() {
        const meta = await fetchRegistrosSyncMeta();

        if (meta === OFFLINE_SENTINEL) {
          // Recarga offline: el SW puede servir /api/registros/ desde caché aunque
          // ultimos-cambios (no cacheable) haya fallado. Intentar leer la lista igual.
          const yaHabiaDatos = (registrosAll && registrosAll.length) || (registros && registros.length);
          if (!yaHabiaDatos) {
            try {
              await fetchRegistrosAll();
              registros = Array.isArray(registrosAll) ? registrosAll.slice() : [];
              renderCards();
              if (!corralesMapaLoaded) {
                await fetchCorralesMapa();
              }
            } catch (e) {
              // sin caché disponible tampoco; seguimos al aviso
            }
          }
          showMessage("Sin conexión — mostrando datos guardados.", "error");
          return;
        }

        const signature = meta && meta.signature ? meta.signature : "";
        const hasDataLoaded = (registrosAll && registrosAll.length) || (registros && registros.length);
        const unchanged = Boolean(signature) && signature === lastRegistrosSyncSignature && hasDataLoaded;

        if (unchanged) {
          if (selectedCorral) {
            renderCorralDetalle(selectedCorral);
          }
          updateTotalCabesasCorreales();
          return;
        }

        invalidateRegistroDetailCache();
        const query = buscadorGeneral.value.trim();

        if (query) {
          await Promise.all([fetchRegistrosFiltered(), fetchRegistrosAll()]);
        } else {
          await fetchRegistrosAll();
          registros = Array.isArray(registrosAll) ? registrosAll.slice() : [];
          renderCards();
        }

        if (!corralesMapaLoaded) {
          await fetchCorralesMapa();
        }

        lastRegistrosSyncSignature = signature || lastRegistrosSyncSignature;
        if (lastRegistrosSyncSignature) {
          sessionStorage.setItem("registrosSyncSignature", lastRegistrosSyncSignature);
        }
        if (selectedCorral) {
          renderCorralDetalle(selectedCorral);
        }
        updateTotalCabesasCorreales();
      }

      function updateTotalCabesasCorreales() {
        const total = (registrosAll || []).reduce((sum, item) => sum + (parseInt(item.cantidad) || 0), 0);
        document.getElementById("totalCabesasCorreales").textContent = total;
      }

      function renderCards() {
        const orden = ordenRegistros ? ordenRegistros.value : "reciente";
        let filtered = [...registros];

        // Filtrar automaticamente por corral seleccionado si esta activo
        if (selectedCorral) {
          filtered = filtered.filter((item) => (item.corral || "").toString().trim().toUpperCase() === selectedCorral.toUpperCase());
        }

        const registrosOrdenados = filtered;

        if (orden === "corral_asc") {
          registrosOrdenados.splice(0, registrosOrdenados.length, ...sortRegistrosByCorral(registrosOrdenados));
        } else if (orden === "reciente") {
          registrosOrdenados.sort((a, b) => getIngresoSortValue(b) - getIngresoSortValue(a));
        } else if (orden === "corral_desc") {
          registrosOrdenados.splice(0, registrosOrdenados.length, ...sortRegistrosByCorral(registrosOrdenados, true));
        } else if (orden === "cantidad_desc") {
          registrosOrdenados.sort((a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0));
        } else if (orden === "cantidad_asc") {
          registrosOrdenados.sort((a, b) => Number(a.cantidad || 0) - Number(b.cantidad || 0));
        } else if (orden === "alfabetico") {
          registrosOrdenados.sort((a, b) => {
            const textA = `${emptyText(a.remitente, "")} ${emptyText(a.corral, "")}`.trim();
            const textB = `${emptyText(b.remitente, "")} ${emptyText(b.corral, "")}`.trim();
            return textA.localeCompare(textB, "es", { sensitivity: "base" });
          });
        }

        // Calcular total de cantidad
        const total = registrosOrdenados.reduce((sum, item) => sum + (parseInt(item.cantidad) || 0), 0);
        document.getElementById("totalCantidad").textContent = total;

        if (!registrosOrdenados.length) {
          cardsContainer.innerHTML = `
            <article class="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
              <svg class="mx-auto h-8 w-8 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p class="text-xs font-bold text-slate-400">No hay registros para mostrar.</p>
            </article>
          `;
          aplicarModoFinalizado();
          return;
        }

        cardsContainer.innerHTML = registrosOrdenados
          .map(
            (item) => `
              <article class="rounded-md border border-app-leaf/35 bg-white/98 p-4 text-center shadow-sm flex flex-col justify-between">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[.16em] text-app-ink/70">Corral</p>
                  <h3 class="mt-1 text-5xl font-extrabold leading-none text-app-ink">${escapeHtml(emptyText(item.corral, "-"))}</h3>

                  <div class="mt-4 space-y-2 border-t border-app-leaf/20 pt-3">
                    <div>
                      <p class="text-sm font-extrabold uppercase tracking-[.12em] text-app-ink/70">Categoría</p>
                      <p class="mt-1 text-base font-bold text-app-ink">${escapeHtml(emptyText(item.categoria, "Sin categoría"))}</p>
                    </div>
                    ${REMATE_HABILITAR_RP ? `
                    <div>
                      <p class="text-sm font-extrabold uppercase tracking-[.12em] text-app-ink/70">RP</p>
                      <p class="mt-1 text-base font-bold text-app-ink">${escapeHtml(emptyText(item.rp, "-"))}</p>
                    </div>
                    ` : ""}
                    
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <p class="text-sm font-extrabold uppercase tracking-[.12em] text-app-ink/70">Cantidad</p>
                        <p class="mt-1 text-base font-semibold text-app-ink">${item.cantidad !== null ? item.cantidad : "-"}</p>
                      </div>
                      <div>
                        <p class="text-sm font-extrabold uppercase tracking-[.12em] text-app-ink/70">Estado</p>
                        <p class="mt-1 text-base font-semibold text-app-ink">${escapeHtml(emptyText(item.estado, "Sin estado"))}</p>
                      </div>
                    </div>
                  </div>

                  <div class="mt-3 border-t border-app-leaf/20 pt-3">
                    <p class="text-lg font-bold text-app-ink">${escapeHtml(emptyText(item.remitente, "Sin remitente"))}</p>
                    <p class="mt-1 text-sm font-semibold text-app-ink/65">${escapeHtml(emptyText(item.observaciones, "Sin observaciones"))}</p>
                  </div>
                </div>

                <div>
                ${(() => {
                  const imgs = (item.marcaImagenes && item.marcaImagenes.length) ? item.marcaImagenes : (item.marcaImagen ? [item.marcaImagen] : []);
                  if (imgs.length) {
                      const imgsHtml = imgs.map((s, index) => `
                        <button type="button" data-image-open="card" data-registro-id="${item.id}" data-image-index="${index}" class="zoomable-photo shrink-0 rounded-lg border border-transparent p-0 transition-transform active:scale-[0.98]">
                          <img src="${s}" alt="Marca del lote" class="h-14 w-14 cursor-zoom-in rounded-lg object-cover shadow-sm border border-app-leaf/20" />
                        </button>
                      `).join("");
                    return `<div class="mt-3 flex flex-wrap items-center justify-center gap-2 border-t border-app-leaf/10 pt-3">
                              ${imgsHtml}
                              <button type="button" data-action="add-photo" data-id="${item.id}" class="rounded-md border border-app-leaf/55 bg-white px-2.5 py-1 text-[11px] font-extrabold text-app-leaf shadow-sm hover:bg-slate-50 transition-all duration-200">Cambiar foto</button>
                            </div>`;
                  }
                  return `<div class="mt-3 border-t border-app-leaf/10 pt-3 text-center">
                            <p class="text-xs font-semibold text-app-ink/70">Sin foto</p>
                            <button type="button" data-action="add-photo" data-id="${item.id}" class="mt-1.5 rounded-md border border-app-leaf/55 bg-white px-3 py-1.5 text-xs font-extrabold text-app-leaf shadow-sm hover:bg-slate-50 transition-all duration-200">Agregar foto</button>
                          </div>`;
                })()}

                <div class="mt-4 flex items-center gap-2">
                  <button type="button" data-action="edit" data-id="${item.id}" class="flex-1 rounded-md border border-app-leaf/55 bg-white px-3 py-2.5 text-sm font-extrabold text-app-ink shadow-sm hover:bg-slate-50 transition-all duration-200">Editar</button>
                  <button type="button" data-action="delete" data-id="${item.id}" class="flex-1 rounded-md bg-app-clay px-3 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-all duration-200">Eliminar</button>
                </div>
                </div>
              </article>
            `,
          )
          .join("");
        aplicarModoFinalizado();
      }

      function renderMapaCorrales(isFirstRender = false) {
        if (!corralesMapa) return;

        mapaGrid.style.gridTemplateColumns = `repeat(${corralesMapa.cols}, 28px)`;
        mapaGrid.innerHTML = corralesMapa.layout
          .map((cell) => {
            const rowSpan = Number(cell.row_span || 1);
            const colSpan = Number(cell.col_span || 1);
            const style = `grid-row:${cell.row} / span ${rowSpan};grid-column:${cell.col} / span ${colSpan};`;
            if (cell.kind === "corral") {
              const ocupacion = Number(corralesMapa.ocupacion[cell.label] || 0);
              const selected = selectedCorral === cell.label;
              const cls = selected
                ? "mapa-cell bg-sky-900 text-white ring-2 ring-sky-300/80"
                : ocupacion > 0
                  ? "mapa-cell bg-sky-700 text-white"
                  : "mapa-cell bg-sky-300 text-sky-950";
              return `<button type="button" data-map-corral="${cell.label}" data-row="${cell.row}" data-col="${cell.col}" data-row-span="${rowSpan}" data-col-span="${colSpan}" class="${cls}" style="${style}" title="Corral ${cell.label} - ${getLotesLabel(ocupacion)}">${cell.label}</button>`;
            }

            if (cell.kind === "pasillo") {
              const pasilloId = cell.pasillo_id || "PASILLO";
              const ocupacion = Number(corralesMapa.ocupacion[pasilloId] || 0);
              const selected = selectedCorral === pasilloId;

              if (!pasillosHabilitados()) {
                return `<div class="mapa-cell bg-slate-300 text-slate-700" style="${style}" title="${pasilloId}">${cell.display_label || "P"}</div>`;
              }

              const cls = selected
                ? "mapa-cell bg-app-clay text-white ring-2 ring-app-ink/40"
                : ocupacion > 0
                  ? "mapa-cell bg-emerald-600 text-white"
                  : "mapa-cell bg-emerald-300 text-emerald-950";

              return `<button type="button" data-map-corral="${pasilloId}" data-row="${cell.row}" data-col="${cell.col}" data-row-span="${rowSpan}" data-col-span="${colSpan}" class="${cls}" style="${style}" title="${pasilloId} - ${getLotesLabel(ocupacion)}">${cell.display_label || "P"}</button>`;
            }

            if (cell.kind === "toril") {
              const corralId = cell.corral_id || "1";
              const ocupacion = Number(corralesMapa.ocupacion[corralId] || 0);
              const selected = selectedCorral === corralId;
              const cls = selected
                ? "mapa-cell bg-amber-300 text-amber-950 ring-2 ring-app-ink/40"
                : "mapa-cell bg-amber-200 text-amber-900";
              return `<button type="button" data-map-corral="${corralId}" data-row="${cell.row}" data-col="${cell.col}" data-row-span="${rowSpan}" data-col-span="${colSpan}" class="${cls}" style="${style}" title="Corral ${corralId} (TO/Toril) - ${getLotesLabel(ocupacion)}">${cell.display_label || corralId}</button>`;
            }

            return `<div class="mapa-cell bg-amber-200 text-amber-900" style="${style}" title="${cell.label}">${cell.label.slice(0, 2)}</div>`;
          })
          .join("");

        if (isFirstRender) {
          fitMapToViewport();
        } else {
          applyMapTransform();
        }
      }

      function renderCorralDetalle(corral) {
        selectedCorral = corral;
        renderMapaCorrales();

        const lotes = registrosAll.filter((item) => (item.corral || "").toString().trim() === corral);
        corralDetalleTitulo.textContent = corral;
        const selectedCorralSummary = document.getElementById("selectedCorralSummary");
        const selectedCorralCount = document.getElementById("selectedCorralCount");
        
        // Calcular sumatoria total de animales en el corral
        const totalAnimales = lotes.reduce((suma, item) => suma + (item.cantidad || 0), 0);
        const lotesLabel = getLotesLabel(lotes.length);
        corralDetalleSubtitulo.textContent = totalAnimales > 0 
          ? `${lotesLabel} | Total: ${totalAnimales} animales`
          : lotesLabel;
        if (selectedCorralSummary) {
          selectedCorralSummary.textContent = corral;
        }
        if (selectedCorralCount) {
          selectedCorralCount.textContent = lotesLabel;
        }
        
        nuevoEnCorralBtn.classList.remove("hidden");

        // Barra compacta de corral seleccionado (escritorio): identificador + resumen.
        if (desktopCorralNombre) desktopCorralNombre.textContent = corral;
        if (desktopCorralResumen) desktopCorralResumen.textContent = corralDetalleSubtitulo.textContent;
        if (desktopCorralBar) desktopCorralBar.classList.add("is-active");

        if (!desktopViewEnabled) {
          if (!lotes.length) {
            corralDetalleContainer.innerHTML = `
              <article class="rounded-xl border border-dashed border-slate-300 bg-white/80 p-5 text-center shadow-sm">
                <svg class="mx-auto h-7 w-7 text-slate-400 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p class="text-xs font-bold text-slate-400">Este corral no tiene lotes cargados.</p>
              </article>
            `;
          } else {
            corralDetalleContainer.innerHTML = lotes
              .map((item) => {
                const imgs = (item.marcaImagenes && item.marcaImagenes.length) ? item.marcaImagenes : (item.marcaImagen ? [item.marcaImagen] : []);
                let imgHtml = "";
                if (imgs.length) {
                  const imgsHtml = imgs.map((s, index) => `
                    <button type="button" data-image-open="card" data-registro-id="${item.id}" data-image-index="${index}" class="zoomable-photo shrink-0 rounded-lg border border-transparent p-0 transition-transform active:scale-[0.98]">
                      <img src="${s}" alt="Marca del lote" class="h-14 w-14 cursor-zoom-in rounded-lg object-cover shadow-sm border border-app-leaf/20" />
                    </button>
                  `).join("");
                  imgHtml = `<div class="mt-3 flex flex-wrap items-center justify-center gap-2 border-t border-app-leaf/10 pt-3">
                              ${imgsHtml}
                              <button type="button" data-corrales-action="add-photo" data-id="${item.id}" class="rounded-md border border-app-leaf/55 bg-white px-2.5 py-1 text-[11px] font-extrabold text-app-leaf shadow-sm hover:bg-slate-50 transition-all duration-200">Cambiar foto</button>
                            </div>`;
                } else {
                  imgHtml = `<div class="mt-3 border-t border-app-leaf/10 pt-3 text-center">
                            <p class="text-xs font-semibold text-app-ink/70">Sin foto</p>
                            <button type="button" data-corrales-action="add-photo" data-id="${item.id}" class="mt-1.5 rounded-md border border-app-leaf/55 bg-white px-3 py-1.5 text-xs font-extrabold text-app-leaf shadow-sm hover:bg-slate-50 transition-all duration-200">Agregar foto</button>
                          </div>`;
                }

                return `
                  <article class="rounded-md border border-app-leaf/35 bg-white/98 p-4 text-center shadow-sm flex flex-col justify-between">
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-[.16em] text-app-ink/70">Corral</p>
                      <h3 class="mt-1 text-5xl font-extrabold leading-none text-app-ink">${escapeHtml(emptyText(item.corral, "-"))}</h3>

                      <div class="mt-4 space-y-2 border-t border-app-leaf/20 pt-3">
                        <div>
                          <p class="text-sm font-extrabold uppercase tracking-[.12em] text-app-ink/70">Categoría</p>
                          <p class="mt-1 text-base font-bold text-app-ink">${escapeHtml(emptyText(item.categoria, "Sin categoría"))}</p>
                        </div>
                        ${REMATE_HABILITAR_RP ? `
                        <div>
                          <p class="text-sm font-extrabold uppercase tracking-[.12em] text-app-ink/70">RP</p>
                          <p class="mt-1 text-base font-bold text-app-ink">${escapeHtml(emptyText(item.rp, "-"))}</p>
                        </div>
                        ` : ""}
                        
                        <div class="grid grid-cols-2 gap-2">
                          <div>
                            <p class="text-sm font-extrabold uppercase tracking-[.12em] text-app-ink/70">Cantidad</p>
                            <p class="mt-1 text-base font-semibold text-app-ink">${item.cantidad !== null ? item.cantidad : "-"}</p>
                          </div>
                          <div>
                            <p class="text-sm font-extrabold uppercase tracking-[.12em] text-app-ink/70">Estado</p>
                            <p class="mt-1 text-base font-semibold text-app-ink">${escapeHtml(emptyText(item.estado, "Sin estado"))}</p>
                          </div>
                        </div>
                      </div>

                      <div class="mt-3 border-t border-app-leaf/20 pt-3">
                        <p class="text-lg font-bold text-app-ink">${escapeHtml(emptyText(item.remitente, "Sin remitente"))}</p>
                        <p class="mt-1 text-sm font-semibold text-app-ink/65">${escapeHtml(emptyText(item.observaciones, "Sin observaciones"))}</p>
                      </div>
                    </div>

                    <div>
                      ${imgHtml}

                      <div class="mt-4 flex items-center gap-2">
                        <button type="button" data-corrales-action="edit" data-id="${item.id}" class="flex-1 rounded-md border border-app-leaf/55 bg-white px-3 py-2.5 text-sm font-extrabold text-app-ink shadow-sm hover:bg-slate-50 transition-all duration-200">Editar</button>
                        <button type="button" data-corrales-action="delete" data-id="${item.id}" class="flex-1 rounded-md bg-app-clay px-3 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-all duration-200">Eliminar</button>
                      </div>
                    </div>
                  </article>
                `;
              })
              .join("");
          }
        } else {
          corralDetalleContainer.innerHTML = "";
        }
        if (limpiarFiltroCorralBtn) {
          limpiarFiltroCorralBtn.textContent = `Corral ${corral} âœ•`;
          limpiarFiltroCorralBtn.classList.remove("hidden");
        }
        
        // Trigger records list filter update
        renderCards();

        if (!desktopViewEnabled) {
          setTimeout(() => {
            const detailCard = corralDetalleTitulo.closest(".rounded-2xl");
            if (detailCard) {
              detailCard.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 100);
        }
      }

      function deselectCorral() {
        selectedCorral = "";
        renderMapaCorrales();

        corralDetalleTitulo.textContent = "Selecciona un corral";
        corralDetalleSubtitulo.innerHTML = "&nbsp;";
        const selectedCorralSummary = document.getElementById("selectedCorralSummary");
        const selectedCorralCount = document.getElementById("selectedCorralCount");
        if (selectedCorralSummary) {
          selectedCorralSummary.textContent = "-";
        }
        if (selectedCorralCount) {
          selectedCorralCount.textContent = "-";
        }

        nuevoEnCorralBtn.classList.add("hidden");
        if (desktopCorralBar) desktopCorralBar.classList.remove("is-active");
        corralDetalleContainer.innerHTML = "";
        if (limpiarFiltroCorralBtn) {
          limpiarFiltroCorralBtn.classList.add("hidden");
        }

        // Trigger records list filter update
        renderCards();
      }

      async function actualizarMarcaRegistro(registroId, marcaImagen) {
        const registro = registrosAll.find((item) => String(item.id) === String(registroId));
        if (!registro) {
          showMessage("No se encontro el lote para actualizar la foto.", "error");
          return;
        }

        const payload = {
          corral: (registro.corral || "").toString().trim(),
          allowPasillo: pasillosHabilitados() || isPasilloValue(registro.corral),
          remitente: (registro.remitente || "").toString().trim(),
          categoria: (registro.categoria || "").toString().trim(),
          cantidad: registro.cantidad ?? "",
          estado: (registro.estado || "").toString().trim(),
          observaciones: (registro.observaciones || "").toString().trim(),
          rp: (registro.rp || "").toString().trim(),
          marcaImagen,
        };

        let response;
        try {
          response = await fetch(`/api/registros/${registroId}/`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          showMessage("Sin conexión — no se pudo completar la acción.", "error");
          return;
        }

        if (handleAuthError(response)) return;
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          showMessage(body.error || "No se pudo actualizar la foto.", "error");
          return;
        }

        showMessage("Foto actualizada.");
        await refreshAllData();
      }

      marcaInput.addEventListener("change", async (event) => {
        let files = event.target.files ? Array.from(event.target.files) : [];
        if (!files.length) return;

        // Limit incoming files
        if (files.length > MAX_MARCA_IMAGES) {
          showMessage(`Solo se permiten hasta ${MAX_MARCA_IMAGES} fotos. Se tomarán las primeras ${MAX_MARCA_IMAGES}.`, "error");
          files = files.slice(0, MAX_MARCA_IMAGES);
        }

        try {
          const results = await Promise.all(files.map((f) => fileToOptimizedImageData(f)));

          // Append to existing images instead of replacing (fixes Android camera single-file behavior)
          const existing = Array.isArray(imagenBase64Actual) ? imagenBase64Actual.slice() : (imagenBase64Actual ? [imagenBase64Actual] : []);
          let merged = existing.concat(results).filter(Boolean);
          if (merged.length > MAX_MARCA_IMAGES) {
            showMessage(`Solo se permiten hasta ${MAX_MARCA_IMAGES} fotos. Se conservarán las primeras ${MAX_MARCA_IMAGES}.`, "error");
            merged = merged.slice(0, MAX_MARCA_IMAGES);
          }
          imagenBase64Actual = merged;
          showImagePreview(imagenBase64Actual);
        } catch {
          showMessage("No se pudo procesar la foto. Intenta otra vez.", "error");
        }
      });

      quitarImagenBtn.addEventListener("click", () => {
        if (!ES_OPERADOR) {
          showMessage("Acceso denegado. El rol de invitado es de solo lectura.", "error");
          return;
        }
        imagenBase64Actual = [];
        marcaInput.value = "";
        showImagePreview([]);
      });

      previewGrid.addEventListener("click", (event) => {
        handleThumbnailActivation(event, (button) => openImageViewer(button.querySelector("img")?.src || ""));
      });

      previewGrid.addEventListener("touchend", (event) => {
        handleThumbnailActivation(event, (button) => openImageViewer(button.querySelector("img")?.src || ""));
      }, { passive: false });

      previewGrid.addEventListener("pointerup", (event) => {
        handleThumbnailActivation(event, (button) => openImageViewer(button.querySelector("img")?.src || ""));
      });

      cardsContainer.addEventListener("click", async (event) => {
        const image = event.target.closest("button[data-image-open]");
        if (image) {
          handleThumbnailActivation(event, async (thumb) => {
            const registroId = thumb.dataset.registroId;
            const imageIndex = Number(thumb.dataset.imageIndex || 0);
            if (registroId) {
              await openRegistroImageViewer(registroId, imageIndex);
              return;
            }
            openImageViewer(thumb.querySelector("img")?.src || "");
          });
          return;
        }

        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.action;
        const registro = registrosAll.find((item) => String(item.id) === String(id));
        if (!registro) return;

        if (action === "edit") {
          setEditState(registro);
          return;
        }

        if (action === "add-photo") {
          if (!ES_OPERADOR) {
            showMessage("Acceso denegado. El rol de invitado es de solo lectura y no permite subir fotos.", "error");
            return;
          }
          openCameraCapture("quick", id);
          return;
        }

        if (action === "delete") {
          if (!ES_OPERADOR) {
            showMessage("Acceso denegado. El rol de invitado es de solo lectura y no permite eliminar registros.", "error");
            return;
          }
          const ok = await openDeleteConfirmModal("Eliminar este registro?");
          if (!ok) return;

          try {
            const response = await fetch(`/api/registros/${id}/`, {
              method: "DELETE",
              headers: {
                "X-CSRFToken": getCookie("csrftoken"),
              },
            });

            if (handleAuthError(response)) return;
            if (!response.ok) {
              showMessage("No se pudo eliminar el registro.", "error");
              return;
            }

            showMessage("Registro eliminado.");
            if (registroIdInput.value === id) {
              resetFormState();
            }
            invalidateRegistroDetailCache(id);
            await refreshAllData();
          } catch (e) {
            if (e instanceof TypeError) {
              showMessage("Sin conexión. No se pudo eliminar.", "error");
            } else {
              throw e;
            }
          }
        }
      });

      cardsContainer.addEventListener("touchend", (event) => {
        handleThumbnailActivation(event, async (thumb) => {
          const registroId = thumb.dataset.registroId;
          const imageIndex = Number(thumb.dataset.imageIndex || 0);
          if (registroId) {
            await openRegistroImageViewer(registroId, imageIndex);
            return;
          }
          openImageViewer(thumb.querySelector("img")?.src || "");
        });
      }, { passive: false });

      cardsContainer.addEventListener("pointerup", (event) => {
        handleThumbnailActivation(event, async (thumb) => {
          const registroId = thumb.dataset.registroId;
          const imageIndex = Number(thumb.dataset.imageIndex || 0);
          if (registroId) {
            await openRegistroImageViewer(registroId, imageIndex);
            return;
          }
          openImageViewer(thumb.querySelector("img")?.src || "");
        });
      });

      corralDetalleContainer.addEventListener("click", async (event) => {
        handleThumbnailActivation(event, async (image) => {
          const registroId = image.dataset.registroId;
          const imageIndex = Number(image.dataset.imageIndex || 0);
          if (registroId) {
            await openRegistroImageViewer(registroId, imageIndex);
            return;
          }
          openImageViewer(image.querySelector("img")?.src || "");
        });
      });

      corralDetalleContainer.addEventListener("touchend", (event) => {
        handleThumbnailActivation(event, async (image) => {
          const registroId = image.dataset.registroId;
          const imageIndex = Number(image.dataset.imageIndex || 0);
          if (registroId) {
            await openRegistroImageViewer(registroId, imageIndex);
            return;
          }
          openImageViewer(image.querySelector("img")?.src || "");
        });
      }, { passive: false });

      corralDetalleContainer.addEventListener("pointerup", (event) => {
        handleThumbnailActivation(event, async (image) => {
          const registroId = image.dataset.registroId;
          const imageIndex = Number(image.dataset.imageIndex || 0);
          if (registroId) {
            await openRegistroImageViewer(registroId, imageIndex);
            return;
          }
          openImageViewer(image.querySelector("img")?.src || "");
        });
      });

      cerrarImageViewerBtn.addEventListener("click", () => {
        closeImageViewer();
      });

      imageViewerModal.addEventListener("click", (event) => {
        if (event.target === imageViewerModal) {
          closeImageViewer();
        }
      });

      cancelDeleteBtn.addEventListener("click", () => {
        closeDeleteConfirmModal(false);
      });

      confirmDeleteBtn.addEventListener("click", () => {
        closeDeleteConfirmModal(true);
      });

      deleteConfirmModal.addEventListener("click", (event) => {
        if (event.target === deleteConfirmModal) {
          closeDeleteConfirmModal(false);
        }
      });

      abrirCamaraBtn.addEventListener("click", () => {
        if (!ES_OPERADOR) {
          showMessage("Acceso denegado. El rol de invitado es de solo lectura y no permite tomar fotos.", "error");
          return;
        }
        openCameraCapture("form");
      });

      tomarFotoBtn.addEventListener("click", () => {
        takePhotoFromCamera();
      });

      cerrarCamaraBtn.addEventListener("click", () => {
        closeCameraCapture();
      });

      usarArchivoFallbackBtn.addEventListener("click", () => {
        const target = cameraTarget;
        const registroId = cameraRegistroId;
        closeCameraCapture();
        if (target === "quick") {
          pendingMarcaRegistroId = registroId;
          marcaRapidaInput.value = "";
          marcaRapidaInput.click();
          return;
        }
        marcaInput.value = "";
        marcaInput.click();
      });

      cameraModal.addEventListener("click", (event) => {
        if (event.target === cameraModal) {
          closeCameraCapture();
        }
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!ES_OPERADOR) {
          showMessage("Acceso denegado. El rol de invitado es de solo lectura y no permite crear ni modificar registros.", "error");
          return;
        }
        if (isSavingRegistro) return;
        clearMessage();
        setGuardarLoading(true);

        try {
          const id = registroIdInput.value;
          const allowPasillo = pasillosHabilitados();
          const payload = {
            corral: document.getElementById("corral").value.trim(),
            allowPasillo,
            remitente: document.getElementById("remitente").value.trim(),
            categoria: document.getElementById("categoria").value.trim(),
            cantidad: document.getElementById("cantidad").value,
            estado: getEstadoSelection(estadoOptions),
            observaciones: document.getElementById("observaciones").value.trim(),
            marcaImagen: imagenBase64Actual,
          };
          const rpInput = document.getElementById("rp");
          if (rpInput) {
            payload.rp = rpInput.value.trim();
          }

          const url = id ? `/api/registros/${id}/` : "/api/registros/";
          const method = id ? "PUT" : "POST";

          if (!validatePasilloAllowed(payload.corral, allowPasillo, "el formulario principal")) {
            return;
          }

          const ocupacion = await checkCorralOcupacion();
          if (ocupacion && ocupacion.ocupado) {
            const ok = window.confirm(`El corral ${ocupacion.corral} ya tiene ${getLotesLabel(ocupacion.registros.length)}. Deseas guardar igual?`);
            if (!ok) {
              return;
            }
          }

          let response;
          try {
            response = await fetch(url, {
              method,
              headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
              },
              body: JSON.stringify(payload),
            });
          } catch (err) {
            showMessage("Sin conexión — no se pudo guardar. Reintentá cuando vuelva la red.", "error");
            return;
          }

          if (handleAuthError(response)) return;
          let body = {};
          try {
            body = await response.json();
          } catch (err) {
            // ignore json parse error
          }

          if (!response.ok) {
            let text = body && body.error ? body.error : null;
            if (!text) {
              try {
                const txt = await response.text();
                if (txt) text = txt;
              } catch (e) {
                // ignore
              }
            }
            showMessage(text || `No se pudo guardar el registro. (status ${response.status})`, "error");
            return;
          }

          showMessage(id ? "Registro actualizado." : "Registro creado.");
          resetFormState();
          invalidateRegistroDetailCache(id || null);
          await refreshAllData();
        } catch (e) {
          if (e instanceof TypeError) {
            showMessage("Sin conexión. No se pudo guardar.", "error");
          } else {
            throw e;
          }
        } finally {
          setGuardarLoading(false);
        }
      });

      cancelarEdicionBtn.addEventListener("click", () => {
        resetFormState();
        clearMessage();
      });

      document.getElementById("cantidad").addEventListener("wheel", (e) => {
        e.preventDefault();
      }, { passive: false });

      modalCantidad.addEventListener("wheel", (e) => {
        e.preventDefault();
      }, { passive: false });

      buscadorGeneral.addEventListener("input", () => {
        window.clearTimeout(buscadorDebounceTimer);
        buscadorDebounceTimer = window.setTimeout(() => {
          fetchRegistrosFiltered();
        }, 300);
      });

      ordenRegistros.addEventListener("change", () => {
        renderCards();
      });

      corralInput.addEventListener("blur", () => {
        checkCorralOcupacion();
      });

      corralInput.addEventListener("input", () => {
        if (!corralInput.value.trim()) {
          hideCorralOcupacionAviso();
        }
      });

      remitenteInput.addEventListener("change", () => {
        tryAutofillMarcaByRemitente();
      });

      remitenteInput.addEventListener("input", () => {
        renderRemitenteMarcas(normalizeRemitenteText(remitenteInput.value));
      });

      remitenteInput.addEventListener("blur", () => {
        tryAutofillMarcaByRemitente();
      });

      remitenteMarcasGrid.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-remitente-marca-index]");
        if (!button) return;

        const index = Number(button.dataset.remitenteMarcaIndex);
        const marca = remitenteMarcasActuales[index] || "";
        if (!marca) return;

        // Toggle selection in imagenBase64Actual (multi-select)
        if (!Array.isArray(imagenBase64Actual)) imagenBase64Actual = imagenBase64Actual ? [imagenBase64Actual] : [];
        const pos = imagenBase64Actual.indexOf(marca);
        if (pos === -1) {
          if (imagenBase64Actual.length >= MAX_MARCA_IMAGES) {
            showMessage(`Solo se permiten hasta ${MAX_MARCA_IMAGES} fotos.`, "error");
            return;
          }
          imagenBase64Actual.push(marca);
        } else {
          imagenBase64Actual.splice(pos, 1);
        }

        showImagePreview(imagenBase64Actual);
        renderRemitenteMarcas(normalizeRemitenteText(remitenteInput.value));
      });

      habilitarPasillosInput.addEventListener("change", () => {
        syncUbicacionesDatalist();
        if (!pasillosHabilitados() && isPasilloValue(selectedCorral)) {
          deselectCorral();
        } else {
          renderMapaCorrales();
        }
        if (!pasillosHabilitados() && isPasilloValue(corralInput.value)) {
          showMessage("Pasillos deshabilitados. Activa la casilla en Corrales para usarlos.", "error");
        }
      });

      mapaGrid.addEventListener("click", (event) => {
        if (hasDragged) {
          hasDragged = false;
          return;
        }
        const target = event.target.closest("button[data-map-corral]");
        if (!target) {
          deselectCorral();
          return;
        }
        const targetCorral = target.dataset.mapCorral;
        if (selectedCorral === targetCorral) {
          deselectCorral();
        } else {
          renderCorralDetalle(targetCorral);
        }
      });

      corralDetalleContainer.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-corrales-action]");
        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.corralesAction;
        const registro = registrosAll.find((item) => String(item.id) === String(id));
        if (!registro) return;

        if (action === "edit") {
          openEditarLoteModal(registro);
          return;
        }

        if (action === "add-photo") {
          if (!ES_OPERADOR) {
            showMessage("Acceso denegado. El rol de invitado es de solo lectura y no permite subir fotos.", "error");
            return;
          }
          openCameraCapture("quick", id);
          return;
        }

        if (action === "delete") {
          if (!ES_OPERADOR) {
            showMessage("Acceso denegado. El rol de invitado es de solo lectura y no permite eliminar registros.", "error");
            return;
          }
          const ok = await openDeleteConfirmModal("Eliminar este registro?");
          if (!ok) return;

          try {
            const response = await fetch(`/api/registros/${id}/`, {
              method: "DELETE",
              headers: {
                "X-CSRFToken": getCookie("csrftoken"),
              },
            });
            if (handleAuthError(response)) return;
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              showMessage(body.error || "No se pudo eliminar el registro.", "error");
              return;
            }
            showMessage("Registro eliminado.");
            await refreshAllData();
          } catch (e) {
            if (e instanceof TypeError) {
              showMessage("Sin conexión. No se pudo eliminar.", "error");
            } else {
              throw e;
            }
          }
        }
      });

      modalCorral.addEventListener("blur", () => {
        checkModalCorralOcupacion();
      });

      modalCorral.addEventListener("input", () => {
        if (!modalCorral.value.trim()) {
          hideModalCorralOcupacionAviso();
        }
      });

      editarLoteModal.addEventListener("click", (event) => {
        if (event.target === editarLoteModal) {
          closeEditarLoteModal();
        }
      });

      cerrarModalBtn.addEventListener("click", () => {
        closeEditarLoteModal();
      });

      editarLoteForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!ES_OPERADOR) {
          showMessage("Acceso denegado. El rol de invitado es de solo lectura y no permite crear ni modificar registros.", "error");
          return;
        }
        const id = editarLoteId.value;
        if (!id) return;

        const registro = registrosAll.find((item) => String(item.id) === String(id));
        if (!registro) {
          showMessage("No se encontro el lote a editar.", "error");
          return;
        }

        const payload = {
          corral: modalCorral.value.trim(),
          allowPasillo: pasillosHabilitados(),
          remitente: modalRemitente.value.trim(),
          categoria: modalCategoria.value.trim(),
          cantidad: modalCantidad.value,
          estado: getEstadoSelection(modalEstadoOptions),
          observaciones: modalObservaciones.value.trim(),
          marcaImagen: registro.marcaImagen || "",
        };
        const modalRpInput = document.getElementById("modalRp");
        if (modalRpInput) {
          payload.rp = modalRpInput.value.trim();
        }

        if (!validatePasilloAllowed(payload.corral, payload.allowPasillo, "el modal de edicion")) {
          return;
        }

        const ocupacion = await checkModalCorralOcupacion();
        if (ocupacion && ocupacion.ocupado) {
          const ok = window.confirm(`El corral ${ocupacion.corral} ya tiene ${getLotesLabel(ocupacion.registros.length)}. Deseas guardar igual?`);
          if (!ok) {
            return;
          }
        }

        try {
          const response = await fetch(`/api/registros/${id}/`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(payload),
          });

          if (handleAuthError(response)) return;
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            showMessage(body.error || "No se pudo guardar el lote.", "error");
            return;
          }

          closeEditarLoteModal();
          showMessage("Lote actualizado desde Corrales.");
          await refreshAllData();
        } catch (e) {
          if (e instanceof TypeError) {
            showMessage("Sin conexión. No se pudo guardar.", "error");
          } else {
            throw e;
          }
        }
      });

      marcaRapidaInput.addEventListener("change", async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file || !pendingMarcaRegistroId) return;

        try {
          const marcaImagen = await fileToOptimizedImageData(file);
          const registroId = pendingMarcaRegistroId;
          pendingMarcaRegistroId = null;
          await actualizarMarcaRegistro(registroId, marcaImagen);
        } catch {
          pendingMarcaRegistroId = null;
          showMessage("No se pudo procesar la foto. Intenta otra vez.", "error");
        }
      });

      function iniciarNuevoEnCorral() {
        resetFormState();
        document.getElementById("corral").value = selectedCorral;
        setSection("registros");
      }
      nuevoEnCorralBtn.addEventListener("click", iniciarNuevoEnCorral);
      if (desktopNuevoEnCorralBtn) {
        desktopNuevoEnCorralBtn.addEventListener("click", iniciarNuevoEnCorral);
      }
      if (desktopCorralCerrar) {
        desktopCorralCerrar.addEventListener("click", deselectCorral);
      }

      if (toggleDesktopViewBtn) {
        toggleDesktopViewBtn.addEventListener("click", () => {
          applyDesktopView(!desktopViewEnabled);
        });
      }

      navRegistros.addEventListener("click", () => setSection("registros"));
      navCorrales.addEventListener("click", () => setSection("corrales"));

      if (limpiarFiltroCorralBtn) {
        limpiarFiltroCorralBtn.addEventListener("click", deselectCorral);
      }

      function refreshPage() {
        refreshAllData();
      }

      if (refrescarRegistrosBtn) {
        refrescarRegistrosBtn.addEventListener("click", refreshPage);
      }

      if (refrescarCorralesBtn) {
        refrescarCorralesBtn.addEventListener("click", refreshPage);
      }

      zoomInBtn.addEventListener("click", () => {
        const viewportWidth = mapaViewport.clientWidth - 16;
        const viewportHeight = mapaViewport.clientHeight - 16;
        zoomAround(zoomScale * 1.2, viewportWidth / 2, viewportHeight / 2);
      });

      zoomOutBtn.addEventListener("click", () => {
        const viewportWidth = mapaViewport.clientWidth - 16;
        const viewportHeight = mapaViewport.clientHeight - 16;
        zoomAround(zoomScale / 1.2, viewportWidth / 2, viewportHeight / 2);
      });

      centerCorralBtn.addEventListener("click", () => {
        centerOnCorral(selectedCorral);
      });

      window.addEventListener("resize", () => {
        applyMapTransform();
      });

      if (imgZoomInBtn) {
        imgZoomInBtn.addEventListener("click", () => zoomImage(1.3));
      }
      if (imgZoomOutBtn) {
        imgZoomOutBtn.addEventListener("click", () => zoomImage(0.7));
      }
      if (imgZoomResetBtn) {
        imgZoomResetBtn.addEventListener("click", resetImageZoom);
      }

      if (imageViewerContent) {
        imageViewerContent.addEventListener("wheel", (e) => {
          e.preventDefault();
          const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
          zoomImage(zoomFactor);
        }, { passive: false });

        imageViewerContent.addEventListener("mousedown", (e) => {
          if (imageZoomScale <= 1) return;
          isDraggingImg = true;
          imageViewerContent.style.cursor = "grabbing";
          imgDragStartX = e.clientX;
          imgDragStartY = e.clientY;
          imgPanStartX = imagePanX;
          imgPanStartY = imagePanY;
          e.preventDefault();

          function onImgMouseMove(e) {
            const dx = e.clientX - imgDragStartX;
            const dy = e.clientY - imgDragStartY;
            imagePanX = imgPanStartX + dx;
            imagePanY = imgPanStartY + dy;
            applyImageZoomTransform();
          }
          function onImgMouseUp() {
            isDraggingImg = false;
            if (imageZoomScale > 1) {
              imageViewerContent.style.cursor = "grab";
            }
            window.removeEventListener("mousemove", onImgMouseMove);
            window.removeEventListener("mouseup", onImgMouseUp);
          }
          window.addEventListener("mousemove", onImgMouseMove);
          window.addEventListener("mouseup", onImgMouseUp);
        });

        imageViewerImg.addEventListener("click", () => {
          if (imageZoomScale > 1) {
            resetImageZoom();
          } else {
            imageZoomScale = 2.5;
            applyImageZoomTransform();
          }
        });

        // Touch support for mobile zooming
        imageViewerContent.addEventListener("touchstart", (e) => {
          if (imageZoomScale <= 1 || e.touches.length !== 1) return;
          isDraggingImg = true;
          imgDragStartX = e.touches[0].clientX;
          imgDragStartY = e.touches[0].clientY;
          imgPanStartX = imagePanX;
          imgPanStartY = imagePanY;
        }, { passive: true });

        imageViewerContent.addEventListener("touchmove", (e) => {
          if (!isDraggingImg || e.touches.length !== 1) return;
          const dx = e.touches[0].clientX - imgDragStartX;
          const dy = e.touches[0].clientY - imgDragStartY;
          imagePanX = imgPanStartX + dx;
          imagePanY = imgPanStartY + dy;
          applyImageZoomTransform();
          e.preventDefault();
        }, { passive: false });

        imageViewerContent.addEventListener("touchend", () => {
          isDraggingImg = false;
        });
      }

      // Handle back button (especially on PWA when installed on mobile)
      // This prevents closing the session when back button is pressed
      function isAnyModalOpen() {
        const modals = [editarLoteModal, imageViewerModal, deleteConfirmModal, cameraModal];
        return modals.some((modal) => !modal.classList.contains("hidden"));
      }

      function closeAllModals() {
        // Close edit modal
        if (!editarLoteModal.classList.contains("hidden")) {
          closeEditarLoteModal();
        }
        // Close image viewer
        if (!imageViewerModal.classList.contains("hidden")) {
          closeImageViewer();
        }
        // Close delete confirm
        if (!deleteConfirmModal.classList.contains("hidden")) {
          closeDeleteConfirmModal(false);
        }
        // Close camera
        if (!cameraModal.classList.contains("hidden")) {
          closeCameraCapture();
        }
      }

      // Handle browser back button (popstate event fired on back button press)
      // especially important for PWA running on mobile devices
      window.addEventListener("popstate", (event) => {
        event.preventDefault();
        if (isAnyModalOpen()) {
          closeAllModals();
          // Restore history state so back button works again next time
          window.history.pushState({ modalClosed: true }, "");
        } else {
          // No modals open, allow normal navigation
          // Push a dummy state to maintain history integrity
          window.history.pushState({ page: "main" }, "");
        }
      });

      // Push initial history state to enable back button handling
      window.history.pushState({ page: "main" }, "");

      // Fix: prevenir zoom automatico en iOS Safari al enfocar inputs.
      // iOS hace zoom cuando el font-size del input es < 16px, ignorando
      // el atributo maximum-scale del viewport desde iOS 10.
      // La solucion es forzar font-size=16px justo antes del focus
      // y restaurar el valor original despues del blur.
      (function preventIOSZoom() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (!isIOS) return;
        function fixFontSize(el) {
          const original = el.style.fontSize;
          el.style.fontSize = '16px';
          el.addEventListener('blur', function onBlur() {
            el.style.fontSize = original;
            el.removeEventListener('blur', onBlur);
          }, { once: true });
        }
        document.addEventListener('focus', function(e) {
          const tag = e.target.tagName;
          if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
            fixFontSize(e.target);
          }
        }, true);
      })();

      function normalizeCorralSortingKey(corral) {
        const c = (corral || "").toString().trim().toUpperCase();
        const num = parseInt(c, 10);
        if (!isNaN(num)) {
          // Rellenamos con 0 para que los números ordenen bien (00001, 00012)
          return num.toString().padStart(5, '0');
        }
        return c;
      }

      function generarPdfBlob() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0); 
        doc.text("Planilla Rural - Exportación de Corrales", 14, 15);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const dateStr = new Date().toLocaleDateString("es-AR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        doc.text(`Fecha y hora: ${dateStr}`, 14, 22);

        const registrosOrdenados = [...registrosAll].sort((a, b) => {
          const corralA = normalizeCorralSortingKey(a.corral);
          const corralB = normalizeCorralSortingKey(b.corral);
          if (corralA < corralB) return -1;
          if (corralA > corralB) return 1;
          return 0;
        });

        const tableColumn = ["Corral", "Remitente", "Categoría", "Estado", "Cant.", "Observaciones", "Corral Nuevo 1", "Corral Nuevo 2"];
        if (typeof REMATE_HABILITAR_RP !== "undefined" && REMATE_HABILITAR_RP) {
          tableColumn.splice(3, 0, "RP");
        }
        const tableRows = [];

        registrosOrdenados.forEach(item => {
          const rowData = [
            item.corral || "-",
            item.remitente || "-",
            item.categoria || "-",
            item.estado || "-",
            item.cantidad !== null ? item.cantidad.toString() : "-",
            item.observaciones || "-",
            "", 
            ""  
          ];
          if (typeof REMATE_HABILITAR_RP !== "undefined" && REMATE_HABILITAR_RP) {
            rowData.splice(3, 0, item.rp || "-");
          }
          tableRows.push(rowData);
        });

        // Agregamos filas vacias suficientes para llenar la hoja actual y asegurar una hoja extra
        for (let i = 0; i < 40; i++) {
          if (typeof REMATE_HABILITAR_RP !== "undefined" && REMATE_HABILITAR_RP) {
            tableRows.push(["", "", "", "", "", "", "", "", ""]);
          } else {
            tableRows.push(["", "", "", "", "", "", "", ""]);
          }
        }

        doc.autoTable({
          startY: 28,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid', 
          headStyles: { 
            fillColor: [240, 240, 240], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
          },
          bodyStyles: {
            textColor: [0, 0, 0], 
            valign: 'middle'
          },
          columnStyles: (typeof REMATE_HABILITAR_RP !== "undefined" && REMATE_HABILITAR_RP) ? {
            0: { halign: 'center', cellWidth: 15 }, 
            1: { cellWidth: 'auto' }, 
            2: { cellWidth: 20 }, 
            3: { cellWidth: 20 }, 
            4: { cellWidth: 20 }, 
            5: { halign: 'center', cellWidth: 12 }, 
            6: { cellWidth: 35 }, 
            7: { cellWidth: 26 }, 
            8: { cellWidth: 26 }  
          } : {
            0: { halign: 'center', cellWidth: 15 }, 
            1: { cellWidth: 'auto' }, 
            2: { cellWidth: 20 }, 
            3: { cellWidth: 20 }, 
            4: { halign: 'center', cellWidth: 12 }, 
            5: { cellWidth: 45 }, 
            6: { cellWidth: 32 }, 
            7: { cellWidth: 32 }  
          },
          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 1.5,
            lineColor: [100, 100, 100], 
            lineWidth: 0.2
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255] 
          }
        });

        return doc.output('blob');
      }

      if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", () => {
          try {
            const blob = generarPdfBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fileNameDate = new Date().toLocaleDateString("es-AR").replace(/\//g, "-");
            link.download = `Planilla de Corrales ${fileNameDate}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error(e);
            showMessage("Error al generar el PDF", "error");
          }
        });
      }

      function aplicarModoFinalizado() {
        if (typeof REMATE_FINALIZADO === "undefined" || !REMATE_FINALIZADO) {
          return;
        }
        const banner = document.getElementById("remateFinalizadoBanner");
        if (banner) banner.classList.remove("hidden");
        const form = document.getElementById("registroForm");
        if (form) {
          form.querySelectorAll("input, select, textarea, button").forEach((el) => {
            el.disabled = true;
          });
        }
        document.querySelectorAll('button[data-action]').forEach((btn) => {
          const action = btn.getAttribute("data-action");
          if (action === "edit" || action === "delete" || action === "add-photo") {
            btn.disabled = true;
          }
        });
      }
      aplicarModoFinalizado();

      window.addEventListener("offline", () => {
        showMessage("Sin conexión — trabajando con datos guardados.", "error");
      });
      window.addEventListener("online", () => {
        showMessage("Conexión restablecida.");
        refreshAllData();
      });

      // --- CUSTOM SELECT MINIMALISTA Y ELEGANTE ---
      function initializeCustomSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.style.display = "none";

        const container = document.createElement("div");
        container.className = "custom-select-container relative w-full";
        select.parentNode.insertBefore(container, select);
        container.appendChild(select);

        const isModal = select.classList.contains("rounded-md") || selectId.toLowerCase().includes("modal");

        const trigger = document.createElement("button");
        trigger.type = "button";
        if (isModal) {
          trigger.className = "custom-select-trigger w-full flex items-center justify-between rounded-md border border-app-leaf/45 bg-white px-3 py-2 text-sm font-semibold text-app-ink shadow-sm transition-all focus:border-app-leaf focus:ring-4 focus:ring-app-leaf/10";
        } else {
          trigger.className = "custom-select-trigger w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-app-ink shadow-sm transition-all focus:border-app-leaf focus:ring-4 focus:ring-app-leaf/10";
        }

        const labelSpan = document.createElement("span");
        labelSpan.className = "custom-select-label text-slate-500";
        labelSpan.textContent = select.options[select.selectedIndex]?.text || "Seleccionar categoría";

        const arrowSvg = document.createElement("div");
        arrowSvg.className = "transition-transform duration-200 text-slate-400 shrink-0 ml-2";
        arrowSvg.innerHTML = `
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        `;

        trigger.appendChild(labelSpan);
        trigger.appendChild(arrowSvg);
        container.appendChild(trigger);

        const dropdown = document.createElement("div");
        if (isModal) {
          dropdown.className = "custom-select-dropdown absolute left-0 right-0 z-50 mt-1.5 hidden grid grid-cols-2 gap-2 rounded-md border border-app-leaf/25 bg-white/95 p-2 shadow-xl backdrop-blur-md transition-all";
        } else {
          dropdown.className = "custom-select-dropdown absolute left-0 right-0 z-50 mt-1.5 hidden grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-white/95 p-2 shadow-xl backdrop-blur-md transition-all";
        }
        container.appendChild(dropdown);

        function buildOptions() {
          dropdown.innerHTML = "";
          Array.from(select.options).forEach((opt) => {
            const isPlaceholder = opt.value === "";
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "w-full text-left rounded-lg px-3.5 py-2.5 text-sm sm:text-base font-semibold border transition-all flex items-center justify-between gap-2 shadow-sm";

            if (select.value === opt.value) {
              btn.className += " bg-app-mint/20 text-app-leaf border-app-leaf/40 font-bold";
            } else {
              btn.className += " bg-slate-50/50 text-app-ink border-slate-200/50 hover:bg-slate-50 hover:border-app-leaf/25 hover:text-app-leaf";
            }

            btn.innerHTML = `<span class="leading-tight">${opt.text}</span>`;
            if (select.value === opt.value && !isPlaceholder) {
              btn.innerHTML += `
                <svg class="text-app-leaf shrink-0 ml-1" style="width: 16px; height: 16px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              `;
            }

            btn.addEventListener("click", (e) => {
              e.preventDefault();
              select.value = opt.value;
              select.dispatchEvent(new Event("change"));
              dropdown.classList.add("hidden");
              arrowSvg.classList.remove("rotate-180");
            });

            dropdown.appendChild(btn);
          });
        }

        trigger.addEventListener("click", (e) => {
          e.preventDefault();
          const isHidden = dropdown.classList.contains("hidden");

          document.querySelectorAll(".custom-select-dropdown").forEach((d) => d.classList.add("hidden"));
          document.querySelectorAll(".custom-select-trigger div").forEach((a) => a.classList.remove("rotate-180"));

          if (isHidden) {
            buildOptions();
            dropdown.classList.remove("hidden");
            arrowSvg.classList.add("rotate-180");
          } else {
            dropdown.classList.add("hidden");
            arrowSvg.classList.remove("rotate-180");
          }
        });

        document.addEventListener("click", (e) => {
          if (!container.contains(e.target)) {
            dropdown.classList.add("hidden");
            arrowSvg.classList.remove("rotate-180");
          }
        });

        select.addEventListener("change", () => {
          const selectedText = select.options[select.selectedIndex]?.text || "Seleccionar categoría";
          labelSpan.textContent = selectedText;
          if (select.value === "") {
            labelSpan.classList.add("text-slate-500");
          } else {
            labelSpan.classList.remove("text-slate-500");
          }
          buildOptions();
        });

        if (select.value === "") {
          labelSpan.classList.add("text-slate-500");
        }
      }

      initializeCustomSelect("categoria");
      initializeCustomSelect("modalCategoria");

      applyDesktopView(desktopViewEnabled);
      setSection("registros");
      setupTouchNavigation();
      setupMouseNavigation();
      refreshAllData();

      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("/sw.js").catch((err) => {
            console.warn("Service worker no pudo registrarse:", err);
          });
        });
      }
