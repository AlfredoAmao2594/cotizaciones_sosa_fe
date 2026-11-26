import { useEffect, useState } from "react";

/** Devuelve el valor solo cuando deja de cambiar durante `ms` (evita una consulta al backend por tecla). */
export function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Página actual que vuelve a 0 cuando cambia `resetKey` (filtros, tamaño), como valor derivado y sin efectos.
 */
export function useResettablePage(resetKey: string): [number, (page: number) => void] {
  const [state, setState] = useState({ key: resetKey, page: 0 });
  // Ajuste durante el render (patrón recomendado por React): al cambiar la clave se descarta la página
  // guardada; así, si los filtros vuelven a un valor anterior, no reaparece una página vieja.
  if (state.key !== resetKey) {
    setState({ key: resetKey, page: 0 });
  }
  const page = state.key === resetKey ? state.page : 0;
  return [page, (p: number) => setState({ key: resetKey, page: Math.max(0, p) })];
}
