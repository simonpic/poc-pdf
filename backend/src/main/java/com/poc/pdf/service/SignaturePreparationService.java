package com.poc.pdf.service;

import com.poc.pdf.entity.SignerRole;
import com.poc.pdf.entity.WorkflowField;
import org.apache.pdfbox.cos.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.apache.pdfbox.pdmodel.interactive.form.*;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.List;

@Service
public class SignaturePreparationService {

    /**
     * Prepares a PDF document on disk with AcroForm fields and signature fields.
     * The document is saved to the same file path for later incremental signing.
     */
    public void prepareDocument(File pdfFile, List<WorkflowField> fields) throws IOException {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfFile)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            if (acroForm == null) {
                acroForm = new PDAcroForm(document);
                document.getDocumentCatalog().setAcroForm(acroForm);
            }

            // Set up default resources and appearance
            PDResources defaultResources = acroForm.getDefaultResources();
            if (defaultResources == null) {
                defaultResources = new PDResources();
                acroForm.setDefaultResources(defaultResources);
            }
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            defaultResources.put(COSName.getPDFName("Helv"), font);
            acroForm.setDefaultAppearance("/Helv 10 Tf 0 g");

            // Add form fields
            for (WorkflowField wf : fields) {
                PDField field = createFormField(acroForm, wf);
                PDAnnotationWidget widget = field.getWidgets().get(0);
                PDRectangle rect = new PDRectangle(wf.getX(), wf.getY(), wf.getWidth(), wf.getHeight());
                widget.setRectangle(rect);

                PDPage page = document.getPage(wf.getPage());
                widget.setPage(page);
                page.getAnnotations().add(widget);
                acroForm.getFields().add(field);
            }

            // Collect field names per signer for Lock dictionaries
            List<String> signerBFieldNames = fields.stream()
                    .filter(f -> f.getAssignedTo() == SignerRole.SIGNER_B)
                    .map(WorkflowField::getFieldName)
                    .toList();

            // Add signature field for Signer A
            PDSignatureField sigFieldA = new PDSignatureField(acroForm);
            sigFieldA.setPartialName("SignatureA");
            PDAnnotationWidget widgetA = sigFieldA.getWidgets().get(0);
            // Place signature field on last page, bottom-left
            PDPage lastPage = document.getPage(document.getNumberOfPages() - 1);
            widgetA.setRectangle(new PDRectangle(20, 20, 200, 50));
            widgetA.setPage(lastPage);
            lastPage.getAnnotations().add(widgetA);
            acroForm.getFields().add(sigFieldA);

            // Lock dictionary for SignatureA: Action=/Exclude, Fields=[B's fields + "SignatureB"]
            // This means everything EXCEPT B's fields gets locked when A signs
            COSDictionary lockDictA = new COSDictionary();
            lockDictA.setItem(COSName.TYPE, COSName.getPDFName("SigFieldLock"));
            lockDictA.setItem(COSName.getPDFName("Action"), COSName.getPDFName("Exclude"));
            COSArray excludeFieldsA = new COSArray();
            for (String name : signerBFieldNames) {
                excludeFieldsA.add(new COSString(name));
            }
            excludeFieldsA.add(new COSString("SignatureB"));
            lockDictA.setItem(COSName.getPDFName("Fields"), excludeFieldsA);
            sigFieldA.getCOSObject().setItem(COSName.getPDFName("Lock"), lockDictA);

            // Add signature field for Signer B
            PDSignatureField sigFieldB = new PDSignatureField(acroForm);
            sigFieldB.setPartialName("SignatureB");
            PDAnnotationWidget widgetB = sigFieldB.getWidgets().get(0);
            widgetB.setRectangle(new PDRectangle(230, 20, 200, 50));
            widgetB.setPage(lastPage);
            lastPage.getAnnotations().add(widgetB);
            acroForm.getFields().add(sigFieldB);

            // Lock dictionary for SignatureB: Action=/All — locks everything
            COSDictionary lockDictB = new COSDictionary();
            lockDictB.setItem(COSName.TYPE, COSName.getPDFName("SigFieldLock"));
            lockDictB.setItem(COSName.getPDFName("Action"), COSName.getPDFName("All"));
            sigFieldB.getCOSObject().setItem(COSName.getPDFName("Lock"), lockDictB);

            // Save the prepared document
            document.save(pdfFile);
        }
    }

    private PDField createFormField(PDAcroForm acroForm, WorkflowField wf) throws IOException {
        return switch (wf.getFieldType()) {
            case TEXT -> {
                PDTextField tf = new PDTextField(acroForm);
                tf.setPartialName(wf.getFieldName());
                yield tf;
            }
            case CHECKBOX -> {
                PDCheckBox cb = new PDCheckBox(acroForm);
                cb.setPartialName(wf.getFieldName());
                yield cb;
            }
            case RADIO -> {
                PDRadioButton rb = new PDRadioButton(acroForm);
                rb.setPartialName(wf.getFieldName());
                yield rb;
            }
        };
    }
}
