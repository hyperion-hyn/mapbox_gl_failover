import mapbox_patch from "./mapbox_patch";

if (window.mapboxgl) {
  let request = new XMLHttpRequest();
  request.open('GET', window.mapboxgl.workerUrl, false);
  request.send();
  if (request.status === 200) {
    let res = request.response;
    let patchCode = `;(
    ${mapbox_patch.toString()}
  ());`
    let workerBundleString = res + patchCode
    window.mapboxgl.workerUrl = window.URL.createObjectURL(new Blob([workerBundleString], {
      type: 'text/javascript'
    }));
    console.log('patch map3 failover success!')
  }
} else {
  console.log('Patch map3 failover fail, can not find mapboxgl!')
}

