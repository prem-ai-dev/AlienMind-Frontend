import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import { Bell, Users, LayoutGrid, Mail, Shield, Activity } from "lucide-react";

const formatValue = (value) => (value === undefined || value === null ? "—" : value);

const parseErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join(", ");
  }
  return detail || fallback;
};

const WORKSPACE_STATS = [
  { key: "totalMembers", label: "Total Members", icon: Users },
  { key: "totalProjects", label: "Total Projects", icon: LayoutGrid },
  { key: "pendingInvites", label: "Pending Invites", icon: Mail },
  { key: "adminSeats", label: "Admin Seats", icon: Shield },
];

const WORK_STATS = [
  { key: "inProgressTasks", label: "In Progress tasks", dot: "bg-yellow-400" },
  { key: "reviewTasks", label: "Review tasks", dot: "bg-yellow-400" },
  { key: "completedTasks", label: "Completed tasks", dot: "bg-green-400" },
  { key: "cancelledTasks", label: "Cancelled tasks", dot: "bg-red-400" },
];

const wsUrl = undefined;

export default function AdminDashboard() {
  const { username } = useOutletContext();

  const [stats, setStats] = useState({});
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
    const loadStats = async () => {
      setLoading(true);
      try {
        const res = await api.get("/dashboard_service/dashboard_stats");
        setStats(res.data || {});
      } catch (err) {
        showError(err, "Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // TODO: backend WebSocket endpoint for live dashboard stats isn't built yet — wsUrl is
  // expected to be set (e.g. `${WS_BASE}/ws/admin/dashboard`) once it exists. Until
  // then this effect is a no-op and the cards keep rendering the fetched data.
  useEffect(() => {
    if (!wsUrl) return;

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);

        // TODO: confirm exact event type/payload names with backend once wired up.
        setStats((prev) => {
          switch (type) {
            case "workspace_overview":
            case "task_stats":
              return { ...prev, ...data };
            case "sprints":
              return { ...prev, activeSprints: data.activeSprints ?? prev.activeSprints };
            case "activity":
              return { ...prev, recentActivity: data.recentActivity ?? prev.recentActivity };
            default:
              return prev;
          }
        });
      } catch {
        // ignore malformed payloads
      }
    };

    return () => socket.close();
  }, []);

  const {
    totalMembers,
    totalProjects,
    pendingInvites,
    adminSeatsUsed,
    adminSeatsMax,
    inProgressTasks,
    reviewTasks,
    completedTasks,
    cancelledTasks,
    activeSprints = [],
    recentActivity = [],
  } = stats;

  const workspaceValues = {
    totalMembers,
    totalProjects,
    pendingInvites,
    adminSeats:
      adminSeatsUsed === undefined || adminSeatsMax === undefined
        ? undefined
        : `${adminSeatsUsed} / ${adminSeatsMax}`,
  };

  const workValues = { inProgressTasks, reviewTasks, completedTasks, cancelledTasks };

  if (sessionExpired) return <SessionExpiredModal />;

  if (loading) {
    return <p className="text-center text-[#6B6B76] py-10">Loading dashboard...</p>;
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-[#6B6B76]">Welcome back!</p>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#262830] text-[#6B6B76] hover:text-[#E8E8EA]">
            <Bell size={18} />
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7F77DD]/20 text-[#7F77DD] font-semibold">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Workspace Overview */}
      <h2 className="mt-8 font-semibold">Workspace Overview</h2>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-5">
        {WORKSPACE_STATS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="bg-[#101117] border border-[#262830] rounded-2xl p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7F77DD]/15">
              <Icon className="text-[#7F77DD]" size={18} />
            </div>

            <div className="mt-4 text-2xl font-bold">{formatValue(workspaceValues[key])}</div>

            <div className="mt-1 text-sm text-[#6B6B76]">{label}</div>
          </div>
        ))}
      </div>

      {/* Work Overview */}
      <h2 className="mt-6 font-semibold">Work Overview</h2>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-5">
        {WORK_STATS.map(({ key, label, dot }) => (
          <div
            key={key}
            className="bg-[#101117] border border-[#262830] rounded-2xl p-5"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />

            <div className="mt-4 text-2xl font-bold">{formatValue(workValues[key])}</div>

            <div className="mt-1 text-sm text-[#6B6B76]">{label}</div>
          </div>
        ))}
      </div>

      {/* Row — Active Sprints / Recent Activity */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#101117] border border-[#262830] rounded-2xl p-6">
          <h2 className="font-semibold">Active Sprints</h2>

          {activeSprints.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
              <LayoutGrid className="text-[#6B6B76]" size={28} />
              <p className="mt-3 text-[#6B6B76]">No active sprints</p>
              <p className="text-sm text-[#6B6B76]">Let's show data</p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-4">
              {activeSprints.map((sprint) => (
                <div key={sprint.sprint_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{sprint.name}</span>
                    <span className="text-[#6B6B76]">
                      {sprint.progress}% · Due{" "}
                      {sprint.due_date
                        ? new Date(sprint.due_date).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>

                  <div className="mt-2 h-2 w-full rounded-full bg-[#262830]">
                    <div
                      className="h-2 rounded-full bg-[#7F77DD]"
                      style={{ width: `${sprint.progress ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#101117] border border-[#262830] rounded-2xl p-6">
          <h2 className="font-semibold">Recent Activity</h2>

          {recentActivity.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
              <Activity className="text-[#6B6B76]" size={28} />
              <p className="mt-3 text-[#6B6B76]">No activity yet</p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-4">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                  <p>
                    <span className="font-semibold">{item.actor}</span> {item.action}{" "}
                    <span className="font-semibold">{item.target}</span>
                  </p>

                  <span className="shrink-0 text-[#6B6B76]">{item.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
