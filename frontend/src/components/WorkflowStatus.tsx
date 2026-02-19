import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Download, Eye, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface WorkflowStatusProps {
  workflowId: number;
  status: string;
  onOpenSignerView: (signer: "SIGNER_A" | "SIGNER_B") => void;
  onDownload: () => void;
}

const STEPS = [
  { key: "SIGNER_A_PENDING", label: "Signataire A" },
  { key: "SIGNER_B_PENDING", label: "Signataire B" },
  { key: "COMPLETED", label: "Terminé" },
];

function getStepState(stepKey: string, status: string): "done" | "active" | "pending" {
  const order = ["CREATED", "SIGNER_A_PENDING", "SIGNER_B_PENDING", "COMPLETED"];
  const currentIdx = order.indexOf(status);
  const stepIdx = order.indexOf(stepKey);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

export function WorkflowStatus({ workflowId, status, onOpenSignerView, onDownload }: WorkflowStatusProps) {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Circuit #{workflowId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stepper */}
        <div className="space-y-2">
          {STEPS.map((step) => {
            const state = getStepState(step.key, status);
            return (
              <div key={step.key} className="flex items-center gap-2">
                {state === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {state === "active" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                {state === "pending" && <Circle className="h-4 w-4 text-muted-foreground/40" />}
                <span className={`text-xs ${state === "active" ? "font-semibold" : state === "done" ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-1">
          {(status === "SIGNER_A_PENDING") && (
            <Button size="sm" className="w-full" variant="default" onClick={() => onOpenSignerView("SIGNER_A")}>
              <Eye className="mr-2 h-3.5 w-3.5" />
              Signer en tant que A
            </Button>
          )}
          {(status === "SIGNER_B_PENDING") && (
            <Button size="sm" className="w-full" variant="default" onClick={() => onOpenSignerView("SIGNER_B")}>
              <Eye className="mr-2 h-3.5 w-3.5" />
              Signer en tant que B
            </Button>
          )}
          {status === "COMPLETED" && (
            <Button size="sm" className="w-full" variant="outline" onClick={onDownload}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Télécharger le PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
