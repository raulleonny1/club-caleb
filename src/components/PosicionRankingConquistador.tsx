"use client";

import { Crown, Medal, Sparkles, Trophy } from "lucide-react";
import type { PosicionRankingConquistador } from "@/src/lib/rankingConquistadores";

type Props = {
  posicion: PosicionRankingConquistador | null;
  cargando?: boolean;
  unidad?: string;
};

const PODIO = {
  1: {
    emoji: "🥇",
    label: "¡1.er lugar del club!",
    ring: "ring-amber-300/80",
    grad: "from-amber-400 via-yellow-500 to-orange-500",
    glow: "shadow-amber-400/50",
  },
  2: {
    emoji: "🥈",
    label: "¡2.º lugar del club!",
    ring: "ring-slate-300/80",
    grad: "from-slate-300 via-slate-400 to-slate-500",
    glow: "shadow-slate-400/40",
  },
  3: {
    emoji: "🥉",
    label: "¡3.er lugar del club!",
    ring: "ring-orange-300/70",
    grad: "from-orange-300 via-amber-600 to-orange-700",
    glow: "shadow-orange-400/40",
  },
} as const;

export default function PosicionRankingConquistador({ posicion, cargando, unidad }: Props) {
  if (cargando) {
    return (
      <div className="mb-6 rounded-[2rem] border border-white/30 bg-white/10 px-6 py-4 text-center text-sm font-semibold text-white/80 backdrop-blur-md">
        Calculando tu posición en el ranking…
      </div>
    );
  }

  if (!posicion) return null;

  const podio = posicion.podio ? PODIO[posicion.podio] : null;

  return (
    <section
      className={`relative mb-6 overflow-hidden rounded-[2rem] border-2 border-white/40 p-5 shadow-2xl backdrop-blur-md sm:p-6 md:p-8 ${
        podio ? `ring-4 ${podio.ring} ${podio.glow}` : "ring-2 ring-white/20"
      }`}
      aria-label="Tu posición en el ranking de conquistadores"
    >
      <div
        className={`absolute inset-0 bg-linear-to-br ${
          podio ? podio.grad : "from-indigo-600 via-violet-600 to-fuchsia-600"
        } opacity-95`}
      />
      <div className="pointer-events-none absolute -right-6 -top-6 opacity-20">
        <Trophy className="h-40 w-40 text-white" strokeWidth={1} />
      </div>

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-3xl bg-white/95 shadow-xl sm:h-24 sm:w-24 ${podio ? "animate-pulse" : ""}`}>
            {podio ? (
              <span className="text-3xl sm:text-4xl" aria-hidden>
                {podio.emoji}
              </span>
            ) : (
              <Medal className="h-10 w-10 text-indigo-600 sm:h-12 sm:w-12" />
            )}
            <span className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Lugar
            </span>
            <span className="text-2xl font-black leading-none text-slate-900 sm:text-3xl">
              #{posicion.lugarClub}
            </span>
          </div>

          <div className="min-w-0 text-white">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-200" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/90">
                Tu puesto en el club
              </p>
            </div>
            <h2 className="text-xl font-black leading-tight tracking-tight sm:text-2xl md:text-3xl">
              {podio ? podio.label : `Vas en el lugar ${posicion.lugarClub}`}
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/90 sm:text-base">
              de{" "}
              <span className="font-black text-white">
                {posicion.totalClub} conquistadores
              </span>{" "}
              del club · {posicion.puntos.toLocaleString()} pts
            </p>
            {posicion.lugarUnidad != null && posicion.totalUnidad > 0 && unidad?.trim() ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                <Crown className="h-3.5 w-3.5 text-amber-200" />#{posicion.lugarUnidad} en{" "}
                {unidad} ({posicion.totalUnidad} en tu unidad)
              </p>
            ) : null}
          </div>
        </div>

        {!podio && posicion.lugarClub <= 5 ? (
          <div className="shrink-0 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">
              ¡Top 5!
            </p>
            <p className="text-sm font-bold text-white">Sigue sumando puntos</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
