package com.poc.pdf.model;

import java.util.List;

public record CreateWorkflowRequest(List<AddFieldsRequest> fields) {
}
