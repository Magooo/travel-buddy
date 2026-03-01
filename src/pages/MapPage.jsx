import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import TripMap from '../components/TripMap';

export default function MapPage() {
    const trip = useLiveQuery(async () => {
        const activeId = parseInt(localStorage.getItem('activeTripId') || '0');
        if (activeId) return await db.trips.get(activeId);
        return await db.trips.orderBy('startDate').first();
    });

    const markers = useLiveQuery(async () => {
        if (!trip) return [];
        const [activities, sections] = await Promise.all([
            db.activities.where({ tripId: trip.id }).toArray(),
            db.sections.where({ tripId: trip.id }).toArray()
        ]);

        const activityMarkers = activities.flatMap(a => {
            if ((a.type === 'transport' || a.type === 'car_rental') && a.legs && a.legs.length > 0) {
                const legMarkers = [];
                // Add start of first leg
                if (a.legs[0].depLat && a.legs[0].depLng) {
                    legMarkers.push({
                        lat: a.legs[0].depLat,
                        lng: a.legs[0].depLng,
                        title: `${a.title} (Depart ${a.legs[0].depLocation || ''})`,
                        type: 'transport',
                        dateDisplay: a.legs[0].depDate
                    });
                }
                // Add all arrivals
                a.legs.forEach((leg, i) => {
                    if (leg.arrLat && leg.arrLng) {
                        legMarkers.push({
                            lat: leg.arrLat,
                            lng: leg.arrLng,
                            title: `${a.title} (Arriving: ${leg.arrLocation || ''})`,
                            type: 'transport',
                            dateDisplay: leg.arrDate
                        });
                    }
                });
                return legMarkers;
            }

            if (a.lat && a.lng) {
                return [{
                    lat: a.lat,
                    lng: a.lng,
                    title: a.title,
                    type: 'activity'
                }];
            }
            return [];
        });

        const sectionMarkers = sections
            .filter(s => s.lat && s.lng)
            .map(s => ({ lat: s.lat, lng: s.lng, title: s.title, type: 'section' }));

        return [...sectionMarkers, ...activityMarkers];
    }, [trip]);

    if (!trip) return <div>Loading...</div>;

    const mapCenter = markers && markers.length > 0 ? markers[0] : { lat: 35.6762, lng: 139.6503 };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header style={{ padding: '1rem', background: 'var(--color-surface)', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{trip.title} Map</h1>
            </header>
            <div style={{ flex: 1 }}>
                <TripMap markers={markers || []} center={mapCenter} zoom={10} />
            </div>
        </div>
    );
}
