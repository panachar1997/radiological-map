# Environmental Radioactivity & Geological Data Map

An interactive web map developed as part of Charis Panayides' Electrical and Computer Engineering thesis at Aristotle University of Thessaloniki.

The application brings environmental radioactivity measurements together with geological and administrative data for Greece. Users can enable thematic layers, inspect measurements and geological faults, and explore relationships between measurement locations and nearby faults.

## Key features

- Eleven user-facing thematic layers covering radioactivity, geology, and administrative boundaries
- Interactive radon, soil, moss, and indoor/outdoor radiation data
- Geological bedrock and fault visualisation
- Nearest and second-nearest fault calculations for radon measurement locations
- Fault information panel with geological attributes
- Layer control, geocoder, fullscreen view, ruler, coordinates, scale, legends, and multiple base maps
- Responsive standalone layout
- On-demand loading for large layers, keeping the initial page lightweight
- Precomputed nearest-fault results for fast radon popups

## Technologies

- HTML5, CSS3, and JavaScript
- [Leaflet](https://leafletjs.com/)
- GeoJSON
- OpenStreetMap, CARTO, and Esri base maps

The project intentionally uses static GeoJSON files rather than a server-side database. This was appropriate for the read-only academic datasets and allows the map to run as a static website.

## Project structure

```text
.
├── index.html
├── app.js
├── styles.css
├── assets/
├── data/
└── vendor/
```

`index.html` contains the application shell, `app.js` contains the map logic, and `styles.css` contains the responsive presentation. `data/` contains the GeoJSON layers, `assets/` contains project imagery, and `vendor/` contains the locally hosted Leaflet ruler and fullscreen extensions with their original licences.

## Performance architecture

The initial thesis version downloaded every scientific and administrative layer as soon as the page opened. This repository uses lazy loading instead: the base map appears first, and each GeoJSON file is downloaded only when its layer is selected.

The nearest and second-nearest fault results for the radon measurements are precomputed in the three radon GeoJSON files. This removes a large fault-vertex helper dataset from the public application and avoids repeating tens of millions of geographic distance comparisons in every visitor's browser.

## Run locally

The map must be served over HTTP because browsers normally block `fetch()` requests when an HTML file is opened directly from the filesystem.

With Visual Studio Code, open the project folder and use the **Live Server** extension. Alternatively, from the project directory run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Upload the contents of this folder to a GitHub repository.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Select the `main` branch and `/(root)` folder.
5. Save and wait for the deployment to complete.

For a repository named `radiological-map` under the `panachar1997` account, the expected project URL is:

```text
https://panachar1997.github.io/radiological-map/
```

## Data and reuse notice

The datasets originated from an academic research project and multiple geological or administrative sources. Before making the repository public, confirm redistribution and attribution requirements with the Nuclear Technology Laboratory of Aristotle University of Thessaloniki and the original data providers.

No licence is granted for redistribution of the scientific datasets merely by their inclusion in this project copy. Third-party Leaflet extensions retain their original licence files under `vendor/`.
