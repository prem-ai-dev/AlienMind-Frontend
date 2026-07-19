import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Box,
  ArrowLeft,
} from "lucide-react";
import api from "../lib/api";

export default function WorkspaceSetup() {
  const navigate = useNavigate();

  const [selectedCard, setSelectedCard] = useState("");
  const [formData, setFormData] = useState({
    company_name: "",
    username: "",
  });

  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [error, setError] = useState("");
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tempToken = localStorage.getItem("temp_token");

  useEffect(() => {
    if (selectedCard !== "join") return;

    const fetchWorkspaces = async () => {
      setLoadingWorkspaces(true);
      setError("");
      setSelectedWorkspaceId("");

      try {
        console.log("temp_token:", tempToken);
        const response = await api.get("/signup/domain/lookup", {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        });

        setWorkspaces(response.data.workspaces || []);
      } catch (err) {
        setWorkspaces([]);
        setError(err.message);
      } finally {
        setLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, [selectedCard, tempToken]);

  const handleNext = async () => {
    setError("");

    if (!selectedCard) {
      setError("Please select an option.");
      return;
    }

    if (!formData.username.trim()) {
      setError("Username is required.");
      return;
    }

    if (selectedCard === "create" && !formData.company_name.trim()) {
      setError("Company name is required.");
      return;
    }

    if (selectedCard === "join" && !selectedWorkspaceId) {
      setError("Please select a workspace.");
      return;
    }

    setSubmitting(true);

    try {
      const endpoint =
        selectedCard === "create"
          ? "/signup/fresh_signup"
          : "/signup/domain_signup";

      const body =
        selectedCard === "create"
          ? {
              username: formData.username,
              company_name: formData.company_name,
            }
          : {
              workspace_id: selectedWorkspaceId,
              username: formData.username,
            };

      const response = await api.post(endpoint,body, {
        headers: {
          Authorization: `Bearer ${tempToken}`,
        },
      });
      localStorage.setItem("long_token", response.data.access_token);
      localStorage.removeItem("temp_token");
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 404) {
        setWorkspaces([]);
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div style={{ background: "radial-gradient(ellipse at top, #1a1040 0%, #0D0E12 60%, #080810 100%)" }}
        className="min-h-screen flex flex-col text-white"
        >
        {/* Header */}
      <header className="relative z-10 px-8 py-7">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-4"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7F77DD] font-bold">
            A
          </div>

          <h1 className="text-3xl font-bold tracking-wide">
            ALIEN MIND
          </h1>
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-10 shadow-2xl">
          <h1 className="text-3xl font-bold text-center">
            Let's set up your workspace
          </h1>

          <p className="mt-2 text-center text-gray-400">
            Select how you want to get started
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              type="button"
              onClick={() => {
                setSelectedCard("create");
                setError("");
              }}
              className={`rounded-2xl border p-6 text-left transition-all ${
                selectedCard === "create"
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 hover:border-violet-400"
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-violet-600/20 flex items-center justify-center">
                <Box className="w-7 h-7 text-violet-400" />
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Create a New Workspace
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Start a brand new workspace for your organization.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCard("join");
                setError("");
              }}
              className={`rounded-2xl border p-6 text-left transition-all ${
                selectedCard === "join"
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 hover:border-violet-400"
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-violet-600/20 flex items-center justify-center">
                <Users className="w-7 h-7 text-violet-400" />
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Join an Existing Workspace
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Join a workspace already created for your company.
              </p>
            </button>
          </div>

          {selectedCard === "create" && (
            <div className="mt-8 space-y-5">
              <div>
                <label className="block text-sm mb-2">Company Name</label>

                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      company_name: e.target.value,
                    })
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
                    setFormData({
                      ...formData,
                      username: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-500"
                  placeholder="Choose username"
                />
              </div>
            </div>
          )}

          {selectedCard === "join" && (
            <div className="mt-8">
              <div className="mb-5">
                <label className="block text-sm mb-2">Username</label>

                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      username: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-500"
                  placeholder="Choose username"
                />
              </div>

              {loadingWorkspaces ? (
                <p className="text-gray-400">Loading workspaces...</p>
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
            </div>
          )}

          {error && (
            <p className="mt-6 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-gray-300 hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to Sign In
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="rounded-xl bg-violet-600 px-8 py-3 font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? "Please wait..." : "Next"}
            </button>
          </div>
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