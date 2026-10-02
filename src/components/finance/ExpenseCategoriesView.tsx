import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ExpenseCategoryRecord } from '../../types/crm';
import { ExpenseCategoryModal } from '../modals/ExpenseCategoryModal';

export const ExpenseCategoriesView: React.FC = () => {
  const { expenseCategories, expenses, deleteExpenseCategory, canDeleteExpenseCategory, updateExpenseCategory } = useCrmData();
  const { isAdmin } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<ExpenseCategoryRecord | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  const handleDelete = async (cat: ExpenseCategoryRecord) => {
    setDeleteWarning(null);
    if (!canDeleteExpenseCategory(cat.id)) {
      setDeleteWarning(
        `Category "${cat.name}" cannot be deleted because it is linked to historical expenses. You can deactivate it instead.`
      );
      return;
    }

    if (!confirm(`Delete category "${cat.name}"?`)) return;

    try {
      await deleteExpenseCategory(cat.id);
    } catch (err: any) {
      console.error('Delete category error:', err);
      setDeleteWarning(err?.message || 'Failed to delete category.');
    }
  };

  const handleToggleActive = async (cat: ExpenseCategoryRecord) => {
    try {
      await updateExpenseCategory(cat.id, { isActive: !cat.isActive });
    } catch (err) {
      console.error('Toggle category error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Expense Categories</h2>
          <p className="text-xs text-slate-400">
            Accounting classification heads for operational expenditures and financial reports
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setCategoryToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {deleteWarning && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{deleteWarning}</span>
          </div>
          <button
            onClick={() => setDeleteWarning(null)}
            className="text-amber-400 hover:text-white font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {expenseCategories.map((cat) => {
          const expenseCount = expenses.filter((e) => e.categoryId === cat.id).length;
          const isDeletable = canDeleteExpenseCategory(cat.id);

          return (
            <div
              key={cat.id}
              className={`p-5 rounded-2xl border transition shadow-sm flex flex-col justify-between ${
                cat.isActive
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/60 border-slate-800/40 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Tag className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white">{cat.name}</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      cat.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="mt-3 text-xs text-slate-400 min-h-[32px] line-clamp-2">
                  {cat.description || 'Standard corporate expenditure classification head.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'} recorded
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(cat)}
                      title={cat.isActive ? 'Deactivate Category' : 'Activate Category'}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                    >
                      {cat.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {
                        setCategoryToEdit(cat);
                        setIsModalOpen(true);
                      }}
                      title="Edit Category"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isDeletable ? (
                      <button
                        onClick={() => handleDelete(cat)}
                        title="Delete Category"
                        className="p-1.5 text-rose-400 hover:text-white rounded-lg bg-rose-500/10 hover:bg-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span
                        title="Cannot delete because historical expenses exist"
                        className="p-1.5 text-slate-600 cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ExpenseCategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCategoryToEdit(null);
        }}
        categoryToEdit={categoryToEdit}
      />
    </div>
  );
};
