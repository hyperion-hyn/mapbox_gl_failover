/*global sharedChunk*/
/*eslint no-undef: "error"*/

export default function () {
  const LB_URL = 'https://registry.tile.map3.network/tile/assign'
  const REQUEST_TIMEOUT = 2000
  const MAX_ERROR = 3

  let availableMap3TileServers = []
  let errorServers = [] // [{server: 'https://xx', errorTime: 4}]
  // let availableMap3TileServers = ['https://149-129-249-238.tile.map3.network/v1/api/tile/', 'https://149-129-243-22.tile.map3.network/v1/api/tile/', 'https://149-129-244-119.tile.map3.network/v1/api/tile/']
  const xhr = new XMLHttpRequest()
  xhr.open('GET', LB_URL)
  xhr.onload = () => {
    if (xhr.status == 200) {
      let data = JSON.parse(xhr.response)
      if (data.code == 0) {
        availableMap3TileServers = availableMap3TileServers.concat(data.data)
      }
    }
  }
  xhr.send()

  let origGetArrayBuffer = sharedChunk.getArrayBuffer
  sharedChunk.getArrayBuffer = function _wrapGetArrayBuffer() {
    // console.log(availableMap3TileServers)
    // console.log(errorServers)
    let self = this
    let args = Array.prototype.slice.call(arguments);
    console.log('begin get tile:' + args[0].url);

    const map3TileRegex = /^https?:\/\/tile.map3.network\/v1\/api\/tile(\/\d+\/\d+\/\d+\.pbf)/
    let map3TileUrl = map3TileRegex.exec(args[0].url)
    let map3TileRoute = map3TileUrl && map3TileUrl[1]

    let origCancelable
    let origCallback = args[1] || function () {
    };
    if (map3TileRoute) {
      let servers = Array.prototype.slice.call(availableMap3TileServers)
      let currentServerIdx = 0
      // let requestStatusList = []  //record each request status; [{serverDomain:'http://xxx/', status: 'idea/loading/finish/error', time: 300, isTimeout: false}, ...]

      const hookGetByteArray = () => {
        let status = 'loading'
        let idx = currentServerIdx
        let timeoutId
        let failoverAleadyTried = false
        let lastChanceIdx = -1

        if (idx < servers.length - 1) {  // not the last server
          timeoutId = setTimeout(() => {
            if (status === 'loading') {  //now is timeout
              //set Lower priority on idx
              let origIdx = availableMap3TileServers.indexOf(servers[idx]);
              if (origIdx > -1 && origIdx < availableMap3TileServers.length - 1 && availableMap3TileServers[idx + 1]) {
                [availableMap3TileServers[origIdx], availableMap3TileServers[idx + 1]] = [availableMap3TileServers[idx + 1], availableMap3TileServers[origIdx]]
              }
              if (lastChanceIdx == -1) {
                lastChanceIdx = idx;
              }
              origCancelable.cancel();
              console.log('**', map3TileRoute, idx, servers.length, failoverAleadyTried)
              if (!failoverAleadyTried) {
                failoverAleadyTried = true
                hookGetByteArray()
              }
            }
          }, REQUEST_TIMEOUT)
        }

        if (servers.length > 0) {
          args[0].url = servers[idx] + map3TileRoute;
          currentServerIdx++;
          console.log('hook call:' + map3TileRoute, idx, servers.length)
        }

        origCancelable = origGetArrayBuffer.call(self, args[0], (err, data, cacheControl, expires) => {
          console.log(map3TileRoute, err, data)
          timeoutId && clearTimeout(timeoutId)

          status = (err && err.status != '404') ? 'error' : 'finish'

          if (status === 'error' && servers.length > 0) {
            let errorServer
            for (let i = 0; i < errorServers.length; i++) {
              if (errorServers[i].server == servers[idx]) {
                errorServer = errorServers[i];
                break
              }
            }
            if (!errorServer) {
              errorServer = {server: servers[idx], errorTime: 0}
              errorServers.push(errorServer)
            }
            errorServer.errorTime++

            if (errorServer.errorTime >= MAX_ERROR) {
              let errIdx = availableMap3TileServers.indexOf(errorServer.server)
              if (errIdx > -1) {
                availableMap3TileServers.splice(errIdx, 1)
              }
            }
          }

          //if first request is tile.map3.network and error happen, now it have chance to fail over
          if (servers.length == 0 && availableMap3TileServers.length > 0) {
            servers = Array.prototype.slice.call(availableMap3TileServers)
          }

          //fail over to other server, 404 is not error
          if (err && err.status != '404' && (idx < servers.length - 1 || (idx >= servers.length - 1 && lastChanceIdx != -1))) {
            console.log('@@', map3TileRoute, idx, servers.length, failoverAleadyTried)
            if (idx >= servers.length - 1 && lastChanceIdx != -1) { //last chance
              console.log('%% last chance ', map3TileRoute, lastChanceIdx, servers.length)
              args[0].url = servers[lastChanceIdx] + map3TileRoute;
              origCancelable = origGetArrayBuffer.apply(self, args);
            } else {  //fail over, try next server
              //set server to last
              if (idx < availableMap3TileServers.length - 1) {
                availableMap3TileServers.push(availableMap3TileServers.splice(availableMap3TileServers.indexOf(servers[idx]), 1)[0]);
              }
              if (!failoverAleadyTried) {
                failoverAleadyTried = true
                hookGetByteArray()
              }
            }
          } else {
            origCallback(err, data, cacheControl, expires)
          }
        });
      };

      hookGetByteArray()
    } else {
      origCancelable = origGetArrayBuffer.apply(self, args);
    }
    return {
      cancel: function () {
        if (origCancelable) {
          origCancelable.cancel()
        }
      }
    };
  }
}
