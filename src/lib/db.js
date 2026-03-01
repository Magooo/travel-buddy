import Dexie from 'dexie';

export const db = new Dexie('OdysseyDB');

// Define schema
db.version(1).stores({
    trips: '++id, title, startDate',
    days: '++id, tripId, date',
    activities: '++id, dayId, tripId, time'
});

// V2: Add documents and coordinates
db.version(2).stores({
    trips: '++id, title, startDate',
    days: '++id, tripId, date',
    activities: '++id, dayId, tripId, time', // lat, lng are optional props
    documents: '++id, tripId, title, type, created_at' // blob stored in object
});

db.version(3).stores({
    trips: '++id, title, startDate',
    days: '++id, tripId, date',
    activities: '++id, dayId, tripId, time',
    documents: '++id, tripId, title, type, created_at',
    sections: '++id, tripId, title, startDate, endDate, color, lat, lng'
});

// V4: Link documents to activities
db.version(4).stores({
    trips: '++id, title, startDate',
    days: '++id, tripId, date',
    activities: '++id, dayId, tripId, time',
    documents: '++id, tripId, activityId, title, type, created_at',
    sections: '++id, tripId, title, startDate, endDate, color, lat, lng'
});

// V6: Add spanning support (mode, startDate, endDate)
db.version(6).stores({
    trips: '++id, title, startDate',
    days: '++id, tripId, date',
    activities: '++id, dayId, tripId, time, groupId, mode, startDate, endDate', // Added new indexes
    documents: '++id, tripId, activityId, title, type, created_at',
    sections: '++id, tripId, title, startDate, endDate, color, lat, lng'
});

export async function getActivitiesForDay(tripId, date) {
    // 1. Get exact single-day matches
    // We can query by dayId if we have the day object, OR query by date if we stored it (we store date in activities now in addActivity but not indexed? Let's assume we rely on dayId mostly, but for span items we rely on dates).
    // Actually, `addActivity` puts `date` in the object.

    // Let's rely on fetching ALL activities for the trip and filtering in memory for flexibility, 
    // as Dexie complex OR queries can be tricky.
    const allActivities = await db.activities.where({ tripId }).toArray();

    return allActivities.filter(act => {
        if (!act.mode || act.mode === 'single_day') {
            // Match by exact date string or dayId (if we resolved date -> dayId)
            // `act.date` is stored as string 'YYYY-MM-DD'
            return act.date === date;
        } else if (act.mode === 'span') {
            // Check if date is within range [startDate, endDate] inclusive
            return date >= act.startDate && date <= act.endDate;
        }
        return false;
    }).sort((a, b) => {
        // Sort by time, but Spanning items might not have time on middle days.
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
    });
}

