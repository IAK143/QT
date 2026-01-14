
import { storageService } from "./storageService";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ChatInsight, ChatMessage, BrainMessage, Workspace } from "../types";
import { fileToBase64 } from "../utils/fileHelpers";

// Dynamic initialization of AI client
const getAIClient = (): GoogleGenAI => {
  const key = storageService.getGeminiKey() || process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  return new GoogleGenAI({ apiKey: key });
};

const docResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    documentType: { type: Type.STRING, enum: ["Invoice", "Receipt", "Report", "Form", "Other"] },
    structuredData: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          headers: { type: Type.ARRAY, items: { type: Type.STRING } },
          rows: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { cells: { type: Type.ARRAY, items: { type: Type.STRING } } },
              required: ["cells"]
            }
          }
        },
        required: ["title", "headers", "rows"]
      }
    },
    keyEntities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["id", "label", "value"]
      }
    },
    suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["summary", "documentType", "structuredData", "keyEntities", "suggestedActions"]
};

const chatResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "Executive summary of the conversation" },
    actionItems: { type: Type.ARRAY, items: { type: Type.STRING, description: "Tasks or todos extracted" } },
    sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
    topics: { type: Type.ARRAY, items: { type: Type.STRING, description: "Key topics discussed" } }
  },
  required: ["summary", "actionItems", "sentiment", "topics"]
};

const sheetResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    updates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          row: { type: Type.INTEGER },
          col: { type: Type.INTEGER },
          value: { type: Type.STRING }
        },
        required: ["row", "col", "value"]
      }
    },
    clear: { type: Type.BOOLEAN },
    explanation: { type: Type.STRING }
  },
  required: ["updates", "explanation"]
};

export const analyzeDocument = async (file: File): Promise<AnalysisResult> => {
  try {
    const base64Data = await fileToBase64(file);
    const mimeType = file.type;

    const response = await getAIClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: "Analyze this document completely. Extract tables, key entities, and suggest actions." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: docResponseSchema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const rawData = JSON.parse(text);

    // Transform rows
    const processedData: AnalysisResult = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      ...rawData,
      structuredData: rawData.structuredData.map((table: any) => ({
        ...table,
        rows: table.rows.map((rowWrapper: { cells: string[] }) => {
          const rowObj: Record<string, string> = {};
          table.headers.forEach((header: string, index: number) => {
            rowObj[header] = rowWrapper.cells?.[index] || '';
          });
          return rowObj;
        })
      }))
    };

    return processedData;
  } catch (error) {
    console.error("Gemini Doc Analysis Error:", error);
    throw error;
  }
};

export const analyzeConversation = async (messages: ChatMessage[]): Promise<ChatInsight> => {
  try {
    const transcript = messages.map(m =>
      `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.senderName}: ${m.type === 'analysis' ? `Shared a document analysis for: ${m.attachment?.documentType}` : m.content}`
    ).join('\n');

    const response = await getAIClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: `Analyze this team chat log and provide insights:\n\n${transcript}` }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: chatResponseSchema,
        systemInstruction: "You are a professional project manager. Summarize the conversation, find action items, and detect sentiment.",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text) as ChatInsight;
  } catch (error) {
    console.error("Gemini Chat Analysis Error:", error);
    throw error;
  }
};

export const queryDocument = async (context: AnalysisResult, question: string): Promise<string> => {
  try {
    const contextString = JSON.stringify(context, null, 2);
    const response = await getAIClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: `Context: ${contextString}\n\nQuestion: ${question}\n\nAnswer the question concisely based on the context provided.` }]
      },
      config: {
        temperature: 0.3,
      }
    });
    return response.text || "I couldn't find an answer.";
  } catch (error) {
    console.error("Query Doc Error", error);
    return "Error querying the document.";
  }
};

export const askBot = async (question: string): Promise<string> => {
  try {
    const response = await getAIClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: question,
      config: {
        systemInstruction: "You are QT, a helpful, intelligent assistant in a team collaboration workspace. Provide concise, accurate, and helpful answers.",
      }
    });
    return response.text || "I'm not sure how to answer that.";
  } catch (error) {
    console.error("Bot Error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
};

export const runSecondBrain = async (history: BrainMessage[], newMessage: string, image?: string, mode?: 'decision' | 'standard'): Promise<string> => {
  try {
    // Construct history for Gemini
    const contents = history.map(h => ({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: h.image
        ? [{ inlineData: { mimeType: 'image/png', data: h.image } }, { text: h.content }]
        : [{ text: h.content }]
    }));

    // Add the new message
    const newParts: any[] = [{ text: newMessage }];
    if (image) {
      newParts.unshift({ inlineData: { mimeType: 'image/png', data: image } });
    }
    contents.push({ role: 'user', parts: newParts });

    let systemInstruction = "You are Thought Lab, a highly intelligent, proactive, and structured personal assistant. Your goal is to provide clarity, depth, and actionable advice. Format your answers with clear Markdown (headers, bold text, lists).";

    if (mode === 'decision') {
      systemInstruction += " The user is asking for help making a decision. Act as a Rational Decision Engine. 1. Clarify the objective. 2. Identify constraints. 3. List options with Pros/Cons. 4. Provide a concrete recommendation. Be objective and direct.";
    }

    const response = await getAIClient().models.generateContent({
      model: 'gemini-3-flash-preview', // Stronger model for brain
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4,
      }
    });

    return response.text || "I couldn't process that thought.";
  } catch (e) {
    console.error("Second Brain Error", e);
    return "My thought process was interrupted. Please try again.";
  }
};

export const processSheetCommand = async (data: string[][], prompt: string): Promise<{ updates: { row: number, col: number, value: string }[], clear?: boolean, explanation: string }> => {
  try {
    // Create a CSV context
    const csvContext = data.map(row => row.join(',')).join('\n');

    const response = await getAIClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{
          text: `You are a smart spreadsheet assistant.
                
                Current Sheet (CSV format):
                ${csvContext}
                
                User Command: "${prompt}"
                
                Instructions:
                1. Analyze the user command and the sheet data.
                2. Return a JSON object with 'updates' array.
                3. Each update has 'row' (0-indexed), 'col' (0-indexed), and 'value' (string).
                4. Set 'clear' to true if the sheet should be cleared first.
                5. Provide a short 'explanation' of actions taken.
                ` }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: sheetResponseSchema,
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);
  } catch (e) {
    console.error("Sheet Processing Error", e);
    return { updates: [], explanation: "Failed to process command." };
  }
};

export const consultWorkspace = async (workspace: Workspace, message: string): Promise<string> => {
  try {
    const workspaceContext = `
        Workspace Title: ${workspace.title}
        Type: ${workspace.type}
        Objective: ${workspace.objective}
        Current Sections:
        ${workspace.sections.map(s => `- ${s.title}: ${s.content || "(Empty)"}`).join('\n')}
        `;

    const response = await getAIClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{
          text: `You are an expert consultant assisting with a ${workspace.type} document.
                
                Context:
                ${workspaceContext}
                
                User Request: "${message}"
                
                Provide a helpful, professional, and specific response.` }]
      },
      config: {
        temperature: 0.4
      }
    });

    return response.text || "I couldn't generate a response.";
  } catch (e) {
    console.error("Consult Workspace Error", e);
    return "Error consulting the workspace.";
  }
};
