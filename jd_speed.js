//京东天天加速活动，每天4京豆，再小的苍蝇也是肉
//未完,待续
const $hammer = (() => {
  const isRequest = "undefined" != typeof $request,
      isSurge = "undefined" != typeof $httpClient,
      isQuanX = "undefined" != typeof $task;

  const log = (...n) => { for (let i in n) console.log(n[i]) };
  const alert = (title, body = "", subtitle = "", link = "") => {
    if (isSurge) return $notification.post(title, subtitle, body, link);
    if (isQuanX) return $notify(title, subtitle, (link && !body ? link : body));
    log("==============📣系统通知📣==============");
    log("title:", title, "subtitle:", subtitle, "body:", body, "link:", link);
  };
  const read = key => {
    if (isSurge) return $persistentStore.read(key);
    if (isQuanX) return $prefs.valueForKey(key);
  };
  const write = (val, key) => {
    if (isSurge) return $persistentStore.write(val, key);
    if (isQuanX) return $prefs.setValueForKey(val, key);
  };
  const request = (method, params, callback) => {
    /**
     *
     * params(<object>): {url: <string>, headers: <object>, body: <string>} | <url string>
     *
     * callback(
     *      error,
     *      <response-body string>?,
     *      {status: <int>, headers: <object>, body: <string>}?
     * )
     *
     */
    let options = {};
    if (typeof params == "string") {
      options.url = params;
    } else {
      options.url = params.url;
      if (typeof params == "object") {
        params.headers && (options.headers = params.headers);
        params.body && (options.body = params.body);
      }
    }
    method = method.toUpperCase();

    const writeRequestErrorLog = function (m, u) {
      return err => {
        log("=== request error -s--");
        log(`${m} ${u}`, err);
        log("=== request error -e--");
      };
    }(method, options.url);

    if (isSurge) {
      const _runner = method == "GET" ? $httpClient.get : $httpClient.post;
      return _runner(options, (error, response, body) => {
        if (error == null || error == "") {
          response.body = body;
          callback("", body, response);
        } else {
          writeRequestErrorLog(error);
          callback(error);
        }
      });
    }
    if (isQuanX) {
      options.method = method;
      $task.fetch(options).then(
          response => {
            response.status = response.statusCode;
            delete response.statusCode;
            callback("", response.body, response);
          },
          reason => {
            writeRequestErrorLog(reason.error);
            callback(reason.error);
          }
      );
    }
  };
  const done = (value = {}) => {
    if (isQuanX) return isRequest ? $done(value) : null;
    if (isSurge) return isRequest ? $done(value) : $done();
  };
  return { isRequest, isSurge, isQuanX, log, alert, read, write, request, done };
})();
//直接用NobyDa的jd cookie
const cookie = $hammer.read('CookieJD')
const name = '天天加速';
const JD_API_HOST = 'https://api.m.jd.com/';
let gen = entrance();
gen.next();

