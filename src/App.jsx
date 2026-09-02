import "./styles.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LOGIN_URL } from "./config";
import { initLang, withLang, useT } from "./lib/ek-i18n";
import { useAuth }  from "./hooks/useAuth";
import { useToast } from "./hooks/useToast";

import Toast         from "./components/Toast";
import Layout        from "./components/Layout";
import { BootLoader } from "./components/ek/Loading";
import { ConfirmProvider } from "./context/ConfirmProvider";
import DashboardPage from "./pages/DashboardPage";
import ShopsPage     from "./pages/ShopsPage";
import UsersPage     from "./pages/UsersPage";
import CustomersPage from "./pages/CustomersPage";
import RequestsPage  from "./pages/RequestsPage";
import AuditPage     from "./pages/AuditPage";
import AdminsPage    from "./pages/AdminsPage";
import SettingsPage  from "./pages/SettingsPage";
import NotFound      from "./pages/NotFound";

// ⚠ Tilni URL dan olish MODUL TANASIDA, `replaceState` dan OLDIN bo'lishi shart.
// Bu fayl `main.jsx` dan import qilinadi va ES modul tartibiga ko'ra shu tana
// `main.jsx` dagi `initLang()` dan OLDIN ishlaydi. Agar avval URL tozalansa,
// `?lang=` yo'qoladi va login'da tanlangan til bu yerga umuman yetib kelmaydi.
initLang();

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
    // Refresh token login domenidagi deviceId ga bog'langan — o'shani
    // saqlaymiz, aks holda bu yerda yangi id yaralib refresh rad etiladi.
    const _deviceId = _p.get("deviceId") || "";

    if (_token && _type) {
      localStorage.setItem("ek_token",    _token);
      localStorage.setItem("ek_refresh",  _refresh);
      if (_deviceId) localStorage.setItem("ek_deviceId", _deviceId);
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
if (!token || type !== "admin") {
  // Til tanlovi sessiyaga emas, brauzerga tegishli — `clear()` dan omon qolsin,
  // aks holda chiqarilgan foydalanuvchi kirish ekranini yana boshqa tilda ko'radi.
  const _lang = localStorage.getItem("ek_lang");
  localStorage.clear();
  if (_lang) localStorage.setItem("ek_lang", _lang);
  window.location.replace(withLang(`${LOGIN_URL}?logged_out=1`));
}

export default function App() {
  // Yagona til obunasi: til o'zgarganda BUTUN daraxt qayta chiziladi va
  // ichkaridagi barcha `t()` chaqiruvlari yangi tilni oladi.
  useT();
  const { user, ready, logout }    = useAuth();
  const { toasts, toast, dismiss } = useToast();

  // Serverdan tasdiq kelmaguncha panel CHIZILMAYDI. localStorage'ga qarab
  // "optimistik" ko'rsatish mumkin edi, lekin aynan o'sha yolg'on B9 ning
  // mohiyati: `ek_role` ni qo'lda o'zgartirgan odam bir zumga bo'lsa ham
  // o'ziga tegishli bo'lmagan bo'limlarni ko'rardi.
  if (!ready) return <BootLoader />;
  if (!user)  return null;

  return (
    <ConfirmProvider>
      <BrowserRouter>
        <Toast toasts={toasts} onDismiss={dismiss} />
        {/* ⚠ `onLogout` uzatilmaydi: chiqish Sozlamalar sahifasida va u
            propni to'g'ridan-to'g'ri oladi (pastda). */}
        <Layout user={user}>
          <Routes>
            <Route path="/"          element={<DashboardPage toast={toast} />} />
            <Route path="/requests"  element={<RequestsPage  toast={toast} />} />
            <Route path="/shops"     element={<ShopsPage     toast={toast} />} />
            <Route path="/users"     element={<UsersPage     toast={toast} />} />
            <Route path="/customers" element={<CustomersPage toast={toast} />} />
            <Route path="/audit"     element={<AuditPage     toast={toast} />} />
            {/* Adminlar (V50) — sahifaga `user` uzatiladi: unda o'ziga
                nisbatan xavfli amallarni chizmaslik uchun `id` kerak. */}
            <Route path="/admins"    element={<AdminsPage    toast={toast} user={user} />} />
            <Route path="/settings"  element={<SettingsPage  toast={toast} user={user} onLogout={logout} />} />
            {/* Noma'lum manzil — Dashboard'ga JIMGINA qaytarilmaydi:
                foydalanuvchi so'ragan sahifada ekanman deb o'ylardi. */}
            <Route path="*"          element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfirmProvider>
  );
}
