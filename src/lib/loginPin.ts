import { db } from "@/src/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { logError, logInfo } from "@/src/lib/logger";
import { irARuta } from "@/src/lib/navegacion";
import { storageSeguroSet } from "@/src/lib/storageSeguro";

export type ResultadoLoginPin =
  | { ok: true }
  | { ok: false; mensaje: string };

function consultarDirectiva(pin: string, cargo: string) {
  return getDocs(
    query(
      collection(db, "directivaClub"),
      where("cargo", "==", cargo),
      where("pin", "==", pin)
    )
  );
}

/** Resuelve el PIN y navega. Pensado para Safari/iOS (errores visibles, sin depender de Auth). */
export async function resolverLoginPorPin(pin: string): Promise<ResultadoLoginPin> {
  if (pin === "1844") {
    logInfo("Login admin exitoso");
    irARuta("/admin");
    return { ok: true };
  }
  if (pin === "*611") {
    logInfo("Login evaluador guía mayor exitoso");
    irARuta("/admin/evaluar-guia-mayor");
    return { ok: true };
  }

  try {
    try {
      const snapshotDirector = await consultarDirectiva(pin, "Director/a");
      if (!snapshotDirector.empty) {
        logInfo("Login director exitoso: " + pin);
        irARuta(`/admin/directiva/dashboard-director?pin=${encodeURIComponent(pin)}`);
        return { ok: true };
      }
    } catch (err) {
      logError("Consulta director: " + String(err));
    }

    try {
      const snapshotSubdirector = await consultarDirectiva(pin, "Subdirector/a");
      if (!snapshotSubdirector.empty) {
        logInfo("Login subdirector exitoso: " + pin);
        irARuta(`/admin/directiva/dashboard-subdirector?pin=${encodeURIComponent(pin)}`);
        return { ok: true };
      }
    } catch (err) {
      logError("Consulta subdirector: " + String(err));
    }

    const snapshotConsejero = await getDocs(
      query(collection(db, "consejeros"), where("pin", "==", pin))
    );
    if (!snapshotConsejero.empty) {
      const consejeroDoc = snapshotConsejero.docs[0];
      logInfo("Login consejero exitoso: " + consejeroDoc.id);
      storageSeguroSet("consejeroId", consejeroDoc.id);
      irARuta(`/consejero/${consejeroDoc.id}`);
      return { ok: true };
    }

    const snapshotMiembro = await getDocs(
      query(collection(db, "RegistroConquis"), where("pin", "==", pin))
    );
    if (!snapshotMiembro.empty) {
      logInfo("Login miembro exitoso: " + pin);
      irARuta(`/miembros/dashboard?pin=${encodeURIComponent(pin)}`);
      return { ok: true };
    }

    const snapshotAspirante = await getDocs(
      query(collection(db, "aspirantesGuiaMayor"), where("pin", "==", pin))
    );
    if (!snapshotAspirante.empty) {
      const aspiranteDoc = snapshotAspirante.docs[0];
      logInfo("Login aspirante exitoso: " + pin);
      irARuta(`/aspirante/dashboard?pin=${encodeURIComponent(pin)}`);
      return { ok: true };
    }

    logError("PIN incorrecto: " + pin);
    return { ok: false, mensaje: "PIN incorrecto." };
  } catch (err) {
    logError("Error de conexión en login: " + String(err));
    return {
      ok: false,
      mensaje:
        "No se pudo conectar con el club. Revisa internet o intenta de nuevo (Safari: desactiva modo privado si persiste).",
    };
  }
}
