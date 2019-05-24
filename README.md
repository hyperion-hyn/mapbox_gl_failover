# Map3 for mapbox

This project shows how to use the map3 network through [mapbox-js](https://docs.mapbox.com/mapbox-gl-js/api/).

## how to build

```
npm install
npm run webpack
npm run start
```
open browser [http://localhost:9000/](http://localhost:9000/)



## add to your project
```
<script src='https://api.tiles.mapbox.com/mapbox-gl-js/v1.0.0/mapbox-gl.js'></script>
<script src='dist/bundle.js'></script>

...

var map = new mapboxgl.Map({
      container: 'map',
      style:'https://static.hyn.space/maptiles/see-it-all.json'	//this is map3 style.
    });

```
