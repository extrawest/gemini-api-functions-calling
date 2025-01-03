import { GoogleGenerativeAI } from '@google/generative-ai';
import readline from 'readline';

import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    tools: [
        {
            codeExecution: {}
        }
    ]
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(query) {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    while (true) {
        try {
            const userQuestion1 = await askQuestion("Enter your condition (or type 'exit' to quit): ");

            if (userQuestion1.toLowerCase() === 'exit') {
                console.log('Exiting the program. Goodbye!');
                rl.close();
                break;
            }
            let userQuestion2;
            if (userQuestion1 !== '') {
                userQuestion2 = await askQuestion("Enter your question (or type 'exit' to quit): ");
                if (userQuestion2.toLowerCase() === 'exit') {
                    console.log('Exiting the program. Goodbye!');
                    rl.close();
                    break;
                }
            }

            if (userQuestion1 !== '' && userQuestion2 !== '') {
                const result = await model.generateContent(userQuestion1 + userQuestion2);
                const response = result.response;
                console.log('Response:', response.candidates[0].content);
            }
        } catch (error) {
            console.error('An error occurred:', error);
        }
    }
}

main();
