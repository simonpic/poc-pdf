package com.poc.pdf.model;

public record PdfField(String name, FieldType type, String value, float x, float y) {

    public enum FieldType {
        TEXT, CHECKBOX, RADIO
    }
}
