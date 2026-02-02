import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import assetsRouter from './routes/assets.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Railway/Vercel (needed for rate limiting)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  skip: (req) => req.path === '/health', // Don't rate limit health checks
});

app.use(limiter);

// Stricter rate limit for write operations
const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // 10 writes per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please slow down' },
});

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://frontend-six-blond-32.vercel.app',
  'https://frontend-yitchs-projects.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (health checks, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed =>
      origin === allowed || origin.startsWith(allowed)
    );

    if (isAllowed) {
      callback(null, true);
    } else if (!isProduction) {
      // Allow all origins in development
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Body parser with size limit
app.use(express.json({ limit: '10kb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Commodity Tracker API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      assets: '/api/assets',
    }
  });
});

// Apply stricter rate limit to asset modification routes
app.use('/api/assets', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'DELETE') {
    return writeLimiter(req, res, next);
  }
  next();
});

// Routes
app.use('/api/assets', assetsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
});
