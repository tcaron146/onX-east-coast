mapboxgl.accessToken =
  "pk.eyJ1IjoidGNhcm9uMTQ2IiwiYSI6ImNtaW5odm9rMTBkNGwzaXBtbGZnM3d6dzkifQ.HP_cVQrd9lMqYywOwF_Xzw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/outdoors-v12",
  center: [-71.315, 44.273],
  zoom: 11,
});

let routeData = null;

async function loadData() {
  try {
    // fetch routes and metadata
    const [routesRes, metadataRes] = await Promise.all([
      fetch("/routes"),
      fetch("/metadata.json"),
    ]);
    routeData = await routesRes.json();
    const metadata = await metadataRes.json();

    map.on("load", () => {
      map.addSource("routes", { type: "geojson", data: routeData });
      map.addLayer({
        id: "route-lines",
        type: "line",
        source: "routes",
        paint: { "line-width": 4, "line-color": "#e100ff" },
      });

      // click for info
      map.on("click", "route-lines", (e) => {
        const props = e.features[0].properties;
        const meta = metadata.find((m) => m.id == props.id) || {};
        const info = document.getElementById("info");
        info.innerHTML = `
          <button id="close-info" style="
            float:right;
            border:none;
            background:#e74c3c;
            color:white;
            font-weight:bold;
            padding:2px 6px;
            border-radius:3px;
            cursor:pointer;
          ">×</button>
          <div class="route-title">${props.name}</div>
          <div><strong>Difficulty:</strong> ${meta.difficulty || "Unknown"}</div>
          <div><strong>Notes:</strong> ${meta.notes || "None"}</div>
          <div><strong>Elevation Gain:</strong> ${meta.elevation_gain_m ? meta.elevation_gain_m + " m" : "Unknown"}</div>
          <div><strong>Distance:</strong> ${meta.distance_km ? meta.distance_km + " km" : "Unknown"}</div>
          <div><strong>Approach:</strong> ${meta.approach || "Unknown"}</div>
          <div><strong>Season:</strong> ${meta.season || "Unknown"}</div>
          <div><strong>Hazards:</strong> ${meta.hazards || "None"}</div>
        `;
        document.getElementById("close-info").onclick = () => {
          info.innerHTML = "Click a route to see details";
        };
      });

      map.on("mouseenter", "route-lines", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "route-lines", () => {
        map.getCanvas().style.cursor = "";
      });
    });
  } catch (err) {
    console.error("Error loading data:", err);
    document.getElementById("info").innerText = "Failed to load route data.";
  }
}

loadData();

// map style toggle
const toggle = document.getElementById("map-style-toggle");
const styles = {
  topo: "mapbox://styles/mapbox/outdoors-v12",
  sat: "mapbox://styles/mapbox/satellite-streets-v12",
};
let current = "topo";
toggle.onclick = () => {
  current = current === "topo" ? "sat" : "topo";
  toggle.innerText = current === "topo" ? "Satellite" : "Topo";
  map.setStyle(styles[current]);
  map.once("styledata", () => {
    if (!routeData) return;
    if (!map.getSource("routes")) {
      map.addSource("routes", { type: "geojson", data: routeData });
    }
    if (!map.getLayer("route-lines")) {
      map.addLayer({
        id: "route-lines",
        type: "line",
        source: "routes",
        paint: { "line-width": 4, "line-color": "#e100ff" },
      });
    }
  });
};
