import { pr_info } from './service/git.js'

const startServer = async () => {
  let result = await pr_info({
    owner: "flutter",
    repo: "flutter",
    pullNumber: "150669",
    ignores: ['commits']
  })
  let json = JSON.stringify(result, false, 4)
  
  console.log(json)
};

startServer();