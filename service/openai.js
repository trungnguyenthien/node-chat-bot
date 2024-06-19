import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

import {
  getPullRequestInfo,
  getPullRequestDetails,
  getPullRequestComments,
  getCommitsBetween,
  listPullRequests,
  listPullRequests_desc
}  from './git.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set the API key here
});

export async function requestWithFunctions(requestMessage) {
  // Step 1: send the conversation and available functions to the model
  const messages = [
    { role: "user", content: requestMessage },
  ];
  const tools = [
    listPullRequests_desc,
  ];
  const availableFunctions = {
    listPullRequests: listPullRequests,
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    tools: tools,
    tool_choice: "auto", // auto is default, but we'll be explicit
  });
  const responseMessage = response.choices[0].message;
  console.log(responseMessage)
  // Step 2: check if the model wanted to call a function
  const toolCalls = responseMessage.tool_calls;
  if (toolCalls) {
    messages.push(responseMessage); // extend conversation with assistant's reply
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionToCall = availableFunctions[functionName];
      const functionArgs = JSON.parse(toolCall.function.arguments);
      const functionResponse = await functionToCall(functionArgs);
      
      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: functionName,
        content: JSON.stringify(functionResponse),
      }); // extend conversation with function response
    }
    const secondResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
    }); // get a new response from the model where it can see the function response
    return secondResponse.choices[0].message.content;
  }
}

async function streamWithFunctions(requestMessage, res) {
  const messages = [{ role: "user", content: requestMessage }];
  const tools = [listPullRequests_desc];
  const availableFunctions = { listPullRequests: listPullRequests };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    tools: tools,
    tool_choice: "auto",
    stream: true,
  });

  response.data.on('data', async (data) => {
    const text = data.choices[0].delta?.content || '';
    if (text) {
      console.log(`stream - ${text}\n`)
      res.write(`data: ${text}\n\n`);
    }

    const responseMessage = data.choices[0].message;
    if (responseMessage) {
      const toolCalls = responseMessage.tool_calls;
      if (toolCalls) {
        messages.push(responseMessage);
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionToCall = availableFunctions[functionName];
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const functionResponse = await functionToCall(functionArgs);

          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: JSON.stringify(functionResponse),
          });
        }

        const secondResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          stream: true,
        });

        secondResponse.data.on('data', (data) => {
          const text = data.choices[0].delta?.content || '';
          if (text) {
            console.log(`stream - ${text}\n`)
            res.write(`data: ${text}\n\n`);
          }
        });

        secondResponse.data.on('end', () => {
          res.end();
        });

        secondResponse.data.on('error', (error) => {
          console.error(error);
          res.write(`data: ERROR\n\n`);
          res.end();
        });
      }
    }
  });

  response.data.on('end', () => {
    res.end();
  });

  response.data.on('error', (error) => {
    console.error(error);
    res.write(`data: ERROR\n\n`);
    res.end();
  });
}