
import { db } from './db';

// Force re-seed of the Europe trip
export const forceSeed = async () => {
    // 1. Find existing trip
    const existingTrip = await db.trips.where('title').equals('Europe 2026').first();
    let tripId;

    if (existingTrip) {
        tripId = existingTrip.id;
        // clear old days/activities
        await db.days.where({ tripId }).delete();
        await db.activities.where({ tripId }).delete();
        // update dates
        await db.trips.update(tripId, { startDate: '2026-05-26', endDate: '2026-07-16' });
    } else {
        tripId = await db.trips.add({
            title: 'Europe 2026',
            startDate: '2026-05-26',
            endDate: '2026-07-16',
            coverImage: 'https://images.unsplash.com/photo-1473951574080-01fe45ec8643?auto=format&fit=crop&q=80',
            created_at: new Date()
        });
    }

    // 2. Create Days
    const createDay = async (date, title) => await db.days.add({ tripId, date, title });

    const day0 = await createDay('2026-05-26', 'Melbourne Departure');
    const day1 = await createDay('2026-05-27', 'London Arrival (Gatwick)');
    const day2 = await createDay('2026-05-28', 'Horley / Gatwick');
    const day3 = await createDay('2026-05-29', 'Horley / Gatwick');
    const day4 = await createDay('2026-05-30', 'Transfer to Cotswolds');
    const day5 = await createDay('2026-05-31', 'Chipping Norton');
    const day6 = await createDay('2026-06-01', 'Chipping Norton');
    const day7 = await createDay('2026-06-02', 'Chipping Norton');
    const day8 = await createDay('2026-06-03', 'Chipping Norton');
    const day9 = await createDay('2026-06-04', 'Travel to Ireland');
    // const dayCruise = await createDay('2026-06-14', 'Viking Cruise Start'); // Removed fixed var

    // 3. Populate Activities
    await db.activities.bulkAdd([
        // Day 0: May 26 - Melbourne
        {
            dayId: day0, tripId, time: '18:00', title: 'Depart Melbourne (MEL)',
            type: 'transport', location: 'Tullamarine Airport',
            notes: 'Flight to London (Etihad/Other)'
        },

        // Day 1: May 27 - Arrivals
        {
            dayId: day1, tripId, time: '06:30', title: 'Jason, Cathy, Margaret Arrive',
            type: 'transport', location: 'Gatwick (LGW)',
            notes: 'Etihad Flight (Group A)'
        },
        {
            dayId: day1, tripId, time: '07:45', title: 'Bob & Judy Arrive',
            type: 'transport', location: 'Gatwick (LGW)',
            notes: 'Flight (Group B)'
        },
        {
            dayId: day1, tripId, time: '14:00', title: 'Check-in Corner House Hotel',
            type: 'stay', location: 'Horley',
            notes: 'Confirmed for 5 Adults (Judy confirmed booking). Holiday parking included.'
        },

        // Day 4: May 30 - Cotswolds
        {
            dayId: day4, tripId, time: '10:00', title: 'Drive to Cotswolds',
            type: 'transport', location: 'En route',
            notes: 'Group travel'
        },
        {
            dayId: day4, tripId, time: '16:00', title: 'Check-in Cosy Bliss Lodge',
            type: 'stay', location: 'Chipping Norton',
            notes: 'Pass the Keys confirmation. 4 Nights. 3-Bedroom House.'
        },

        // Day 9: June 4 - Ireland (Hodson Bay confirmed check-in)
        {
            dayId: day9, tripId, time: '10:00', title: 'Travel to Ireland',
            type: 'transport', location: 'Hodson Bay',
            notes: 'Hodson Bay Hotel booking: June 4 - June 10 (Confirmed).'
        },
        {
            dayId: day9, tripId, time: '15:00', title: 'Check-in Hodson Bay Hotel',
            type: 'stay', location: 'Athlone, Ireland',
            notes: 'Check-out: Wed 10 Jun 2026. 6 Nights.'
        },

        // Gap: June 10 - June 28 (Unknown/Free Time)
        {
            dayId: await createDay('2026-06-11', 'Europe Free Time'), tripId,
            time: '09:00', title: 'Free Travel / Transit',
            type: 'transport', location: 'Europe',
            notes: 'Gap between Ireland and Cruise (June 11 - June 27)'
        },

        // Cruise: June 28 START (User Confirmed)
        {
            dayId: await createDay('2026-06-28', 'Viking Cruise Embarkation'), tripId,
            time: '12:00', title: 'Board Viking Saturn',
            type: 'activity', location: 'Amsterdam',
            notes: 'Grand European Tour. June 28 - July 12. (User Confirmed)'
        },

        // Cruise End: July 12 (Budapest)
        {
            dayId: await createDay('2026-07-12', 'Disembark & Prague Transfer'), tripId,
            time: '09:00', title: 'Arrive Budapest',
            type: 'transport', location: 'Budapest -> Prague',
            notes: 'Transfer to Prague for final stay.'
        },

        // Prague: July 12 - 15
        {
            dayId: await createDay('2026-07-13', 'Prague'), tripId,
            time: '10:00', title: 'Prague City Stay',
            type: 'stay', location: 'Prague',
            notes: 'Final leg of trip.'
        },

        // Return Flight: July 15 (Confirmed from PDF)
        {
            dayId: await createDay('2026-07-15', 'Return Flight'), tripId,
            time: '11:40', title: 'Flight EY (Ref: 8BMK5X)',
            type: 'transport', location: 'Prague (PRG)',
            notes: 'Etihad Flight via Abu Dhabi home.'
        }
    ]);

    // 4. Update Sections (Fixing the incorrect "Cruise Start" headers)
    await db.sections.where({ tripId }).delete();

    await db.sections.bulkAdd([
        { tripId, title: 'UK Leg', startDate: '2026-05-26', endDate: '2026-06-03', color: 'blue' },
        { tripId, title: 'Ireland Trip', startDate: '2026-06-04', endDate: '2026-06-10', color: 'green' },
        { tripId, title: 'Europe Free Travel', startDate: '2026-06-11', endDate: '2026-06-27', color: 'gray' },
        { tripId, title: 'Viking Cruise', startDate: '2026-06-28', endDate: '2026-07-12', color: 'orange' },
        { tripId, title: 'Prague Extension', startDate: '2026-07-13', endDate: '2026-07-16', color: 'purple' }
    ]);

    console.log("Trip dates, activities AND SECTIONS forced updated!");
};
