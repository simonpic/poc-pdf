package com.poc.pdf.service;

import com.poc.pdf.entity.SignerRole;
import jakarta.annotation.PostConstruct;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Date;
import java.util.EnumMap;
import java.util.Map;

@Service
public class CertificateService {

    private final Map<SignerRole, KeyStore.PrivateKeyEntry> signerEntries = new EnumMap<>(SignerRole.class);

    @PostConstruct
    public void init() throws Exception {
        Security.addProvider(new BouncyCastleProvider());
        for (SignerRole role : SignerRole.values()) {
            signerEntries.put(role, generateSelfSignedEntry(role));
        }
    }

    public KeyStore.PrivateKeyEntry getSignerEntry(SignerRole role) {
        return signerEntries.get(role);
    }

    private KeyStore.PrivateKeyEntry generateSelfSignedEntry(SignerRole role) throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        KeyPair keyPair = kpg.generateKeyPair();

        String cn = switch (role) {
            case SIGNER_A -> "CN=Signataire A, O=POC PDF";
            case SIGNER_B -> "CN=Signataire B, O=POC PDF";
        };

        long now = System.currentTimeMillis();
        Date notBefore = new Date(now);
        Date notAfter = new Date(now + 365L * 24 * 60 * 60 * 1000);

        X500Name issuer = new X500Name(cn);
        BigInteger serial = BigInteger.valueOf(now);

        JcaX509v3CertificateBuilder certBuilder = new JcaX509v3CertificateBuilder(
                issuer, serial, notBefore, notAfter, issuer, keyPair.getPublic());

        ContentSigner signer = new JcaContentSignerBuilder("SHA256withRSA")
                .setProvider("BC")
                .build(keyPair.getPrivate());

        X509CertificateHolder holder = certBuilder.build(signer);
        X509Certificate cert = new JcaX509CertificateConverter()
                .setProvider("BC")
                .getCertificate(holder);

        return new KeyStore.PrivateKeyEntry(
                keyPair.getPrivate(),
                new Certificate[]{cert}
        );
    }
}
