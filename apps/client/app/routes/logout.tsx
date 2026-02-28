import { redirect } from "react-router";
import { removeToken } from "~/lib/auth";

export async function clientLoader() {
  removeToken();
  throw redirect("/login");
}
