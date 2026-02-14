import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
}

export function PdfFieldOverlay({ field, scale }: PdfFieldOverlayProps) {
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

  switch (field.type) {
    case "TEXT":
      return (
        <Input
          style={style}
          className="h-auto rounded-none border-blue-400 bg-blue-50/70 p-0 px-1 text-xs"
          defaultValue={field.value ?? ""}
          placeholder={field.name}
        />
      );
    case "CHECKBOX":
      return (
        <div style={style} className="flex items-center justify-center">
          <Checkbox
            defaultChecked={field.value === "true"}
            className="border-blue-400 data-[state=checked]:bg-blue-500"
          />
        </div>
      );
    case "RADIO":
      return (
        <div style={style} className="flex items-center justify-center">
          <input
            type="radio"
            name={field.name}
            defaultChecked={field.value != null && field.value !== "" && field.value !== "Off"}
            className="h-3 w-3 accent-blue-500"
          />
        </div>
      );
  }
}
