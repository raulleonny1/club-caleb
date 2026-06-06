"use client";

import React, { useState } from "react";
import { ExternalLink, Trophy } from "lucide-react";

type Props = {
  etiqueta?: string;
  titulo: string;
  descripcion?: string;
  textoBoton?: string;
  /** Enlace opcional de material (no se abre al aceptar; aparece aparte). */
  urlBoton?: string;
  textoEnlaceMaterial?: string;
  mostrarIconoFondo?: boolean;
  onAceptar?: () => void | Promise<void>;
  aceptado?: boolean;
  textoAceptado?: string;
};

export default function RetoEspecialCard({
  etiqueta = "Reto Especial",
  titulo,
  descripcion,
  textoBoton = "¡Aceptar Reto!",
  urlBoton,
  textoEnlaceMaterial = "Ver material del reto",
  mostrarIconoFondo = true,
  onAceptar,
  aceptado = false,
  textoAceptado = "¡Reto aceptado!",
}: Props) {
  const [procesando, setProcesando] = useState(false);

  const botonClass =
    "flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-white px-4 py-3.5 text-center text-xs font-black uppercase tracking-[0.15em] text-indigo-900 shadow-lg transition hover:bg-indigo-50 active:scale-[0.98] disabled:opacity-70 sm:text-sm";

  const enlaceClass =
    "mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-white transition hover:bg-white/20";

  const handleAceptar = async () => {
    if (procesando || aceptado) return;
    setProcesando(true);
    try {
      await onAceptar?.();
    } finally {
      setProcesando(false);
    }
  };

  const urlMaterial = urlBoton?.trim();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-violet-600 via-indigo-700 to-slate-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:rounded-[2.5rem] sm:p-8">
      {mostrarIconoFondo && (
        <div className="pointer-events-none absolute -right-4 bottom-0 top-0 flex items-center opacity-[0.1] sm:-right-2">
          <Trophy className="h-36 w-36 shrink-0 text-white sm:h-44 sm:w-44" strokeWidth={1.15} />
        </div>
      )}
      <div className="relative z-10">
        <span className="mb-3 inline-block rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/95">
          {etiqueta}
        </span>
        <h4 className="mb-3 text-xl font-black leading-snug tracking-tight text-balance sm:text-2xl md:text-3xl">
          {titulo}
        </h4>
        {descripcion?.trim() ? (
          <p className="mb-6 text-sm font-medium text-white/85 leading-relaxed">{descripcion}</p>
        ) : (
          <div className="mb-6" />
        )}
        {aceptado ? (
          <div className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 border-emerald-300/80 bg-emerald-500/90 px-4 py-3.5 text-center text-xs font-black uppercase tracking-[0.15em] text-white shadow-lg sm:text-sm">
            ✓ {textoAceptado}
          </div>
        ) : (
          <button
            type="button"
            className={botonClass}
            onClick={handleAceptar}
            disabled={procesando}
          >
            {procesando ? "Registrando…" : textoBoton}
          </button>
        )}
        {urlMaterial ? (
          <a
            href={urlMaterial}
            target="_blank"
            rel="noopener noreferrer"
            className={enlaceClass}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {textoEnlaceMaterial}
          </a>
        ) : null}
      </div>
    </div>
  );
}
