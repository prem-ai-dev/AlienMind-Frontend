import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import {
  Bell,
  CheckCircle2,
  Clock,
  UsersRound,
  FolderKanban,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const formatValue = (value) => (value === undefined || value === null ? "—" : value);
const formatPercent = (value) => (value === undefined || value === null ? "—" : `${value}%`);

const parseErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join(", ");
  }
  return detail || fallback;
};

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

const TASK_STAT_CARDS = [
  { key: "todo", label: "Todo", dot: "bg-white/40" },
  { key: "inProgress", label: "In Progress", dot: "bg-[#7F77DD]" },
  { key: "inReview", label: "In Review", dot: "bg-yellow-400" },
  { key: "completed", label: "Completed", dot: "bg-green-400" },
  { key: "cancelled", label: "Cancelled", dot: "bg-red-400" },
];

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

function Avatar({ name, size = "h-8 w-8" }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/20 text-xs font-semibold text-[#AFA9EC]`}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function TaskListItem({ task, overdue }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        overdue ? "border-red-500/30 bg-red-500/5" : "border-[#262830] bg-[#0D0E12]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-medium">{task.task_name}</span>
        <Badge label={task.status} styles={STATUS_BADGE_STYLES} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <Badge label={task.priority} styles={PRIORITY_BADGE_STYLES} />
        <span className={overdue ? "text-red-400" : "text-[#6B6B76]"}>
          Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
        </span>
      </div>
    </div>
  );
}

export default function MemberDashboard() {
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
        const res = await api.get("/dashboard_service/member_dashboard_stats");
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
    taskStats = {},
    overdueTasks = [],
    upcomingTasks = [],
    myTeam = null,
    totalProjects,
  } = data;

  const { todo, inProgress, inReview, completed, cancelled } = taskStats;
  const taskValues = { todo, inProgress, inReview, completed, cancelled };

  const completionDenominator = (todo ?? 0) + (inProgress ?? 0) + (inReview ?? 0) + (completed ?? 0);
  const completionPct =
    completionDenominator > 0 ? Math.round(((completed ?? 0) / completionDenominator) * 100) : undefined;

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
          <h1 className="text-2xl font-bold">My Dashboard</h1>
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

      {/* Task stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-5">
        {TASK_STAT_CARDS.map(({ key, label, dot }) => (
          <div key={key} className="bg-[#101117] border border-[#262830] rounded-2xl p-5">
            <span className={`h-2.5 w-2.5 rounded-full ${dot} inline-block`} />

            <div className="mt-4 text-2xl font-bold">{formatValue(taskValues[key])}</div>

            <div className="mt-1 text-sm text-[#6B6B76]">{label}</div>
          </div>
        ))}
      </div>

      {/* Completion rate / Total projects */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#101117] border border-[#262830] rounded-2xl p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7F77DD]/15">
            <TrendingUp className="text-[#7F77DD]" size={18} />
          </div>

          <div className="mt-4 text-2xl font-bold">{formatPercent(completionPct)}</div>
          <div className="mt-1 text-sm text-[#6B6B76]">Completion Rate</div>

          <div className="mt-3 h-2 w-full rounded-full bg-[#262830]">
            <div
              className="h-2 rounded-full bg-[#7F77DD]"
              style={{ width: `${completionPct ?? 0}%` }}
            />
          </div>
        </div>

        <div className="bg-[#101117] border border-[#262830] rounded-2xl p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7F77DD]/15">
            <FolderKanban className="text-[#7F77DD]" size={18} />
          </div>

          <div className="mt-4 text-2xl font-bold">{formatValue(totalProjects)}</div>
          <div className="mt-1 text-sm text-[#6B6B76]">Total Projects</div>

          <button
            onClick={() => navigate("/member/projects")}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#7F77DD] hover:text-[#9189ee]"
          >
            View Projects
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Overdue / Upcoming tasks */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#101117] border border-[#262830] rounded-2xl p-6">
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
            <div className="mt-5 flex flex-col gap-3">
              {overdueTasks.map((task) => (
                <TaskListItem key={task.task_id} task={task} overdue />
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#101117] border border-[#262830] rounded-2xl p-6">
          <h2 className="font-semibold">Upcoming Tasks</h2>

          {upcomingTasks.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
              <Clock className="text-[#6B6B76]" size={28} />
              <p className="mt-3 text-[#6B6B76]">Nothing due soon</p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              {upcomingTasks.map((task) => (
                <TaskListItem key={task.task_id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Team */}
      <div className="mt-6 bg-[#101117] border border-[#262830] rounded-2xl p-6">
        <h2 className="font-semibold">My Team</h2>

        {myTeam ? (
          <div className="mt-5">
            <p className="text-sm text-[#6B6B76]">{myTeam.team_name}</p>

            <div className="mt-4 flex flex-col gap-3">
              {(myTeam.members || []).map((member) => (
                <div key={member.user_id} className="flex items-center gap-3">
                  <Avatar name={member.username} size="h-8 w-8" />
                  <span className="text-sm">{member.username}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
            <UsersRound className="text-[#6B6B76]" size={28} />
            <p className="mt-3 text-[#6B6B76]">You're not part of a team yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
