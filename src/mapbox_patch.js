/*global sharedChunk*/
/*eslint no-undef: "error"*/

export default function () {
  const lbUrl = 'http://192.168.3.177/tile/assign'

  let availableMap3TileServers = []
  const xhr = new XMLHttpRequest()
  xhr.open('GET', lbUrl)
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
    let self = this
    let args = Array.prototype.slice.call(arguments);
    console.log('begin get tile:' + args[0].url);

    const map3TileRegex = /^https?:\/\/tile.map3.network(\/v1\/api\/tile\/\d+\/\d+\/\d+\.pbf)/
    let map3TileUrl = map3TileRegex.exec(args[0].url)
    let map3TileRoute = map3TileUrl && map3TileUrl[1]

    let origCancelable
    let origCallback = args[1] || function () {
    };
    let callback = origCallback;
    if (map3TileRoute && availableMap3TileServers.length > 0) {
      let currentServerIdx = 0
      args[0].url = availableMap3TileServers[currentServerIdx] + map3TileRoute
      console.log('reset url to ' + args[0].url)
      callback = function (err, data, cacheControl, expires) {
        console.log('hook callback', err, data, cacheControl, expires)
        //fail over to other server
        if (err && err.status != '404' && currentServerIdx < availableMap3TileServers.length - 1) {
          currentServerIdx++
          args[0].url = availableMap3TileServers[currentServerIdx] + map3TileRoute
          console.log('fail over to ' + args[0].url)
          origCancelable = origGetArrayBuffer.call(self, args[0], callback);
        } else {
          origCallback(err, data, cacheControl, expires)
        }
      }
    }
    origCancelable = origGetArrayBuffer.call(self, args[0], callback);
    return {
      cancel: function () {
        if (origCancelable) {
          origCancelable.cancel()
        }
      }
    };
  }
}
