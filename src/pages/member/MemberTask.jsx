import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import { Search, ChevronDown, ChevronRight, ChevronsRight, MoreVertical, X } from "lucide-react";

const STATUS_BADGE_STYLES = {
  TODO: "bg-white/10 text-[#B8B8C0]",
  IN_PROGRESS: "bg-[#7F77DD]/20 text-[#AFA9EC]",
  IN_REVIEW: "bg-yellow-500/15 text-yellow-400",
  DONE: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

const PRIORITY_BADGE_STYLES = {
  High: "bg-red-500/15 text-red-400",
  Medium: "bg-yellow-500/15 text-yellow-400",
};

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"];
const PRIORITY_OPTIONS = Object.keys(PRIORITY_BADGE_STYLES);

const PAGE_SIZE = 10;

const parseErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join(", ");
  }
  return detail || fallback;
};

function Badge({ label, styles, fallback }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[label] || fallback
      }`}
    >
      {label || "—"}
    </span>
  );
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-[#262830] bg-[#0D0E12] px-4 py-2.5 pr-9 text-sm outline-none focus:border-[#7F77DD]"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B76]"
        size={16}
      />
    </div>
  );
}

function getPageNumbers(page, totalPages) {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 2, 5));
  const pages = [];
  for (let n = Math.max(1, start); n <= end; n++) pages.push(n);
  return pages;
}

export default function MemberTask() {
  const { workspaceName, username, userId } = useOutletContext();

  const [tasks, setTasks] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const showError = (err, fallback) => {
    if (err.response?.status === 401) {
      setSessionExpired(true);
      return;
    }
    setError(parseErrorMessage(err, fallback));
    setTimeout(() => setError(""), 4000);
  };

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);

  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const [actioningTaskId, setActioningTaskId] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await api.get("/project_service/list_projects");
        setProjects((res.data || []).map((p) => ({ ...p, name: p.project_title })));
      } catch (err) {
        showError(err, "Failed to load projects.");
      }
    };

    loadProjects();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await api.get("/task_service/list_tasks", {
        params: {
          mine_or_unassigned: true,
          search: search || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          project_id: projectFilter || undefined,
          page,
          page_size: PAGE_SIZE,
        },
      });

      setTasks(response.data.tasks || []);
      setTotalCount(response.data.total_count ?? 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (err) {
      showError(err, "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, projectFilter, statusFilter, priorityFilter, page]);

  const closeMenus = () => setOpenMenuRowId(null);

  const openTaskDetail = async (taskId) => {
    closeMenus();
    setDetailOpen(true);
    setDetailTask(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const res = await api.get("/task_service/get_task_detail", {
        params: { task_id: taskId },
      });
      setDetailTask(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setSessionExpired(true);
      } else {
        setDetailError(parseErrorMessage(err, "Failed to load task details."));
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const closeTaskDetail = () => {
    setDetailOpen(false);
    setDetailTask(null);
    setDetailError("");
  };

  const handleAssignSelf = async (task) => {
    setActioningTaskId(task.task_id);
    try {
      const res = await api.post("/task_service/self_assign", {
        project_id: task.project_id,
        task_id: task.task_id,
      });
      const assignee = res.data?.assignee || { user_id: userId, username };
      setTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, assignee } : t))
      );
    } catch (err) {
      showError(err, "Failed to assign task.");
    } finally {
      setActioningTaskId(null);
    }
  };

  const handleUnassign = async (task) => {
    setActioningTaskId(task.task_id);
    try {
      await api.post("/task_service/self_unassign", {
        project_id: task.project_id,
        task_id: task.task_id,
      });
      setTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, assignee: null } : t))
      );
    } catch (err) {
      showError(err, "Failed to unassign task.");
    } finally {
      setActioningTaskId(null);
    }
  };

  const pageNumbers = getPageNumbers(page, totalPages);

  if (sessionExpired) return <SessionExpiredModal />;

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <p className="mt-1 text-[#6B6B76]">
          {workspaceName} | {totalCount} Tasks
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {/* Toolbar */}
      <div className="mt-6">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B76]"
            size={16}
          />

          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by task name or ID"
            className="w-full rounded-xl border border-[#262830] bg-[#101117] py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#7F77DD]"
          />
        </div>
      </div>

      {/* Filter row */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        <FilterSelect
          value={projectFilter}
          onChange={(v) => {
            setProjectFilter(v);
            setPage(1);
          }}
          placeholder="Filter by Project"
          options={projects.map((p) => ({ value: p.project_id, label: p.name }))}
        />

        <FilterSelect
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          placeholder="Filter by Status"
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
        />

        <FilterSelect
          value={priorityFilter}
          onChange={(v) => {
            setPriorityFilter(v);
            setPage(1);
          }}
          placeholder="Filter by Priority"
          options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
        />
      </div>

      {/* Table */}
      <div className="mt-6 bg-[#101117] border border-[#262830] rounded-2xl p-5">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#262830] text-[#6B6B76]">
              <th className="pb-3 font-medium">Task Name</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Assigned To</th>
              <th className="pb-3 font-medium">Due Date</th>
              <th className="pb-3 font-medium">Priority</th>
              <th className="pb-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[#6B6B76]">
                  Loading tasks...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[#6B6B76]">
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isUnassigned = !task.assignee;
                const isSelfAssigned = task.assignee?.user_id === userId;
                const isActioning = actioningTaskId === task.task_id;

                return (
                  <tr key={task.task_id} className="border-b border-[#262830] last:border-0">
                    <td className="py-4">
                      <span className="text-[#6B6B76]">#{task.task_id}</span> {task.task_name}
                    </td>

                    <td className="py-4">
                      <Badge
                        label={task.status}
                        styles={STATUS_BADGE_STYLES}
                        fallback="bg-white/10 text-[#B8B8C0]"
                      />
                    </td>

                    <td className="py-4">
                      {isUnassigned ? (
                        <span className="text-[#6B6B76]">Unassigned</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/20 text-xs font-semibold text-[#AFA9EC]">
                            {(isSelfAssigned ? username : task.assignee?.username || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span>{isSelfAssigned ? "You" : task.assignee?.username}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 text-[#6B6B76]">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                    </td>

                    <td className="py-4">
                      <Badge
                        label={task.priority}
                        styles={PRIORITY_BADGE_STYLES}
                        fallback="bg-white/10 text-[#B8B8C0]"
                      />
                    </td>

                    <td className="relative py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isUnassigned && (
                          <button
                            onClick={() => handleAssignSelf(task)}
                            disabled={isActioning}
                            className="rounded-lg bg-[#7F77DD] px-3 py-1.5 text-xs font-medium hover:bg-[#9189ee] disabled:opacity-50"
                          >
                            {isActioning ? "Please wait..." : "Assign to me"}
                          </button>
                        )}

                        {isSelfAssigned && (
                          <button
                            onClick={() => handleUnassign(task)}
                            disabled={isActioning}
                            className="rounded-lg border border-[#262830] px-3 py-1.5 text-xs font-medium hover:bg-white/5 disabled:opacity-50"
                          >
                            {isActioning ? "Please wait..." : "Unassign"}
                          </button>
                        )}

                        <button
                          onClick={() =>
                            setOpenMenuRowId(openMenuRowId === task.task_id ? null : task.task_id)
                          }
                          className="rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {openMenuRowId === task.task_id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={closeMenus} />

                          <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-[#262830] bg-[#101117] py-1 text-left shadow-xl">
                            <button
                              onClick={() => openTaskDetail(task.task_id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                            >
                              View details
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {tasks.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-lg text-sm ${
                  n === page ? "bg-[#7F77DD] text-white" : "text-[#6B6B76] hover:bg-white/5"
                }`}
              >
                {n}
              </button>
            ))}

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-[#262830] p-2 text-[#6B6B76] hover:text-[#E8E8EA] disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="rounded-lg border border-[#262830] p-2 text-[#6B6B76] hover:text-[#E8E8EA] disabled:opacity-40"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Task detail drawer */}
      {detailOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={closeTaskDetail} />

          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[#262830] bg-[#101117] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Task Details</h2>

              <button
                onClick={closeTaskDetail}
                className="rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <p className="mt-6 text-center text-sm text-[#6B6B76]">Loading...</p>
            ) : detailError ? (
              <p className="mt-6 text-sm text-red-400">{detailError}</p>
            ) : detailTask ? (
              <div className="mt-6 flex flex-col gap-4 text-sm">
                <div>
                  <span className="mb-1 block text-xs text-[#6B6B76]">Task Name</span>
                  <span>{detailTask.task_name}</span>
                </div>

                <div>
                  <span className="mb-1 block text-xs text-[#6B6B76]">Description</span>
                  <span className="text-[#B8B8C0]">{detailTask.description || "—"}</span>
                </div>

                <div>
                  <span className="mb-1.5 block text-xs text-[#6B6B76]">Status</span>
                  <Badge
                    label={detailTask.status}
                    styles={STATUS_BADGE_STYLES}
                    fallback="bg-white/10 text-[#B8B8C0]"
                  />
                </div>

                <div>
                  <span className="mb-1.5 block text-xs text-[#6B6B76]">Priority</span>
                  <Badge
                    label={detailTask.priority}
                    styles={PRIORITY_BADGE_STYLES}
                    fallback="bg-white/10 text-[#B8B8C0]"
                  />
                </div>

                <div>
                  <span className="mb-1 block text-xs text-[#6B6B76]">Due Date</span>
                  <span>
                    {detailTask.due_date ? new Date(detailTask.due_date).toLocaleDateString() : "—"}
                  </span>
                </div>

                <div>
                  <span className="mb-1 block text-xs text-[#6B6B76]">Created By</span>
                  <span>{detailTask.created_by || "—"}</span>
                </div>

                <div>
                  <span className="mb-1 block text-xs text-[#6B6B76]">Created At</span>
                  <span>
                    {detailTask.created_at ? new Date(detailTask.created_at).toLocaleString() : "—"}
                  </span>
                </div>

                <div>
                  <span className="mb-1 block text-xs text-[#6B6B76]">Assignee</span>
                  <span>{detailTask.assignee?.username || "Unassigned"}</span>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
