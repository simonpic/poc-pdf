package com.poc.pdf.entity;

import com.poc.pdf.model.PdfField.FieldType;
import jakarta.persistence.*;

@Entity
@Table(name = "workflow_field")
public class WorkflowField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id")
    private SignatureWorkflow workflow;

    private String fieldName;

    @Enumerated(EnumType.STRING)
    private FieldType fieldType;

    @Enumerated(EnumType.STRING)
    private SignerRole assignedTo;

    @Column(name = "field_value")
    private String value;

    private float x;
    private float y;
    private float width;
    private float height;
    private int page;
    private float pageHeight;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public SignatureWorkflow getWorkflow() { return workflow; }
    public void setWorkflow(SignatureWorkflow workflow) { this.workflow = workflow; }

    public String getFieldName() { return fieldName; }
    public void setFieldName(String fieldName) { this.fieldName = fieldName; }

    public FieldType getFieldType() { return fieldType; }
    public void setFieldType(FieldType fieldType) { this.fieldType = fieldType; }

    public SignerRole getAssignedTo() { return assignedTo; }
    public void setAssignedTo(SignerRole assignedTo) { this.assignedTo = assignedTo; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public float getX() { return x; }
    public void setX(float x) { this.x = x; }

    public float getY() { return y; }
    public void setY(float y) { this.y = y; }

    public float getWidth() { return width; }
    public void setWidth(float width) { this.width = width; }

    public float getHeight() { return height; }
    public void setHeight(float height) { this.height = height; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public float getPageHeight() { return pageHeight; }
    public void setPageHeight(float pageHeight) { this.pageHeight = pageHeight; }
}
