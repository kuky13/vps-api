import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL);

// O Worker fica rodando 24/7 na sua VPS
const worker = new Worker('tasks', async job => {
  console.log('Processando tarefa pesada:', job.data);
  // Simule aqui um processamento longo (ex: integração com WhatsApp ou banco)
  await new Promise(res => setTimeout(res, 5000)); 
  console.log('Tarefa concluída!');
}, { connection });
