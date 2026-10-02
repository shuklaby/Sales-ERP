import React, { useState } from 'react';
import {
  Layers,
  Settings,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
} from 'lucide-react';
import { SalesSourceRecord, SalesStatusRecord } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';

export const SalesSettingsTab: React.FC = () => {
  const {
    salesSources,
    salesStatuses,
    addSalesSource,
    updateSalesSource,
    toggleSalesSource,
    addSalesStatus,
    updateSalesStatus,
    deleteSalesStatus,
    canDeleteSalesStatus,
  } = useCrmData();
  const { isAdmin } = useAuth();

  // Source Form State
  const [newSourceName, setNewSourceName] = useState('');
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingSourceName, setEditingSourceName] = useState('');

  // Status Form State
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('blue');
  const [newStatusWon, setNewStatusWon] = useState(false);
  const [newStatusLost, setNewStatusLost] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusName, setEditingStatusName] = useState('');

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    try {
      await addSalesSource(newSourceName.trim());
      setNewSourceName('');
      setMessage({ text: 'Lead source created successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to create source', type: 'error' });
    }
  };

  const handleSaveEditSource = async (id: string) => {
    if (!editingSourceName.trim()) return;
    try {
      await updateSalesSource(id, { name: editingSourceName.trim() });
      setEditingSourceId(null);
      setMessage({ text: 'Source updated successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update source', type: 'error' });
    }
  };

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName.trim()) return;
    try {
      await addSalesStatus(newStatusName.trim(), undefined, newStatusWon, newStatusLost);
      setNewStatusName('');
      setNewStatusWon(false);
      setNewStatusLost(false);
      setMessage({ text: 'Pipeline stage created successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to create status', type: 'error' });
    }
  };

  const handleSaveEditStatus = async (id: string) => {
    if (!editingStatusName.trim()) return;
    try {
      await updateSalesStatus(id, { name: editingStatusName.trim() });
      setEditingStatusId(null);
      setMessage({ text: 'Stage updated successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const handleDeleteStatus = async (status: SalesStatusRecord) => {
    if (!canDeleteSalesStatus(status.name)) {
      alert(`Cannot delete stage "${status.name}" because historical leads or STS records reference it. You may deactivate it instead.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete stage "${status.name}"?`)) {
      try {
        await deleteSalesStatus(status.id);
        setMessage({ text: `Stage "${status.name}" removed.`, type: 'success' });
      } catch (err: any) {
        setMessage({ text: err.message || 'Failed to delete status', type: 'error' });
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <p className="font-bold text-slate-800">Admin Authorization Required</p>
        <p className="text-xs text-slate-500 mt-1">
          Only administrators can configure lead sources and pipeline stages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-2xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Lead Sources */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Configurable Lead Sources
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage acquisition channels (Website, IndiaMART, Referral, WhatsApp, etc.).
            </p>
          </div>

          {/* Add Source Input */}
          <form onSubmit={handleAddSource} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. LinkedIn Outreach, Trade Fair..."
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Source
            </button>
          </form>

          {/* Sources List */}
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
            {salesSources.map((source) => {
              const isEditing = editingSourceId === source.id;
              return (
                <div key={source.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingSourceName}
                        onChange={(e) => setEditingSourceName(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-blue-400 rounded-lg text-xs flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEditSource(source.id)}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-2xs font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSourceId(null)}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-2xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            source.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span className={`font-semibold ${!source.isActive ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {source.name}
                        </span>
                        {source.isDefault && (
                          <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                            System Default
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingSourceId(source.id);
                            setEditingSourceName(source.name);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleSalesSource(source.id)}
                          className={`px-2 py-0.5 rounded-lg text-3xs font-bold uppercase transition-colors ${
                            source.isActive
                              ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {source.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Pipeline Stages & Statuses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Configurable Pipeline Stages & Statuses
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control stages in the sales funnel (New, Contacted, Proposal, Won, etc.).
            </p>
          </div>

          {/* Add Status Form */}
          <form onSubmit={handleAddStatus} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Legal Review, Demo Scheduled..."
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Stage
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 pl-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newStatusWon}
                  onChange={(e) => {
                    setNewStatusWon(e.target.checked);
                    if (e.target.checked) setNewStatusLost(false);
                  }}
                  className="rounded text-emerald-600"
                />
                <span>Marks Deal as Won</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newStatusLost}
                  onChange={(e) => {
                    setNewStatusLost(e.target.checked);
                    if (e.target.checked) setNewStatusWon(false);
                  }}
                  className="rounded text-rose-600"
                />
                <span>Marks Deal as Lost</span>
              </label>
            </div>
          </form>

          {/* Statuses List */}
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
            {salesStatuses
              .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
              .map((st) => {
                const isEditing = editingStatusId === st.id;
                const canDelete = canDeleteSalesStatus(st.name);

                return (
                  <div key={st.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingStatusName}
                          onChange={(e) => setEditingStatusName(e.target.value)}
                          className="px-2.5 py-1 bg-white border border-indigo-400 rounded-lg text-xs flex-1"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEditStatus(st.id)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-2xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingStatusId(null)}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-2xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-3xs font-mono font-bold text-slate-400 w-4">
                            #{st.stageOrder}
                          </span>
                          <span className="font-bold text-slate-900">{st.name}</span>
                          {st.isWon && (
                            <span className="text-3xs font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Won
                            </span>
                          )}
                          {st.isLost && (
                            <span className="text-3xs font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                              Lost
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingStatusId(st.id);
                              setEditingStatusName(st.name);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => updateSalesStatus(st.id, { isActive: !st.isActive })}
                            className={`px-2 py-0.5 rounded-lg text-3xs font-bold uppercase transition-colors ${
                              st.isActive
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {st.isActive ? 'Active' : 'Inactive'}
                          </button>

                          {canDelete ? (
                            <button
                              title="Delete stage (no historical records using this)"
                              onClick={() => handleDeleteStatus(st)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              title="Protected: referenced by historical leads or STS"
                              className="text-3xs text-slate-400 px-1 italic"
                            >
                              Protected
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
