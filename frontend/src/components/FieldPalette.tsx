import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Type, Square, Circle } from "lucide-react";
import type { DragEvent } from "react";

const FIELD_TYPES = [
  { type: "TEXT", label: "Champ texte", icon: Type },
  { type: "CHECKBOX", label: "Case a cocher", icon: Square },
  { type: "RADIO", label: "Bouton radio", icon: Circle },
] as const;

export function FieldPalette() {
  const handleDragStart = (e: DragEvent, type: string) => {
    e.dataTransfer.setData("application/field-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Champs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            className="flex cursor-grab items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent active:cursor-grabbing"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            {label}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
