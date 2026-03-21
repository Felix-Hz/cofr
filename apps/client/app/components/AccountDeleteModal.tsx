import { useState } from "react";
import { useBodyScrollLock } from "~/hooks/useBodyScrollLock";
import type { Account } from "~/lib/schemas";

interface AccountDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  accounts: Account[];
  onDelete: (accountId: string) => Promise<void>;
  onMoveAndDelete: (accountId: string, targetAccountId: string) => Promise<void>;
}

export default function AccountDeleteModal({
  isOpen,
  onClose,
  account,
  accounts,
  onDelete,
  onMoveAndDelete,
}: AccountDeleteModalProps) {
  const [step, setStep] = useState<"confirm" | "move">("confirm");
  const [error, setError] = useState<string | null>(null);
  const [targetAccountId, setTargetAccountId] = useState("");
  const [loading, setLoading] = useState(false);

  useBodyScrollLock(isOpen);

  const reset = () => {
    setStep("confirm");
    setError(null);
    setTargetAccountId("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDelete = async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      await onDelete(account.id);
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      setError(msg);
      setStep("move");
    } finally {
      setLoading(false);
    }
  };

  const handleMoveAndDelete = async () => {
    if (!account || !targetAccountId) return;
    setLoading(true);
    setError(null);
    try {
      await onMoveAndDelete(account.id, targetAccountId);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move transactions");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !account) return null;

  const availableAccounts = accounts.filter((a) => a.id !== account.id);

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex h-full items-center justify-center p-4 touch-none">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

        <div className="relative bg-surface-primary rounded-lg shadow-xl w-full max-w-sm p-6">
          {step === "confirm" ? (
            <>
              <h3 className="text-lg font-semibold text-content-primary mb-2">
                Delete {account.name}?
              </h3>
              <p className="text-sm text-content-secondary mb-6">
                This will permanently delete the account. This action cannot be undone.
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-negative-bg border border-negative-text/20 px-3 py-2 text-sm text-negative-text">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-negative-btn hover:bg-negative-btn-hover rounded-md disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-content-primary mb-2">Move Transactions</h3>

              {error && (
                <div className="mb-4 rounded-lg bg-negative-bg border border-negative-text/20 px-3 py-2 text-sm text-negative-text">
                  {error}
                </div>
              )}

              <p className="text-sm text-content-secondary mb-4">
                Select an account to move all transactions to, or cancel and handle them manually.
              </p>

              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className="w-full h-10 px-3 mb-6 border border-edge-strong rounded-lg text-sm bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-emerald/40"
              >
                <option value="">Select account...</option>
                {availableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover rounded-md"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMoveAndDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-negative-btn hover:bg-negative-btn-hover rounded-md disabled:opacity-50"
                  disabled={loading || !targetAccountId}
                >
                  {loading ? "Moving..." : "Move & Delete"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
