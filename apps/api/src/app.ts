import Fastify from 'fastify';
import cors from '@fastify/cors';
import { colorCardRoutes } from './routes/colorCards';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

await app.register(colorCardRoutes, { prefix: '/api/color-cards' });

app.get('/health', async () => ({ status: 'ok' }));

export { app };
