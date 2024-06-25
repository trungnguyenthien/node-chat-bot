import { Octokit } from "@octokit/rest";
import _ from "lodash";

// Tạo một instance của Octokit với authentication token
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN, // Thay bằng token của bạn
  // baseUrl: "https://your-company-github-enterprise.com/api/v3", // Thay bằng URL của server GitHub riêng của bạn
});


// // Hàm để lấy tất cả bình luận trong pull request
// export async function getPullRequestComments(owner, repo, pullNumber) {
//   try {
//     // Gọi API để lấy tất cả bình luận trong pull request
//     const { data } = await octokit.issues.listComments({
//       owner: owner,
//       repo: repo,
//       issue_number: pullNumber,
//     });

//     // Hiển thị danh sách bình luận
//     data.forEach(comment => {
//       console.log(`Comment by ${comment.user.login}:`);
//       console.log(comment.body);
//       console.log("-----");
//     });
//   } catch (error) {
//     console.error("Error fetching pull request comments: ", error);
//   }
// }

// // Hàm để lấy tất cả commit giữa hai commit cụ thể
// export async function getCommitsBetween(owner, repo, startCommit, endCommit) {
//   try {
//     // Gọi API để lấy danh sách commit
//     const { data: commits } = await octokit.repos.compareCommits({
//       owner: owner,
//       repo: repo,
//       base: startCommit,
//       head: endCommit,
//     });

//     // Hiển thị danh sách commit
//     commits.commits.forEach(commit => {
//       console.log(`Commit: ${commit.sha}`);
//       console.log(`Author: ${commit.commit.author.name}`);
//       console.log(`Date: ${commit.commit.author.date}`);
//       console.log(`Message: ${commit.commit.message}`);
//       console.log("-----");
//     });
//   } catch (error) {
//     console.error("Error fetching commits: ", error);
//   }
// }

// // Hàm để lấy danh sách pull requests với các filter
// export async function listPullRequests(functionArgs) {
//   const owner = functionArgs.owner
//   const repo = functionArgs.repo
//   const state = functionArgs.state ?? 'open'
//   const labels = functionArgs.labels ?? ''
//   const milestone = functionArgs.milestone ?? ''
//   const per_page = functionArgs.per_page ?? 30
//   const page = functionArgs.page ?? 1

//   try {
//     const { data: pullRequests } = await octokit.pulls.list({
//       owner: owner,
//       repo: repo,
//       state: state,
//       labels: labels,
//       milestone: milestone,
//       per_page: per_page,
//       page: page,
//     });

//     // Tạo array để lưu trữ các thông tin cần thiết của pull requests
//     const pullRequestDetails = pullRequests.map(pr => ({
//       html_url: pr.html_url,
//       number: pr.number,
//       state: pr.state,
//       lock: pr.lock,
//       title: pr.title,
//       user_login: pr.user.login,
//       body: pr.body,
//       label_names: pr.labels.map(label => label.name),
//       milestone: pr.milestone ? {
//         id: pr.milestone.id,
//         number: pr.milestone.number,
//         description: pr.milestone.description,
//         title: pr.milestone.title,
//         state: pr.milestone.state,
//       } : null,
//       created_at: pr.created_at,
//       closed_at: pr.closed_at,
//       merged_at: pr.merged_at,
//       merge_commit_sha: pr.merge_commit_sha,
//       head_ref: pr.head.ref,
//       base_ref: pr.base.ref,
//       assignees: pr.assignees.map(assignee => assignee.login),
//       requested_reviewers: pr.requested_reviewers.map(reviewer => reviewer.login),
//     }));
//     console.log(`${JSON.stringify(functionArgs)}, result = ${pullRequestDetails.length}}`)
//     return pullRequestDetails;
//   } catch (error) {
//     console.error("Error fetching pull requests: ", error);
//     return null;
//   }
// }

