import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import AppLayout from "./components/layout/AppLayout";
import AdminLayout from "./components/layout/AdminLayout";

const Home = lazy(() => import("./pages/Home"));
const Catalog = lazy(() => import("./pages/Catalog"));
const Product = lazy(() => import("./pages/Product"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Account = lazy(() => import("./pages/Account"));
const Support = lazy(() => import("./pages/Support"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
import { CartProvider } from "./context/CartContext";
import { AdminSessionProvider } from "./context/AdminSessionContext";
import { UserSessionProvider } from "./context/UserSessionContext";
import ProtectedRoute from "./components/admin/ProtectedRoute";

const AppRoutes = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <CartProvider>
      <AdminSessionProvider>
        <UserSessionProvider>
          <Suspense fallback={null}>
            <Routes>
          <Route element={<AppLayout enableShader={!isAdmin} />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/account" element={<Account />} />
            <Route path="/support" element={<Support />} />

            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="/catalog.html" element={<Navigate to="/catalog" replace />} />
            <Route path="/product.html" element={<Navigate to="/catalog" replace />} />
            <Route path="/cart.html" element={<Navigate to="/cart" replace />} />
            <Route path="/checkout.html" element={<Navigate to="/checkout" replace />} />
            <Route path="/account.html" element={<Navigate to="/account" replace />} />
            <Route path="/support.html" element={<Navigate to="/support" replace />} />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminOrders />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/index.html" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/login.html" element={<Navigate to="/admin/login" replace />} />
            </Routes>
          </Suspense>
        </UserSessionProvider>
      </AdminSessionProvider>
    </CartProvider>
  );
};

export default AppRoutes;
