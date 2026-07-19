import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import {
  ChevronRight,
  MoreVertical,
  X,
  FolderKanban,
  PlayCircle,
  Clock,
  CheckSquare,
  TrendingUp,
} from "lucide-react";

const formatValue = (value) => (value === undefined || value === null ? "—" : value);
const formatPercent = (value) => (value === undefined || value === null ? "—" : `${value}%`);

const PROJECT_SPRINT_STATUS_STYLES = {
  PLANNED: "bg-white/10 text-[#B8B8C0]",
  ACTIVE: "bg-green-500/15 text-green-400",
  ON_HOLD: "bg-yellow-500/15 text-yellow-400",
  COMPLETED: "bg-white/10 text-[#B8B8C0]",
};

const TASK_STATUS_STYLES = {
  TODO: "bg-white/10 text-[#B8B8C0]",
  IN_PROGRESS: "bg-[#7F77DD]/20 text-[#AFA9EC]",
  IN_REVIEW: "bg-yellow-500/15 text-yellow-400",
  DONE: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

const PRIORITY_META = {
  LOW: { label: "Low", dot: "bg-green-400" },
  MEDIUM: { label: "Medium", dot: "bg-yellow-400" },
  HIGH: { label: "High", dot: "bg-orange-400" },
  URGENT: { label: "Urgent", dot: "bg-red-400" },
};

const STAT_CARDS = [
  { key: "totalProjects", label: "Total Projects", icon: FolderKanban },
  { key: "activeSprints", label: "Active Sprints", icon: PlayCircle },
  { key: "pendingSprints", label: "Pending Sprints", icon: Clock },
  { key: "totalTasks", label: "Total Tasks", icon: CheckSquare },
  { key: "completionPct", label: "Completion %", icon: TrendingUp },
];

const parseErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join(", ");
  }
  return detail || fallback;
};

