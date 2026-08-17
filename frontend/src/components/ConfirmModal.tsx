import { useId } from 'react';

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  danger = false,
  busy = false,
  hideCancel = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  hideCancel?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(7, 11, 20, 0.72)', backdropFilter: 'blur(4px)' }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="card w-full max-w-md shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-stone-500 whitespace-pre-wrap">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {hideCancel ? null : (
            <button type="button" className="btn-ghost" disabled={busy} onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'กำลังทำ…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
