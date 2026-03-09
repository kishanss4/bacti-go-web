import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PdfCanvasPreviewProps {
  blob: Blob;
  className?: string;
}

export default function PdfCanvasPreview({ blob, className }: PdfCanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const arrayBuffer = await blob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        await renderPage(pdf, 1);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to render PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPdf();
    return () => { cancelled = true; };
  }, [blob]);

  const renderPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    const page = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const containerWidth = canvas.parentElement?.clientWidth || 800;
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(containerWidth / unscaledViewport.width, 2);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = "100%";
    canvas.style.height = "auto";

    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    setCurrentPage(pageNum);
  };

  const goToPage = async (pageNum: number) => {
    if (!pdfRef.current || pageNum < 1 || pageNum > totalPages) return;
    setLoading(true);
    await renderPage(pdfRef.current, pageNum);
    setLoading(false);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-border p-8 flex flex-col items-center justify-center gap-2 bg-muted/30 min-h-[200px]">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rounded-lg border border-border overflow-hidden bg-white relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
        <canvas ref={canvasRef} className="block" />
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
