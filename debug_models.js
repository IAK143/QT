
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function list() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
        const result = await model.generateContent("hello");
        console.log("Success v1 gemini-1.5-flash:", result.response.text());
    } catch (e) {
        console.error("Failed v1 gemini-1.5-flash:", e.message);

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1beta' });
            const result = await model.generateContent("hello");
            console.log("Success v1beta gemini-1.5-flash:", result.response.text());
        } catch (e2) {
            console.error("Failed v1beta gemini-1.5-flash:", e2.message);
        }
    }
}

list();
