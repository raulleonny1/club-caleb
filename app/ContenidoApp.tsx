"use client";

import PaginaSecuestrada from "./PaginaSecuestrada";

/** Cambiar a false para restaurar toda la app (quitar pantalla ANONIMUS BLADE). */
export const PAGINA_SECUESTRADA_ACTIVA = false;

export default function ContenidoApp({ children }: { children: React.ReactNode }) {
  if (PAGINA_SECUESTRADA_ACTIVA) {
    return <PaginaSecuestrada />;
  }
  return children;
}
