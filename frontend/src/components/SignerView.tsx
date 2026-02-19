import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, PenTool } from "lucide-react";

interface WorkflowField {
  id: number;
  name: string;
  type: string;
  assignedTo: string;
  value: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  pageHeight: number;
}

interface SignerViewProps {
  workflowId: number;
  signer: "SIGNER_A" | "SIGNER_B";
  fields: WorkflowField[];
  pagesBase64: string[];
  onBack: () => void;
  onSigned: () => void;
}

export function SignerView({ workflowId, signer, fields, pagesBase64, onBack, onSigned }: SignerViewProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.filter((f) => f.assignedTo === signer).forEach((f) => {
      initial[f.name] = f.value ?? "";
    });
    return initial;
  });
  const [signing, setSigning] = useState(false);
  const [scales, setScales] = useState<Record<number, number>>({});

  const PDF_DPI = 72;
  const RENDER_DPI = 150;
  const BASE_SCALE = RENDER_DPI / PDF_DPI;

  const handleImageLoad = useCallback(
    (pageIndex: number, e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const displayScale = (img.clientWidth / img.naturalWidth) * BASE_SCALE;
      setScales((prev) => ({ ...prev, [pageIndex]: displayScale }));
    },
    [BASE_SCALE],
  );

  const handleSign = async () => {
    setSigning(true);
    try {
      const response = await fetch(`http://localhost:8080/api/workflow/${workflowId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerRole: signer,
          fieldValues,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Erreur ${response.status}`);
      }
      onSigned();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur de signature");
    } finally {
      setSigning(false);
    }
  };

  const signerLabel = signer === "SIGNER_A" ? "Signataire A" : "Signataire B";
  const signerColor = signer === "SIGNER_A" ? "blue" : "green";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour
        </Button>
        <h2 className="text-lg font-semibold">
          Vue {signerLabel}
        </h2>
        <Button className="ml-auto" onClick={handleSign} disabled={signing}>
          <PenTool className="mr-2 h-4 w-4" />
          {signing ? "Signature..." : "Signer"}
        </Button>
      </div>

      <div className="space-y-4">
        {pagesBase64.map((page, i) => (
          <div key={i} className="relative">
            <img
              className="w-full rounded-md border"
              src={`data:image/png;base64,${page}`}
              alt={`Page ${i + 1}`}
              onLoad={(e) => handleImageLoad(i, e)}
            />
            {scales[i] != null &&
              fields
                .filter((f) => f.page === i)
                .map((field) => {
                  const scale = scales[i];
                  const isMine = field.assignedTo === signer;
                  const cssX = field.x * scale;
                  const cssY = (field.pageHeight - field.y - field.height) * scale;
                  const cssWidth = field.width * scale;
                  const cssHeight = field.height * scale;

                  const borderColor = field.assignedTo === "SIGNER_A" ? "border-blue-400" : "border-green-400";
                  const bgColor = isMine
                    ? (field.assignedTo === "SIGNER_A" ? "bg-blue-50/80" : "bg-green-50/80")
                    : "bg-gray-100/70";
                  const labelBg = field.assignedTo === "SIGNER_A" ? "bg-blue-500/80" : "bg-green-500/80";

                  return (
                    <div
                      key={field.id}
                      style={{
                        position: "absolute",
                        left: cssX,
                        top: cssY,
                        width: cssWidth,
                        height: cssHeight,
                      }}
                    >
                      {/* Field label */}
                      <span className={`absolute bottom-full left-0 mb-0.5 rounded px-1 py-px text-[10px] leading-tight text-white whitespace-nowrap ${labelBg}`}>
                        {field.name}
                      </span>

                      {field.type === "TEXT" && (
                        <Input
                          className={`h-full w-full rounded-none p-0 px-1 text-xs ${borderColor} ${bgColor}`}
                          value={isMine ? (fieldValues[field.name] ?? "") : (field.value ?? "")}
                          onChange={isMine ? (e) => setFieldValues((prev) => ({ ...prev, [field.name]: e.target.value })) : undefined}
                          readOnly={!isMine}
                          placeholder={field.name}
                        />
                      )}
                      {field.type === "CHECKBOX" && (
                        <div className={`flex h-full w-full items-center justify-center ${bgColor}`}>
                          <Checkbox
                            checked={isMine ? fieldValues[field.name] === "true" : field.value === "true"}
                            onCheckedChange={isMine ? (checked) => setFieldValues((prev) => ({ ...prev, [field.name]: String(!!checked) })) : undefined}
                            disabled={!isMine}
                            className={field.assignedTo === "SIGNER_A" ? "border-blue-400 data-[state=checked]:bg-blue-500" : "border-green-400 data-[state=checked]:bg-green-500"}
                          />
                        </div>
                      )}
                      {field.type === "RADIO" && (
                        <div className={`flex h-full w-full items-center justify-center ${bgColor}`}>
                          <input
                            type="radio"
                            name={field.name}
                            checked={isMine ? fieldValues[field.name] === "true" : field.value === "true"}
                            onChange={isMine ? (e) => setFieldValues((prev) => ({ ...prev, [field.name]: String(e.target.checked) })) : undefined}
                            disabled={!isMine}
                            className={`h-3 w-3 ${signerColor === "blue" ? "accent-blue-500" : "accent-green-500"}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        ))}
      </div>
    </div>
  );
}
