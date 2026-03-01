# MAGOO MAP: “Who Gave Magoo the Map”
## Calendar-Tile Itinerary Spec (private use)

### Core concept (IMPORTANT)
The entire trip is shown as a **calendar-style grid of day tiles**.  
Each tile = **one day of the trip**.  
Inside each day tile = **activities** (time-ordered where relevant).

A single booking/activity can **span multiple days** (example: car hire for 4 days).  
Spanning items must **appear on every relevant day tile** (visually linked as one continuous item).

---

## 1) Calendar Tile UI (primary screen)
### Calendar grid
- Displays all dates from trip start to trip end as tiles.
- Each tile shows:
  - Date + optional day label (e.g., “Day 3” / city)
  - Weather is optional (ignore unless you already have it)
  - Mini list of top activities (truncate + “+X more”)
  - Status chips (Confirmed / Unconfirmed / Draft)

### Day tile activity rendering
Activities display as compact “chips” or “rows” inside the tile:
- Title (e.g., “Pick up car”)
- Optional time
- Optional icon by type (Travel, Stay, Activity, Food, Admin)
- Status chip

### Spanning activities (multi-day)
Spanning items render as a **single logical booking** that repeats across consecutive day tiles.
Example: “Hire Car: Europcar” from May 28–May 31 appears on May 28, 29, 30, 31 tiles.
Visual treatment:
- Same label on each day, plus a subtle “continuation” indicator:
  - Start day: “Hire Car (Start)”
  - Middle days: “Hire Car”
  - End day: “Hire Car (Return)”
OR
- A connected bar style across tiles (if supported by the builder), otherwise use labels.

Rules:
- If a spanning activity has **start_time** on start day and **end_time** on end day:
  - Show start time only on the start day entry
  - Show end time only on the end day entry
- In middle days: show as “All day” or no time.

---

## 2) Day Detail (tap a tile)
Tapping a day tile opens **Day Detail**:
- Full list of activities for that day (including those inherited from spanning bookings)
- Time ordering:
  - Timed activities sorted by time
  - All-day/spanning items pinned at top or bottom (choose one consistently)

Each activity row has:
- Navigate (if location exists)
- Attachments (docs)
- Notes/instructions
- Status + responsibility tag (optional)

---

## 3) Activity types
### Single-day activity
Example: “Pick up car”
Fields:
- title
- date
- start_time/end_time optional
- location (name + optional lat/lng)
- status: Confirmed/Unconfirmed/Draft
- docs/attachments

### Spanning booking (multi-day)
Example: “Car Hire” / “Hotel stay” / “Rail pass”
Fields:
- title
- start_date
- end_date (inclusive)
- start_time optional (pickup/check-in)
- end_time optional (return/check-out)
- provider optional
- booking_reference optional
- location(s):
  - pickup/dropoff locations (car)
  - accommodation address (hotel)

Rendering:
- Must appear on every day tile from start_date through end_date inclusive.

---

## 4) Data model changes (key)
### Activity (updated)
Two activity modes:
1) `mode = "single_day"`
   - date
   - start_time/end_time optional
2) `mode = "span"`
   - start_date
   - end_date (inclusive)
   - start_time optional (applies on start_date only)
   - end_time optional (applies on end_date only)

Optional: `span_role` computed per day occurrence:
- START / MIDDLE / END

Implementation note:
- Store spanning booking once, but generate “day occurrences” for UI display.

---

## 5) Display logic (must implement)
Given a day D:
- Show all activities where:
  - single_day.date == D
  OR
  - span.start_date <= D <= span.end_date

For span items:
- If D == start_date: label includes “Start” and shows start_time if exists
- If D == end_date: label includes “Return/End” and shows end_time if exists
- Else: normal label, no time (or “All day”)

---

## 6) Example scenario
Trip: May 26–June 2

Spanning booking:
- “Hire Car: Europcar”
- start_date: May 28
- end_date: May 31
- start_time: 09:00 (pickup)
- end_time: 17:00 (return)

Calendar tiles:
- May 28 tile shows “Hire Car (Start) 9:00”
- May 29 tile shows “Hire Car”
- May 30 tile shows “Hire Car”
- May 31 tile shows “Hire Car (Return) 17:00”

---

## 7) Acceptance tests
- [ ] The main trip screen is a calendar grid of day tiles.
- [ ] Tapping a tile opens Day Detail.
- [ ] Adding a spanning booking with start/end dates causes it to appear on every relevant day tile.
- [ ] Start day shows pickup/check-in time (if set); end day shows return/check-out time (if set).
- [ ] Edits to the spanning booking update all days instantly (since it’s one object).
