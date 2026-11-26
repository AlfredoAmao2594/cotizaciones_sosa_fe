import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  createBanco,
  createCondicionPago,
  deleteBanco,
  deleteCondicionPago,
  getNumeracion,
  getPerfil,
  listBancos,
  listCondicionesPago,
  setBancoActivo,
  updateBanco,
  updateCondicionPago,
  updateNumeracion,
  updatePerfil,
  type BancoInput,
} from "../api/configuracion";
import { Modal } from "../components/Modal";
import { RowActionsMenu } from "../components/RowActionsMenu";
import { errorMessage } from "../lib/format";
import type { CuentaBancaria, Currency, EmisorPerfil, Numeracion } from "../types";

const inputBase = "w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm";
const input = `${inputBase} bg-white`;
const btnPrimary = "bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium rounded-md px-4 py-2.5";
const btnSecondary = "border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-sm font-medium rounded-md px-4 py-2.5";
const MONEDA_LABEL: Record<Currency, string> = { PEN: "Soles", USD: "Dólares" };

type Notice = { ok: boolean; text: string } | null;

/** Página de una opción de Configuraciones: volver, título, descripción y el contenido en un panel. */
function ConfigSubPage({ title, description, action, wide = false, children }: {
  title: string;
  description: string;
  action?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-4 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
      <Link to="/configuracion" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
        <span aria-hidden>←</span> Configuraciones
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <section className="bg-white border border-slate-200 rounded-xl p-5" aria-label={title}>
        {children}
      </section>
    </div>
  );
}

function OptionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-blue-50 text-blue-700 shrink-0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        className="w-6 h-6" aria-hidden>
        {children}
      </svg>
    </span>
  );
}

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p role="status" className={`text-sm rounded-md px-3 py-2 border ${notice.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {notice.text}
    </p>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}

/** Menú Configuraciones: una tarjeta por opción; cada una lleva a su propia página. */
export function ConfiguracionPage() {
  const { data: perfil } = useQuery({ queryKey: ["config", "perfil"], queryFn: getPerfil });
  const { data: bancos } = useQuery({ queryKey: ["config", "bancos"], queryFn: listBancos });
  const { data: condiciones } = useQuery({ queryKey: ["config", "condiciones-pago"], queryFn: listCondicionesPago });
  const { data: numeracion } = useQuery({ queryKey: ["config", "numeracion"], queryFn: getNumeracion });

  const opciones: { to: string; title: string; description: string; resumen?: string; icon: ReactNode }[] = [
    {
      to: "/configuracion/perfil",
      title: "Mi perfil",
      description: "RUC, razón social, dirección, correo de contacto y celular que salen en la cotización.",
      resumen: perfil ? `${perfil.razonSocial} · RUC ${perfil.ruc}` : undefined,
      icon: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    },
    {
      to: "/configuracion/bancos",
      title: "Mis bancos",
      description: "Cuentas bancarias del pie de la cotización. Solo aparecen las activas.",
      resumen: bancos ? `${bancos.filter((b) => b.activa).length} de ${bancos.length} cuentas activas` : undefined,
      icon: <path d="M3 21h18M4 10h16M5 10v8M9.5 10v8M14.5 10v8M19 10v8M12 3l9 5H3z" />,
    },
    {
      to: "/configuracion/condiciones-pago",
      title: "Condiciones de pago",
      description: "Opciones que eliges al crear una cotización: Contado, Crédito 30 días, ...",
      resumen: condiciones ? `${condiciones.length} ${condiciones.length === 1 ? "condición registrada" : "condiciones registradas"}` : undefined,
      icon: <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M7 15h3" />,
    },
    {
      to: "/configuracion/numeracion",
      title: "Serie y correlativo",
      description: "Definen el número de cada cotización; el correlativo aumenta con cada una.",
      resumen: numeracion ? `Próxima cotización: ${numeracion.siguienteNumero}` : undefined,
      icon: <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Configuraciones</h1>
        <p className="text-sm text-slate-500">Datos de tu empresa que aparecen en las cotizaciones.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {opciones.map((o) => (
          <Link key={o.to} to={o.to}
            className="group flex gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600 transition">
            <OptionIcon>{o.icon}</OptionIcon>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold group-hover:text-blue-800">{o.title}</span>
                <span aria-hidden className="text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition">→</span>
              </span>
              <span className="block text-sm text-slate-500 mt-0.5">{o.description}</span>
              {o.resumen && <span className="block text-xs font-medium text-slate-700 mt-2 truncate">{o.resumen}</span>}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------- Mi perfil ----------

export function PerfilConfigPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["config", "perfil"], queryFn: getPerfil });
  return (
    <ConfigSubPage title="Mi perfil" description="Datos del emisor que salen en la cabecera y en el recuadro EMISOR de la cotización.">
      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
      {error && <p className="text-sm text-red-700">{errorMessage(error, "No se pudo cargar el perfil")}</p>}
      {data && <PerfilForm perfil={data} />}
    </ConfigSubPage>
  );
}

function PerfilForm({ perfil }: { perfil: EmisorPerfil }) {
  const queryClient = useQueryClient();
  const inicial = {
    razonSocial: perfil.razonSocial,
    direccion: perfil.direccion ?? "",
    correo: perfil.correo ?? "",
    celular: perfil.celular ?? "",
  };
  const [form, setForm] = useState(inicial);
  const [notice, setNotice] = useState<Notice>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(inicial);

  const save = useMutation({
    mutationFn: () => updatePerfil({
      razonSocial: form.razonSocial.trim(),
      direccion: form.direccion.trim() || null,
      correo: form.correo.trim() || null,
      celular: form.celular.trim() || null,
    }),
    onSuccess: (p) => {
      queryClient.setQueryData(["config", "perfil"], p);
      setNotice({ ok: true, text: "Perfil actualizado. Las cotizaciones mostrarán estos datos." });
    },
    onError: (err) => setNotice({ ok: false, text: errorMessage(err, "No se pudo guardar el perfil") }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!form.razonSocial.trim()) return setNotice({ ok: false, text: "La razón social es obligatoria" });
    save.mutate();
  }

  const set = (patch: Partial<typeof form>) => {
    setNotice(null);
    setForm({ ...form, ...patch });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <Field label="RUC" hint="Registrado en el sistema; no se puede modificar.">
        <input value={perfil.ruc} readOnly aria-readonly className={`${inputBase} bg-slate-100 text-slate-600 cursor-not-allowed`} />
      </Field>
      <Field label="Razón social *">
        <input value={form.razonSocial} maxLength={200} onChange={(e) => set({ razonSocial: e.target.value })} className={input} />
      </Field>
      <Field label="Dirección">
        <input value={form.direccion} maxLength={255} onChange={(e) => set({ direccion: e.target.value })} className={input} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Correo de contacto">
          <input type="email" inputMode="email" value={form.correo} maxLength={120} onChange={(e) => set({ correo: e.target.value })} className={input} />
        </Field>
        <Field label="Celular">
          <input type="tel" inputMode="tel" value={form.celular} maxLength={30} onChange={(e) => set({ celular: e.target.value })} className={input} />
        </Field>
      </div>
      <NoticeLine notice={notice} />
      <div className="flex justify-end gap-2">
        {dirty && (
          <button type="button" onClick={() => setForm(inicial)} disabled={save.isPending} className={btnSecondary}>Descartar</button>
        )}
        <button type="submit" disabled={!dirty || save.isPending} className={btnPrimary}>
          {save.isPending ? "Guardando..." : "Guardar perfil"}
        </button>
      </div>
    </form>
  );
}

// ---------- Serie y correlativo ----------

export function NumeracionConfigPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["config", "numeracion"], queryFn: getNumeracion });
  return (
    <ConfigSubPage title="Serie y correlativo" description="Definen el número de la próxima cotización. Con cada cotización nueva el correlativo aumenta en 1.">
      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
      {error && <p className="text-sm text-red-700">{errorMessage(error, "No se pudo cargar la numeración")}</p>}
      {data && <NumeracionForm numeracion={data} />}
    </ConfigSubPage>
  );
}

function NumeracionForm({ numeracion }: { numeracion: Numeracion }) {
  const queryClient = useQueryClient();
  const [serie, setSerie] = useState(numeracion.serie);
  const [correlativo, setCorrelativo] = useState(String(numeracion.siguienteCorrelativo));
  const [notice, setNotice] = useState<Notice>(null);

  const serieOk = /^[A-Za-z0-9]{1,10}$/.test(serie.trim());
  const n = Number(correlativo);
  const correlativoOk = Number.isInteger(n) && n >= 1 && n <= 999999;
  const preview = serieOk && correlativoOk ? `${String(n).padStart(4, "0")}-${serie.trim().toUpperCase()}` : "—";
  const dirty = serie.trim().toUpperCase() !== numeracion.serie || n !== numeracion.siguienteCorrelativo;

  const save = useMutation({
    mutationFn: () => updateNumeracion(serie.trim(), n),
    onSuccess: (r) => {
      queryClient.setQueryData(["config", "numeracion"], r);
      setNotice({ ok: true, text: `Listo: la próxima cotización será la ${r.siguienteNumero}.` });
    },
    onError: (err) => setNotice({ ok: false, text: errorMessage(err, "No se pudo guardar la numeración") }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!serieOk) return setNotice({ ok: false, text: "La serie solo admite letras y números (máximo 10)" });
    if (!correlativoOk) return setNotice({ ok: false, text: "El correlativo debe ser un número entero mayor o igual a 1" });
    save.mutate();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Serie" hint="Ej. 2026">
          <input value={serie} maxLength={10} onChange={(e) => { setNotice(null); setSerie(e.target.value.replace(/[^A-Za-z0-9]/g, "")); }}
            className={`${input} uppercase`} />
        </Field>
        <Field label="Siguiente correlativo" hint="Ej. 26">
          <input type="number" inputMode="numeric" min={1} max={999999} step={1} value={correlativo}
            onChange={(e) => { setNotice(null); setCorrelativo(e.target.value); }} className={input} />
        </Field>
      </div>
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
        <p className="text-xs text-blue-900">Próxima cotización</p>
        <p className="text-2xl font-semibold text-blue-900 tabular-nums">{preview}</p>
      </div>
      <p className="text-xs text-slate-500">
        Al empezar un año nuevo, cambia la serie (p. ej. 2027) y vuelve el correlativo a 1.
      </p>
      <NoticeLine notice={notice} />
      <div className="flex justify-end">
        <button type="submit" disabled={!dirty || save.isPending} className={btnPrimary}>
          {save.isPending ? "Guardando..." : "Guardar numeración"}
        </button>
      </div>
    </form>
  );
}

// ---------- Mis bancos ----------

const emptyBanco: BancoInput = { banco: "", moneda: "PEN", numeroCuenta: "", cci: "" };

export function BancosConfigPage() {
  const queryClient = useQueryClient();
  const { data: bancos, isLoading, error } = useQuery({ queryKey: ["config", "bancos"], queryFn: listBancos });
  const [editing, setEditing] = useState<{ id: string | null; form: BancoInput } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["config", "bancos"] });

  const save = useMutation({
    mutationFn: ({ id, form }: { id: string | null; form: BancoInput }) => {
      const payload = { ...form, banco: form.banco.trim(), numeroCuenta: form.numeroCuenta.trim(), cci: form.cci?.trim() || undefined };
      return id ? updateBanco(id, payload) : createBanco(payload);
    },
    onSuccess: (b, { id }) => {
      setEditing(null);
      setNotice({ ok: true, text: id ? `Cuenta ${b.banco} actualizada` : `Cuenta ${b.banco} agregada${b.activa ? " y activa" : ""}` });
      refresh();
    },
    onError: (err) => setFormError(errorMessage(err, "No se pudo guardar la cuenta")),
  });
  const toggle = useMutation({
    mutationFn: (b: CuentaBancaria) => setBancoActivo(b.id, !b.activa),
    onSuccess: (b) => {
      setNotice({ ok: true, text: `${b.banco}: ${b.activa ? "activa, aparecerá en la cotización" : "desactivada, ya no aparecerá en la cotización"}` });
      refresh();
    },
    onError: (err) => setNotice({ ok: false, text: errorMessage(err, "No se pudo cambiar el estado") }),
  });
  const remove = useMutation({
    mutationFn: (b: CuentaBancaria) => deleteBanco(b.id),
    onSuccess: (_, b) => {
      setNotice({ ok: true, text: `Cuenta ${b.banco} eliminada` });
      refresh();
    },
    onError: (err) => setNotice({ ok: false, text: errorMessage(err, "No se pudo eliminar") }),
  });

  function open(id: string | null, form: BancoInput) {
    setFormError(null);
    setNotice(null);
    setEditing({ id, form });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const f = editing.form;
    if (!f.banco.trim()) return setFormError("Escribe el nombre del banco");
    if (!/^[0-9\s-]+$/.test(f.numeroCuenta.trim())) return setFormError("El número de cuenta solo admite números, espacios y guiones");
    if (f.cci?.trim() && !/^[0-9\s-]+$/.test(f.cci.trim())) return setFormError("El CCI solo admite números, espacios y guiones");
    setFormError(null);
    save.mutate(editing);
  }

  const activas = bancos?.filter((b) => b.activa).length ?? 0;
  const setForm = (patch: Partial<BancoInput>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });

  return (
    <ConfigSubPage
      wide
      title="Mis bancos"
      description="Cuentas que se imprimen al pie de la cotización. Solo aparecen las activas."
      action={<button onClick={() => open(null, { ...emptyBanco })} className={btnPrimary}>+ Agregar banco</button>}
    >
      <div className="space-y-3">
        <NoticeLine notice={notice} />
        {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
        {error && <p className="text-sm text-red-700">{errorMessage(error, "No se pudieron cargar los bancos")}</p>}
        {bancos && bancos.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">Aún no registras cuentas. Agrega la primera con “+ Agregar banco”.</p>
        )}
        {bancos && bancos.length > 0 && (
          <>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Banco</th>
                    <th className="px-3 py-2.5 font-medium">Moneda</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">N° de cuenta</th>
                    <th className="px-3 py-2.5 font-medium">CCI</th>
                    <th className="px-3 py-2.5 font-medium">En la cotización</th>
                    <th className="px-3 py-2.5 font-medium w-12"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bancos.map((b) => (
                    <tr key={b.id} className={b.activa ? "" : "text-slate-400"}>
                      <td className="px-3 py-2.5 font-medium">{b.banco}</td>
                      <td className="px-3 py-2.5">{MONEDA_LABEL[b.moneda]}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{b.numeroCuenta}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{b.cci ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={b.activa}
                          aria-label={`${b.activa ? "Desactivar" : "Activar"} ${b.banco} ${b.numeroCuenta}`}
                          onClick={() => toggle.mutate(b)}
                          disabled={toggle.isPending}
                          className="inline-flex items-center gap-2 py-1 disabled:opacity-60"
                        >
                          <span className={`relative inline-block w-9 h-5 rounded-full transition-colors ${b.activa ? "bg-green-600" : "bg-slate-300"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${b.activa ? "translate-x-4" : ""}`} />
                          </span>
                          <span className={`text-xs font-medium ${b.activa ? "text-green-700" : "text-slate-500"}`}>{b.activa ? "Activa" : "Inactiva"}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <RowActionsMenu
                          label={`Acciones de ${b.banco} ${b.numeroCuenta}`}
                          actions={[
                            { label: "Editar", onSelect: () => open(b.id, { banco: b.banco, moneda: b.moneda, numeroCuenta: b.numeroCuenta, cci: b.cci ?? "" }) },
                            {
                              label: "Eliminar",
                              danger: true,
                              onSelect: () => window.confirm(`¿Eliminar la cuenta ${b.banco} ${b.numeroCuenta}?`) && remove.mutate(b),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              {activas === 0 ? "Ninguna cuenta activa: el pie de la cotización saldrá sin cuentas." : `${activas} de ${bancos.length} activas en la cotización.`}
            </p>
          </>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? "Editar cuenta bancaria" : "Agregar banco"}
          size="md"
          onClose={() => !save.isPending && setEditing(null)}
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} disabled={save.isPending} className={btnSecondary}>Cancelar</button>
              <button type="submit" form="banco-form" disabled={save.isPending} className={btnPrimary}>
                {save.isPending ? "Guardando..." : editing.id ? "Guardar cambios" : "Agregar"}
              </button>
            </div>
          }
        >
          <form id="banco-form" onSubmit={submit} noValidate className="space-y-3">
            <Field label="Nombre del banco *">
              <input value={editing.form.banco} maxLength={60} placeholder="Ej. BCP, BBVA, Interbank" autoFocus
                onChange={(e) => setForm({ banco: e.target.value })} className={input} />
            </Field>
            <Field label="Moneda *">
              <select value={editing.form.moneda} onChange={(e) => setForm({ moneda: e.target.value as Currency })} className={input}>
                <option value="PEN">Soles</option>
                <option value="USD">Dólares</option>
              </select>
            </Field>
            <Field label="Número de cuenta *">
              <input value={editing.form.numeroCuenta} maxLength={40} inputMode="numeric" placeholder="Ej. 191-1234567-0-12"
                onChange={(e) => setForm({ numeroCuenta: e.target.value })} className={input} />
            </Field>
            <Field label="CCI (opcional)">
              <input value={editing.form.cci ?? ""} maxLength={40} inputMode="numeric"
                onChange={(e) => setForm({ cci: e.target.value })} className={input} />
            </Field>
            {editing.form.banco.trim() && editing.form.numeroCuenta.trim() && (
              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                <p className="font-medium mb-1">Así saldrá en la cotización:</p>
                <p>CTA {editing.form.banco.trim()} ({editing.form.moneda === "USD" ? "DÓLARES" : "SOLES"}): {editing.form.numeroCuenta.trim()}</p>
                {editing.form.cci?.trim() && (
                  <p>CCI {editing.form.banco.trim()} ({editing.form.moneda === "USD" ? "DÓLARES" : "SOLES"}): {editing.form.cci.trim()}</p>
                )}
              </div>
            )}
            {formError && <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">{formError}</p>}
          </form>
        </Modal>
      )}
    </ConfigSubPage>
  );
}

// ---------- Condiciones de pago ----------

export function CondicionesPagoConfigPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["config", "condiciones-pago"], queryFn: listCondicionesPago });
  const [nueva, setNueva] = useState("");
  const [editing, setEditing] = useState<{ id: string; nombre: string } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["config", "condiciones-pago"] });
  const fail = (fallback: string) => (err: unknown) => setNotice({ ok: false, text: errorMessage(err, fallback) });

  const create = useMutation({
    mutationFn: (nombre: string) => createCondicionPago(nombre),
    onSuccess: (c) => {
      setNueva("");
      setNotice({ ok: true, text: `“${c.nombre}” agregada` });
      refresh();
    },
    onError: fail("No se pudo agregar"),
  });
  const rename = useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) => updateCondicionPago(id, nombre),
    onSuccess: () => {
      setEditing(null);
      setNotice({ ok: true, text: "Condición de pago actualizada" });
      refresh();
    },
    onError: fail("No se pudo guardar"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteCondicionPago(id),
    onSuccess: () => {
      setNotice({ ok: true, text: "Condición de pago eliminada" });
      refresh();
    },
    onError: fail("No se pudo eliminar"),
  });

  function add(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (nueva.trim()) create.mutate(nueva.trim());
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (editing?.nombre.trim()) rename.mutate({ id: editing.id, nombre: editing.nombre.trim() });
  }

  return (
    <ConfigSubPage title="Condiciones de pago" description="Opciones que eliges al crear una cotización (Contado, Crédito 30 días, ...).">
      <div className="space-y-3">
        <form onSubmit={add} className="flex gap-2">
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={60} placeholder="Nueva condición, p. ej. Crédito 30 días"
            aria-label="Nueva condición de pago" className={`${input} flex-1 min-w-0`} />
          <button type="submit" disabled={!nueva.trim() || create.isPending} className={btnPrimary}>Agregar</button>
        </form>
        <NoticeLine notice={notice} />
        {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
        {error && <p className="text-sm text-red-700">{errorMessage(error, "No se pudieron cargar las condiciones")}</p>}
        {data && data.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Sin condiciones registradas.</p>}
        {data && data.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Condición de pago</th>
                  <th className="px-3 py-2.5 font-medium w-12"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((c) => (
                  <tr key={c.id}>
                    {editing?.id === c.id ? (
                      <td colSpan={2} className="px-3 py-2">
                        <form onSubmit={saveEdit} className="flex flex-wrap gap-2">
                          <input value={editing.nombre} maxLength={60} autoFocus aria-label="Nombre de la condición de pago"
                            onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                            onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                            className={`${input} flex-1 min-w-40`} />
                          <button type="submit" disabled={!editing.nombre.trim() || rename.isPending} className={btnPrimary}>Guardar</button>
                          <button type="button" onClick={() => setEditing(null)} className={btnSecondary}>Cancelar</button>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2.5">{c.nombre}</td>
                        <td className="px-3 py-2.5 text-right">
                          <RowActionsMenu
                            label={`Acciones de ${c.nombre}`}
                            actions={[
                              { label: "Editar", onSelect: () => { setNotice(null); setEditing({ id: c.id, nombre: c.nombre }); } },
                              { label: "Eliminar", danger: true, onSelect: () => window.confirm(`¿Eliminar “${c.nombre}”?`) && remove.mutate(c.id) },
                            ]}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ConfigSubPage>
  );
}
