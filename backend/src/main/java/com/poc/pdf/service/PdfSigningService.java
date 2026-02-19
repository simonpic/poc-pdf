package com.poc.pdf.service;

import com.poc.pdf.entity.SignerRole;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.SignatureOptions;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDCheckBox;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.apache.pdfbox.pdmodel.interactive.form.PDSignatureField;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.bouncycastle.cert.jcajce.JcaCertStore;
import org.bouncycastle.cms.CMSProcessableByteArray;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.CMSSignedDataGenerator;
import org.bouncycastle.cms.CMSTypedData;
import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.operator.jcajce.JcaDigestCalculatorProviderBuilder;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.*;

@Service
public class PdfSigningService {

    private final CertificateService certificateService;

    public PdfSigningService(CertificateService certificateService) {
        this.certificateService = certificateService;
    }

    public void signForSigner(Path pdfPath, SignerRole role, Map<String, String> fieldValues, Set<String> fieldsToLock) throws Exception {
        KeyStore.PrivateKeyEntry entry = certificateService.getSignerEntry(role);
        PrivateKey privateKey = entry.getPrivateKey();
        Certificate[] chain = entry.getCertificateChain();
        X509Certificate cert = (X509Certificate) chain[0];

        File pdfFile = pdfPath.toFile();

        try (PDDocument document = Loader.loadPDF(pdfFile)) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            if (acroForm == null) {
                throw new IllegalStateException("PDF has no AcroForm");
            }

            // Fill in field values for this signer
            for (Map.Entry<String, String> fv : fieldValues.entrySet()) {
                PDField field = acroForm.getField(fv.getKey());
                if (field instanceof PDTextField tf) {
                    tf.setValue(fv.getValue());
                } else if (field instanceof PDCheckBox cb) {
                    if ("true".equals(fv.getValue())) {
                        cb.check();
                    } else {
                        cb.unCheck();
                    }
                }
            }

            // Set signer's fields as read-only so they can't be modified after signing
            for (String fieldName : fieldsToLock) {
                PDField field = acroForm.getField(fieldName);
                if (field != null) {
                    field.setReadOnly(true);
                }
            }

            // Find the signature field for this signer
            String sigFieldName = role == SignerRole.SIGNER_A ? "SignatureA" : "SignatureB";
            PDSignatureField sigField = (PDSignatureField) acroForm.getField(sigFieldName);
            if (sigField == null) {
                throw new IllegalStateException("Signature field " + sigFieldName + " not found");
            }

            // Create PDF signature
            PDSignature signature = new PDSignature();
            signature.setFilter(PDSignature.FILTER_ADOBE_PPKLITE);
            signature.setSubFilter(PDSignature.SUBFILTER_ADBE_PKCS7_DETACHED);
            signature.setName(role == SignerRole.SIGNER_A ? "Signataire A" : "Signataire B");
            signature.setReason("Signature du document");
            signature.setSignDate(Calendar.getInstance());

            SignatureOptions options = new SignatureOptions();
            options.setPreferredSignatureSize(16384); // 16 KB

            if (role == SignerRole.SIGNER_A) {
                // Certification signature with DocMDP P=2 (form fill + sign allowed)
                document.addSignature(signature, this.createSignatureInterface(privateKey, cert, chain), options);
                setDocMDPPermission(document, signature, 2);
            } else {
                // Approval signature
                document.addSignature(signature, this.createSignatureInterface(privateKey, cert, chain), options);
            }

            // Save incrementally to preserve previous signatures
            try (FileOutputStream fos = new FileOutputStream(pdfFile)) {
                document.saveIncremental(fos);
            }
        }
    }

    private org.apache.pdfbox.pdmodel.interactive.digitalsignature.SignatureInterface createSignatureInterface(
            PrivateKey privateKey, X509Certificate cert, Certificate[] chain) {
        return content -> {
            try {
                CMSSignedDataGenerator gen = new CMSSignedDataGenerator();
                ContentSigner sha256Signer = new JcaContentSignerBuilder("SHA256withRSA")
                        .setProvider("BC")
                        .build(privateKey);
                gen.addSignerInfoGenerator(
                        new JcaSignerInfoGeneratorBuilder(
                                new JcaDigestCalculatorProviderBuilder().setProvider("BC").build()
                        ).build(sha256Signer, cert)
                );
                gen.addCertificates(new JcaCertStore(Arrays.asList(chain)));

                byte[] data = content.readAllBytes();
                CMSTypedData cmsData = new CMSProcessableByteArray(data);
                CMSSignedData signedData = gen.generate(cmsData, false);
                return signedData.getEncoded();
            } catch (Exception e) {
                throw new IOException("Error signing PDF", e);
            }
        };
    }

    private void setDocMDPPermission(PDDocument document, PDSignature signature, int accessPermissions) {
        var permsDict = new org.apache.pdfbox.cos.COSDictionary();
        permsDict.setItem(COSName.getPDFName("DocMDP"), signature.getCOSObject());
        document.getDocumentCatalog().getCOSObject().setItem(COSName.getPDFName("Perms"), permsDict);

        // Create the transform parameters dictionary
        var transformParams = new org.apache.pdfbox.cos.COSDictionary();
        transformParams.setItem(COSName.TYPE, COSName.getPDFName("TransformParams"));
        transformParams.setInt(COSName.getPDFName("P"), accessPermissions);
        transformParams.setName(COSName.getPDFName("V"), "1.2");

        // Create the signature reference
        var sigRef = new org.apache.pdfbox.cos.COSDictionary();
        sigRef.setItem(COSName.TYPE, COSName.getPDFName("SigRef"));
        sigRef.setItem(COSName.getPDFName("TransformMethod"), COSName.getPDFName("DocMDP"));
        sigRef.setItem(COSName.getPDFName("TransformParams"), transformParams);

        var referenceArray = new org.apache.pdfbox.cos.COSArray();
        referenceArray.add(sigRef);
        signature.getCOSObject().setItem(COSName.getPDFName("Reference"), referenceArray);
    }
}