// Helper to check if DB is empty and seed it
export async function seedDatabase() {
    const HAS_SEEDED_KEY = 'odyssey_db_seeded_v2'; // Increment to force re-seed for new users/versions if needed
    if (localStorage.getItem(HAS_SEEDED_KEY)) {
        console.log('Database already seeded (or skipped).');
        return;
    }

    // Check if Japan exists
    let japanTrip = await db.trips.where('title').equals('Japan 2026').first();
    if (!japanTrip) {
        const tripId = await db.trips.add({
            title: 'Japan 2026',
            startDate: '2026-04-01',
            endDate: '2026-04-14',
            coverImage: 'tokyo.jpg'
        });

        // Create 3 days
        const day1Id = await db.days.add({ tripId, date: '2026-04-01', title: 'Arrival & Shinjuku' });
        const day2Id = await db.days.add({ tripId, date: '2026-04-02', title: 'Deep Dive Tokyo' });
        const day3Id = await db.days.add({ tripId, date: '2026-04-03', title: 'Day Trip to Kamakura' });

        // Add Activities
        await db.activities.bulkAdd([
            { dayId: day1Id, tripId, time: '14:00', title: 'Land at Narita (NRT)', type: 'transport', location: 'Narita T1', notes: 'Take NEX train to Shinjuku' },
            { dayId: day1Id, tripId, time: '16:00', title: 'Check-in Hotel', type: 'stay', location: 'Hotel Gracery Shinjuku', notes: 'Booking #12345' },
            { dayId: day1Id, tripId, time: '19:00', title: 'Omoide Yokocho Dinner', type: 'food', location: 'Shinjuku', notes: 'Yakitori alley' },
            { dayId: day2Id, tripId, time: '09:00', title: 'TeamLabs Planets', type: 'sight', location: 'Toyosu', notes: 'Tickets in Vault' },
            { dayId: day2Id, tripId, time: '13:00', title: 'Lunch at Tsujiki Market', type: 'food', location: 'Tsujiki', notes: 'Get sushi!' },
        ]);
        console.log('Seeded Japan 2026');
    }

    // Check if Europe exists
    let europeTrip = await db.trips.where('title').equals('Europe 2026').first();
    if (!europeTrip) {
        const europeId = await db.trips.add({
            title: 'Europe 2026',
            startDate: '2026-05-26',
            endDate: '2026-06-14', // Extended end date for cruise
            coverImage: 'london.jpg'
        });

        // Seed basic sections with HEX colors and Country Codes
        await db.sections.bulkAdd([
            { tripId: europeId, title: 'Arrival & UK', startDate: '2026-05-26', endDate: '2026-06-03', color: '#3b82f6', country: 'GB', lat: 51.5074, lng: -0.1278 }, // Blue (London)
            { tripId: europeId, title: 'Cruise Start', startDate: '2026-06-04', endDate: '2026-06-08', color: '#f59e0b', country: 'ES', lat: 41.3851, lng: 2.1734 }, // Amber (Barcelona)
            { tripId: europeId, title: 'Italy Leg', startDate: '2026-06-09', endDate: '2026-06-14', color: '#10b981', country: 'IT', lat: 43.7696, lng: 11.2558 }  // Emerald (Florence)
        ]);

        // Seed Activities for Europe
        // Get day IDs first? No, we need to create days first to link them.

        // Helper to create a day
        const createDay = async (date, title) => await db.days.add({ tripId: europeId, date, title });

        const day1 = await createDay('2026-07-15', 'London Arrival');
        const day2 = await createDay('2026-07-16', 'Cotswolds / Chipping Norton');
        const day3 = await createDay('2026-07-17', 'Amsterdam (Viking Start)');
        const dayCruise1 = await createDay('2026-07-17', 'Amsterdam (Viking Embarkation)');
        const dayCruise2 = await createDay('2026-07-18', 'Kinderdijk Windmills');
        const dayCruise3 = await createDay('2026-07-19', 'Cologne');

        await db.activities.bulkAdd([
            { dayId: day1, tripId: europeId, time: '06:30', title: 'Flight to London', type: 'transport', location: 'Abu Dhabi (AUH)', lat: 24.4329, lng: 54.6511, notes: 'Etihad Flight EY19 (Ref: 8BMK5X)' },
            { dayId: day1, tripId: europeId, time: '14:00', title: 'Check-in Corner House Hotel', type: 'stay', location: 'Gatwick', lat: 51.1537, lng: -0.1821, notes: 'Booking confirmed (Holiday parking included)' },
            { dayId: day2, tripId: europeId, time: '10:00', title: 'Drive to Chipping Norton', type: 'transport', location: 'Cotswolds', lat: 51.9295, lng: -1.5482, notes: '1.5 hr drive' },
            { dayId: day2, tripId: europeId, time: '15:00', title: 'Check-in Cosy Bliss Lodge', type: 'stay', location: 'Chipping Norton', lat: 51.9442, lng: -1.5471, notes: '5 min walk to town - Pass the Keys' },
            { dayId: day3, tripId: europeId, time: '12:00', title: 'Viking Grand European Tour', type: 'activity', location: 'Amsterdam', lat: 52.3676, lng: 4.9041, notes: 'Boarding Viking Saturn - Guest: HANLON' },

            { dayId: dayCruise1, tripId: europeId, time: '12:00', title: 'Board Viking Saturn', type: 'transport', location: 'Barcelona Port', lat: 41.3851, lng: 2.1734, notes: 'Viking Ocean Cruises (Inv: 9453481)' },
            { dayId: dayCruise1, tripId: europeId, time: '18:00', title: 'Welcome Dinner', type: 'food', location: 'The Restaurant', lat: 41.3851, lng: 2.1734, notes: 'Smart Casual' },
            { dayId: dayCruise2, tripId: europeId, time: '09:00', title: 'Included Excursion: Palma Cathedral', type: 'sight', location: 'Palma', lat: 39.5695, lng: 2.6499, notes: 'Shore Excursion A' },
            { dayId: dayCruise3, tripId: europeId, time: '08:00', title: 'Train to Florence', type: 'transport', location: 'Livorno Station', lat: 43.5518, lng: 10.3080, notes: 'Private Transfer' },
            { dayId: dayCruise3, tripId: europeId, time: '11:00', title: 'Duomo Climb', type: 'activity', location: 'Florence', lat: 43.7731, lng: 11.2560, notes: '463 steps' },
        ]);

        console.log('Seeded Europe 2026');
    }

    localStorage.setItem(HAS_SEEDED_KEY, 'true');
}

