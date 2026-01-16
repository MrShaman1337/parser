import { Outlet, useLocation } from "react-router-dom";
import AnoAI from "../ui/animated-shader-background";
import Header from "../shared/Header";
import HoverFooter from "../HoverFooter";

const AppLayout: React.FC<{ enableShader?: boolean }> = ({ enableShader = true }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <div>
      {enableShader && !isAdmin && <AnoAI />}
      <Header />
      <Outlet />
      <HoverFooter />
    </div>
  );
};

export default AppLayout;
