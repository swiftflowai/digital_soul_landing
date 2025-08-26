import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

interface Position { x: number; y: number }

interface Props {
  id: string;
  title?: string;
  initial?: Partial<Position> & { width?: number; height?: number };
  onClose?: () => void;
  className?: string;
  showHeader?: boolean;
  dragAnywhere?: boolean;
  isFloating?: boolean;
}

export function FloatingWindow({ id, title, initial, onClose, className, showHeader = true, dragAnywhere = false, isFloating = true, children }: PropsWithChildren<Props>) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastPosRef = useRef<Position | null>(null);
  const rafRef = useRef<number | null>(null);
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`floating:${id}:pos`);
        if (raw) return JSON.parse(raw) as Position;
      } catch {}
      const defaultX = Math.max(16, (window.innerWidth || 800) - 360 - 16);
      const defaultY = 96;
      return { x: defaultX, y: defaultY };
    }
    return { x: 16, y: 96 };
  });

  // Persist position
  useEffect(() => {
    try { localStorage.setItem(`floating:${id}:pos`, JSON.stringify(position)); } catch {}
  }, [id, position]);

  // Drag logic
  useEffect(() => {
    if (!isFloating) return; // disable drag in inline mode
    const handleEl = (dragAnywhere ? containerRef.current : headerRef.current) as HTMLElement | null;
    if (!handleEl) return;

    let startPos: Position | null = null;
    let startPointer: Position | null = null;

    function clampToViewport(next: Position): Position {
      const maxX = Math.max(0, (window.innerWidth || 0) - 40);
      const maxY = Math.max(0, (window.innerHeight || 0) - 40);
      return { x: Math.min(Math.max(0, next.x), maxX), y: Math.min(Math.max(0, next.y), maxY) };
    }

    const handlePointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest('[data-no-drag]')) return;
      startPos = { ...position };
      startPointer = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!startPos || !startPointer) return;
      const dx = e.clientX - startPointer.x;
      const dy = e.clientY - startPointer.y;
      const next = clampToViewport({ x: startPos!.x + dx, y: startPos!.y + dy });
      lastPosRef.current = next;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const el = containerRef.current;
          if (el && lastPosRef.current) {
            el.style.transform = `translate3d(${lastPosRef.current.x}px, ${lastPosRef.current.y}px, 0)`;
          }
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      startPos = null;
      startPointer = null;
      try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch {}
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (lastPosRef.current) setPosition(lastPosRef.current);
    };

    handleEl.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      handleEl.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [position, dragAnywhere, isFloating]);

  const initialWidth = useMemo(() => initial?.width ?? 360, [initial?.width]);

  return (
    <div
      ref={containerRef}
      className={`${isFloating ? 'fixed z-[1000]' : 'relative'} select-none pointer-events-auto ${className || ''}`}
      style={isFloating
        ? { left: 0, top: 0, width: initialWidth, maxWidth: '92vw', transform: `translate3d(${position.x}px, ${position.y}px, 0)`, willChange: 'transform', touchAction: 'none' as any }
        : { width: '100%', maxWidth: '100%' }
      }
      role="dialog"
      aria-label={title || 'Floating window'}
    >
      <div className="rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden">
        {showHeader && (
          <div ref={headerRef} data-drag-handle className="touch-none cursor-move flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="text-sm font-medium text-gray-700 truncate pr-2">{title || 'Window'}</div>
            <div className="flex items-center gap-1" data-no-drag>
              <button
                onClick={() => onClose?.()}
                className="px-2 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                aria-label="Close"
              >
                Close
              </button>
            </div>
          </div>
        )}
        <div className="">{children}</div>
      </div>
    </div>
  );
}

export default FloatingWindow;


