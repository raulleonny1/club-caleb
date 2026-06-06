import HomeLoginPage from "./HomeLoginPage";
import PaginaSecuestrada from "./PaginaSecuestrada";

/** Cambiar a false (o borrar PaginaSecuestrada) para restaurar el login normal en /. */
const MOSTRAR_PAGINA_SECUESTRADA = true;

export default function Home() {
  if (MOSTRAR_PAGINA_SECUESTRADA) {
    return <PaginaSecuestrada />;
  }
  return <HomeLoginPage />;
}
