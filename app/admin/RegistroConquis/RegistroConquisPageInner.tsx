"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getDocs, doc, updateDoc, deleteDoc, addDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/src/firebase";
import { especialidadesBase } from "@/src/data/especialidades";
import { handleError } from "@/src/lib/errorHandler";
import { generarPinUnicoClub } from "@/src/lib/pinUnico";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildWhatsappUrl, mensajePinConquistador } from "@/src/utils/whatsapp";
import {
  canonicalizarUnidad,
  consejeroAsesoraUnidad,
} from "@/src/lib/unidades";
import { MessageCircle } from "lucide-react";

type EspecialidadObj = {
  area: string;
  categoria: string;
  especialidad: string;
};

type Unidad = { nombre: string; consejero: string };

type Consejero = { nombre: string; unidades: string[] };

type RegistroConquis = {
  id: string;
  nombre: string;
  apellido: string;
  edad: string;
  fechaNacimiento: string;
  whatsapp: string;
  unidad: string;
  consejero: string;
  clase: string;
  especialidadArea: string;
  especialidadCategoria: string;
  especialidad: string;
  especialidades: EspecialidadObj[];
  pin: string;
};

type RegistroConquisPageInnerProps = {
  unidades?: Unidad[];
  consejeros?: Consejero[];
};

