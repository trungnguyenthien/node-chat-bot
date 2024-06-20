import express from 'express';
import cors from 'cors';
import getRawBody from 'raw-body';
import completionRoute from './routes/completion.js';
import bodyParser from 'body-parser';

import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(async (req, res, next) => {
    try {
      req.rawBody = await getRawBody(req, { encoding: 'utf8' });
      next();
    } catch (err) {
      next(err);
    }
  });

app.use('/completion', completionRoute);

const startServer = async () => {
    try {
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Unable to start the server:', error);
    }
};

startServer();
