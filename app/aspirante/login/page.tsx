import { redirect } from "next/navigation";

/** El login de aspirantes es el mismo PIN principal en /. */
export default function AspiranteLoginPage() {
  redirect("/");
}
