"use client";

import { AlertTriangle, Skull } from "lucide-react";

export default function PaginaSecuestrada() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black font-mono text-green-400">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)",
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full border-2 border-green-500/50 bg-green-950/40 p-5 shadow-[0_0_40px_rgba(34,197,94,0.25)]">
            <Skull className="h-14 w-14 text-green-400" strokeWidth={1.5} />
          </div>
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-green-600">
          /// acceso interceptado ///
        </p>

        <h1 className="mb-6 text-2xl font-black uppercase leading-tight tracking-wide text-green-300 sm:text-4xl">
          Esta página ha sido secuestrada por{" "}
          <span className="text-white underline decoration-green-500 decoration-2 underline-offset-4">
            ANONIMUS BLADE
          </span>
        </h1>

        <div className="mb-8 rounded-xl border border-green-500/40 bg-green-950/30 p-6 text-left shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
          <div className="mb-3 flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-bold uppercase tracking-wider">Mensaje del grupo</span>
          </div>
          <p className="text-sm leading-relaxed text-green-200/90 sm:text-base">
            Si deseas que te devolvamos los datos, te hemos enviado a{" "}
            <a
              href="mailto:raulleonny@hotmail.com"
              className="font-bold text-white underline decoration-green-500 hover:text-green-300"
            >
              raulleonny@hotmail.com
            </a>{" "}
            los pasos a seguir.
          </p>
        </div>

        <p className="text-[10px] uppercase tracking-[0.25em] text-green-700">
          ANONIMUS BLADE — we are legion
        </p>
      </div>
    </div>
  );
}
