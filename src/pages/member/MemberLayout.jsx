import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FolderKanban, CheckSquare, LogOut } from "lucide-react";

function decodeToken(token) {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/member/dashboard" },
  { label: "Project", icon: FolderKanban, to: "/member/projects" },
  { label: "Task", icon: CheckSquare, to: "/member/tasks" },
];

export default function MemberLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const longToken = localStorage.getItem("long_token");
  const decoded = decodeToken(longToken);

  const workspaceName = decoded?.company_name || "Workspace";
  const username = decoded?.username || decoded?.sub || "Member";
  const userId = decoded?.user_id || decoded?.sub;

  const handleLogout = () => {
    localStorage.removeItem("long_token");
    localStorage.removeItem("temp_token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#0D0E12] text-[#E8E8EA] flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-50 flex flex-col border-r border-[#262830] bg-[#0D0E12]">
        <div className="flex items-center gap-3 px-6 py-7">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7F77DD] font-bold text-sm">
            A
          </div>

          <span className="font-bold tracking-wide">ALIEN MIND</span>
        </div>

        <div className="px-4 pb-4 text-sm text-[#6B6B76]">{workspaceName}</div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  isActive
                    ? "bg-[#7F77DD]/15 text-[#7F77DD] font-medium"
                    : "text-[#6B6B76] hover:text-[#E8E8EA] hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#262830] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7F77DD]/20 text-[#7F77DD] font-semibold">
              {username.charAt(0).toUpperCase()}
            </div>

            <span className="flex-1 truncate text-sm">{username}</span>

            <button
              onClick={handleLogout}
              className="text-[#6B6B76] hover:text-[#E8E8EA]"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-50 px-8 py-8">
        <Outlet context={{ workspaceName, username, userId }} />
      </main>
    </div>
  );
}
