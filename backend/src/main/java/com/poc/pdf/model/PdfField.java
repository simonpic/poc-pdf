package com.poc.pdf.model;

public record PdfField(String name, FieldType type, String value, float x, float y, float width, float height, int page, float pageHeight) {

    public enum FieldType {
        TEXT, CHECKBOX, RADIO
    }
}
