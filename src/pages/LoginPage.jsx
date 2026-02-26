import { useState } from "react";
import { authApi } from "../api";
import { LOGO_URL } from "../utils";

export default function LoginPage({ onLogin, toast }) {
  const [form, setForm]     = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(form);
      // Token olindi — /auth/admin/me dan to'liq ma'lumot olamiz
      const token = res.data.accessToken;
      localStorage.setItem("adm_token", token);

      const me = await authApi.me();
      onLogin({
        token,
        username: me.data.username,
        fullName: me.data.fullName,
        role:     me.data.role,
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp">
      {/* Fon glow */}
      <div className="lp-glow lp-g1" />
      <div className="lp-glow lp-g2" />

      <div className="lp-card">
        {/* Logo */}
        <div className="lp-logo">
          <img
            src={LOGO_URL}
            alt="e-Kassam"
            onError={(e) => (e.target.style.display = "none")}
          />
        </div>

        {/* Sarlavha */}
        <div className="lp-head">
          <div className="lp-ttl">
            <i className="fa-solid fa-shield-halved" style={{ marginRight: 8, color: "var(--blue)" }} />
            Admin Panel
          </div>
          <div className="lp-sub">Faqat vakolatli adminlar uchun</div>
        </div>

        {/* Xavfsizlik ogohlantirish */}
        <div style={{
          background: "var(--yellow-l)", border: "1.5px solid #fcd34d",
          borderRadius: 10, padding: "10px 14px", marginBottom: 18,
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, fontWeight: 700, color: "#92400e",
        }}>
          <i className="fa-solid fa-triangle-exclamation" />
          Bu sahifa faqat tizim administratorlari uchun
        </div>

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="flb">Foydalanuvchi nomi</label>
            <input
              className="fi"
              value={form.username}
              onChange={set("username")}
              placeholder="admin_username"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="fg">
            <label className="flb">Parol</label>
            <div style={{ position: "relative" }}>
              <input
                className="fi"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "none", cursor: "pointer",
                  color: "var(--text3)", fontSize: 14,
                }}
              >
                <i className={`fa-solid ${showPass ? "fa-eye-slash" : "fa-eye"}`} />
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading
              ? <><i className="fa-solid fa-spinner fa-spin" /> Kirish...</>
              : <><i className="fa-solid fa-right-to-bracket" /> Kirish</>}
          </button>
        </form>

        <div className="lp-copy">
          © {new Date().getFullYear()} e-Kassam.uz — Admin tizimi
        </div>
      </div>
    </div>
  );
}
