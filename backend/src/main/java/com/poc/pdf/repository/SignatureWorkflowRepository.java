package com.poc.pdf.repository;

import com.poc.pdf.entity.SignatureWorkflow;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SignatureWorkflowRepository extends JpaRepository<SignatureWorkflow, Long> {
}
