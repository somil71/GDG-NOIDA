import { Router } from 'express';
import { createForm, getForm, getForms, submitFeedback, getSubmissions } from '../controllers/formController';
import { submissionLimiter } from '../middlewares/rateLimiter';
import { upload } from '../middlewares/upload';

const router = Router();

// Create a new form
router.post('/', createForm);

// Get all forms
router.get('/', getForms);

// Get a form schema
router.get('/:id', getForm);

// Submit feedback to a form (with rate limiting and file upload)
router.post('/:id/submissions', submissionLimiter, upload.any(), submitFeedback);

// Get all submissions for a form
router.get('/:id/submissions', getSubmissions);

export default router;
