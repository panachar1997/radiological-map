"use strict";

const LAYER_NAMES = {
  bedrock: "Geological Bedrock",
  faults: "Greece Faults",
  radonCity: "Radon Concentration city water supply",
  radonSource: "Radon Concentration in source water",
  radonVillages: "Radon Concentration water supply of villages towns",
  soil: "Soil",
  mosses: "Mosses",
  indoorOutdoor: "Indoor and Outdoor",
  regions: "Greece Regions",
  regionalUnits: "Regional Units of Greece",
  municipalities: "Greece Municipalities",
};

const DATA_FILES = {
  bedrock: "data/bedRock.geoJSON",
  faults: "data/greeceFaults.geojson",
  radonCity: "data/radonConcentrationCityWaterSupply.geojson",
  radonSource: "data/radonConcentrationInSourceWater.geojson",
  radonVillages: "data/radonConcentrationWaterSupplyOfVillagesTowns.geojson",
  soil: "data/soil.geojson",
  mosses: "data/mosses.geojson",
  indoorOutdoor: "data/indoorOutdoor.geojson",
  regions: "data/greeceRegions.geojson",
  regionalUnits: "data/RegionalUnits.geojson",
  municipalities: "data/greeceMunicipalities.geojson",
};

const RADON_LAYERS = new Set([
  LAYER_NAMES.radonCity,
  LAYER_NAMES.radonSource,
  LAYER_NAMES.radonVillages,
]);

const map = L.map("map", { preferCanvas: true }).setView(
  [37.50209686668296, 24.0593101229436],
  6
);

const openStreetMap = L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
).addTo(map);

const cartoDarkMatter = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 20,
    subdomains: "abcd",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }
);

const esriWorldImagery = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 18,
    attribution:
      "Tiles &copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  }
);

if (L.Control.Geocoder) {
  L.Control.geocoder().addTo(map);
}
if (L.Control.Fullscreen) {
  map.addControl(new L.Control.Fullscreen());
}
if (L.control.ruler) {
  L.control.ruler().addTo(map);
}
L.control.scale().addTo(map);

const baseMaps = {
  "Open Street Map": openStreetMap,
  "CARTO Dark Matter": cartoDarkMatter,
  "Esri World Imagery": esriWorldImagery,
};

const overlayGroups = Object.fromEntries(
  Object.values(LAYER_NAMES).map((name) => [name, L.layerGroup()])
);

L.control.layers(baseMaps, overlayGroups).addTo(map);

const coordinateOutput = document.getElementById("coordinate");
const popupInfo = document.getElementById("popupInfo");
const memorandum = document.getElementById("memorandum");
const legend = document.getElementById("legend");
const loadingStatus = document.getElementById("loadingStatus");

let coordinateFrame = null;
let latestCoordinates = null;
map.on("mousemove", (event) => {
  latestCoordinates = event.latlng;
  if (coordinateFrame !== null) return;
  coordinateFrame = window.requestAnimationFrame(() => {
    coordinateOutput.textContent = `${latestCoordinates.lat.toFixed(
      6
    )}, ${latestCoordinates.lng.toFixed(6)}`;
    coordinateFrame = null;
  });
});

const activeRadonLayers = new Set();
map.on("overlayadd", (event) => {
  if (event.name === LAYER_NAMES.bedrock) {
    memorandum.style.display = "block";
  }
  if (RADON_LAYERS.has(event.name)) {
    activeRadonLayers.add(event.name);
    updateLegend();
  }
  ensureOverlayLoaded(event.name);
});

map.on("overlayremove", (event) => {
  if (event.name === LAYER_NAMES.bedrock) {
    memorandum.style.display = "none";
  }
  if (RADON_LAYERS.has(event.name)) {
    activeRadonLayers.delete(event.name);
    updateLegend();
  }
});

map.on("click", hideInfoPanel);

function updateLegend() {
  legend.style.display = activeRadonLayers.size > 0 ? "block" : "none";
}

function showInfoPanel(html) {
  popupInfo.innerHTML = html;
  popupInfo.style.display = "block";
}

