import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import app from './app';
import { connectDB } from './config/db';
import { logger } from './config/logger';

const PORT = process.env.PORT || 8080;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      logger.info(
        { port: PORT, env: process.env.NODE_ENV || 'development' },
        '[server] Server started'
      );
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err && err.code === 'EADDRINUSE') {
        logger.error(
          {
            port: PORT,
            hint: `Port ${PORT} is already in use. Stop the other process or set PORT to a free value, e.g. PORT=8081 npm run dev`,
          },
          '[server] Port is already in use'
        );
      } else {
        logger.error({ err }, '[server] Server runtime error');
      }
      process.exit(1);
    });
  })
  .catch((err: Error) => {
    logger.error({ err }, '[server] Startup failed');
    process.exit(1);
  });
