import { Navigate } from "react-router-dom";
import { useAdminSession } from "../../context/AdminSessionContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, authenticated } = useAdminSession();
  if (loading) return null;
  if (!authenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
