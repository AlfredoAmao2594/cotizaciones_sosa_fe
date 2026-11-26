import type { ClienteInput } from "../types";

export interface ClienteFormState extends ClienteInput {
  mismoWhatsapp: boolean;
}

export function emptyCliente(ruc = "", razonSocial = "", direccion = ""): ClienteFormState {
  return {
    ruc, razonSocial, direccion, contactoNombre: "", telefono: "", whatsapp: "", correoEnvio: "",
    correosAdicionales: "", notas: "", mismoWhatsapp: true,
  };
}

/** Convierte el formulario en lo que espera la API: si el WhatsApp es el mismo número, se envía el teléfono. */
export function toClienteInput(f: ClienteFormState): ClienteInput {
  const { mismoWhatsapp, ...rest } = f;
  return { ...rest, whatsapp: mismoWhatsapp ? f.telefono : f.whatsapp };
}

const input = "w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm";

export function ClienteFields({
  value,
  onChange,
  rucEditable = false,
  showExtra = false,
  compact = false,
}: {
  value: ClienteFormState;
  onChange: (v: ClienteFormState) => void;
  rucEditable?: boolean;
  showExtra?: boolean;
  /** Formulario corto en 3 columnas (Nueva cotización): sin el RUC, que ya se escribió arriba. */
  compact?: boolean;
}) {
  const set = (patch: Partial<ClienteFormState>) => onChange({ ...value, ...patch });
  // En modo compacto se reordena: fila 1 razón social + correo, fila 2 dirección + número, fila 3 contacto + WhatsApp.
  const k = (normal: string, corto: string) => (compact ? corto : normal);

  return (
    <div className={k("grid grid-cols-1 sm:grid-cols-2 gap-3", "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-3 gap-y-2")}>
      <label className={k("block", "hidden")}>
        <span className="block text-xs font-medium text-slate-600 mb-1">RUC *</span>
        <input
          className={`${input} ${rucEditable ? "" : "bg-slate-100"}`}
          value={value.ruc}
          readOnly={!rucEditable}
          inputMode="numeric"
          maxLength={11}
          onChange={(e) => set({ ruc: e.target.value.replace(/\D/g, "") })}
        />
      </label>
      <label className={k("block", "block order-1 sm:col-span-2")}>
        <span className="block text-xs font-medium text-slate-600 mb-1">Razón social o nombre *</span>
        <input className={input} value={value.razonSocial} onChange={(e) => set({ razonSocial: e.target.value })} />
      </label>
      <label className={k("block sm:col-span-2", "block order-3 sm:col-span-2")}>
        <span className="block text-xs font-medium text-slate-600 mb-1">Dirección (sale en la cotización)</span>
        <input className={input} value={value.direccion ?? ""} placeholder="Se completa desde SUNAT si está disponible"
          onChange={(e) => set({ direccion: e.target.value })} />
      </label>
      <label className={k("block", "block order-5")}>
        <span className="block text-xs font-medium text-slate-600 mb-1">Nombre de contacto</span>
        <input className={input} value={value.contactoNombre} onChange={(e) => set({ contactoNombre: e.target.value })} />
      </label>
      <label className={k("block", "block order-4")}>
        <span className="block text-xs font-medium text-slate-600 mb-1">Número de contacto</span>
        <input
          className={input}
          type="tel"
          inputMode="tel"
          placeholder="987 654 321"
          value={value.telefono}
          onChange={(e) => set({ telefono: e.target.value })}
        />
      </label>
      <div className={k("sm:col-span-2", "order-6 sm:col-span-1 xl:col-span-2 self-end")}>
        <label className="inline-flex items-center gap-2 text-sm py-1">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={value.mismoWhatsapp}
            onChange={(e) => set({ mismoWhatsapp: e.target.checked })}
          />
          El WhatsApp es el mismo número de contacto
        </label>
        {!value.mismoWhatsapp && (
          <input
            className={`${input} mt-2`}
            type="tel"
            inputMode="tel"
            placeholder="Número de WhatsApp"
            aria-label="Número de WhatsApp"
            value={value.whatsapp}
            onChange={(e) => set({ whatsapp: e.target.value })}
          />
        )}
      </div>
      <label className={k("block sm:col-span-2", "block order-2 sm:col-span-2 xl:col-span-1")}>
        <span className="block text-xs font-medium text-slate-600 mb-1">Correo de envío * (aquí se envían las cotizaciones)</span>
        <input
          className={input}
          type="email"
          inputMode="email"
          value={value.correoEnvio}
          onChange={(e) => set({ correoEnvio: e.target.value })}
        />
      </label>
      {showExtra && (
        <>
          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Otros correos del cliente que pueden enviar la orden de compra o de servicio (separados por coma)
            </span>
            <input
              className={input}
              value={value.correosAdicionales}
              placeholder="logistica@empresa.com, gerencia@empresa.com"
              onChange={(e) => set({ correosAdicionales: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-slate-600 mb-1">Notas</span>
            <textarea className={input} rows={2} value={value.notas} onChange={(e) => set({ notas: e.target.value })} />
          </label>
        </>
      )}
    </div>
  );
}
