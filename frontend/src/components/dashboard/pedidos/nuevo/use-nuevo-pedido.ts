"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  crearPedido,
  listarDepartamentos,
  listarMunicipios,
  listarProductos,
  obtenerProducto,
} from "@/lib/dashboard-api";
import { ApiClientError } from "@/lib/api";
import type {
  CrearPedidoInput,
  Departamento,
  Municipio,
  Producto,
} from "@/lib/types";
import { MAX_POR_ITEM, PASOS, variantesConStock } from "./tipos";

const DEBOUNCE_BUSQUEDA_MS = 300;
const RESULTADOS_BUSQUEDA = 6;
const LARGO_MINIMO_BUSQUEDA = 1;
const DIGITOS_MINIMOS_TELEFONO = 7;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cerebro del asistente de pedidos: concentra el estado, los efectos (carga de
 * geografía, búsqueda de productos con debounce, preselección por `?producto=`)
 * y el envío a Shopify. Los componentes de paso solo pintan y disparan acciones.
 */
export function useNuevoPedido(productoInicialId: string | null) {
  const router = useRouter();

  const [paso, setPaso] = useState(0);

  // Producto
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<Producto[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargandoProducto, setCargandoProducto] = useState(false);
  const [idVariante, setIdVariante] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const peticionBusqueda = useRef(0);
  const preseleccionIniciada = useRef(false);

  // Cliente
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  // Envío
  const [departamentos, setDepartamentos] = useState<Departamento[] | null>(
    null,
  );
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);
  const [idDepartamento, setIdDepartamento] = useState("");
  const [idMunicipio, setIdMunicipio] = useState("");
  const [calle, setCalle] = useState("");
  const [observacion, setObservacion] = useState("");

  const [enviando, setEnviando] = useState(false);

  const seleccionarProducto = useCallback((elegido: Producto) => {
    setProducto(elegido);
    setResultados(null);
    setConsulta("");
  }, []);

  // Geografía: todos los departamentos al montar.
  useEffect(() => {
    listarDepartamentos()
      .then(setDepartamentos)
      .catch((e) =>
        toast.error(
          e instanceof Error
            ? e.message
            : "No se pudieron cargar los departamentos.",
        ),
      );
  }, []);

  // Preselección cuando se llega desde "Hacer pedido" (`?producto=<GID>`).
  useEffect(() => {
    if (!productoInicialId || preseleccionIniciada.current) return;
    preseleccionIniciada.current = true;
    setCargandoProducto(true);
    obtenerProducto(productoInicialId)
      .then(seleccionarProducto)
      .catch((e) =>
        toast.error(
          e instanceof Error ? e.message : "No se pudo cargar el producto.",
        ),
      )
      .finally(() => setCargandoProducto(false));
  }, [productoInicialId, seleccionarProducto]);

  // Al elegir producto, activa la primera variante con stock.
  useEffect(() => {
    if (!producto) {
      setIdVariante("");
      return;
    }
    const orden = variantesConStock(producto);
    const elegida = orden.find((v) => v.stock > 0) ?? orden[0];
    setIdVariante(elegida?.id_variante ?? "");
    setCantidad(1);
  }, [producto]);

  // Búsqueda de productos con debounce y descarte de respuestas viejas.
  useEffect(() => {
    if (producto) return;
    const termino = consulta.trim();
    if (termino.length < LARGO_MINIMO_BUSQUEDA) {
      setResultados(null);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const temporizador = setTimeout(async () => {
      const numero = ++peticionBusqueda.current;
      try {
        const respuesta = await listarProductos({
          buscar: termino,
          porPagina: RESULTADOS_BUSQUEDA,
        });
        if (numero === peticionBusqueda.current) setResultados(respuesta.productos);
      } catch (e) {
        if (numero === peticionBusqueda.current) {
          setResultados([]);
          toast.error(
            e instanceof Error ? e.message : "No se pudieron buscar productos.",
          );
        }
      } finally {
        if (numero === peticionBusqueda.current) setBuscando(false);
      }
    }, DEBOUNCE_BUSQUEDA_MS);
    return () => clearTimeout(temporizador);
  }, [consulta, producto]);

  // Municipios del departamento elegido.
  useEffect(() => {
    if (!idDepartamento) return;
    let vivo = true;
    setMunicipios(null);
    setCargandoMunicipios(true);
    listarMunicipios(idDepartamento)
      .then((lista) => {
        if (vivo) setMunicipios(lista);
      })
      .catch((e) => {
        if (vivo) setMunicipios([]);
        toast.error(
          e instanceof Error
            ? e.message
            : "No se pudieron cargar los municipios.",
        );
      })
      .finally(() => {
        if (vivo) setCargandoMunicipios(false);
      });
    return () => {
      vivo = false;
    };
  }, [idDepartamento]);

  const variante = useMemo(
    () =>
      producto?.variantes.find((v) => v.id_variante === idVariante) ?? null,
    [producto, idVariante],
  );

  const maxCantidad = useMemo(() => {
    const stock = variante?.stock ?? 0;
    return stock > 0 ? Math.min(MAX_POR_ITEM, stock) : MAX_POR_ITEM;
  }, [variante]);

  useEffect(() => {
    setCantidad((actual) => Math.min(actual, maxCantidad));
  }, [maxCantidad]);

  const precioUnitario = variante?.precio ?? 0;
  const total = precioUnitario * cantidad;

  const nombreDepartamento =
    departamentos?.find((d) => d.id === idDepartamento)?.nombre ?? "";
  const nombreMunicipio =
    municipios?.find((m) => m.id === idMunicipio)?.nombre ?? "";

  const emailValido = EMAIL_REGEX.test(email.trim());
  const telefonoValido =
    telefono.replace(/\D/g, "").length >= DIGITOS_MINIMOS_TELEFONO;
  const productoValido = Boolean(producto && variante);
  const clienteValido = Boolean(
    nombre.trim() && apellido.trim() && emailValido && telefonoValido,
  );
  const envioValido = Boolean(idDepartamento && idMunicipio);
  const pasosValidos = [productoValido, clienteValido, envioValido, true];

  function motivoPaso(indice: number): string | null {
    if (indice === 0 && !productoValido) {
      return "Elegí un producto y una variante con stock.";
    }
    if (indice === 1) {
      if (!nombre.trim() || !apellido.trim()) {
        return "Completá el nombre y el apellido del cliente.";
      }
      if (!emailValido) return "Ingresá un correo válido.";
      if (!telefonoValido) {
        return "Ingresá un teléfono válido (mínimo 7 dígitos).";
      }
    }
    if (indice === 2 && !envioValido) {
      return "Elegí el departamento y el municipio de entrega.";
    }
    return null;
  }

  function elegirVariante(id: string) {
    setIdVariante(id);
    setCantidad(1);
  }

  function cambiarCantidad(valor: number) {
    if (Number.isNaN(valor)) return;
    setCantidad(Math.max(1, Math.min(maxCantidad, Math.trunc(valor))));
  }

  function limpiarProducto() {
    setProducto(null);
    setIdVariante("");
    setCantidad(1);
    setConsulta("");
    setResultados(null);
  }

  function cambiarDepartamento(id: string) {
    setIdDepartamento(id);
    setIdMunicipio("");
    if (!id) setMunicipios(null);
  }

  function irA(indice: number) {
    if (indice === paso) return;
    if (indice < paso) {
      setPaso(indice);
      return;
    }
    for (let i = paso; i < indice; i += 1) {
      const motivo = motivoPaso(i);
      if (motivo) {
        toast.error(motivo);
        return;
      }
    }
    setPaso(indice);
  }

  function avanzar() {
    if (paso >= PASOS.length - 1) return;
    const motivo = motivoPaso(paso);
    if (motivo) {
      toast.error(motivo);
      return;
    }
    setPaso((actual) => actual + 1);
  }

  function retroceder() {
    setPaso((actual) => Math.max(0, actual - 1));
  }

  async function enviar() {
    for (let i = 0; i < PASOS.length - 1; i += 1) {
      const motivo = motivoPaso(i);
      if (motivo) {
        toast.error(motivo);
        setPaso(i);
        return;
      }
    }
    if (!producto || !variante) return;

    const input: CrearPedidoInput = {
      cliente: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
      },
      direccion_envio: {
        calle: calle.trim() || "Sin especificar",
        departamento: nombreDepartamento || idDepartamento,
        ciudad: nombreMunicipio || idMunicipio,
      },
      items: [{ id_variante: variante.id_variante, cantidad }],
      nota: observacion.trim() || undefined,
    };

    setEnviando(true);
    try {
      const resultado = await crearPedido(input);
      toast.success(resultado.mensaje || "Pedido creado.");
      const idPedido = resultado.pedido?.id_pedido;
      router.push(
        idPedido
          ? `/dashboard/pedidos/${encodeURIComponent(idPedido)}`
          : "/dashboard/pedidos",
      );
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 403) {
        router.replace("/dashboard");
        return;
      }
      toast.error(e instanceof Error ? e.message : "No se pudo crear el pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return {
    paso,
    pasosValidos,
    irA,
    avanzar,
    retroceder,

    consulta,
    setConsulta,
    resultados,
    buscando,
    producto,
    cargandoProducto,
    idVariante,
    variante,
    cantidad,
    maxCantidad,
    precioUnitario,
    total,
    elegirVariante,
    cambiarCantidad,
    limpiarProducto,
    seleccionarProducto,

    nombre,
    setNombre,
    apellido,
    setApellido,
    email,
    setEmail,
    telefono,
    setTelefono,

    departamentos,
    municipios,
    cargandoMunicipios,
    idDepartamento,
    cambiarDepartamento,
    idMunicipio,
    setIdMunicipio,
    calle,
    setCalle,
    observacion,
    setObservacion,
    nombreDepartamento,
    nombreMunicipio,

    emailValido,
    telefonoValido,
    productoValido,
    clienteValido,
    envioValido,

    enviando,
    enviar,
  };
}

export type NuevoPedidoController = ReturnType<typeof useNuevoPedido>;
