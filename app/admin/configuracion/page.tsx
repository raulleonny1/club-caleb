"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../../../src/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  corregirPinsDuplicadosEnClub,
  detectarPinsDuplicados,
  resetearPinPersona,
  resetearPinsMasivoEnColeccion,
  type ColeccionPin,
} from "@/src/lib/pinUnico";
import { nombreCompletoAspirante } from "@/src/constants/aspirante";
import {
  Settings,
  Users,
  ShieldCheck,
  RefreshCcw,
  ArrowLeft,
  Search,
  UserCog,
  GraduationCap,
  Crown,
  AlertTriangle,
} from "lucide-react";

type Usuario = {
  id: string;
  nombre: string;
  pin: string;
  coleccion: ColeccionPin;
  pinFijo?: string;
};

type GrupoPin = {
  id: ColeccionPin;
  titulo: string;
  subtitulo: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
};

const GRUPOS: GrupoPin[] = [
  {
    id: "RegistroConquis",
    titulo: "Conquistadores",
    subtitulo: "Resetea el PIN de acceso. Migra puntos, historial y ficha médica al PIN nuevo.",
    icon: Users,
    colorClass: "bg-emerald-600",
  },
  {
    id: "aspirantesGuiaMayor",
    titulo: "Aspirantes a Guía Mayor",
    subtitulo: "Cada aspirante recibe un PIN único en todo el club.",
    icon: GraduationCap,
    colorClass: "bg-violet-600",
  },
  {
    id: "consejeros",
    titulo: "Consejeros",
    subtitulo: "Genera un PIN nuevo por consejero sin repetir ninguno.",
    icon: UserCog,
    colorClass: "bg-pink-600",
  },
  {
    id: "directivaClub",
    titulo: "Directiva del club",
    subtitulo: "El Director/a conserva el PIN 1902; el resto recibe PIN único.",
    icon: Crown,
    colorClass: "bg-amber-600",
  },
];

function ConfigSection({
  title,
  subtitle,
  icon: Icon,
  colorClass,
  actionLabel,
  onAction,
  actionDisabled,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-50 p-6 md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <div className={`rounded-xl p-3 ${colorClass} bg-opacity-10`}>
            <Icon className={`h-6 w-6 ${colorClass.replace("bg-", "text-")}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {actionLabel && onAction && (
          <button
            type="button"
            disabled={actionDisabled}
            onClick={onAction}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition-colors disabled:opacity-50 ${colorClass.replace("bg-", "border-").replace("600", "200")} ${colorClass.replace("bg-", "text-")} hover:bg-slate-50`}
          >
            <RefreshCcw className="h-4 w-4" />
            {actionLabel}
          </button>
        )}
      </div>
      <div className="p-0">{children}</div>
    </div>
  );
}

