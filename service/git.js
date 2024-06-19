const { Octokit } = require("@octokit/rest");

// Tạo một instance của Octokit với authentication token
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN, // Thay bằng token của bạn
  // baseUrl: "https://your-company-github-enterprise.com/api/v3", // Thay bằng URL của server GitHub riêng của bạn
});


// Hàm để lấy tất cả bình luận trong pull request
async function getPullRequestComments(owner, repo, pullNumber) {
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
async function getCommitsBetween(owner, repo, startCommit, endCommit) {
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
async function listPullRequests(owner, repo, state = 'open', labels = '', milestone = '', per_page = 30, page = 1) {
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

    return pullRequestDetails;
  } catch (error) {
    console.error("Error fetching pull requests: ", error);
    return null;
  }
}

// Hàm để lấy thông tin pull request và danh sách commit
async function getPullRequestInfo(owner, repo, pullNumber) {
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
    };

    // Lấy danh sách commit trong pull request
    const { data: commits } = await octokit.pulls.listCommits({
      owner: owner,
      repo: repo,
      pull_number: pullNumber,
    });

    // Tạo array để lưu thông tin các commit
    const commitList = commits.map(commit => ({
      sha: commit.sha,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      message: commit.commit.message,
    }));

    // Trả về object chứa thông tin pull request và danh sách commit
    return {
      pullRequestInfo,
      commitList,
    };
  } catch (error) {
    console.error("Error fetching pull request info: ", error);
    return null;
  }
}

// Hàm để lấy thông tin chi tiết về pull request
async function getPullRequestDetails(owner, repo, pullNumber) {
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


module.exports = {
  getPullRequestInfo,
  getPullRequestDetails,
  getPullRequestComments,
  getCommitsBetween,
  listPullRequests
};