mapboxgl.accessToken =
  "pk.eyJ1IjoidGNhcm9uMTQ2IiwiYSI6ImNtaW5odm9rMTBkNGwzaXBtbGZnM3d6dzkifQ.HP_cVQrd9lMqYywOwF_Xzw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/outdoors-v12",
  center: [-71.315, 44.273],
  zoom: 11,
});

let routeData = null;
let metadata = null;
let selectedRouteId = null;
let terrainEnabled = true;

let activeOverlays = {
  sentinel: false,
  snow: false,
  slope: false,
};

const draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    line_string: true,
    trash: true,
  },
  styles: [
    {
      id: "gl-draw-line",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
      paint: {
        "line-color": "#00e0ff",
        "line-width": 4,
      },
    },
    {
      id: "gl-draw-line-active",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
      paint: {
        "line-color": "#00aaff",
        "line-width": 5,
      },
    },
  ],
});

map.on("draw.create", (e) => {
  downloadDrawnRoute(e.features[0]);
});

function downloadDrawnRoute(feature) {
  const name =
    feature.properties?.name ||
    `drawn_route_${Date.now().toString().slice(-5)}`;

  const blob = new Blob([JSON.stringify(feature, null, 2)], {
    type: "application/json",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name + ".geojson";
  link.click();
}

function toggleTerrain() {
  terrainEnabled = !terrainEnabled;
  if (terrainEnabled) add3DTerrain();
  else {
    map.setTerrain(null);
    map.easeTo({ pitch: 0, bearing: 0 });
  }
}

function addRouteLayers() {
  if (!map.getSource("routes")) {
    map.addSource("routes", { type: "geojson", data: routeData });
  }

  if (!map.getLayer("route-lines")) {
    map.addLayer({
      id: "route-lines",
      type: "line",
      source: "routes",
      paint: {
        "line-width": 4,
        "line-color": "#e100ff",
        "line-opacity": 0.4,
      },
    });
  }

  if (!map.getLayer("route-hitbox")) {
    map.addLayer({
      id: "route-hitbox",
      type: "line",
      source: "routes",
      paint: {
        "line-width": 25,
        "line-opacity": 0,
      },
    });
  }

  if (!map.getLayer("route-highlight")) {
    map.addLayer({
      id: "route-highlight",
      type: "line",
      source: "routes",
      paint: {
        "line-width": 6,
        "line-color": "yellow",
        "line-opacity": 0.7,
      },
      filter: ["==", "id", ""],
    });
  }

  if (!map.getLayer("route-labels")) {
    map.addLayer({
      id: "route-labels",
      type: "symbol",
      source: "routes",
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-size": 14,
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "symbol-spacing": 400,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0,0,0,0.75)",
        "text-halo-width": 1.5,
      },
    });
  }
}

function add3DTerrain() {
  if (!map.getSource("mapbox-dem")) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.terrain-rgb",
      tileSize: 512,
      maxzoom: 14,
    });
  }

  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });

  if (!map.getLayer("sky")) {
    map.addLayer({
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0.0, 0.0],
        "sky-atmosphere-sun-intensity": 15,
      },
    });
  }

  map.easeTo({ pitch: 65, bearing: -20, duration: 1200 });
}

function highlightRoute(routeId) {
  selectedRouteId = routeId;
  if (map.getLayer("route-highlight")) {
    map.setFilter("route-highlight", ["==", "id", routeId]);
  }
}

let drawAdded = false;
function addDrawControls() {
  if (drawAdded) return;
  map.addControl(draw, "top-left");
  drawAdded = true;
}

function removeDrawControls() {
  if (!drawAdded) return;
  map.removeControl(draw);
  drawAdded = false;
}

