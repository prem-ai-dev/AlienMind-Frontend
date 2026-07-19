import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import {
  Plus,
  Search,
  ChevronRight,
  MoreVertical,
  X,
  FolderKanban,
  Repeat,
  CheckSquare,
  TrendingUp,
} from "lucide-react";

const formatValue = (value) => (value === undefined || value === null ? "—" : value);
const formatPercent = (value) => (value === undefined || value === null ? "—" : `${value}%`);

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

const STAT_CARDS = [
  { key: "totalProjects", label: "Total Projects", icon: FolderKanban },
  { key: "activeSprints", label: "Active Sprints", icon: Repeat },
  { key: "totalTasks", label: "Total Tasks", icon: CheckSquare },
  { key: "completionPct", label: "Completion %", icon: TrendingUp },
];

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

export default function AdminProject() {
  const { workspaceName } = useOutletContext();

  // ---- data fetched from backend (was AdminProjectPage.jsx) ----
  const [localProjects, setLocalProjects] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [allTasks, setAllTasks] = useState([]);

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
        const [projectsRes, membersRes, teamsRes] = await Promise.all([
          api.get("/project_service/list_projects"),
          api.get("/workspace_member_service/memberlist"),
          api.get("/team_service/list_teams"),
        ]);

        setLocalProjects(projectsRes.data.map(mapProject));
        setAllMembers(
          (membersRes.data.members || []).map((m) => ({ ...m, name: m.username }))
        );
        setAllTeams(teamsRes.data || []);
      } catch (err) {
        showError(err, "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // ---- UI-only state (unchanged) ----
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const [statusPickerRowId, setStatusPickerRowId] = useState(null);
  const [managerPickerRowId, setManagerPickerRowId] = useState(null);
  const [addTeamPickerOpen, setAddTeamPickerOpen] = useState(false);

  const [sprintMenuRowId, setSprintMenuRowId] = useState(null);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");

  const [taskDrawerSprint, setTaskDrawerSprint] = useState(null);

  const [editSprintTarget, setEditSprintTarget] = useState(null);
  const [editSprintStatus, setEditSprintStatus] = useState("PLANNED");

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [managerQuery, setManagerQuery] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [teamQuery, setTeamQuery] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);

  const closeRowMenus = () => {
    setOpenMenuRowId(null);
    setStatusPickerRowId(null);
    setManagerPickerRowId(null);
  };

  const openTaskDrawer = async (sprint) => {
    setTaskDrawerSprint(sprint);
    setSprintMenuRowId(null);
    try {
      const res = await api.get("/task_service/list_by_sprint", {
        params: { sprint_id: sprint.sprint_id },
      });
      setAllTasks(res.data || []);
    } catch (err) {
      showError(err, "Failed to load sprint tasks.");
    }
  };

  const toggleProject = (projectId) => {
    setExpandedProjectId((current) => (current === projectId ? null : projectId));
    closeRowMenus();
    setAddTeamPickerOpen(false);
    setSprintMenuRowId(null);
    setCreateSprintOpen(false);
  };

  // ---- handlers now call the API directly instead of prop callbacks ----

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

  const assignManager = async (projectId, member) => {
    closeRowMenus();
    try {
      const res = await api.post("/project_service/assign_manager", {
        project_id: projectId,
        manager_id: member.user_id,
      });
      const manager = allMembers.find((m) => m.user_id === res.data.manager_id);
      setLocalProjects((prev) =>
        prev.map((p) =>
          p.project_id === projectId
            ? { ...p, project_manager_id: res.data.manager_id, project_manager_name: manager?.name }
            : p
        )
      );
    } catch (err) {
      showError(err, "Failed to assign manager.");
    }
  };

  const removeTeamFromProject = async (projectId, teamId) => {
    try {
      await api.post("/project_service/remove_team", { project_id: projectId, team_id: teamId });
      setLocalProjects((prev) =>
        prev.map((p) =>
          p.project_id === projectId
            ? { ...p, teams: (p.teams || []).filter((t) => t.team_id !== teamId) }
            : p
        )
      );
    } catch (err) {
      showError(err, "Failed to remove team.");
    }
  };

  const addTeamToProject = async (projectId, team) => {
    setAddTeamPickerOpen(false);
    try {
      await api.post("/project_service/add_team", { project_id: projectId, team_id: team.team_id });
      setLocalProjects((prev) =>
        prev.map((p) =>
          p.project_id === projectId
            ? { ...p, teams: [...(p.teams || []), { team_id: team.team_id, name: team.name }] }
            : p
        )
      );
    } catch (err) {
      showError(err, "Failed to add team.");
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

  const managerOptions = allMembers.filter((m) =>
    m.name?.toLowerCase().includes(managerQuery.toLowerCase())
  );

  const selectedManager = allMembers.find((m) => m.user_id === selectedManagerId) || null;
  const selectedTeams = allTeams.filter((t) => selectedTeamIds.includes(t.team_id));
  const teamOptions = allTeams.filter(
    (t) =>
      !selectedTeamIds.includes(t.team_id) && t.name?.toLowerCase().includes(teamQuery.toLowerCase())
  );

  const closeCreateProjectModal = () => {
    setCreateProjectOpen(false);
    setNewProjectName("");
    setManagerQuery("");
    setSelectedManagerId("");
    setTeamQuery("");
    setSelectedTeamIds([]);
  };

  const handleCreateProjectSubmit = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await api.post("/project_service/create_project", { project_title: newProjectName.trim() });
      await fetchProjects();
      closeCreateProjectModal();
    } catch (err) {
      showError(err, "Failed to create project.");
    }
  };

  const totalProjects = localProjects.length;
  const activeSprints = localProjects.reduce(
    (sum, p) => sum + (p.sprints || []).filter((s) => s.status === "ACTIVE").length,
    0
  );
  const totalTasks = localProjects.reduce((sum, p) => sum + (p.task_count ?? 0), 0);
  const completionTotals = localProjects.reduce(
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

  const statValues = { totalProjects, activeSprints, totalTasks, completionPct };

  const drawerTasks = allTasks;

  if (sessionExpired) return <SessionExpiredModal />;

  if (loading) {
    return <p className="text-center text-[#6B6B76] py-10">Loading projects...</p>;
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-[#6B6B76]">
            {workspaceName} | {localProjects.length} Projects
          </p>
        </div>

        <button
          onClick={() => setCreateProjectOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[#7F77DD] px-4 py-2.5 text-sm font-medium hover:bg-[#9189ee]"
        >
          <Plus size={16} />
          Create Project
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-5">
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

      {/* Project List */}
      <h2 className="mt-6 font-semibold">Project List</h2>

      <div className="mt-4 bg-[#101117] border border-[#262830] rounded-2xl p-5">
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

                      {statusPickerRowId === project.project_id ? (
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
                      {managerPickerRowId === project.project_id ? (
                        <select
                          autoFocus
                          value={project.project_manager_id || ""}
                          onChange={(e) => {
                            const member = allMembers.find((m) => m.user_id === e.target.value);
                            if (member) assignManager(project.project_id, member);
                          }}
                          onBlur={() => setManagerPickerRowId(null)}
                          className="w-full rounded-lg border border-[#262830] bg-[#0D0E12] px-2 py-1.5 text-xs outline-none focus:border-[#7F77DD]"
                        >
                          <option value="">Select manager</option>
                          {allMembers.filter((m) => m.role === "MANAGER" || m.role === "COMPANY_ADMIN").map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      ) : project.project_manager_name ? (
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

                      {openMenuRowId === project.project_id && (
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
                              Update status
                            </button>

                            <button
                              onClick={() => {
                                setManagerPickerRowId(project.project_id);
                                setOpenMenuRowId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                            >
                              Assign manager
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
                          {projectTeams.map((team) => (
                            <span
                              key={team.team_id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs"
                            >
                              {team.name}
                              <button
                                onClick={() => removeTeamFromProject(project.project_id, team.team_id)}
                                className="text-[#6B6B76] hover:text-[#E8E8EA]"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}

                          <div className="relative">
                            <button
                              onClick={() => setAddTeamPickerOpen((v) => !v)}
                              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#262830] px-2.5 py-1 text-xs text-[#6B6B76] hover:text-[#E8E8EA]"
                            >
                              <Plus size={12} />
                              Add team
                            </button>

                            {addTeamPickerOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setAddTeamPickerOpen(false)}
                                />

                                <div className="absolute left-0 top-9 z-20 max-h-48 w-48 overflow-y-auto rounded-xl border border-[#262830] bg-[#101117] py-1 shadow-xl">
                                  {teamOptions.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-[#6B6B76]">
                                      No teams available
                                    </p>
                                  ) : (
                                    teamOptions.map((team) => (
                                      <button
                                        key={team.team_id}
                                        onClick={() => addTeamToProject(project.project_id, team)}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                                      >
                                        {team.name}
                                      </button>
                                    ))
                                  )}
                                </div>
                              </>
                            )}
                          </div>
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

                        <button
                          onClick={openCreateSprint}
                          className="flex items-center gap-1.5 rounded-full bg-[#7F77DD] px-3 py-1.5 text-sm font-medium hover:bg-[#9189ee]"
                        >
                          <Plus size={14} />
                          Create Sprint
                        </button>
                      </div>

                      {createSprintOpen && (
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
                                      onClick={() => openTaskDrawer(sprint)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                                    >
                                      View tasks
                                    </button>

                                    <button
                                      onClick={() => openEditSprint(project, sprint)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                                    >
                                      Edit sprint
                                    </button>
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

      {/* Create Project modal */}
      {createProjectOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-md bg-[#101117] border border-[#262830] rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Create Project</h2>

            <form onSubmit={handleCreateProjectSubmit}>
              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Mobile App Redesign"
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Project Manager</label>

                {selectedManager ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#262830] bg-white/5 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm">
                      <Avatar name={selectedManager.name} size="h-6 w-6" />
                      {selectedManager.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedManagerId("")}
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
                      value={managerQuery}
                      onChange={(e) => setManagerQuery(e.target.value)}
                      placeholder="Search member"
                      className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] py-2 pl-8 pr-3 text-sm outline-none focus:border-[#7F77DD]"
                    />

                    {managerQuery && (
                      <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-[#262830] bg-[#101117] py-1 shadow-xl">
                        {managerOptions.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-[#6B6B76]">No matches</p>
                        ) : (
                          managerOptions.map((m) => (
                            <button
                              key={m.user_id}
                              type="button"
                              onClick={() => {
                                setSelectedManagerId(m.user_id);
                                setManagerQuery("");
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                            >
                              <Avatar name={m.name} size="h-6 w-6" />
                              {m.name}
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
                  Initial Teams <span className="text-[#6B6B76]">(optional)</span>
                </label>

                {selectedTeams.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {selectedTeams.map((t) => (
                      <span
                        key={t.team_id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs"
                      >
                        {t.name}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTeamIds((prev) => prev.filter((id) => id !== t.team_id))
                          }
                          className="text-[#6B6B76] hover:text-[#E8E8EA]"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B76]"
                    size={14}
                  />

                  <input
                    type="text"
                    value={teamQuery}
                    onChange={(e) => setTeamQuery(e.target.value)}
                    placeholder="Search teams to add"
                    className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] py-2 pl-8 pr-3 text-sm outline-none focus:border-[#7F77DD]"
                  />

                  {teamQuery && (
                    <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-[#262830] bg-[#101117] py-1 shadow-xl">
                      {teamOptions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-[#6B6B76]">No matches</p>
                      ) : (
                        teamOptions.map((t) => (
                          <button
                            key={t.team_id}
                            type="button"
                            onClick={() => {
                              setSelectedTeamIds((prev) => [...prev, t.team_id]);
                              setTeamQuery("");
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                          >
                            {t.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateProjectModal}
                  className="rounded-xl border border-[#262830] px-4 py-2 text-sm hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#7F77DD] px-4 py-2 text-sm font-medium hover:bg-[#9189ee]"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sprint modal */}
      {editSprintTarget && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
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
      {taskDrawerSprint && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setTaskDrawerSprint(null)}
          />

          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[#262830] bg-[#101117] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{taskDrawerSprint.name}</h2>
                <p className="mt-1 text-sm text-[#6B6B76]">Sprint tasks</p>
              </div>

              <button
                onClick={() => setTaskDrawerSprint(null)}
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
                  <th className="pb-3 font-medium">Assigned To</th>
                  <th className="pb-3 font-medium">Priority</th>
                </tr>
              </thead>

              <tbody>
                {drawerTasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-[#6B6B76]">
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
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={task.assignee.name} size="h-6 w-6" />
                            <span>{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-[#6B6B76]">Unassigned</span>
                        )}
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