function hideInfoPanel() {
  popupInfo.style.display = "none";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayValue(value) {
  return value === null || value === undefined || value === ""
    ? "—"
    : escapeHtml(value);
}

function row(label, value) {
  return `<strong>${escapeHtml(label)}:</strong> ${displayValue(value)}<br>`;
}

function distanceValue(value) {
  const distance = Number(value);
  return Number.isFinite(distance) ? `~ ${distance.toFixed(2)} km` : "—";
}

function radonFaultRows(properties) {
  return (
    row("Nearest Fault Name", properties.nearest_fault_name) +
    row(
      "Nearest Fault Distance",
      distanceValue(properties.nearest_fault_distance_km)
    ) +
    row("Second Nearest Fault Name", properties.second_nearest_fault_name) +
    row(
      "Second Nearest Fault Distance",
      distanceValue(properties.second_nearest_fault_distance_km)
    )
  );
}

function activityColor(value) {
  const number = Number(value);
  if (number <= 25) return "#eef779";
  if (number <= 50) return "hsl(36, 89%, 52%)";
  if (number <= 100) return "#e93010";
  return "rgb(126, 4, 4)";
}

function circleMarker(latlng, value, radius) {
  const color = activityColor(value);
  return L.circleMarker(latlng, {
    radius,
    fillColor: color,
    fillOpacity: 1,
    color,
    weight: 1,
    opacity: 1,
  });
}

function cityRadonMarker(feature, latlng) {
  const properties = feature.properties;
  const meanValue = properties["ΜΕΣΗ ΤΙΜΗ"];
  const marker = circleMarker(latlng, meanValue, 5);
  marker.bindPopup(
    `<h3>Radioactivity</h3>` +
      row("Measurements", properties["Αριθμός Μετρήσεων"]) +
      row("Mean Value (Bq/L)", meanValue) +
      row("Minimum (Bq/L)", properties["ΕΛΑΧΙΣΤΟ"]) +
      row("Maximum (Bq/L)", properties["ΜΕΓΙΣΤΟ"]) +
      row("Error (± Bq/L)", properties["ΣΦΑΛΜΑ"]) +
      row("City/Location", properties["ΠΟΛΗ/ΠΕΡΙΟΧΗ"]) +
      radonFaultRows(properties)
  );
  return marker;
}

function sourceRadonMarker(feature, latlng) {
  const properties = feature.properties;
  const meanValue = properties["ΜΕΣΗ ΤΙΜΗ Bq/L"];
  const marker = circleMarker(latlng, meanValue, 10);
  marker.bindPopup(
    `<h3>Radioactivity</h3>` +
      row("Mean Value (Bq/L)", meanValue) +
      row("Error (± Bq/L)", properties["ΜΕΣΗ ΤΙΜΗ ± Bq/L"]) +
      row(
        "City/Village/Town",
        properties["ΕΥΡΥΤΕΡΗ ΠΕΡΙΟΧΗ (ΠΟΛΗ / ΚΩΜΟΠΟΛΗ / ΧΩΡΙΟ)"]
      ) +
      row("Location", properties["ΧΩΡΙΟ / θΕΡΜΑ"]) +
      row("Source", properties["ΠΗΓΗ"]) +
      radonFaultRows(properties)
  );
  return marker;
}

function villageRadonMarker(feature, latlng) {
  const properties = feature.properties;
  const meanValue = properties.AVERAGE;
  const marker = circleMarker(latlng, meanValue, 3);
  marker.bindPopup(
    `<h3>Radioactivity</h3>` +
      row("Mean Value (Bq/L)", meanValue) +
      row("Minimum (Bq/L)", properties.MIN) +
      row("Maximum (Bq/L)", properties.MAX) +
      row("Error (± Bq/L)", properties["ΕΝΕΡΓΟΤΗΤΑ ± Bq/l"]) +
      row("STD", properties.STD) +
      row("Village/Town", properties["ΚΩΜΟΠΟΛΗ/ΧΩΡΙΟ"]) +
      row("Population", properties["Πληθυσμός"]) +
      radonFaultRows(properties)
  );
  return marker;
}

const bedrockColors = {
  R: "#d5c1de",
  C: "#8864ae",
  T: "#ffffad",
  P: "#85334c",
  X: "#ff9933",
  Z: "#fcaead",
  N: "#e94a4c",
  A: "#fdcc8c",
  K: "#d6efd1",
  H: "#b8d8e9",
  J: "#fdc381",
  V: "#fc998e",
  W: "#ffd7ef",
  L: "#c17a53",
  S: "#765937",
  E: "#3a6f33",
  B: "#4c93c3",
  M: "#ababab",
};

function createBedrockLayer(data) {
  return L.geoJSON(data, {
    style(feature) {
      const category = String(feature.properties?.GAIOIKANOT ?? "").charAt(0);
      return {
        fillColor: bedrockColors[category] ?? "white",
        fillOpacity: 0.7,
        color: "#665c5c",
        weight: 0.3,
      };
    },
  });
}

function createRegionsLayer(data) {
  return L.geoJSON(data, {
    style: {
      fillOpacity: 0.1,
      fillColor: "red",
      color: "red",
      weight: 0.3,
      opacity: 0.4,
    },
    onEachFeature(feature, layer) {
      layer.bindTooltip(escapeHtml(feature.properties?.name_greek), {
        sticky: true,
      });
      layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.5 }));
      layer.on("mouseout", () => layer.setStyle({ fillOpacity: 0.1 }));
    },
  });
}

