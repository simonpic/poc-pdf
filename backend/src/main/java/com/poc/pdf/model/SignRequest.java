package com.poc.pdf.model;

import java.util.Map;

public record SignRequest(String signerRole, Map<String, String> fieldValues) {
}
