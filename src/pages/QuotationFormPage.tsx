import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { lookupRuc } from "../api/clientes";
import { getNumeracion, listCondicionesPago } from "../api/configuracion";
import { createQuotation, type QuotationItemPayload } from "../api/quotations";
import { ClienteFields, emptyCliente, toClienteInput, type ClienteFormState } from "../components/ClienteFields";
import { errorMessage, money } from "../lib/format";
import type { Currency, RucLookup } from "../types";

const IGV_RATE = 0.18;
const UNIDADES = ["UNIDAD", "SERVICIO", "GLB", "M2", "ML", "M3", "HORA", "DÍA", "KG", "JUEGO"];

/** Ítem en edición: uid solo sirve como key estable de React (no se envía). */
type ItemRow = QuotationItemPayload & { uid: number };
let nextUid = 1;
const newItem = (): ItemRow => ({ uid: nextUid++, descripcion: "", cantidad: 1, unidad: "UNIDAD", codigo: "", precioUnitario: 0 });

const field = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white";
const cell = "w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white focus:border-blue-500";
const label = "block text-xs font-medium text-slate-600 mb-1";
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Igual que TaxCalculator del backend: con IGV incluido el total es exacto y el IGV se desglosa. */
function calcular(suma: number, incluyeIgv: boolean) {
  if (incluyeIgv) {
    const total = round2(suma);
    const subtotal = round2(total / (1 + IGV_RATE));
    return { subtotal, igv: round2(total - subtotal), total };
  }
  const subtotal = round2(suma);
  const igv = round2(subtotal * IGV_RATE);
  return { subtotal, igv, total: round2(subtotal + igv) };
}

