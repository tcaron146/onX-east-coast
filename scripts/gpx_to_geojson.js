fetch('../data/routes.geojson')
  .then(res => res.json())
  .then(data => {
    // ensure FeatureCollection
    const geojson = data.type === 'FeatureCollection' ? data : { type: 'FeatureCollection', features: data.features || [] };

    map.on('load', () => {
      map.addSource('routes', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'route-lines',
        type: 'line',
        source: 'routes',
        paint: { 'line-width': 3, 'line-color': '#ff0000' }
      });

      map.on('click', 'route-lines', e => {
        const props = e.features[0].properties || {};
        const info = document.getElementById('info');
        info.innerHTML = `<div class="route-title">${props.name || 'Unnamed Route'}</div>`;
      });

      map.on('mouseenter', 'route-lines', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'route-lines', () => map.getCanvas().style.cursor = '');
    });
  })
  .catch(err => console.error('Failed to load route data:', err));
