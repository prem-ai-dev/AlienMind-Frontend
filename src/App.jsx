import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/login";
import Signup from "./pages/Signup";
import WorkspaceSetup from "./pages/WorkspaceSetup";
import WorkspacePicker from "./pages/WorkspacePicker";
import Dashboard from "./pages/Dashboard";
import MemberLayout from "./pages/member/MemberLayout";
import MemberDashboard from "./pages/member/MemberDashboard";
import MemberTask from "./pages/member/MemberTask";
import MemberProject from "./pages/member/MemberProject";
import ManagerLayout from "./pages/manager/ManagerLayout";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerProject from "./pages/manager/ManagerProject";
import ManagerTeam from "./pages/manager/ManagerTeam";
import ManagerTask from "./pages/manager/ManagerTask";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminTask from "./pages/admin/AdminTask";
import AdminProject from "./pages/admin/AdminProject";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/workspace-setup" element={<WorkspaceSetup />} />
        <Route path="/workspace-picker" element={<WorkspacePicker />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="projects" element={<ManagerProject />} />
          <Route path="teams" element={<ManagerTeam />} />
          <Route path="tasks" element={<ManagerTask />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="teams" element={<AdminTeam />} />
          <Route path="tasks" element={<AdminTask />} />
          <Route path="projects" element={<AdminProject />} />
        </Route>
        <Route
          path="/member"
          element={
            <ProtectedRoute>
              <MemberLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<MemberDashboard />} />
          <Route path="tasks" element={<MemberTask />} />
          <Route path="projects" element={<MemberProject />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
