<div align="center">

# 👽 AlienMind — Frontend

**React + Vite client for AlienMind** — the platform layer of the Alien Ecosystem.

![React](https://img.shields.io/badge/React-Vite-61DAFB) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8) ![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-lightgrey)

[Live Demo](#) · [Backend Repo](https://github.com/prem-ai-dev/AlienMind) · [Architecture Deep-Dive](https://github.com/prem-ai-dev/AlienMind/blob/main/ARCHITECTURE.md)

![AlienMind Dashboard](./docs/screenshot-dashboard.png)

</div>

---

## What This Is

This is the client for **AlienMind**, the platform layer of the Alien Ecosystem — a set of independently deployable, identity-linked services for how dev teams actually build software. This repo renders three distinct experiences from one codebase: Admin, Manager, and Member — each with its own dashboards, permitted actions, and data scope, enforced by the backend, not just hidden in the UI.

Backend repo: [AlienMind](https://github.com/prem-ai-dev/AlienMind)

## Features

- **Role-scoped layouts** — separate Admin, Manager, and Member page trees, each built as a self-contained view fetching its own data
- **Workspace & project management** — teams, projects, sprints, and tasks with status tracking and inline editing
- **Ownership-aware UI** — a Manager sees full controls on projects/teams they own, read-only views on ones they only touch through another role
- **Session handling** — global axios interceptor for auth headers, automatic session-expired detection and redirect
- **Aggregated dashboards** — role-specific stats (workspace-wide for Admin, scoped-to-owned for Manager, personal for Member) pulled from dedicated backend endpoints

## Tech Stack

React · Vite · Tailwind CSS v4 · Axios

## Quickstart

```bash
git clone https://github.com/prem-ai-dev/AlienMind-Frontend.git
cd AlienMind-Frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL to your backend
npm run dev
```

Requires the [AlienMind backend](https://github.com/prem-ai-dev/AlienMind) running locally or deployed.

## License

All rights reserved — publicly viewable for portfolio and evaluation purposes. See [LICENSE](./LICENSE).
