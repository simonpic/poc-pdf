import { useState, useRef, useCallback, useEffect, type DragEvent } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PdfFieldOverlay } from "@/components/PdfFieldOverlay";
import { FieldPalette } from "@/components/FieldPalette";
import { WorkflowPanel } from "@/components/WorkflowPanel";
import { WorkflowStatus } from "@/components/WorkflowStatus";
import { SignerView } from "@/components/SignerView";
import { Upload, Download, FileText } from "lucide-react";

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

interface CustomField {
  id: string;
  type: "TEXT" | "CHECKBOX" | "RADIO";
  name: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  pageHeight: number;
  assignedTo: "SIGNER_A" | "SIGNER_B";
}

interface ExtractionResult {
  fileName: string;
  totalFields: number;
  fields: PdfField[];
  pagesBase64: string[];
}

interface WorkflowData {
  id: number;
  fileName: string;
  status: string;
  fields: {
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
  }[];
  pagesBase64: string[];
}

type Status = "idle" | "loading" | "success" | "error";

const DEFAULT_SIZES: Record<CustomField["type"], { width: number; height: number }> = {
  TEXT: { width: 200, height: 20 },
  CHECKBOX: { width: 15, height: 15 },
  RADIO: { width: 15, height: 15 },
};

const TYPE_LABELS: Record<CustomField["type"], string> = {
  TEXT: "Texte",
  CHECKBOX: "Case",
  RADIO: "Radio",
};

