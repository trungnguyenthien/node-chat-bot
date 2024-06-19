require('dotenv').config();
// import OpenAI from "openai";
const { OpenAI } = require("openai");

const {
  getPullRequestInfo,
  getPullRequestDetails,
  getPullRequestComments,
  getCommitsBetween,
  listPullRequests
} = require('./service/git')


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set the API key here
});

async function runConversation() {
  // Step 1: send the conversation and available functions to the model
  const messages = [
    { role: "user", content: "List the pull requests for the repo apple/swift with state open." },
  ];
  const tools = [
    {
      type: "function",
      function: {
        name: "listPullRequests",
        description: "Get the list of pull requests for a given repository with specific filters",
        parameters: {
          type: "object",
          properties: {
            owner: {
              type: "string",
              description: "The owner of the repository",
            },
            repo: {
              type: "string",
              description: "The name of the repository",
            },
            state: {
              type: "string",
              enum: ["all", "open", "closed"],
              description: "The state of the pull requests",
            },
            labels: {
              type: "string",
              description: "A comma-separated list of labels",
            },
            milestone: {
              type: "string",
              description: "The milestone of the pull requests",
            },
            per_page: {
              type: "integer",
              description: "The number of results per page",
            },
            page: {
              type: "integer",
              description: "The page number",
            },
          },
          required: ["owner", "repo"],
        },
      },
    },
  ];

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
    // Step 3: call the function
    const availableFunctions = {
      listPullRequests: listPullRequests,
    }; // only one function in this example, but you can have multiple
    messages.push(responseMessage); // extend conversation with assistant's reply
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionToCall = availableFunctions[functionName];
      const functionArgs = JSON.parse(toolCall.function.arguments);
      // console.log(functionArgs)
      const functionResponse = await functionToCall(
        functionArgs.owner,
        functionArgs.repo,
        functionArgs.state,
        functionArgs.labels,
        functionArgs.milestone,
        functionArgs.per_page,
        functionArgs.page
      );
      // messages.push({
      //   role: "assistant",
      //   content: JSON.stringify(response),
      // })
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
    return secondResponse.choices;
  }
}

runConversation().then(console.log).catch(console.error);

// //https://github.com/apple/swift/pull/74309
// async function main() {
//   console.log(await getPullRequestDetails('apple', 'swift', '74309'))
// }

// main()