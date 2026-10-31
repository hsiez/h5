"use client";

import { useEffect, useRef, useState } from "react";
import { AttributionControl, Map, Marker, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import { ThumbnailFrame } from "./thumbnail-frame";
import { PaperFrame } from "./paper-frame";
import "maplibre-gl/dist/maplibre-gl.css";
import edgeFadeStyles from "./edge-fade.module.css";
import styles from "./location-map-card.module.css";

export type LocationMapCardProps = {
  place: string;
  city: string;
  latitude: number;
  longitude: number;
  zoom: number;
  background: string;
  roads: string;
  parks: string;
  water: string;
  buildings: string;
  labels: string;
  showLabels: boolean;
  showAttributionInfo: boolean;
};

const tileHost = "https://tiles.stadiamaps.com";

function makeStyle(props: LocationMapCardProps): StyleSpecification {
  return {
    version: 8,
    glyphs: `${tileHost}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      streets: { type: "vector", tiles: [`${tileHost}/data/openmaptiles/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 14, attribution: '&copy; <a href="https://stadiamaps.com/attribution/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>' },
    },
    layers: [
      { id: "ground", type: "background", paint: { "background-color": props.background } },
      { id: "parks", type: "fill", source: "streets", "source-layer": "landuse", filter: ["in", "class", "park", "recreation_ground", "garden"], paint: { "fill-color": props.parks } },
      { id: "water", type: "fill", source: "streets", "source-layer": "water", paint: { "fill-color": props.water } },
      { id: "buildings", type: "fill", source: "streets", "source-layer": "building", paint: { "fill-color": props.buildings } },
      { id: "roads", type: "line", source: "streets", "source-layer": "transportation", paint: { "line-color": props.roads, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.7, 15, 2.3, 18, 7] } },
      { id: "place-labels", type: "symbol", source: "streets", "source-layer": "place", layout: { "visibility": props.showLabels ? "visible" : "none", "text-field": ["get", "name"], "text-font": ["Stadia Regular"], "text-size": 11, "text-max-width": 8 }, paint: { "text-color": props.labels, "text-halo-color": props.background, "text-halo-width": 1.2 } },
    ],
  };
}

export function LocationMapCard(props: LocationMapCardProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const marker = useRef<Marker | null>(null);
  const attribution = useRef<AttributionControl | null>(null);
  const attributionObserver = useRef<MutationObserver | null>(null);
  const [error, setError] = useState("");
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${props.place}, ${props.city}`)}`;

  useEffect(() => {
    if (!mapContainer.current) return;
    setWorkerUrl(new URL("../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
    const instance = new Map({
      container: mapContainer.current,
      style: makeStyle(props),
      center: [props.longitude, props.latitude],
      zoom: props.zoom,
      attributionControl: false,
      interactive: false,
    });
    map.current = instance;
    instance.on("error", (event) => setError(event.error?.message ?? "Unknown map error"));
    return () => { marker.current?.remove(); marker.current = null; attributionObserver.current?.disconnect(); attributionObserver.current = null; attribution.current = null; instance.remove(); map.current = null; };
    // Create the map once; the controls below update its camera and style.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (!props.showAttributionInfo) {
      attributionObserver.current?.disconnect();
      attributionObserver.current = null;
      if (attribution.current) instance.removeControl(attribution.current);
      attribution.current = null;
      return;
    }
    if (attribution.current) return;
    const control = new AttributionControl({ compact: true });
    instance.addControl(control, "top-right");
    attribution.current = control;
    const details = mapContainer.current?.querySelector(".maplibregl-ctrl-attrib");
    if (!details) return;
    const closeWhenReady = () => {
      if (!details.classList.contains("maplibregl-compact")) return;
      details.classList.remove("maplibregl-compact-show");
      details.removeAttribute("open");
      attributionObserver.current?.disconnect();
      attributionObserver.current = null;
    };
    const observer = new MutationObserver(closeWhenReady);
    observer.observe(details, { attributes: true, attributeFilter: ["class"] });
    attributionObserver.current = observer;
    closeWhenReady();
  }, [props.showAttributionInfo]);

  useEffect(() => {
    map.current?.jumpTo({ center: [props.longitude, props.latitude], zoom: props.zoom });
    marker.current?.setLngLat([props.longitude, props.latitude]);
  }, [props.longitude, props.latitude, props.zoom]);

  useEffect(() => {
    if (!map.current) return;
    marker.current?.remove();
    const link = document.createElement("a");
    link.className = styles.mapsMarker;
    link.href = googleMapsUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Open ${props.place} in Google Maps (new tab)`);
    link.title = `Open ${props.place} in Google Maps`;
    const icon = document.createElement("span");
    icon.className = styles.mapsMarkerIcon;
    icon.setAttribute("aria-hidden", "true");
    link.appendChild(icon);
    marker.current = new Marker({ element: link, anchor: "bottom" })
      .setLngLat([props.longitude, props.latitude])
      .addTo(map.current);
  }, [googleMapsUrl, props.place, props.longitude, props.latitude]);

  useEffect(() => {
    const instance = map.current;
    if (!instance?.isStyleLoaded()) return;
    instance.setPaintProperty("ground", "background-color", props.background);
    instance.setPaintProperty("parks", "fill-color", props.parks);
    instance.setPaintProperty("water", "fill-color", props.water);
    instance.setPaintProperty("buildings", "fill-color", props.buildings);
    instance.setPaintProperty("roads", "line-color", props.roads);
    instance.setPaintProperty("place-labels", "text-color", props.labels);
    instance.setPaintProperty("place-labels", "text-halo-color", props.background);
    instance.setLayoutProperty("place-labels", "visibility", props.showLabels ? "visible" : "none");
  }, [props.background, props.roads, props.parks, props.water, props.buildings, props.labels, props.showLabels]);

  return <>
      <PaperFrame elevation="popover" className={styles.paperShell}>
        <ThumbnailFrame className={styles.popup}>
          <div className={styles.mapFrame}>
            <div ref={mapContainer} className={styles.map} />
            <div className={edgeFadeStyles.fade} aria-hidden="true" />
            <div className={styles.labelFade} aria-hidden="true" />
            {error && <div className={styles.error}>Map tiles could not load: {error}</div>}
            <div className={styles.meta}>
              <div className={styles.placeDetails}><strong>{props.place}</strong><span>{props.city}</span></div>
            </div>
          </div>
        </ThumbnailFrame>
      </PaperFrame>
      {!props.showAttributionInfo && (
        <div className={styles.attribution} aria-label="Map data attribution">
          © <a href="https://stadiamaps.com/attribution/" target="_blank" rel="noopener noreferrer">Stadia Maps</a>
          {" · © "}<a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>
          {" · © "}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
        </div>
      )}
  </>;
}
