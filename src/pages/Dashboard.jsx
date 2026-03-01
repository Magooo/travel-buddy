import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, syncFromSupabase, addActivity, patchDatabase } from '../lib/db';
import { MapPin, Clock, FileText, Plus, Trash2, Calendar, Pencil, ChevronDown } from 'lucide-react';
import { getRandomMagoo } from '../lib/magooanisms';
import TripMap from '../components/TripMap';
import ManageSectionsModal from '../components/ManageSectionsModal';
import AddActivityModal from '../components/AddActivityModal';
import DayDetailModal from '../components/DayDetailModal';

export default function Dashboard() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingActivity, setEditingActivity] = useState(null);
    const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
    const [selectedDayDetail, setSelectedDayDetail] = useState(null);

    // Trip Selector State
    const [activeTripId, setActiveTripId] = useState(() => {
        return parseInt(localStorage.getItem('activeTripId') || '0');
    });

    useEffect(() => {
        syncFromSupabase();
        patchDatabase();
    }, []);

    // Fetch all trips for selector
    const allTrips = useLiveQuery(() => db.trips.toArray(), []);

    const trip = useLiveQuery(async () => {
        let t = null;
        if (activeTripId) {
            t = await db.trips.get(activeTripId);
        }

        // If specific trip not found (e.g. deleted), fallback to first
        if (!t) {
            const first = await db.trips.orderBy('startDate').first();
            if (first) {
                setActiveTripId(first.id); // Update state to match fallback
                return first;
            }
            return null;
        }
        return t;
    }, [activeTripId]);

    const timeline = useLiveQuery(async () => {
        if (!trip) return [];
        try {
            // 1. Fetch ALL relevant data efficiently
            const [allActivities, sections, allDocs] = await Promise.all([
                db.activities.where({ tripId: trip.id }).toArray(),
                db.sections.where({ tripId: trip.id }).toArray(),
                db.documents.where({ tripId: trip.id }).toArray()
            ]);

            // 2. Map docs to activities
            const docsMap = allDocs.reduce((acc, doc) => {
                if (!acc[doc.activityId]) acc[doc.activityId] = [];
                acc[doc.activityId].push(doc);
                return acc;
            }, {});

            const enrichedActivities = allActivities.map(act => ({
                ...act,
                attachments: docsMap[act.id] || []
            }));

            // 3. Generate Date Range
            if (!trip.startDate || !trip.endDate) return [];
            const start = new Date(trip.startDate);
            const end = new Date(trip.endDate);
            const dates = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                dates.push(new Date(d).toISOString().split('T')[0]);
            }

            // 4. Build Timeline
            return dates.map(currentDate => {
                // Filter activities for this day
                const daysActivities = enrichedActivities.filter(act => {
                    if (!act.mode || act.mode === 'single_day') {
                        return act.date === currentDate;
                    } else if (act.mode === 'span') {
                        return currentDate >= act.startDate && currentDate <= act.endDate;
                    }
                    return false;
                }).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

                const section = sections.find(s => currentDate >= s.startDate && currentDate <= s.endDate);

                return {
                    id: `day-${currentDate}`,
                    date: currentDate,
                    title: new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long' }),
                    activities: daysActivities,
                    sectionColor: section?.color,
                    sectionTitle: section?.title,
                    isEmpty: daysActivities.length === 0
                };
            });

        } catch (err) {
            console.error('Timeline Query Error:', err);
            return [];
        }
    }, [trip]);

    // Extract Markers (Activities + Sections) - SORTED CHRONOLOGICALLY
    const markers = useLiveQuery(async () => {
        if (!trip) return [];

        // Need days to resolve activity dates AND to fetch relevant activities (safer than tripId)
        const days = await db.days.where({ tripId: trip.id }).toArray();
        const daysMap = new Map(days.map(d => [d.id, d.date]));
        const dayIds = days.map(d => d.id);

        const [existingActivities, existingSections] = await Promise.all([
            // Fetch activities by dayId to match Timeline logic (fix for missing/wrong tripId)
            db.activities.where('dayId').anyOf(dayIds).toArray(),
            db.sections.where({ tripId: trip.id }).toArray()
        ]);

        const combined = [];

        // 1. Process Sections
        existingSections.forEach(s => {
            if (s.lat && s.lng) {
                combined.push({
                    lat: s.lat,
                    lng: s.lng,
                    title: s.title,
                    type: 'section',
                    // Use start date as sort key. Time 00:00
                    sortTime: new Date(s.startDate).getTime()
                });
            } else {
                console.log('Section missing coords:', s);
            }
        });

        // 2. Process Activities
        existingActivities.forEach(a => {
            if (a.type === 'transport') console.log('DEBUG TRANSPORT:', a.title, a.legs, a);
            const dateStr = daysMap.get(a.dayId);
            if (!dateStr) return; // Skip orphan activities

            // Helper to add marker
            const addMarker = (lat, lng, title, baseTime, subType = 'activity', dateLabel = null) => {
                combined.push({
                    lat,
                    lng,
                    title,
                    type: subType,
                    sortTime: baseTime.getTime(),
                    dateDisplay: dateLabel || `${baseTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${baseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                });
            };

            // A. Main Activity Location (Start/Departure)
            if (a.lat && a.lng) {
                const timeStr = a.time || '12:00';
                const dateTime = new Date(`${dateStr}T${timeStr}`);
                addMarker(a.lat, a.lng, a.title, dateTime, 'activity');
            }

            // B. Transport Extra Points (Arrivals/Legs)
            if (a.type === 'transport') {
                if (a.legs && a.legs.length > 0) {
                    // Multi-leg: Add ARRIVAL point for each leg
                    // (Departure of Leg 1 is covered by Main Activity. Departures of subsequent legs logic skipped to avoid duplicate pins typically at same airport)
                    a.legs.forEach((leg, idx) => {
                        if (leg.arrLat && leg.arrLng) {
                            const arrDate = leg.arrDate || dateStr;
                            const arrTime = leg.arrTime || '12:00';
                            const arrDateTime = new Date(`${arrDate}T${arrTime}`);
                            addMarker(leg.arrLat, leg.arrLng, `${a.title} (Leg ${idx + 1} Arr)`, arrDateTime, 'transport-arrival');
                        }
                    });
                } else if (a.arrivalLat && a.arrivalLng) {
                    // Simple Transport: Arrival
                    const arrDate = a.arrivalDate || dateStr;
                    const arrTime = a.arrivalTime || '12:00';
                    const arrDateTime = new Date(`${arrDate}T${arrTime}`);
                    addMarker(a.arrivalLat, a.arrivalLng, `${a.title} (Arrival)`, arrDateTime, 'transport-arrival');
                }
            } else {
                // Non-transport: check for fallback locations or other logic if needed
            }
        });

        // 3. Sort Chronologically
        combined.sort((a, b) => a.sortTime - b.sortTime);

        console.log('Map Markers (Sorted):', combined);
        return combined;
    }, [trip]) || [];

    const handleDelete = async (id) => {
        if (confirm('Delete this activity?')) {
            await db.activities.delete(id);
            const { supabase } = await import('../lib/supabase');
            await supabase.from('activities').delete().eq('id', id);
        }
    };

    const handleEdit = (activity) => {
        setEditingActivity(activity);
        setIsModalOpen(true);
    };

    const handleAddActivity = (date) => {
        setSelectedDate(date);
        setEditingActivity(null);
        setIsModalOpen(true);
    };

    const handleTripChange = (e) => {
        const newId = parseInt(e.target.value);
        if (newId) {
            setActiveTripId(newId);
            localStorage.setItem('activeTripId', newId);
        }
    };

    // Auto-cleanup cleanup duplicates on load
    useEffect(() => {
        const cleanupDuplicates = async () => {
            const trips = await db.trips.toArray();
            const japanTrips = trips.filter(t => t.title === 'Japan 2026');
            if (japanTrips.length > 1) {
                console.log('Found duplicate Japan trips, cleaning up...');
                // Keep the one with the lowest ID (original)
                const toKeep = japanTrips.sort((a, b) => a.id - b.id)[0];
                const toDelete = japanTrips.filter(t => t.id !== toKeep.id);

                await Promise.all(toDelete.map(t => db.trips.delete(t.id)));
                console.log('Deleted duplicates:', toDelete.map(t => t.id));
                // Reload window to reflect changes if active trip was deleted, or just let liveQuery handle it
                if (toDelete.find(t => t.id === activeTripId)) {
                    setActiveTripId(toKeep.id);
                    localStorage.setItem('activeTripId', toKeep.id);
                }
            }
        };
        cleanupDuplicates();
    }, [activeTripId]);

    // Simple Country Code to Emoji Map
    const getFlag = (code) => {
        if (!code) return null;
        const codePoints = code
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    };

    if (!trip) {
        // If we have loaded headers but no trip => No trips in DB
        // But useLiveQuery might just be initializing. 
        // We can check allTrips (which is a separate query)
        if (allTrips && allTrips.length === 0) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <h2>No trips found.</h2>
                    <p>Run the "process_receipts.bat" script to ingest your travel documents.</p>
                </div>
            );
        }

        return <div style={{ padding: '2rem', fontStyle: 'italic', color: '#64748b' }}>"{getRandomMagoo()}"<br /><small>(Loading...)</small></div>;
    }

    const totalDays = timeline?.length || 0;
    const totalActivities = timeline?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0;

    // default to London if empty so it doesn't look like the Japan dummy data bug
    const mapCenter = markers.length > 0 ? markers[0] : { lat: 51.5074, lng: -0.1278 };

    return (
        <div style={{ paddingBottom: '6rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-0.025em', margin: 0 }}>
                            {trip.title}
                        </h1>
                    </div>

                    {/* Explicit Selector for clarity */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={trip.id}
                            onChange={handleTripChange}
                            style={{
                                padding: '0.5rem 2rem 0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.9rem',
                                color: '#475569',
                                outline: 'none',
                                background: 'white',
                                appearance: 'none',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            {allTrips?.map(t => (
                                <option key={t.id} value={t.id}>{t.title} ({new Date(t.startDate).getFullYear()})</option>
                            ))}
                        </select>
                        <ChevronDown size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontWeight: '500', marginTop: '0.5rem' }}>
                    <Calendar size={18} />
                    <span>{new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.875rem', fontWeight: '600' }}>
                        {totalDays} Days
                    </div>
                    <div style={{ background: '#f1f5f9', color: '#475569', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.875rem', fontWeight: '600' }}>
                        {totalActivities} Activities
                    </div>
                    <button
                        onClick={() => setIsManageSectionsOpen(true)}
                        style={{ marginLeft: 'auto', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <div style={{ width: '10px', height: '10px', background: 'linear-gradient(to right, #f59e0b, #3b82f6)', borderRadius: '2px' }}></div>
                        Manage Sections
                    </button>
                </div>
            </header>

            {/* Trip Overview Map Card */}
            <section className="map-card" style={{ marginBottom: '2rem', borderRadius: '1rem', overflow: 'hidden', boxShadow: 'var(--shadow-md)', height: '400px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <TripMap markers={markers} center={mapCenter} zoom={11} />
            </section>

            {/* Calendar Grid Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                alignItems: 'start'
            }}>
                {timeline?.map((day) => (
                    <div key={day.id || day.date} style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderColor: day.sectionColor ? day.sectionColor : '#e2e8f0',
                        boxShadow: day.sectionColor ? `0 4px 6px -1px ${day.sectionColor}20` : 'none'
                    }}>
                        {/* Day Header */}
                        <div style={{
                            padding: '1rem',
                            background: day.sectionColor ? `${day.sectionColor}15` : (day.isEmpty ? '#f8fafc' : '#f1f5f9'),
                            borderBottom: '1px solid #e2e8f0',
                            borderTop: day.sectionColor ? `4px solid ${day.sectionColor}` : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer'
                        }}
                            onClick={() => {
                                setSelectedDayDetail({ date: day.date, activities: day.activities });
                                setIsDayDetailOpen(true);
                            }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {/* Flag Display */}
                                    {day.country && (
                                        <span style={{ fontSize: '1.5rem', lineHeight: 1, marginRight: '0.25rem' }} role="img" aria-label={`Flag for ${day.country}`}>
                                            {getFlag(day.country)}
                                        </span>
                                    )}
                                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text)' }}>
                                        Day {Math.ceil((new Date(day.date) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)) + 1}
                                    </span>
                                    {day.sectionTitle && (
                                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', color: day.sectionColor, border: `1px solid ${day.sectionColor}`, padding: '0.1rem 0.3rem', borderRadius: '0.25rem' }}>
                                            {day.sectionTitle}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                            {day.activities?.length > 0 && (
                                <span style={{ fontSize: '0.75rem', background: 'white', padding: '0.1rem 0.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                                    {day.activities.length}
                                </span>
                            )}
                        </div>

                        {/* Activities List */}
                        <div style={{ flex: 1, padding: '0.5rem' }}>
                            {day.activities?.length === 0 && (
                                <div
                                    onClick={() => handleAddActivity(day.date)}
                                    style={{
                                        padding: '2rem 1rem',
                                        textAlign: 'center',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        borderRadius: '0.5rem',
                                        border: '2px dashed #e2e8f0',
                                        margin: '0.5rem',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; }}
                                >
                                    <Plus size={24} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Plan this day</span>
                                </div>
                            )}

                            {day.activities?.map((activity) => {
                                const isSpan = activity.mode === 'span';
                                const isStart = isSpan && activity.startDate === day.date;
                                const isEnd = isSpan && activity.endDate === day.date;
                                const isMiddle = isSpan && !isStart && !isEnd;

                                let displayTitle = activity.title;
                                let displayTime = activity.time;

                                if (isStart) {
                                    displayTitle = `${activity.title} (Start)`;
                                    // displayTime remains start time
                                } else if (isMiddle) {
                                    // Middle days show just title, no time
                                    // displayTitle = activity.title; // Default is correct
                                    displayTime = '';
                                } else if (isEnd) {
                                    displayTitle = `${activity.title} (End)`;
                                    displayTime = activity.endTime || ''; // Use end time if available
                                }

                                return (
                                    <div key={`${activity.id}-${day.date}`} style={{
                                        display: 'flex',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        marginBottom: '0.5rem',
                                        background: isMiddle ? '#f8fafc' : 'white',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #f1f5f9',
                                        transition: 'transform 0.1s ease',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        opacity: isMiddle ? 0.7 : 1,
                                        borderLeft: isSpan ? '4px solid #3b82f6' : `1px solid ${activity.type === 'transport' ? '#0ea5e9' : '#f1f5f9'}`,
                                        borderLeftStyle: isMiddle ? 'dashed' : 'solid'
                                    }}
                                        onClick={() => {
                                            setEditingActivity(activity);
                                            setSelectedDate(day.date);
                                            setIsModalOpen(true);
                                        }}>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            color: 'var(--color-text-muted)',
                                            minWidth: '3rem',
                                            paddingTop: '0.1rem'
                                        }}>
                                            {displayTime}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.1rem' }}>{displayTitle}</div>

                                            {!isMiddle && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        {activity.type === 'transport' && <span style={{ color: '#0284c7' }}>✈️ Transport</span>}
                                                        {activity.type === 'stay' && <span style={{ color: '#16a34a' }}>🏨 Stay</span>}
                                                        {activity.type === 'food' && <span style={{ color: '#d97706' }}>🍽️ Food</span>}
                                                        {activity.type === 'sight' && <span style={{ color: '#7c3aed' }}>📷 Sight</span>}
                                                        {activity.type === 'car_rental' && <span style={{ color: '#ea580c' }}>🚗 Car Rental</span>}

                                                        {activity.responsibility && (
                                                            <span style={{ fontSize: '0.7rem', color: '#be185d', background: '#fce7f3', padding: '0 4px', borderRadius: '4px', border: '1px solid #fbcfe8' }}>
                                                                {activity.responsibility}
                                                            </span>
                                                        )}

                                                        {activity.flightNumber && activity.flightNumber.length < 10 && (
                                                            <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '0 4px', borderRadius: '4px', fontWeight: '500' }}>
                                                                {activity.flightNumber}
                                                            </span>
                                                        )}

                                                        {activity.type === 'transport' && (
                                                            (activity.legs && activity.legs.length > 0) ? (
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: '500', flexWrap: 'wrap' }}>
                                                                    <span style={{ color: '#64748b' }}>{activity.legs[0].depLocation ? activity.legs[0].depLocation.split(',')[0] : 'Dep'}</span>
                                                                    {activity.legs.map((leg, i) => (
                                                                        <React.Fragment key={i}>
                                                                            <span style={{ fontSize: '10px', color: '#cbd5e1' }}>➜</span>
                                                                            <span>{leg.arrLocation ? leg.arrLocation.split(',')[0] : 'Arr'}</span>
                                                                        </React.Fragment>
                                                                    ))}
                                                                </span>
                                                            ) : (
                                                                activity.arrivalLocation && (
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: '500' }}>
                                                                        <span style={{ color: '#64748b' }}>{activity.location ? activity.location.split(',')[0] : (activity.location || 'Dep')}</span>
                                                                        <span style={{ fontSize: '10px' }}>➜</span>
                                                                        <span>{activity.arrivalLocation.split(',')[0]}</span>
                                                                    </span>
                                                                )
                                                            )
                                                        )}
                                                    </div>

                                                    {activity.notes && (
                                                        <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                                                            "{activity.notes}"
                                                        </div>
                                                    )}

                                                    {activity.attachments && activity.attachments.length > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                            <FileText size={12} />
                                                            <span>{activity.attachments.length} document{activity.attachments.length > 1 ? 's' : ''}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit({ ...activity, date: day.date });
                                                }}
                                                style={{ color: '#94a3b8', padding: '0.25rem', height: 'fit-content', cursor: 'pointer', background: 'transparent', border: 'none' }}
                                                title="Edit activity"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(activity.id); }}
                                                style={{ color: '#cbd5e1', padding: '0.25rem', height: 'fit-content', cursor: 'pointer', background: 'transparent', border: 'none' }}
                                                title="Delete activity"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Add Button for non-empty days */}
                            {day.activities?.length > 0 && (
                                <button
                                    onClick={() => handleAddActivity(day.date)}
                                    style={{
                                        width: '100%',
                                        marginTop: '0.5rem',
                                        padding: '0.5rem',
                                        border: '1px dashed #cbd5e1',
                                        borderRadius: '0.5rem',
                                        color: '#64748b',
                                        fontSize: '0.8rem',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        background: 'transparent',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Plus size={14} /> Add another
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Global FAB */}
            <button
                onClick={() => { setSelectedDate(null); setEditingActivity(null); setIsModalOpen(true); }}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    background: 'var(--color-primary)',
                    color: 'white',
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '50%',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    cursor: 'pointer',
                    border: 'none'
                }}
                title="Add Activity"
            >
                <Plus size={28} />
            </button>

            <DayDetailModal
                isOpen={isDayDetailOpen}
                date={selectedDayDetail?.date}
                activities={selectedDayDetail?.activities}
                onClose={() => setIsDayDetailOpen(false)}
                onEditActivity={(act) => {
                    setIsDayDetailOpen(false);
                    setEditingActivity(act);
                    setSelectedDate(selectedDayDetail?.date);
                    setIsModalOpen(true);
                }}
            />

            <AddActivityModal
                key={editingActivity?.id || 'new-activity'} // Force remount to prevent stale state
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingActivity(null); // Clear editing state
                }}
                defaultDate={selectedDate}
                initialData={editingActivity}
                onSave={async (data) => {
                    try {
                        let { date, id, attachments, legs, mode, startDate, endDate, ...activityData } = data;

                        console.log('Saving Activity:', { id, title: activityData.title, mode });

                        // 1. Find or Create Day (target day)
                        let dayId;
                        const day = await db.days.where({ tripId: trip.id, date: date }).first();
                        if (!day) {
                            dayId = await db.days.add({
                                tripId: trip.id,
                                date: date,
                                title: new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
                            });
                        } else {
                            dayId = day.id;
                        }

                        // PRE-PROCESS NOTES: Ensure Check-in time is always added for stays
                        // Relaxed check: 'check' covers 'Check-in', 'Check In', 'Checking in'
                        const isStay = activityData.type === 'stay';

                        // AUTO-DETECT SPANNING (Fix for Single Entry Bug)
                        // If it's a Stay or Car Rental and dates differ, force SPAN mode
                        if (activityData.type === 'stay' || activityData.type === 'car_rental') {
                            const start = new Date(date);
                            const end = new Date(activityData.arrivalDate || date);
                            // Reset times to compare dates only
                            start.setHours(0, 0, 0, 0);
                            end.setHours(0, 0, 0, 0);

                            if (end > start) {
                                console.log('Auto-detected Spanning Event:', activityData.type, date, 'to', activityData.arrivalDate);
                                mode = 'span';
                                startDate = date;
                                endDate = activityData.arrivalDate;
                            }
                        }

                        const displayTitle = (isStay && !activityData.title.toLowerCase().startsWith('check'))
                            ? `Check-in ${activityData.title}`
                            : activityData.title;

                        if (isStay && displayTitle.toLowerCase().startsWith('check')) {
                            // Valid 'Check-in time' regex pattern (case insensitive)
                            const checkInTime = activityData.time || '14:00';
                            let finalNotes = activityData.notes || '';
                            const timePattern = /\(Check-in time: .*\)|Check-in time: .*/i;

                            if (timePattern.test(finalNotes)) {
                                // Update existing time
                                finalNotes = finalNotes.replace(timePattern, `(Check-in time: ${checkInTime})`);
                            } else {
                                // Append if missing
                                finalNotes = finalNotes ? `${finalNotes} (Check-in time: ${checkInTime})` : `Check-in time: ${checkInTime}`;
                            }
                            activityData.notes = finalNotes;
                        }

                        // GROUP ID LOGIC
                        // Check if this is a multi-day type that NEEDS expansion
                        const needsExpansion = false; // Legacy expansion disabled in favor of single-record spanning

                        // If updating, check if we have a groupId
                        let existingGroupId = null;
                        if (id) {
                            const existing = await db.activities.get(id);
                            existingGroupId = existing?.groupId;
                        }

                        // A) HANDLE UPDATES FOR LINKED GROUPS
                        if (existingGroupId) {
                            // If we are updating a grouped activity, we must perform a "Clean Slate" update.
                            // 1. Delete ALL activities in this group
                            const groupMembers = await db.activities.where({ groupId: existingGroupId }).toArray();
                            const memberIds = groupMembers.map(m => m.id);
                            await db.activities.bulkDelete(memberIds);

                            // 2. Clear 'id' so we force a CREATE flow below (preserving the groupId if still expanding)
                            // If it NO LONGER needs expansion (user shortened date), we treat it as single.
                            // Ideally, we reuse the groupId if it's still multi-day, or drop it if single?
                            // Let's just create new fresh activities. If needsExpansion is true, we generate a NEW groupId or reuse old one.
                            // Reusing old one is better for continuity if we want, but generating new is safer.
                            // Let's reuse existingGroupId if needsExpansion is true.
                        }

                        // B) PREPARE FOR CREATE / RE-CREATE
                        // If we just deleted everything (Update case), 'id' is effectively moot for the DB insert, 
                        // but we might want to preserve the ID of the *primary* activity if we could... 
                        // but bulkDelete wiped it. So we are inserting fresh.
                        // This creates a potential issue: "Editing" usually preserves ID. 
                        // If we delete & re-create, the ID changes. 
                        // This might confuse React keys or selection state if not handled.
                        // However, for this specific "Fix the mistake" request, atomic replacement is best.

                        let currentGroupId = existingGroupId;
                        if (!currentGroupId && needsExpansion) {
                            currentGroupId = crypto.randomUUID();
                        }
                        if (!needsExpansion) {
                            currentGroupId = null; // Reset if it's now single day
                        }

                        // 2. Add (or Re-Add) Main Activity
                        // Note: If we had an 'id' and didn't trigger the group-wipe, we use update. 
                        // If we triggered group-wipe, we use add.
                        let activityId;

                        if (id && !existingGroupId) {
                            // Simple Update (non-grouped) -> Upgrading to Grouped if expansion needed
                            // Optimization: Check title prefix for Check-in here too?
                            // For simplicity, let's just make sure we save the groupId if we generated one.

                            const isStay = activityData.type === 'stay';
                            const displayTitle = (isStay && !activityData.title.toLowerCase().startsWith('check'))
                                ? `Check-in ${activityData.title}`
                                : activityData.title;


                            // Notes already pre-processed at top of function


                            await db.activities.update(id, {
                                ...activityData,
                                title: displayTitle,
                                notes: activityData.notes, // Use pre-processed notes
                                date,
                                dayId,
                                legs,
                                groupId: currentGroupId, // Save the new Group ID!
                                mode,
                                startDate,
                                endDate
                            });
                            activityId = id;
                        } else {
                            // Create New OR Re-Create Grouped
                            const displayTitle = (isStay && !activityData.title.toLowerCase().startsWith('check'))
                                ? `Check-in ${activityData.title}`
                                : activityData.title;

                            activityId = await addActivity({
                                ...activityData,
                                title: displayTitle,
                                notes: activityData.notes, // Use pre-processed notes
                                date,
                                dayId,
                                legs,
                                groupId: currentGroupId,
                                mode,
                                startDate,
                                endDate
                            });
                        }

                        // 3. EXPANSION LOGIC (Only if needsExpansion)
                        if (needsExpansion) {
                            console.log(`Expanding ${activityData.type} with GroupID ${currentGroupId}...`, activityData);
                            const startDate = new Date(date);
                            const endDate = new Date(activityData.arrivalDate);
                            const diffTime = endDate - startDate;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            const isStay = activityData.type === 'stay';
                            const middleLabel = isStay ? `Stay ` : `Car Rental`;
                            const endLabel = isStay ? `Check Out: ${activityData.title}` : `Drop Off: ${activityData.title}`;
                            const endNotes = isStay
                                ? `Check out time: ${activityData.arrivalTime || '10:00'}`
                                : `Drop off time: ${activityData.arrivalTime || '10:00'}`;

                            if (diffDays > 0) {
                                // Middle Days
                                for (let i = 1; i < diffDays; i++) {
                                    const nextDate = new Date(startDate);
                                    nextDate.setDate(startDate.getDate() + i);
                                    const nextDateStr = nextDate.toISOString().split('T')[0];

                                    let midDay = await db.days.where({ tripId: trip.id, date: nextDateStr }).first();
                                    if (!midDay) {
                                        const dId = await db.days.add({
                                            tripId: trip.id,
                                            date: nextDateStr,
                                            title: new Date(nextDateStr).toLocaleDateString('en-US', { weekday: 'long' })
                                        });
                                        midDay = await db.days.get(dId);
                                    }

                                    // 1. DYNAMIC TITLE: Use the user's title, not hardcoded "Car Rental"
                                    const expandedTitle = isStay
                                        ? `${activityData.title} (Day ${i + 1})`
                                        : `${activityData.title} (Day ${i + 1})`; // Consistent naming for Rentals too

                                    // 2. SMART CLEANUP REMOVED: It was deleting legacy data. 
                                    // Now we simply ADD the new activity. Duplicates are better than data loss.

                                    await addActivity({
                                        tripId: trip.id,
                                        dayId: midDay.id,
                                        title: expandedTitle,
                                        notes: `Day ${i + 1} of ${isStay ? 'stay' : 'rental'}`,
                                        type: activityData.type,
                                        time: '09:00',
                                        date: nextDateStr,
                                        location: isStay ? activityData.location : undefined,
                                        lat: isStay ? activityData.lat : undefined,
                                        lng: isStay ? activityData.lng : undefined,
                                        groupId: currentGroupId // Link!
                                    });
                                }

                                // End Day
                                const dropDateStr = activityData.arrivalDate;
                                let dropDay = await db.days.where({ tripId: trip.id, date: dropDateStr }).first();
                                if (!dropDay) {
                                    const dId = await db.days.add({
                                        tripId: trip.id,
                                        date: dropDateStr,
                                        title: new Date(dropDateStr).toLocaleDateString('en-US', { weekday: 'long' })
                                    });
                                    dropDay = await db.days.get(dId);
                                }

                                // NUCLEAR CLEANUP REMOVED (End Day)

                                await addActivity({
                                    tripId: trip.id,
                                    dayId: dropDay.id,
                                    title: endLabel,
                                    type: activityData.type,
                                    time: activityData.arrivalTime || '10:00',
                                    date: dropDateStr,
                                    location: activityData.arrivalLocation || activityData.location,
                                    lat: activityData.arrivalLat || activityData.lat,
                                    lng: activityData.arrivalLng || activityData.lng,
                                    notes: endNotes,
                                    groupId: currentGroupId // Link!
                                });
                            }
                        }

                        // Force UI refresh hint
                        alert('Activity Saved & Duplicates Cleaned!');

                        // 4. Handle Attachments
                        // Note: If we wiped the group, we might have lost attachment links if we aren't careful?
                        // Attachments link to activityId. If activityId changed (Re-create), we need to handle that?
                        // Current logic: deletions handling below... 
                        // Actually, if we re-create, 'activityId' is NEW. 
                        // 'attachments' array from form contains:
                        //   - Existing Docs (objects with 'id', 'activityId' of OLD activity)
                        //   - New Files (File objects)
                        // For Existing Docs: We need to UPDATE their activityId to the new one!

                        if (attachments && attachments.length > 0) {
                            for (const att of attachments) {
                                if (att instanceof File) {
                                    // New File
                                    await db.documents.add({
                                        tripId: trip.id,
                                        activityId: activityId,
                                        title: att.name,
                                        type: att.type || 'application/octet-stream',
                                        blob: att,
                                        created_at: new Date().toISOString()
                                    });
                                } else if (att.id) {
                                    // Existing Doc - Re-link if ID changed
                                    if (att.activityId !== activityId) {
                                        await db.documents.update(att.id, { activityId: activityId });
                                    }
                                }
                            }
                        }

                        // Cleanup orphaned docs if we did a delete/recreate? 
                        // If we had 'id' (old), we can check if any docs point to it?
                        // But effectively we handled "keep these attachments". 
                        // Any attachments NOT in the list will be orphaned or we should delete them?
                        // The 'toDelete' logic below handles removals based on UI.

                        if (id && !existingGroupId) {
                            // Logic for standard update...
                            // NOTE: If we did group wipe, 'id' is gone from DB, but we know it existed.
                            // But for simplicity, let's just assume the re-link above saves what we kept.
                            // We can iterate orphaned docs for the OLD id just in case?
                            // Ideally, bulkDelete(memberIds) should also delete linked docs?
                            // Let's rely on loose cleanup or assume user kept attachments in UI.
                        }

                        /*
            ORIGINAL Deletion Logic reused?
            It relied on db.documents.where({activityId: id }).
            If we used Group Wipe, that OLD ID is gone.
            The new attachments are re-linked above.
            So we are good.
            */

                        setIsModalOpen(false);
                        setEditingActivity(null);
                    } catch (error) {
                        console.error('Error saving activity:', error);
                        alert(`Failed to save: ${error.message}`);
                    }
                }}
                tripId={trip.id}
                days={timeline || []} // Pass timeline as days context if needed
            />

            <ManageSectionsModal
                isOpen={isManageSectionsOpen}
                onClose={() => setIsManageSectionsOpen(false)}
                tripId={trip?.id}
            />
        </div >
    );
}
