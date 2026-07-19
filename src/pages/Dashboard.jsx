import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const token = localStorage.getItem("long_token");
      if (!token) {
        navigate("/login");
        return;
      }
      const { role } = jwtDecode(token);
      if (role === "MANAGER") navigate("/manager/dashboard");
      else if (role === "MEMBER") navigate("/member/dashboard");
      else if (role === "COMPANY_ADMIN") navigate("/admin/dashboard");
      else navigate("/admin/dashboard");
    } catch (err) {
      console.log("decode error:", err);
      navigate("/login");
    }
  }, []);

  return null;
}