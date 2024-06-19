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

router.post('/stream', async (req, res) => {
  try {
    const message = req.rawBody;
    await streamWithFunctions(message, res)
    // const response = await s(message)
    // res.status(200).json({ status: 200, error: "" });
  } catch (error) {
    // Xử lý lỗi nếu có
    console.error(error);
    res.status(500).json({ status: 500, error: error.message });
  }
});

export default router;