export function QuotationFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [ruc, setRuc] = useState(searchParams.get("ruc")?.replace(/\D/g, "").slice(0, 11) ?? "");
  const [lookup, setLookup] = useState<RucLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [nuevo, setNuevo] = useState<ClienteFormState>(emptyCliente());

  const [moneda, setMoneda] = useState<Currency>("PEN");
  const [validezDias, setValidezDias] = useState(3);
  const [condicionPago, setCondicionPago] = useState("Crédito");
  const { data: listaCondiciones } = useQuery({ queryKey: ["config", "condiciones-pago"], queryFn: listCondicionesPago });
  const { data: numeracion } = useQuery({ queryKey: ["config", "numeracion"], queryFn: getNumeracion });
  // Opciones de Configuraciones; si la elegida ya no existe, se usa la primera.
  const opcionesPago = listaCondiciones?.map((c) => c.nombre) ?? [];
  const condicionElegida = opcionesPago.length === 0 || opcionesPago.includes(condicionPago) ? condicionPago : opcionesPago[0];
  const [incluyeIgv, setIncluyeIgv] = useState(true);
  const [condiciones, setCondiciones] = useState("");
  const [verObservaciones, setVerObservaciones] = useState(false);
  const [items, setItems] = useState<ItemRow[]>(() => [newItem()]);
  const [formError, setFormError] = useState<string | null>(null);

  const suma = items.reduce((acc, i) => acc + (i.cantidad || 0) * (i.precioUnitario || 0), 0);
  const { subtotal, igv, total } = calcular(suma, incluyeIgv);

  async function buscar(e?: FormEvent) {
    e?.preventDefault();
    setLookupError(null);
    if (!/^\d{11}$/.test(ruc)) {
      setLookupError("El RUC debe tener 11 dígitos");
      return;
    }
    setSearching(true);
    try {
      const r = await lookupRuc(ruc);
      setLookup(r);
      if (!r.registrado) setNuevo(emptyCliente(ruc, r.sunat?.razonSocial ?? "", r.sunat?.direccion ?? ""));
    } catch (err) {
      setLookupError(errorMessage(err, "No se pudo consultar el RUC"));
    } finally {
      setSearching(false);
    }
  }

  // Viene desde "Cotizar" en Clientes: busca el RUC automáticamente una vez.
  const autoSearched = useRef(false);
  useEffect(() => {
    if (!autoSearched.current && /^\d{11}$/.test(ruc)) {
      autoSearched.current = true;
      buscar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al agregar un ítem: se enfoca su descripción y la lista se desplaza dentro de su propio recuadro.
  const focusUid = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusUid.current === null) return;
    const targets = listRef.current?.querySelectorAll<HTMLTextAreaElement>(`[data-uid="${focusUid.current}"] textarea`) ?? [];
    focusUid.current = null;
    // Hay una versión tabla y otra en tarjetas; se enfoca la que está visible.
    const el = [...targets].find((t) => t.offsetParent !== null);
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }, [items.length]);

  function agregarItem() {
    const item = newItem();
    focusUid.current = item.uid;
    setItems((prev) => [...prev, item]);
  }

  /** Enter en el precio del último ítem agrega una fila nueva (captura rápida con teclado). */
  function onPrecioKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter" && index === items.length - 1) {
      e.preventDefault();
      agregarItem();
    }
  }

  const create = useMutation({
    mutationFn: (enviar: boolean) =>
      createQuotation({
        ruc,
        nuevoCliente: lookup && !lookup.registrado ? toClienteInput(nuevo) : undefined,
        moneda,
        validezDias,
        condicionPago: condicionElegida.trim() || "Contado",
        preciosIncluyenIgv: incluyeIgv,
        condiciones: condiciones.trim() || undefined,
        items: items.map(({ uid: _uid, ...i }) => ({
          ...i,
          descripcion: i.descripcion.trim(),
          unidad: i.unidad?.trim().toUpperCase() || "UNIDAD",
          codigo: i.codigo?.trim() || undefined,
        })),
        enviar,
      }),
    onSuccess: ({ cotizacion, envio }) => {
      queryClient.invalidateQueries();
      navigate(`/casos/${cotizacion.id}`, { state: { envio } });
    },
    onError: (err) => setFormError(errorMessage(err, "No se pudo guardar la cotización")),
  });

  function submit(enviar: boolean) {
    setFormError(null);
    if (!lookup) return setFormError("Primero busca el RUC del cliente");
    if (!lookup.registrado && (!nuevo.razonSocial.trim() || !nuevo.correoEnvio.trim()))
      return setFormError("Completa la razón social y el correo de envío del cliente");
    const malo = items.findIndex((i) => !i.descripcion.trim() || !(i.cantidad > 0));
    if (malo >= 0) return setFormError(`El ítem ${malo + 1} necesita descripción y cantidad mayor a 0`);
    if (!(validezDias >= 1 && validezDias <= 365)) return setFormError("La validez debe estar entre 1 y 365 días");
    create.mutate(enviar);
  }

  const updateItem = (uid: number, patch: Partial<QuotationItemPayload>) =>
    setItems((prev) => prev.map((it) => (it.uid === uid ? { ...it, ...patch } : it)));
  const quitarItem = (uid: number) => setItems((prev) => prev.filter((it) => it.uid !== uid));

  const correoDestino = lookup?.registrado ? lookup.cliente?.correoEnvio : nuevo.correoEnvio;
  const precioLabel = `P. unit. ${incluyeIgv ? "con" : "sin"} IGV`;
  const importe = (i: ItemRow) => money(round2((i.cantidad || 0) * (i.precioUnitario || 0)), moneda);
  const conObservaciones = verObservaciones || condiciones !== "";

  return (
    <div className="max-w-7xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold">Nueva cotización</h1>
        {numeracion && (
          <p className="text-sm text-slate-600">
            N° <span className="font-semibold tabular-nums text-blue-800">{numeracion.siguienteNumero}</span>
            <Link to="/configuracion/numeracion" className="ml-2 text-xs text-blue-700 hover:underline">cambiar</Link>
          </p>
        )}
      </div>

      {/* ---------- Cliente + condiciones (bloque compacto) ---------- */}
      <section aria-label="Cliente y condiciones" className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <form onSubmit={buscar} className="flex gap-2 w-full sm:w-auto sm:min-w-80">
            <label className="sr-only" htmlFor="ruc-cliente">RUC del cliente</label>
            <input
              id="ruc-cliente"
              value={ruc}
              onChange={(e) => {
                setRuc(e.target.value.replace(/\D/g, ""));
                setLookup(null);
              }}
              inputMode="numeric"
              maxLength={11}
              placeholder="RUC del cliente (11 dígitos)"
              className={`${field} flex-1 min-w-0`}
            />
            <button type="submit" disabled={searching} className="bg-slate-800 text-white text-sm font-medium rounded-md px-4 py-2 disabled:opacity-60">
              {searching ? "Buscando..." : "Buscar"}
            </button>
          </form>
          {lookup?.registrado && lookup.cliente && (
            <p className="flex-1 min-w-0 text-sm bg-green-50 border border-green-200 rounded-md px-3 py-2 truncate"
              title={`${lookup.cliente.razonSocial} · ${lookup.cliente.correoEnvio}`}>
              <span className="font-medium">{lookup.cliente.razonSocial}</span>
              <span className="text-slate-600"> · {lookup.cliente.correoEnvio}</span>
            </p>
          )}
          {lookup && !lookup.registrado && (
            <p className="flex-1 min-w-0 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              RUC nuevo: el cliente se registrará al guardar.{" "}
              {lookup.sunat
                ? "Datos completados desde SUNAT."
                : lookup.sunatDisponible
                  ? "SUNAT no devolvió datos; escribe la razón social."
                  : "Escribe la razón social (consulta SUNAT no configurada)."}
            </p>
          )}
          {!lookup && !lookupError && <p className="text-xs text-slate-500">Busca el RUC para cargar o registrar al cliente.</p>}
        </div>
        {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
        {lookup && !lookup.registrado && <ClienteFields value={nuevo} onChange={setNuevo} compact />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 items-end">
          <label className="block">
            <span className={label}>Moneda</span>
            <select value={moneda} onChange={(e) => setMoneda(e.target.value as Currency)} className={field}>
              <option value="PEN">Soles (PEN)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </label>
          <label className="block">
            <span className={label}>Validez de oferta (días)</span>
            <input type="number" inputMode="numeric" min={1} max={365} value={validezDias}
              onChange={(e) => setValidezDias(Number(e.target.value))} className={field} />
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between gap-2">
              <span className={label}>Condición de pago</span>
              <Link to="/configuracion/condiciones-pago" className="text-[11px] text-blue-700 hover:underline">administrar</Link>
            </span>
            {opcionesPago.length > 0 ? (
              <select value={condicionElegida} onChange={(e) => setCondicionPago(e.target.value)} className={field}>
                {opcionesPago.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input value={condicionPago} onChange={(e) => setCondicionPago(e.target.value)} maxLength={60} className={field} />
            )}
          </label>
          <label className="inline-flex items-center gap-2 text-sm py-2">
            <input type="checkbox" className="w-4 h-4" checked={incluyeIgv} onChange={(e) => setIncluyeIgv(e.target.checked)} />
            Los precios incluyen IGV
          </label>
        </div>
      </section>

      {/* ---------- Ítems (ancho completo; la lista se desplaza dentro de su recuadro) ---------- */}
      <section aria-labelledby="sec-items" className="@container bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200">
          <h2 id="sec-items" className="text-sm font-semibold">
            Ítems <span className="font-normal text-slate-500">({items.length})</span>
          </h2>
          <button type="button" onClick={agregarItem} className="text-blue-700 text-sm font-medium py-1 hover:underline">
            + Agregar ítem
          </button>
        </div>

        <datalist id="unidades">
          {UNIDADES.map((u) => <option key={u} value={u} />)}
        </datalist>

        <div ref={listRef} className="max-h-[50vh] @3xl:max-h-[calc(100vh-25rem)] min-h-32 overflow-y-auto overscroll-contain">
          {/* Ancho suficiente: tabla de una fila por ítem */}
          <table className="hidden @3xl:table w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-600 shadow-[0_1px_0_0_var(--color-slate-200)]">
              <tr>
                <th className="pl-4 pr-1 py-2 font-medium w-8">N°</th>
                <th className="px-1 py-2 font-medium">Descripción</th>
                <th className="px-1 py-2 font-medium w-20">Cant.</th>
                <th className="px-1 py-2 font-medium w-28">Unidad</th>
                <th className="px-1 py-2 font-medium w-28">Código</th>
                <th className="px-1 py-2 font-medium w-32 whitespace-nowrap">{precioLabel}</th>
                <th className="px-1 py-2 font-medium w-28 text-right">Importe</th>
                <th className="pl-1 pr-3 py-2 w-9"><span className="sr-only">Quitar</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={item.uid} data-uid={item.uid} className="align-top">
                  <td className="pl-4 pr-1 py-2 pt-3.5 text-slate-500 tabular-nums">{index + 1}</td>
                  <td className="px-1 py-2">
                    <textarea rows={1} maxLength={1000} value={item.descripcion} aria-label={`Descripción del ítem ${index + 1}`}
                      placeholder="Ej. Instalación de 4 cámaras de seguridad con DVR"
                      onChange={(e) => updateItem(item.uid, { descripcion: e.target.value })}
                      className={`${cell} resize-none field-sizing-content min-h-9 max-h-32`} />
                  </td>
                  <td className="px-1 py-2">
                    <input type="number" inputMode="decimal" min={0.01} step={0.01} value={item.cantidad} aria-label={`Cantidad del ítem ${index + 1}`}
                      onChange={(e) => updateItem(item.uid, { cantidad: Number(e.target.value) })} className={`${cell} text-right`} />
                  </td>
                  <td className="px-1 py-2">
                    <input list="unidades" maxLength={30} value={item.unidad ?? ""} aria-label={`Unidad del ítem ${index + 1}`}
                      onChange={(e) => updateItem(item.uid, { unidad: e.target.value })} className={cell} />
                  </td>
                  <td className="px-1 py-2">
                    <input maxLength={50} value={item.codigo ?? ""} placeholder="—" aria-label={`Código del ítem ${index + 1}`}
                      onChange={(e) => updateItem(item.uid, { codigo: e.target.value })} className={cell} />
                  </td>
                  <td className="px-1 py-2">
                    <input type="number" inputMode="decimal" min={0} step={0.01} value={item.precioUnitario}
                      aria-label={`${precioLabel} del ítem ${index + 1}`}
                      onChange={(e) => updateItem(item.uid, { precioUnitario: Number(e.target.value) })}
                      onKeyDown={(e) => onPrecioKeyDown(e, index)} className={`${cell} text-right`} />
                  </td>
                  <td className="px-1 py-2 pt-3.5 text-right tabular-nums whitespace-nowrap">{importe(item)}</td>
                  <td className="pl-1 pr-3 py-2 pt-2.5">
                    <button type="button" onClick={() => quitarItem(item.uid)} disabled={items.length === 1}
                      aria-label={`Quitar ítem ${index + 1}`} title="Quitar ítem"
                      className="w-7 h-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pantalla angosta: tarjeta compacta por ítem */}
          <ul className="@3xl:hidden divide-y divide-slate-100">
            {items.map((item, index) => (
              <li key={item.uid} data-uid={item.uid} className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-slate-500 pt-2 w-5 tabular-nums">{index + 1}</span>
                  <textarea rows={1} maxLength={1000} value={item.descripcion} aria-label={`Descripción del ítem ${index + 1}`}
                    placeholder="Descripción"
                    onChange={(e) => updateItem(item.uid, { descripcion: e.target.value })}
                    className={`${cell} resize-none field-sizing-content min-h-9 max-h-32 flex-1`} />
                  <button type="button" onClick={() => quitarItem(item.uid)} disabled={items.length === 1}
                    aria-label={`Quitar ítem ${index + 1}`} className="w-8 h-9 text-slate-400 hover:text-red-600 disabled:opacity-30">✕</button>
                </div>
                <div className="grid grid-cols-2 @md:grid-cols-5 gap-2 pl-7">
                  <label className="block"><span className="block text-[11px] text-slate-500">Cant.</span>
                    <input type="number" inputMode="decimal" min={0.01} step={0.01} value={item.cantidad}
                      onChange={(e) => updateItem(item.uid, { cantidad: Number(e.target.value) })} className={cell} />
                  </label>
                  <label className="block"><span className="block text-[11px] text-slate-500">Unidad</span>
                    <input list="unidades" maxLength={30} value={item.unidad ?? ""}
                      onChange={(e) => updateItem(item.uid, { unidad: e.target.value })} className={cell} />
                  </label>
                  <label className="block"><span className="block text-[11px] text-slate-500">Código</span>
                    <input maxLength={50} value={item.codigo ?? ""}
                      onChange={(e) => updateItem(item.uid, { codigo: e.target.value })} className={cell} />
                  </label>
                  <label className="block"><span className="block text-[11px] text-slate-500">{precioLabel}</span>
                    <input type="number" inputMode="decimal" min={0} step={0.01} value={item.precioUnitario}
                      onChange={(e) => updateItem(item.uid, { precioUnitario: Number(e.target.value) })}
                      onKeyDown={(e) => onPrecioKeyDown(e, index)} className={cell} />
                  </label>
                  <p className="col-span-2 @md:col-span-1 text-right text-sm font-medium tabular-nums self-end pb-1.5">{importe(item)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {conObservaciones ? (
              <span className="text-xs font-medium text-slate-600">Observaciones (salen debajo del detalle)</span>
            ) : (
              <button type="button" onClick={() => setVerObservaciones(true)} className="text-sm text-blue-700 hover:underline">
                + Agregar observaciones
              </button>
            )}
            <span className="hidden @3xl:inline text-xs text-slate-400">Enter en el precio del último ítem agrega otro</span>
          </div>
          {conObservaciones && (
            <textarea rows={2} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} autoFocus={verObservaciones && !condiciones}
              aria-label="Observaciones" placeholder="Ej. Incluye materiales y mano de obra. Garantía de 6 meses." className={`${field} resize-y`} />
          )}
        </div>
      </section>

      {/* ---------- Barra fija: totales y acciones siempre visibles ---------- */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-3 z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg px-4 py-3">
        {formError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-1.5 mb-2">{formError}</p>}
        <div className="flex items-center justify-between gap-x-6 gap-y-2 sm:flex-wrap">
          <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
            <div className="hidden sm:flex gap-1.5"><dt className="text-slate-500">Sin IGV</dt><dd className="tabular-nums">{money(subtotal, moneda)}</dd></div>
            <div className="hidden sm:flex gap-1.5"><dt className="text-slate-500">IGV (18%)</dt><dd className="tabular-nums">{money(igv, moneda)}</dd></div>
            <div className="flex gap-1.5 items-baseline whitespace-nowrap"><dt className="font-medium">Total</dt><dd className="text-lg font-semibold tabular-nums">{money(total, moneda)}</dd></div>
          </dl>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={() => submit(false)} disabled={create.isPending}
              className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-sm font-medium rounded-md px-3 sm:px-4 py-2.5 whitespace-nowrap">
              <span className="sm:hidden">Borrador</span>
              <span className="hidden sm:inline">Guardar borrador</span>
            </button>
            <button type="button" onClick={() => submit(true)} disabled={create.isPending}
              title={correoDestino ? `Se enviará a ${correoDestino}` : undefined}
              className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium rounded-md px-3 sm:px-4 py-2.5 whitespace-nowrap">
              {create.isPending ? "Generando..." : (<><span className="sm:hidden">Enviar</span><span className="hidden sm:inline">Generar y enviar</span></>)}
            </button>
          </div>
        </div>
        {correoDestino && <p className="hidden sm:block text-xs text-slate-500 mt-1 truncate text-right">Se enviará a {correoDestino}</p>}
      </div>
    </div>
  );
}