function createRegionalUnitsLayer(data) {
  return L.geoJSON(data, {
    style: {
      fillOpacity: 0.2,
      fillColor: "blue",
      color: "blue",
      weight: 0.3,
      opacity: 0.3,
    },
    onEachFeature(feature, layer) {
      layer.bindTooltip(escapeHtml(feature.properties?.LEKTIKO), {
        sticky: true,
      });
      layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.4 }));
      layer.on("mouseout", () => layer.setStyle({ fillOpacity: 0.2 }));
    },
  });
}

function createMunicipalitiesLayer(data) {
  return L.geoJSON(data, {
    style: {
      fillOpacity: 0.2,
      fillColor: "yellow",
      color: "#c4a500",
      weight: 0.3,
      opacity: 0.3,
    },
    onEachFeature(feature, layer) {
      const name = feature.properties?.NL_NAME_3 || feature.properties?.NAME_3;
      layer.bindTooltip(escapeHtml(name), { sticky: true });
      layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.7 }));
      layer.on("mouseout", () => layer.setStyle({ fillOpacity: 0.2 }));
    },
  });
}

function createFaultsLayer(data) {
  return L.geoJSON(data, {
    style: { weight: 2, color: "black", opacity: 0.8 },
    onEachFeature(feature, layer) {
      layer.on("click", (event) => {
        if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
        showFaultInfo(feature.properties ?? {});
      });
      layer.on("mouseover", () =>
        layer.setStyle({ color: "#f7f704", weight: 3 })
      );
      layer.on("mouseout", () =>
        layer.setStyle({ color: "black", weight: 2 })
      );
    },
  });
}

function showFaultInfo(properties) {
  const fields = [
    ["Fault Name", "Name"],
    ["Length", "length_km", " km"],
    ["Kinematics", "Kinematics"],
    ["Monitoring", "monitoring"],
    ["Active Reliability", "act_reliab"],
    ["Shape Length", "Shape_Leng"],
    ["Paleoseismic", "paleoseism"],
    ["Historical Seismicity", "hist_seism"],
    ["Location Reliability", "loc_reliab"],
    ["Slip Rate", "slip_rate"],
    ["Instrumental Seismicity", "instr_seis"],
    ["Seismic Event", "seis_event"],
    ["Risk Level", "risk_level"],
    ["Study Quality", "study_qual"],
    ["Dip Direction", "Dip_Direct"],
    ["Strike", "strike"],
    ["Dip Angle", "dip_angle"],
    ["Rake Angle", "rake"],
    ["References", "References"],
  ];
  const html = fields
    .map(([label, key, suffix = ""]) => {
      const value = properties[key];
      return row(
        label,
        value === null || value === undefined || value === ""
          ? null
          : `${value}${suffix}`
      );
    })
    .join("");
  showInfoPanel(html);
}