function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [scales, setScales] = useState<Record<number, number>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [dragOverPage, setDragOverPage] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countersRef = useRef<Record<string, number>>({ TEXT: 0, CHECKBOX: 0, RADIO: 0 });

  // Workflow state
  const [workflowId, setWorkflowId] = useState<number | null>(null);
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [signerView, setSignerView] = useState<"SIGNER_A" | "SIGNER_B" | null>(null);

  const PDF_DPI = 72;
  const RENDER_DPI = 150;
  const BASE_SCALE = RENDER_DPI / PDF_DPI;

  // Auto-switch to generated tab after generation
  useEffect(() => {
    if (generatedPdfUrl) {
      setActiveTab("generated");
    }
  }, [generatedPdfUrl]);

  const handleImageLoad = useCallback(
    (pageIndex: number, e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const displayScale = (img.clientWidth / img.naturalWidth) * BASE_SCALE;
      setScales((prev) => ({ ...prev, [pageIndex]: displayScale }));
    },
    [BASE_SCALE],
  );

  const generatePdf = async () => {
    if (!uploadedFile || customFields.length === 0) return;
    setGenerating(true);

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append(
      "fields",
      JSON.stringify(
        customFields.map(({ type, name, value, x, y, width, height, page, pageHeight }) => ({
          name, type, value, x, y, width, height, page, pageHeight,
        })),
      ),
    );

    try {
      const response = await fetch("http://localhost:8080/api/pdf/add-fields", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);
      const blob = await response.blob();
      if (generatedPdfUrl) URL.revokeObjectURL(generatedPdfUrl);
      setGeneratedPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
  };

  const createWorkflow = async () => {
    if (!uploadedFile || customFields.length === 0) return;
    setCreatingWorkflow(true);
    setError("");

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append(
      "fields",
      JSON.stringify(
        customFields.map(({ type, name, value, x, y, width, height, page, pageHeight, assignedTo }) => ({
          name, type, value, x, y, width, height, page, pageHeight, assignedTo,
        })),
      ),
    );

    try {
      const response = await fetch("http://localhost:8080/api/workflow", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);
      const data: WorkflowData = await response.json();
      setWorkflowId(data.id);
      setWorkflowData(data);
      setActiveTab("signature");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setCreatingWorkflow(false);
    }
  };

  const refreshWorkflow = async () => {
    if (!workflowId) return;
    try {
      const response = await fetch(`http://localhost:8080/api/workflow/${workflowId}`);
      if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);
      const data: WorkflowData = await response.json();
      setWorkflowData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const downloadWorkflowPdf = async () => {
    if (!workflowId) return;
    try {
      const response = await fetch(`http://localhost:8080/api/workflow/${workflowId}/download`);
      if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "signed.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const uploadFile = async (file: File) => {
    setStatus("loading");
    setError("");
    setResult(null);
    setCustomFields([]);
    setUploadedFile(file);
    if (generatedPdfUrl) URL.revokeObjectURL(generatedPdfUrl);
    setGeneratedPdfUrl(null);
    setWorkflowId(null);
    setWorkflowData(null);
    setSignerView(null);
    setActiveTab("preview");
    countersRef.current = { TEXT: 0, CHECKBOX: 0, RADIO: 0 };

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8080/api/pdf/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const data: ExtractionResult = await response.json();
      setResult(data);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      uploadFile(file);
    } else {
      setError("Veuillez deposer un fichier PDF.");
      setStatus("error");
    }
  };

  const handleFileDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleFileDragLeave = () => setDragOver(false);

  const handlePageDragOver = (e: DragEvent<HTMLDivElement>, pageIndex: number) => {
    if (e.dataTransfer.types.includes("application/field-type")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOverPage(pageIndex);
    }
  };

  const handlePageDragLeave = () => {
    setDragOverPage(null);
  };

  const handlePageDrop = (e: DragEvent<HTMLDivElement>, pageIndex: number) => {
    const fieldType = e.dataTransfer.getData("application/field-type") as CustomField["type"];
    if (!fieldType) return;
    e.preventDefault();
    setDragOverPage(null);

    const img = e.currentTarget.querySelector("img");
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const scale = scales[pageIndex];
    if (scale == null) return;

    const size = DEFAULT_SIZES[fieldType];
    const pageField = result?.fields.find((f) => f.page === pageIndex);
    const pageHeight = pageField?.pageHeight ?? (img.naturalHeight / BASE_SCALE);

    const pdfX = cssX / scale;
    const pdfY = pageHeight - (cssY / scale) - size.height;

    countersRef.current[fieldType] += 1;
    const label = TYPE_LABELS[fieldType];
    const name = `${label} ${countersRef.current[fieldType]}`;

    setCustomFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: fieldType,
        name,
        value: "",
        x: pdfX,
        y: pdfY,
        width: size.width,
        height: size.height,
        page: pageIndex,
        pageHeight,
        assignedTo: "SIGNER_A",
      },
    ]);
  };

  const deleteCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const moveCustomField = useCallback((id: string, pdfDx: number, pdfDy: number) => {
    setCustomFields((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, x: f.x + pdfDx, y: f.y + pdfDy } : f,
      ),
    );
  }, []);

  const updateCustomFieldValue = useCallback((id: string, value: string) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value } : f)),
    );
  }, []);

  const updateCustomFieldName = useCallback((id: string, name: string) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f)),
    );
  }, []);

  const updateCustomFieldAssignment = useCallback((id: string, assignedTo: "SIGNER_A" | "SIGNER_B") => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, assignedTo } : f)),
    );
  }, []);

  const showSidebar = status === "success" && result != null;

  // If signer view is active, show it instead
  if (signerView && workflowData) {
    return (
      <TooltipProvider>
        <div className="min-h-screen p-6">
          <div className="mx-auto max-w-4xl">
            <SignerView
              workflowId={workflowData.id}
              signer={signerView}
              fields={workflowData.fields}
              pagesBase64={workflowData.pagesBase64}
              onBack={() => setSignerView(null)}
              onSigned={async () => {
                setSignerView(null);
                await refreshWorkflow();
              }}
            />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen">
        {/* Sidebar with smooth transition */}
        <div
          className="shrink-0 border-r transition-all duration-300 overflow-hidden"
          style={{ width: showSidebar ? 220 : 0 }}
        >
          <div className="w-[220px] p-4 flex flex-col gap-4">
            <FieldPalette />
            {!workflowId && customFields.length > 0 && (
              <Button
                className="w-full"
                onClick={generatePdf}
                disabled={generating}
              >
                {generating ? "Generation..." : "Generer le PDF"}
              </Button>
            )}
            {!workflowId && (
              <WorkflowPanel
                hasFields={customFields.length > 0}
                creating={creatingWorkflow}
                workflowId={workflowId}
                onCreateWorkflow={createWorkflow}
              />
            )}
            {workflowId && workflowData && (
              <WorkflowStatus
                workflowId={workflowData.id}
                status={workflowData.status}
                onOpenSignerView={(signer) => {
                  setActiveTab("signature");
                  setSignerView(signer);
                }}
                onDownload={downloadWorkflowPdf}
              />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 p-6">
          <h1 className="mb-6 text-center text-3xl font-bold tracking-tight">
            Editeur de formulaire PDF
          </h1>

          <div className="mx-auto max-w-4xl">
            {/* Upload zone: compact after loading, full otherwise */}
            {status === "success" && result ? (
              <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium">{result.fileName}</span>
                <span className="text-xs text-muted-foreground">
                  ({result.totalFields} champ{result.totalFields > 1 ? "s" : ""})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Charger un autre PDF
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  hidden
                />
              </div>
            ) : (
              <Card className="mb-4">
                <CardContent>
                  <div
                    className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                      dragOver
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted-foreground/25 text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary"
                    }`}
                    onDrop={handleFileDrop}
                    onDragOver={handleFileDragOver}
                    onDragLeave={handleFileDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <p className="mb-3 text-lg">
                      Glissez-deposez un PDF ici ou cliquez pour selectionner
                    </p>
                    <Button variant="outline" type="button" onClick={(e) => e.stopPropagation()}>
                      Choisir un fichier
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      hidden
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {status === "loading" && (
              <p className="mt-6 text-center text-primary">Extraction en cours...</p>
            )}

            {status === "error" && (
              <Alert variant="destructive" className="mt-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {status === "success" && result && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="preview">Apercu</TabsTrigger>
                  {generatedPdfUrl && (
                    <TabsTrigger value="generated">PDF genere</TabsTrigger>
                  )}
                  {workflowData && (
                    <TabsTrigger value="signature">Signature</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div className="space-y-4">
                    {result.pagesBase64.map((page, i) => (
                      <div
                        key={i}
                        className={`relative rounded-md transition-shadow ${
                          dragOverPage === i
                            ? "ring-2 ring-blue-400 ring-offset-2"
                            : ""
                        }`}
                        onDragOver={(e) => handlePageDragOver(e, i)}
                        onDragLeave={handlePageDragLeave}
                        onDrop={(e) => handlePageDrop(e, i)}
                      >
                        <img
                          className="w-full rounded-md border"
                          src={`data:image/png;base64,${page}`}
                          alt={`Page ${i + 1}`}
                          onLoad={(e) => handleImageLoad(i, e)}
                        />
                        {scales[i] != null &&
                          result.fields
                            .filter((f) => f.page === i)
                            .map((field, j) => (
                              <PdfFieldOverlay
                                key={`extracted-${j}`}
                                field={field}
                                scale={scales[i]}
                              />
                            ))}
                        {scales[i] != null &&
                          customFields
                            .filter((f) => f.page === i)
                            .map((field) => (
                              <PdfFieldOverlay
                                key={field.id}
                                field={{ ...field, value: field.value }}
                                scale={scales[i]}
                                onDelete={() => deleteCustomField(field.id)}
                                onMove={(dx, dy) => moveCustomField(field.id, dx, dy)}
                                onValueChange={(v) => updateCustomFieldValue(field.id, v)}
                                onNameChange={(name) => updateCustomFieldName(field.id, name)}
                                onAssignmentChange={(assignedTo) => updateCustomFieldAssignment(field.id, assignedTo)}
                              />
                            ))}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {generatedPdfUrl && (
                  <TabsContent value="generated" className="mt-4">
                    <div className="mb-2 flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <a href={generatedPdfUrl} download="formulaire.pdf">
                          <Download className="mr-2 h-4 w-4" />
                          Telecharger le PDF
                        </a>
                      </Button>
                    </div>
                    <iframe
                      src={generatedPdfUrl}
                      className="h-[800px] w-full rounded-md border"
                      title="PDF genere"
                    />
                  </TabsContent>
                )}

                {workflowData && (
                  <TabsContent value="signature" className="mt-4">
                    <div className="space-y-4">
                      {workflowData.pagesBase64.map((page, i) => (
                        <div key={i} className="relative">
                          <img
                            className="w-full rounded-md border"
                            src={`data:image/png;base64,${page}`}
                            alt={`Page ${i + 1}`}
                            onLoad={(e) => handleImageLoad(i, e)}
                          />
                          {scales[i] != null &&
                            workflowData.fields
                              .filter((f) => f.page === i)
                              .map((field) => {
                                const scale = scales[i];
                                const cssX = field.x * scale;
                                const cssY = (field.pageHeight - field.y - field.height) * scale;
                                const cssW = field.width * scale;
                                const cssH = field.height * scale;
                                const isA = field.assignedTo === "SIGNER_A";
                                const labelBg = isA ? "bg-blue-500/80" : "bg-green-500/80";
                                const borderColor = isA ? "border-blue-400" : "border-green-400";
                                const bgColor = isA ? "bg-blue-50/70" : "bg-green-50/70";

                                return (
                                  <div
                                    key={field.id}
                                    style={{
                                      position: "absolute",
                                      left: cssX,
                                      top: cssY,
                                      width: cssW,
                                      height: cssH,
                                    }}
                                  >
                                    <span className={`absolute bottom-full left-0 mb-0.5 rounded px-1 py-px text-[10px] leading-tight text-white whitespace-nowrap ${labelBg}`}>
                                      {field.name}
                                    </span>
                                    <div className={`h-full w-full rounded-sm border ${borderColor} ${bgColor} flex items-center px-1 text-xs text-muted-foreground`}>
                                      {field.value || field.name}
                                    </div>
                                  </div>
                                );
                              })}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
