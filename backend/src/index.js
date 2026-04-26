// import dotenv from 'dotenv';
// dotenv.config();
// import express from 'express';
// import mongoose from 'mongoose';
// import cors from 'cors';
// import helmet from 'helmet';
// import mongoSanitize from 'express-mongo-sanitize';
// import rateLimit from 'express-rate-limit';

// import authRoutes from './routes/authRoutes.js';
// import complaintRoutes from './routes/complaintRoutes.js';
// import statsRoutes from './routes/statsRoutes.js';
// import adminRoutes from './routes/adminRoutes.js';
// import feedbackRoutes from './routes/feedbackRoutes.js';
// import contactRoutes from './routes/contactRoutes.js';

// const app = express();
// app.set('trust proxy', 1);

// // ── Security Middleware ──────────────────────────────────────────────────────
// app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// app.use(mongoSanitize());

// // ── CORS ─────────────────────────────────────────────────────────────────────
// const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5500').split(',').map(o => o.trim());
// // const allowedOrigins = (
// //  process.env.CLIENT_URL || 
// //  'https://power-pulse-pdpkp23wq-kundusayanti16s-projects.vercel.app,http://localhost:5500'
// // ).split(',').map(o => o.trim());


// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
//     callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true,
// }));

// // ── Global Rate Limiter ───────────────────────────────────────────────────────
// const globalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 150,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { success: false, message: 'Too many requests. Please try again later.' },
// });
// app.use(globalLimiter);

// // ── Body Parser ───────────────────────────────────────────────────────────────
// app.use(express.json({ limit: '10kb' }));
// app.use(express.urlencoded({ extended: true }));

// // ── Routes ────────────────────────────────────────────────────────────────────
// app.use('/api/auth', authRoutes);
// app.use('/api/complaints', complaintRoutes);
// app.use('/api/stats', statsRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api/feedback', feedbackRoutes);
// app.use('/api/contact', contactRoutes);

// // ── Health Check ──────────────────────────────────────────────────────────────
// app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// // ── 404 ───────────────────────────────────────────────────────────────────────
// app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// // ── Global Error Handler ──────────────────────────────────────────────────────
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
// });

// // ── Connect DB then Start ─────────────────────────────────────────────────────
// const PORT = process.env.PORT || 5000;
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log('✅ Connected to MongoDB');
//     app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
//   })
//   .catch((err) => {
//     console.error('❌ MongoDB connection error:', err.message);
//     process.exit(1);
//   });






import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

const app = express();

// Railway proxy fix
app.set('trust proxy', 1);


// ── Security Middleware ─────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(mongoSanitize());


// ── CORS Configuration ─────────────────────────────
const allowedOrigins = (
  process.env.CLIENT_URL ||
  'https://power-pulse-pdpkp23wq-kundusayanti16s-projects.vercel.app,https://power-pulse-iota.vercel.app,http://localhost:5500'
)
.split(',')
.map(origin => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);


// ── Global Rate Limiter ────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again after 2 minutes.'
  }
});

app.use(globalLimiter);


// ── Body Parser ────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));


// ── Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/contact', contactRoutes);


// ── Health Check ───────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date()
  });
});


// ── 404 Handler ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


// ── Global Error Handler ───────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});


// ── MongoDB Connection + Server Start ──────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

















