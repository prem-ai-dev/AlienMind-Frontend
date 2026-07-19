import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Bell, Search, MoreVertical, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";

const ROLE_BADGE_STYLES = {
  ADMIN: "bg-[#7F77DD]/20 text-[#AFA9EC]",
  MANAGER: "bg-blue-500/15 text-blue-300",
  MEMBER: "bg-white/5 text-[#6B6B76]",
};

const MODAL_TITLES = {
  updateRole: "Update role",
  transferAdmin: "Transfer admin",
  removeMember: "Remove member",
};

function RoleBadge({ role }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.MEMBER
      }`}
    >
      {role}
    </span>
  );
}

function getPageNumbers(page, totalPages) {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 2, 5));
  const pages = [];
  for (let n = Math.max(1, start); n <= end; n++) pages.push(n);
  return pages;
}

export default function AdminMembers() {
  const navigate = useNavigate();
  const { workspaceName, username } = useOutletContext();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [memberCount, setMemberCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);

  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const [activeModal, setActiveModal] = useState({ type: null, target: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [createAdminMode, setCreateAdminMode] = useState("promote");
  const [promoteTargetId, setPromoteTargetId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [createAdminError, setCreateAdminError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, page]);

  const fetchMembers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/workspace_member_service/memberlist", {
        params: { page, username: search || undefined, role: roleFilter || undefined },
      });

      const data = response.data;
      setMembers(data.members || []);
      setTotalPages(data.total_pages || 1);
      setMemberCount(data.total ?? (data.members || []).length);
      setAdminCount(
        data.admin_count ?? (data.members || []).filter((m) => m.role === "ADMIN").length
      );
    } catch (err) {
      if (err.response?.status === 401) {
        setSessionExpired(true);
      } else {
        setError(err.response?.data?.detail || "Failed to load members.");
        setTimeout(() => setError(""), 4000);
      }
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, target) => {
    setActiveModal({ type, target });
    setOpenMenuRowId(null);
  };

  const closeModal = () => {
    setActiveModal({ type: null, target: null });
    setTransferSuccess(false);
  };

  const getModalDescription = () => {
    if (!activeModal.target) return "";

    switch (activeModal.type) {
      case "updateRole": {
        const newRole = activeModal.target.role === "MEMBER" ? "MANAGER" : "MEMBER";
        return `${activeModal.target.username} will be changed from ${activeModal.target.role} to ${newRole}.`;
      }
      case "removeMember":
        return `${activeModal.target.username} will be removed from this workspace and lose access immediately.`;
      case "transferAdmin":
        return `You will lose admin access and become a Member. ${activeModal.target.username} will become the new admin. This cannot be undone.`;
      default:
        return "";
    }
  };

  const handleConfirm = async () => {
    if (!activeModal.target) return;

    setActionLoading(true);
    setError("");

    try {
      if (activeModal.type === "updateRole") {
        const newRole = activeModal.target.role === "MEMBER" ? "MANAGER" : "MEMBER";
        await api.post(
          "/workspace_member_service/update_member_role",
          { member_id: activeModal.target.user_id, role: newRole }
        );
        closeModal();
        fetchMembers();
      } else if (activeModal.type === "removeMember") {
        await api.delete(
          "/workspace_member_service/remove_member_from_workspace",
          { data:{user_id: activeModal.target.user_id} }
        );
        closeModal();
        fetchMembers();
      } else if (activeModal.type === "transferAdmin") {
        await api.post(
          "/workspace_member_service/transfer_admin",
          { user_id: activeModal.target.user_id }
        );

        setTransferSuccess(true);
        localStorage.removeItem("temp_token");
        localStorage.removeItem("long_token");
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setSessionExpired(true);
      } else {
        setError(err.response?.data?.detail || "Action failed. Please try again.");
        setTimeout(() => setError(""), 4000);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateAdminModal = () => {
    setOpenMenuRowId(null);
    setCreateAdminMode("promote");
    setPromoteTargetId("");
    setInviteEmail("");
    setInviteUsername("");
    setInvitePassword("");
    setCreateAdminError("");
    setCreateAdminOpen(true);
  };

  const closeCreateAdminModal = () => {
    setCreateAdminOpen(false);
    setCreateAdminMode("promote");
    setPromoteTargetId("");
    setInviteEmail("");
    setInviteUsername("");
    setInvitePassword("");
    setCreateAdminError("");
  };

  const handleCreateAdminConfirm = async () => {
    setCreateAdminError("");

    if (createAdminMode === "promote" && !promoteTargetId) {
      setCreateAdminError("Please select a member to promote.");
      return;
    }

    if (createAdminMode === "invite") {
      if (!inviteEmail.trim() || !inviteUsername.trim() || !invitePassword.trim()) {
        setCreateAdminError("Please enter email, username, and password.");
        return;
      }
      if (invitePassword.length < 6) {
        setCreateAdminError("Password must be at least 6 characters.");
        return;
      }
    }

    setCreateAdminLoading(true);

    try {
      if (createAdminMode === "promote") {
        const member = nonAdminMembers.find((m) => m.user_id === promoteTargetId);
        if (!member) {
          setCreateAdminError("Member not found.");
          setCreateAdminLoading(false);
          return;
        }

        await api.post("/workspace_member_service/create_new_admin", {
          email: member.email,
          username: member.username,
        });
      } else {
        await api.post("/workspace_member_service/create_new_admin", {
          email: inviteEmail.trim(),
          username: inviteUsername.trim(),
          password: invitePassword.trim(),
        });
      }

      closeCreateAdminModal();
      setSuccessMessage(
        createAdminMode === "promote" ? "Member promoted to admin." : "Admin invitation sent."
      );
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchMembers();
    } catch (err) {
      if (err.response?.status === 401) {
        setSessionExpired(true);
      } else {
        setCreateAdminError(
          err.response?.data?.detail || "Failed to create admin. Please try again."
        );
      }
    } finally {
      setCreateAdminLoading(false);
    }
  };

  if (sessionExpired) return <SessionExpiredModal />;

  const pageNumbers = getPageNumbers(page, totalPages);
  const nonAdminMembers = members.filter(
    (m) => m.role !== "ADMIN" && m.role !== "COMPANY_ADMIN"
  );

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspace admin</h1>
          <p className="mt-1 text-[#6B6B76]">
            {workspaceName} · {memberCount} member{memberCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {adminCount < 3 && (
            <button
              onClick={openCreateAdminModal}
              className="flex items-center gap-2 rounded-xl bg-[#7F77DD] px-4 py-2.5 text-sm font-medium hover:bg-[#9189ee]"
            >
              <UserPlus size={16} />
              Create new admin
            </button>
          )}

          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#262830] text-[#6B6B76] hover:text-[#E8E8EA]">
            <Bell size={18} />
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7F77DD]/20 text-[#7F77DD] font-semibold">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {successMessage && <p className="mt-4 text-sm text-green-400">{successMessage}</p>}

      {/* Search + filter */}
      <div className="mt-8 bg-[#101117] border border-[#262830] rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B76]"
              size={16}
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#7F77DD]"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-[#262830] bg-[#0D0E12] px-4 py-2.5 text-sm outline-none focus:border-[#7F77DD]"
          >
            <option value="">All roles</option>
            <option value="COMPANY_ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="MEMBER">Member</option>
          </select>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {/* Member table */}
      <div className="mt-6 bg-[#101117] border border-[#262830] rounded-2xl p-5">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#262830] text-[#6B6B76]">
              <th className="pb-3 font-medium">Member</th>
              <th className="pb-3 font-medium">Role</th>
              <th className="pb-3 font-medium">Joined</th>
              <th className="pb-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-[#6B6B76]">
                  Loading members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-[#6B6B76]">
                  No members found
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.user_id} className="border-b border-[#262830] last:border-0">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/20 font-semibold text-[#AFA9EC]">
                        {(member.username || member.email || "?").charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="font-medium">{member.username}</div>
                        <div className="text-xs text-[#6B6B76]">{member.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4">
                    <RoleBadge role={member.role} />
                  </td>

                  <td className="py-4 text-[#6B6B76]">
                    {member.joined_at
                      ? new Date(member.joined_at).toLocaleDateString()
                      : "—"}
                  </td>

                  <td className="relative py-4 text-right">
                    {member.role === "COMPANY_ADMIN" ? (
                      <span className="text-[#6B6B76]">—</span>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            setOpenMenuRowId(openMenuRowId === member.user_id ? null : member.user_id)
                          }
                          className="rounded-lg p-2 text-[#6B6B76] hover:bg-white/5 hover:text-[#E8E8EA]"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuRowId === member.user_id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuRowId(null)}
                            />

                            <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-[#262830] bg-[#101117] py-1 text-left shadow-xl">
                              <button
                                onClick={() => openModal("updateRole", member)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                              >
                                Update role
                              </button>

                              <button
                                onClick={() => openModal("transferAdmin", member)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                              >
                                Transfer admin
                              </button>

                              <button
                                onClick={() => openModal("removeMember", member)}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                              >
                                Remove member
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-[#6B6B76]">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-[#262830] p-2 text-[#6B6B76] hover:text-[#E8E8EA] disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-lg text-sm ${
                  n === page
                    ? "bg-[#7F77DD] text-white"
                    : "text-[#6B6B76] hover:bg-white/5"
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
          </div>
        </div>
      </div>

      {/* Confirmation modal — absolute (not fixed) so it sits in normal flow over this page */}
      {activeModal.type && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-md bg-[#101117] border border-[#262830] rounded-2xl p-6">
            {transferSuccess ? (
              <p className="text-center text-[#E8E8EA]">
                Admin access transferred. Please log in again.
              </p>
            ) : (
              <>
                <h2 className="text-lg font-semibold">{MODAL_TITLES[activeModal.type]}</h2>

                <p className="mt-3 text-sm text-[#6B6B76]">{getModalDescription()}</p>

                <div className="mt-4 rounded-xl border border-[#262830] bg-white/5 px-4 py-3">
                  <div className="font-medium">{activeModal.target?.username}</div>
                  <div className="text-xs text-[#6B6B76]">{activeModal.target?.email}</div>
                </div>

                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    disabled={actionLoading}
                    className="rounded-xl border border-[#262830] px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    className="rounded-xl bg-[#7F77DD] px-4 py-2 text-sm font-medium hover:bg-[#9189ee] disabled:opacity-50"
                  >
                    {actionLoading ? "Please wait..." : "Confirm"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create new admin modal */}
      {createAdminOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-md bg-[#101117] border border-[#262830] rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Create new admin</h2>

            <div className="mt-4 flex rounded-xl border border-[#262830] p-1">
              <button
                onClick={() => setCreateAdminMode("promote")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                  createAdminMode === "promote"
                    ? "bg-[#7F77DD] text-white"
                    : "text-[#6B6B76] hover:text-[#E8E8EA]"
                }`}
              >
                Promote existing member
              </button>

              <button
                onClick={() => setCreateAdminMode("invite")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                  createAdminMode === "invite"
                    ? "bg-[#7F77DD] text-white"
                    : "text-[#6B6B76] hover:text-[#E8E8EA]"
                }`}
              >
                Invite new admin
              </button>
            </div>

            {createAdminMode === "promote" ? (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-[#6B6B76]">Select member</label>

                <select
                  value={promoteTargetId}
                  onChange={(e) => setPromoteTargetId(e.target.value)}
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                >
                  <option value="">Select a member</option>
                  {nonAdminMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.username} ({m.email})
                    </option>
                  ))}
                </select>

                {nonAdminMembers.length === 0 && (
                  <p className="mt-2 text-xs text-[#6B6B76]">
                    No eligible members found. Try adjusting the search or role filter.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-[#6B6B76]">Email address</label>

                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-[#6B6B76]">Username</label>

                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="john.doe"
                    className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-[#6B6B76]">Password</label>

                  <input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] px-3 py-2 text-sm outline-none focus:border-[#7F77DD]"
                  />
                </div>
              </div>
            )}

            {createAdminError && (
              <p className="mt-4 text-sm text-red-400">{createAdminError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeCreateAdminModal}
                disabled={createAdminLoading}
                className="rounded-xl border border-[#262830] px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateAdminConfirm}
                disabled={createAdminLoading}
                className="rounded-xl bg-[#7F77DD] px-4 py-2 text-sm font-medium hover:bg-[#9189ee] disabled:opacity-50"
              >
                {createAdminLoading ? "Please wait..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
