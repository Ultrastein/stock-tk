// Toast notification system.
// Usage: Toast.show('Message', 'success' | 'error' | 'warning' | 'info', durationMs)

const CONTAINER_ID = 'toast-container';

function getContainer() {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', right: '24px', zIndex: '99999',
      display: 'flex', flexDirection: 'column', gap: '8px',
      maxWidth: '360px', pointerEvents: 'none',
    });
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'false');
    document.body.appendChild(el);
  }
  return el;
}

const TYPE_STYLES = {
  success: { bg: 'var(--success-bg)', border: 'var(--success)', color: 'var(--success)', icon: '✓' },
  error:   { bg: 'var(--danger-bg)',  border: 'var(--danger)',  color: 'var(--danger)',  icon: '✕' },
  warning: { bg: 'var(--warning-bg)', border: 'var(--warning)', color: 'var(--warning)', icon: '⚠' },
  info:    { bg: 'var(--info-bg)',    border: 'var(--info)',    color: 'var(--info)',    icon: 'ℹ' },
};

function remove(el) {
  if (!el.isConnected) return;  // guard against double-remove race condition
  el.style.transition = 'opacity .2s, transform .2s';
  el.style.opacity    = '0';
  el.style.transform  = 'translateX(20px)';
  setTimeout(() => el.remove(), 200);
}

export function show(message, type = 'info', duration = 4000) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.info;
  const container = getContainer();

  const toast = document.createElement('div');
  Object.assign(toast.style, {
    background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    borderRadius: 'var(--radius)', padding: '12px 16px',
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    fontSize: 'var(--text-sm)', boxShadow: 'var(--shadow-lg)',
    pointerEvents: 'auto', cursor: 'pointer',
    animation: 'slideUp .2s ease forwards',
    maxWidth: '360px', wordBreak: 'break-word',
  });

  if (type === 'error') {
    toast.setAttribute('role', 'alert');
  }

  const iconSpan = document.createElement('span');
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.style.cssText = 'font-weight:700;font-size:16px;line-height:1;flex-shrink:0';
  iconSpan.textContent = s.icon;

  const msgSpan = document.createElement('span');
  msgSpan.style.cssText = 'flex:1;color:var(--text-primary)';
  msgSpan.textContent = message;  // textContent = safe

  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);

  toast.addEventListener('click', () => remove(toast));
  container.appendChild(toast);

  if (duration > 0) setTimeout(() => remove(toast), duration);

  return toast;
}

export const Toast = { show };
export default Toast;
