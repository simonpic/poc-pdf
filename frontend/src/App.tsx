import { useState, useRef, useCallback, type DragEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PdfFieldOverlay } from "@/components/PdfFieldOverlay";
import { FieldPalette } from "@/components/FieldPalette";

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
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  pageHeight: number;
}

interface ExtractionResult {
  fileName: string;
  totalFields: number;
  fields: PdfField[];
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countersRef = useRef<Record<string, number>>({ TEXT: 0, CHECKBOX: 0, RADIO: 0 });

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

  const uploadFile = async (file: File) => {
    setStatus("loading");
    setError("");
    setResult(null);
    setCustomFields([]);
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

  const handlePageDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes("application/field-type")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handlePageDrop = (e: DragEvent<HTMLDivElement>, pageIndex: number) => {
    const fieldType = e.dataTransfer.getData("application/field-type") as CustomField["type"];
    if (!fieldType) return;
    e.preventDefault();

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
        x: pdfX,
        y: pdfY,
        width: size.width,
        height: size.height,
        page: pageIndex,
        pageHeight,
      },
    ]);
  };

  const deleteCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case "TEXT":
        return <Badge variant="default">Texte</Badge>;
      case "CHECKBOX":
        return <Badge variant="secondary">Case a cocher</Badge>;
      case "RADIO":
        return <Badge variant="outline">Bouton radio</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  const showSidebar = status === "success" && result != null;

  return (
    <div className="flex min-h-screen">
      {showSidebar && (
        <div className="w-[220px] shrink-0 border-r p-4">
          <FieldPalette />
        </div>
      )}

      <div className="min-w-0 flex-1 p-6">
        <h1 className="mb-6 text-center text-3xl font-bold tracking-tight">
          Extraction de champs PDF
        </h1>

        <div className="mx-auto max-w-4xl">
          <Card>
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

          {status === "loading" && (
            <p className="mt-6 text-center text-primary">Extraction en cours...</p>
          )}

          {status === "error" && (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "success" && result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{result.fileName}</CardTitle>
                <CardDescription>
                  {result.totalFields} champ{result.totalFields > 1 ? "s" : ""} trouve
                  {result.totalFields > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.fields.length === 0 ? (
                  <p className="text-muted-foreground">
                    Aucun champ de formulaire detecte dans ce PDF.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Valeur</TableHead>
                          <TableHead>Position</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.fields.map((field, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{field.name}</TableCell>
                            <TableCell>{typeBadge(field.type)}</TableCell>
                            <TableCell>
                              {field.value ?? (
                                <span className="text-muted-foreground italic">vide</span>
                              )}
                            </TableCell>
                            <TableCell>
                              ({Math.round(field.x)}, {Math.round(field.y)})
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <h3 className="mt-6 mb-2 text-lg font-semibold">PDF aplati</h3>
                <div className="space-y-4">
                  {result.pagesBase64.map((page, i) => (
                    <div
                      key={i}
                      className="relative"
                      onDragOver={handlePageDragOver}
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
                              field={{ ...field, value: null }}
                              scale={scales[i]}
                              onDelete={() => deleteCustomField(field.id)}
                            />
                          ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