// export const listPullRequests_desc = {
//   type: "function",
//   function: {
//     name: "listPullRequests",
//     description: "Get the list of pull requests for a given repository with specific filters",
//     parameters: {
//       type: "object",
//       properties: {
//         owner: {
//           type: "string",
//           description: "The owner of the repository",
//         },
//         repo: {
//           type: "string",
//           description: "The name of the repository",
//         },
//         state: {
//           type: "string",
//           enum: ["all", "open", "closed"],
//           description: "The state of the pull requests",
//         },
//         labels: {
//           type: "string",
//           description: "A comma-separated list of labels",
//         },
//         milestone: {
//           type: "string",
//           description: "The milestone of the pull requests",
//         },
//         per_page: {
//           type: "integer",
//           description: "The number of results per page",
//         },
//         page: {
//           type: "integer",
//           description: "The page number",
//         },
//       },
//       required: ["owner", "repo"],
//     },
//   },
// }

// export async function pr_info(functionArgs) {
//   const owner = functionArgs.owner;
//   const repo = functionArgs.repo;
//   const pullNumber = functionArgs.pullNumber ?? '';
//   const ignores = functionArgs.ignores ?? [];

//   try {
//     // Lấy thông tin pull request
//     const { data: pullRequest } = await octokit.pulls.get({
//       owner: owner,
//       repo: repo,
//       pull_number: pullNumber,
//     });

//     // Tạo object để lưu thông tin pull request
//     const pullRequestInfo = {
//       title: pullRequest.title,
//       user: pullRequest.user.login,
//       state: pullRequest.state,
//       created_at: pullRequest.created_at,
//       merged_at: pullRequest.merged_at,
//       closed_at: pullRequest.closed_at,
//       diff_url: pullRequest.diff_url,
//       body: pullRequest.body,
//       mergeable: pullRequest.mergeable,
//       merged: pullRequest.merged,
//       labels: pullRequest.labels.map(lb => ({ name: lb.name, id: lb.id }))
//     };

//     if (!ignores.includes("commits")) {
//       // Lấy danh sách commit trong pull request
//       const { data: commits } = await octokit.pulls.listCommits({
//         owner: owner,
//         repo: repo,
//         pull_number: pullNumber,
//       });

//       // Tạo array để lưu thông tin các commit
//       pullRequestInfo.commits = await Promise.all(commits.map(async commit => {
//         let files = [];

//         if (!ignores.includes("commit_files")) {
//           // Lấy chi tiết commit để lấy thông tin về file changes
//           const { data: commitDetails } = await octokit.repos.getCommit({
//             owner: owner,
//             repo: repo,
//             ref: commit.sha,
//           });

//           // Tạo array để lưu thông tin các file thay đổi trong commit
//           files = commitDetails.files.map(file => ({
//             filename: file.filename,
//             additions: file.additions,
//             deletions: file.deletions,
//             changes: file.changes,
//             status: file.status,
//           }));
//         }

//         return {
//           sha: commit.sha,
//           author: commit.commit.author.name,
//           date: commit.commit.author.date,
//           message: commit.commit.message,
//           files: files,
//         };
//       }));
//     }

//     // Trả về object chứa thông tin pull request và danh sách commit (nếu có)
//     return pullRequestInfo;
//   } catch (error) {
//     console.error("Error fetching pull request info: ", error);
//     return null;
//   }
// }



// // Hàm để lấy thông tin chi tiết về pull request
// export async function getPullRequestDetails(owner, repo, pullNumber) {
//   try {
//     // Lấy thông tin cơ bản về pull request
//     const { data: pullRequest } = await octokit.pulls.get({
//       owner: owner,
//       repo: repo,
//       pull_number: pullNumber,
//     });

//     let response = {};

//     // Lấy các commit của pull request
//     const { data: commits } = await octokit.pulls.listCommits({
//       owner: owner,
//       repo: repo,
//       pull_number: pullNumber,
//     });

//     // Tổng số dòng code thêm và xóa của pull request
//     const additions = pullRequest.additions;
//     const deletions = pullRequest.deletions;

