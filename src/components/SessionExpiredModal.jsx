import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SessionExpiredModal() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.removeItem("temp_token");
      localStorage.removeItem("long_token");
      navigate("/login");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-[#101117] border border-[#262830] rounded-2xl p-8 text-center">
        <p className="text-red-400 text-lg font-semibold">Session Expired</p>
        <p className="text-[#6B6B76] mt-2">Redirecting to login...</p>
      </div>
    </div>
  );
}