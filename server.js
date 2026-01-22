import Fastify from 'fastify';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const fastify = Fastify({ logger: true });

// Conexão com o Redis (será configurado no Easypanel)
const connection = new IORedis(process.env.REDIS_URL);
const taskQueue = new Queue('tasks', { connection });

// Rota para receber pedidos da Vercel
fastify.post('/enqueue', async (request, reply) => {
  const { data } = request.body;
  
  // Adiciona tarefa na fila do Redis na VPS
  await taskQueue.add('processTask', data);
  
  return { status: 'Tarefa enviada para a fila na VPS', success: true };
});

// Inicia o servidor
const start = async () => {
  try {
    await fastify.listen({ port: 80, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();