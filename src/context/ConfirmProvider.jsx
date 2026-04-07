import { createContext, useContext, useRef, useState } from "react";

const ConfirmCtx = createContext(null);

const TYPE_STYLES = {
  danger:  { icon: "fa-triangle-exclamation", color: "#ef4444", btnClass: "btn-danger" },
  warning: { icon: "fa-circle-exclamation",   color: "#f59e0b", btnClass: "btn-warning" },
  info:    { icon: "fa-circle-info",          color: "#017dca", btnClass: "btn-primary" },
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = ({ title = "Tasdiqlash", message, type = "danger",
    confirmText = "Tasdiqlash", cancelText = "Bekor" }) =>
    new Promise((res) => {
      resolveRef.current = res;
      setState({ title, message, type, confirmText, cancelText });
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
                    background: TYPE_STYLES[state.type]?.color + "18",
                    color: TYPE_STYLES[state.type]?.color,
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
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: "var(--text3)", fontSize: 18, padding: "4px 6px" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="mbody" style={{ paddingTop: 0, paddingBottom: 8 }}>
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>
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
