import { useRef, useCallback, useState } from "react";
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
  assignedTo?: "SIGNER_A" | "SIGNER_B";
}

interface PdfFieldOverlayProps {
  field: PdfField;
  scale: number;
  onDelete?: () => void;
  onMove?: (pdfDx: number, pdfDy: number) => void;
  onValueChange?: (value: string) => void;
  onNameChange?: (name: string) => void;
  onAssignmentChange?: (assignedTo: "SIGNER_A" | "SIGNER_B") => void;
}

const SIGNER_COLORS = {
  SIGNER_A: {
    border: "border-blue-400",
    bg: "bg-blue-50/70",
    label: "bg-blue-500/80",
    checkbox: "border-blue-400 data-[state=checked]:bg-blue-500",
    radio: "accent-blue-500",
    grip: "bg-blue-500",
    badge: "bg-blue-500",
    badgeLabel: "A",
  },
  SIGNER_B: {
    border: "border-green-400",
    bg: "bg-green-50/70",
    label: "bg-green-500/80",
    checkbox: "border-green-400 data-[state=checked]:bg-green-500",
    radio: "accent-green-500",
    grip: "bg-green-500",
    badge: "bg-green-500",
    badgeLabel: "B",
  },
} as const;

export function PdfFieldOverlay({ field, scale, onDelete, onMove, onValueChange, onNameChange, onAssignmentChange }: PdfFieldOverlayProps) {
  const cssX = field.x * scale;
  const cssY = (field.pageHeight - field.y - field.height) * scale;
  const cssWidth = field.width * scale;
  const cssHeight = field.height * scale;

  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(field.name);

  const colors = field.assignedTo ? SIGNER_COLORS[field.assignedTo] : SIGNER_COLORS.SIGNER_A;

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
      onMove(dx / scale, -(dy / scale));
    },
    [onMove, scale],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const commitName = () => {
    setEditingName(false);
    if (onNameChange && nameValue.trim() && nameValue !== field.name) {
      onNameChange(nameValue.trim());
    } else {
      setNameValue(field.name);
    }
  };

  const toggleAssignment = () => {
    if (!onAssignmentChange) return;
    onAssignmentChange(field.assignedTo === "SIGNER_B" ? "SIGNER_A" : "SIGNER_B");
  };

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
          className={`h-full w-full rounded-none p-0 px-1 text-xs ${colors.border} ${colors.bg}`}
          value={field.value ?? ""}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={field.name}
        />
      ) : (
        <Input
          style={style}
          className={`h-full w-full rounded-none p-0 px-1 text-xs ${colors.border} ${colors.bg}`}
          defaultValue={field.value ?? ""}
          placeholder={field.name}
        />
      );
      break;
    case "CHECKBOX":
      control = onValueChange ? (
        <div
          style={onDelete ? undefined : style}
          className="flex h-full w-full items-center justify-center"
        >
          <Checkbox
            checked={field.value === "true"}
            onCheckedChange={(checked) => onValueChange(String(!!checked))}
            className={colors.checkbox}
          />
        </div>
      ) : (
        <div
          style={style}
          className="flex h-full w-full items-center justify-center"
        >
          <Checkbox
            defaultChecked={field.value === "true"}
            className={colors.checkbox}
          />
        </div>
      );
      break;
    case "RADIO":
      control = onValueChange ? (
        <div
          style={onDelete ? undefined : style}
          className="flex h-full w-full items-center justify-center"
        >
          <input
            type="radio"
            name={field.name}
            checked={field.value === "true"}
            onChange={(e) => onValueChange(String(e.target.checked))}
            className={`h-3 w-3 ${colors.radio}`}
          />
        </div>
      ) : (
        <div
          style={style}
          className="flex h-full w-full items-center justify-center"
        >
          <input
            type="radio"
            name={field.name}
            defaultChecked={field.value != null && field.value !== "" && field.value !== "Off"}
            className={`h-3 w-3 ${colors.radio}`}
          />
        </div>
      );
      break;
  }

  if (!onDelete) {
    return control;
  }

  return (
    <div style={style}>
      {/* Editable label above the field */}
      <div className="absolute bottom-full left-0 mb-0.5 flex items-center gap-1">
        {onAssignmentChange && (
          <button
            type="button"
            onClick={toggleAssignment}
            className={`rounded px-1 py-px text-[10px] font-bold leading-tight text-white ${colors.badge} hover:opacity-80`}
            title={`Assigné à ${field.assignedTo === "SIGNER_A" ? "Signataire A" : "Signataire B"} — cliquez pour changer`}
          >
            {colors.badgeLabel}
          </button>
        )}
        {onNameChange && (
          editingName ? (
            <input
              className={`rounded border ${colors.border} bg-white px-1 text-[10px] leading-tight outline-none`}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setNameValue(field.name);
                  setEditingName(false);
                }
              }}
              autoFocus
            />
          ) : (
            <span
              className={`cursor-pointer rounded px-1 py-px text-[10px] leading-tight text-white whitespace-nowrap ${colors.label}`}
              onClick={() => {
                setNameValue(field.name);
                setEditingName(true);
              }}
            >
              {field.name}
            </span>
          )
        )}
      </div>
      {control}
      {/* Drag handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`absolute -top-3 left-1/2 flex h-4 w-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-t text-white shadow opacity-60 hover:opacity-100 active:cursor-grabbing ${colors.grip}`}
      >
        <GripVertical className="h-2.5 w-2.5" />
      </div>
      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow opacity-60 hover:opacity-100"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
