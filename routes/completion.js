import express from 'express';
import { OpenAI } from "openai";
import { requestWithFunctions, streamWithFunctions } from '../service/openai.js'
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set the API key here
});

router.post('/', async (req, res) => {
  try {
    const message = req.rawBody;
    const response = await requestWithFunctions(message)
    res.status(200).json({ status: 200, error: response });
  } catch (error) {
    // Xử lý lỗi nếu có
    console.error(error);
    res.status(500).json({ status: 500, error: error.message });
  }
});


let clients = {};
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const guid = uuidv4().replace(/-/g, '');

  clients[guid] = {
    guid: guid,
    res: res
  };

  // Gửi thông báo khi kết nối SSE được thiết lập
  res.write(`data: Connected to SSE server with client ID: ${guid}\n\n`);

  req.on('close', () => {
    console.log(`${clientId} Connection closed`);
    clients = clients.filter(client => client.id !== clientId);
  });
});

router.post('/stream', async (req, res) => {
  try {
    const { message, clientId } = req.body;
    const clientRes = clients[clientId].res
    await streamWithFunctions(message, clientRes)
    // const response = await s(message)
    // res.status(200).json({ status: 200, error: "" });
  } catch (error) {
    // Xử lý lỗi nếu có
    console.error(error);
    res.status(500).json({ status: 500, error: error.message });
  }
});

export default router;