import { useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, X } from "lucide-react";

interface PdfField {
  name: string;
  type: "TEXT" | "CHECKBOX" | "RADIO";
  value: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  pageHeight: number;
}

interface PdfFieldOverlayProps {
  field: PdfField;
  scale: number;
  onDelete?: () => void;
  onMove?: (pdfDx: number, pdfDy: number) => void;
  onValueChange?: (value: string) => void;
}

export function PdfFieldOverlay({ field, scale, onDelete, onMove, onValueChange }: PdfFieldOverlayProps) {
  const cssX = field.x * scale;
  const cssY = (field.pageHeight - field.y - field.height) * scale;
  const cssWidth = field.width * scale;
  const cssHeight = field.height * scale;

  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!onMove) return;
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onMove],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !onMove) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (dx === 0 && dy === 0) return;
      startPos.current = { x: e.clientX, y: e.clientY };
      // CSS y-axis is inverted relative to PDF y-axis
      onMove(dx / scale, -(dy / scale));
    },
    [onMove, scale],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const style: React.CSSProperties = {
    position: "absolute",
    left: cssX,
    top: cssY,
    width: cssWidth,
    height: cssHeight,
  };

  let control: React.ReactNode;

  switch (field.type) {
    case "TEXT":
      control = onValueChange ? (
        <Input
          className="h-full w-full rounded-none border-blue-400 bg-blue-50/70 p-0 px-1 text-xs"
          value={field.value ?? ""}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={field.name}
        />
      ) : (
        <Input
          style={style}
          className="h-full w-full rounded-none border-blue-400 bg-blue-50/70 p-0 px-1 text-xs"
          defaultValue={field.value ?? ""}
          placeholder={field.name}
        />
      );
      break;
    case "CHECKBOX":
      control = (
        <div
          style={onDelete ? undefined : style}
          className="flex h-full w-full items-center justify-center"
        >
          <Checkbox
            checked={onValueChange ? field.value === "true" : undefined}
            defaultChecked={!onValueChange ? field.value === "true" : undefined}
            onCheckedChange={onValueChange ? (checked) => onValueChange(checked ? "true" : "false") : undefined}
            className="border-blue-400 data-[state=checked]:bg-blue-500"
          />
        </div>
      );
      break;
    case "RADIO":
      control = (
        <div
          style={onDelete ? undefined : style}
          className="flex h-full w-full items-center justify-center"
        >
          <input
            type="radio"
            name={field.name}
            defaultChecked={field.value != null && field.value !== "" && field.value !== "Off"}
            className="h-3 w-3 accent-blue-500"
          />
        </div>
      );
      break;
  }

  if (!onDelete) {
    return control;
  }

  return (
    <div style={style} className="group">
      {control}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute -top-3 left-1/2 hidden h-5 w-6 -translate-x-1/2 cursor-grab items-center justify-center rounded-t bg-blue-500 text-white shadow active:cursor-grabbing group-hover:flex"
      >
        <GripVertical className="h-3 w-3" />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="absolute -top-2 -right-2 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow group-hover:flex"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
