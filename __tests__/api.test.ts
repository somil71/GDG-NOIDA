import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/db';
import fs from 'fs';
import path from 'path';

describe('The Feedback Engine API', () => {
  let formId: string;

  beforeAll(async () => {
    // Ensure DB is clean
    await prisma.submission.deleteMany();
    await prisma.form.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    
    // Clean up uploaded files (optional, but good for test hygiene)
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadDir, file));
      }
    }
  });

  it('should create a new form with a dynamic schema', async () => {
    const res = await request(app)
      .post('/api/forms')
      .send({
        title: 'Event Feedback',
        description: 'Feedback for GDG Noida event',
        schema: [
          { name: 'satisfaction', type: 'rating', required: true },
          { name: 'comments', type: 'text', required: false },
          { name: 'resume', type: 'file', required: false }
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Event Feedback');
    formId = res.body.id;
  });

  it('should get the form schema', async () => {
    const res = await request(app).get(`/api/forms/${formId}`);
    expect(res.status).toBe(200);
    expect(res.body.schema.length).toBe(3);
    expect(res.body.schema[0].name).toBe('satisfaction');
  });

  it('should successfully submit feedback with valid data', async () => {
    const payload = {
      satisfaction: 5,
      comments: 'Great event!',
    };

    const res = await request(app)
      .post(`/api/forms/${formId}/submissions`)
      .field('data', JSON.stringify(payload));

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    const responseData = JSON.parse(res.body.data);
    expect(responseData.satisfaction).toBe(5);
  });

  it('should fail submission if required fields are missing', async () => {
    const payload = {
      comments: 'I forgot to rate!',
    };

    const res = await request(app)
      .post(`/api/forms/${formId}/submissions`)
      .field('data', JSON.stringify(payload));

    expect(res.status).toBe(400); // Bad Request (Zod Validation Error)
    expect(res.body.error).toBe('Validation Error');
  });

  it('should get all submissions for a form', async () => {
    const res = await request(app).get(`/api/forms/${formId}/submissions`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].data.satisfaction).toBe(5);
  });
});
