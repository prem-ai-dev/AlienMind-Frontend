import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      title: "AI Agents",
      description: "Create intelligent assistants for every project.",
    },
    {
      title: "Smart Projects",
      description: "Organize work with powerful project management.",
    },
    {
      title: "Team Collaboration",
      description: "Invite teammates and work together seamlessly.",
    },
    {
      title: "Workflow Automation",
      description: "Automate repetitive tasks using AI.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0E12] text-[#E8E8EA] overflow-x-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-28 h-125 w-125 -translate-x-1/2 rounded-full bg-[#7F77DD]/10 blur-[170px]" />
<div className="absolute right-2 top-1 h-125 w-125 rounded-full bg-[#7F77DD]/30 blur-[150px]" />

        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#7F77DD]/50"
            style={{
              left: `${10 + i * 7}%`,
              top: `${80 + (i % 5) * 70}px`,
            }}
          />
        ))}
      </div>

      {/* ================= NAVBAR ================= */}
      <header className="relative z-20 border-b border-[#262830]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-7">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7F77DD] font-bold">
              A
            </div>

            <h1 className="text-3xl font-bold tracking-wide">
              ALIEN MIND
            </h1>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate("/login")}
              className="rounded-xl border border-[#262830] px-8 py-3 text-lg transition hover:border-[#7F77DD]"
            >
              Login
            </button>

            <button
              onClick={() => navigate("/signup")}
              className="rounded-xl bg-[#7F77DD] px-8 py-3 text-lg font-semibold transition hover:bg-[#9189ee]"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative mx-auto flex max-w-7xl flex-col items-center gap-20 px-8 py-24 lg:flex-row">
        {/* Left */}
        <div className="flex-1">
          <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-[#7F77DD]/40 bg-[#7F77DD]/10 px-5 py-2 text-lg text-[#AFA9EC]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#7F77DD]" />
            AI-native project management
          </div>

          <h1 className="max-w-xl text-6xl font-bold leading-tight">
            Build Intelligent
            <br />
            <span className="text-[#AFA9EC]">Workspaces</span> with AI
          </h1>

          <p className="mt-8 max-w-xl text-xl leading-9 text-[#6B6B76]">
            Create projects, collaborate with your team, build AI agents,
            automate workflows, and manage everything from one intelligent
            workspace.
          </p>

          <div className="mt-12 flex flex-wrap gap-5">
            <button className="rounded-xl bg-[#7F77DD] px-8 py-4 text-lg font-semibold transition hover:bg-[#9189ee]">
              Start Free
            </button>

            <button className="rounded-xl border border-[#262830] px-8 py-4 text-lg transition hover:border-[#7F77DD]">
              ▶ Watch Demo
            </button>
          </div>

          <p className="mt-12 text-[#6B6B76]">
            Trusted by innovative teams worldwide
          </p>
        </div>

        {/* Right */}
        <div className="relative flex flex-1 items-center justify-center">
          <div className="relative w-full max-w-xl -rotate-3 rounded-3xl border border-[#2b2d37] bg-[#101117] p-6 shadow-[0_0_60px_rgba(127,119,221,0.08)]">
            <div className="rounded-2xl bg-[#0D0E12] p-5">
              <div className="flex">
                {/* Sidebar */}
                <div className="mr-6 w-20 border-r border-[#262830] pr-4">
                  <div className="mb-6 h-10 w-10 rounded-lg bg-[#7F77DD]" />

                  <div className="mb-3 h-2 rounded bg-[#262830]" />
                  <div className="mb-3 h-2 rounded bg-[#262830]" />
                  <div className="h-2 rounded bg-[#262830]" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="mb-6 h-3 w-3/4 rounded bg-[#262830]" />

                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className={`mb-4 flex items-center justify-between rounded-xl border ${
                        item === 2
                          ? "border-[#7F77DD]"
                          : "border-[#262830]"
                      } p-4`}
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            item === 1
                              ? "bg-orange-400"
                              : item === 2
                              ? "bg-yellow-400"
                              : "bg-green-500"
                          }`}
                        />

                        <div className="h-2 w-full rounded bg-[#262830]" />
                      </div>

                      <div className="ml-5 h-6 w-6 rounded-full bg-[#7F77DD]/40" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Widget */}
            <div className="absolute -bottom-6 -right-5 w-56 rounded-2xl border border-[#262830] bg-[#101117] p-5 shadow-xl">
              <p className="text-sm text-[#6B6B76]">Sprint progress</p>

              <h3 className="mt-2 text-5xl font-bold">68%</h3>

              <div className="mt-5 h-2 rounded-full bg-[#262830]">
                <div className="h-full w-[68%] rounded-full bg-[#7F77DD]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="border-y border-[#262830] py-24">
        <div className="mx-auto max-w-7xl px-8">
          <p className="mb-14 text-center text-lg text-[#6B6B76]">
            Everything your dev team needs
          </p>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-[#262830] bg-[#101117] p-8 transition hover:border-[#7F77DD] hover:-translate-y-1 hover:shadow-[0_0_60px_rgba(127,119,221,0.5)]"
              >
                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#7F77DD]/30 bg-[#7F77DD]/10 text-xl text-[#AFA9EC]">
                  □
                </div>

                <h3 className="text-2xl font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-4 text-lg leading-8 text-[#6B6B76]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-8 py-10 text-[#6B6B76] md:flex-row">
        <span className="text-lg">AlienMind</span>

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