import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Trash2, Sparkles, CheckCircle } from 'lucide-react';

export const HandwritingCanvas = ({
  targetItem,
  mode = 'guided', // 'guided', 'free'
  onEvaluate,
  evaluating = false
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]); // array of strokes, each stroke is array of {x, y}
  const [currentStroke, setCurrentStroke] = useState([]);

  // Setup Canvas resolution & crisp DPR scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    redrawCanvas();
  }, [mode, targetItem]);

  // Redraw canvas whenever strokes update
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw user strokes
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7c2d12'; // Rich warm amber/amber-950

    strokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });

    if (currentStroke.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      t: Date.now()
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const pt = getCanvasCoords(e);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getCanvasCoords(e);
    setCurrentStroke((prev) => {
      const next = [...prev, pt];
      redrawCanvasWithCurrent(next);
      return next;
    });
  };

  const redrawCanvasWithCurrent = (activeStroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7c2d12';

    [...strokes, activeStroke].forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      const finalStrokes = [...strokes, currentStroke];
      setStrokes(finalStrokes);
      setCurrentStroke([]);
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
  };

  const handleUndo = () => {
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    setCurrentStroke([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#7c2d12';

      newStrokes.forEach((stroke) => {
        if (stroke.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      });
    }
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onEvaluate(blob, strokes);
      }
    }, 'image/png');
  };

  const hasStrokes = strokes.length > 0 || currentStroke.length > 0;

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      {/* Writing Box Canvas Container */}
      <div className="relative w-full aspect-[4/3] max-w-lg bg-amber-50/40 border-4 border-dashed border-amber-300 rounded-3xl overflow-hidden shadow-inner select-none touch-none">
        


        {/* Guided Mode: Starting Point Pulsating Dot & Arrows */}
        {mode === 'guided' && targetItem?.starting_point && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute w-5 h-5 -ml-2.5 -mt-2.5 bg-amber-500 rounded-full animate-ping opacity-75"
              style={{
                left: `${targetItem.starting_point.x}%`,
                top: `${targetItem.starting_point.y}%`
              }}
            />
            <div
              className="absolute w-4 h-4 -ml-2 -mt-2 bg-amber-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[8px] text-white font-black"
              style={{
                left: `${targetItem.starting_point.x}%`,
                top: `${targetItem.starting_point.y}%`
              }}
            >
              1
            </div>
          </div>
        )}

        {/* Canvas Element */}
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Mode Watermark Badge */}
        <div className="absolute top-3 right-3 px-3 py-1 bg-amber-100/90 border border-amber-300 rounded-full text-[11px] font-extrabold text-amber-900 shadow-sm pointer-events-none uppercase tracking-wider">
          {mode === 'guided' ? '💡 Guided Mode' : '📝 Free Writing'}
        </div>
      </div>

      {/* Control Action Bar */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-lg gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasStrokes}
            className="btn-secondary py-2.5 px-3.5 text-xs font-bold disabled:opacity-40"
            title="Clear Canvas"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="btn-secondary py-2.5 px-3.5 text-xs font-bold disabled:opacity-40"
            title="Undo Last Stroke"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Undo</span>
          </button>


        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasStrokes || evaluating}
          className="btn-primary py-3 px-5 text-sm font-extrabold shadow-amber-500/20 disabled:opacity-50"
        >
          {evaluating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Check Writing ✨</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
