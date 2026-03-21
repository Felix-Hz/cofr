import { data } from "react-router";
import type { Route } from "./+types/catch-all";

export function clientLoader(_args: Route.ClientLoaderArgs) {
  throw data("Not Found", { status: 404 });
}

export default function CatchAll() {
  return null;
}