//     response.title = pullRequest.title;
//     response.description = pullRequest.body;
//     response.state = pullRequest.state;
//     response.created_at = pullRequest.created_at;
//     response.closed_at = pullRequest.closed_at;
//     response.merged_at = pullRequest.merged_at;
//     response.base_branch = pullRequest.base.ref;
//     response.head_branch = pullRequest.head.ref;
//     response.assignee = pullRequest.assignee ? pullRequest.assignee.login : 'None';
//     response.milestone = pullRequest.milestone ? pullRequest.milestone.title : 'None';
//     response.additions = additions;
//     response.deletions = deletions;

//     response.commits = [];
//     // Hiển thị các commit của pull request
//     for (const commit of commits) {
//       const { data: commitDetails } = await octokit.repos.getCommit({
//         owner: owner,
//         repo: repo,
//         ref: commit.sha,
//       });

//       response.commits.push({
//         id: commit.sha,
//         message: commit.commit.message,
//         author: commit.commit.author.name,
//         additions: commitDetails.stats.additions,
//         deletions: commitDetails.stats.deletions,
//         html_url: commit.html_url,
//       });
//     }

//     // Lấy các issue comments của pull request (comments trong phần "Conversation")
//     const { data: issueComments } = await octokit.issues.listComments({
//       owner: owner,
//       repo: repo,
//       issue_number: pullNumber,
//     });

//     response.conversations = issueComments.map(comment => ({
//       body: comment.body,
//       author: comment.user.login,
//       created_at: comment.created_at,
//       html_url: comment.html_url,
//     }));

//     // Lấy các review comments của pull request (comments trong phần "Files changed")
//     const { data: reviewComments } = await octokit.pulls.listReviewComments({
//       owner: owner,
//       repo: repo,
//       pull_number: pullNumber,
//     });

//     response.comments = reviewComments.map(comment => ({
//       id: comment.id,
//       body: comment.body,
//       author: comment.user.login,
//       created_at: comment.created_at,
//       path: comment.path,
//       position: comment.position,
//       html_url: comment.html_url,
//       replies: [],
//     }));

//     // Lấy các phản hồi qua lại của các review comments
//     for (const reviewComment of response.comments) {
//       const { data: replies } = await octokit.pulls.listReviewCommentReplies({
//         owner: owner,
//         repo: repo,
//         pull_number: pullNumber,
//         comment_id: reviewComment.id,
//       });

//       reviewComment.replies = replies.map(reply => ({
//         body: reply.body,
//         author: reply.user.login,
//         created_at: reply.created_at,
//         path: reply.path,
//         position: reply.position,
//         html_url: reply.html_url,
//       }));
//     }

//     return response;

//   } catch (error) {
//     console.error("Error fetching pull request details: ", error);
//     return null;
//   }
// }


