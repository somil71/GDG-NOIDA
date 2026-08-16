import { z } from 'zod';

export type FieldType = 'rating' | 'nps' | 'text' | 'file';

export interface FormField {
  name: string;
  type: FieldType;
  required?: boolean;
}

export function buildZodSchema(fields: FormField[]) {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'rating':
        fieldSchema = z.number().int().min(1).max(5);
        break;
      case 'nps':
        fieldSchema = z.number().int().min(0).max(10);
        break;
      case 'text':
        fieldSchema = z.string().max(10000); // Sensible limit for text
        break;
      case 'file':
        // For file uploads, we just validate if it's provided in the payload or not.
        // The actual file is handled by Multer. We might just expect a boolean or string here
        // depending on how the frontend sends it, or we just validate it separately.
        fieldSchema = z.any();
        break;
      default:
        fieldSchema = z.any();
    }

    if (field.type !== 'file') {
       if (field.required) {
         schemaShape[field.name] = fieldSchema;
       } else {
         schemaShape[field.name] = fieldSchema.optional();
       }
    }
  }

  return z.object(schemaShape);
}

// Ensure the schema definition itself is valid when creating a form
export const formSchemaValidator = z.array(
  z.object({
    name: z.string().min(1).max(50),
    type: z.enum(['rating', 'nps', 'text', 'file']),
    required: z.boolean().optional(),
  })
);
