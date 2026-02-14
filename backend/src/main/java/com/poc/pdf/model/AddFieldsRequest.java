package com.poc.pdf.model;

import com.poc.pdf.model.PdfField.FieldType;

public record AddFieldsRequest(String name, FieldType type, float x, float y, float width, float height, int page, float pageHeight) {
}
