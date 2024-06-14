import { createServer } from 'http';
import OpenAI from 'openai';
import 'dotenv/config';
import { createReadStream } from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const modelList = process.env.MODEL_LIST?.split(';') || [];

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
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
        res.writeHead(200, { 'Content-Type': 'text/html' });
        createReadStream('./index.html').pipe(res);
        return;
    }

    if (url.pathname === '/models') {
        // 返回模型列表
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ models: modelList }));
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

            // 并行发送请求到不同的模型
            const responses = await Promise.all(selectedModels.map(async (model) => {
                try {
                    console.log(`Sending request to model ${model} with prompt: ${userMessage}`);
                    const gptResponse = await openai.chat.completions.create({
                        model,
                        messages: [{ role: 'user', content: userMessage }],
                    });
                    return gptResponse.choices[0].message.content;
                } catch (error) {
                    console.error(`Error with model ${model}:`, error);
                    return `Error with model ${model}`;
                }
            }));

            // 返回所有模型的响应
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ responses }));
        } catch (error) {
            console.error('Error:', error);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
}).listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
