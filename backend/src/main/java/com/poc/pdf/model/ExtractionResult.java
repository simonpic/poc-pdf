package com.poc.pdf.model;

import java.util.List;

public record ExtractionResult(String fileName, int totalFields, List<PdfField> fields, List<String> pagesBase64) {
}
