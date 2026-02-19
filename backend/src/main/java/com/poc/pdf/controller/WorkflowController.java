package com.poc.pdf.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.poc.pdf.model.AddFieldsRequest;
import com.poc.pdf.model.SignRequest;
import com.poc.pdf.model.WorkflowResponse;
import com.poc.pdf.service.WorkflowService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/workflow")
@CrossOrigin(origins = "http://localhost:5173")
public class WorkflowController {

    private final WorkflowService workflowService;
    private final ObjectMapper objectMapper;

    public WorkflowController(WorkflowService workflowService, ObjectMapper objectMapper) {
        this.workflowService = workflowService;
        this.objectMapper = objectMapper;
    }

    @PostMapping
    public ResponseEntity<WorkflowResponse> createWorkflow(
            @RequestParam("file") MultipartFile file,
            @RequestParam("fields") String fieldsJson) throws Exception {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        List<AddFieldsRequest> fields = objectMapper.readValue(fieldsJson, new TypeReference<>() {});
        WorkflowResponse response = workflowService.createWorkflow(
                file.getBytes(), file.getOriginalFilename(), fields);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkflowResponse> getWorkflow(@PathVariable Long id) throws Exception {
        WorkflowResponse response = workflowService.getWorkflow(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/sign")
    public ResponseEntity<WorkflowResponse> signWorkflow(
            @PathVariable Long id,
            @RequestBody SignRequest request) throws Exception {
        WorkflowResponse response = workflowService.signWorkflow(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) throws Exception {
        byte[] pdf = workflowService.downloadPdf(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "signed.pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
