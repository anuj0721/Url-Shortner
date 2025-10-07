// Minimal Express server (ES module)
import 'dotenv/config';
import express from 'express';
import healthRouter from './routes/health.js';
import shortnerRouter from './routes/shortner.js';

const app = express();

app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/shortner', shortnerRouter);

// Basic 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  const message = err && err.message ? err.message : 'Internal Server Error';
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
