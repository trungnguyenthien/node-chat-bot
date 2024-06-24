import { Octokit } from "@octokit/rest";
import _ from "lodash";

// Tạo một instance của Octokit với authentication token
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN, // Thay bằng token của bạn
  // baseUrl: "https://your-company-github-enterprise.com/api/v3", // Thay bằng URL của server GitHub riêng của bạn
});


// Hàm để lấy tất cả bình luận trong pull request
export async function getPullRequestComments(owner, repo, pullNumber) {
  try {
    // Gọi API để lấy tất cả bình luận trong pull request
    const { data } = await octokit.issues.listComments({
      owner: owner,
      repo: repo,
      issue_number: pullNumber,
    });

    // Hiển thị danh sách bình luận
    data.forEach(comment => {
      console.log(`Comment by ${comment.user.login}:`);
      console.log(comment.body);
      console.log("-----");
    });
  } catch (error) {
    console.error("Error fetching pull request comments: ", error);
  }
}

// Hàm để lấy tất cả commit giữa hai commit cụ thể
export async function getCommitsBetween(owner, repo, startCommit, endCommit) {
  try {
    // Gọi API để lấy danh sách commit
    const { data: commits } = await octokit.repos.compareCommits({
      owner: owner,
      repo: repo,
      base: startCommit,
      head: endCommit,
    });

    // Hiển thị danh sách commit
    commits.commits.forEach(commit => {
      console.log(`Commit: ${commit.sha}`);
      console.log(`Author: ${commit.commit.author.name}`);
      console.log(`Date: ${commit.commit.author.date}`);
      console.log(`Message: ${commit.commit.message}`);
      console.log("-----");
    });
  } catch (error) {
    console.error("Error fetching commits: ", error);
  }
}

// Hàm để lấy danh sách pull requests với các filter
export async function listPullRequests(functionArgs) {
  const owner = functionArgs.owner
  const repo = functionArgs.repo
  const state = functionArgs.state ?? 'open'
  const labels = functionArgs.labels ?? ''
  const milestone = functionArgs.milestone ?? ''
  const per_page = functionArgs.per_page ?? 30
  const page = functionArgs.page ?? 1

  try {
    const { data: pullRequests } = await octokit.pulls.list({
      owner: owner,
      repo: repo,
      state: state,
      labels: labels,
      milestone: milestone,
      per_page: per_page,
      page: page,
    });

    // Tạo array để lưu trữ các thông tin cần thiết của pull requests
    const pullRequestDetails = pullRequests.map(pr => ({
      html_url: pr.html_url,
      number: pr.number,
      state: pr.state,
      lock: pr.lock,
      title: pr.title,
      user_login: pr.user.login,
      body: pr.body,
      label_names: pr.labels.map(label => label.name),
      milestone: pr.milestone ? {
        id: pr.milestone.id,
        number: pr.milestone.number,
        description: pr.milestone.description,
        title: pr.milestone.title,
        state: pr.milestone.state,
      } : null,
      created_at: pr.created_at,
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      merge_commit_sha: pr.merge_commit_sha,
      head_ref: pr.head.ref,
      base_ref: pr.base.ref,
      assignees: pr.assignees.map(assignee => assignee.login),
      requested_reviewers: pr.requested_reviewers.map(reviewer => reviewer.login),
    }));
    console.log(`${JSON.stringify(functionArgs)}, result = ${pullRequestDetails.length}}`)
    return pullRequestDetails;
  } catch (error) {
    console.error("Error fetching pull requests: ", error);
    return null;
  }
}

export const listPullRequests_desc = {
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
}

export async function pr_info(functionArgs) {
  const owner = functionArgs.owner;
  const repo = functionArgs.repo;
  const pullNumber = functionArgs.pullNumber ?? '';
  const ignores = functionArgs.ignores ?? [];

  try {
    // Lấy thông tin pull request
    const { data: pullRequest } = await octokit.pulls.get({
      owner: owner,
      repo: repo,
      pull_number: pullNumber,
    });

    // Tạo object để lưu thông tin pull request
    const pullRequestInfo = {
      title: pullRequest.title,
      user: pullRequest.user.login,
      state: pullRequest.state,
      created_at: pullRequest.created_at,
      merged_at: pullRequest.merged_at,
      closed_at: pullRequest.closed_at,
      diff_url: pullRequest.diff_url,
      body: pullRequest.body,
      mergeable: pullRequest.mergeable,
      merged: pullRequest.merged,
      labels: pullRequest.labels.map(lb => ({ name: lb.name, id: lb.id }))
    };

    if (!ignores.includes("commits")) {
      // Lấy danh sách commit trong pull request
      const { data: commits } = await octokit.pulls.listCommits({
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
      });

      // Tạo array để lưu thông tin các commit
      pullRequestInfo.commits = await Promise.all(commits.map(async commit => {
        let files = [];

        if (!ignores.includes("commit_files")) {
          // Lấy chi tiết commit để lấy thông tin về file changes
          const { data: commitDetails } = await octokit.repos.getCommit({
            owner: owner,
            repo: repo,
            ref: commit.sha,
          });

          // Tạo array để lưu thông tin các file thay đổi trong commit
          files = commitDetails.files.map(file => ({
            filename: file.filename,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            status: file.status,
          }));
        }

        return {
          sha: commit.sha,
          author: commit.commit.author.name,
          date: commit.commit.author.date,
          message: commit.commit.message,
          files: files,
        };
      }));
    }

    // Trả về object chứa thông tin pull request và danh sách commit (nếu có)
    return pullRequestInfo;
  } catch (error) {
    console.error("Error fetching pull request info: ", error);
    return null;
  }
}



