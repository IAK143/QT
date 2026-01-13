
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const USERS_FILE = path.join(__dirname, 'users.json');
function loadUsers() { try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')); } catch (e) { return {}; } }
function saveUsers(users) { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }

const onlineUsers = {};
const pendingInvites = {};

io.on('connection', (socket) => {
  socket.on('register', ({ userId, username }, callback) => {
    const users = loadUsers();
    if (users[userId] && users[userId] !== username) {
      if (callback) callback({ success: false, error: 'ID taken.' });
      return;
    }
    users[userId] = username;
    saveUsers(users);
    onlineUsers[userId] = socket.id;
    socket.userId = userId; socket.username = username;
    if (callback) callback({ success: true, pendingInvites: pendingInvites[userId] || [] });
    io.emit('online-users', Object.keys(onlineUsers).map(id => ({ userId: id, username: users[id] })));
  });

  socket.on('send-invite', ({ targetUserId }, callback) => {
    const users = loadUsers();
    if (!users[targetUserId]) return callback?.({ success: false, error: 'User not found.' });
    const invite = { fromId: socket.userId, fromUsername: socket.username };
    if (onlineUsers[targetUserId]) io.to(onlineUsers[targetUserId]).emit('invite-received', invite);
    else {
      if (!pendingInvites[targetUserId]) pendingInvites[targetUserId] = [];
      pendingInvites[targetUserId].push(invite);
    }
    callback?.({ success: true });
  });

  socket.on('accept-invite', ({ fromUserId }, callback) => {
    if (!onlineUsers[fromUserId]) return callback?.({ success: false, error: 'User offline.' });
    io.to(onlineUsers[fromUserId]).emit('invite-accepted', { userId: socket.userId, username: socket.username });
    callback?.({ success: true });
  });

  socket.on('send-message', ({ toUserId, message }) => {
    if (onlineUsers[toUserId]) {
      io.to(onlineUsers[toUserId]).emit('message-received', {
        fromId: socket.userId, fromUsername: socket.username, message, timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      delete onlineUsers[socket.userId];
      const users = loadUsers();
      io.emit('online-users', Object.keys(onlineUsers).map(id => ({ userId: id, username: users[id] })));
    }
  });
});

app.post('/api/process', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('your_api_key')) {
      return res.status(500).json({ error: 'Gemini API Key missing.' });
    }

    // Initialize AI with the key
    const genAI = new GoogleGenerativeAI(apiKey);

    // We'll try the beta endpoint if standard fails, but typically "gemini-1.5-flash" works.
    // However, the error 404 implies the model resource isn't found.
    // Some keys only have access to specific models.
    console.log(`[AI] Processing ${req.file.originalname} with model gemini-1.5-flash`);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze this document and extract details in JSON format:
    {
      "summary": "Full natural language summary",
      "structuredData": [ {"column": "value"} ],
      "entities": { "Vendor": "...", "Total": "...", "Date": "..." },
      "actions": [ {"label": "...", "type": "..."} ],
      "documentType": "..."
    }
    ONLY return JSON.`;

    const docPart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype
      }
    };

    try {
      const result = await model.generateContent([prompt, docPart]);
      const response = await result.response;
      let text = response.text().trim();

      // Basic JSON extraction from markdown if present
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        text = text.substring(jsonStart, jsonEnd + 1);
      }

      res.json(JSON.parse(text));
    } catch (apiError) {
      console.error('[AI] Gemini Request Failed:', apiError);
      res.status(500).json({ error: apiError.message, type: 'AI_ERROR' });
    }

  } catch (error) {
    console.error('[AI] Internal Error:', error);
    res.status(500).json({ error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
