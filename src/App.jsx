import "./styles.css";
/* BUILD_ID: ADMIN_PHONE_MASK_UPDATE_V1 */
import { useState } from "react";
import { LOGIN_URL } from "./config";
import { useAuth }  from "./hooks/useAuth";
import { useToast } from "./hooks/useToast";

import Toast         from "./components/Toast";
import Layout        from "./components/Layout";
import { ConfirmProvider } from "./context/ConfirmProvider";
import DashboardPage from "./pages/DashboardPage";
import ShopsPage     from "./pages/ShopsPage";
import UsersPage     from "./pages/UsersPage";
import CustomersPage from "./pages/CustomersPage";

const PAGES = {
  dashboard: DashboardPage,
  shops:     ShopsPage,
  users:     UsersPage,
  customers: CustomersPage,
};

// ── URL dan auth param olib localStorage ga yozish ──────────
const _urlParams = new URLSearchParams(window.location.search);
const _authParam = _urlParams.get("auth");
if (_authParam) {
  try {
    const _p = new URLSearchParams(decodeURIComponent(_authParam));
    const _token    = _p.get("token")    || "";
    const _type     = _p.get("type")     || "";
    const _username = _p.get("username") || "";
    const _fullName = _p.get("fullName") || _username;
    const _role     = _p.get("role")     || "";
    const _refresh  = _p.get("refresh") || _p.get("refreshToken") || "";

    console.log("[ADMIN] auth param → type:", _type, "| token:", _token.slice(0,20));

    if (_token && _type) {
      localStorage.setItem("ek_token",    _token);
      localStorage.setItem("ek_refresh",  _refresh);
      localStorage.setItem("ek_type",     _type);
      localStorage.setItem("ek_username", _username);
      localStorage.setItem("ek_fullName", _fullName);
      localStorage.setItem("ek_role",     _role);
    }
  } catch(e) {
    console.error("[ADMIN] auth param xatosi:", e);
  }
  window.history.replaceState({}, "", window.location.pathname);
}

// Token tekshirish
const token = localStorage.getItem("ek_token");
const type  = localStorage.getItem("ek_type");
console.log("[ADMIN] token check → token:", token?.slice(0,20), "| type:", type);
if (!token || type !== "admin") {
  localStorage.clear();
  window.location.replace(`${LOGIN_URL}?logged_out=1`);
}

export default function App() {
  const { user, logout }           = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [page, setPage]            = useState("dashboard");

  if (!user) return null;

  const PageComponent = PAGES[page] || DashboardPage;

  return (
    <ConfirmProvider>
      <Toast toasts={toasts} onDismiss={dismiss} />
      <Layout page={page} setPage={setPage} user={user} onLogout={logout}>
        <PageComponent toast={toast} setPage={setPage} />
      </Layout>
    </ConfirmProvider>
  );
}