export default function RegistroConquisPageInner({ unidades: initialUnidades, consejeros: initialConsejeros }: RegistroConquisPageInnerProps) {
  const [conquis, setConquis] = useState<RegistroConquis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<RegistroConquis | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    edad: "",
    fechaNacimiento: "",
    whatsapp: "",
    unidad: "",
    consejero: "",
    clase: "",
    especialidadArea: "",
    especialidadCategoria: "",
    especialidad: "",
    especialidades: [] as EspecialidadObj[],
    pin: ""
  });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unidades, setUnidades] = useState<Unidad[]>(initialUnidades ?? []);
  const [consejeros, setConsejeros] = useState<Consejero[]>(initialConsejeros ?? []);
  const [editId, setEditId] = useState<string | null>(null);
  const editarDesdeUrlAplicado = useRef(false);
  const clasesOficiales = [
    "Amigo",
    "Compañero",
    "Explorador",
    "Pionero",
    "Excursionista",
    "Guía"
  ];

  useEffect(() => {
    const q = collection(db, "RegistroConquis");
    const unsub = onSnapshot(q, (snapshot) => {
      const sortedConquis = snapshot.docs
        .map((doc) => {
          const data = doc.data() as Partial<RegistroConquis>;
          return {
            id: doc.id,
            apellido: data.apellido || "",
            clase: data.clase || "",
            consejero: data.consejero || "",
            edad: data.edad || "",
            especialidad: data.especialidad || "",
            especialidadArea: data.especialidadArea || "",
            especialidadCategoria: data.especialidadCategoria || "",
            especialidades: (data.especialidades as EspecialidadObj[]) || [],
            nombre: data.nombre || "",
            pin: data.pin || "",
            unidad: data.unidad || "",
            whatsapp: data.whatsapp || "",
            ...data,
          } as RegistroConquis;
        })
        .sort((a, b) => {
          const nombreA = (a.nombre || "").toLowerCase();
          const nombreB = (b.nombre || "").toLowerCase();
          if (nombreA < nombreB) return -1;
          if (nombreA > nombreB) return 1;
          return 0;
        });
      setConquis(sortedConquis);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  useEffect(() => {
    if (!initialUnidades?.length) {
      const loadUnidades = async () => {
        try {
          const unidadesSnapshot = await getDocs(collection(db, "unidades"));
          setUnidades(
            unidadesSnapshot.docs.map((docSnap) => {
              const data = docSnap.data() as Partial<Unidad>;
              return { nombre: data.nombre || "", consejero: data.consejero || "" };
            })
          );
        } catch (err) {
          handleError(err, "Error cargando unidades");
        }
      };
      loadUnidades();
    }
  }, [initialUnidades]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "consejeros"), (snapshot) => {
      setConsejeros(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<Consejero>;
          return { nombre: data.nombre || "", unidades: data.unidades || [] };
        })
      );
    });
    return () => unsub();
  }, []);

  const catalogoUnidades = useMemo(
    () => unidades.map((u) => u.nombre).filter(Boolean),
    [unidades]
  );

  /** Consejeros de Firebase con unidades alineadas al catálogo oficial (`unidades`). */
  const consejerosDesdeRegistro = useMemo(
    () =>
      consejeros.map((c) => ({
        ...c,
        unidades: (c.unidades ?? []).map((u) =>
          canonicalizarUnidad(u, catalogoUnidades)
        ),
      })),
    [consejeros, catalogoUnidades]
  );

  const consejerosDisponibles = useMemo(() => {
    if (!form.unidad) return consejerosDesdeRegistro;
    const paraUnidad = consejerosDesdeRegistro.filter((c) =>
      consejeroAsesoraUnidad(c.unidades, form.unidad)
    );
    return paraUnidad.length > 0 ? paraUnidad : consejerosDesdeRegistro;
  }, [consejerosDesdeRegistro, form.unidad]);

  const hayConsejeroParaUnidad = useMemo(
    () =>
      form.unidad
        ? consejerosDesdeRegistro.some((c) =>
            consejeroAsesoraUnidad(c.unidades, form.unidad)
          )
        : true,
    [consejerosDesdeRegistro, form.unidad]
  );

  const filteredConquis = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conquis;

    return conquis.filter((c) => {
      const match = (value?: string) => (value || "").toLowerCase().includes(term);
      return (
        match(c.nombre) ||
        match(c.apellido) ||
        match(c.unidad) ||
        match(c.clase) ||
        match(c.consejero) ||
        match(c.whatsapp)
      );
    });
  }, [conquis, search]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "unidad") {
      const paraUnidad = consejerosDesdeRegistro.filter((c) =>
        consejeroAsesoraUnidad(c.unidades, value)
      );
      let consejero = form.consejero;
      if (paraUnidad.length === 1) {
        consejero = paraUnidad[0].nombre;
      } else if (!paraUnidad.some((c) => c.nombre === form.consejero)) {
        consejero = "";
      }
      setForm({ ...form, unidad: value, consejero });
    } else {
      setForm({ ...form, [name]: value });
    }
  };
  // Especialidades anidadas
  const areas = Array.from(new Set(especialidadesBase.map(e => e.area)));
  const categorias = form.especialidadArea ? Array.from(new Set(especialidadesBase.filter(e => e.area === form.especialidadArea).map(e => e.categoria))) : [];
  const especialidades = form.especialidadArea && form.especialidadCategoria ? especialidadesBase.filter(e => e.area === form.especialidadArea && e.categoria === form.especialidadCategoria).map(e => e.especialidad) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editMode && editId) {
        const { pin: _pinIgnorado, ...rest } = form;
        const payload = {
          ...rest,
          unidad: rest.unidad
            ? canonicalizarUnidad(rest.unidad, catalogoUnidades)
            : rest.unidad,
        };
        await updateDoc(doc(db, "RegistroConquis", editId), payload);
        setEditId(null);
        setEditMode(false);
        toast.success("Conquistador actualizado");
      } else {
        // Registrar
        const pin = await generarPinUnicoClub();
        await addDoc(collection(db, "RegistroConquis"), {
          ...form,
          pin,
          unidad: form.unidad
            ? canonicalizarUnidad(form.unidad, catalogoUnidades)
            : form.unidad,
          especialidades: form.especialidades,
        });
        toast.success("Conquistador registrado");
      }

      setForm({
        nombre: "",
        apellido: "",
        edad: "",
        fechaNacimiento: "",
        whatsapp: "",
        unidad: "",
        consejero: "",
        clase: "",
        especialidadArea: "",
        especialidadCategoria: "",
        especialidad: "",
        especialidades: [],
        pin: ""
      });
    } catch (err) {
      handleError(err, editMode ? "Error al editar conquistador" : "Error al registrar conquistador");
    } finally {
      setSaving(false);
    }
  };
  // Edición
  const iniciarEdicion = (miembro: RegistroConquis) => {
    setEditId(miembro.id);
    const rawEsp = miembro.especialidades as EspecialidadObj[] | string | undefined;
    const especialidadesArr: EspecialidadObj[] = Array.isArray(rawEsp)
      ? rawEsp
      : typeof rawEsp === "string" && rawEsp.length > 0
        ? [{ area: "", categoria: "", especialidad: rawEsp }]
        : ([] as EspecialidadObj[]);
    setForm({
      nombre: [miembro.nombre, miembro.apellido].filter(Boolean).join(" "),
      apellido: miembro.apellido || "",
      edad: miembro.edad || "",
      fechaNacimiento: miembro.fechaNacimiento || "",
      whatsapp: miembro.whatsapp || "",
      unidad: miembro.unidad || "",
      consejero: miembro.consejero || "",
      clase: miembro.clase || "",
      especialidadArea: miembro.especialidadArea || "",
      especialidadCategoria: miembro.especialidadCategoria || "",
      especialidad: miembro.especialidad || "",
      especialidades: especialidadesArr,
      pin: miembro.pin || ""
    });
    setEditMode(true);
    setTimeout(() => {
      document.getElementById("campo-nacimiento")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  useEffect(() => {
    if (editarDesdeUrlAplicado.current || loading || conquis.length === 0) return;
    const id =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("editar")
        : null;
    if (!id) return;
    const m = conquis.find((c) => c.id === id);
    if (m) {
      editarDesdeUrlAplicado.current = true;
      iniciarEdicion(m);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [loading, conquis]);

  const cancelarEdicion = () => {
    setEditId(null);
    setForm({
      nombre: "",
      apellido: "",
      clase: "",
      consejero: "",
      edad: "",
      especialidad: "",
      especialidadArea: "",
      especialidadCategoria: "",
      especialidades: [],
      pin: "",
      unidad: "",
      whatsapp: "",
      fechaNacimiento: ""
    });
    setEditMode(false);
  };
  // Removed unused guardarEdicion and editForm/setEditForm
  const solicitarEliminacion = (miembro: RegistroConquis) => {
    setSelectedForDelete(miembro);
    setDeleteDialogOpen(true);
  };

  const whatsappUrlFromRegistro = (m: Pick<RegistroConquis, "nombre" | "apellido" | "pin" | "unidad" | "consejero" | "clase" | "whatsapp">) =>
    buildWhatsappUrl(
      m.whatsapp,
      mensajePinConquistador({
        nombre: m.nombre,
        apellido: m.apellido,
        pin: m.pin,
        unidad: m.unidad,
        consejero: m.consejero,
        clase: m.clase,
      })
    );

  const confirmarEliminacion = async () => {
    if (!selectedForDelete?.id) return;

    try {
      await deleteDoc(doc(db, 'RegistroConquis', selectedForDelete.id));
      toast.success("Registro eliminado");
    } catch (err) {
      handleError(err, "Error al eliminar el registro");
    } finally {
      setDeleteDialogOpen(false);
      setSelectedForDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 px-4 py-8">
      <div className="mx-auto mb-6 flex w-full max-w-3xl items-center justify-between">
        <h2 className="text-2xl font-black text-indigo-700">RegistroConquis</h2>
        <Link
          href="/admin"
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
        >
          Volver al menu
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="mb-6 max-w-3xl mx-auto grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-sm font-semibold text-slate-700">Nombre</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleInput}
            placeholder="Nombre"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="apellido" className="text-sm font-semibold text-slate-700">Apellido</label>
          <input
            id="apellido"
            type="text"
            name="apellido"
            value={form.apellido}
            onChange={handleInput}
            placeholder="Apellido"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="campo-nacimiento" className="text-sm font-semibold text-slate-700">Fecha de nacimiento</label>
          <input
            id="campo-nacimiento"
            type="date"
            name="fechaNacimiento"
            value={form.fechaNacimiento}
            onChange={handleInput}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="edad" className="text-sm font-semibold text-slate-700">Edad</label>
          <input
            id="edad"
            type="number"
            name="edad"
            value={form.edad}
            onChange={handleInput}
            placeholder="Edad"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="whatsapp" className="text-sm font-semibold text-slate-700">WhatsApp</label>
          <input
            id="whatsapp"
            type="tel"
            name="whatsapp"
            value={form.whatsapp}
            onChange={handleInput}
            placeholder="WhatsApp (ej. +56912345678)"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="unidad" className="text-sm font-semibold text-slate-700">Unidad</label>
          <select
            id="unidad"
            name="unidad"
            value={form.unidad}
            onChange={handleInput}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Selecciona unidad</option>
            {unidades.map((u, idx) => (
              <option key={idx} value={u.nombre}>{u.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="consejero" className="text-sm font-semibold text-slate-700">
            Consejero
          </label>
          <select
            id="consejero"
            name="consejero"
            value={form.consejero}
            onChange={handleInput}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Selecciona consejero</option>
            {consejerosDisponibles.map((c) => (
              <option key={c.nombre} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>
          {consejerosDesdeRegistro.length === 0 ? (
            <p className="text-xs text-amber-700">
              No hay consejeros registrados.{" "}
              <Link href="/admin/consejero" className="font-semibold underline">
                Registrar consejero
              </Link>
            </p>
          ) : form.unidad && !hayConsejeroParaUnidad ? (
            <p className="text-xs text-amber-700">
              Ningún consejero asesora «{form.unidad}». Asigna unidades en{" "}
              <Link href="/admin/consejero" className="font-semibold underline">
                Registro de Consejero
              </Link>
              .
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="clase" className="text-sm font-semibold text-slate-700">Clase</label>
          <select
            id="clase"
            name="clase"
            value={form.clase}
            onChange={handleInput}
            required
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Selecciona clase</option>
            {clasesOficiales.map((c, idx) => (
              <option key={idx} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:flex-wrap md:justify-end md:items-center">
          {editMode && form.pin && (
            <p className="w-full rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
              PIN de acceso:{" "}
              <code className="font-mono font-bold">{form.pin}</code> — para cambiarlo usa{" "}
              <Link href="/admin/configuracion" className="font-bold underline">
                Admin → Configuración → Resetear PIN
              </Link>{" "}
              (los puntos se migran solos).
            </p>
          )}
          {editMode && form.pin && form.whatsapp && whatsappUrlFromRegistro(form) && (
            <a
              href={whatsappUrlFromRegistro(form)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white hover:bg-green-700 md:w-auto"
            >
              <MessageCircle size={18} />
              Enviar información por WhatsApp
            </a>
          )}
          {editMode && (
            <button
              type="button"
              onClick={cancelarEdicion}
              className="w-full rounded-xl bg-gray-400 px-6 py-2 text-sm font-bold text-white hover:bg-gray-500 md:w-auto"
            >
              Cancelar edición
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 md:w-auto disabled:opacity-60"
          >
            {saving ? "Guardando..." : editMode ? "Guardar cambios" : "Registrar"}
          </button>
        </div>
      </form>
      <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 max-w-5xl mx-auto">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-blue-700">Conquistadores registrados</h3>
            <p className="text-sm text-slate-600">Busca por nombre, unidad, clase, consejero o WhatsApp.</p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {loading ? (
          <Alert>
            <AlertTitle>Cargando conquistadores...</AlertTitle>
            <AlertDescription>Un momento mientras se cargan los datos desde Firestore.</AlertDescription>
          </Alert>
        ) : conquis.length === 0 ? (
          <Alert>
            <AlertTitle>No hay conquistadores registrados</AlertTitle>
            <AlertDescription>Registra al menos un conquistador para ver información en la tabla.</AlertDescription>
          </Alert>
        ) : filteredConquis.length === 0 ? (
          <Alert>
            <AlertTitle>No se encontraron resultados</AlertTitle>
            <AlertDescription>Prueba con otro término de búsqueda.</AlertDescription>
          </Alert>
        ) : (
          <Table className="text-xs md:text-sm">
            <TableHeader>
              <TableRow className="bg-indigo-100">
                <TableHead>Nombre</TableHead>
                <TableHead>Clase</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Consejero</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConquis.map((m) => {
                const waUrl = whatsappUrlFromRegistro(m);
                return (
                <TableRow key={m.id} className="border-b">
                  <TableCell className="font-semibold">
                    {[m.nombre, m.apellido].filter(Boolean).join(" ")}
                  </TableCell>
                  <TableCell>
                    {m.clase?.trim() ? (
                      <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                        {m.clase}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Sin clase</span>
                    )}
                  </TableCell>
                  <TableCell>{m.unidad}</TableCell>
                  <TableCell>{m.consejero}</TableCell>
                  <TableCell>
                    {m.whatsapp ? (
                      <span className="text-slate-700">{m.whatsapp}</span>
                    ) : (
                      <span className="text-slate-400 italic">Sin número</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-blue-700">{m.pin}</TableCell>
                  <TableCell className="p-2 flex flex-wrap gap-1">
                    {waUrl ? (
                      <Button
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-700"
                        asChild
                      >
                        <a href={waUrl} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="mr-1 h-4 w-4" />
                          Enviar PIN
                        </a>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        title="Agrega un número de WhatsApp al registro"
                      >
                        Enviar PIN
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => iniciarEdicion(m)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => solicitarEliminacion(m)}>
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar registro</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Los datos se eliminarán permanentemente de Firestore.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-700">
            {selectedForDelete ? (
              <p>
                ¿Confirmas que deseas eliminar el registro de <strong>{selectedForDelete.nombre}</strong> ({selectedForDelete.unidad})?
              </p>
            ) : (
              <p>Selecciona un registro para eliminar.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarEliminacion}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