export async function patchDatabase() {
    const PATCH_KEY = 'odyssey_db_sanitized_v6'; // Increment to force run
    if (localStorage.getItem(PATCH_KEY)) return;

    console.log('Running database sanitization v6...');

    try {
        const activities = await db.activities.toArray();
        const days = await db.days.toArray();
        const trips = await db.trips.toArray();

        // Helper map for Day IDs (string -> number)
        // If we have mixed types, we want to normalize. Dexie usually has number IDs.
        // If dayId is string, try to find matching day by comparing stringified IDs.
        const dayIdMap = new Map();
        days.forEach(d => dayIdMap.set(String(d.id), d.id));

        const tripIdMap = new Map();
        trips.forEach(t => tripIdMap.set(String(t.id), t.id));

        const updates = [];

        for (const a of activities) {
            let changed = false;
            let newItem = { ...a };

            // 1. Fix Day ID (String -> Number)
            if (typeof a.dayId === 'string') {
                const numId = dayIdMap.get(a.dayId);
                if (numId) {
                    newItem.dayId = numId;
                    changed = true;
                }
            }

            // 2. Fix Trip ID (String -> Number)
            if (typeof a.tripId === 'string') {
                const numId = tripIdMap.get(a.tripId);
                if (numId) {
                    newItem.tripId = numId;
                    changed = true;
                }
            } else if (!a.tripId && a.dayId) {
                // Infer Trip ID from Day if missing
                const day = days.find(d => d.id === a.dayId);
                if (day && day.tripId) {
                    newItem.tripId = day.tripId;
                    changed = true;
                }
            }

            // 3. Fix Legs (Ensure Array)
            if (!newItem.legs) {
                newItem.legs = [];
                changed = true;
            }

            // 4. Fix Coordinates (String -> Number)
            if (newItem.lat && typeof newItem.lat === 'string') {
                newItem.lat = parseFloat(newItem.lat);
                newItem.lng = parseFloat(newItem.lng);
                changed = true;
            }

            // 5. Fix Leg Coordinates
            if (newItem.legs.length > 0) {
                const newLegs = newItem.legs.map(l => {
                    let legChanged = false;
                    let newL = { ...l };
                    if (newL.depLat && typeof newL.depLat === 'string') {
                        newL.depLat = parseFloat(newL.depLat);
                        newL.depLng = parseFloat(newL.depLng);
                        legChanged = true;
                    }
                    if (newL.arrLat && typeof newL.arrLat === 'string') {
                        newL.arrLat = parseFloat(newL.arrLat);
                        newL.arrLng = parseFloat(newL.arrLng);
                        legChanged = true;
                    }
                    // Fix Date Format (DD/MM/YYYY -> YYYY-MM-DD)
                    if (newL.depDate && newL.depDate.match && newL.depDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                        const [d, m, y] = newL.depDate.split('/');
                        newL.depDate = `${y}-${m}-${d}`;
                        legChanged = true;
                    }
                    if (newL.arrDate && newL.arrDate.match && newL.arrDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                        const [d, m, y] = newL.arrDate.split('/');
                        newL.arrDate = `${y}-${m}-${d}`;
                        legChanged = true;
                    }
                    if (legChanged) changed = true;
                    return newL;
                });
                newItem.legs = newLegs;
            }

            // 6. Init Mode (default to single_day)
            if (!newItem.mode) {
                newItem.mode = 'single_day';
                changed = true;
            }

            if (changed) {
                updates.push(db.activities.put(newItem)); // put handles update if id exists
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates);
            console.log(`Sanitized ${updates.length} activities.`);
        }

        localStorage.setItem(PATCH_KEY, 'true');
        console.log('Sanitization complete. Reloading...');
        window.location.reload();

    } catch (err) {
        console.error('Error sanitizing database:', err);
    }
}