// Thực hiện search pull request
export async function searchPullRequests(functionArgs) {
  console.log(`functionArgs = ${JSON.stringify(functionArgs)}`)
  // Display Param
  const fields = functionArgs.fields ?? [] // (Array String) Các field sẽ được trả về trong response, giá trị của các field gồm có
  // 'state' => Trạng thái open/closed
  // 'title' =>  Title pr
  // 'user_login' => ID của user tạo pr
  // 'body' => Description của pr
  // 'label_names' => Labels
  // 'milestone' => Milestone
  // 'created_at' => Thời gian tạo
  // 'closed_at' => Thời gian closed
  // 'merged_at' => Thời gian merge
  // 'assignees' => Đối tượng được assignee
  // 'html_url' => URL của pr
  // 'comments' => Số comment trong pr
  const group_field = functionArgs.group_field ?? ``  // (String) cho phép group các pull request lại theo các field của tham số field
  const need_pr_items_ingroup = functionArgs.need_pr_items_ingroup ?? false // (Boolean) False: Kết quả trả về KHÔNG CÓ thông tin chi tiết các pull request trong group.

  // SEARCH PARAM
  const owner = functionArgs.owner ?? 'apple' // (String) Chỉ định owner cụ thể
  const repo_name = functionArgs.repo_name ?? 'swift' // (String) Chỉ định repository cụ thể của owner
  const authors = functionArgs.authors ?? [] // (Array String) Lọc pull request theo tác giả.
  const assignees = functionArgs.assignees ?? [] // (Array String) Lọc pull request theo người được giao nhiệm vụ.
  const labels = functionArgs.labels ?? [] // (Array String) Lọc pull request theo nhãn (label).
  const mentions = functionArgs.mentions ?? [] // (Array String) Lọc pull request theo người được nhắc đến.
  const keyword = functionArgs.keyword ?? null // (String) Keyword cần search theo title và body của pull request
  const created = functionArgs.created ?? null // (String) Lọc pull request theo khoảng thời gian tạo, Ví dụ: 2023-01-01 (ngày xác định), 2023-01-01..2023-12-31 (trong khoảng thời gian), >=2023-01-01 (từ ngày xác định)
  const updated = functionArgs.updated ?? null // (String) Lọc pull request theo khoảng thời gian cập nhật (Giá trị tham số giống tham số `created`)
  const merged = functionArgs.merged ?? null // (String) Lọc pull request theo khoảng thời gian merge. (Giá trị tham số giống tham số `created`)
  const milestone = functionArgs.milestone ?? null // (String) Lọc pull request theo milestone.
  const state = functionArgs.state ?? null // (String) Lọc pull request theo state (open / closed).
  
  // ----------------------
  let hidden_fields = [
    'state', 
    'title',
    'user_login',
    'body',
    'label_names',
    'milestone',
    'created_at',
    'closed_at',
    'merged_at',
    'assignees',
    'html_url',
    'comments',
  ]
  console.log(`hidden_fields1 = ${JSON.stringify(hidden_fields)}`)
  console.log(`fields = ${JSON.stringify(fields)}`)
  hidden_fields = _.difference(hidden_fields, fields)
  console.log(`hidden_fields2 = ${JSON.stringify(hidden_fields)}`)

  const PER_PAGE = 100
  let start_page = 1

  let queryBuilder = []

  if(keyword) {
    queryBuilder.push(`"${keyword}"`)
  }

  queryBuilder.push(`type:pr`)
  queryBuilder.push(`repo:"${owner}/${repo_name}"`)

  merge_or(queryBuilder, authors, `author`, true)
  merge_or(queryBuilder, assignees, `assignee`, true)
  merge_or(queryBuilder, mentions, `mentions`, true)
  merge_or(queryBuilder, labels, `label`, true)
  merge_or(queryBuilder, authors, `author`, true)

  if(created) {
    queryBuilder.push(`created:${created}`)
  }

  if(updated) {
    queryBuilder.push(`updated:${updated}`)
  }

  if(merged) {
    queryBuilder.push(`merged:${merged}`)
  }

  if(milestone) {
    queryBuilder.push(`milestone:${milestone}`)
  }

  if(state) {
    queryBuilder.push(`state:${state}`)
  }

  let queryString = queryBuilder.join(' ')
  console.log(queryString)

  try {
    let all_prs = []

    while (true) {
      const response = await octokit.search.issuesAndPullRequests({
        q: queryString,
        page: start_page,     // Trang đầu tiên
        per_page: PER_PAGE,   // Số lượng kết quả mỗi trang
      });

      // Tạo array để lưu trữ các thông tin cần thiết của pull requests
      let pullRequestDetails = response.data.items.map(pr => ({
        html_url: pr.html_url,
        number: pr.number,
        state: pr.state,
        lock: pr.lock,
        title: pr.title,
        user_login: pr.user.login,
        body: pr.body,
        comments: pr.comments,
        label_names: pr.labels.map(label => label.name),
        milestone: pr.milestone ? {
          id: pr.milestone.id,
          number: pr.milestone.number,
          description: pr.milestone.description,
          title: pr.milestone.title,
          state: pr.milestone.state,
        } : null,
        created_at: convertDateString(pr.created_at),
        closed_at: convertDateString(pr.closed_at),
        merged_at: convertDateString(pr.merged_at),
        merge_commit_sha: pr.merge_commit_sha,
        assignees: pr.assignees.map(assignee => assignee.login),
      }));

      console.log(`pullRequestDetails = ${pullRequestDetails.length}`)

      all_prs.push(...pullRequestDetails)
      if (pullRequestDetails.length < PER_PAGE) {
        break
      }
      start_page += 1
    }

    if(group_field === '') {
      hidden_fields.forEach( field => (
        all_prs = all_prs.map(obj => _.omit(obj, field))
      ))
      return all_prs;
    }
    
    const group_pr_items = _.mapValues(_.groupBy(all_prs, group_field), (pr_items) => {
      hidden_fields.forEach( field => (
        pr_items = pr_items.map(obj => _.omit(obj, field))
      ))
      return need_pr_items_ingroup ? {
        total: pr_items.length,
        pr_items: pr_items
      } : {
        total: pr_items.length
      }
    });
    console.log(`group_pr_items = ${JSON.stringify(group_pr_items)}`)
    return group_pr_items;
  } catch (error) {
    console.error("Error fetching pull requests: ", error);
    return null;
  }
}

