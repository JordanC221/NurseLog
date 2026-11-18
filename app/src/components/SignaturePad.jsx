import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Eraser, Undo2, Check } from "lucide-react";

const SignaturePad = forwardRef(function SignaturePad(
  { onConfirm, disabled },
  ref
) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef([]);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useImperativeHandle(ref, () => ({
    clear: () => clearCanvas(),
  }));

  useEffect(() => {
    setupCanvas();
  }, []);

  function getCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    return { canvas, ctx };
  }

  function setupCanvas() {
    const { canvas, ctx } = getCtx();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }

  function redraw() {
    const { canvas, ctx } = getCtx();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    const all = [...strokesRef.current, currentStrokeRef.current];
    all.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  }

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  function start(e) {
    if (disabled) return;
    e.preventDefault();
    drawingRef.current = true;
    currentStrokeRef.current = [getPos(e)];
  }

  function move(e) {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    currentStrokeRef.current.push(getPos(e));
    redraw();
  }

  function end(e) {
    if (!drawingRef.current) return;
    e && e.preventDefault();
    drawingRef.current = false;
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = [];
      setHasInk(true);
    }
  }

  function clearCanvas() {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setHasInk(false);
    const { ctx, canvas } = getCtx();
    if (ctx && canvas) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
  }

  function undo() {
    strokesRef.current.pop();
    setHasInk(strokesRef.current.length > 0);
    redraw();
  }

  function confirm() {
    if (!hasInk) return;
    const { canvas } = getCtx();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onConfirm && onConfirm(dataUrl);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          className="w-full h-48 rounded-2xl bg-white border-2 border-slate-300 touch-none cursor-crosshair"
        />
        {!hasInk && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-slate-400 text-sm">Sign here with your finger</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={!hasInk || disabled}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium disabled:opacity-40 active:scale-95 transition"
        >
          <Undo2 size={18} /> Undo
        </button>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium disabled:opacity-40 active:scale-95 transition"
        >
          <Eraser size={18} /> Clear
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={!hasInk || disabled}
          className="flex-[1.4] flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-40 active:scale-95 transition"
        >
          <Check size={18} /> Confirm
        </button>
      </div>
    </div>
  );
});

export default SignaturePad;