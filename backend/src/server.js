require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const todoRoutes = require('./routes/todos');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & logging
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 60_000, max: 200, message: { success: false, error: 'Too many requests' } }));

// Routes
app.use('/api/todos', todoRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
});

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const server = app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(() => {
    console.log('✓ HTTP server closed');
    process.exit(0);
  });
  // Force exit after 5s if connections linger
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
