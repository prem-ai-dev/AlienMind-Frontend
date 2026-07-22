import { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Login() {
  useEffect(() => {
    localStorage.removeItem("long_token");
    localStorage.removeItem("temp_token");
  }, []);

  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(
    {
      email: "",
      password: "" 
    }
  );
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });
      localStorage.setItem("temp_token", response.data.access_token);

      navigate("/workspace-picker", { state: { workspaces: response.data.workspace_list } });
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0D0E12] text-[#E8E8EA]">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-137.5 w-137.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7F77DD]/15 blur-[180px]" />

        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#7F77DD]/50"
            style={{
              left: `${8 + i * 6}%`,
              top: `${50 + (i % 6) * 90}px`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
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

      {/* Login Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pt-1">
        <div className="w-full max-w-md rounded-3xl border border-[#7F77DD]/30 bg-[#101117] p-10 shadow-[0_0_70px_rgba(127,119,221,0.3)]">
          <h2 className="text-4xl font-bold">Welcome Back</h2>

          <p className="mt-3 text-[#6B6B76]">
            Sign in to your intelligent workspace
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm text-[#AFA9EC]">
                Email
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B76]">
                  ✉
                </span>

                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] py-3 pl-12 pr-4 outline-none transition focus:border-[#7F77DD]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  className="text-sm text-[#AFA9EC] hover:text-white"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B76]">
                  🔒
                </span>

                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-[#262830] bg-[#0D0E12] py-3 pl-12 pr-14 outline-none transition focus:border-[#7F77DD]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B76] hover:text-white"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-[#7F77DD] py-3 text-lg font-semibold transition hover:bg-[#9189ee]"
            >
              Sign In
            </button>
            {error && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
          </form>

          {/* Bottom Link */}
          <div className="mt-8 text-center text-[#6B6B76]">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/signup")}
              className="font-medium text-[#AFA9EC] hover:text-white"
            >
              Create Free Account
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