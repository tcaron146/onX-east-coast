const IS_LOCAL = window.location.hostname === "localhost";

const BACKEND_BASE = IS_LOCAL
  ? "http://localhost:8081"
  : null;

const ROUTES_URL = BACKEND_BASE
  ? `${BACKEND_BASE}/routes`
  : "data/routes.geojson";

const METADATA_URL = BACKEND_BASE
  ? `${BACKEND_BASE}/metadata.json`
  : "data/metadata.json";

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
  truecolor: false,
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
  const feature = e.features[0];
  downloadDrawnRoute(feature);
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

  if (terrainEnabled) {
    add3DTerrain();
  } else {
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

  map.setTerrain({
    source: "mapbox-dem",
    exaggeration: 1.4,
  });

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

  map.easeTo({
    pitch: 65,
    bearing: -20,
    duration: 1200,
  });
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
  document.querySelector(".mapboxgl-ctrl-top-left").style.zIndex = "9999";
}

// NEW: Function to remove draw controls
function removeDrawControls() {
  if (!drawAdded) return;

  map.removeControl(draw);
  drawAdded = false;
}

async function loadData() {
  const [routesRes, metadataRes] = await Promise.all([
    fetch(ROUTES_URL),
    fetch(METADATA_URL),
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

    map.on("mouseenter", "route-hitbox", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "route-hitbox", () => {
      map.getCanvas().style.cursor = "";
    });
  });
}


loadData();

function normalize(str) {
  return str?.toLowerCase().trim();
}

function showRouteInfo(feature) {
  const props = feature.properties || {};

  const meta =
    metadata.find(
      m => normalize(m.name) === normalize(props.name)
    ) || {};

  const info = document.getElementById("info");

  const difficulty =
    typeof meta.difficulty === "string" && meta.difficulty.trim() !== ""
      ? meta.difficulty
      : "Unknown";

  const vertical =
    typeof meta.vertical_drop === "number" && !isNaN(meta.vertical_drop)
      ? Math.round(meta.vertical_drop)
      : "Unknown";

  const hazards =
    Array.isArray(meta.hazards) &&
    meta.hazards.some(h => h.trim() !== "")
      ? meta.hazards.join(", ")
      : null;

  info.innerHTML = `
    <div class="route-card expanded">
      <div class="route-header">
        <div>
          <div class="route-title">${meta.name || props.name}</div>
          <div class="route-subtitle">${meta.zone || ""}</div>
        </div>
        <div class="chevron">⌄</div>
      </div>

      <div class="route-body">
        <div class="route-row">
          <span>Difficulty</span>
          <span class="badge">${difficulty}</span>
        </div>

        <div class="route-row">
          <span>Vertical</span>
          <span>${vertical} ft</span>
        </div>

        ${hazards ? `
          <div class="route-row hazard">
            <span>Hazards</span>
            <span>${hazards}</span>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  const card = info.querySelector(".route-card");
  const header = info.querySelector(".route-header");

  header.onclick = () => {
    card.classList.toggle("collapsed");
  };
}



const toggle = document.getElementById("map-style-toggle");
let current = "topo";

toggle.onclick = () => {
  current = current === "topo" ? "sat" : "topo";
  toggle.innerText = current === "topo" ? "Satellite" : "Topo";

  map.setStyle(
    current === "topo"
      ? "mapbox://styles/mapbox/outdoors-v12"
      : "mapbox://styles/mapbox/satellite-streets-v12",
  );

  map.once("styledata", () => {
    removeDrawControls();

    add3DTerrain();
    addRouteLayers();
    addDrawControls();
    if (selectedRouteId) highlightRoute(selectedRouteId);

    if (activeOverlays.truecolor) {
      toggleRasterLayer("truecolor", TRUE_COLOR_URL, 0.9);
    }
    if (activeOverlays.snow) {
      toggleRasterLayer("snow", getSnowLayerUrl(), 0.7);
    }
    if (activeOverlays.slope) {
      toggleSlopeLayer();
    }
  });
};

const searchInput = document.getElementById("route-search");
const searchResults = document.getElementById("search-results");
let selectedIndex = -1;

function fuzzyMatch(str, keyword) {
  return str.toLowerCase().includes(keyword.toLowerCase());
}

function zoomToRoute(feature) {
  const coords = feature.geometry.coordinates;
  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new mapboxgl.LngLatBounds(coords[0], coords[0]),
  );
  map.fitBounds(bounds, { padding: 60 });
}

searchInput.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  selectedIndex = -1;

  if (!q) {
    searchResults.style.display = "none";
    return;
  }

  const matches = routeData.features.filter((f) =>
    fuzzyMatch(f.properties.name, q),
  );

  if (!matches.length) {
    searchResults.innerHTML = `<div class="no-result">No results</div>`;
    searchResults.style.display = "block";
    return;
  }

  searchResults.innerHTML = matches
    .map(
      (m, i) => `
      <div class="result-item" data-id="${m.properties.id}" data-index="${i}">
        ${m.properties.name}
      </div>`,
    )
    .join("");

  searchResults.style.display = "block";
});

searchInput.addEventListener("keydown", (e) => {
  const items = [...document.querySelectorAll(".result-item")];
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % items.length;
    updateHighlightedItem(items);
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    updateHighlightedItem(items);
  }

  if (e.key === "Enter") {
    e.preventDefault();
    if (selectedIndex >= 0) items[selectedIndex].click();
  }

  if (e.key === "Escape") {
    searchResults.style.display = "none";
    selectedIndex = -1;
  }
});

function updateHighlightedItem(items) {
  items.forEach((el, i) => {
    if (i === selectedIndex) {
      el.style.background = "#333";
      el.style.color = "white";
    } else {
      el.style.background = "white";
      el.style.color = "black";
    }
  });

  if (selectedIndex >= 0) {
    items[selectedIndex].scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }
}

function toggleSlopeLayer() {
  if (map.getLayer("slope")) {
    map.removeLayer("slope");
    // Don't remove the mapbox-dem source since it's used for terrain
    return false;
  }

  // Make sure the DEM source exists
  if (!map.getSource("mapbox-dem")) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.terrain-rgb",
      tileSize: 512,
      maxzoom: 14,
    });
  }

  map.addLayer(
    {
      id: "slope",
      type: "hillshade",
      source: "mapbox-dem",
      paint: {
        "hillshade-exaggeration": 0.8,
        "hillshade-shadow-color": "rgba(255, 0, 0, 0.5)",
      },
    },
    getFirstSymbolLayerId(),
  );

  return true;
}

document.querySelectorAll(".layer-btn").forEach((btn) => {
  btn.onclick = () => {
    const layer = btn.dataset.layer;

    if (layer === "slope") {
      activeOverlays.slope = toggleSlopeLayer();
    }

    btn.classList.toggle("active", activeOverlays[layer]);
  };
});

searchResults.addEventListener("click", (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  const feature = routeData.features.find((f) => f.properties.id === id);

  if (feature) {
    zoomToRoute(feature);
    highlightRoute(feature.properties.id);
    showRouteInfo(feature);
  }

  searchResults.style.display = "none";
  searchInput.value = "";
});