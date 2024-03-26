import { createServer } from 'http';
import OpenAI from 'openai';
import 'dotenv/config';
import { createReadStream } from 'fs';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://azoneapi.azurewebsites.net/v1",
});

const port = 3001;

interface ChatRequestBody {
    userMessage: string;
    selectedModels: string[];
}

createServer(async (req, res) => {
    const url = new URL(req.url!, 'file:///');
    const query = Object.fromEntries(url.searchParams.entries());
    console.log('Received request:', req.url);

    if (url.pathname === '/') {
        // 首页路由，返回 index.html
        createReadStream('./index.html').pipe(res);
        return;
    }

    if (url.pathname === '/chat') {
        try {
            const data: ChatRequestBody = await new Promise((resolve, reject) => {
                let body = '';
                req.on('data', (chunk) => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    resolve(JSON.parse(body));
                });
                req.on('error', (err) => {
                    reject(err);
                });
            });

            const { userMessage, selectedModels } = data;
            console.log(`Received prompt: ${userMessage}, selected models: ${selectedModels}`);

            if (userMessage.trim() === '') {
                res.statusCode = 400;
                res.end('User message is required');
                return;
            }

            const responses = await Promise.all(selectedModels.map(async (model: string) => {
                console.log(`Sending request to model ${model} with prompt: ${userMessage}`);
                const gptStream = await openai.chat.completions.create({
                    model,
                    messages: [{ role: 'user', content: userMessage }],
                    stream: true,
                });

                let assistantMessage = '';

                for await (const chunk of gptStream) {
                    console.log('Received chunk:', chunk);
                    if (chunk.choices && chunk.choices[0].delta.content) {
                        assistantMessage += chunk.choices[0].delta.content;
                    }
                }

                return assistantMessage;
            }));

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ responses }));
        } catch (error) {
            console.error('Error:', error);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    } else {
        res.statusCode = 404;
        res.end('Not found');
    }
}).listen(port);

console.log(`Server running at http://localhost:${port}/`);