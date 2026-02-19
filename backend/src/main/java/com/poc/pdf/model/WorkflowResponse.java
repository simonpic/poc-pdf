package com.poc.pdf.model;

import java.time.LocalDateTime;
import java.util.List;

public record WorkflowResponse(
    Long id,
    String fileName,
    String status,
    List<WorkflowFieldResponse> fields,
    List<String> pagesBase64,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