async function loadData() {
  const [routesRes, metadataRes] = await Promise.all([
    fetch("data/routes.geojson"),
    fetch("data/metadata.json"),
  ]);

  routeData = await routesRes.json();
  metadata = await metadataRes.json();

  map.on("load", () => {
    add3DTerrain();
    addRouteLayers();
    addDrawControls();

    map.on("click", "route-hitbox", (e) => {
      const feature = e.features[0];
      highlightRoute(feature.properties.id);
      showRouteInfo(feature);
    });
  });
}

loadData();

const toggle = document.getElementById("map-style-toggle");
let current = "topo";

toggle.onclick = () => {
  current = current === "topo" ? "sat" : "topo";
  toggle.innerText = current === "topo" ? "Satellite" : "Topo";

  map.setStyle(
    current === "topo"
      ? "mapbox://styles/mapbox/outdoors-v12"
      : "mapbox://styles/mapbox/satellite-streets-v12"
  );

  map.once("styledata", () => {
    removeDrawControls();
    add3DTerrain();
    addRouteLayers();
    addDrawControls();
    if (selectedRouteId) highlightRoute(selectedRouteId);

    if (activeOverlays.sentinel) {
      toggleRasterLayer("sentinel-true-color", SENTINEL_TRUE_COLOR_URL, 1.0);
    }
    if (activeOverlays.snow) {
      toggleRasterLayer("sentinel-ndsi", SENTINEL_NDSI_URL, 0.7);
    }
    if (activeOverlays.slope) toggleSlopeLayer();
  });
};

/* ---------- SENTINEL ---------- */

const SENTINEL_INSTANCE_ID = "cd70df88-be3e-4fce-8a0b-92732b9f6e42";

const SENTINEL_TRUE_COLOR_URL =
  `https://services.sentinel-hub.com/ogc/wmts/${SENTINEL_INSTANCE_ID}` +
  `?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
  `&LAYER=TRUE_COLOR&STYLE=default` +
  `&TILEMATRIXSET=PopularWebMercator256` +
  `&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}` +
  `&FORMAT=image/jpeg`;

const SENTINEL_NDSI_URL =
  `https://services.sentinel-hub.com/ogc/wmts/${SENTINEL_INSTANCE_ID}` +
  `?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
  `&LAYER=NDSI_SNOW&STYLE=default` +
  `&TILEMATRIXSET=PopularWebMercator256` +
  `&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}` +
  `&FORMAT=image/png`;

function getFirstSymbolLayerId() {
  const layers = map.getStyle().layers;
  for (const layer of layers) {
    if (layer.type === "symbol") return layer.id;
  }
  return null;
}

function toggleRasterLayer(id, tiles, opacity = 0.8) {
  if (map.getLayer(id)) {
    map.removeLayer(id);
    map.removeSource(id);
    return false;
  }

  map.addSource(id, {
    type: "raster",
    tiles: [tiles],
    tileSize: 256,
  });

  map.addLayer(
    {
      id,
      type: "raster",
      source: id,
      paint: { "raster-opacity": opacity },
    },
    getFirstSymbolLayerId()
  );

  return true;
}

function toggleSlopeLayer() {
  if (map.getLayer("slope")) {
    map.removeLayer("slope");
    return false;
  }

  map.addLayer(
    {
      id: "slope",
      type: "hillshade",
      source: "mapbox-dem",
      paint: { "hillshade-exaggeration": 0.8 },
    },
    getFirstSymbolLayerId()
  );

  return true;
}

document.querySelectorAll(".layer-btn").forEach((btn) => {
  btn.onclick = () => {
    const layer = btn.dataset.layer;

    if (layer === "sentinel") {
      activeOverlays.sentinel = toggleRasterLayer(
        "sentinel-true-color",
        SENTINEL_TRUE_COLOR_URL,
        1.0
      );
    }

    if (layer === "snow") {
      activeOverlays.snow = toggleRasterLayer(
        "sentinel-ndsi",
        SENTINEL_NDSI_URL,
        0.7
      );
    }

    if (layer === "slope") {
      activeOverlays.slope = toggleSlopeLayer();
    }

    btn.classList.toggle("active", activeOverlays[layer]);
  };
});
