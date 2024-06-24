import { pr_info, searchPullRequests } from './service/git.js'

const startServer = async () => {
  let result = await searchPullRequests()
  let json = JSON.stringify(result, false, 4)
  
  console.log(json)
};

startServer();