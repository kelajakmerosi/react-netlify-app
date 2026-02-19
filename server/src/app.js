const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const { httpLogger } = require('./config/logger');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(httpLogger);
app.use((req, res, next) => {
	res.setHeader('X-Request-Id', req.id);
	next();
});
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Error handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
