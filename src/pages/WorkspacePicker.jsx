import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Mail, Users, Building2, ArrowLeft } from "lucide-react";
import api from "../lib/api";

export default function WorkspacePicker() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const locationWorkspaces = state?.workspaces || [];
  const tempToken = localStorage.getItem("temp_token");

  const [view, setView] = useState("select");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ company_name: "", username: "" });
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const fetchDomainWorkspaces = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await api.get("/signup/domain/lookup", {
        headers: {
          Authorization: `Bearer ${tempToken}`,
        },
      });

      setWorkspaces(response.data.workspaces || []);
    } catch (err) {
      if (err.response?.status === 401) {
        setSessionExpired(true);
        setTimeout(() => navigate("/login"), 3000);
      } else if (err.response?.status === 404) {
        setWorkspaces([]);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError("");

    if (!formData.company_name.trim() || !formData.username.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/signup/fresh_signup",
        {
          company_name: formData.company_name,
          username: formData.username,
        },
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        }
      );

      localStorage.setItem("long_token", response.data.access_token);
      localStorage.removeItem("temp_token");

      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 401) {
        setSessionExpired(true);
        setTimeout(() => {
          localStorage.removeItem("temp_token");
          navigate("/login");
        }, 3000);
      } else if (err.response?.status === 409) {
          setError("Workspace already exists.");
      } else if (err.response?.status === 422) {
          setError("Invalid input. Please check your fields.");
      } else {
          setError(err.response?.data?.detail || "Something went wrong. Please try again.");
      }
    }
  };

  const handleJoin = async () => {
    setError("");

    if (!selectedWorkspaceId) {
      setError("Please select a workspace.");
      return;
    }

    if (!formData.username.trim()) {
      setError("Username is required.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/signup/domain_signup",
        {
          workspace_id: selectedWorkspaceId,
          username: formData.username,
        },
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        }
      );

      localStorage.setItem("long_token", response.data.access_token);
      localStorage.removeItem("temp_token");

      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 401) {
        setSessionExpired(true);
      } else if (err.response?.status === 409) {
        setError("You are already a member of this workspace.");
        setTimeout(() => setError(""), 2000);
      } else {
        setError(err.response?.data?.detail || "Failed to join workspace.");
        setTimeout(() => setError(""), 2000);
      }
      } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = async (workspaceId) => {
    setError("");
    setSelectedWorkspaceId(workspaceId);
    setLoading(true);

    try {
      const response = await api.post(
        `/auth/select_workspace/${workspaceId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        }
      );

      localStorage.setItem("long_token", response.data.access_token);
      localStorage.removeItem("temp_token");

      navigate("/dashboard");
    } catch (err) {
        if (err.response?.status === 401) {
          setSessionExpired(true);
        } else {
          setError(err.response?.data?.detail || "Failed to access workspace.");
        }
      }
  };

  return (
    <div
      style={{
        background:
          "radial-gradient(ellipse at top, #1a1040 0%, #0D0E12 60%, #080810 100%)",
      }}
      className="min-h-screen flex flex-col text-white"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-125 w-125 -translate-x-1/2 rounded-full bg-[#7F77DD]/15 blur-[150px]" />
        <div className="absolute right-0 top-0 h-75 w-75 rounded-full bg-[#7F77DD]/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-8 py-7">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-4"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7F77DD] font-bold">
            A
          </div>

          <h1 className="text-3xl font-bold tracking-wide">ALIEN MIND</h1>
        </button>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-10 shadow-2xl">
          {view === "select" && (
            <>
              <h1 className="text-3xl font-bold text-center">
                Select Your Access Option
              </h1>

              <p className="mt-2 text-center text-gray-400">
                Choose how you want to access a workspace
              </p>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setView("create");
                  }}
                  className="rounded-2xl border border-white/10 p-6 text-left transition-all hover:border-violet-400"
                >
                  <div className="w-14 h-14 rounded-xl bg-violet-600/20 flex items-center justify-center">
                    <Box className="w-7 h-7 text-violet-400" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold">
                    Create New Workspace
                  </h3>

                  <p className="mt-2 text-sm text-gray-400">
                    Start fresh. Build your own environment and invite your team.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setView("join");
                    fetchDomainWorkspaces();
                  }}
                  className="rounded-2xl border border-white/10 p-6 text-left transition-all hover:border-violet-400"
                >
                  <div className="w-14 h-14 rounded-xl bg-violet-600/20 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-violet-400" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold">
                    Join Through Company Email
                  </h3>

                  <p className="mt-2 text-sm text-gray-400">
                    Access workspaces matching your company email domain.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setView("existing");
                  }}
                  className="rounded-2xl border border-white/10 p-6 text-left transition-all hover:border-violet-400"
                >
                  <div className="w-14 h-14 rounded-xl bg-violet-600/20 flex items-center justify-center">
                    <Users className="w-7 h-7 text-violet-400" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold">
                    Join Already-in-Part Workspace
                  </h3>

                  <p className="mt-2 text-sm text-gray-400">
                    Quickly access a workspace you were previously part of.
                  </p>
                </button>
              </div>
            </>
          )}

          {view === "create" && (
            <>
              <h1 className="text-3xl font-bold text-center">
                Create New Workspace
              </h1>

              <div className="mt-10 space-y-5">
                <div>
                  <label className="block text-sm mb-2">Company Name</label>

                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-500"
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Username</label>

                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-500"
                    placeholder="Choose username"
                  />
                </div>
              </div>

              {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

              <div className="mt-10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setView("select")}
                  className="flex items-center gap-2 text-gray-300 hover:text-white"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="rounded-xl bg-violet-600 px-8 py-3 font-medium hover:bg-violet-700 disabled:opacity-50"
                >
                  {loading ? "Please wait..." : "Create Workspace"}
                </button>
              </div>
            </>
          )}

          {view === "join" && (
            <>
              <h1 className="text-3xl font-bold text-center">
                Join Through Company Email
              </h1>

              <div className="mt-10">
                {sessionExpired ? (
                  <p className="text-center text-red-400">
                    Session expired. Redirecting to sign in...
                  </p>
                ) : (
                  <>
                    {loading ? (
                      <p className="text-gray-400">Finding workspaces...</p>
                    ) : workspaces.length === 0 ? (
                      <div className="rounded-xl border border-white/10 p-4 text-gray-400">
                        No workspaces found for your email domain
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {workspaces.map((workspace) => (
                          <button
                            key={workspace.workspace_id}
                            type="button"
                            onClick={() =>
                              setSelectedWorkspaceId(workspace.workspace_id)
                            }
                            className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                              selectedWorkspaceId === workspace.workspace_id
                                ? "border-violet-500 bg-violet-500/10"
                                : "border-white/10 hover:border-violet-400"
                            }`}
                          >
                            <Building2 className="w-5 h-5 text-violet-400" />

                            <span>{workspace.company_name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-5">
                      <label className="block text-sm mb-2">Username</label>

                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-500"
                        placeholder="Choose username"
                      />
                    </div>
                  </>
                )}
              </div>

              {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

              <div className="mt-10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setView("select")}
                  className="flex items-center gap-2 text-gray-300 hover:text-white"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={loading || sessionExpired}
                  className="rounded-xl bg-violet-600 px-8 py-3 font-medium hover:bg-violet-700 disabled:opacity-50"
                >
                  {loading ? "Please wait..." : "Join Workspace"}
                </button>
              </div>
            </>
          )}

          {view === "existing" && (
            <>
              <h1 className="text-3xl font-bold text-center">
                Your Workspaces
              </h1>

              <div className="mt-10">
                {locationWorkspaces.length === 0 ? (
                  <div className="rounded-xl border border-white/10 p-4 text-gray-400">
                    No workspaces found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {locationWorkspaces.map((workspace) => (
                      <button
                        key={workspace.workspace_id}
                        type="button"
                        disabled={loading}
                        onClick={() => handleSelectWorkspace(workspace.workspace_id)}
                        className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition disabled:opacity-50 ${
                          selectedWorkspaceId === workspace.workspace_id
                            ? "border-violet-500 bg-violet-500/10"
                            : "border-white/10 hover:border-violet-400"
                        }`}
                      >
                        <Building2 className="w-5 h-5 text-violet-400" />

                        <span>{workspace.company_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => setView("select")}
                  className="flex items-center gap-2 text-gray-300 hover:text-white"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col items-center justify-between gap-6 border-t border-[#262830] px-8 py-8 text-[#6B6B76] md:flex-row">
        <span>AlienMind</span>

        <div className="flex gap-8">
          <a href="#" className="hover:text-[#AFA9EC]">
            Privacy
          </a>

          <a href="#" className="hover:text-[#AFA9EC]">
            Terms
          </a>

          <a href="#" className="hover:text-[#AFA9EC]">
            Contact
          </a>

          <a href="#" className="hover:text-[#AFA9EC]">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
