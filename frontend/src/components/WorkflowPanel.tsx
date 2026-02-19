import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";

interface WorkflowPanelProps {
  hasFields: boolean;
  creating: boolean;
  workflowId: number | null;
  onCreateWorkflow: () => void;
}

export function WorkflowPanel({ hasFields, creating, workflowId, onCreateWorkflow }: WorkflowPanelProps) {
  if (workflowId) {
    return null; // Workflow already created, WorkflowStatus handles the rest
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Signature</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={onCreateWorkflow}
          disabled={!hasFields || creating}
        >
          <Send className="mr-2 h-4 w-4" />
          {creating ? "Création..." : "Créer le circuit"}
        </Button>
        {!hasFields && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ajoutez des champs au PDF pour créer un circuit de signature.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
