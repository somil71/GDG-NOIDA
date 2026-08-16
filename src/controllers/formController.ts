import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { formSchemaValidator, buildZodSchema, FormField } from '../utils/schemaValidator';

export const createForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, schema } = req.body;

    if (!title || !schema) {
      return res.status(400).json({ error: 'Title and schema are required' });
    }

    // Validate the dynamic schema definition
    const parsedSchema = formSchemaValidator.parse(schema);

    const form = await prisma.form.create({
      data: {
        title,
        description,
        schema: JSON.stringify(parsedSchema),
      },
    });

    res.status(201).json(form);
  } catch (error) {
    next(error);
  }
};

export const getForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const form = await prisma.form.findUnique({ where: { id } });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Parse the stored schema string back to JSON for the response
    res.json({
      ...form,
      schema: JSON.parse(form.schema),
    });
  } catch (error) {
    next(error);
  }
};

export const getForms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forms = await prisma.form.findMany();
    res.json(forms.map(form => ({
      ...form,
      schema: JSON.parse(form.schema),
    })));
  } catch (err) {
    next(err);
  }
};

export const submitFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const form = await prisma.form.findUnique({ where: { id } });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const formFields: FormField[] = JSON.parse(form.schema);
    const dynamicSchema = buildZodSchema(formFields);

    // Ensure we parse body data (which might be stringified if sent via multipart/form-data)
    // When using multer, text fields might arrive as strings, so we may need to parse them if they are meant to be numbers.
    // However, for simplicity, we assume the client sends JSON if no files, or if files, we might need to pre-process.
    // Let's handle simple parsing: if `req.body.data` is stringified, we parse it.
    let payloadToValidate = req.body;
    if (typeof req.body.data === 'string') {
      try {
        payloadToValidate = JSON.parse(req.body.data);
      } catch (e) {
        // ignore, let validation fail
      }
    }

    // Since multipart/form-data converts everything to strings, let's coerce numbers for rating/nps
    const coercedPayload: Record<string, any> = { ...payloadToValidate };
    for (const field of formFields) {
      if ((field.type === 'rating' || field.type === 'nps') && typeof coercedPayload[field.name] === 'string') {
        const num = Number(coercedPayload[field.name]);
        if (!isNaN(num)) {
          coercedPayload[field.name] = num;
        }
      }
    }

    // Validate payload against dynamic schema
    const sanitizedData = dynamicSchema.parse(coercedPayload);

    // Handle files
    const uploadedFiles: any[] = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        uploadedFiles.push({
          fieldname: file.fieldname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
        });
      });
    }

    const submission = await prisma.submission.create({
      data: {
        formId: id,
        data: JSON.stringify(sanitizedData),
        files: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null,
      },
    });

    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
};

export const getSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    
    // Optional: add pagination here later if needed
    const submissions = await prisma.submission.findMany({
      where: { formId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(submissions.map(sub => ({
      ...sub,
      data: JSON.parse(sub.data),
      files: sub.files ? JSON.parse(sub.files) : [],
    })));
  } catch (error) {
    next(error);
  }
};
