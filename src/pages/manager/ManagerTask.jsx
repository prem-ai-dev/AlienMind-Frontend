import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import { Search, Plus, ChevronDown, ChevronRight, ChevronsRight, MoreVertical, X } from "lucide-react";

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

function Avatar({ name, size = "h-7 w-7" }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/20 text-xs font-semibold text-[#AFA9EC]`}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
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

const EMPTY_CREATE_FORM = {
  task_name: "",
  description: "",
  project_id: "",
  priority: PRIORITY_OPTIONS[0],
  due_date: "",
  sprint_id: "",
};

export default function ManagerTask() {
  const { workspaceName } = useOutletContext();

  // ---- data fetched from backend ----
  const [tasks, setTasks] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);

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
  const [assignSubmenuRowId, setAssignSubmenuRowId] = useState(null);
  const [statusPickerRowId, setStatusPickerRowId] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [taskProjectQuery, setTaskProjectQuery] = useState("");

  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [projectsRes, teamsRes] = await Promise.all([
          api.get("/project_service/list_projects"),
          api.get("/team_service/list_teams_detailed"),
        ]);

        setProjects((projectsRes.data || []).map((p) => ({ ...p, name: p.project_title })));
        setTeams(teamsRes.data || []);
      } catch (err) {
        showError(err, "Failed to load filters.");
      }
    };

    loadFilterData();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await api.get("/task_service/list_tasks", {
        params: {
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

  const teamsById = Object.fromEntries(teams.map((t) => [t.team_id, t]));

  const getProjectMembers = (projectId) => {
    const project = projects.find((p) => p.project_id === projectId);
    if (!project) return [];

    const seen = new Set();
    const members = [];

    (project.teams || []).forEach((t) => {
      const team = teamsById[t.team_id];
      (team?.members || []).forEach((m) => {
        if (!seen.has(m.user_id)) {
          seen.add(m.user_id);
          members.push(m);
        }
      });
    });

    return members;
  };

  const closeMenus = () => {
    setOpenMenuRowId(null);
    setAssignSubmenuRowId(null);
  };

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

  const assignMember = async (task, member) => {
    closeMenus();
    try {
      const res = await api.post("/task_service/assign_member", {
        project_id: task.project_id,
        task_id: task.task_id,
        member_id: member.user_id,
      });
      const assignee = res.data?.assignee || { user_id: member.user_id, username: member.username };
      setTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, assignee } : t))
      );
    } catch (err) {
      showError(err, "Failed to assign task.");
    }
  };

  const unassignMember = async (task) => {
    closeMenus();
    if (!task.assignee) return;

    try {
      await api.post("/task_service/remove_member_from_task", {
        project_id: task.project_id,
        task_id: task.task_id,
        member_id: task.assignee.user_id,
      });
      setTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, assignee: null } : t))
      );
    } catch (err) {
      showError(err, "Failed to unassign task.");
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    setStatusPickerRowId(null);
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task) return;

    try {
      const res = await api.post("/task_service/update_task_status", {
        project_id: task.project_id,
        task_id: taskId,
        status,
      });
      setTasks((prev) =>
        prev.map((t) => (t.task_id === taskId ? { ...t, status: res.data.status } : t))
      );
    } catch (err) {
      showError(err, "Failed to update task status.");
    }
  };

  const selectedCreateProject = projects.find((p) => p.project_id === createForm.project_id) || null;
  const createProjectOptions = projects.filter((p) =>
    p.name?.toLowerCase().includes(taskProjectQuery.toLowerCase())
  );
  const createSprintOptions = selectedCreateProject?.sprints || [];

  const closeCreateTaskModal = () => {
    setCreateTaskOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setTaskProjectQuery("");
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.task_name.trim() || !createForm.project_id || !createForm.due_date) return;

    try {
      await api.post("/task_service/create_task", {
        task_name: createForm.task_name.trim(),
        description: createForm.description.trim(),
        project_id: createForm.project_id,
        priority: createForm.priority,
        due_date: createForm.due_date,
        ...(createForm.sprint_id ? { sprint_id: createForm.sprint_id } : {}),
      });
      await fetchTasks();
      closeCreateTaskModal();
    } catch (err) {
      showError(err, "Failed to create task.");
    }
  };

  const pageNumbers = getPageNumbers(page, totalPages);

  if (sessionExpired) return <SessionExpiredModal />;

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="mt-1 text-[#6B6B76]">
          {workspaceName} | {totalCount} Tasks
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {/* Toolbar */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => setCreateTaskOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[#7F77DD] px-4 py-2.5 text-sm font-medium hover:bg-[#9189ee]"
        >
          <Plus size={16} />
          Create Task
        </button>

        <div className="relative flex-1">
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
            className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#7F77DD]"
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
              <th className="pb-3 font-medium">Priority</th>
              <th className="pb-3 font-medium">Due Date</th>
              <th className="pb-3 font-medium">Assignee</th>
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
                const projectMembers = getProjectMembers(task.project_id);

                return (
                  <tr key={task.task_id} className="border-b border-[#262830] last:border-0">
                    <td className="py-4">
                      <span className="text-[#6B6B76]">#{task.task_id}</span> {task.task_name}
                    </td>

                    <td className="py-4">
                      {statusPickerRowId === task.task_id ? (
                        <select
                          autoFocus
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.task_id, e.target.value)}
                          onBlur={() => setStatusPickerRowId(null)}
                          className="rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-1.5 text-sm outline-none focus:border-[#7F77DD]"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge
                          label={task.status}
                          styles={STATUS_BADGE_STYLES}
                          fallback="bg-white/10 text-[#B8B8C0]"
                        />
                      )}
                    </td>

                    <td className="py-4">
                      <Badge
                        label={task.priority}
                        styles={PRIORITY_BADGE_STYLES}
                        fallback="bg-white/10 text-[#B8B8C0]"
                      />
                    </td>

                    <td className="py-4 text-[#6B6B76]">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                    </td>

                    <td className="py-4">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assignee.username} size="h-7 w-7" />
                          <span>{task.assignee.username}</span>
                        </div>
                      ) : (
                        <span className="text-[#6B6B76]">Unassigned</span>
                      )}
                    </td>

                    <td className="relative py-4 text-right">
                      <button
                        onClick={() =>
                          setOpenMenuRowId(openMenuRowId === task.task_id ? null : task.task_id)
                        }
                        className="rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuRowId === task.task_id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={closeMenus} />

                          <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-[#262830] bg-[#101117] py-1 text-left shadow-xl">
                            <button
                              onClick={() => openTaskDetail(task.task_id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                            >
                              View details
                            </button>

                            <button
                              onClick={() => {
                                setStatusPickerRowId(task.task_id);
                                closeMenus();
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                            >
                              Change status
                            </button>

                            <div className="my-1 border-t border-[#262830]" />

                            <button
                              onClick={() =>
                                setAssignSubmenuRowId(
                                  assignSubmenuRowId === task.task_id ? null : task.task_id
                                )
                              }
                              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[#6B6B76] hover:bg-white/5"
                            >
                              Assign member
                              <ChevronRight size={14} />
                            </button>

                            {assignSubmenuRowId === task.task_id && (
                              <div className="max-h-48 overflow-y-auto border-y border-[#262830] py-1">
                                {projectMembers.length === 0 ? (
                                  <p className="px-4 py-2 text-xs text-[#6B6B76]">
                                    No members on this project's teams
                                  </p>
                                ) : (
                                  projectMembers.map((member) => (
                                    <button
                                      key={member.user_id}
                                      onClick={() => assignMember(task, member)}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-white/5"
                                    >
                                      <Avatar name={member.username} size="h-6 w-6" />
                                      {member.username}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}

                            {task.assignee && (
                              <button
                                onClick={() => unassignMember(task)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                              >
                                Unassign
                              </button>
                            )}
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

      {/* Create Task modal */}
      {createTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-md bg-[#101117] border border-[#262830] rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Create Task</h2>

            <form onSubmit={handleCreateTaskSubmit}>
              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Task Name</label>
                <input
                  type="text"
                  value={createForm.task_name}
                  onChange={(e) => setCreateForm({ ...createForm, task_name: e.target.value })}
                  placeholder="e.g. Fix login redirect bug"
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the task"
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Project</label>

                {selectedCreateProject ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#262830] bg-white/5 px-3 py-2">
                    <span className="text-sm">{selectedCreateProject.name}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setCreateForm({ ...createForm, project_id: "", sprint_id: "" })
                      }
                      className="text-[#6B6B76] hover:text-[#E8E8EA]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B76]"
                      size={14}
                    />

                    <input
                      type="text"
                      value={taskProjectQuery}
                      onChange={(e) => setTaskProjectQuery(e.target.value)}
                      placeholder="Search project"
                      className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] py-2 pl-8 pr-3 text-sm outline-none focus:border-[#7F77DD]"
                    />

                    {taskProjectQuery && (
                      <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-[#262830] bg-[#101117] py-1 shadow-xl">
                        {createProjectOptions.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-[#6B6B76]">No matches</p>
                        ) : (
                          createProjectOptions.map((p) => (
                            <button
                              key={p.project_id}
                              type="button"
                              onClick={() => {
                                setCreateForm({ ...createForm, project_id: p.project_id, sprint_id: "" });
                                setTaskProjectQuery("");
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                            >
                              {p.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">
                  Sprint <span className="text-[#6B6B76]">(optional)</span>
                </label>
                <select
                  value={createForm.sprint_id}
                  onChange={(e) => setCreateForm({ ...createForm, sprint_id: e.target.value })}
                  disabled={!selectedCreateProject}
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD] disabled:opacity-50"
                >
                  <option value="">No sprint</option>
                  {createSprintOptions.map((s) => (
                    <option key={s.sprint_id} value={s.sprint_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Priority</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Due Date</label>
                <input
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateTaskModal}
                  className="rounded-xl border border-[#262830] px-4 py-2 text-sm hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-full bg-[#7F77DD] px-4 py-2 text-sm font-medium hover:bg-[#9189ee]"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    {detailTask.due_date
                      ? new Date(detailTask.due_date).toLocaleDateString()
                      : "—"}
                  </span>
                </div>

                <div>
                  <span className="mb-1 block text-xs text-[#6B6B76]">Created By</span>
                  <span>{detailTask.created_by || "—"}</span>
                </div>

                <div>
                  <span className="mb-1 block text-xs text-[#6B6B76]">Created At</span>
                  <span>
                    {detailTask.created_at
                      ? new Date(detailTask.created_at).toLocaleString()
                      : "—"}
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
