import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function colorCardRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const { brand } = request.query as { brand?: string };

    if (!brand) {
      return reply.status(400).send({ error: 'brand query parameter is required' });
    }

    const cards = await prisma.colorCard.findMany({
      where: { brand },
      orderBy: { code: 'asc' },
    });

    return cards;
  });
}
