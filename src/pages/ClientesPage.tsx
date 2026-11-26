import { useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  createCliente,
  deleteCliente,
  listClientes,
  lookupRuc,
  refreshClienteSunat,
  updateCliente,
  type ClienteSort,
} from "../api/clientes";
import { ClienteFields, emptyCliente, toClienteInput, type ClienteFormState } from "../components/ClienteFields";
import { Modal } from "../components/Modal";
import { RowActionsMenu } from "../components/RowActionsMenu";
import { Pagination } from "../components/Pagination";
import { SortHeader } from "../components/SortHeader";
import { errorMessage } from "../lib/format";
import { useDebounced, useResettablePage } from "../lib/useDebounced";
import type { Cliente } from "../types";

function fromCliente(c: Cliente): ClienteFormState {
  const mismo = !c.whatsapp || c.whatsapp === c.telefono;
  return {
    ruc: c.ruc,
    razonSocial: c.razonSocial,
    contactoNombre: c.contactoNombre ?? "",
    telefono: c.telefono ?? "",
    whatsapp: mismo ? "" : c.whatsapp ?? "",
    correoEnvio: c.correoEnvio,
    correosAdicionales: c.correosAdicionales ?? "",
    notas: c.notas ?? "",
    direccion: c.direccion ?? "",
    mismoWhatsapp: mismo,
  };
}

