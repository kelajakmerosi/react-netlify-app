require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const { logger } = require('./config/logger');

const PORT = process.env.PORT || 8080;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(
        { port: PORT, env: process.env.NODE_ENV || 'development' },
        '[server] Server started'
      );
    });
  })
  .catch((err) => {
    logger.error({ err }, '[server] Startup failed');
    process.exit(1);
  });
