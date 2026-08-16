import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import formRoutes from './routes/formRoutes';
import { globalLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Apply Middlewares
app.use(helmet()); // RED TEAM FIX: Secure HTTP headers
app.use(cors());

// Fix for strict body-parser charset matching
app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('UTF-8')) {
    req.headers['content-type'] = req.headers['content-type'].replace('UTF-8', 'utf-8');
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiting
app.use(globalLimiter);

// Serve frontend static files
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve uploaded files statically for easy access
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount Routes
app.use('/api/forms', formRoutes);

// Apply Global Error Handler
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app; // export for testing
