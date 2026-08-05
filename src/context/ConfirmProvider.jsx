import { createContext, useContext, useRef, useState } from "react";
import { t } from "../lib/ek-i18n";

const ConfirmCtx = createContext(null);

/* Ranglar TOKENLARDAN. Ilgari bu yerda `#ef4444` turardi va fon uni
   `color + "18"` deb yasardi — ya'ni qorong'i rejimda ham o'zgarmaydigan
   och qizil dog'. Endi ikkala qiymat ham temaga bo'ysunadi. */
const TYPE_STYLES = {
  danger:  { icon: "fa-triangle-exclamation", fg: "var(--fg-danger)",  bg: "var(--bg-danger-subtle)",  btnClass: "btn-danger"  },
  warning: { icon: "fa-circle-exclamation",   fg: "var(--fg-warning)", bg: "var(--bg-warning-subtle)", btnClass: "btn-warning" },
  info:    { icon: "fa-circle-info",          fg: "var(--fg-brand)",   bg: "var(--bg-brand-subtle)",   btnClass: "btn-primary" },
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = ({ title, message, type = "danger", confirmText, cancelText }) =>
    new Promise((res) => {
      resolveRef.current = res;
      setState({
        title:       title       ?? t("common.confirm"),
        message,
        type,
        confirmText: confirmText ?? t("common.confirm"),
        cancelText:  cancelText  ?? t("common.cancel"),
      });
    });

  const handle = (ok) => {
    setState(null);
    resolveRef.current?.(ok);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div className="ov" onClick={() => handle(false)}>
          <div
            className="mb"
            style={{ maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mh" style={{ paddingBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: TYPE_STYLES[state.type]?.bg,
                    color:      TYPE_STYLES[state.type]?.fg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  <i className={`fa-solid ${TYPE_STYLES[state.type]?.icon}`} />
                </div>
                <div className="mt">{state.title}</div>
              </div>
              <button
                onClick={() => handle(false)}
                aria-label={t("common.close")}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: "var(--fg-tertiary)", fontSize: 18, padding: "4px 6px" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="mbody" style={{ paddingTop: 0, paddingBottom: 8 }}>
              <p style={{ fontSize: 14, color: "var(--fg-secondary)", lineHeight: 1.6 }}>
                {state.message}
              </p>
            </div>
            <div className="mf">
              <button className="btn btn-outline btn-sm" onClick={() => handle(false)}>
                {state.cancelText}
              </button>
              <button
                className={`btn btn-sm ${TYPE_STYLES[state.type]?.btnClass}`}
                onClick={() => handle(true)}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmCtx);
}
