import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function RowActionsMenu({ onEdit, onDelete, label = 'Row actions' }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return undefined;

    function updatePosition() {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth || 136;
      const menuHeight = menuRef.current?.offsetHeight || 88;
      const gap = 4;
      const preferredTop = rect.bottom + gap;
      const preferredLeft = rect.right - menuWidth;
      const top =
        preferredTop + menuHeight > window.innerHeight
          ? Math.max(8, rect.top - menuHeight - gap)
          : preferredTop;
      const left = Math.min(
        Math.max(8, preferredLeft),
        window.innerWidth - menuWidth - 8
      );
      setMenuPos({ top, left });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      const inTrigger = rootRef.current?.contains(event.target);
      const inMenu = menuRef.current?.contains(event.target);
      if (!inTrigger && !inMenu) setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="row-actions-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-ghost btn-icon row-actions-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="kebab-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open &&
        createPortal(
          <ul
            id={menuId}
            ref={menuRef}
            className="row-actions-list"
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="row-actions-item"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                Edit
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="row-actions-item row-actions-item-danger"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              >
                Delete
              </button>
            </li>
          </ul>,
          document.body
        )}
    </div>
  );
}
