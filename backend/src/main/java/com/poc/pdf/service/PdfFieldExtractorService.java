package com.poc.pdf.service;

import com.poc.pdf.model.PdfField;
import com.poc.pdf.model.PdfField.FieldType;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.apache.pdfbox.pdmodel.interactive.form.*;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class PdfFieldExtractorService {

    public record ExtractionData(List<PdfField> fields, List<byte[]> pageImages) {}

    public ExtractionData extractAndFlatten(byte[] pdfBytes) throws IOException {
        List<PdfField> fields = new ArrayList<>();

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            if (acroForm != null) {
                for (PDField field : acroForm.getFields()) {
                    processField(field, fields, document);
                }

                // Remove field widget annotations from pages
                for (PDPage page : document.getPages()) {
                    List<PDAnnotation> annotations = page.getAnnotations();
                    annotations.removeIf(a -> a instanceof PDAnnotationWidget);
                    page.setAnnotations(annotations);
                }

                // Remove the form itself
                document.getDocumentCatalog().setAcroForm(null);
            }

            PDFRenderer renderer = new PDFRenderer(document);
            List<byte[]> pageImages = new ArrayList<>();
            for (int i = 0; i < document.getNumberOfPages(); i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 150);
                ByteArrayOutputStream imgOut = new ByteArrayOutputStream();
                ImageIO.write(image, "png", imgOut);
                pageImages.add(imgOut.toByteArray());
            }

            return new ExtractionData(fields, pageImages);
        }
    }

    private void processField(PDField field, List<PdfField> fields, PDDocument document) {
        if (field instanceof PDNonTerminalField nonTerminal) {
            for (PDField child : nonTerminal.getChildren()) {
                processField(child, fields, document);
            }
            return;
        }

        float x = 0, y = 0, width = 0, height = 0;
        int page = 0;
        float pageHeight = 0;
        List<PDAnnotationWidget> widgets = field.getWidgets();
        if (widgets != null && !widgets.isEmpty()) {
            PDAnnotationWidget widget = widgets.get(0);
            PDRectangle rect = widget.getRectangle();
            if (rect != null) {
                x = rect.getLowerLeftX();
                y = rect.getLowerLeftY();
                width = rect.getWidth();
                height = rect.getHeight();
            }
            PDPage widgetPage = widget.getPage();
            if (widgetPage != null) {
                page = document.getPages().indexOf(widgetPage);
                pageHeight = widgetPage.getMediaBox().getHeight();
            } else {
                // Fallback: search pages for this widget annotation
                for (int i = 0; i < document.getNumberOfPages(); i++) {
                    PDPage p = document.getPage(i);
                    try {
                        for (PDAnnotation ann : p.getAnnotations()) {
                            if (ann.getCOSObject() == widget.getCOSObject()) {
                                page = i;
                                pageHeight = p.getMediaBox().getHeight();
                                break;
                            }
                        }
                    } catch (IOException ignored) {}
                }
            }
        }

        if (field instanceof PDTextField textField) {
            fields.add(new PdfField(textField.getFullyQualifiedName(), FieldType.TEXT, textField.getValue(), x, y, width, height, page, pageHeight));
        } else if (field instanceof PDCheckBox checkBox) {
            fields.add(new PdfField(checkBox.getFullyQualifiedName(), FieldType.CHECKBOX, String.valueOf(checkBox.isChecked()), x, y, width, height, page, pageHeight));
        } else if (field instanceof PDRadioButton radioButton) {
            fields.add(new PdfField(radioButton.getFullyQualifiedName(), FieldType.RADIO, radioButton.getValue(), x, y, width, height, page, pageHeight));
        }
    }
}
