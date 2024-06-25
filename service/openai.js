import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

import {
  // pr_info,
  // getPullRequestDetails,
  // getPullRequestComments,
  // getCommitsBetween,
  // listPullRequests,
  // listPullRequests_desc,
  searchPullRequests_desc,
  searchPullRequests
} from './git.js'

import {
  register_chart,
  register_chart_desc
} from './gen_chart.js'

const tools = [
  searchPullRequests_desc,
  register_chart_desc
];
const availableFunctions = {
  searchPullRequests: searchPullRequests,
  register_chart: register_chart
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set the API key here
});

// export async function requestWithFunctions(requestMessage) {
//   // Step 1: send the conversation and available functions to the model
//   const messages = [
//     { role: "user", content: requestMessage },
//   ];
//   const tools = [
//     listPullRequests_desc,
//   ];
//   const availableFunctions = {
//     listPullRequests: listPullRequests,
//   };

//   const response = await openai.chat.completions.create({
//     model: "gpt-4o",
//     messages: messages,
//     tools: tools,
//     tool_choice: "auto", // auto is default, but we'll be explicit
//   });
//   const responseMessage = response.choices[0].message;
//   // Step 2: check if the model wanted to call a function
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
//     const secondResponse = await openai.chat.completions.create({
//       model: "gpt-4o",
//       messages: messages,
//     }); // get a new response from the model where it can see the function response
//     return secondResponse.choices[0].message.content;
//   }
// }

async function handle_stream_response(response, res) {
  let is_first_chunk = true
  let func_name = ""
  let func_arguments = ""
  let finish_reason = ""
  let call_id = ""
  let tool_calls = {}

  for await (const chunk of response) {
    if (!(chunk.choices[0] && chunk.choices[0].delta)) {
      continue
    }
    
    const choice0 = chunk.choices[0]
    const delta = choice0.delta
    
    if (choice0.finish_reason) {
      finish_reason = choice0.finish_reason
      break
    }

    if(delta && delta.tool_calls && delta.tool_calls[0] && delta.tool_calls[0].function && delta.tool_calls[0].function.name) {
      let new_func_name = delta.tool_calls[0].function.name
      func_name = new_func_name
      call_id = delta.tool_calls[0].id
      func_arguments = ""

      tool_calls.id = call_id
      tool_calls.type = delta.tool_calls[0].type
      tool_calls.function = delta.tool_calls[0].function
      continue
    }

    if(delta && delta.tool_calls && delta.tool_calls[0] && delta.tool_calls[0].function && delta.tool_calls[0].function.arguments) {
      func_arguments += delta.tool_calls[0].function.arguments
      continue
    } 
    
    if (delta && delta.content) {
      res.write(sse_message(delta.content))
    } else {
      const [choice] = chunk.choices;
      const { content } = choice.delta;
      // console.log(`func_name = ${func_name}`)
      // console.log(`chunk = ${JSON.stringify(chunk)}`)
      res.write(sse_message(content))
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
    { role: "system", content: `You are an assistant that supports data analysis from Github and Jira.
You are not responsible for answering any questions beyond issues related to Github and Jira data.
The content you return should be displayed in markdown format, including tables and images.
If the user requests to draw charts, use the provided "register_chart" function, return the image URL, and display it in markdown.
` },
    { role: "user", content: requestMessage },
  ];
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
      finish_reason = await handle_stream_response(response, res)
    }
  } while (finish_reason !== "stop")
}

function sse_message(data) {
  return `data: ${textToBase64(data)}\n\n`
}

function textToBase64(text) {
  try {
    const buffer = Buffer.from(text, 'utf-8');
    return buffer.toString('base64');
  } catch (error) {
    // console.log(`ERROR TEXT = ${text}`)
  }
}