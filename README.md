# The Feedback Engine

A robust, production-ready feedback portal backend built for the GDG Noida challenge.

## Features
- **Dynamic Schema**: Create forms with completely custom fields (ratings 1-5, NPS, text, and file uploads).
- **High Reliability & Rate Limiting**: Built-in rate limiting to prevent abuse and handle high traffic.
- **Payload Sanitization**: Uses `zod` to strictly validate and sanitize incoming payloads against the dynamic form schema.
- **File Uploads**: Handles `multipart/form-data` seamlessly using `multer`.
- **Database**: Uses Prisma ORM with SQLite for zero-configuration local execution, easily swappable to PostgreSQL.

## Tech Stack
- **Node.js + Express** (TypeScript)
- **Prisma ORM** + SQLite (using Prisma v7 Driver Adapters)
- **Zod** (Validation)
- **Multer** (File Uploads)
- **Jest + Supertest** (Testing)

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)

### Installation
1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Database Setup
The project uses SQLite for ease of testing. A `dev.db` is already initialized, but you can reset it anytime:
```bash
npx prisma migrate dev
```

### Running the Server
```bash
npm run dev
# OR using ts-node directly:
npx ts-node src/index.ts
```
The server will start on `http://localhost:3000`.

### Running Tests
Automated tests use Jest and Supertest to verify schemas, rate limiting, and core functionalities.
```bash
npm run test
# OR
npx jest
```

## API Documentation

### 1. Create a Form
**POST** `/api/forms`
Creates a new form with a dynamic schema.

**Request Body:**
```json
{
  "title": "Hackathon Feedback",
  "description": "Please let us know how we did!",
  "schema": [
    { "name": "overall_rating", "type": "rating", "required": true },
    { "name": "nps_score", "type": "nps", "required": true },
    { "name": "suggestions", "type": "text", "required": false },
    { "name": "project_screenshot", "type": "file", "required": false }
  ]
}
```

### 2. Get Form Details
**GET** `/api/forms/:id`
Retrieves the form and its schema.

### 3. Submit Feedback
**POST** `/api/forms/:id/submissions`
Submit feedback for a form. Since it supports file uploads, use `multipart/form-data`.

**Form Data:**
- `data`: A JSON string containing the answers mapped to the schema.
  - Example: `'{"overall_rating": 5, "nps_score": 9, "suggestions": "Great event!"}'`
- `project_screenshot`: (File attachment, matches schema name 'project_screenshot')

### 4. Get Submissions
**GET** `/api/forms/:id/submissions`
Retrieves all submissions for a specific form.
