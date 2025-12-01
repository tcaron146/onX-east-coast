mapboxgl.accessToken = 'MAPBOX_ACCESS_TOKEN_REPLACE_ME';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/outdoors-v12',
  center: [-71.315, 44.273],
  zoom: 11
});

fetch('../data/routes.geojson')
  .then(res => res.json())
  .then(geojson => {
    map.on('load', () => {
      map.addSource('routes', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'route-lines',
        type: 'line',
        source: 'routes',
        paint: { 'line-width': 3, 'line-color': '#b30000' }
      });

      // add click handler
      map.on('click', 'route-lines', (e) => {
        const props = e.features[0].properties;
        const info = document.getElementById('info');
        info.innerHTML = `<div class="route-title">${props.name}</div>
          <div><strong>Difficulty:</strong> ${props.difficulty}</div>
          <div><strong>Summary:</strong> ${props.summary}</div>
          <div style="margin-top:8px"><em>Open GET /routes for JSON payload.</em></div>`;
      });

      map.on('mouseenter', 'route-lines', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'route-lines', () => map.getCanvas().style.cursor = '');
    });
  })
  .catch(err => {
    document.getElementById('info').innerText = 'Failed to load route data: ' + err;
  });
