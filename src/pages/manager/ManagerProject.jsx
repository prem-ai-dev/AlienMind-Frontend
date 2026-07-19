import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import { ChevronRight, MoreVertical, Plus, X } from "lucide-react";

const formatValue = (value) => (value === undefined || value === null ? "—" : value);

const STATUS_BADGE_STYLES = {
  PLANNED: "bg-white/10 text-[#B8B8C0]",
  ACTIVE: "bg-green-500/15 text-green-400",
  ON_HOLD: "bg-yellow-500/15 text-yellow-400",
  COMPLETED: "bg-white/10 text-[#B8B8C0]",
};

const PRIORITY_BADGE_STYLES = {
  High: "bg-red-500/15 text-red-400",
  Medium: "bg-yellow-500/15 text-yellow-400",
};

const STATUS_UPDATE_OPTIONS = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"];
const SPRINT_STATUS_OPTIONS = ["PLANNED", "ACTIVE", "COMPLETED"];

const mapProject = (project) => ({ ...project, name: project.project_title });

const parseErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join(", ");
  }
  return detail || fallback;
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_BADGE_STYLES[status] || "bg-white/10 text-[#B8B8C0]"
      }`}
    >
      {status || "—"}
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

export default function ManagerProject() {
  const { workspaceName, userId } = useOutletContext();

  // ---- data fetched from backend ----
  const [localProjects, setLocalProjects] = useState([]);
  const [teamsDetailed, setTeamsDetailed] = useState([]);

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

  const fetchProjects = async () => {
    const response = await api.get("/project_service/list_projects");
    setLocalProjects(response.data.map(mapProject));
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [projectsRes, teamsRes] = await Promise.all([
          api.get("/project_service/list_projects"),
          api.get("/team_service/list_teams_detailed"),
        ]);

        setLocalProjects(projectsRes.data.map(mapProject));
        setTeamsDetailed(teamsRes.data || []);
      } catch (err) {
        showError(err, "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const teamsById = Object.fromEntries(teamsDetailed.map((t) => [t.team_id, t]));

  const getProjectMembers = (project) => {
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

  // ---- UI-only state ----
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const [statusPickerRowId, setStatusPickerRowId] = useState(null);

  const [sprintMenuRowId, setSprintMenuRowId] = useState(null);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");

  const [editSprintTarget, setEditSprintTarget] = useState(null);
  const [editSprintStatus, setEditSprintStatus] = useState("PLANNED");

  const [taskDrawer, setTaskDrawer] = useState(null); // { project, sprint }
  const [drawerTasks, setDrawerTasks] = useState([]);
  const [assignSubmenuTaskId, setAssignSubmenuTaskId] = useState(null);

  const closeRowMenus = () => {
    setOpenMenuRowId(null);
    setStatusPickerRowId(null);
  };

  const toggleProject = (projectId) => {
    setExpandedProjectId((current) => (current === projectId ? null : projectId));
    closeRowMenus();
    setSprintMenuRowId(null);
    setCreateSprintOpen(false);
  };

  const updateProjectStatus = async (projectId, status) => {
    closeRowMenus();
    try {
      const res = await api.post("/project_service/update_project_status", {
        project_id: projectId,
        status,
      });
      setLocalProjects((prev) =>
        prev.map((p) => (p.project_id === projectId ? { ...p, status: res.data.status } : p))
      );
    } catch (err) {
      showError(err, "Failed to update project status.");
    }
  };

  const openCreateSprint = () => {
    setCreateSprintOpen(true);
    setNewSprintName("");
    setNewSprintStart("");
    setNewSprintEnd("");
  };

  const handleCreateSprintSubmit = async (e, projectId) => {
    e.preventDefault();
    if (!newSprintName.trim()) return;

    try {
      await api.post("/sprint_service/create_sprint", {
        sprint_name: newSprintName.trim(),
        sprint_start_date: newSprintStart,
        sprint_end_date: newSprintEnd,
        project_id: projectId,
      });
      await fetchProjects();
      setCreateSprintOpen(false);
    } catch (err) {
      showError(err, "Failed to create sprint.");
    }
  };

  const openEditSprint = (project, sprint) => {
    setEditSprintTarget({ project_id: project.project_id, sprint_id: sprint.sprint_id });
    setEditSprintStatus(sprint.status || "PLANNED");
    setSprintMenuRowId(null);
  };

  const closeEditSprint = () => {
    setEditSprintTarget(null);
  };

  const handleEditSprintSubmit = async (e) => {
    e.preventDefault();
    if (!editSprintTarget) return;

    try {
      const res = await api.post("/sprint_service/update_status", {
        project_id: editSprintTarget.project_id,
        sprint_id: editSprintTarget.sprint_id,
        status: editSprintStatus,
      });
      setLocalProjects((prev) =>
        prev.map((p) =>
          p.project_id === editSprintTarget.project_id
            ? {
                ...p,
                sprints: (p.sprints || []).map((s) =>
                  s.sprint_id === editSprintTarget.sprint_id ? { ...s, status: res.data.status } : s
                ),
              }
            : p
        )
      );
      setEditSprintTarget(null);
    } catch (err) {
      showError(err, "Failed to update sprint status.");
    }
  };

  const openTaskDrawer = async (project, sprint) => {
    setTaskDrawer({ project, sprint });
    setSprintMenuRowId(null);
    setAssignSubmenuTaskId(null);
    try {
      const res = await api.get("/task_service/list_by_sprint", {
        params: { sprint_id: sprint.sprint_id },
      });
      setDrawerTasks(res.data || []);
    } catch (err) {
      showError(err, "Failed to load sprint tasks.");
    }
  };

  const closeTaskDrawer = () => {
    setTaskDrawer(null);
    setDrawerTasks([]);
    setAssignSubmenuTaskId(null);
  };

  const assignMember = async (task, member) => {
    setAssignSubmenuTaskId(null);
    try {
      const res = await api.post("/task_service/assign_member", {
        project_id: taskDrawer.project.project_id,
        task_id: task.task_id,
        member_id: member.user_id,
      });
      const assignee = res.data?.assignee || { user_id: member.user_id, username: member.username };
      setDrawerTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, assignee } : t))
      );
    } catch (err) {
      showError(err, "Failed to assign task.");
    }
  };

  const unassignMember = async (task) => {
    if (!task.assignee) return;
    try {
      await api.post("/task_service/remove_member_from_task", {
        project_id: taskDrawer.project.project_id,
        task_id: task.task_id,
        member_id: task.assignee.user_id,
      });
      setDrawerTasks((prev) =>
        prev.map((t) => (t.task_id === task.task_id ? { ...t, assignee: null } : t))
      );
    } catch (err) {
      showError(err, "Failed to unassign task.");
    }
  };

  if (sessionExpired) return <SessionExpiredModal />;

  if (loading) {
    return <p className="text-center text-[#6B6B76] py-10">Loading projects...</p>;
  }

  const drawerProject = taskDrawer?.project || null;
  const drawerIsOwner = drawerProject ? drawerProject.project_manager_id === userId : false;
  const drawerMembers = drawerProject ? getProjectMembers(drawerProject) : [];

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="mt-1 text-[#6B6B76]">
          {workspaceName} | {localProjects.length} Projects
        </p>
      </div>

      {/* Project List */}
      <div className="mt-6 bg-[#101117] border border-[#262830] rounded-2xl p-5">
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_auto_auto] gap-4 border-b border-[#262830] pb-3 text-sm text-[#6B6B76]">
          <span>Project Name</span>
          <span>Manager</span>
          <span>Teams</span>
          <span>Task Count</span>
          <span>Actions</span>
          <span>Expand</span>
        </div>

        {localProjects.length === 0 ? (
          <p className="py-10 text-center text-[#6B6B76]">No projects yet</p>
        ) : (
          <div className="flex flex-col">
            {localProjects.map((project) => {
              const isExpanded = expandedProjectId === project.project_id;
              const isOwner = project.project_manager_id === userId;
              const projectTeams = project.teams || [];
              const summary = project.tasks_summary || {};

              return (
                <div key={project.project_id} className="border-b border-[#262830] last:border-0">
                  <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_auto_auto] items-center gap-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <button
                        onClick={() => toggleProject(project.project_id)}
                        className="text-left font-medium hover:text-[#AFA9EC]"
                      >
                        {project.name}
                      </button>

                      {isOwner && statusPickerRowId === project.project_id ? (
                        <select
                          autoFocus
                          value={project.status}
                          onChange={(e) => updateProjectStatus(project.project_id, e.target.value)}
                          onBlur={() => setStatusPickerRowId(null)}
                          className="rounded-lg border border-[#262830] bg-[#0D0E12] px-2 py-1 text-xs outline-none focus:border-[#7F77DD]"
                        >
                          {STATUS_UPDATE_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={project.status} />
                      )}
                    </div>

                    <div>
                      {project.project_manager_name ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={project.project_manager_name} size="h-6 w-6" />
                          <span className="truncate text-sm">{project.project_manager_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-[#6B6B76]">Unassigned</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {projectTeams.length === 0 ? (
                        <span className="text-sm text-[#6B6B76]">—</span>
                      ) : (
                        projectTeams.map((team) => (
                          <span
                            key={team.team_id}
                            className="inline-flex rounded-full bg-white/5 px-2.5 py-1 text-xs"
                          >
                            {team.name}
                          </span>
                        ))
                      )}
                    </div>

                    <span className="text-sm text-[#6B6B76]">{formatValue(project.task_count)}</span>

                    <div className="relative">
                      {isOwner && (
                        <button
                          onClick={() =>
                            setOpenMenuRowId(
                              openMenuRowId === project.project_id ? null : project.project_id
                            )
                          }
                          className="rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
                        >
                          <MoreVertical size={16} />
                        </button>
                      )}

                      {isOwner && openMenuRowId === project.project_id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={closeRowMenus} />

                          <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-[#262830] bg-[#101117] py-1 text-left shadow-xl">
                            <button
                              onClick={() => {
                                setStatusPickerRowId(project.project_id);
                                setOpenMenuRowId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                            >
                              Edit Status
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => toggleProject(project.project_id)}
                      className="rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
                    >
                      <ChevronRight
                        size={16}
                        className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mb-4 rounded-xl border border-[#262830] bg-[#0D0E12] p-5">
                      <h3 className="text-lg font-semibold">{project.name}</h3>

                      <div className="mt-4">
                        <span className="mb-1.5 block text-xs text-[#6B6B76]">Project Manager</span>
                        {project.project_manager_name ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={project.project_manager_name} />
                            <span className="text-sm">{project.project_manager_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-[#6B6B76]">Unassigned</span>
                        )}
                      </div>

                      <div className="mt-4">
                        <span className="mb-1.5 block text-xs text-[#6B6B76]">Teams</span>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {projectTeams.length === 0 ? (
                            <span className="text-sm text-[#6B6B76]">—</span>
                          ) : (
                            projectTeams.map((team) => (
                              <span
                                key={team.team_id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs"
                              >
                                {team.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="mb-1.5 block text-xs text-[#6B6B76]">Task Summary</span>

                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-[#B8B8C0]">
                            To Do {formatValue(summary.todo)}
                          </span>
                          <span className="inline-flex rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-400">
                            In Progress {formatValue(summary.in_progress)}
                          </span>
                          <span className="inline-flex rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-400">
                            Completed {formatValue(summary.completed)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between">
                        <h4 className="font-semibold">Sprints</h4>

                        {isOwner && (
                          <button
                            onClick={openCreateSprint}
                            className="flex items-center gap-1.5 rounded-full bg-[#7F77DD] px-3 py-1.5 text-sm font-medium hover:bg-[#9189ee]"
                          >
                            <Plus size={14} />
                            Create Sprint
                          </button>
                        )}
                      </div>

                      {isOwner && createSprintOpen && (
                        <form
                          onSubmit={(e) => handleCreateSprintSubmit(e, project.project_id)}
                          className="mt-3 rounded-xl border border-[#262830] bg-[#101117] p-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={newSprintName}
                              onChange={(e) => setNewSprintName(e.target.value)}
                              placeholder="Sprint name"
                              className="rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                            />

                            <input
                              type="date"
                              value={newSprintStart}
                              onChange={(e) => setNewSprintStart(e.target.value)}
                              className="rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                            />

                            <input
                              type="date"
                              value={newSprintEnd}
                              onChange={(e) => setNewSprintEnd(e.target.value)}
                              className="rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                            />
                          </div>

                          <div className="mt-3 flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setCreateSprintOpen(false)}
                              className="rounded-xl border border-[#262830] px-4 py-2 text-sm hover:bg-white/5"
                            >
                              Cancel
                            </button>

                            <button
                              type="submit"
                              className="rounded-xl bg-[#7F77DD] px-4 py-2 text-sm font-medium hover:bg-[#9189ee]"
                            >
                              Create Sprint
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="mt-3 flex flex-col gap-3">
                        {(project.sprints || []).length === 0 ? (
                          <p className="py-4 text-center text-sm text-[#6B6B76]">
                            No sprints for this project
                          </p>
                        ) : (
                          project.sprints.map((sprint) => (
                            <div
                              key={sprint.sprint_id}
                              className="relative rounded-xl border border-[#262830] bg-[#101117] p-4"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{sprint.name}</span>
                                    <StatusBadge status={sprint.status} />
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
                                    setSprintMenuRowId(
                                      sprintMenuRowId === sprint.sprint_id ? null : sprint.sprint_id
                                    )
                                  }
                                  className="shrink-0 rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </div>

                              {sprintMenuRowId === sprint.sprint_id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setSprintMenuRowId(null)}
                                  />

                                  <div className="absolute right-4 top-14 z-20 w-40 rounded-xl border border-[#262830] bg-[#101117] py-1 text-left shadow-xl">
                                    <button
                                      onClick={() => openTaskDrawer(project, sprint)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                                    >
                                      View tasks
                                    </button>

                                    {isOwner && (
                                      <button
                                        onClick={() => openEditSprint(project, sprint)}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                                      >
                                        Edit sprint
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Sprint modal */}
      {editSprintTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm bg-[#101117] border border-[#262830] rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Edit Sprint</h2>

            <form onSubmit={handleEditSprintSubmit}>
              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Status</label>

                <div className="flex flex-col gap-2">
                  {SPRINT_STATUS_OPTIONS.map((status) => (
                    <label key={status} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="edit-sprint-status"
                        value={status}
                        checked={editSprintStatus === status}
                        onChange={() => setEditSprintStatus(status)}
                        className="accent-[#7F77DD]"
                      />
                      {status}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditSprint}
                  className="rounded-xl border border-[#262830] px-4 py-2 text-sm hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#7F77DD] px-4 py-2 text-sm font-medium hover:bg-[#9189ee]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sprint tasks drawer */}
      {taskDrawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={closeTaskDrawer} />

          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[#262830] bg-[#101117] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{taskDrawer.sprint.name}</h2>
                <p className="mt-1 text-sm text-[#6B6B76]">Sprint tasks</p>
              </div>

              <button
                onClick={closeTaskDrawer}
                className="rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
              >
                <X size={18} />
              </button>
            </div>

            <table className="mt-6 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#262830] text-[#6B6B76]">
                  <th className="pb-3 font-medium">Task Name</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Priority</th>
                  <th className="pb-3 font-medium">Assigned To</th>
                  {drawerIsOwner && <th className="pb-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>

              <tbody>
                {drawerTasks.length === 0 ? (
                  <tr>
                    <td colSpan={drawerIsOwner ? 5 : 4} className="py-10 text-center text-[#6B6B76]">
                      No tasks in this sprint
                    </td>
                  </tr>
                ) : (
                  drawerTasks.map((task) => (
                    <tr key={task.task_id} className="border-b border-[#262830] last:border-0">
                      <td className="py-3">{task.title}</td>
                      <td className="py-3">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            PRIORITY_BADGE_STYLES[task.priority] || "bg-white/10 text-[#B8B8C0]"
                          }`}
                        >
                          {task.priority || "—"}
                        </span>
                      </td>
                      <td className="py-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={task.assignee.username} size="h-6 w-6" />
                            <span>{task.assignee.username}</span>
                          </div>
                        ) : (
                          <span className="text-[#6B6B76]">Unassigned</span>
                        )}
                      </td>

                      {drawerIsOwner && (
                        <td className="relative py-3 text-right">
                          <button
                            onClick={() =>
                              setAssignSubmenuTaskId(
                                assignSubmenuTaskId === task.task_id ? null : task.task_id
                              )
                            }
                            className="rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {assignSubmenuTaskId === task.task_id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setAssignSubmenuTaskId(null)}
                              />

                              <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-[#262830] bg-[#101117] py-1 text-left shadow-xl">
                                <p className="px-4 pb-1 pt-2 text-xs text-[#6B6B76]">Assign member</p>

                                {drawerMembers.length === 0 ? (
                                  <p className="px-4 py-2 text-xs text-[#6B6B76]">
                                    No members on this project's teams
                                  </p>
                                ) : (
                                  <div className="max-h-40 overflow-y-auto">
                                    {drawerMembers.map((member) => (
                                      <button
                                        key={member.user_id}
                                        onClick={() => assignMember(task, member)}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-white/5"
                                      >
                                        <Avatar name={member.username} size="h-6 w-6" />
                                        {member.username}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {task.assignee && (
                                  <>
                                    <div className="my-1 border-t border-[#262830]" />
                                    <button
                                      onClick={() => {
                                        setAssignSubmenuTaskId(null);
                                        unassignMember(task);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                                    >
                                      Unassign
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