import { supabase } from './supabase';

export async function syncFromSupabase() {
    console.log('Syncing from Supabase...');

    // 1. Fetch Trips
    const { data: trips } = await supabase.from('trips').select('*');
    if (trips && trips.length > 0) {
        const mappedTrips = trips.map(t => ({
            ...t,
            startDate: t.start_date || t.startDate,
            endDate: t.end_date || t.endDate,
            coverImage: t.cover_image || t.coverImage
        }));
        await db.trips.bulkPut(mappedTrips);
    }

    // 2. Fetch Days
    const { data: days } = await supabase.from('days').select('*');
    if (days && days.length > 0) {
        const mappedDays = days.map(d => ({
            ...d,
            tripId: d.trip_id || d.tripId
        }));
        await db.days.bulkPut(mappedDays);
    }

    // 3. Fetch Activities
    const { data: remoteActivities } = await supabase.from('activities').select('*');
    if (remoteActivities && remoteActivities.length > 0) {
        // Prevent overwriting local 'legs' if remote doesn't have them (Schema mismatch protection)
        const localActivities = await db.activities.toArray();
        const localLegsMap = new Map(localActivities.filter(a => a.legs).map(a => [a.id, a.legs]));

        const mergedActivities = remoteActivities.map(remote => {
            // Map snake_case to camelCase
            const mapped = {
                ...remote,
                tripId: remote.trip_id || remote.tripId,
                dayId: remote.day_id || remote.dayId,
                startDate: remote.start_date || remote.startDate,
                endDate: remote.end_date || remote.endDate,
                endTime: remote.end_time || remote.endTime
            };

            if (!mapped.legs && localLegsMap.has(mapped.id)) {
                return { ...mapped, legs: localLegsMap.get(mapped.id) };
            }
            return mapped;
        });

        await db.activities.bulkPut(mergedActivities);

        // 4. Extract and Sync Attachments (Documents)
        const allDocs = [];
        for (const act of mergedActivities) {
            if (act.attachments && Array.isArray(act.attachments)) {
                for (const att of act.attachments) {
                    if (att.url) {
                        // Check for duplicates? For now, we rely on the fact that we don't usually modify attachments remotely.
                        // Ideally we check if doc exists for this activity with same URL.
                        const existing = await db.documents.where({ activityId: act.id }).filter(d => d.url === att.url).first();

                        if (!existing) {
                            allDocs.push({
                                activityId: act.id,
                                tripId: act.tripId,
                                title: att.name,
                                type: att.type || 'application/pdf',
                                url: att.url, // Remote URL
                                created_at: new Date().toISOString()
                            });
                        }
                    }
                }
            }
        }

        if (allDocs.length > 0) {
            await db.documents.bulkAdd(allDocs);
            console.log(`Synced ${allDocs.length} new attachments from cloud.`);
        }
    }

    console.log('Sync complete.');
}

