import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const longToken = localStorage.getItem("long_token");

  if (!longToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
