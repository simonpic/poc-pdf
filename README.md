# PDF Field Extraction POC

Éditeur PDF avec extraction de champs AcroForm et ajout de champs personnalisés (texte, checkbox, radio).

## Prérequis

- Java 20+
- Node.js 18+
- Maven

## Démarrage

### Backend (Spring Boot — port 8080)

```bash
cd backend
mvn spring-boot:run
```

### Frontend (React/Vite — port 5173)

```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173 dans le navigateur.

## Stack

| Couche   | Technos                                    |
|----------|--------------------------------------------|
| Frontend | React 19, TypeScript, Vite, Tailwind v4, shadcn/ui |
| Backend  | Spring Boot 3.4, PDFBox 3.0               |
