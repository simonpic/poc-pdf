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

interface ExtractionResult {
  fileName: string;
  totalFields: number;
  fields: PdfField[];
  pagesBase64: string[];
}

type Status = "idle" | "loading" | "success" | "error";

function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [scales, setScales] = useState<Record<number, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
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

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

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

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-center text-3xl font-bold tracking-tight">
        Extraction de champs PDF
      </h1>

      <Card>
        <CardContent>
          <div
            className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5 text-primary"
                : "border-muted-foreground/25 text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
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
                <div key={i} className="relative">
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
                          key={j}
                          field={field}
                          scale={scales[i]}
                        />
                      ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default App;