function Badge({ status, styles }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] || "bg-white/10 text-[#B8B8C0]"
      }`}
    >
      {status || "—"}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || { label: priority || "—", dot: "bg-white/30" };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      {meta.label}
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

export default function MemberProject() {
  const { workspaceName, username, userId } = useOutletContext();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [sprintMenuKey, setSprintMenuKey] = useState(null);

  const [drawerSprint, setDrawerSprint] = useState(null);
  const [drawerProjectId, setDrawerProjectId] = useState(null);
  const [drawerTasks, setDrawerTasks] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actioningTaskId, setActioningTaskId] = useState(null);

  const showError = (err, fallback) => {
    if (err.response?.status === 401) {
      setSessionExpired(true);
      return;
    }
    setError(parseErrorMessage(err, fallback));
    setTimeout(() => setError(""), 4000);
  };

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const res = await api.get("/project_service/list_projects");
        setProjects(res.data || []);
      } catch (err) {
        showError(err, "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const toggleProject = (projectId) => {
    setExpandedProjectId((current) => (current === projectId ? null : projectId));
    setSprintMenuKey(null);
  };

  const openTaskDrawer = async (project, sprint) => {
    setSprintMenuKey(null);
    setDrawerSprint(sprint);
    setDrawerProjectId(project.project_id);
    setDrawerLoading(true);
    try {
      const res = await api.get("/task_service/list_by_sprint", {
        params: { sprint_id: sprint.sprint_id },
      });
      setDrawerTasks(res.data || []);
    } catch (err) {
      showError(err, "Failed to load sprint tasks.");
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerSprint(null);
    setDrawerProjectId(null);
    setDrawerTasks([]);
  };

  const handleAssignSelf = async (task) => {
    if (!drawerProjectId) return;
    setActioningTaskId(task.task_id);
    try {
      const res = await api.post("/task_service/self_assign", {
        project_id: drawerProjectId,
        task_id: task.task_id,
      });
      const assignee = res.data?.assignee || { user_id: userId, username };
      setDrawerTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, assignee } : t))
      );
    } catch (err) {
      showError(err, "Failed to assign task.");
    } finally {
      setActioningTaskId(null);
    }
  };

  const handleUnassign = async (task) => {
    if (!drawerProjectId) return;
    setActioningTaskId(task.task_id);
    try {
      await api.post("/task_service/self_unassign", {
        project_id: drawerProjectId,
        task_id: task.task_id,
      });
      setDrawerTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, assignee: null } : t))
      );
    } catch (err) {
      showError(err, "Failed to unassign task.");
    } finally {
      setActioningTaskId(null);
    }
  };

  const totalProjects = projects.length;
  const activeSprints = projects.reduce(
    (sum, p) => sum + (p.sprints || []).filter((s) => s.status === "ACTIVE").length,
    0
  );
  const pendingSprints = projects.reduce(
    (sum, p) => sum + (p.sprints || []).filter((s) => s.status === "PLANNED").length,
    0
  );
  const totalTasks = projects.reduce((sum, p) => sum + (p.task_count ?? 0), 0);
  const completionTotals = projects.reduce(
    (acc, p) => {
      const s = p.tasks_summary || {};
      acc.completed += s.completed ?? 0;
      acc.total += (s.todo ?? 0) + (s.in_progress ?? 0) + (s.in_review ?? 0) + (s.completed ?? 0);
      return acc;
    },
    { completed: 0, total: 0 }
  );
  const completionPct =
    completionTotals.total > 0
      ? Math.round((completionTotals.completed / completionTotals.total) * 100)
      : undefined;

  const statValues = { totalProjects, activeSprints, pendingSprints, totalTasks, completionPct };

  if (sessionExpired) return <SessionExpiredModal />;

  if (loading) {
    return <p className="text-center text-[#6B6B76] py-10">Loading projects...</p>;
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="mt-1 text-[#6B6B76]">
          {workspaceName} | {totalProjects} Projects
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-5">
        {STAT_CARDS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="bg-[#101117] border border-[#262830] rounded-2xl p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7F77DD]/15">
              <Icon className="text-[#7F77DD]" size={18} />
            </div>
            <div className="mt-4 text-2xl font-bold">
              {key === "completionPct" ? formatPercent(statValues[key]) : formatValue(statValues[key])}
            </div>
            <div className="mt-1 text-sm text-[#6B6B76]">{label}</div>
          </div>
        ))}
      </div>

      {/* Project cards */}
      <h2 className="mt-6 font-semibold">Project List</h2>

      {projects.length === 0 ? (
        <div className="mt-4 bg-[#101117] border border-[#262830] rounded-2xl p-10 text-center text-[#6B6B76]">
          No projects yet
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {projects.map((project) => {
            const isExpanded = expandedProjectId === project.project_id;
            const teams = project.teams || [];
            const sprints = project.sprints || [];

            return (
              <div
                key={project.project_id}
                className="bg-[#101117] border border-[#262830] rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => toggleProject(project.project_id)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold truncate">{project.project_title}</h3>
                      <Badge status={project.status} styles={PROJECT_SPRINT_STATUS_STYLES} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B6B76]">
                      <span>
                        Team: {teams.length > 0 ? teams.map((t) => t.name).join(", ") : "—"}
                      </span>
                      <span>Manager: {project.project_manager_name || "Unassigned"}</span>
                      <span>{formatValue(project.task_count)} tasks</span>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    className={`shrink-0 text-[#6B6B76] transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-[#262830] p-5">
                    <h4 className="font-semibold">Sprints</h4>

                    {sprints.length === 0 ? (
                      <p className="py-4 text-center text-sm text-[#6B6B76]">
                        No sprints for this project
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-col gap-3">
                        {sprints.map((sprint) => {
                          const menuKey = `${project.project_id}-${sprint.sprint_id}`;

                          return (
                            <div
                              key={sprint.sprint_id}
                              className="relative rounded-xl border border-[#262830] bg-[#0D0E12] p-4"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{sprint.name}</span>
                                    <Badge
                                      status={sprint.status}
                                      styles={PROJECT_SPRINT_STATUS_STYLES}
                                    />
                                  </div>

                                  <div className="mt-2 h-2 w-full rounded-full bg-[#262830]">
                                    <div
                                      className="h-2 rounded-full bg-[#7F77DD]"
                                      style={{ width: `${sprint.progress ?? 0}%` }}
                                    />
                                  </div>
                                </div>

                                <span className="shrink-0 text-sm text-[#6B6B76]">
                                  {sprint.progress ?? 0}% · Due{" "}
                                  {sprint.due_date
                                    ? new Date(sprint.due_date).toLocaleDateString()
                                    : "—"}
                                </span>

                                <button
                                  onClick={() =>
                                    setSprintMenuKey(sprintMenuKey === menuKey ? null : menuKey)
                                  }
                                  className="shrink-0 rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </div>

                              {sprintMenuKey === menuKey && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setSprintMenuKey(null)}
                                  />

                                  <div className="absolute right-4 top-14 z-20 w-40 rounded-xl border border-[#262830] bg-[#101117] py-1 text-left shadow-xl">
                                    <button
                                      onClick={() => openTaskDrawer(project, sprint)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                                    >
                                      View Tasks
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sprint tasks drawer */}
      {drawerSprint && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={closeDrawer} />

          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[#262830] bg-[#101117] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{drawerSprint.name}</h2>
                <p className="mt-1 text-sm text-[#6B6B76]">Sprint tasks</p>
              </div>

              <button
                onClick={closeDrawer}
                className="rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
              >
                <X size={18} />
              </button>
            </div>

            {drawerLoading ? (
              <p className="py-10 text-center text-[#6B6B76]">Loading tasks...</p>
            ) : drawerTasks.length === 0 ? (
              <p className="py-10 text-center text-[#6B6B76]">No tasks in this sprint</p>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                {drawerTasks.map((task) => {
                  const assignee = task.assignee;
                  const isSelfAssigned = assignee?.user_id === userId;
                  const isActioning = actioningTaskId === task.task_id;

                  return (
                    <div
                      key={task.task_id}
                      className="rounded-xl border border-[#262830] bg-[#0D0E12] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium">{task.task_name}</span>
                        <Badge status={task.status} styles={TASK_STATUS_STYLES} />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-sm text-[#6B6B76]">
                        <PriorityBadge priority={task.priority} />
                        <span>
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={assignee.username || assignee.name} size="h-6 w-6" />
                            <span className="text-sm">
                              {isSelfAssigned ? "You" : assignee.username || assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-[#6B6B76]">Unassigned</span>
                        )}

                        {!assignee && (
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
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
