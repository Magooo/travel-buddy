import React, { useEffect, useState } from 'react';
import { Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function Directions({ markers }) {
    const map = useMap();
    const routesLibrary = useMapsLibrary('routes');
    const [directionsService, setDirectionsService] = useState(null);
    const [directionsRenderer, setDirectionsRenderer] = useState(null);
    const [routes, setRoutes] = useState([]);

    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
        setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
    }, [routesLibrary, map]);

    useEffect(() => {
        if (!directionsService || !directionsRenderer || markers.length < 2) return;

        // Convert markers to standard format { lat, lng }
        const locations = markers.map(m => {
            if (Array.isArray(m)) return { lat: m[0], lng: m[1] };
            return { lat: m.lat, lng: m.lng };
        });

        const origin = locations[0];
        const destination = locations[locations.length - 1];
        // Use intermediate markers as waypoints
        const waypoints = locations.slice(1, -1).map(loc => ({ location: loc, stopover: true }));

        directionsService.route({
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: 'DRIVING',
            provideRouteAlternatives: true
        }).then(response => {
            directionsRenderer.setDirections(response);
            setRoutes(response.routes);
        }).catch(e => console.error("Directions request failed", e));

    }, [directionsService, directionsRenderer, markers]);

    return null;
}

// Helper to auto-recenter map when center prop changes
function RecenterMap({ center }) {
    const map = useMap();
    useEffect(() => {
        if (map && center) {
            map.panTo(center);
        }
    }, [map, center]);
    return null;
}

// Helper to fit map to all markers
function FitMapToMarkers({ markers }) {
    const map = useMap();

    useEffect(() => {
        if (!map || markers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        let hasValidLoc = false;

        markers.forEach(marker => {
            if (Array.isArray(marker)) {
                bounds.extend({ lat: marker[0], lng: marker[1] });
                hasValidLoc = true;
            } else if (marker.lat && marker.lng) {
                bounds.extend({ lat: marker.lat, lng: marker.lng });
                hasValidLoc = true;
            }
        });

        if (hasValidLoc) {
            map.fitBounds(bounds);
            // Optional: Adjust zoom if only one marker to prevent max zoom
            if (markers.length === 1) {
                const listener = google.maps.event.addListener(map, "idle", () => {
                    map.setZoom(10);
                    google.maps.event.removeListener(listener);
                });
            }
        }
    }, [map, markers]);

    return null;
}

// Legacy Marker Wrapper (Robuster than AdvancedMarker for basic needs)
function LegacyMarker({ position, title, zIndex, iconUrl, label, date }) {
    const map = useMap();
    const [marker, setMarker] = useState(null);
    const [infoWindow, setInfoWindow] = useState(null);

    useEffect(() => {
        if (!map) return;

        const m = new google.maps.Marker({
            position,
            map,
            title,
            zIndex,
            animation: google.maps.Animation.DROP,
            label: label ? {
                text: label.toString(),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px'
            } : undefined,
            icon: iconUrl ? {
                url: iconUrl,
                scaledSize: new google.maps.Size(40, 40), // Make them visible
                labelOrigin: new google.maps.Point(20, 15) // Center text in the pin head
            } : undefined
        });

        const iw = new google.maps.InfoWindow({
            content: `
                <div style="padding: 5px; color: black;">
                    <strong style="font-size: 14px;">${title}</strong><br/>
                    <span style="font-size: 12px; color: #555;">${date || ''}</span>
                </div>
            `
        });

        m.addListener('click', () => {
            iw.open(map, m);
        });

        setMarker(m);
        setInfoWindow(iw);

        return () => {
            m.setMap(null);
            google.maps.event.clearInstanceListeners(m);
        };
    }, [map]); // Re-create if map changes (simple)

    // Update props
    useEffect(() => {
        if (!marker) return;
        marker.setPosition(position);
        marker.setTitle(title);
        marker.setZIndex(zIndex);
        if (label) {
            marker.setLabel({
                text: label.toString(),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px'
            });
        }
        if (infoWindow) {
            infoWindow.setContent(`
                <div style="padding: 5px; color: black;">
                    <strong style="font-size: 14px;">${title}</strong><br/>
                    <span style="font-size: 12px; color: #555;">${date || ''}</span>
                </div>
            `);
        }
    }, [marker, position, title, zIndex, label, date, infoWindow]);

    return null;
}

export default function TripMap({
    center,
    zoom,
    markers = []
}) {
    if (!API_KEY) {
        return (
            <div style={{ padding: '20px', background: '#ffebee', color: '#c62828', textAlign: 'center' }}>
                <p><strong>Google Maps API Key Missing</strong></p>
                <p>Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.</p>
            </div>
        );
    }

    // Convert array center to object
    const mapCenter = Array.isArray(center) ? { lat: center[0], lng: center[1] } : center;

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <Map
                defaultCenter={mapCenter}
                defaultZoom={zoom}
                mapId={null} // Disable Map ID to force legacy raster tiles (simpler)
                disableDefaultUI={false}
            >
                <RecenterMap center={mapCenter} />
                <FitMapToMarkers markers={markers} />
                <Directions markers={markers} />
                {markers.map((marker, index) => {
                    let pos;
                    let type = 'activity';
                    let title = '';

                    if (Array.isArray(marker)) {
                        pos = { lat: marker[0], lng: marker[1] };
                    } else {
                        pos = { lat: parseFloat(marker.lat), lng: parseFloat(marker.lng) };
                        type = marker.type || 'activity';
                        title = marker.title || '';
                    }

                    const isSection = type === 'section';
                    const zIndex = isSection ? 10 : 20;

                    // Fallback icons
                    // Blue for sections, Yellow for activities, Green for transport
                    let iconUrl = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
                    if (isSection) iconUrl = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
                    if (type === 'transport' || type === 'car_rental') iconUrl = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';

                    // Show number for activities to trace the route
                    // Only label activities to keep it clean, or all? Let's label all to show order of "events"
                    const label = (index + 1).toString();

                    return (
                        <LegacyMarker
                            key={index}
                            position={pos}
                            title={title}
                            zIndex={zIndex}
                            iconUrl={iconUrl}
                            label={label}
                            date={marker.dateDisplay} // Pass the date string for the InfoWindow
                        />
                    );
                })}
            </Map>
        </div>
    );
}
