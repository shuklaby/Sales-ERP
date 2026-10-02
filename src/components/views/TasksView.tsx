import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Clock,
  User,
  Building,
  Target,
  FileText,
  CreditCard,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Kanban,
  List,
} from 'lucide-react';
import { TaskRecord, TaskPriority, TaskStatus } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';

export const TasksView: React.FC = () => {
  const {
    taskRecords,
    employeeRecords,
    employees,
    customers,
    leads,
    proposals,
    invoices,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    generateNextTaskNumber,
  } = useCrmData();

  const { isAdmin, userProfile, hasPermission } = useAuth();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskRecord | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<TaskStatus>('Todo');
  const [customerId, setCustomerId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Today in YYYY-MM-DD
  const todayYmd = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Staff members list
  const staffList = useMemo(() => {
    if (employeeRecords.length > 0) {
      return employeeRecords.map((e) => ({
        id: e.employeeId || e.id,
        name: e.name || `${e.firstName} ${e.lastName}`,
        code: e.employeeCode,
      }));
    }
    return employees.map((u) => ({
      id: u.uid,
      name: u.name,
      code: (u as any).employeeCode || 'EMP',
    }));
  }, [employeeRecords, employees]);

  // Scoped tasks based on user role and data scope
  const scopedTasks = useMemo(() => {
    if (isAdmin) return taskRecords;
    return taskRecords.filter(
      (t) =>
        t.assignedTo === userProfile?.uid ||
        t.createdBy === userProfile?.uid ||
        (userProfile?.email && t.assignedToName?.includes(userProfile.email))
    );
  }, [taskRecords, isAdmin, userProfile]);

  const filteredTasks = useMemo(() => {
    return scopedTasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.taskNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.assignedToName && t.assignedToName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
      const matchAssignee = assigneeFilter === 'All' || t.assignedTo === assigneeFilter;

      return matchSearch && matchStatus && matchPriority && matchAssignee;
    });
  }, [scopedTasks, searchTerm, statusFilter, priorityFilter, assigneeFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = scopedTasks.length;
    const todo = scopedTasks.filter((t) => t.status === 'Todo').length;
    const inProgress = scopedTasks.filter((t) => t.status === 'In Progress').length;
    const completed = scopedTasks.filter((t) => t.status === 'Completed').length;
    const overdue = scopedTasks.filter(
      (t) => t.dueDate < todayYmd && t.status !== 'Completed' && t.status !== 'Cancelled'
    ).length;
    const urgent = scopedTasks.filter(
      (t) => t.priority === 'Urgent' && t.status !== 'Completed' && t.status !== 'Cancelled'
    ).length;
    return { total, todo, inProgress, completed, overdue, urgent };
  }, [scopedTasks, todayYmd]);

  const openCreateModal = () => {
    setTaskToEdit(null);
    setTitle('');
    setDescription('');
    setAssignedTo(userProfile?.uid || staffList[0]?.id || '');
    setPriority('Medium');
    setDueDate(todayYmd);
    setStatus('Todo');
    setCustomerId('');
    setLeadId('');
    setProposalId('');
    setInvoiceId('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskRecord) => {
    setTaskToEdit(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setAssignedTo(task.assignedTo);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setStatus(task.status);
    setCustomerId(task.customerId || '');
    setLeadId(task.leadId || '');
    setProposalId(task.proposalId || '');
    setInvoiceId(task.invoiceId || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Task title is required');
      return;
    }
    if (!assignedTo) {
      setFormError('Assignee is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const assignedStaff = staffList.find((s) => s.id === assignedTo);
      const custObj = customers.find((c) => c.customerId === customerId || c.id === customerId);
      const leadObj = leads.find((l) => l.leadId === leadId || l.id === leadId);
      const propObj = proposals.find((p) => p.proposalNumber === proposalId || p.id === proposalId);
      const invObj = invoices.find((i) => i.invoiceNumber === invoiceId || i.id === invoiceId);

      if (taskToEdit) {
        await updateTask(taskToEdit.id, {
          title,
          description,
          assignedTo,
          assignedToName: assignedStaff?.name || taskToEdit.assignedToName,
          priority,
          dueDate,
          status,
          customerId: customerId || undefined,
          customerName: custObj?.companyName || taskToEdit.customerName,
          leadId: leadId || undefined,
          leadName: leadObj?.companyName || taskToEdit.leadName,
          proposalId: proposalId || undefined,
          proposalNumber: propObj?.proposalNumber || taskToEdit.proposalNumber,
          invoiceId: invoiceId || undefined,
          invoiceNumber: invObj?.invoiceNumber || taskToEdit.invoiceNumber,
          completedAt: status === 'Completed' ? new Date().toISOString() : undefined,
        });
      } else {
        await createTask({
          title,
          description,
          assignedTo,
          assignedToName: assignedStaff?.name || 'Assigned Staff',
          priority,
          dueDate,
          status,
          customerId: customerId || undefined,
          customerName: custObj?.companyName,
          leadId: leadId || undefined,
          leadName: leadObj?.companyName,
          proposalId: proposalId || undefined,
          proposalNumber: propObj?.proposalNumber,
          invoiceId: invoiceId || undefined,
          invoiceNumber: invObj?.invoiceNumber,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error saving task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (task: TaskRecord, nextStatus: TaskStatus) => {
    try {
      await updateTaskStatus(task.id, nextStatus);
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(id);
    } catch (err: any) {
      alert(`Error deleting task: ${err.message}`);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Urgent':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Waiting':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'Todo':
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            Employee Task Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational deadlines, assignment workflows, priority enforcement & client linked deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'list' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'kanban' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Kanban View"
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Create Task
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tasks</span>
          <span className="text-xl font-black text-slate-900 block mt-1">{metrics.total}</span>
        </div>
        <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-2xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Todo</span>
          <span className="text-xl font-black text-indigo-950 block mt-1">{metrics.todo}</span>
        </div>
        <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">In Progress</span>
          <span className="text-xl font-black text-blue-950 block mt-1">{metrics.inProgress}</span>
        </div>
        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Completed</span>
          <span className="text-xl font-black text-emerald-950 block mt-1">{metrics.completed}</span>
        </div>
        <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Overdue</span>
          <span className="text-xl font-black text-rose-950 block mt-1">{metrics.overdue}</span>
        </div>
        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-100 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Urgent Priority</span>
          <span className="text-xl font-black text-amber-950 block mt-1">{metrics.urgent}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks by title, task #, assignee, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting">Waiting</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {isAdmin && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 max-w-[180px]"
            >
              <option value="All">All Assignees</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Task Display: List or Kanban */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No tasks found matching your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Task #</th>
                    <th className="p-3.5">Title & Description</th>
                    <th className="p-3.5">Assignee</th>
                    <th className="p-3.5">Linked Entity</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((task) => {
                    const isOverdue =
                      task.dueDate < todayYmd &&
                      task.status !== 'Completed' &&
                      task.status !== 'Cancelled';

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono font-bold text-indigo-600 whitespace-nowrap">
                          {task.taskNumber}
                        </td>
                        <td className="p-3.5 max-w-sm">
                          <span className="font-bold text-slate-800 block text-xs">{task.title}</span>
                          {task.description && (
                            <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {task.description}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-medium text-slate-700">
                          {task.assignedToName || 'Assigned Staff'}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {task.customerName ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              <Building className="w-3 h-3 text-slate-400" /> {task.customerName}
                            </span>
                          ) : task.leadName ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              <Target className="w-3 h-3 text-slate-400" /> {task.leadName}
                            </span>
                          ) : task.proposalNumber ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              <FileText className="w-3 h-3 text-slate-400" /> {task.proposalNumber}
                            </span>
                          ) : task.invoiceNumber ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              <CreditCard className="w-3 h-3 text-slate-400" /> {task.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">General Internal</span>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'
                            }`}
                          >
                            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                            {task.dueDate}
                          </span>
                          {isOverdue && (
                            <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                              Overdue
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {task.status !== 'Completed' && (
                              <button
                                onClick={() => handleQuickStatusChange(task, 'Completed')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Mark Completed"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Task"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['Todo', 'In Progress', 'Waiting', 'Completed'] as TaskStatus[]).map((colStatus) => {
            const tasksInCol = filteredTasks.filter((t) => t.status === colStatus);

            return (
              <div
                key={colStatus}
                className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {colStatus}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                    {tasksInCol.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {tasksInCol.map((task) => {
                    const isOverdue =
                      task.dueDate < todayYmd &&
                      task.status !== 'Completed' &&
                      task.status !== 'Cancelled';

                    return (
                      <div
                        key={task.id}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-indigo-600">
                            {task.taskNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getPriorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-800 leading-snug">{task.title}</h4>

                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 truncate max-w-[100px]">
                            {task.assignedToName?.split(' ')[0]}
                          </span>
                          <span
                            className={`font-mono text-[10px] ${
                              isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {task.dueDate}
                          </span>
                        </div>

                        {/* Quick Kanban Transitions */}
                        <div className="flex items-center justify-end gap-1 pt-1">
                          <button
                            onClick={() => openEditModal(task)}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {colStatus !== 'Completed' && (
                            <button
                              onClick={() => handleQuickStatusChange(task, 'Completed')}
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold transition"
                            >
                              Done
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in my-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {taskToEdit ? `Edit Task ${taskToEdit.taskNumber}` : 'Create New Task'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure assignment, priority, client linkages and deadline requirements.
            </p>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on custom ERP pricing proposal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed instructions or context for this assignment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Employee *</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Due Date (Deadline) *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Task Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting">Waiting</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Optional Entity Linking */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                  Link to Business Record (Optional)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Customer</label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">None</option>
                      {customers.map((c) => (
                        <option key={c.customerId} value={c.customerId}>
                          {c.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Lead</label>
                    <select
                      value={leadId}
                      onChange={(e) => setLeadId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">None</option>
                      {leads.map((l) => (
                        <option key={l.leadId} value={l.leadId}>
                          {l.companyName} ({l.leadId})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Saving...' : taskToEdit ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
