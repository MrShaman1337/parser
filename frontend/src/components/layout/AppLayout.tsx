import { Outlet, useLocation } from "react-router-dom";
import AnoAI from "../ui/animated-shader-background";
import Header from "../shared/Header";
import Footer from "../shared/Footer";

const AppLayout: React.FC<{ enableShader?: boolean }> = ({ enableShader = true }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <div>
      {enableShader && !isAdmin && <AnoAI />}
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
};

export default AppLayout;
