import { useState } from "react";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import {
  getExpenses,
  getExpensesByCategory,
  getExpensesByDateRange,
  createExpense,
  updateExpense,
  deleteExpense,
} from "~/lib/api";
import {
  formatCurrency,
  formatDate,
  getCategoryColor,
} from "~/lib/utils";
import type { Expense, ExpenseCreate } from "~/lib/schemas";
import ExpenseFormModal from "~/components/ExpenseFormModal";
import DeleteConfirmModal from "~/components/DeleteConfirmModal";
import FilterModal from "~/components/FilterModal";
import { useTheme } from "~/lib/theme";

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit")) || 50;
  const offset = Number(url.searchParams.get("offset")) || 0;
  const category = url.searchParams.get("category") || "";
  const startDate = url.searchParams.get("startDate") || "";
  const endDate = url.searchParams.get("endDate") || "";

  let data;
  if (category) {
    data = await getExpensesByCategory(category, limit, offset);
  } else if (startDate && endDate) {
    data = await getExpensesByDateRange(
      new Date(startDate),
      new Date(endDate),
      limit,
      offset,
    );
  } else {
    data = await getExpenses(limit, offset);
  }

  return {
    ...data,
    currentLimit: limit,
    currentOffset: offset,
    currentCategory: category,
    currentStartDate: startDate,
    currentEndDate: endDate,
  };
}

export default function Expenses() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const {
    expenses,
    total_count,
    currentLimit,
    currentOffset,
    currentCategory,
    currentStartDate,
    currentEndDate,
  } = useLoaderData<typeof clientLoader>();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Local filter state
  const [category, setCategory] = useState(currentCategory);
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);

  const totalPages = Math.ceil(total_count / currentLimit) || 1;
  const currentPage = Math.floor(currentOffset / currentLimit) + 1;

  const buildQueryString = (params: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    return searchParams.toString();
  };

  const goToPage = (page: number) => {
    const newOffset = (page - 1) * currentLimit;
    const query = buildQueryString({
      limit: currentLimit,
      offset: newOffset,
      category: currentCategory,
      startDate: currentStartDate,
      endDate: currentEndDate,
    });
    navigate(`?${query}`);
  };

  const applyFilters = () => {
    const query = buildQueryString({
      limit: currentLimit,
      offset: 0,
      category,
      startDate,
      endDate,
    });
    navigate(`?${query}`);
  };

  const clearFilters = () => {
    setCategory("");
    setStartDate("");
    setEndDate("");
    navigate(`?limit=${currentLimit}&offset=0`);
  };

  const handleAdd = () => {
    setSelectedExpense(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsFormModalOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (data: ExpenseCreate) => {
    setIsLoading(true);
    try {
      if (selectedExpense) {
        await updateExpense(selectedExpense.id, data);
      } else {
        await createExpense(data);
      }
      setIsFormModalOpen(false);
      revalidator.revalidate();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;
    setIsLoading(true);
    try {
      await deleteExpense(selectedExpense.id);
      setIsDeleteModalOpen(false);
      revalidator.revalidate();
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveFilters = !!(currentCategory || currentStartDate || currentEndDate);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-content-secondary">
            Showing {expenses.length} of {total_count} transactions
            {hasActiveFilters && " (filtered)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`p-2 rounded-md transition-colors ${
              hasActiveFilters
                ? "bg-accent-soft-bg text-accent-soft-text hover:bg-accent-soft-bg/80"
                : "hover:bg-surface-hover text-content-secondary"
            }`}
            aria-label="Filter transactions"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className="p-2 bg-emerald text-white rounded-md hover:bg-emerald-hover transition-colors"
            aria-label="Add transaction"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-surface-primary rounded-lg border border-edge-default shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-edge-default">
          <thead className="bg-surface-elevated">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-content-tertiary uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-content-tertiary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface-primary divide-y divide-edge-default">
            {expenses.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-content-tertiary"
                >
                  No transactions found
                </td>
              </tr>
            ) : (
              expenses.map((expense: Expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-content-tertiary">
                    {formatDate(expense.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-content-primary">
                    {expense.description || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white"
                      style={{
                        backgroundColor: getCategoryColor(expense.category, isDark),
                      }}
                    >
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-content-primary text-right">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="p-1 text-content-tertiary hover:text-accent-soft-text hover:bg-accent-soft-bg rounded transition-colors mr-1"
                      aria-label="Edit transaction"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(expense)}
                      className="p-1 text-content-tertiary hover:text-negative-text hover:bg-negative-bg rounded transition-colors"
                      aria-label="Delete transaction"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-edge-strong rounded-md text-sm font-medium text-content-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover"
        >
          Previous
        </button>
        <span className="text-sm text-content-tertiary">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 border border-edge-strong rounded-md text-sm font-medium text-content-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover"
        >
          Next
        </button>
      </div>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        expense={selectedExpense}
        isLoading={isLoading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isLoading={isLoading}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={applyFilters}
        onClear={clearFilters}
        category={category}
        setCategory={setCategory}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
