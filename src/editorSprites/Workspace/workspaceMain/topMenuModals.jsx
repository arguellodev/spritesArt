// Modales que abre el menú superior:
//   - <TopMenuModal>  — wrapper genérico (overlay + panel + cerrar con Esc).
//   - <AboutModal>    — splash con identidad PixCalli.
//   - <KeybindingsModal> — wraps KeybindingsPanel para abrir desde Configuración.
//
// Mantengo todo aquí para no esparcir 3 archivos por una funcionalidad
// sencilla. Si crece, extraer cada uno a su propio módulo.

import { useEffect } from 'react';
import { LuX, LuKeyboard } from 'react-icons/lu';
import KeybindingsPanel from '../settings/keybindingsPanel';
import { useI18n } from '../../i18n/useI18n';
import './topMenuModals.css';

// Wrapper genérico — overlay con backdrop blur + panel central animado.
export function TopMenuModal({ open, onClose, title, icon, children, width = 460 }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="topmenu-modal-overlay" onMouseDown={onClose}>
      <div
        className="topmenu-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="topmenu-modal-header">
          <div className="topmenu-modal-title">
            {icon && <span className="topmenu-modal-icon">{icon}</span>}
            <span>{title}</span>
          </div>
          <button
            type="button"
            className="topmenu-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <LuX />
          </button>
        </div>
        <div className="topmenu-modal-body">{children}</div>
      </div>
    </div>
  );
}

// AboutModal — splash innovador con grid pixel-art animado.
export function AboutModal({ open, onClose, version = '0.0.0' }) {
  const { t } = useI18n();
  return (
    <TopMenuModal open={open} onClose={onClose} title={t('about.title')} width={520}>
      <div className="topmenu-about">
        {/* Pixel canvas decorativo: muestra la marca con un mini-sprite
         * generado por CSS (grid de cuadros con un patrón). Liviano,
         * sin dependencias, evoca el editor sin distraer. */}
        <div className="topmenu-about-hero" aria-hidden="true">
          <div className="topmenu-about-pixelart">
            {Array.from({ length: 64 }).map((_, i) => (
              <span key={i} data-cell={i} />
            ))}
          </div>
        </div>

        <div className="topmenu-about-meta">
          <h2 className="topmenu-about-title">{t('about.title')}</h2>
          <p className="topmenu-about-tagline">{t('about.tagline')}</p>

          <dl className="topmenu-about-info">
            <div>
              <dt>{t('about.version')}</dt>
              <dd>v{version}</dd>
            </div>
            <div>
              <dt>Build</dt>
              <dd>{t('about.builtWith')}</dd>
            </div>
            <div>
              <dt>©</dt>
              <dd>{t('about.poweredBy')}</dd>
            </div>
          </dl>

          <p className="topmenu-about-thanks">{t('about.thanks')} ♥</p>

          <div className="topmenu-about-actions">
            <button type="button" className="topmenu-about-cta" onClick={onClose}>
              {t('about.close')}
            </button>
          </div>
        </div>
      </div>
    </TopMenuModal>
  );
}

// KeybindingsModal — abre el panel existente como overlay.
export function KeybindingsModal({ open, onClose, registry }) {
  const { t } = useI18n();
  return (
    <TopMenuModal
      open={open}
      onClose={onClose}
      title={t('config.shortcuts')}
      icon={<LuKeyboard />}
      width={640}
    >
      <KeybindingsPanel registry={registry} />
    </TopMenuModal>
  );
}
