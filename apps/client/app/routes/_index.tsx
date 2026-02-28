import { redirect } from "react-router";
import { isAuthenticated } from "~/lib/auth";
import { TelegramButton } from "~/components/TelegramButton";

export async function clientLoader() {
  // Redirect to dashboard if already logged in
  if (isAuthenticated()) {
    throw redirect("/dashboard");
  }
  return null;
}

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-b from-cloud to-white">
      <div className="max-w-xl w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-navy">
            cofr
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Track your expenses effortlessly with Telegram integration
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <TelegramButton to="/login" className="w-full">
            Get Started
          </TelegramButton>

          <div className="text-center text-sm text-slate-500">
            Secure authentication via Telegram
          </div>
        </div>
      </div>
    </div>
  );
}
