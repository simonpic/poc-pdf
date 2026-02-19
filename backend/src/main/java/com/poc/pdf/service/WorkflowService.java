package com.poc.pdf.service;

import com.poc.pdf.entity.*;
import com.poc.pdf.model.*;
import com.poc.pdf.repository.SignatureWorkflowRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class WorkflowService {

    private final SignatureWorkflowRepository repository;
    private final SignaturePreparationService preparationService;
    private final PdfSigningService signingService;
    private final Path storageDir;

    public WorkflowService(
            SignatureWorkflowRepository repository,
            SignaturePreparationService preparationService,
            PdfSigningService signingService,
            @Value("${app.pdf.storage-dir}") String storageDirPath) {
        this.repository = repository;
        this.preparationService = preparationService;
        this.signingService = signingService;
        this.storageDir = Path.of(storageDirPath);
    }

    public WorkflowResponse createWorkflow(byte[] pdfBytes, String fileName, List<AddFieldsRequest> fields) throws IOException {
        // Ensure storage directory exists
        Files.createDirectories(storageDir);

        // Save original PDF to disk
        SignatureWorkflow workflow = new SignatureWorkflow();
        workflow.setOriginalFileName(fileName);
        workflow.setStatus(WorkflowStatus.CREATED);
        workflow = repository.save(workflow);

        Path pdfPath = storageDir.resolve("workflow-" + workflow.getId() + ".pdf");
        Files.write(pdfPath, pdfBytes);
        workflow.setPdfFilePath(pdfPath.toString());

        // Create workflow fields
        for (AddFieldsRequest req : fields) {
            WorkflowField wf = new WorkflowField();
            wf.setWorkflow(workflow);
            wf.setFieldName(req.name());
            wf.setFieldType(req.type());
            wf.setAssignedTo(SignerRole.valueOf(req.assignedTo()));
            wf.setX(req.x());
            wf.setY(req.y());
            wf.setWidth(req.width());
            wf.setHeight(req.height());
            wf.setPage(req.page());
            wf.setPageHeight(req.pageHeight());
            workflow.getFields().add(wf);
        }

        // Prepare the document (add AcroForm fields + signature fields)
        preparationService.prepareDocument(pdfPath.toFile(), workflow.getFields());

        // Transition to SIGNER_A_PENDING
        workflow.setStatus(WorkflowStatus.SIGNER_A_PENDING);
        workflow = repository.save(workflow);

        return toResponse(workflow);
    }

    public WorkflowResponse getWorkflow(Long id) throws IOException {
        SignatureWorkflow workflow = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + id));
        return toResponse(workflow);
    }

    public WorkflowResponse signWorkflow(Long id, SignRequest request) throws Exception {
        SignatureWorkflow workflow = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + id));

        SignerRole role = SignerRole.valueOf(request.signerRole());

        // Verify it's the correct signer's turn
        if (role == SignerRole.SIGNER_A && workflow.getStatus() != WorkflowStatus.SIGNER_A_PENDING) {
            throw new IllegalStateException("Not Signer A's turn. Current status: " + workflow.getStatus());
        }
        if (role == SignerRole.SIGNER_B && workflow.getStatus() != WorkflowStatus.SIGNER_B_PENDING) {
            throw new IllegalStateException("Not Signer B's turn. Current status: " + workflow.getStatus());
        }

        Path pdfPath = Path.of(workflow.getPdfFilePath());

        // Save field values in DB
        if (request.fieldValues() != null) {
            for (WorkflowField wf : workflow.getFields()) {
                String val = request.fieldValues().get(wf.getFieldName());
                if (val != null) {
                    wf.setValue(val);
                }
            }
        }

        // Collect field names belonging to this signer to lock them after signing
        java.util.Set<String> fieldsToLock = workflow.getFields().stream()
                .filter(wf -> wf.getAssignedTo() == role)
                .map(WorkflowField::getFieldName)
                .collect(java.util.stream.Collectors.toSet());

        // Sign the PDF
        signingService.signForSigner(pdfPath, role, request.fieldValues() != null ? request.fieldValues() : java.util.Map.of(), fieldsToLock);

        // Transition state
        if (role == SignerRole.SIGNER_A) {
            workflow.setStatus(WorkflowStatus.SIGNER_B_PENDING);
        } else {
            workflow.setStatus(WorkflowStatus.COMPLETED);
        }

        workflow = repository.save(workflow);
        return toResponse(workflow);
    }

    public byte[] downloadPdf(Long id) throws IOException {
        SignatureWorkflow workflow = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + id));
        return Files.readAllBytes(Path.of(workflow.getPdfFilePath()));
    }

    private WorkflowResponse toResponse(SignatureWorkflow workflow) throws IOException {
        List<WorkflowFieldResponse> fieldResponses = workflow.getFields().stream()
                .map(wf -> new WorkflowFieldResponse(
                        wf.getId(),
                        wf.getFieldName(),
                        wf.getFieldType().name(),
                        wf.getAssignedTo().name(),
                        wf.getValue(),
                        wf.getX(), wf.getY(), wf.getWidth(), wf.getHeight(), wf.getPage(), wf.getPageHeight()
                ))
                .toList();

        // Render PDF pages as PNG
        List<String> pagesBase64 = renderPages(Path.of(workflow.getPdfFilePath()));

        return new WorkflowResponse(
                workflow.getId(),
                workflow.getOriginalFileName(),
                workflow.getStatus().name(),
                fieldResponses,
                pagesBase64,
                workflow.getCreatedAt(),
                workflow.getUpdatedAt()
        );
    }

    private List<String> renderPages(Path pdfPath) throws IOException {
        List<String> pages = new ArrayList<>();
        File file = pdfPath.toFile();
        if (!file.exists()) return pages;

        try (PDDocument document = Loader.loadPDF(file)) {
            PDFRenderer renderer = new PDFRenderer(document);
            for (int i = 0; i < document.getNumberOfPages(); i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 150);
                ByteArrayOutputStream imgOut = new ByteArrayOutputStream();
                ImageIO.write(image, "png", imgOut);
                pages.add(Base64.getEncoder().encodeToString(imgOut.toByteArray()));
            }
        }
        return pages;
    }
}
