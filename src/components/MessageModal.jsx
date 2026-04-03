import { useEffect, useId, useState } from "react";
import { sendMessage } from "../lib/localEventsApi";

export default function MessageModal({ open, onClose, recipient, fromUserId, onSent }) {
  const titleId = useId();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (open) {
      setText("");
      setErr(null);
    }
  }, [open, recipient?.userId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !recipient) return null;

  async function onSubmit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !fromUserId) return;
    setSending(true);
    setErr(null);
    try {
      await sendMessage({ fromUserId, toUserId: recipient.userId, body });
      onSent?.();
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="msg-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="msg-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="msg-modal-head">
          <h2 id={titleId} className="msg-modal-title">
            Message {recipient.displayName || "Fest Friend"}
          </h2>
          <button type="button" className="msg-modal-close btn-text" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="msg-modal-hint">
          Messages are stored on the server for this demo. A full chat experience can plug in here later.
        </p>
        <form onSubmit={onSubmit} className="msg-modal-form">
          <textarea
            className="msg-modal-input account-field-input account-field-input--textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Say hi — maybe you’re both going early for the opener…"
            rows={4}
            maxLength={2000}
            required
            autoFocus
          />
          {err ? (
            <p className="taste-error" role="alert">
              {err}
            </p>
          ) : null}
          <div className="msg-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
