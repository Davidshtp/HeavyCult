/**
 * popup/popup.js
 *
 * Orquesta la importación: valida configuración, comprueba la pestaña activa,
 * pide al content script la extracción del producto y delega la mutación al
 * service worker (el único autorizado a llamar a Shopify por CORS). El token
 * se obtiene solo vía Client Credentials (igual que el sistema local); aquí
 * solo se piden el Shop Domain, el Client ID y el Client Secret de la app.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "dropiImporterConfig";
  const DROPI_HOST = "app.dropi.co";
  const PRODUCT_DETAILS_PATH_RE = /\/(?:dashboard\/product-details|producto|product-detail)\//;
  const NEW_MODEL_VERSIONS = ["2025-10", "2026-01", "2026-04", "2026-07"];

  const SCOPES_REQUERIDOS_IMPORTACION = ["write_products", "write_inventory"];
  const SCOPES_RECOMENDADOS = ["read_inventory", "read_locations"];

  const els = {
    domain: document.getElementById("shop-domain"),
    clientId: document.getElementById("client-id"),
    clientSecret: document.getElementById("client-secret"),
    locationId: document.getElementById("location-id"),
    apiVersion: document.getElementById("api-version"),
    saveBtn: document.getElementById("save-btn"),
    testBtn: document.getElementById("test-btn"),
    importBtn: document.getElementById("import-btn"),
    toggleSecret: document.getElementById("toggle-secret"),
    listLocationsBtn: document.getElementById("list-locations-btn"),
    locationPicker: document.getElementById("location-picker"),
    status: document.getElementById("status"),
  };

  let busy = false;

  /* ------------------------------------------------------------------ *
   * Configuración
   * ------------------------------------------------------------------ */

  const currentConfig = () => ({
    shopDomain: els.domain.value.trim(),
    clientId: els.clientId.value.trim(),
    clientSecret: els.clientSecret.value.trim(),
    locationId: els.locationId.value.trim(),
    apiVersion: els.apiVersion.value,
  });

  const validateConfig = (config, { requiereUbicacion = false } = {}) => {
    const errors = [];
    const domain = config.shopDomain.toLowerCase();

    if (!domain) errors.push("Ingresa el Shopify Shop Domain.");
    else if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain))
      errors.push("El Shopify Shop Domain no se ve válido (ej: tu-tienda.myshopify.com).");

    if (!config.clientId) errors.push("Ingresa el Client ID de tu app.");
    else if (!/^[a-f0-9]{32}$/i.test(config.clientId))
      errors.push("El Client ID debe ser de 32 caracteres hexadecimales (como el que usas en Configuración → Conexiones).");

    if (!config.clientSecret) errors.push("Ingresa el Client Secret de tu app.");

    if (requiereUbicacion) {
      if (!config.locationId) errors.push("Ingresa el Location ID de Shopify.");
      else if (!/^gid:\/\/shopify\/Location\/\d+$/.test(config.locationId) && !/^\d+$/.test(config.locationId))
        errors.push("El Location ID debe ser el número de la URL (ej: 123456) u un gid://shopify/Location/….");
    }

    if (!/^\d{4}-\d{2}$/.test(config.apiVersion || "")) errors.push("Versión de API inválida (formato YYYY-MM).");

    return errors.map((message) => ({ message }));
  };

  const persistConfig = async (config) => {
    await chrome.storage.local.set({ [STORAGE_KEY]: config });
  };

  const loadConfig = async () => {
    try {
      const { [STORAGE_KEY]: saved } = await chrome.storage.local.get(STORAGE_KEY);
      if (!saved) return;
      if (typeof saved.shopDomain === "string") els.domain.value = saved.shopDomain;
      if (typeof saved.clientId === "string") els.clientId.value = saved.clientId;
      if (typeof saved.clientSecret === "string") els.clientSecret.value = saved.clientSecret;
      if (typeof saved.locationId === "string") els.locationId.value = saved.locationId;
      if (NEW_MODEL_VERSIONS.includes(saved.apiVersion)) els.apiVersion.value = saved.apiVersion;

      // Migración: la versión anterior guardaba un token estático (apiToken).
      // Inútil para este flujo: se descarta para no confundir configuración vieja.
      if (saved.apiToken) {
        const limpiado = { ...saved };
        delete limpiado.apiToken;
        await chrome.storage.local.set({ [STORAGE_KEY]: limpiado });
      }
    } catch (_err) {
      /* storage no disponible: se ignora, el usuario puede escribir a mano. */
    }
  };

  /* ------------------------------------------------------------------ *
   * Estado visual
   * ------------------------------------------------------------------ */

  const setStatus = (kind, title, extra) => {
    els.status.className = "status";
    els.status.textContent = "";
    els.status.innerHTML = "";

    if (!kind) {
      els.status.style.display = "none";
      return;
    }

    els.status.className = `status ${kind}`;

    if (kind === "loading") {
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      els.status.appendChild(spinner);
      els.status.appendChild(document.createTextNode(title));
      return;
    }

    const strong = document.createElement("strong");
    strong.textContent = title;
    els.status.appendChild(strong);

    if (extra && extra.link) {
      const link = document.createElement("a");
      link.href = extra.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Abrir en Shopify";
      els.status.appendChild(document.createTextNode(" "));
      els.status.appendChild(link);
    }

    if (extra && Array.isArray(extra.details) && extra.details.length > 0) {
      const detail = document.createElement("span");
      detail.className = "detail";
      extra.details.forEach((line) => {
        const item = document.createElement("div");
        item.textContent = line;
        detail.appendChild(item);
      });
      els.status.appendChild(detail);
    }
  };

  const setBusy = (isBusy) => {
    busy = isBusy;
    els.importBtn.disabled = isBusy;
    els.saveBtn.disabled = isBusy;
    els.testBtn.disabled = isBusy;
  };

  /* ------------------------------------------------------------------ *
   * Acciones
   * ------------------------------------------------------------------ */

  const onSave = async (event) => {
    event.preventDefault();
    const config = currentConfig();
    const errors = validateConfig(config);
    if (errors.length > 0) {
      setStatus("error", "Revisa la configuración:", { details: errors.map((error) => error.message) });
      return;
    }
    await persistConfig(config);
    setStatus("success", "Configuración guardada.");
  };

  const onToggleSecret = () => {
    const reveal = els.clientSecret.type === "password";
    els.clientSecret.type = reveal ? "text" : "password";
  };

  const onTest = async () => {
    if (busy) return;

    const config = currentConfig();
    const errors = validateConfig(config);
    if (errors.length > 0) {
      setStatus("error", "Completa la configuración primero:", { details: errors.map((error) => error.message) });
      return;
    }

    setBusy(true);
    setStatus("loading", "Probando conexión con Shopify…");

    try {
      const result = await chrome.runtime.sendMessage({ type: "TEST_CONNECTION", config });

      if (!result || !result.ok) {
        setStatus("error", "No se pudo conectar:", {
          details: result && Array.isArray(result.errors) ? result.errors : ["Sin respuesta del service worker."],
        });
        return;
      }

      const details = [];
      if (result.scope) {
        details.push(`Scopes del token: ${result.scope}`);
        const scopes = String(result.scope)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!SCOPES_REQUERIDOS_IMPORTACION.every((s) => scopes.includes(s)))
          details.push("Aviso: faltan scopes (write_products/write_inventory); la importación fallará. Agrégalos y reinstala la app.");
        if (!scopes.includes("read_locations"))
          details.push("Aviso: falta read_locations; el botón «Listar ubicaciones» dará ACCESS_DENIED.");
      }
      setStatus("success", result.mensaje, details.length > 0 ? { details } : undefined);
      await persistConfig(config);
    } catch (error) {
      const message = error && error.message ? error.message : "Ocurrió un error inesperado.";
      setStatus("error", message);
    } finally {
      setBusy(false);
    }
  };

  const renderLocations = (locations) => {
    els.locationPicker.innerHTML = "";
    locations.forEach((loc) => {
      const option = document.createElement("option");
      option.value = loc.id;
      option.textContent = `${loc.name} — ${loc.id}`;
      els.locationPicker.appendChild(option);
    });
    // Auto-rellena la primera ubicación encontrada.
    if (locations.length > 0) els.locationId.value = locations[0].id;
    els.locationPicker.classList.remove("hidden");
  };

  const onListLocations = async () => {
    if (busy) return;

    const config = currentConfig();
    const errors = validateConfig(config);
    if (errors.length > 0) {
      setStatus("error", "Completa la configuración primero:", { details: errors.map((error) => error.message) });
      return;
    }

    setBusy(true);
    setStatus("loading", "Listando ubicaciones de Shopify…");

    try {
      const result = await chrome.runtime.sendMessage({ type: "LIST_LOCATIONS", config });

      if (!result || !result.ok) {
        setStatus("error", "No se pudieron listar las ubicaciones:", {
          details: result && Array.isArray(result.errors) ? result.errors : ["Sin respuesta del service worker."],
        });
        return;
      }

      const locations = Array.isArray(result.locations) ? result.locations : [];
      renderLocations(locations);
      await persistConfig(config);

      if (locations.length === 0) {
        setStatus("error", "No se encontraron ubicaciones activas en la tienda.");
        return;
      }
      setStatus("success", `Se encontraron ${locations.length} ubicación(es). Elegí una para llenar el Location ID.`);
    } catch (error) {
      const message = error && error.message ? error.message : "Ocurrió un error inesperado.";
      setStatus("error", message);
    } finally {
      setBusy(false);
    }
  };

  const getActiveTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url) throw new Error("No se pudo detectar la pestaña activa.");

    const url = new URL(tab.url);
    if (url.hostname !== DROPI_HOST)
      throw new Error(`La pestaña activa no es de Dropi (se esperaba ${DROPI_HOST}).`);
    if (!PRODUCT_DETAILS_PATH_RE.test(url.pathname))
      throw new Error("No estás en la vista de detalle de un producto de Dropi.");

    return tab;
  };

  /** Garantiza que el content script esté inyectado en la pestaña. */
  const ensureContentScript = async (tabId) => {
    try {
      const pong = await chrome.tabs.sendMessage(tabId, { type: "PING" });
      if (pong && pong.ok) return;
    } catch (_err) {
      /* sin content script: se inyecta a continuación */
    }
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content_script.js"] });
    const pong = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    if (!pong || !pong.ok) throw new Error("No se pudo inicializar el content script en la pestaña.");
  };

  const formatExtractionError = (extract) => {
    if (!extract) return "El content script no respondió la extracción.";
    if (extract.error) {
      const lines = [extract.error];
      if (Array.isArray(extract.missing) && extract.missing.length > 0)
        lines.push(`Campos faltantes: ${extract.missing.join(", ")}.`);
      return lines.join(" ");
    }
    return "La extracción del producto falló sin mensaje específico.";
  };

  const onImport = async () => {
    if (busy) return;

    const config = currentConfig();
    const errors = validateConfig(config, { requiereUbicacion: true });
    if (errors.length > 0) {
      setStatus("error", "Completa la configuración primero:", { details: errors.map((error) => error.message) });
      return;
    }

    setBusy(true);
    setStatus("loading", "Importando producto a Shopify…");

    try {
      const tab = await getActiveTab();
      await ensureContentScript(tab.id);

      const extract = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PRODUCT" });
      if (!extract || !extract.ok) throw new Error(formatExtractionError(extract));

      const result = await chrome.runtime.sendMessage({
        type: "IMPORT_TO_SHOPIFY",
        config,
        product: extract.product,
      });

      if (!result || !result.ok) {
        const details = result && Array.isArray(result.errors) ? result.errors : ["Sin respuesta del service worker."];
        const stage = result && result.stage;

        // stage "validacion" = el fallo fue local (config o datos del producto),
        // no de Shopify: no se llegó a llamar a la API.
        if (stage === "validacion") {
          setStatus("error", "Revisa los datos antes de importar:", { details });
          return;
        }

        // stage "duplicado" = el SKU ya existe; se abortó sin crear nada, así
        // que no es un error de Shopify sino un aviso.
        if (stage === "duplicado") {
          setStatus("warning", "Este producto ya fue importado anteriormente:", {
            details,
            link: result.duplicateProduct && result.duplicateProduct.url,
          });
          return;
        }

        setStatus("error", "Shopify rechazó la importación:", { details });
        return;
      }

      const details = [];
      if (Array.isArray(extract.warnings) && extract.warnings.length > 0) {
        details.push("Avisos (el producto se importó igual):", ...extract.warnings);
      }
      await persistConfig(config);
      setStatus("success", `Producto Creado Exitosamente ID: ${result.productId}`, {
        link: result.productUrl,
        details,
      });
    } catch (error) {
      const message = error && error.message ? error.message : "Ocurrió un error inesperado.";
      setStatus("error", message);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------------------ *
   * Inicialización
   * ------------------------------------------------------------------ */

  els.saveBtn.addEventListener("click", onSave);
  els.testBtn.addEventListener("click", onTest);
  els.toggleSecret.addEventListener("click", onToggleSecret);
  els.importBtn.addEventListener("click", onImport);
  els.listLocationsBtn.addEventListener("click", onListLocations);
  els.locationPicker.addEventListener("change", () => {
    if (els.locationPicker.value) els.locationId.value = els.locationPicker.value;
  });

  loadConfig().then(() => {
    // Deshacer el evento submit por defecto del formulario.
    document.getElementById("config-form").addEventListener("submit", (event) => event.preventDefault());
  });
})();