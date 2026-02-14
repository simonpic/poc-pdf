package com.poc.pdf.controller;

import com.poc.pdf.model.ExtractionResult;
import com.poc.pdf.service.PdfFieldExtractorService;
import com.poc.pdf.service.PdfFieldExtractorService.ExtractionData;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/pdf")
@CrossOrigin(origins = "http://localhost:5173")
public class PdfController {

    private final PdfFieldExtractorService extractorService;

    public PdfController(PdfFieldExtractorService extractorService) {
        this.extractorService = extractorService;
    }

    @PostMapping("/extract")
    public ResponseEntity<ExtractionResult> extractFields(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        ExtractionData data = extractorService.extractAndFlatten(file.getBytes());
        List<String> pagesBase64 = data.pageImages().stream()
                .map(bytes -> Base64.getEncoder().encodeToString(bytes))
                .toList();
        ExtractionResult result = new ExtractionResult(
                file.getOriginalFilename(),
                data.fields().size(),
                data.fields(),
                pagesBase64
        );

        return ResponseEntity.ok(result);
    }
}