export async function addActivity(activity) {
    const { dayId, tripId, time, title, type, location, notes, legs, mode, startDate, endDate } = activity;

    // 1. Local Write (Optimistic)
    const id = await db.activities.add({
        ...activity,
        mode: mode || 'single_day', // Default to single_day if not provided
        startDate: startDate || activity.date, // fallback
        endDate: endDate || activity.date // fallback
    });

    // 2. Remote Write (Async)
    supabase.from('activities').insert([
        {
            trip_id: tripId,
            day_id: dayId,
            time,
            title,
            type,
            location,
            notes,
            legs,
            mode,
            start_date: startDate,
            end_date: endDate,
            end_time: activity.endTime,
            responsibility: activity.responsibility
        }
    ]).then(({ error }) => {
        if (error) console.error('Supabase write failed:', error);
        else console.log('Supabase write success');
    });

    return id;
}

export async function seedExtraTripData() {
    const SEED_KEY = 'odyssey_db_extra_data_v2';
    if (localStorage.getItem(SEED_KEY)) return;
}

export async function fixItineraryDisplay() {
    const FIX_KEY = 'odyssey_db_fix_display_v8';
    if (localStorage.getItem(FIX_KEY)) return;

    console.log('Running Itinerary Fix v8 (FULL PIPELINE + AGGRESSIVE FLIGHT MERGE)...');

    try {
        const europeTrip = await db.trips.where('title').equals('Europe 2026').first();
        if (!europeTrip) return;

        // 1. PURGE PREVIOUS EXPANSIONS
        const allActs = await db.activities.where({ tripId: europeTrip.id }).toArray();
        const expansionsToDelete = allActs
            .filter(a => a.title.match(/\(Day \d+\)$/))
            .map(a => a.id);

        if (expansionsToDelete.length > 0) {
            console.log(`Purging ${expansionsToDelete.length} stale expansion entries...`);
            await db.activities.bulkDelete(expansionsToDelete);
        }

        // 2. MERGE DUPLICATE DAYS
        const days = await db.days.where({ tripId: europeTrip.id }).toArray();
        const dateMap = new Map();
        const daysToDelete = [];

        days.forEach(d => {
            if (!dateMap.has(d.date)) dateMap.set(d.date, []);
            dateMap.get(d.date).push(d.id);
        });

        for (const [date, ids] of dateMap.entries()) {
            if (ids.length > 1) {
                // Keep the first one, merge others
                const [targetId, ...dupIds] = ids.sort((a, b) => a - b);

                // Move activities from dups to target
                const actsToMove = await db.activities.where('dayId').anyOf(dupIds).toArray();
                for (const act of actsToMove) {
                    await db.activities.update(act.id, { dayId: targetId });
                }

                daysToDelete.push(...dupIds);
            }
        }

        if (daysToDelete.length > 0) {
            await db.days.bulkDelete(daysToDelete);
        }

        // 3. AGGRESSIVE DEDUPLICATION
        // Re-fetch activities
        const dayActs = await db.activities.where({ tripId: europeTrip.id }).toArray();
        const actsByDay = new Map();

        dayActs.forEach(a => {
            if (!actsByDay.has(a.dayId)) actsByDay.set(a.dayId, []);
            actsByDay.get(a.dayId).push(a);
        });

        const fuzzyDups = [];

        for (const [dayId, acts] of actsByDay.entries()) {
            const sorted = acts.sort((a, b) => a.time.localeCompare(b.time));

            for (let i = 0; i < sorted.length - 1; i++) {
                const curr = sorted[i];
                const next = sorted[i + 1];

                // Check for duplicate candidates (same time/type)
                if (curr.time === next.time && curr.type === next.type) {
                    let shouldRemoveNext = false;

                    // CASE A: Transport (Flights)
                    // If same time and type transport, it's a duplicate.
                    // Keep the one with 'legs' data or better formatting.
                    if (curr.type === 'transport') {
                        const currHasLegs = curr.legs && curr.legs.length > 0;
                        const nextHasLegs = next.legs && next.legs.length > 0;

                        if (currHasLegs && !nextHasLegs) {
                            console.log(`Dedup Flight: Keeping populated '${curr.title}', removing '${next.title}'`);
                            shouldRemoveNext = true;
                        } else if (!currHasLegs && nextHasLegs) {
                            console.log(`Dedup Flight: Keeping populated '${next.title}', removing '${curr.title}'`);
                            // Mark curr for deletion, swap next into curr position for loop continuity logic? 
                            // Easier: Delete curr.
                            fuzzyDups.push(curr.id);
                            continue; // Logic breakage potential, but simplistic approach:
                        } else {
                            // Both have legs or neither. Pick 'Flight to' over names.
                            if (curr.title.includes('Flight to')) shouldRemoveNext = true;
                            else if (next.title.includes('Flight to')) {
                                fuzzyDups.push(curr.id);
                                continue;
                            } else {
                                shouldRemoveNext = true; // Default kill next
                            }
                        }
                    }
                    // CASE B: Stay (Hotels) - Fuzzy Title Match
                    else if (curr.type === 'stay') {
                        const t1 = curr.title.toLowerCase().replace('check-in ', '').trim();
                        const t2 = next.title.toLowerCase().replace('check-in ', '').trim();

                        if (t1.includes(t2) || t2.includes(t1)) {
                            console.log(`Dedup Stay: keeping '${curr.title}', removing '${next.title}'`);
                            shouldRemoveNext = true;
                        }
                    }

                    if (shouldRemoveNext) {
                        fuzzyDups.push(next.id);
                        i++; // Skip next in loop
                    }
                }
            }
        }

        if (fuzzyDups.length > 0) {
            await db.activities.bulkDelete(fuzzyDups);
        }

        // 4. ENRICH NOTES
        const enrichedActs = await db.activities.where({ tripId: europeTrip.id }).toArray();
        for (const act of enrichedActs) {
            let update = null;
            const title = act.title.toLowerCase();

            if (title.includes('corner house') && !act.notes.includes('3 nights')) {
                update = { notes: act.notes + ' 3 nights.' };
            }
            else if (title.includes('cosy bliss') && !act.notes.includes('4 nights')) {
                update = { notes: act.notes + ' 4 nights.' };
            }
            else if (title.includes('hodson bay') && !act.notes.includes('6 nights')) {
                update = { notes: act.notes + ' 6 nights.' };
            }

            if (update) {
                await db.activities.update(act.id, update);
            }
        }

        // 5. EXPAND STAYS
        const finalActs = await db.activities.where({ tripId: europeTrip.id }).toArray();
        const stayActivities = finalActs.filter(a => a.type === 'stay');

        for (const stay of stayActivities) {
            if (stay.title.match(/\(Day \d+\)$/)) continue;

            const nightsMatch = stay.notes.match(/(\d+)\s*nights/i);
            if (!nightsMatch) continue;

            const nights = parseInt(nightsMatch[1], 10);
            if (nights <= 1) continue;

            const baseTitle = stay.title.replace(/^Check-in\s+/i, '').trim();
            console.log(`Expanding '${baseTitle}' for ${nights} nights...`);

            const startDay = await db.days.get(stay.dayId);
            if (!startDay) continue;

            const startDate = new Date(startDay.date);

            for (let i = 1; i < nights; i++) {
                const nextDate = new Date(startDate);
                nextDate.setDate(startDate.getDate() + i);
                const nextDateStr = nextDate.toISOString().split('T')[0];

                let day = await db.days.where({ tripId: europeTrip.id, date: nextDateStr }).first();
                if (!day) {
                    const id = await db.days.add({ tripId: europeTrip.id, date: nextDateStr, title: `Day ${i + 1} at ${baseTitle}` });
                    day = await db.days.get(id);
                }

                // Check existence using strict title match
                const exists = await db.activities.where({
                    dayId: day.id,
                    title: `${baseTitle} (Day ${i + 1})`
                }).first();

                if (!exists) {
                    await db.activities.add({
                        tripId: stay.tripId,
                        dayId: day.id,
                        time: '12:00',
                        title: `${baseTitle} (Day ${i + 1})`,
                        type: 'stay',
                        location: stay.location,
                        lat: stay.lat,
                        lng: stay.lng,
                        notes: `Continuation.`
                    });
                }
            }
        }

        console.log('Itinerary Fix v8 Complete.');
        localStorage.setItem(FIX_KEY, 'true');
        window.location.reload();

    } catch (err) {
        console.error('Error seeding extra data:', err);
    }
}
