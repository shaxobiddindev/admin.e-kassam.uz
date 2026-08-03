import { useEffect, useState } from "react";
import { customerApi } from "../api";
import { fmtDate } from "../utils";
import { useT } from "../lib/ek-i18n";
import Modal from "../components/Modal";
import { Empty, Search, FG, Avatar } from "../components/ui";
import { SkeletonTable, Spinner } from "../components/ek/Loading";
import { useLoading } from "../lib/use-loading";

export default function CustomersPage({ toast }) {
  const { t } = useT();
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  // Tez javobda skeleton umuman chizilmaydi; chizilsa kamida 400ms turadi.
  const busy = useLoading(loading);
  const [search,    setSearch]    = useState("");
  const [editC,     setEditC]     = useState(null);

  const load = (q = "") => {
    setLoading(true);
    customerApi.getAll(q ? `search=${encodeURIComponent(q)}` : "")
      .then(r => setCustomers(r.data || []))
      .catch(e => toast.error(t("adm.customers.loadFailed", { msg: e.message })))
      .finally(() => setLoading(false));
  };

  // Qidiruv SERVERDA bajariladi. Ilgari `load(q)` server parametrini
  // qo'llardi, lekin uni hech kim chaqirmasdi va filtr faqat brauzerda
  // ishlardi — 10 000 mijozda sahifa cho'kardi.
  // 300ms kechikish: har harfda so'rov yuborilmasin.
  useEffect(() => {
    const id = setTimeout(() => load(search.trim()), search ? 300 : 0);
    return () => clearTimeout(id);
  }, [search]);

  const filtered = customers;

  return (
    <div>
      <div className="card">
        <div className="c-head">
          <span className="c-title"><i className="fa-solid fa-address-book" aria-hidden="true" />{t("adm.customers.title")}</span>
          <div style={{ display:"flex", gap:8 }}>
            <Search value={search} onChange={setSearch}
              placeholder={t("adm.customers.searchPlaceholder")} style={{ width:240 }} />
          </div>
        </div>
        <div className="tw">
          {busy ? <SkeletonTable rows={7} cols={["wide", "text", "num", "narrow"]} /> : (
            <table>
              <thead>
                <tr>
                  <th>{t("adm.customers.colCustomer")}</th>
                  <th>{t("common.phone")}</th>
                  <th>{t("adm.customers.colRegistered")}</th>
                  <th />
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
                    <td className="ek-num" style={{ fontSize:12, color:"var(--fg-secondary)" }}>
                      {c.phone || "—"}
                    </td>
                    <td className="ek-num" style={{ fontSize:12, color:"var(--fg-secondary)" }}>
                      {fmtDate(c.createdAt)}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline"
                        onClick={() => setEditC(c)} title={t("common.edit")}>
                        <i className="fa-solid fa-pen" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}>
                    <Empty icon="fa-address-book" title={t("adm.customers.notFound")} />
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
  const { t } = useT();
  const [form,   setForm]   = useState({
    fullName: customer.fullName || "",
    phone:    customer.phone    || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.fullName.trim()) { toast.error(t("adm.customers.errName")); return; }
    setSaving(true);
    try {
      await customerApi.update(customer.id, form);
      toast.success(t("adm.customers.updated"));
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally     { setSaving(false); }
  };

  return (
    <Modal title={t("adm.users.editTitle", { name: customer.fullName })} onClose={onClose} footer={
      <>
        <button className="btn btn-outline btn-sm" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <><Spinner /> {t("common.saving")}</>
                  : <><i className="fa-solid fa-check" /> {t("common.save")}</>}
        </button>
      </>
    }>
      <FG label={`${t("common.fullName")} *`}>
        <input className="fi" value={form.fullName} onChange={set("fullName")} autoFocus />
      </FG>
      <FG label={t("common.phone")}>
        <input className="fi ek-num" value={form.phone} onChange={set("phone")}
          placeholder="+998901234567" />
      </FG>
    </Modal>
  );
}
