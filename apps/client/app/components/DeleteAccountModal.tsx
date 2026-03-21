import { useState } from "react";
import { useNavigate } from "react-router";
import PasswordInput from "~/components/PasswordInput";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";
import { deleteUserAccount } from "~/lib/api";
import { removeToken } from "~/lib/auth";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasLocalAuth: boolean;
}

type DeleteMode = "soft" | "hard";
type Step = "choose" | "confirm";

export default function DeleteAccountModal({
  isOpen,
  onClose,
  hasLocalAuth,
}: DeleteAccountModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("choose");
  const [mode, setMode] = useState<DeleteMode>("soft");
  const [confirmationText, setConfirmationText] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const reset = () => {
    setStep("choose");
    setMode("soft");
    setConfirmationText("");
    setPassword("");
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);
    try {
      await deleteUserAccount(mode, confirmationText, hasLocalAuth ? password : undefined);
      removeToken();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setLoading(false);
    }
  };

  const isConfirmValid = confirmationText === "DELETE" && (!hasLocalAuth || password.length > 0);

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex h-full items-center justify-center p-4 touch-none">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-md">
          {step === "choose" ? (
            <>
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-lg font-semibold text-content-primary">Delete Account</h3>
                <p className="text-sm text-content-tertiary mt-1">
                  Choose how you'd like to proceed
                </p>
              </div>

              <div className="px-6 py-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setMode("soft")}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    mode === "soft"
                      ? "border-emerald bg-emerald/5"
                      : "border-edge-default hover:border-edge-strong"
                  }`}
                >
                  <p className="font-medium text-content-primary">Deactivate account</p>
                  <p className="text-sm text-content-tertiary mt-1">
                    Your account is deactivated and all data is preserved. Log back in anytime to
                    reactivate.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("hard")}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    mode === "hard"
                      ? "border-negative-text bg-negative-bg"
                      : "border-edge-default hover:border-edge-strong"
                  }`}
                >
                  <p className="font-medium text-content-primary">Permanently delete everything</p>
                  <p className="text-sm text-content-tertiary mt-1">
                    Your account, credentials, and all transaction history will be permanently
                    removed. This cannot be undone.
                  </p>
                </button>
              </div>

              <div className="px-6 pb-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep("confirm")}
                  className="px-4 py-2 text-sm font-medium text-white bg-negative-btn hover:bg-negative-btn-hover rounded-md transition-colors"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-lg font-semibold text-content-primary">
                  {mode === "soft" ? "Confirm Deactivation" : "Confirm Permanent Deletion"}
                </h3>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="bg-negative-bg border border-negative-text text-negative-text px-4 py-3 rounded-md text-sm">
                  {mode === "soft" ? (
                    <p>
                      Your account will be deactivated immediately. You can reactivate it by logging
                      back in.
                    </p>
                  ) : (
                    <p>
                      This will <strong>permanently delete</strong> your account, all linked
                      credentials, and your entire transaction history. This action is irreversible.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-negative-bg border border-negative-text text-negative-text px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="delete-confirm"
                    className="block text-sm font-medium text-content-secondary mb-1"
                  >
                    Type <span className="font-mono font-bold">DELETE</span> to confirm
                  </label>
                  <input
                    id="delete-confirm"
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-negative-text/50 focus:border-transparent transition-colors"
                  />
                </div>

                {hasLocalAuth && (
                  <div>
                    <label
                      htmlFor="delete-password"
                      className="block text-sm font-medium text-content-secondary mb-1"
                    >
                      Enter your password
                    </label>
                    <PasswordInput
                      id="delete-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-edge-strong rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-negative-text/50 focus:border-transparent transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("choose");
                    setConfirmationText("");
                    setPassword("");
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md transition-colors"
                  disabled={loading}
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!isConfirmValid || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-negative-btn hover:bg-negative-btn-hover rounded-md disabled:opacity-50 transition-colors"
                >
                  {loading ? "Deleting..." : "Delete My Account"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
