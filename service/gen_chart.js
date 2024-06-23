import fetch from 'node-fetch';

const chart_url = 'https://genchart-23041f34af27.herokuapp.com/chart'
const error_image_url = `https://placehold.co/800x500?text=Error+Chart&font=roboto`

export async function register_chart(func_arguments) {
  let type = func_arguments.type // (String) Các kiểu chart được chart.js support
  let dataChart = JSON.parse(func_arguments.data) // (String) Json của củ`data` của chart.js, ví dụ: {"labels":["beccadax","elsh","hyp","rintaro","mikeash","hamishknight","Catfish-Man","egorzhdan","shahmishal","gottesmm","MaxDesiatov","ktoso","jckarter","Xazax-hun","jmschonfeld","stmontgomery","gregomni","kubamracek","mateusrodriguesxyz","rlziii","futurejones","artemcm"],"datasets":[{"label":"Pull Requests","data":[2,2,3,1,1,1,1,2,1,2,1,1,1,3,1,1,1,1,1,1,1,1],"backgroundColor":"rgba(75, 192, 192, 0.6)","borderColor":"rgba(75, 192, 192, 1)","borderWidth":1}]}
  let postBody = {
    type: type,
    data: dataChart
  }

  console.log(`chart json = ${JSON.stringify(postBody)}`)
  try {
    // Thực hiện phương thức POST đến endpoint
    const response = await fetch(chart_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postBody)
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
    description: "Register a chart script and return the URL of the chart image",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "The type of chart supported by Chart.js",
        },
        data: {
          type: "string",
          description: `The JSON string of the chart.js data object. Example: {"labels":["label1","label2"],"datasets":[{"label":"Dataset 1","data":[1,2],"backgroundColor":"rgba(75, 192, 192, 0.6)"}]}`,
        },
      },
      required: ["type", "data"],
    },
  },
}