function createSoilLayer(data) {
  const includedProperties = [
    "Location",
    "Ra-226 (Bq/Kg)",
    "Th-232 (Bq/Kg)",
    "K-40  (Bq/Kg)",
    "Cs-137  (Bq/Kg)",
    "Total (nSv/h)",
  ];
  return L.geoJSON(data, {
    pointToLayer(feature, latlng) {
      const html =
        "<h3>Gamma Spectrometry</h3>" +
        includedProperties
          .filter((property) =>
            Object.prototype.hasOwnProperty.call(feature.properties, property)
          )
          .map((property) => row(property, feature.properties[property]))
          .join("");
      return L.circleMarker(latlng, {
        fillOpacity: 0.8,
        fillColor: "#3a48c4",
        color: "#004b88",
        weight: 1,
        opacity: 1,
        radius: 9,
      }).bindPopup(html);
    },
  });
}

function createMossesLayer(data) {
  return L.geoJSON(data, {
    pointToLayer(feature, latlng) {
      const html =
        "<h3>Gamma Spectrometry</h3>" +
        row("Location", feature.properties.Location) +
        row("Cs-137 (Bq/Kg)", feature.properties["Cs-137 (Bq/Kg)"]);
      return L.circleMarker(latlng, {
        fillOpacity: 0.8,
        fillColor: "#3a6f33",
        color: "#3a6f33",
        weight: 1,
        opacity: 1,
        radius: 7,
      }).bindPopup(html);
    },
  });
}

function createIndoorOutdoorLayer(data) {
  return L.geoJSON(data, {
    style: {
      fillOpacity: 0.8,
      fillColor: "#6bcc45",
      color: "#6bcc45",
      weight: 0.4,
      opacity: 1,
    },
    onEachFeature(feature, layer) {
      layer.bindTooltip(
        escapeHtml(feature.properties?.NL_NAME_3 || feature.properties?.NAME_3),
        { sticky: true }
      );
      layer.on("click", (event) => {
        if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
        showIndoorOutdoorInfo(feature.properties ?? {});
      });
      layer.on("mouseover", () => layer.setStyle({ fillColor: "yellow" }));
      layer.on("mouseout", () => layer.setStyle({ fillColor: "#6bcc45" }));
    },
  });
}

function showIndoorOutdoorInfo(properties) {
  const indoorFields = [
    ["Number Of Indoor Measurements", "NumberOfIndoorMeasurements"],
    ["Indoor Total Dose Rate (nGy·h⁻¹)", "in.TotalDoseRate(nGy.h-1)"],
    ["Indoor Range", "in.Range"],
    ["Uranium Contribution", "in.U.Contribution"],
    ["Uranium Dose Rate", "in.U.DoseRate"],
    ["Uranium Range", "in.U.Range"],
    ["Thorium Contribution", "in.Th.Contribution"],
    ["Thorium Dose Rate", "in.Th.DoseRate"],
    ["Thorium Range", "in.Th.Range"],
    ["Potassium Contribution", "in.K.Contribution"],
    ["Potassium Dose Rate", "in.K.DoseRate"],
    ["Potassium Range", "in.K.Range"],
    ["Cesium Contribution", "in.Cs.Contribution"],
    ["Cesium Dose Rate", "in.Cs.DoseRate"],
    ["Cesium Range", "in.Cs.Range"],
  ];
  const outdoorFields = [
    ["Number Of Outdoor Measurements", "NumberOfOutdoorMeasurements"],
    ["Outdoor Total Dose Rate (nGy·h⁻¹)", "out.TotalDoseRate(nGy.h-1)"],
    ["Outdoor Range", "out.Range"],
    ["Uranium Contribution", "out.U.Contribution"],
    ["Uranium Dose Rate", "out.U.DoseRate"],
    ["Uranium Range", "out.U.Range"],
    ["Thorium Contribution", "out.Th.Contribution"],
    ["Thorium Dose Rate", "out.Th.DoseRate"],
    ["Thorium Range", "out.Th.Range"],
    ["Potassium Contribution", "out.K.Contribution"],
    ["Potassium Dose Rate", "out.K.DoseRate"],
    ["Potassium Range", "out.K.Range"],
    ["Cesium Contribution", "out.Cs.Contribution"],
    ["Cesium Dose Rate", "out.Cs.DoseRate"],
    ["Cesium Range", "out.Cs.Range"],
  ];
  const rows = (fields) =>
    fields.map(([label, key]) => row(label, properties[key])).join("");
  showInfoPanel(
    row("Municipality Name", properties.NAME_3) +
      row("Population", properties.Population) +
      "<h2>Indoor</h2><hr>" +
      rows(indoorFields) +
      "<h2>Outdoor</h2><hr>" +
      rows(outdoorFields)
  );
}

