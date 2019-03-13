if (window.mapboxgl) {
  let patchCode = `
    const lbUrl = 'http://192.168.3.177/tile/assign'
    
    var availableMap3TileServers = []
    fetch(lbUrl)
      .then(res => res.json())
      .then(res => {
        if(res.code == 0) {
          availableMap3TileServers = availableMap3TileServers.concat(res.data)
        }
      })
    
    let origGetArrayBuffer = sharedChunk.getArrayBuffer
    sharedChunk.getArrayBuffer = function _wrapGetArrayBuffer() {
      var args = Array.prototype.slice.call(arguments);
      console.log('begin get tile:' + args[0].url);
      
      const map3TileRegex = /^https?:\\/\\/tile.map3.network(\\/v1\\/api\\/tile\\/\\d+\\/\\d+\\/\\d+\\.pbf)/
      let map3TileUrl = map3TileRegex.exec(args[0].url)
      let map3TileRoute = map3TileUrl && map3TileUrl[1]
     
      var origCancelable
      var origCallback = args[1] || function(err, data, cacheControl, expires) {};
      var callback = origCallback;
      if(map3TileRoute && availableMap3TileServers.length > 0) {
        let currentServerIdx = 0
        args[0].url = availableMap3TileServers[currentServerIdx] + map3TileRoute
        console.log('reset url to ' + args[0].url)
        callback = function(err, data, cacheControl, expires) {
          console.log('hook callback', err, data, cacheControl, expires)
          //fail over to other server
          if(err && err.status != '404' && currentServerIdx < availableMap3TileServers.length - 1) {
            currentServerIdx++
            args[0].url = availableMap3TileServers[currentServerIdx] + map3TileRoute
            console.log('fail over to ' + args[0].url)
            origCancelable = origGetArrayBuffer.call(this, args[0], callback);
          } else {
            origCallback(err, data, cacheControl, expires) 
          }
        }
      }
      origCancelable = origGetArrayBuffer.call(this, args[0], callback);
      var cancelable = {cancel: function() {
        if(origCancelable) {
          origCancelable.cancel() 
        }
      }}
      return cancelable;
    }
`

  let request = new XMLHttpRequest();
  request.open('GET', window.mapboxgl.workerUrl, false);
  request.send();
  if (request.status === 200) {
    let res = request.response;
    let workerBundleString = res + patchCode
    window.mapboxgl.workerUrl = window.URL.createObjectURL(new Blob([workerBundleString], {
      type: 'text/javascript'
    }));
    console.log('patch map3 failover success!')
  }
} else {
  console.log('Patch map3 failover fail, can not find mapboxgl!')
}

