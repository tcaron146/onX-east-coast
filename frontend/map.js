mapboxgl.accessToken =
  "pk.eyJ1IjoidGNhcm9uMTQ2IiwiYSI6ImNtaW5odm9rMTBkNGwzaXBtbGZnM3d6dzkifQ.HP_cVQrd9lMqYywOwF_Xzw";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/outdoors-v12",
  center: [-71.315, 44.273],
  zoom: 11,
  paint: { 
  'line-width': 3, 
  'line-join': 'round',
  'line-cap': 'round',
  'opacity': 0.8
}

});

fetch("../data/routes.geojson")
  .then((res) => res.json())
  .then((geojson) => {
    map.on("load", () => {
      map.addSource("routes", { type: "geojson", data: geojson });
      map.addLayer({
        id: "route-lines",
        type: "line",
        source: "routes",
        paint: { "line-width": 3, "line-color": "#e100ff" },
      });

      // add click handler
map.on('click', 'route-lines', (e) => {
  const props = e.features[0].properties;
  fetch('../data/metadata.json')
    .then(res => res.json())
    .then(metadata => {
      const meta = metadata.find(m => m.id == props.id) || {};
      const info = document.getElementById('info');
      info.innerHTML = `
        <div class="route-title">${props.name}</div>
        <div><strong>Difficulty:</strong> ${meta.difficulty || 'Unknown'}</div>
        <div><strong>Notes:</strong> ${meta.notes || 'None'}</div>
        <div><strong>Elevation Gain:</strong> ${meta.elevation_gain_m ? meta.elevation_gain_m + ' m' : 'Unknown'}</div>
        <div><strong>Distance:</strong> ${meta.distance_km ? meta.distance_km + ' km' : 'Unknown'}</div>
        <div><strong>Approach:</strong> ${meta.approach || 'Unknown'}</div>
        <div><strong>Season:</strong> ${meta.season || 'Unknown'}</div>
        <div><strong>Hazards:</strong> ${meta.hazards || 'None'}</div>
      `;
    });
});



      map.on(
        "mouseenter",
        "route-lines",
        () => (map.getCanvas().style.cursor = "pointer")
      );
      map.on(
        "mouseleave",
        "route-lines",
        () => (map.getCanvas().style.cursor = "")
      );
    });
  })
.catch(err => {
  console.error('Error loading routes:', err);
  document.getElementById('info').innerText = 'Failed to load route data.';
  });
