import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import { ChevronRight, MoreVertical, Plus, Search } from "lucide-react";

const formatValue = (value) => (value === undefined || value === null ? "—" : value);

const parseErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join(", ");
  }
  return detail || fallback;
};

function Avatar({ name, size = "h-7 w-7" }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/20 text-xs font-semibold text-[#AFA9EC]`}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

export default function ManagerTeam() {
  const { workspaceName, userId } = useOutletContext();

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

  // ---- UI-only state ----
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const [addMemberPickerOpen, setAddMemberPickerOpen] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState("");

  const toggleTeam = (teamId) => {
    setExpandedTeamId((current) => (current === teamId ? null : teamId));
    setOpenMenuRowId(null);
    setAddMemberPickerOpen(false);
    setAddMemberQuery("");
  };

  // ---- handlers ----

  const handleAddMember = async (team, member) => {
    setAddMemberPickerOpen(false);
    setAddMemberQuery("");
    try {
      await api.post("/team_service/assign_team_member", {
        team_id: team.team_id,
        member_id: member.user_id,
      });
      setTeams((prev) =>
        prev.map((t) =>
          t.team_id === team.team_id
            ? {
                ...t,
                member_count: (t.member_count ?? 0) + 1,
                members: [
                  ...(t.members || []),
                  { user_id: member.user_id, username: member.name, pending_count: 0, in_progress_count: 0 },
                ],
              }
            : t
        )
      );
    } catch (err) {
      showError(err, "Failed to add member.");
    }
  };

  const handleRemoveMember = async (team, memberId) => {
    setOpenMenuRowId(null);
    try {
      await api.post("/team_service/remove_member_from_team", {
        team_id: team.team_id,
        member_id: memberId,
      });
      setTeams((prev) =>
        prev.map((t) =>
          t.team_id === team.team_id
            ? {
                ...t,
                member_count: Math.max((t.member_count ?? 1) - 1, 0),
                members: (t.members || []).filter((m) => m.user_id !== memberId),
              }
            : t
        )
      );
    } catch (err) {
      showError(err, "Failed to remove member.");
    }
  };

  if (sessionExpired) return <SessionExpiredModal />;

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="mt-1 text-[#6B6B76]">
          {workspaceName} | {teams.length} Teams
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {/* Team list */}
      <div className="mt-6 bg-[#101117] border border-[#262830] rounded-2xl p-5">
        <div className="grid grid-cols-[1.8fr_1.4fr_0.8fr_2fr_auto] gap-4 border-b border-[#262830] pb-3 text-sm text-[#6B6B76]">
          <span>Team Name</span>
          <span>Manager</span>
          <span>Members</span>
          <span>Task Summary</span>
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
              const isOwner = team.team_manager_id === userId;
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
                    className="grid w-full grid-cols-[1.8fr_1.4fr_0.8fr_2fr_auto] items-center gap-4 py-3 text-left hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <ChevronRight
                        size={16}
                        className={`shrink-0 text-[#6B6B76] transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                      {team.team_name}
                    </span>

                    <span>
                      {team.team_manager_name ? (
                        <span className="flex items-center gap-2 text-sm">
                          <Avatar name={team.team_manager_name} size="h-6 w-6" />
                          <span className="truncate">{team.team_manager_name}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-[#6B6B76]">Unassigned</span>
                      )}
                    </span>

                    <span className="text-[#6B6B76]">{formatValue(team.member_count)}</span>

                    <span className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300">
                        Pending {formatValue(team.pending_count)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-300">
                        In Progress {formatValue(team.in_progress_count)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-400">
                        Completed {formatValue(team.completed_count)}
                      </span>
                    </span>

                    <span className="pr-2 text-[#6B6B76]">
                      <ChevronRight size={16} />
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mb-4 rounded-xl border border-[#262830] bg-[#0D0E12] p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{team.team_name}</span>

                        {isOwner && (
                          <div className="relative">
                            <button
                              onClick={() => setAddMemberPickerOpen((v) => !v)}
                              className="flex items-center gap-1.5 rounded-full bg-[#7F77DD] px-3 py-1.5 text-sm font-medium hover:bg-[#9189ee]"
                            >
                              <Plus size={14} />
                              Add Member
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
                                            onClick={() => handleAddMember(team, m)}
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
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center gap-3 border-b border-[#262830] px-2 pb-2 text-xs font-medium text-[#6B6B76]">
                          <span className="w-8 shrink-0" />
                          <span className="flex-1">Member</span>
                          <span className="w-28 shrink-0">Pending</span>
                          <span className="w-32 shrink-0">In Progress</span>
                          {isOwner && <span className="w-9 shrink-0 text-right">Actions</span>}
                        </div>

                        <div className="flex flex-col gap-1 pt-1">
                          {members.length === 0 ? (
                            <p className="py-4 text-center text-sm text-[#6B6B76]">
                              No members in this team
                            </p>
                          ) : (
                            members.map((member) => (
                              <div
                                key={member.user_id}
                                className="relative flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                              >
                                <Avatar name={member.username} size="h-8 w-8" />

                                <span className="flex-1 text-sm font-medium">{member.username}</span>

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

                                {isOwner && (
                                  <>
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
                                          <button
                                            onClick={() => handleRemoveMember(team, member.user_id)}
                                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                                          >
                                            Remove from team
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            ))
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
    </div>
  );
}