function UserTable({
  users,
  typeLabel,
  resettingId,
  onReset,
}: {
  users: Usuario[];
  typeLabel: string;
  resettingId: string | null;
  onReset: (user: Usuario) => void;
}) {
  if (users.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-slate-400">
        No hay {typeLabel.toLowerCase()} registrados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nombre
            </th>
            <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
              PIN actual
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Acción
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <tr key={`${user.coleccion}_${user.id}`} className="transition-colors hover:bg-slate-50/80">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                    {user.nombre.charAt(0) || "?"}
                  </div>
                  <span className="font-medium text-slate-700">{user.nombre}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700">
                  {user.pin || "—"}
                </code>
              </td>
              <td className="px-6 py-4 text-right">
                {user.pinFijo ? (
                  <span className="text-xs font-medium text-amber-700">PIN fijo del sistema</span>
                ) : (
                  <button
                    type="button"
                    disabled={resettingId === user.id}
                    onClick={() => onReset(user)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <RefreshCcw
                      className={`h-3.5 w-3.5 ${resettingId === user.id ? "animate-spin" : ""}`}
                    />
                    {resettingId === user.id ? "Generando…" : "Resetear PIN"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ConfiguracionAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resettingGrupo, setResettingGrupo] = useState<ColeccionPin | null>(null);
  const [corrigiendoDuplicados, setCorrigiendoDuplicados] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [duplicadosPin, setDuplicadosPin] = useState<
    { pin: string; registros: { etiqueta: string; nombre: string }[] }[]
  >([]);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const [conquisSnap, aspirantesSnap, consejerosSnap, directivaSnap] =
        await Promise.all([
          getDocs(collection(db, "RegistroConquis")),
          getDocs(collection(db, "aspirantesGuiaMayor")),
          getDocs(collection(db, "consejeros")),
          getDocs(collection(db, "directivaClub")),
        ]);

      const lista: Usuario[] = [
        ...conquisSnap.docs.map((d) => {
          const data = d.data();
          const nombre = [data.nombre, data.apellido].filter(Boolean).join(" ").trim();
          return {
            id: d.id,
            nombre: nombre || "Sin nombre",
            pin: String(data.pin ?? "").trim(),
            coleccion: "RegistroConquis" as const,
          };
        }),
        ...aspirantesSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            nombre: nombreCompletoAspirante(data) || "Sin nombre",
            pin: String(data.pin ?? d.id).trim(),
            coleccion: "aspirantesGuiaMayor" as const,
          };
        }),
        ...consejerosSnap.docs.map((d) => ({
          id: d.id,
          nombre: String(d.data().nombre ?? d.id),
          pin: String(d.data().pin ?? "").trim(),
          coleccion: "consejeros" as const,
        })),
        ...directivaSnap.docs.map((d) => {
          const data = d.data();
          const cargo = String(data.cargo ?? "");
          const esDirector = cargo === "Director/a";
          return {
            id: d.id,
            nombre: `${String(data.nombre ?? "")} (${cargo})`.trim(),
            pin: String(data.pin ?? "").trim(),
            coleccion: "directivaClub" as const,
            pinFijo: esDirector ? "1902" : undefined,
          };
        }),
      ];

      setUsuarios(lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarDuplicados = useCallback(async () => {
    const lista = await detectarPinsDuplicados();
    setDuplicadosPin(
      lista.map((d) => ({
        pin: d.pin,
        registros: d.registros.map((r) => ({
          etiqueta: r.etiqueta,
          nombre: r.nombre,
        })),
      }))
    );
  }, []);

  useEffect(() => {
    cargarUsuarios();
    cargarDuplicados();
  }, [cargarUsuarios, cargarDuplicados]);

  const recargarTodo = async () => {
    await cargarUsuarios();
    await cargarDuplicados();
  };

  const handleResetIndividual = async (user: Usuario) => {
    if (
      !window.confirm(
        `¿Generar un PIN nuevo y único para ${user.nombre}?\n\nSe actualizará en Firebase y sus puntos se migrarán al PIN nuevo.`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setResettingId(user.id);
    try {
      const { pinAnterior, pinNuevo } = await resetearPinPersona({
        coleccion: user.coleccion,
        docId: user.id,
        nombre: user.nombre,
        pinFijo: user.pinFijo,
      });
      setSuccess(
        `${user.nombre}: PIN actualizado ${pinAnterior ? `${pinAnterior} → ` : ""}${pinNuevo}. Comunica el nuevo código al usuario.`
      );
      await recargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resetear el PIN.");
    } finally {
      setResettingId(null);
    }
  };

  const handleResetGrupo = async (coleccion: ColeccionPin, titulo: string) => {
    if (
      !window.confirm(
        `¿Resetear los PIN de TODOS los ${titulo.toLowerCase()}?\n\nCada uno recibirá un PIN único. Los puntos se migrarán automáticamente.`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setResettingGrupo(coleccion);
    try {
      const { total } = await resetearPinsMasivoEnColeccion(coleccion);
      setSuccess(
        `Se resetearon ${total} PIN(s) de ${titulo.toLowerCase()}. Revisa la tabla y comunica los nuevos códigos.`
      );
      await recargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al resetear el grupo.");
    } finally {
      setResettingGrupo(null);
    }
  };

  const handleCorregirDuplicados = async () => {
    if (
      !window.confirm(
        "¿Corregir todos los PIN duplicados?\n\nSe mantendrá el primer registro de cada PIN repetido; los demás recibirán PIN nuevo único con migración de puntos."
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setCorrigiendoDuplicados(true);
    try {
      const { corregidos, mensajes } = await corregirPinsDuplicadosEnClub();
      if (corregidos === 0) {
        setSuccess("No había PIN duplicados que corregir.");
      } else {
        setSuccess(
          `Corregidos ${corregidos} registro(s):\n${mensajes.slice(0, 8).join("\n")}${mensajes.length > 8 ? `\n…y ${mensajes.length - 8} más` : ""}`
        );
      }
      await recargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al corregir duplicados.");
    } finally {
      setCorrigiendoDuplicados(false);
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filtrados = term
    ? usuarios.filter(
        (u) =>
          u.nombre.toLowerCase().includes(term) ||
          u.pin.includes(term)
      )
    : usuarios;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 font-sans text-slate-900 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            className="group flex items-center gap-2 font-medium text-slate-500 transition-colors hover:text-slate-800"
            onClick={() => {
              window.location.href = "/admin";
            }}
          >
            <div className="rounded-full p-2 transition-all group-hover:bg-white group-hover:shadow-sm">
              <ArrowLeft className="h-5 w-5" />
            </div>
            Volver al menú principal
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            Panel de administración
          </div>
        </div>

        <div className="mb-8 text-center md:text-left">
          <h1 className="flex items-center justify-center gap-3 text-3xl font-extrabold text-slate-900 md:justify-start">
            <Settings className="h-8 w-8 text-indigo-600" />
            Configuración de PINs
          </h1>
          <p className="mt-2 text-slate-500">
            Cada persona debe tener un PIN distinto. Usa «Resetear PIN» en cada fila o corrige
            duplicados de una vez.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h2 className="text-lg font-bold text-emerald-900">Respaldo de datos</h2>
          <p className="mt-1 text-sm text-emerald-800">
            Descarga una copia completa de Firebase en tu PC o restaura todo desde un archivo .json
            si borraste datos por error.
          </p>
          <Link
            href="/admin/respaldo"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            Ir a respaldo y restauración →
          </Link>
        </div>

        {duplicadosPin.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">PIN duplicados detectados ({duplicadosPin.length})</p>
                  <p className="mt-1 text-amber-800">
                    Esto no debería ocurrir. Corrige con el botón o resetea cada persona.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={corrigiendoDuplicados}
                onClick={handleCorregirDuplicados}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${corrigiendoDuplicados ? "animate-spin" : ""}`}
                />
                {corrigiendoDuplicados ? "Corrigiendo…" : "Corregir duplicados"}
              </button>
            </div>
            <ul className="list-inside list-disc space-y-1 text-amber-900">
              {duplicadosPin.map((d) => (
                <li key={d.pin}>
                  PIN <span className="font-mono font-bold">{d.pin}</span>:{" "}
                  {d.registros.map((r) => `${r.nombre} (${r.etiqueta})`).join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {success && (
          <div className="mb-4 whitespace-pre-line rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <div className="relative mb-8 group">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar por nombre o PIN…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="py-12 text-center text-slate-500">Cargando registros…</p>
        ) : (
          GRUPOS.map((grupo) => {
            const delGrupo = filtrados.filter((u) => u.coleccion === grupo.id);
            return (
              <ConfigSection
                key={grupo.id}
                title={grupo.titulo}
                subtitle={grupo.subtitulo}
                icon={grupo.icon}
                colorClass={grupo.colorClass}
                actionLabel={
                  resettingGrupo === grupo.id
                    ? "Reseteando…"
                    : `Resetear todos (${delGrupo.length})`
                }
                onAction={() => handleResetGrupo(grupo.id, grupo.titulo)}
                actionDisabled={resettingGrupo !== null || delGrupo.length === 0}
              >
                <UserTable
                  users={delGrupo}
                  typeLabel={grupo.titulo}
                  resettingId={resettingId}
                  onReset={handleResetIndividual}
                />
              </ConfigSection>
            );
          })
        )}

        <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-sm text-indigo-800">
          <p className="font-bold text-indigo-900">Al resetear un PIN</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-indigo-700/90">
            <li>Se guarda un PIN nuevo único en Firebase (sin repetir en todo el club).</li>
            <li>Los puntos del usuario se migran al documento del PIN nuevo.</li>
            <li>Comunica el PIN nuevo por WhatsApp o en persona; el anterior deja de servir.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
