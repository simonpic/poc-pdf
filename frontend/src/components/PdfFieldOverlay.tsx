import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

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
}

export function PdfFieldOverlay({ field, scale, onDelete }: PdfFieldOverlayProps) {
  const cssX = field.x * scale;
  const cssY = (field.pageHeight - field.y - field.height) * scale;
  const cssWidth = field.width * scale;
  const cssHeight = field.height * scale;

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
      control = (
        <Input
          style={onDelete ? undefined : style}
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
            defaultChecked={field.value === "true"}
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
