import { Octokit } from "@octokit/rest";
import _ from "lodash";

// Tạo một instance của Octokit với authentication token
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN, // Thay bằng token của bạn
  // baseUrl: "https://your-company-github-enterprise.com/api/v3", // Thay bằng URL của server GitHub riêng của bạn
});

// Thực hiện search pull request
export async function searchPullRequests(functionArgs) {
  console.log(`functionArgs = ${JSON.stringify(functionArgs)}`)
  // Display Param
  const fields = _.defaultTo(functionArgs.fields, []) // (Array String) Các field sẽ được trả về trong response, giá trị của các field gồm có
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
  const group_field =  _.defaultTo( functionArgs.group_field, ``)  // (String) cho phép group các pull request lại theo các field của tham số field
  const need_pr_items_ingroup =  _.defaultTo(functionArgs.need_pr_items_ingroup, true) // (Boolean) False: Kết quả trả về KHÔNG CÓ thông tin chi tiết các pull request trong group.

  // SEARCH PARAM
  const owner =  _.defaultTo(functionArgs.owner, '') // (String) Chỉ định owner cụ thể
  const repo_name =  _.defaultTo(functionArgs.repo_name, '') // (String) Chỉ định repository cụ thể của owner
  const authors =  _.defaultTo(functionArgs.authors, []) // (Array String) Lọc pull request theo tác giả.
  const assignees =  _.defaultTo(functionArgs.assignees, []) // (Array String) Lọc pull request theo người được giao nhiệm vụ.
  const labels =  _.defaultTo(functionArgs.labels, []) // (Array String) Lọc pull request theo nhãn (label).
  const mentions =  _.defaultTo(functionArgs.mentions, []) // (Array String) Lọc pull request theo người được nhắc đến.
  const keyword =  _.defaultTo(functionArgs.keyword, null) // (String) Keyword cần search theo title và body của pull request
  const created =  _.defaultTo(functionArgs.created, null) // (String) Lọc pull request theo khoảng thời gian tạo, Ví dụ: 2023-01-01 (ngày xác định), 2023-01-01..2023-12-31 (trong khoảng thời gian), >=2023-01-01 (từ ngày xác định)
  const updated =  _.defaultTo(functionArgs.updated, null) // (String) Lọc pull request theo khoảng thời gian cập nhật (Giá trị tham số giống tham số `created`)
  const merged =  _.defaultTo(functionArgs.merged, null) // (String) Lọc pull request theo khoảng thời gian merge. (Giá trị tham số giống tham số `created`)
  const milestone =  _.defaultTo(functionArgs.milestone, null) // (String) Lọc pull request theo milestone.
  const state =  _.defaultTo(functionArgs.state, null) // (String) Lọc pull request theo state (open / closed).
  
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
  // console.log(`hidden_fields1 = ${JSON.stringify(hidden_fields)}`)
  // console.log(`fields = ${JSON.stringify(fields)}`)
  hidden_fields = _.difference(hidden_fields, fields)
  // console.log(`hidden_fields2 = ${JSON.stringify(hidden_fields)}`)

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
        milestone: pr.milestone ? pr.milestone.title : "[none]",
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
    builder.push( "(" + copyArray.map(a => `${key}:${a}`).join(' ') + ")")
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
          description: "Specify a specific owner. Default is ''.",
        },
        repo_name: {
          type: "string",
          description: "Specify a specific repository of the owner. Default is ''.",
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
