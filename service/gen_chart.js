import fetch from 'node-fetch';

const chart_url = 'https://genchart-23041f34af27.herokuapp.com/chart'
const error_image_url = `https://placehold.co/800x500?text=Error+Chart&font=roboto`

export async function register_chart(func_arguments) {
  let json = JSON.stringify(func_arguments.chart_script)
  console.log(`chart_script = ${json}`)

  let post_body = { type: null, data: null }
  post_body.type = func_arguments.chart_script.type
  post_body.data = func_arguments.chart_script.data

  console.log(`post_body = ${JSON.stringify(post_body)}`)
  try {
    // Thực hiện phương thức POST đến endpoint
    const response = await fetch(chart_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: func_arguments.chart_script
    });

    // Kiểm tra nếu phản hồi thành công
    if (!response.ok) {
      return error_image_url
    }

    // Lấy dữ liệu JSON từ phản hồi
    const data = await response.json();
    // Kiểm tra cấu trúc dữ liệu phản hồi
    if (data.status === 200 && data.guid) {
      let url = `${chart_url}/${data.guid}`;
      console.log(`image_url = ${url}`)
      return url
    } else {
      return error_image_url
    }
  } catch (error) {
    console.error('Error registering chart:', error);
    return error_image_url
  }
}

export const register_chart_desc = {
  type: "function",
  function: {
    name: "register_chart",
    description: "Register and return the URL of the chart image",
    parameters: {
      type: "object",
      properties: {
        chart_script: {
          type: "string",
          description: `chart_script is a JSON containing the chart description from the Chart.js library. Example: {"type":"bubble","data":{"datasets":[{"label":"Dataset 1","data":[{"x":5,"y":5,"r":5},{"x":10,"y":10,"r":10},{"x":15,"y":15,"r":15},{"x":20,"y":20,"r":20},{"x":25,"y":25,"r":25}],"backgroundColor":"rgba(255, 99, 132, 0.6)"},{"label":"Dataset 2","data":[{"x":30,"y":10,"r":10},{"x":35,"y":20,"r":20},{"x":40,"y":30,"r":30},{"x":45,"y":40,"r":40},{"x":50,"y":50,"r":50}],"backgroundColor":"rgba(54, 162, 235, 0.6)"}]}}`,
        },
      },
      required: ["chart_script"],
    },
  },
}