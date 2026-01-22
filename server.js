import Fastify from 'fastify';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const fastify = Fastify({ logger: true });

// Conexão com o Redis na VPS
const connection = new IORedis(process.env.REDIS_URL);
const taskQueue = new Queue('tasks', { connection });

// --- A1) SEGURANÇA (Bearer Token) ---
fastify.addHook('preHandler', async (request, reply) => {
  const token = process.env.API_SECRET_TOKEN;
  const authHeader = request.headers.authorization;

  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return reply.code(401).send({ ok: false, error: 'Não autorizado' });
  }
});

// --- A2) ENDPOINTS DE CACHE (POST JSON) ---

// 1) POST /cache/get
fastify.post('/cache/get', async (request) => {
  const { key } = request.body;
  
  if (!key) return { ok: false, error: 'Chave ausente' };

  const rawValue = await connection.get(key);
  
  if (rawValue) {
    return { ok: true, hit: true, value: JSON.parse(rawValue) };
  }
  
  return { ok: true, hit: false, value: null };
});

// 2) POST /cache/set
fastify.post('/cache/set', async (request) => {
  const { key, value, ttlSeconds } = request.body;

  if (!key || value === undefined || !ttlSeconds) {
    return { ok: false, error: 'Campos obrigatórios: key, value, ttlSeconds' };
  }

  const data = JSON.stringify(value);
  // SET key value EX ttlSeconds
  await connection.set(key, data, 'EX', ttlSeconds);
  
  return { ok: true };
});

// 3) POST /cache/del
fastify.post('/cache/del', async (request) => {
  const { key } = request.body;
  
  if (!key) return { ok: false, error: 'Chave ausente' };

  const result = await connection.del(key);
  return { ok: true, deleted: result };
});

// Extra: POST /cache/delMany (Otimização)
fastify.post('/cache/delMany', async (request) => {
  const { keys } = request.body;
  
  if (!Array.isArray(keys) || keys.length === 0) {
    return { ok: false, error: 'Array de keys é obrigatório' };
  }

  const result = await connection.del(...keys);
  return { ok: true, deleted: result };
});

// --- A3) SAÚDE E DIAGNÓSTICO ---

fastify.get('/health', async () => {
  return { ok: true, status: 'online', service: 'kuky-vps-api' };
});

fastify.get('/redis/ping', async () => {
  try {
    const pong = await connection.ping();
    return { ok: true, result: pong };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Rota original de Jobs (Fila BullMQ)
fastify.post('/enqueue', async (request) => {
  const { data } = request.body;
  await taskQueue.add('processTask', data);
  return { ok: true, message: 'Tarefa enviada para a fila na VPS' };
});

// INÍCIO DO SERVIDOR
const start = async () => {
  try {
    await fastify.listen({ port: 80, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
