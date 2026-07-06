import { app } from './app';

const PORT = Number(process.env.PORT) || 3000;

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`API server running on http://localhost:${PORT}`);
