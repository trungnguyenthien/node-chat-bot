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

async function handle_stream_response(response, res) {
  console.log(`handle_stream_response response`)
  let is_first_chunk = true
  let func_name = ""
  let func_arguments = ""
  let finish_reason = ""
  let call_id = ""
  let tool_calls = {}

  for await (const chunk of response) {
    console.log(`chunk = ${JSON.stringify(chunk)}`)

    if (!(chunk.choices[0] && chunk.choices[0].delta)) {
      continue
    }
    
    const choice0 = chunk.choices[0]
    const delta = choice0.delta
    if (is_first_chunk) {
      is_first_chunk = false
      if (delta.tool_calls) {
        func_name = delta.tool_calls[0].function.name
        call_id = delta.tool_calls[0].id

        tool_calls.id = call_id
        tool_calls.type = delta.tool_calls[0].type
        tool_calls.function = delta.tool_calls[0].function
      }
      continue
    }

    if (choice0.finish_reason) {
      finish_reason = choice0.finish_reason
      break
    }

    // From 2nd chunk
    if (func_name === "") {
      const [choice] = chunk.choices;
      const { content } = choice.delta;
      res.write(sse_message(content))
    } else {
      func_arguments += delta.tool_calls[0].function.arguments
      console.log(`finish_reason = ${JSON.stringify(func_arguments)}`)
    }
  }

  if (func_name === "") {
    return finish_reason
  }
  tool_calls.function.arguments = func_arguments
  return {
    id: call_id,
    function: func_name,
    arguments: JSON.parse(func_arguments),
    tool_calls: tool_calls
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
  let response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    tools: tools,
    stream: true,
    tool_choice: "auto",
  });

  let finish_reason = null
  finish_reason = await handle_stream_response(response, res)
  do {
    console.log(`enter do...while() .... ${JSON.stringify(finish_reason)}`)
    if (finish_reason.function) {
      const functionName = finish_reason.function
      const functionToCall = availableFunctions[functionName];
      const functionArgs = finish_reason.arguments;
      const functionResponse = await functionToCall(functionArgs);

      messages.push({
        role: "assistant",
        tool_calls: [finish_reason.tool_calls],
      })

      messages.push({
        tool_call_id: finish_reason.id,
        role: "tool",
        name: functionName,
        content: JSON.stringify(functionResponse),
      });

      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        tools: tools,
        stream: true,
        tool_choice: "auto",
      });
      console.log(`send next message = ${JSON.stringify(messages)}`)
      finish_reason = await handle_stream_response(response, res)
    }
  } while (finish_reason !== "stop")

  // while(isToolCall(response)) {
  //   const responseMessage = response.choices[0].message;
  //   const toolCalls = responseMessage.tool_calls;
  //   if (toolCalls) {
  //     messages.push(responseMessage); // extend conversation with assistant's reply
  //     for (const toolCall of toolCalls) {
  //       const functionName = toolCall.function.name;
  //       const functionToCall = availableFunctions[functionName];
  //       const functionArgs = JSON.parse(toolCall.function.arguments);
  //       const functionResponse = await functionToCall(functionArgs);

  //       messages.push({
  //         tool_call_id: toolCall.id,
  //         role: "tool",
  //         name: functionName,
  //         content: JSON.stringify(functionResponse),
  //       }); // extend conversation with function response
  //     }
  //     response = await openai.chat.completions.create({
  //       model: "gpt-4o",
  //       messages: messages,
  //       tools: tools,
  //       stream: true,
  //       tool_choice: "auto", 
  //     });
  //   }
  // }

  // for await (const chunk of response) {
  //   const [choice] = chunk.choices;
  //   const { content } = choice.delta;
  //   res.write(sse_message(content))
  // }
}

function isStopResponse(response) {
  return response.choices.finish_reason === 'stop'

}

function isToolCall(response) {
  const responseMessage = response.choices[0].message;
  // const toolCalls = responseMessage.tool_calls;
  if (responseMessage.tool_calls) {
    return true;
  }
  return false
}

function sse_message(data) {
  // console.log(`stream: ${data}`)
  return `data: ${textToBase64(data)}\n\n`
}

function textToBase64(text) {
  // Chuyển đổi text thành Buffer
  const buffer = Buffer.from(text, 'utf-8');

  // Chuyển đổi Buffer thành chuỗi base64
  return buffer.toString('base64');
}