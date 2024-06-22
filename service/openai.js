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
} from './git.js'

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


export async function streamWithFunctions2(requestMessage, res) {
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
      stream: true
    }); // get a new response from the model where it can see the function response

    for await (const chunk of secondResponse) {
      const [choice] = chunk.choices;
      const { content } = choice.delta;
      res.write(sse_message(content))
    }
  }
}

function sse_message(data) {
  console.log(`stream: ${data}`)
  return `data: ${textToBase64(data)}\n\n`
}

function textToBase64(text) {
  // Chuyển đổi text thành Buffer
  const buffer = Buffer.from(text, 'utf-8');
  
  // Chuyển đổi Buffer thành chuỗi base64
  return buffer.toString('base64');
}