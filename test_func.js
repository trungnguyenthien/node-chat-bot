// import { create } from 'lodash';
import { searchPullRequests } from './service/git.js'

const startServer = async () => {
  // {"owner":"apple","repo_name":"swift","state":"open","labels":["actor"],"group_field":"user"}
  let result = await searchPullRequests(JSON.parse(` {"owner":"swiftlang","repo_name":"swift" ,"group_field":"user_login", "state": "closed", "fields":["title"], "merged":"2024-04-01..2024-04-04", "need_pr_items_ingroup": true}`))
  let json = JSON.stringify(result, false, 4)
  
  console.log(json)
};

startServer();
/*
Lấy tất cả pull request trong repository swiftlang/swift. Yêu cầu:
- Pull Request được merge trong khoảng 2024-04-01 đến 2024-04-02
- Thông tin mỗi pull request cần lấy là title, number
- Gom nhóm theo user

Xuất hình ảnh bar chart thể hiện số pull request của mỗi user.
*/