// Hàm để lấy thông tin chi tiết về pull request
export async function getPullRequestDetails(owner, repo, pullNumber) {
  try {
    // Lấy thông tin cơ bản về pull request
    const { data: pullRequest } = await octokit.pulls.get({
      owner: owner,
      repo: repo,
      pull_number: pullNumber,
    });

    let response = {};

    // Lấy các commit của pull request
    const { data: commits } = await octokit.pulls.listCommits({
      owner: owner,
      repo: repo,
      pull_number: pullNumber,
    });

    // Tổng số dòng code thêm và xóa của pull request
    const additions = pullRequest.additions;
    const deletions = pullRequest.deletions;

    response.title = pullRequest.title;
    response.description = pullRequest.body;
    response.state = pullRequest.state;
    response.created_at = pullRequest.created_at;
    response.closed_at = pullRequest.closed_at;
    response.merged_at = pullRequest.merged_at;
    response.base_branch = pullRequest.base.ref;
    response.head_branch = pullRequest.head.ref;
    response.assignee = pullRequest.assignee ? pullRequest.assignee.login : 'None';
    response.milestone = pullRequest.milestone ? pullRequest.milestone.title : 'None';
    response.additions = additions;
    response.deletions = deletions;

    response.commits = [];
    // Hiển thị các commit của pull request
    for (const commit of commits) {
      const { data: commitDetails } = await octokit.repos.getCommit({
        owner: owner,
        repo: repo,
        ref: commit.sha,
      });

      response.commits.push({
        id: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        additions: commitDetails.stats.additions,
        deletions: commitDetails.stats.deletions,
        html_url: commit.html_url,
      });
    }

    // Lấy các issue comments của pull request (comments trong phần "Conversation")
    const { data: issueComments } = await octokit.issues.listComments({
      owner: owner,
      repo: repo,
      issue_number: pullNumber,
    });

    response.conversations = issueComments.map(comment => ({
      body: comment.body,
      author: comment.user.login,
      created_at: comment.created_at,
      html_url: comment.html_url,
    }));

    // Lấy các review comments của pull request (comments trong phần "Files changed")
    const { data: reviewComments } = await octokit.pulls.listReviewComments({
      owner: owner,
      repo: repo,
      pull_number: pullNumber,
    });

    response.comments = reviewComments.map(comment => ({
      id: comment.id,
      body: comment.body,
      author: comment.user.login,
      created_at: comment.created_at,
      path: comment.path,
      position: comment.position,
      html_url: comment.html_url,
      replies: [],
    }));

    // Lấy các phản hồi qua lại của các review comments
    for (const reviewComment of response.comments) {
      const { data: replies } = await octokit.pulls.listReviewCommentReplies({
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        comment_id: reviewComment.id,
      });

      reviewComment.replies = replies.map(reply => ({
        body: reply.body,
        author: reply.user.login,
        created_at: reply.created_at,
        path: reply.path,
        position: reply.position,
        html_url: reply.html_url,
      }));
    }

    return response;

  } catch (error) {
    console.error("Error fetching pull request details: ", error);
    return null;
  }
}


export async function searchPullRequests(functionArgs) {
  // const q = functionArgs.q
  const owner = 'apple'
  const repo_name = 'swift'

  const fields = [
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
  ]

  const group_field = `label_names`

  const need_pr_items_ingroup = false

  const PER_PAGE = 100
  let start_page = 1

  try {
    let all_prs = []

    while (true) {
      const response = await octokit.search.issuesAndPullRequests({
        q: '"bug"+is:issue+repos:"apple/swift"+created:>=2023-01-01',
        sort: 'created',
        order: 'desc',
        page: start_page,        // Trang đầu tiên
        per_page: PER_PAGE,   // Số lượng kết quả mỗi trang
      });
      console.log(`GET PAGE ${start_page}, result = ${response.data.items.length}`)

      // Tạo array để lưu trữ các thông tin cần thiết của pull requests
      let pullRequestDetails = response.data.items.map(pr => ({
        html_url: pr.html_url,
        number: pr.number,
        state: pr.state,
        lock: pr.lock,
        title: pr.title,
        user_login: pr.user.login,
        body: pr.body,
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

      
      // console.log(JSON.stringify(`pullRequestDetails = ${pullRequestDetails}`))

      all_prs.push(...pullRequestDetails)
      if (pullRequestDetails.length < PER_PAGE) {
        break
      }
      start_page += 1
    }

    console.log(`${JSON.stringify(functionArgs)}, result = ${all_prs.length}}`)

    if(group_field === '') {
      fields.forEach( field => (
        all_prs = all_prs.map(obj => _.omit(obj, field))
      ))
      return all_prs;
    }
    
    const group_pr_items = _.mapValues(_.groupBy(all_prs, group_field), (pr_items) => {
      fields.forEach( field => (
        pr_items = pr_items.map(obj => _.omit(obj, field))
      ))
      return need_pr_items_ingroup ? {
        total: pr_items.length,
        pr_items: pr_items
      } : {
        total: pr_items.length
      }
    });
    return group_pr_items;
  } catch (error) {
    console.error("Error fetching pull requests: ", error);
    return null;
  }
}

async function fetchPullRequestDetails(owner, repo, pull_number) {
  try {
    const response = await octokit.pulls.get({
      owner,
      repo,
      pull_number,
    });

    return {
      additions: response.data.additions,
      deletions: response.data.deletions,
    };
  } catch (error) {
    console.error(`Error fetching details for PR #${pull_number}: `, error);
    return {
      additions: 0,
      deletions: 0,
    };
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}