let farmTask = null;
// let farmInfo = null;
let beans_num = null;
let distance = null;
let destination = null;
let source_id = null;
let done_distance = null;
let task_status = null, able_energeProp_list = [];
async function* entrance() {
  if (!cookie) {
    return $hammer.alert(name, '请先获取cookie\n直接使用NobyDa的京东签到获取');
  }
  console.log(`start...`);
  yield flyTask_state();
  if (task_status === 0) {
    console.log(`开启新任务：${JSON.stringify(destination)}`);
    yield flyTask_start(source_id)
  } else if (task_status === 1) {
    console.log(`任务进行中：${JSON.stringify(destination)}`);
  }
  console.log('开始检查可领取燃料')
  yield energyPropList();
  console.log(`可领取的燃料任务列表${JSON.stringify(able_energeProp_list)}`)
  if (able_energeProp_list && able_energeProp_list.length > 0) {
    //开始领取燃料
    for (let i of able_energeProp_list) {
      let memberTaskCenterRes =  await _energyProp_gain(i.id);
      console.log(`领取燃料结果：：：${JSON.stringify(memberTaskCenterRes)}`)
    }
  } else {
    console.log('没有可领取的燃料')
  }
  // console.log(`flyTask_state的信息:${JSON.stringify(flyTask_state)}`);
}
//开始新的任务
function flyTask_start(source_id) {
  if (!source_id) return;
  const functionId = arguments.callee.name.toString();
  const body = {
    "source":"game",
    "source_id": source_id
  }
  request(functionId, body).then(res => {
    console.log(`开启新的任务:${JSON.stringify(res)}`);
    gen.next();
  })
}
//检查燃料
function energyPropList() {
  const body = {
    "source":"game",
  }
  request('energyProp_list', body).then(response => {
    console.log(`检查可领取燃料列表:${JSON.stringify(response)}`);
    if (response.code === 0 && response.data && response.data.length > 0) {
      for (let item of response) {
        if (item.thaw_time === 0) {
          able_energeProp_list.push(item);
        }
      }
    }
    gen.next();
  })
}
// 领取燃料
function _energyProp_gain(energy_id) {
  console.log('energy_id', energy_id)
  if (!energy_id) return;
  const body = {
    "source":"game",
    "energy_id": energy_id
  }
  return new Promise((res, rej) => {
    request('energyProp_gain', body).then((response) => {
      res(response);
    })
  })
}
function flyTask_state() {
  const functionId = arguments.callee.name.toString();
  const body = {
    "source":"game"
  }
  request(functionId, body).then((res) => {
    console.log(`初始化信息flyTask_state:${JSON.stringify(res)}`)
    if (res.code === 0) {
      console.log('走了if--code=0')
      let data = res.data;
      if (data.beans_num) {
        beans_num = data.beans_num
        distance = data.distance
        destination = data.destination
        done_distance = data.done_distance
        source_id = data.source_id//根据source_id 启动flyTask_start()
        task_status = data.task_status //0,没开始；1，已开始
      }
      gen.next();
    } else {
      console.log('else????')
    }
  })
}

async function request(function_id, body = {}) {
  // $hammer.request('GET', taskurl(function_id, body), (error, response) => {
  //   // error ? $hammer.log("Error:", error) : sleep(JSON.parse(response));
  //   if(error){
  //     $hammer.log("Error:", error);
  //   }else{
  //     sleep(JSON.parse(_jsonpToJson(response)));
  //   }
  // });
  await sleep(2);
  return new Promise((resolve, reject) => {
    $hammer.request('GET', taskurl(function_id, body), (error, response) => {
      if(error){
        $hammer.log("Error:", error);
      }else{
        resolve(JSON.parse(_jsonpToJson(response)));
      }
    })
  })
}

function sleep(s) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, s * 1000);
  })
}
function _jsonpToJson(v) {
  return v.match(/{.*}/)[0]
}
function taskurl(function_id, body) {
  return {
    url: `${JD_API_HOST}?appid=memberTaskCenter&functionId=${function_id}&body=${escape(JSON.stringify(body))}&jsonp=__jsonp1593330783690&_=${new Date().getTime()}`,
    headers: {
      'Cookie': cookie,
      'Host': 'api.m.jd.com',
      'Accept': '*/*',
      'Connection': 'keep-alive',
      'User-Agent': 'jdapp;iPhone;8.5.5;13.4;9b812b59e055cd226fd60ebb5fd0981c4d0d235d;network/wifi;supportApplePay/3;hasUPPay/0;pushNoticeIsOpen/0;model/iPhone9,2;addressid/138109592;hasOCPay/0;appBuild/167121;supportBestPay/0;jdSupportDarkMode/0;pv/104.43;apprpd/MyJD_GameMain;ref/MyJdGameEnterPageController;psq/9;ads/;psn/9b812b59e055cd226fd60ebb5fd0981c4d0d235d|272;jdv/0|direct|-|none|-|1583449735697|1583796810;adk/;app_device/IOS;pap/JA2015_311210|8.5.5|IOS 13.4;Mozilla/5.0 (iPhone; CPU iPhone OS 13_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
      'Accept-Language': 'zh-cn',
      'Referer': 'https://h5.m.jd.com/babelDiy/Zeus/6yCQo2eDJPbyPXrC3eMCtMWZ9ey/index.html?lng=116.845095&lat=39.957701&sid=ea687233c5e7d226b30940ed7382c5cw&un_area=5_274_49707_49973',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  }
}