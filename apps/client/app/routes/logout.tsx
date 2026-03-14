import { redirect } from "react-router";
import { removeToken } from "~/lib/auth";

export async function clientLoader() {
  removeToken();
  localStorage.removeItem("cofr_last_activity");
  localStorage.removeItem("cofr_session_timeout");
  throw redirect("/login");
}