function merge_or(builder, array, key, quote = false) {
  if(!array || array.length == 0) {
    return
  }
  let copyArray = array.map(e => {
    return quote ? `"${e}"` : e
  })


  if(array.length == 1) {
    builder.push(`${key}:${copyArray[0]}`)
  } else {
    builder.push( "(" + copyArray.map(a => `${key}:${a}`).join(' OR ') + ")")
  }
}

function convertDateString(dateString) {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch (error) {
    return null
  }
}

export const searchPullRequests_desc = {
  type: "function",
  function: {
    name: "searchPullRequests",
    description: "Search pull requests for a given repository with specific filters",
    parameters: {
      type: "object",
      properties: {
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Array of fields to be returned in the response. Possible values include: 'state', 'title', 'user_login', 'body', 'label_names', 'milestone', 'created_at', 'closed_at', 'merged_at', 'assignees', 'html_url', 'comments'.",
        },
        group_field: {
          type: "string",
          description: "Field by which to group the pull requests.",
        },
        need_pr_items_ingroup: {
          type: "boolean",
          description: "False: Results do not include detailed pull request information within the group.",
        },
        owner: {
          type: "string",
          description: "Specify a specific owner. Default is 'apple'.",
        },
        repo_name: {
          type: "string",
          description: "Specify a specific repository of the owner. Default is 'swift'.",
        },
        authors: {
          type: "array",
          items: { type: "string" },
          description: "Filter pull requests by author.",
        },
        assignees: {
          type: "array",
          items: { type: "string" },
          description: "Filter pull requests by assignee.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Filter pull requests by labels.",
        },
        mentions: {
          type: "array",
          items: { type: "string" },
          description: "Filter pull requests by mentions.",
        },
        keyword: {
          type: "string",
          description: "Keyword to search in the title and body of the pull requests.",
        },
        created: {
          type: "string",
          description: "Filter pull requests by creation date. Example values: '2023-01-01' (specific date), '2023-01-01..2023-12-31' (date range), '>=2023-01-01' (from specific date).",
        },
        updated: {
          type: "string",
          description: "Filter pull requests by update date. Same format as 'created' parameter.",
        },
        merged: {
          type: "string",
          description: "Filter pull requests by merge date. Same format as 'created' parameter.",
        },
        milestone: {
          type: "string",
          description: "Filter pull requests by milestone.",
        },
        state: {
          type: "string",
          enum: ["all", "open", "closed"],
          description: "Filter pull requests by state (open / closed).",
        },
      },
      required: ["owner", "repo_name"],
    },
  },
}