async function fetchGeoJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

const overlayLoaders = {
  [LAYER_NAMES.bedrock]: async () =>
    createBedrockLayer(await fetchGeoJson(DATA_FILES.bedrock)),
  [LAYER_NAMES.faults]: async () =>
    createFaultsLayer(await fetchGeoJson(DATA_FILES.faults)),
  [LAYER_NAMES.radonCity]: async () =>
    L.geoJSON(await fetchGeoJson(DATA_FILES.radonCity), {
      pointToLayer: cityRadonMarker,
    }),
  [LAYER_NAMES.radonSource]: async () =>
    L.geoJSON(await fetchGeoJson(DATA_FILES.radonSource), {
      pointToLayer: sourceRadonMarker,
    }),
  [LAYER_NAMES.radonVillages]: async () =>
    L.geoJSON(await fetchGeoJson(DATA_FILES.radonVillages), {
      pointToLayer: villageRadonMarker,
    }),
  [LAYER_NAMES.soil]: async () =>
    createSoilLayer(await fetchGeoJson(DATA_FILES.soil)),
  [LAYER_NAMES.mosses]: async () =>
    createMossesLayer(await fetchGeoJson(DATA_FILES.mosses)),
  [LAYER_NAMES.indoorOutdoor]: async () =>
    createIndoorOutdoorLayer(await fetchGeoJson(DATA_FILES.indoorOutdoor)),
  [LAYER_NAMES.regions]: async () =>
    createRegionsLayer(await fetchGeoJson(DATA_FILES.regions)),
  [LAYER_NAMES.regionalUnits]: async () =>
    createRegionalUnitsLayer(await fetchGeoJson(DATA_FILES.regionalUnits)),
  [LAYER_NAMES.municipalities]: async () =>
    createMunicipalitiesLayer(await fetchGeoJson(DATA_FILES.municipalities)),
};

const loadedOverlays = new Set();
const overlayPromises = new Map();
const loadingOverlays = new Set();
let statusTimeout = null;

function updateLoadingStatus() {
  window.clearTimeout(statusTimeout);
  loadingStatus.classList.remove("error");
  if (loadingOverlays.size === 0) {
    loadingStatus.style.display = "none";
    loadingStatus.textContent = "";
    return;
  }
  loadingStatus.textContent =
    loadingOverlays.size === 1
      ? `Loading ${[...loadingOverlays][0]}…`
      : `Loading ${loadingOverlays.size} selected layers…`;
  loadingStatus.style.display = "block";
}

function showLoadingError(name) {
  loadingStatus.textContent = `Could not load ${name}. Please try again.`;
  loadingStatus.classList.add("error");
  loadingStatus.style.display = "block";
  statusTimeout = window.setTimeout(() => {
    loadingStatus.style.display = "none";
    loadingStatus.classList.remove("error");
  }, 6000);
}

function ensureOverlayLoaded(name) {
  if (loadedOverlays.has(name)) return Promise.resolve();
  if (overlayPromises.has(name)) return overlayPromises.get(name);

  const loader = overlayLoaders[name];
  if (!loader) return Promise.resolve();

  loadingOverlays.add(name);
  updateLoadingStatus();

  const promise = loader()
    .then((layer) => {
      overlayGroups[name].addLayer(layer);
      loadedOverlays.add(name);
    })
    .catch((error) => {
      console.error(`Failed to load ${name}:`, error);
      showLoadingError(name);
    })
    .finally(() => {
      loadingOverlays.delete(name);
      overlayPromises.delete(name);
      if (!loadingStatus.classList.contains("error")) updateLoadingStatus();
    });

  overlayPromises.set(name, promise);
  return promise;
}
