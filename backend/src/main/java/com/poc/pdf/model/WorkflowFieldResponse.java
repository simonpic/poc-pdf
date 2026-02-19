package com.poc.pdf.model;

public record WorkflowFieldResponse(
    Long id,
    String name,
    String type,
    String assignedTo,
    String value,
    float x, float y, float width, float height, int page, float pageHeight
) {
}
