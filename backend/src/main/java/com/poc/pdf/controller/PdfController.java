package com.poc.pdf.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.poc.pdf.model.AddFieldsRequest;
import com.poc.pdf.model.ExtractionResult;
import com.poc.pdf.service.PdfFieldAdderService;
import com.poc.pdf.service.PdfFieldExtractorService;
import com.poc.pdf.service.PdfFieldExtractorService.ExtractionData;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
    private final PdfFieldAdderService adderService;
    private final ObjectMapper objectMapper;

    public PdfController(PdfFieldExtractorService extractorService, PdfFieldAdderService adderService, ObjectMapper objectMapper) {
        this.extractorService = extractorService;
        this.adderService = adderService;
        this.objectMapper = objectMapper;
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

    @PostMapping("/add-fields")
    public ResponseEntity<byte[]> addFields(@RequestParam("file") MultipartFile file,
                                            @RequestParam("fields") String fieldsJson) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<AddFieldsRequest> fields = objectMapper.readValue(fieldsJson, new TypeReference<>() {});
        byte[] resultPdf = adderService.addFields(file.getBytes(), fields);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "generated.pdf");

        return ResponseEntity.ok().headers(headers).body(resultPdf);
    }
}
