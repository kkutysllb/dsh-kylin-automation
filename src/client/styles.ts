/** Plugin stylesheet: one injected <style> element, all classes prefixed
 * `kyl-`. Self-contained dark/light adaptation via CSS variables inherited
 * from the host theme surface.
 */

const STYLE_ID = 'kyl-automation-styles'

const CSS = `
.kyl-panel{display:flex;flex-direction:column;height:100%;min-height:0;overflow:auto;padding:20px 24px 32px;gap:16px;font-size:13px;line-height:1.5;color:var(--dsh-color-text,#1f2329);background:var(--dsh-color-bg,transparent)}
.kyl-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.kyl-title{margin:0;font-size:18px;font-weight:600}
.kyl-subtitle{margin:2px 0 0;font-size:12px;opacity:.72;max-width:640px}
.kyl-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.kyl-scope{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.kyl-actions{display:flex;align-items:center;gap:8px}
.kyl-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:var(--dsh-color-fill-secondary,rgba(127,127,127,.12));font-size:12px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kyl-chip-muted{opacity:.72}
.kyl-badge{padding:2px 8px;border-radius:999px;font-size:12px;background:rgba(63,181,121,.16);color:#0f9d58}
.kyl-badge[data-active="true"]{background:rgba(63,181,121,.16)}
.kyl-badge:not([data-active]){background:rgba(127,127,127,.16);opacity:.85}
.kyl-notice{padding:8px 12px;border-radius:8px;background:rgba(46,144,250,.12);font-size:12px;cursor:pointer}
.kyl-body{display:flex;flex-direction:column;gap:20px}
.kyl-section-title{margin:0 0 8px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}
.kyl-count{font-weight:400;opacity:.6}
.kyl-cards,.kyl-runs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.kyl-card,.kyl-run{border:1px solid var(--dsh-color-border,rgba(127,127,127,.25));border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;background:var(--dsh-color-bg,transparent)}
.kyl-card-head,.kyl-run-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kyl-card-name,.kyl-run-name{font-weight:600;font-size:13px}
.kyl-card-schedule{font-size:12px;opacity:.85}
.kyl-card-facts,.kyl-run-head{font-size:12px;opacity:.9}
.kyl-card-facts{display:flex;gap:14px;flex-wrap:wrap}
.kyl-card-summary,.kyl-run-summary{font-size:12px;opacity:.75;border-left:2px solid rgba(127,127,127,.3);padding-left:8px}
.kyl-card-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
.kyl-run{gap:4px}
.kyl-run-note,.kyl-run-error{font-size:12px}
.kyl-run-error{color:#d0403d}
.kyl-run-summary{font-size:12px;opacity:.75}
.kyl-btn{appearance:none;border:1px solid var(--dsh-color-border,rgba(127,127,127,.3));background:var(--dsh-color-fill-secondary,rgba(127,127,127,.08));color:inherit;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer}
.kyl-btn:hover{filter:brightness(1.05)}
.kyl-btn-primary{background:var(--dsh-color-primary,#4f6ef7);border-color:transparent;color:#fff}
.kyl-btn-danger{color:#d0403d}
.kyl-btn-ghost{background:transparent}
.kyl-empty{display:flex;flex-direction:column;gap:6px;align-items:flex-start;padding:18px;border:1px dashed var(--dsh-color-border,rgba(127,127,127,.3));border-radius:10px;font-size:13px}
.kyl-empty-title{font-weight:600}
.kyl-empty-hint{font-size:12px;opacity:.72}
.kyl-status{padding:2px 8px;border-radius:999px;font-size:12px;background:rgba(127,127,127,.16)}
.kyl-status-running{background:rgba(63,144,255,.18)}
.kyl-status-queued{background:rgba(160,120,255,.16)}
.kyl-status-succeeded{background:rgba(63,181,121,.18)}
.kyl-status-failed{background:rgba(208,64,61,.18)}
.kyl-status-skipped,.kyl-status-cancelled{background:rgba(127,127,127,.18);opacity:.8}
.kyl-run-when{font-variant-numeric:tabular-nums}
.kyl-editor-scrim{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;z-index:80;overflow:auto}
.kyl-editor{width:min(760px,100%);background:var(--dsh-color-bg,#fff);color:inherit;border:1px solid var(--dsh-color-border,rgba(127,127,127,.3));border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;box-shadow:0 16px 48px rgba(0,0,0,.2)}
.kyl-editor-title{margin:0;font-size:16px;font-weight:600}
.kyl-field{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.kyl-field-row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
.kyl-field-label{font-size:12px;font-weight:600;opacity:.8}
.kyl-input{width:100%;box-sizing:border-box;border:1px solid var(--dsh-color-border,rgba(127,127,127,.3));border-radius:8px;padding:6px 8px;font-size:12px;background:var(--dsh-color-fill-primary,transparent);color:inherit}
.kyl-textarea{resize:vertical;font-family:inherit;line-height:1.45}
.kyl-weekdays{display:flex;gap:6px;flex-wrap:wrap}
.kyl-weekday{border:1px solid var(--dsh-color-border,rgba(127,127,127,.3));background:transparent;color:inherit;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer}
.kyl-weekday[data-on]{background:var(--dsh-color-primary,#4f6ef7);border-color:transparent;color:#fff}
.kyl-permissions{display:flex;gap:8px;flex:1}
.kyl-perm{flex:1;display:flex;flex-direction:column;gap:2px;border:1px solid var(--dsh-color-border,rgba(127,127,127,.3));background:transparent;color:inherit;border-radius:10px;padding:8px 10px;font-size:12px;cursor:pointer;text-align:left}
.kyl-perm small{opacity:.65;font-size:11px;font-weight:400}
.kyl-perm[data-on]{border-color:var(--dsh-color-primary,#4f6ef7);box-shadow:0 0 0 1px var(--dsh-color-primary,#4f6ef7) inset}
.kyl-model-picker{display:flex;flex-direction:column;gap:8px;flex:1}
.kyl-radio{display:flex;align-items:center;gap:6px;font-size:12px}
.kyl-model-fields{display:flex;gap:10px;flex-wrap:wrap}
.kyl-editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}
`

/** Install the stylesheet once; idempotent across StrictMode replays. */
export function installStyles(): () => void {
  if (document.getElementById(STYLE_ID) === null) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.append(style)
  }
  return () => {
    document.getElementById(STYLE_ID)?.remove()
  }
}
