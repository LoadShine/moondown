import OpenAI from 'openai';

const DEEPSEEK_ENDPOINT = process.env.DEEPSEEK_ENDPOINT || 'https://leaomato-openai.openai.azure.com/openai/v1/';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'DeepSeek-V3.2';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

if (!DEEPSEEK_API_KEY) {
  console.error('Missing DEEPSEEK_API_KEY');
  process.exit(1);
}

const client = new OpenAI({
  baseURL: DEEPSEEK_ENDPOINT,
  apiKey: DEEPSEEK_API_KEY,
});

const [,, mode, ...args] = process.argv;

if (mode === 'chat') {
  const systemPrompt = args[0] || 'You are a helpful assistant.';
  const userPrompt = args[1] || 'Hello';
  const maxTokens = Number(args[2] || 2048);

  const completion = await client.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.8,
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() || '';
  process.stdout.write(raw);
  process.exit(0);
}

if (mode === 'stream') {
  const systemPrompt = args[0] || 'You are a helpful assistant.';
  const userPrompt = args[1] || 'Hello';

  const stream = await client.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    stream: true,
  });

  for await (const chunk of stream) {
    const piece = chunk.choices?.[0]?.delta?.content;
    if (piece) process.stdout.write(piece);
  }
  process.exit(0);
}

console.error('Usage: node scripts/real-ai-bridge.mjs <chat|stream> <systemPrompt> <userPrompt> [maxTokens]');
process.exit(1);
