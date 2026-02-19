package com.poc.pdf.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "signature_workflow")
public class SignatureWorkflow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String originalFileName;

    private String pdfFilePath;

    @Enumerated(EnumType.STRING)
    private WorkflowStatus status;

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkflowField> fields = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }

    public String getPdfFilePath() { return pdfFilePath; }
    public void setPdfFilePath(String pdfFilePath) { this.pdfFilePath = pdfFilePath; }

    public WorkflowStatus getStatus() { return status; }
    public void setStatus(WorkflowStatus status) { this.status = status; }

    public List<WorkflowField> getFields() { return fields; }
    public void setFields(List<WorkflowField> fields) { this.fields = fields; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
