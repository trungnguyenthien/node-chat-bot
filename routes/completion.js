import express from 'express';
import { OpenAI } from "openai";
import { v4 as uuidv4 } from 'uuid';
import { streamWithFunctions2 } from '../service/openai.js'
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set the API key here
});

// router.post('/', async (req, res) => {
//   try {
//     const message = req.rawBody;
//     const response = await requestWithFunctions(message)
//     res.status(200).json({ status: 200, error: response });
//   } catch (error) {
//     // Xử lý lỗi nếu có
//     console.error(error);
//     res.status(500).json({ status: 500, error: error.message });
//   }
// });

function sse_message(data) {
  return `data: ${textToBase64(data)}\n\n`
}

function textToBase64(text) {
  const buffer = Buffer.from(text, 'utf-8');
  return buffer.toString('base64');
}

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
  console.log(`data:<guid>${guid}`)
  // Gửi thông báo khi kết nối SSE được thiết lập
  res.write(sse_message(`<guid>${guid}`));

  req.on('close', () => {
    console.log(`${clientId} Connection closed`);
    delete clients[guid];  // Sử dụng delete thay vì filter
  });
});

router.post('/stream', async (req, res) => {
  try {
    const rawMessage = req.rawBody
    console.log(`rawMessage = ${rawMessage}`)
    const objectMsg = JSON.parse(rawMessage)
    // console.log(`objectMsg = ${objectMsg.clientId}`)
    // console.log(clients)
    const clientRes = clients[objectMsg.clientId].res
    await streamWithFunctions2(objectMsg.message, clientRes)
    // const response = await s(message)
    // res.status(200).json({ status: 200, error: "" });
  } catch (error) {
    // Xử lý lỗi nếu có
    console.error(error);
    res.status(500).json({ status: 500, error: error.message });
  }
});


export default router;