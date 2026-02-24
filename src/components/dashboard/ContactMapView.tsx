import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { NearbyContact } from "@/lib/contacts";
import { formatCurrency, toTitleCase } from "@/lib/contacts";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "";

function ltvColor(ltv: number | null): string {
  if (ltv == null || ltv === 0) return "#78716c";
  if (ltv >= 1000) return "#16a34a";
  if (ltv >= 300) return "#d97706";
  return "#78716c";
}

interface ContactMapViewProps {
  contacts: NearbyContact[];
  center: { lat: number; lng: number } | null;
  repName: string;
  isGhlMode: boolean;
  ghlLocationId?: string | null;
  onSelectContact?: (contact: NearbyContact) => void;
}

export default function ContactMapView({
  contacts,
  center,
  repName,
}: ContactMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || !center) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.lng, center.lat],
      zoom: 11,
    });

    m.addControl(new mapboxgl.NavigationControl(), "top-right");
    m.on("load", () => setMapReady(true));

    map.current = m;
    return () => {
      setMapReady(false);
      m.remove();
      map.current = null;
    };
  }, [center?.lat, center?.lng]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || contacts.length === 0) return;

    const features = contacts
      .filter((c: any) => c.latitude != null && c.longitude != null)
      .map((c: any) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [c.longitude, c.latitude] as [number, number],
        },
        properties: {
          id: c.id,
          name: `${toTitleCase(c.first_name)} ${toTitleCase(c.last_name)}`,
          city: `${toTitleCase(c.city)}, ${c.state?.toUpperCase() ?? ""}`,
          phone: c.phone,
          ltv: c.lifetime_value,
          ltvColor: ltvColor(c.lifetime_value),
          distance: c.distance_miles.toFixed(1),
          address: c.address ?? "",
        },
      }));

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    // Clean up previous layers/sources
    ["clusters", "cluster-count", "unclustered-point"].forEach((id) => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    if (m.getSource("contacts")) m.removeSource("contacts");

    // Search center marker
    document.querySelectorAll(".search-center-marker").forEach((el) => el.remove());
    if (center) {
      const el = document.createElement("div");
      el.className = "search-center-marker";
      el.style.cssText = "width:16px;height:16px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
      new mapboxgl.Marker(el).setLngLat([center.lng, center.lat]).addTo(m);
    }

    if (features.length === 0) return;

    m.addSource("contacts", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    m.addLayer({
      id: "clusters",
      type: "circle",
      source: "contacts",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step", ["get", "point_count"],
          "hsl(174, 30%, 42%)", 10,
          "hsl(174, 30%, 35%)", 50,
          "hsl(174, 30%, 28%)",
        ],
        "circle-radius": ["step", ["get", "point_count"], 20, 10, 25, 50, 35],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    m.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "contacts",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 13,
      },
      paint: { "text-color": "#ffffff" },
    });

    m.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: "contacts",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "ltvColor"],
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    m.on("click", "clusters", (e) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      if (!f.length) return;
      const clusterId = f[0].properties?.cluster_id;
      const source = m.getSource("contacts") as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || f[0].geometry.type !== "Point") return;
        m.easeTo({ center: f[0].geometry.coordinates as [number, number], zoom: zoom ?? 14 });
      });
    });

    m.on("click", "unclustered-point", (e) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ["unclustered-point"] });
      if (!f.length || f[0].geometry.type !== "Point") return;
      const props = f[0].properties!;
      const coords = f[0].geometry.coordinates as [number, number];
      const ltvDisplay = props.ltv != null && props.ltv !== 0 ? formatCurrency(Number(props.ltv)) : "—";

      new mapboxgl.Popup({ offset: 15, maxWidth: "280px" })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family:'Poppins',sans-serif;min-width:180px;">
            <p style="font-weight:600;font-size:14px;margin:0 0 2px;">${props.name}</p>
            <p style="color:#666;font-size:12px;margin:0 0 6px;">${props.city}</p>
            <div style="display:flex;gap:12px;font-size:12px;margin-bottom:6px;">
              <span>📍 ${props.distance} mi</span>
              <span>💰 ${ltvDisplay}</span>
            </div>
            <div style="display:flex;gap:6px;margin-top:4px;">
              <a href="tel:${props.phone}" style="font-size:12px;color:hsl(174,30%,42%);text-decoration:none;">📞 Call</a>
              <a href="sms:${props.phone}?body=Hi ${encodeURIComponent(String(props.name).split(" ")[0])}, this is ${encodeURIComponent(repName)} from Cutco!" style="font-size:12px;color:hsl(174,30%,42%);text-decoration:none;">💬 Text</a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(props.address + ", " + props.city)}" target="_blank" style="font-size:12px;color:hsl(174,30%,42%);text-decoration:none;">🗺️ Dir</a>
            </div>
          </div>
        `)
        .addTo(m);
    });

    ["clusters", "unclustered-point"].forEach((layer) => {
      m.on("mouseenter", layer, () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", layer, () => { m.getCanvas().style.cursor = ""; });
    });

    // Fit bounds
    if (features.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      if (center) bounds.extend([center.lng, center.lat]);
      features.forEach((f) => {
        if (f.geometry.type === "Point") bounds.extend(f.geometry.coordinates as [number, number]);
      });
      m.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [contacts, mapReady, center, repName]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-lg border bg-muted/30 p-8 text-center">
        <p className="text-muted-foreground text-sm">Mapbox token not configured.</p>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="rounded-lg border bg-muted/30 p-8 text-center">
        <p className="text-muted-foreground text-sm">Search for contacts to see them on the map.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapContainer}
        className="w-full rounded-lg border overflow-hidden"
        style={{ height: "500px" }}
      />
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#16a34a" }} />
          LTV $1,000+
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#d97706" }} />
          LTV $300+
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#78716c" }} />
          Low / Unknown
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
          Search center
        </div>
      </div>
    </div>
  );
}
