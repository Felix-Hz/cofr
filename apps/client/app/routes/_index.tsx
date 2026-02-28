import { redirect } from "react-router";
import { isAuthenticated } from "~/lib/auth";

export async function clientLoader() {
  throw redirect(isAuthenticated() ? "/dashboard" : "/login");
}

export default function Index() {
  return null;
}
