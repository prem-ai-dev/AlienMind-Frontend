import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import {
  Bell,
  Clock,
  ArrowRight,
  Check,
  Shield,
  ChevronRight,
  Plus,
  MoreVertical,
  Search,
  X,
} from "lucide-react";

const formatValue = (value) => (value === undefined || value === null ? "—" : value);

const ROLE_BADGE_STYLES = {
  COMPANY_ADMIN: "bg-[#7F77DD]/20 text-[#AFA9EC]",
  MANAGER: "bg-blue-500/15 text-blue-300",
  MEMBER: "bg-white/5 text-[#6B6B76]",
};

function RoleBadge({ role }) {
  if (!role) return <span className="text-xs text-[#6B6B76]">—</span>;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.MEMBER
      }`}
    >
      {role}
    </span>
  );
}

const PERFORMANCE_STATS = [
  { key: "pending_count", label: "Pending Tasks", unit: "tasks", icon: Clock },
  { key: "in_progress_count", label: "In Progress", unit: "tasks", icon: ArrowRight },
  { key: "completed_count", label: "Completed", unit: "tasks", icon: Check },
  { key: "member_count", label: "Team Size", unit: "members", icon: Shield },
];

const parseErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join(", ");
  }
  return detail || fallback;
};

export default function AdminTeam() {
  const { workspaceName, username } = useOutletContext();

  // ---- data fetched from backend ----
  const [teams, setTeams] = useState([]);
  const [allMembers, setAllMembers] = useState([]);

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

  const fetchTeams = async () => {
    const res = await api.get("/team_service/list_teams_detailed");
    setTeams(res.data || []);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [teamsRes, membersRes] = await Promise.all([
          api.get("/team_service/list_teams_detailed"),
          api.get("/workspace_member_service/memberlist"),
        ]);

        setTeams(teamsRes.data || []);
        setAllMembers(
          (membersRes.data.members || []).map((m) => ({
            user_id: m.user_id,
            name: m.username,
            role: m.role,
          }))
        );
      } catch (err) {
        showError(err, "Failed to load teams.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // ---- UI-only state (unchanged) ----
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const [addMemberPickerOpen, setAddMemberPickerOpen] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [assignManagerPickerOpen, setAssignManagerPickerOpen] = useState(false);

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [managerQuery, setManagerQuery] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const selectedTeam = teams.find((t) => t.team_id === expandedTeamId) || null;

  // TODO: backend WebSocket endpoint for team performance isn't built yet — wsUrl is
  // expected to be supplied (e.g. `${WS_BASE}/ws/admin/teams`) once it exists. Until
  // then this effect is a no-op and the cards keep rendering fetched data.
  const wsUrl = null;

  useEffect(() => {
    if (!wsUrl) return;

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);

        // TODO: confirm exact event type/payload names with backend once wired up.
        if (type === "team_performance") {
          setTeams((prev) =>
            prev.map((t) => (t.team_id === data.team_id ? { ...t, ...data } : t))
          );
        }
      } catch {
        // ignore malformed payloads
      }
    };

    return () => socket.close();
  }, [wsUrl]);

  const toggleTeam = (teamId) => {
    setExpandedTeamId((current) => (current === teamId ? null : teamId));
    setOpenMenuRowId(null);
    setAddMemberPickerOpen(false);
    setAddMemberQuery("");
    setAssignManagerPickerOpen(false);
  };

  const selectedManager = allMembers.find((m) => m.user_id === selectedManagerId) || null;
  const selectedMembers = allMembers.filter((m) => selectedMemberIds.includes(m.user_id));

  const managerOptions = allMembers.filter(
    (m) => m.name?.toLowerCase().includes(managerQuery.toLowerCase())
  );

  const memberOptions = allMembers.filter(
    (m) =>
      !selectedMemberIds.includes(m.user_id) &&
      m.name?.toLowerCase().includes(memberQuery.toLowerCase())
  );

  const managerAssignOptions = allMembers.filter(
    (m) => m.role === "MANAGER" || m.role === "COMPANY_ADMIN"
  );

  const openCreateTeamModal = () => setCreateTeamOpen(true);

  const closeCreateTeamModal = () => {
    setCreateTeamOpen(false);
    setNewTeamName("");
    setManagerQuery("");
    setSelectedManagerId("");
    setMemberQuery("");
    setSelectedMemberIds([]);
  };

  const toggleSelectedMember = (userId) => {
    setSelectedMemberIds((prev) => prev.filter((id) => id !== userId));
  };

  // ---- handlers now call the API directly instead of prop callbacks ----

  const handleCreateTeam = async (data) => {
    try {
      // team_manager_id / member_ids are collected by the form but the backend's
      // create_team endpoint only accepts team_name — assigning a manager or
      // initial members requires separate assign_manager_to_team /
      // assign_team_member calls after creation (not chained here yet).
      await api.post("/team_service/create_team", { team_name: data.name });
      await fetchTeams();
    } catch (err) {
      showError(err, "Failed to create team.");
    }
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    await handleCreateTeam({
      name: newTeamName.trim(),
      team_manager_id: selectedManagerId || null,
      member_ids: selectedMemberIds,
    });

    closeCreateTeamModal();
  };

  const handleAddMember = async (teamId, memberId) => {
    setAddMemberPickerOpen(false);
    setAddMemberQuery("");
    try {
      await api.post("/team_service/assign_team_member", {
        team_id: teamId,
        member_id: memberId,
      });
      await fetchTeams();
    } catch (err) {
      showError(err, "Failed to add member.");
    }
  };

  const handleRemoveMember = async (teamId, memberId) => {
    setOpenMenuRowId(null);
    try {
      await api.post("/team_service/remove_member_from_team", {
        team_id: teamId,
        member_id: memberId,
      });
      await fetchTeams();
    } catch (err) {
      showError(err, "Failed to remove member.");
    }
  };

  const handleAssignManager = async (teamId, managerId) => {
    setAssignManagerPickerOpen(false);
    try {
      // Backend field is `member_id` even for manager assignment (TeamMemberInput schema).
      await api.post("/team_service/assign_manager_to_team", {
        team_id: teamId,
        member_id: managerId,
      });
      await fetchTeams();
    } catch (err) {
      showError(err, "Failed to assign manager.");
    }
  };

  if (sessionExpired) return <SessionExpiredModal />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="mt-1 text-[#6B6B76]">
            {workspaceName} | {teams.length} Teams
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={openCreateTeamModal}
            className="flex items-center gap-2 rounded-full bg-[#7F77DD] px-4 py-2.5 text-sm font-medium hover:bg-[#9189ee]"
          >
            <Plus size={16} />
            Create Team
          </button>

          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#262830] text-[#6B6B76] hover:text-[#E8E8EA]">
            <Bell size={18} />
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7F77DD]/20 text-[#7F77DD] font-semibold">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {/* Team Performance */}
      <h2 className="mt-8 font-semibold">Team Performance</h2>
      <p className="mt-1 text-sm text-[#6B6B76]">
        Showing stats for: {selectedTeam ? selectedTeam.name : "—"}
      </p>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-5">
        {PERFORMANCE_STATS.map(({ key, label, unit, icon: Icon }) => (
          <div key={key} className="bg-[#101117] border border-[#262830] rounded-2xl p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7F77DD]/15">
              <Icon className="text-[#7F77DD]" size={18} />
            </div>

            <div className="mt-4 text-2xl font-bold">{formatValue(selectedTeam?.[key])}</div>

            <div className="mt-1 text-sm text-[#6B6B76]">
              {label}
              <span className="block text-xs">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Team list */}
      <h2 className="mt-6 font-semibold">Team list section</h2>

      <div className="mt-4 bg-[#101117] border border-[#262830] rounded-2xl p-5">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b border-[#262830] pb-3 text-sm text-[#6B6B76]">
          <span>Team Name</span>
          <span>Member Count</span>
          <span className="pr-2">Expand</span>
        </div>

        {loading ? (
          <p className="py-10 text-center text-[#6B6B76]">Loading teams...</p>
        ) : teams.length === 0 ? (
          <p className="py-10 text-center text-[#6B6B76]">No teams found</p>
        ) : (
          <div className="flex flex-col">
            {teams.map((team) => {
              const isExpanded = expandedTeamId === team.team_id;
              const members = team.members || [];
              const teamMemberIds = new Set(members.map((m) => m.user_id));
              const memberAddOptions = allMembers.filter(
                (m) =>
                  !teamMemberIds.has(m.user_id) &&
                  m.name?.toLowerCase().includes(addMemberQuery.toLowerCase())
              );

              return (
                <div key={team.team_id} className="border-b border-[#262830] last:border-0">
                  <button
                    onClick={() => toggleTeam(team.team_id)}
                    className={`grid w-full grid-cols-[1fr_1fr_auto] items-center gap-4 py-3 text-left ${
                      isExpanded ? "text-[#E8E8EA]" : "text-[#E8E8EA] hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <ChevronRight
                        size={16}
                        className={`text-[#6B6B76] transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                      {team.team_name}
                    </span>

                    <span className="text-[#6B6B76]">{formatValue(team.member_count)}</span>

                    <span className="pr-2 text-[#6B6B76]">
                      <ChevronRight size={16} />
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mb-4 rounded-xl border border-[#262830] bg-[#0D0E12] p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{team.name}</span>

                        <div className="flex items-center gap-2">
                          {/* TODO: gate to whoever holds team_manager_id for this team, plus Admin —
                              actual check happens once role info is exposed on the team detail
                              response, following the same role-based pattern as AdminMembers.jsx. */}
                          <div className="relative">
                            <button
                              onClick={() => setAssignManagerPickerOpen((v) => !v)}
                              className="flex items-center gap-1.5 rounded-full border border-[#262830] px-3 py-1.5 text-sm text-[#6B6B76] hover:text-[#E8E8EA]"
                            >
                              <Shield size={14} />
                              Assign manager
                            </button>

                            {assignManagerPickerOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setAssignManagerPickerOpen(false)}
                                />

                                <div className="absolute right-0 top-9 z-20 max-h-48 w-48 overflow-y-auto rounded-xl border border-[#262830] bg-[#101117] py-1 shadow-xl">
                                  {managerAssignOptions.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-[#6B6B76]">
                                      No managers available
                                    </p>
                                  ) : (
                                    managerAssignOptions.map((m) => (
                                      <button
                                        key={m.user_id}
                                        onClick={() => handleAssignManager(team.team_id, m.user_id)}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                                      >
                                        {m.name}
                                      </button>
                                    ))
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => setAddMemberPickerOpen((v) => !v)}
                              className="flex items-center gap-1.5 rounded-full bg-[#7F77DD] px-3 py-1.5 text-sm font-medium hover:bg-[#9189ee]"
                            >
                              <Plus size={14} />
                              Add member
                            </button>

                            {addMemberPickerOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => {
                                    setAddMemberPickerOpen(false);
                                    setAddMemberQuery("");
                                  }}
                                />

                                <div className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-[#262830] bg-[#101117] p-2 shadow-xl">
                                  <div className="relative">
                                    <Search
                                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B76]"
                                      size={14}
                                    />

                                    <input
                                      autoFocus
                                      type="text"
                                      value={addMemberQuery}
                                      onChange={(e) => setAddMemberQuery(e.target.value)}
                                      placeholder="Search member"
                                      className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] py-2 pl-8 pr-3 text-sm outline-none focus:border-[#7F77DD]"
                                    />
                                  </div>

                                  {addMemberQuery && (
                                    <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-[#262830] bg-[#101117] py-1">
                                      {memberAddOptions.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-[#6B6B76]">No matches</p>
                                      ) : (
                                        memberAddOptions.map((m) => (
                                          <button
                                            key={m.user_id}
                                            type="button"
                                            onClick={() => handleAddMember(team.team_id, m.user_id)}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                                          >
                                            {m.name}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center gap-3 border-b border-[#262830] px-2 pb-2 text-xs font-medium text-[#6B6B76]">
                          <span className="w-8 shrink-0" />
                          <span className="flex-1">Member</span>
                          <span className="w-24 shrink-0">Role</span>
                          <span className="w-28 shrink-0">Pending</span>
                          <span className="w-32 shrink-0">In Progress</span>
                          <span className="w-9 shrink-0 text-right">Actions</span>
                        </div>

                        <div className="flex flex-col gap-1 pt-1">
                        {members.length === 0 ? (
                          <p className="py-4 text-center text-sm text-[#6B6B76]">
                            No members in this team
                          </p>
                        ) : (
                          members.map((member) => {
                            const memberRole =
                              member.role ||
                              allMembers.find((m) => m.user_id === member.user_id)?.role;

                            return (
                            <div
                              key={member.user_id}
                              className="relative flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/20 text-sm font-semibold text-[#AFA9EC]">
                                {(member.username || "?").charAt(0).toUpperCase()}
                              </div>

                              <span className="flex-1 text-sm font-medium">{member.username}</span>

                              <span className="w-24 shrink-0">
                                <RoleBadge role={memberRole} />
                              </span>

                              <span className="w-28 shrink-0 inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300">
                                Pending
                                <span className="rounded-full bg-red-500/25 px-1.5">
                                  {formatValue(member.pending_count)}
                                </span>
                              </span>

                              <span className="w-32 shrink-0 inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-300">
                                In Progress
                                <span className="rounded-full bg-yellow-500/25 px-1.5">
                                  {formatValue(member.in_progress_count)}
                                </span>
                              </span>

                              <button
                                onClick={() =>
                                  setOpenMenuRowId(
                                    openMenuRowId === member.user_id ? null : member.user_id
                                  )
                                }
                                className="w-9 shrink-0 rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {openMenuRowId === member.user_id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenMenuRowId(null)}
                                  />

                                  <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-[#262830] bg-[#101117] py-1 text-left shadow-xl">
                                    {/* TODO: gate to whoever holds team_manager_id for this team,
                                        plus Admin — actual check happens once this is wired to the
                                        backend, following the same role-based pattern as
                                        AdminMembers.jsx. */}
                                    <button
                                      onClick={() => handleRemoveMember(team.team_id, member.user_id)}
                                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                                    >
                                      Remove from team
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                            );
                          })
                        )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team modal */}
      {createTeamOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-md bg-[#101117] border border-[#262830] rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Create Team</h2>

            <form onSubmit={handleCreateTeamSubmit}>
              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Team Name</label>

                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Eng. Core"
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Team Manager</label>

                {selectedManager ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#262830] bg-white/5 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/20 text-xs font-semibold text-[#AFA9EC]">
                        {selectedManager.name?.charAt(0).toUpperCase()}
                      </div>
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
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/20 text-xs font-semibold text-[#AFA9EC]">
                                {m.name?.charAt(0).toUpperCase()}
                              </div>
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
                  Initial Members <span className="text-[#6B6B76]">(optional)</span>
                </label>

                {selectedMembers.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {selectedMembers.map((m) => (
                      <span
                        key={m.user_id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs"
                      >
                        {m.name}
                        <button
                          type="button"
                          onClick={() => toggleSelectedMember(m.user_id)}
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
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Search members to add"
                    className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] py-2 pl-8 pr-3 text-sm outline-none focus:border-[#7F77DD]"
                  />

                  {memberQuery && (
                    <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-[#262830] bg-[#101117] py-1 shadow-xl">
                      {memberOptions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-[#6B6B76]">No matches</p>
                      ) : (
                        memberOptions.map((m) => (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => {
                              setSelectedMemberIds((prev) => [...prev, m.user_id]);
                              setMemberQuery("");
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/20 text-xs font-semibold text-[#AFA9EC]">
                              {m.name?.charAt(0).toUpperCase()}
                            </div>
                            {m.name}
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
                  onClick={closeCreateTeamModal}
                  className="rounded-xl border border-[#262830] px-4 py-2 text-sm hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#7F77DD] px-4 py-2 text-sm font-medium hover:bg-[#9189ee]"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
