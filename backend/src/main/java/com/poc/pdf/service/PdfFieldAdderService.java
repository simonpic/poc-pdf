package com.poc.pdf.service;

import com.poc.pdf.model.AddFieldsRequest;
import com.poc.pdf.model.PdfField.FieldType;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAppearanceDictionary;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAppearanceStream;
import org.apache.pdfbox.pdmodel.interactive.form.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class PdfFieldAdderService {

    public byte[] addFields(byte[] pdfBytes, List<AddFieldsRequest> fields) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            if (acroForm == null) {
                acroForm = new PDAcroForm(document);
                document.getDocumentCatalog().setAcroForm(acroForm);
            }

            PDResources defaultResources = acroForm.getDefaultResources();
            if (defaultResources == null) {
                defaultResources = new PDResources();
                acroForm.setDefaultResources(defaultResources);
            }
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            defaultResources.put(COSName.getPDFName("Helv"), font);
            acroForm.setDefaultAppearance("/Helv 10 Tf 0 g");

            for (AddFieldsRequest req : fields) {
                PDField field = createField(acroForm, req);

                PDAnnotationWidget widget = field.getWidgets().get(0);
                PDRectangle rect = new PDRectangle(req.x(), req.y(), req.width(), req.height());
                widget.setRectangle(rect);

                PDPage page = document.getPage(req.page());
                widget.setPage(page);
                page.getAnnotations().add(widget);

                acroForm.getFields().add(field);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }

    private PDField createField(PDAcroForm acroForm, AddFieldsRequest req) throws IOException {
        return switch (req.type()) {
            case TEXT -> {
                PDTextField tf = new PDTextField(acroForm);
                tf.setPartialName(req.name());
                yield tf;
            }
            case CHECKBOX -> {
                PDCheckBox cb = new PDCheckBox(acroForm);
                cb.setPartialName(req.name());
                yield cb;
            }
            case RADIO -> {
                PDRadioButton rb = new PDRadioButton(acroForm);
                rb.setPartialName(req.name());
                yield rb;
            }
        };
    }
}
