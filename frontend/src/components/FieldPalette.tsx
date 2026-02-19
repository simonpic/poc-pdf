import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Type, Square, Circle } from "lucide-react";
import type { DragEvent } from "react";

const FIELD_TYPES = [
  { type: "TEXT", label: "Champ texte", icon: Type, tip: "Glissez sur le PDF pour ajouter un champ de saisie" },
  { type: "CHECKBOX", label: "Case a cocher", icon: Square, tip: "Glissez sur le PDF pour ajouter une case a cocher" },
  { type: "RADIO", label: "Bouton radio", icon: Circle, tip: "Glissez sur le PDF pour ajouter un bouton radio" },
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
        {FIELD_TYPES.map(({ type, label, icon: Icon, tip }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, type)}
                className="flex cursor-grab items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent active:cursor-grabbing"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {label}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        <div className="mt-3 border-t pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Signataires</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
            Signataire A
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            Signataire B
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
