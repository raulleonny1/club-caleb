import { nombreGrupoCoincide } from "@/src/lib/unidades";

export type ConquistadorRankingFila = {
  pin: string;
  puntos: number;
  unidad: string;
};

export function construirRankingConquistadores(
  registros: { pin: string; unidad: string }[],
  totalesPorPin: Record<string, number>
): ConquistadorRankingFila[] {
  const visto = new Set<string>();
  const lista: ConquistadorRankingFila[] = [];

  for (const r of registros) {
    const pin = String(r.pin ?? "").trim();
    if (!pin || visto.has(pin)) continue;
    visto.add(pin);
    lista.push({
      pin,
      puntos: totalesPorPin[pin] ?? 0,
      unidad: String(r.unidad ?? "").trim(),
    });
  }

  return lista.sort(
    (a, b) => b.puntos - a.puntos || a.pin.localeCompare(b.pin, "es")
  );
}

export type PosicionRankingConquistador = {
  lugarClub: number;
  totalClub: number;
  lugarUnidad: number | null;
  totalUnidad: number;
  puntos: number;
  podio: 1 | 2 | 3 | null;
};

export function posicionConquistador(
  pin: string,
  unidad: string,
  lista: ConquistadorRankingFila[]
): PosicionRankingConquistador | null {
  const pinKey = pin.trim();
  if (!pinKey || lista.length === 0) return null;

  const idx = lista.findIndex((c) => c.pin === pinKey);
  const puntos = idx >= 0 ? lista[idx].puntos : 0;
  const lugarClub = idx >= 0 ? idx + 1 : lista.length;

  const unidadNorm = unidad.trim();
  let lugarUnidad: number | null = null;
  let totalUnidad = 0;

  if (unidadNorm) {
    const enUnidad = lista.filter((c) => nombreGrupoCoincide(c.unidad, unidadNorm));
    totalUnidad = enUnidad.length;
    const idxU = enUnidad.findIndex((c) => c.pin === pinKey);
    lugarUnidad = idxU >= 0 ? idxU + 1 : null;
  }

  const podio =
    lugarClub === 1 ? 1 : lugarClub === 2 ? 2 : lugarClub === 3 ? 3 : null;

  return {
    lugarClub,
    totalClub: lista.length,
    lugarUnidad,
    totalUnidad,
    puntos,
    podio,
  };
}