export function ClientesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [ruc, setRuc] = useState("");
  const [correo, setCorreo] = useState("");
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState<ClienteSort>("razonSocial");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const filters = useDebounced({ q: q.trim(), ruc, correo: correo.trim() });
  const [page, setPage] = useResettablePage(`${filters.q}|${filters.ruc}|${filters.correo}|${size}`);

  const [editing, setEditing] = useState<{ id: string | null; form: ClienteFormState; initial: string } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sunatHint, setSunatHint] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["clientes", filters, page, size, sort, dir],
    queryFn: () => listClientes({ ...filters, page, size, sort, dir }),
    placeholderData: keepPreviousData,
  });

  const done = (text: string) => {
    setMessage({ ok: true, text });
    queryClient.invalidateQueries({ queryKey: ["clientes"] });
  };
  const fail = (fallback: string) => (err: unknown) => setMessage({ ok: false, text: errorMessage(err, fallback) });

  const save = useMutation({
    mutationFn: () => {
      const input = toClienteInput(editing!.form);
      return editing!.id ? updateCliente(editing!.id, input) : createCliente(input);
    },
    onSuccess: (c) => {
      setEditing(null);
      done(`Cliente ${c.razonSocial} ${editing?.id ? "actualizado" : "registrado"}`);
    },
    onError: (err) => setFormError(errorMessage(err, "No se pudo guardar el cliente")),
  });
  const refresh = useMutation({ mutationFn: refreshClienteSunat, onSuccess: () => done("Datos de SUNAT actualizados"), onError: fail("No se pudo consultar SUNAT") });
  const remove = useMutation({
    mutationFn: deleteCliente,
    onSuccess: () => {
      // Si se borró el único cliente de la última página, retrocede una.
      if (page > 0 && data?.content.length === 1) setPage(page - 1);
      done("Cliente eliminado");
    },
    onError: fail("No se pudo eliminar"),
  });

  function onSort(column: ClienteSort) {
    if (sort === column) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(column);
      setDir("asc");
    }
    setPage(0);
  }

  function openForm(id: string | null, form: ClienteFormState) {
    setEditing({ id, form, initial: JSON.stringify(form) });
    setSunatHint(null);
    setFormError(null);
    setMessage(null);
  }

  function closeForm() {
    if (!editing || save.isPending) return;
    const dirty = JSON.stringify(editing.form) !== editing.initial;
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")) return;
    setEditing(null);
  }

  function submitForm(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const f = editing.form;
    if (!/^\d{11}$/.test(f.ruc)) return setFormError("El RUC debe tener 11 dígitos");
    if (!f.razonSocial.trim()) return setFormError("Escribe la razón social o nombre");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.correoEnvio.trim())) return setFormError("Escribe un correo de envío válido");
    setFormError(null);
    save.mutate();
  }

  async function autocompletar() {
    if (!editing || !/^\d{11}$/.test(editing.form.ruc)) {
      setSunatHint("Escribe un RUC de 11 dígitos");
      return;
    }
    try {
      const r = await lookupRuc(editing.form.ruc);
      if (r.registrado) setSunatHint("Este RUC ya está registrado como cliente");
      else if (r.sunat) {
        setEditing({ ...editing, form: { ...editing.form, razonSocial: r.sunat.razonSocial } });
        setSunatHint("Razón social completada desde SUNAT");
      } else setSunatHint(r.sunatDisponible ? "SUNAT no devolvió datos para este RUC" : "Consulta a SUNAT no configurada: escribe la razón social");
    } catch (err) {
      setSunatHint(errorMessage(err));
    }
  }

  const hasFilters = !!(q || ruc || correo);
  const rows = data?.content ?? [];
  const input = "w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <button onClick={() => openForm(null, emptyCliente())} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-md px-4 py-2.5">
          + Nuevo cliente
        </button>
      </div>

      {message && (
        <p role="status" className={`text-sm rounded-md px-3 py-2 border ${message.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {message.text}
        </p>
      )}

      {editing && (
        <Modal
          title={editing.id ? `Editar cliente · ${editing.form.razonSocial || editing.form.ruc}` : "Nuevo cliente"}
          onClose={closeForm}
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={closeForm} disabled={save.isPending}
                className="border border-slate-300 hover:bg-slate-50 text-sm font-medium rounded-md px-4 py-2.5 disabled:opacity-60">
                Cancelar
              </button>
              <button type="submit" form="cliente-form" disabled={save.isPending}
                className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium rounded-md px-4 py-2.5">
                {save.isPending ? "Guardando..." : editing.id ? "Guardar cambios" : "Registrar cliente"}
              </button>
            </div>
          }
        >
          <form id="cliente-form" onSubmit={submitForm} noValidate className="space-y-4">
            {!editing.id && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                <p className="text-xs text-slate-600">{sunatHint ?? "Escribe el RUC y completa la razón social desde SUNAT, o escríbela a mano."}</p>
                <button type="button" onClick={autocompletar} className="text-sm text-blue-700 font-medium py-1.5">Completar desde SUNAT</button>
              </div>
            )}
            <ClienteFields value={editing.form} onChange={(form) => setEditing({ ...editing, form })} rucEditable={!editing.id} showExtra />
            {formError && (
              <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">{formError}</p>
            )}
          </form>
        </Modal>
      )}

      {/* Filtros (se aplican en el servidor) */}
      <section aria-label="Filtros" className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-end">
        <label className="block lg:col-span-5">
          <span className="block text-xs font-medium text-slate-600 mb-1">Buscar</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Razón social, contacto, correo o teléfono" className={input} />
        </label>
        <label className="block lg:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">RUC</span>
          <input value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, "").slice(0, 11))} inputMode="numeric" placeholder="Empieza con…" className={input} />
        </label>
        <label className="block lg:col-span-3">
          <span className="block text-xs font-medium text-slate-600 mb-1">Correo</span>
          <input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="@empresa.com" className={input} />
        </label>
        <div className="lg:col-span-2 flex items-end">
          <button
            type="button"
            disabled={!hasFilters}
            onClick={() => { setQ(""); setRuc(""); setCorreo(""); }}
            className="w-full border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-sm rounded-md px-3 py-2.5"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {isError && <p className="text-sm text-red-700">{errorMessage(error, "No se pudo cargar la lista de clientes")}</p>}

      <div className={`bg-white border border-slate-200 rounded-xl transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Clientes registrados</caption>
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <SortHeader label="RUC" column="ruc" sort={sort} dir={dir} onSort={onSort} />
                <SortHeader label="Razón social" column="razonSocial" sort={sort} dir={dir} onSort={onSort} />
                <th className="px-4 py-2 font-medium">Contacto</th>
                <th className="px-4 py-2 font-medium">WhatsApp</th>
                <SortHeader label="Correo de envío" column="correoEnvio" sort={sort} dir={dir} onSort={onSort} />
                <th className="px-4 py-2 font-medium text-right">Cotizaciones</th>
                <th className="px-2 py-2 font-medium text-center w-16 sticky right-0 bg-slate-50 shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    {hasFilters ? "Ningún cliente coincide con los filtros." : "Aún no hay clientes registrados."}
                  </td>
                </tr>
              )}
              {rows.map(({ cliente: c, cotizaciones }) => (
                <tr key={c.id} className="group border-t border-slate-100 hover:bg-slate-50 align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{c.ruc}</td>
                  <td className="px-4 py-2.5 min-w-48">
                    <span className="block font-medium">{c.razonSocial}</span>
                    {c.estadoSunat && <span className="block text-xs text-slate-500">{c.estadoSunat}</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="block">{c.contactoNombre ?? "—"}</span>
                    {c.telefono && <span className="block text-xs text-slate-500">{c.telefono}</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {c.whatsapp ?? "—"}
                    {c.whatsapp && c.whatsapp === c.telefono && <span className="block text-xs text-slate-500">mismo número</span>}
                  </td>
                  <td className="px-4 py-2.5 break-all min-w-48">{c.correoEnvio}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{cotizaciones}</td>
                  <td className="px-2 py-1 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]">
                    <RowActionsMenu
                      label={`Acciones para ${c.razonSocial}`}
                      actions={[
                        { label: "Nueva cotización", onSelect: () => navigate(`/cotizaciones/nueva?ruc=${c.ruc}`) },
                        { label: "Ver sus cotizaciones", onSelect: () => navigate(`/cotizaciones?q=${c.ruc}`), disabled: cotizaciones === 0 },
                        { label: "Editar", onSelect: () => openForm(c.id, fromCliente(c)) },
                        { label: "Actualizar datos SUNAT", onSelect: () => refresh.mutate(c.id) },
                        {
                          label: cotizaciones > 0 ? "Eliminar (tiene cotizaciones)" : "Eliminar",
                          danger: true,
                          disabled: cotizaciones > 0,
                          onSelect: () => window.confirm(`¿Eliminar a ${c.razonSocial}? Esta acción no se puede deshacer.`) && remove.mutate(c.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && <Pagination data={data} size={size} onPage={setPage} onSize={setSize} />}
      </div>
    </div>
  );
}
