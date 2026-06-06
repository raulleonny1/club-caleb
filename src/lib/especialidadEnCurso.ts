export type EstadoEspecialidad =
  | "pendiente"
  | "en_desarrollo"
  | "completado"
  | "incompleto";

export type EspecialidadEnCurso = {
  area: string;
  categoria: string;
  especialidad: string;
  estado: EstadoEspecialidad;
};

export const ESTADO_INICIAL_ESPECIALIDAD: EstadoEspecialidad = "pendiente";

export const ESTADOS_ESPECIALIDAD: {
  id: EstadoEspecialidad;
  label: string;
  badge: string;
}[] = [
  { id: "pendiente", label: "Pendiente", badge: "bg-slate-100 text-slate-700" },
  { id: "en_desarrollo", label: "En desarrollo", badge: "bg-blue-100 text-blue-800" },
  { id: "completado", label: "Completado", badge: "bg-emerald-100 text-emerald-800" },
  { id: "incompleto", label: "Incompleto", badge: "bg-amber-100 text-amber-900" },
];

const ICONOS_AREA: Record<string, string> = {
  Naturaleza: "🌿",
  "Aire Libre": "⛺",
  Salud: "❤️",
  "Habilidades Domésticas": "🏠",
  Arte: "🎨",
  Recreación: "⚽",
  Agricultura: "🌾",
  Misionero: "✝️",
  Espiritual: "📖",
};

export function iconoAreaEspecialidad(area: string): string {
  return ICONOS_AREA[area] ?? "🏅";
}

export function normalizarEstadoEspecialidad(raw: unknown): EstadoEspecialidad {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (s === "en_desarrollo" || s === "desarrollo") return "en_desarrollo";
  if (s === "completado" || s === "completa") return "completado";
  if (s === "incompleto") return "incompleto";
  return "pendiente";
}

export function etiquetaEstadoEspecialidad(estado: EstadoEspecialidad): string {
  return ESTADOS_ESPECIALIDAD.find((e) => e.id === estado)?.label ?? "Pendiente";
}

export function estiloEstadoEspecialidad(estado: EstadoEspecialidad): string {
  return (
    ESTADOS_ESPECIALIDAD.find((e) => e.id === estado)?.badge ??
    ESTADOS_ESPECIALIDAD[0].badge
  );
}

export function parseEspecialidadesEnCurso(raw: unknown): EspecialidadEnCurso[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string" && item.trim()) {
          return {
            area: "",
            categoria: "",
            especialidad: item.trim(),
            estado: ESTADO_INICIAL_ESPECIALIDAD,
          };
        }
        if (item && typeof item === "object") {
          const obj = item as Partial<EspecialidadEnCurso & { nombre?: string }>;
          const especialidad = String(obj.especialidad ?? obj.nombre ?? "").trim();
          if (!especialidad) return null;
          return {
            area: String(obj.area ?? "").trim(),
            categoria: String(obj.categoria ?? "").trim(),
            especialidad,
            estado: normalizarEstadoEspecialidad(obj.estado),
          };
        }
        return null;
      })
      .filter((e): e is EspecialidadEnCurso => e !== null);
  }
  if (typeof raw === "string" && raw.trim()) {
    return [
      {
        area: "",
        categoria: "",
        especialidad: raw.trim(),
        estado: ESTADO_INICIAL_ESPECIALIDAD,
      },
    ];
  }
  return [];
}

export function parseEspecialidadEnCurso(raw: unknown): EspecialidadEnCurso | null {
  const lista = parseEspecialidadesEnCurso(raw);
  return lista[0] ?? null;
}

export function etiquetaEspecialidadEnCurso(e: EspecialidadEnCurso): string {
  return [e.area, e.categoria, e.especialidad].filter(Boolean).join(" · ");
}

export function claveEspecialidadEnCurso(e: Pick<EspecialidadEnCurso, "area" | "categoria" | "especialidad">): string {
  return `${e.area}|||${e.categoria}|||${e.especialidad}`;
}
