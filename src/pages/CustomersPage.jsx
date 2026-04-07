import { useEffect, useState } from "react";
import { customerApi } from "../api";
import { fmtDate } from "../utils";
import Modal from "../components/Modal";
import { Loader, Empty, Search, FG, Avatar } from "../components/ui";

export default function CustomersPage({ toast }) {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [editC,     setEditC]     = useState(null);

  const load = (q = "") => {
    setLoading(true);
    customerApi.getAll(q ? `search=${encodeURIComponent(q)}` : "")
      .then(r => setCustomers(r.data || []))
      .catch(e => toast.error("Mijozlar yuklanmadi: " + e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Client-side filter (server-side search mavjud, lekin past latency uchun ikkalasi)
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !q || c.fullName?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  return (
    <div>
      <div className="card">
        <div className="c-head">
          <span className="c-title"><i className="fa-solid fa-address-book" />Mijozlar</span>
          <div style={{ display:"flex", gap:8 }}>
            <Search value={search} onChange={setSearch}
              placeholder="Ism yoki telefon..." style={{ width:240 }} />
          </div>
        </div>
        <div className="tw">
          {loading ? <Loader /> : (
            <table>
              <thead>
                <tr>
                  <th>Mijoz</th>
                  <th>Telefon</th>
                  <th>Ro'yxatdan o'tgan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Avatar name={c.fullName} size={30} radius={8} />
                        <span style={{ fontWeight:700 }}>{c.fullName}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily:"monospace", fontSize:12, color:"var(--text3)" }}>
                      {c.phone || "—"}
                    </td>
                    <td style={{ fontSize:12, color:"var(--text3)" }}>
                      {fmtDate(c.createdAt)}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline"
                        onClick={() => setEditC(c)} title="Tahrirlash">
                        <i className="fa-solid fa-pen" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}>
                    <Empty icon="fa-address-book" title="Mijoz topilmadi" />
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editC && (
        <EditCustomerModal
          customer={editC}
          onClose={() => setEditC(null)}
          onSaved={() => { setEditC(null); load(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

function EditCustomerModal({ customer, onClose, onSaved, toast }) {
  const [form,   setForm]   = useState({
    fullName: customer.fullName || "",
    phone:    customer.phone    || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.fullName.trim()) { toast.error("Ism majburiy"); return; }
    setSaving(true);
    try {
      await customerApi.update(customer.id, form);
      toast.success("Mijoz ma'lumotlari yangilandi");
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally     { setSaving(false); }
  };

  return (
    <Modal title={`Tahrirlash — ${customer.fullName}`} onClose={onClose} footer={
      <>
        <button className="btn btn-outline btn-sm" onClick={onClose}>Bekor</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saqlanmoqda...</>
                  : <><i className="fa-solid fa-check" /> Saqlash</>}
        </button>
      </>
    }>
      <FG label="Ism Familiya *">
        <input className="fi" value={form.fullName} onChange={set("fullName")} autoFocus />
      </FG>
      <FG label="Telefon">
        <input className="fi mono" value={form.phone} onChange={set("phone")}
          placeholder="+998901234567" />
      </FG>
    </Modal>
  );
}
