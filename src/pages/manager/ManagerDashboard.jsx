import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import {
  Bell,
  FolderKanban,
  UsersRound,
  ArrowRight,
  Repeat,
  CheckCircle2,
} from "lucide-react";

const formatValue = (value) => (value === undefined || value === null ? "—" : value);

const parseErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join(", ");
  }
  return detail || fallback;
};

const OVERVIEW_STATS = [
  { key: "totalProjectsManaged", label: "Total Projects Managed", icon: FolderKanban },
  { key: "totalTeamsManaged", label: "Total Teams Managed", icon: UsersRound },
];

const TASK_STAT_CARDS = [
  { key: "todo", label: "Todo", dot: "bg-white/40" },
  { key: "inProgress", label: "In Progress", dot: "bg-[#7F77DD]" },
  { key: "inReview", label: "In Review", dot: "bg-yellow-400" },
  { key: "completed", label: "Completed", dot: "bg-green-400" },
  { key: "cancelled", label: "Cancelled", dot: "bg-red-400" },
];

const PRIORITY_BADGE_STYLES = {
  High: "bg-red-500/15 text-red-400",
  Medium: "bg-yellow-500/15 text-yellow-400",
};

function Badge({ label, styles }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[label] || "bg-white/10 text-[#B8B8C0]"
      }`}
    >
      {label || "—"}
    </span>
  );
}

export default function ManagerDashboard() {
  const { username } = useOutletContext();
  const navigate = useNavigate();

  const [data, setData] = useState({});
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
        const res = await api.get("/dashboard_service/manager_dashboard_stats");
        setData(res.data || {});
      } catch (err) {
        showError(err, "Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const {
    totalProjectsManaged,
    totalTeamsManaged,
    taskStats = {},
    activeSprints = [],
    myTeams = [],
    overdueTasks = [],
  } = data;

  const overviewValues = { totalProjectsManaged, totalTeamsManaged };
  const { todo, inProgress, inReview, completed, cancelled } = taskStats;
  const taskValues = { todo, inProgress, inReview, completed, cancelled };

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
          <h1 className="text-2xl font-bold">Manager Dashboard</h1>
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

      {/* Overview */}
      <div className="mt-8 grid grid-cols-2 gap-5">
        {OVERVIEW_STATS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="bg-[#101117] border border-[#262830] rounded-2xl p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7F77DD]/15">
              <Icon className="text-[#7F77DD]" size={18} />
            </div>

            <div className="mt-4 text-2xl font-bold">{formatValue(overviewValues[key])}</div>

            <div className="mt-1 text-sm text-[#6B6B76]">{label}</div>
          </div>
        ))}
      </div>

      {/* Task stats */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-5">
        {TASK_STAT_CARDS.map(({ key, label, dot }) => (
          <div key={key} className="bg-[#101117] border border-[#262830] rounded-2xl p-5">
            <span className={`h-2.5 w-2.5 rounded-full ${dot} inline-block`} />

            <div className="mt-4 text-2xl font-bold">{formatValue(taskValues[key])}</div>

            <div className="mt-1 text-sm text-[#6B6B76]">{label}</div>
          </div>
        ))}
      </div>

      {/* Active Sprints / My Teams */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#101117] border border-[#262830] rounded-2xl p-6">
          <h2 className="font-semibold">Active Sprints</h2>

          {activeSprints.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
              <Repeat className="text-[#6B6B76]" size={28} />
              <p className="mt-3 text-[#6B6B76]">No active sprints</p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-4">
              {activeSprints.map((sprint) => (
                <div key={sprint.sprint_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{sprint.name}</span>
                    <span className="text-[#6B6B76]">
                      {sprint.progress}% · Due{" "}
                      {sprint.due_date ? new Date(sprint.due_date).toLocaleDateString() : "—"}
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
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">My Teams</h2>

            {myTeams.length > 0 && (
              <button
                onClick={() => navigate("/manager/teams")}
                className="flex items-center gap-1.5 text-sm font-medium text-[#7F77DD] hover:text-[#9189ee]"
              >
                View Teams
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {myTeams.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
              <UsersRound className="text-[#6B6B76]" size={28} />
              <p className="mt-3 text-[#6B6B76]">You're not managing any teams</p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              {myTeams.map((team) => (
                <button
                  key={team.team_id}
                  onClick={() => navigate("/manager/teams")}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#262830] bg-[#0D0E12] p-3 text-left hover:border-[#7F77DD]/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{team.team_name}</p>
                    <p className="mt-1 text-xs text-[#6B6B76]">
                      {formatValue(team.member_count)} members
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300">
                      Pending {formatValue(team.pending_count)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-300">
                      In Progress {formatValue(team.in_progress_count)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Tasks */}
      <div
        className={`mt-6 rounded-2xl border p-6 ${
          overdueTasks.length > 0
            ? "border-red-500/30 bg-red-500/5"
            : "border-[#262830] bg-[#101117]"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Overdue Tasks</h2>
          {overdueTasks.length > 0 && (
            <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-400">
              {overdueTasks.length} overdue
            </span>
          )}
        </div>

        {overdueTasks.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="text-[#6B6B76]" size={28} />
            <p className="mt-3 text-[#6B6B76]">No overdue tasks</p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {overdueTasks.map((task) => (
              <div
                key={task.task_id}
                className="rounded-xl border border-red-500/30 bg-[#0D0E12] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{task.task_name}</span>
                  <Badge label={task.priority} styles={PRIORITY_BADGE_STYLES} />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="inline-flex rounded-full bg-white/5 px-2.5 py-1 text-[#B8B8C0]">
                    Project #{task.project_id}
                  </span>
                  <span className="text-red-400">
                    Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
