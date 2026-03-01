import React, { useState, useEffect } from 'react';
import { X, MapPin, Paperclip, Trash2 } from 'lucide-react';
import PlaceAutocomplete from './PlaceAutocomplete';
import { getRandomMagoo } from '../lib/magooanisms';

export default function AddActivityModal({ isOpen, onClose, onSave, tripId, days, defaultDate, initialData }) {
    const [formData, setFormData] = useState({
        title: '',
        date: defaultDate || new Date().toISOString().split('T')[0],
        time: '09:00',
        type: 'sight',
        location: '',
        notes: '',
        lat: '',
        lng: '',
        flightNumber: '',
        endTime: ''
    });
    const [attachments, setAttachments] = useState([]); // Array of { name, type, file (blob) } or existing doc objects
    const [legs, setLegs] = useState([]);
    const [randomPlaceholder, setRandomPlaceholder] = useState('');

    useEffect(() => {
        if (isOpen) setRandomPlaceholder(getRandomMagoo());
    }, [isOpen]);

    // Initialize legs from initialData or formData when type is transport, car_rental, or stay
    React.useEffect(() => {
        if (formData.type === 'transport' || formData.type === 'car_rental' || formData.type === 'stay') {
            if (initialData && initialData.legs && initialData.legs.length > 0) {
                setLegs(initialData.legs);
            } else if (legs.length === 0) {
                // Initialize with current form data as first leg if no legs exist
                setLegs([{
                    depDate: formData.date,
                    depTime: formData.time,
                    depLocation: formData.location,
                    depLat: formData.lat,
                    depLng: formData.lng,
                    arrDate: formData.arrivalDate || formData.date,
                    arrTime: formData.arrivalTime || '',
                    arrLocation: formData.arrivalLocation || '',
                    arrLat: formData.arrivalLat,
                    arrLng: formData.arrivalLng,
                    flightNumber: formData.flightNumber || ''
                }]);
            }
        }
    }, [formData.type, initialData]);

    // Reset/Populate form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
                setAttachments(initialData.attachments || []);
            } else {
                setFormData({
                    title: '',
                    date: defaultDate || new Date().toISOString().split('T')[0],
                    time: '09:00',
                    type: 'sight',
                    location: '',
                    notes: '',
                    lat: '',
                    lng: '',
                    flightNumber: '',
                    mode: 'single_day',
                    startDate: defaultDate || new Date().toISOString().split('T')[0],
                    endDate: defaultDate || new Date().toISOString().split('T')[0]
                });
                setAttachments([]);
                setLegs([]);
            }
        }
    }, [isOpen, defaultDate, initialData]);

    // Sync main form data with legs changes
    useEffect(() => {
        if ((formData.type === 'transport' || formData.type === 'car_rental' || formData.type === 'stay') && legs.length > 0) {
            const firstLeg = legs[0];
            const lastLeg = legs[legs.length - 1];

            setFormData(prev => {
                return {
                    ...prev,
                    date: firstLeg.depDate,
                    time: firstLeg.depTime,
                    location: firstLeg.depLocation,
                    lat: firstLeg.depLat,
                    lng: firstLeg.depLng,
                    arrivalDate: lastLeg.arrDate,
                    arrivalTime: lastLeg.arrTime,
                    arrivalLocation: lastLeg.arrLocation,
                    arrivalLat: lastLeg.arrLat,
                    arrivalLng: lastLeg.arrLng,
                    flightNumber: legs.map(l => l.flightNumber).filter(Boolean).join(' / ')
                };
            });
        }
    }, [legs, formData.type]);

    const updateLeg = (index, fieldOrObj, value = null) => {
        setLegs(prevLegs => {
            const newLegs = [...prevLegs];
            if (typeof fieldOrObj === 'object') {
                newLegs[index] = { ...newLegs[index], ...fieldOrObj };
            } else {
                newLegs[index] = { ...newLegs[index], [fieldOrObj]: value };
            }
            return newLegs;
        });
    };

    const addLeg = () => {
        setLegs(prevLegs => {
            const lastLeg = prevLegs[prevLegs.length - 1];
            return [...prevLegs, {
                depDate: lastLeg ? lastLeg.arrDate : formData.date,
                depTime: '',
                depLocation: lastLeg ? lastLeg.arrLocation : '',
                depLat: lastLeg ? lastLeg.arrLat : null,
                depLng: lastLeg ? lastLeg.arrLng : null,
                arrDate: lastLeg ? lastLeg.arrDate : formData.date,
                arrTime: '',
                arrLocation: '',
                arrLat: null,
                arrLng: null,
                flightNumber: ''
            }];
        });
    };

    const removeLeg = (index) => {
        setLegs(prevLegs => {
            const newLegs = [...prevLegs];
            newLegs.splice(index, 1);
            return newLegs;
        });
    };

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, legs, tripId, attachments });
    };

    const handleFileSelect = (e) => {
        if (e.target.files) {
            setAttachments([...attachments, ...Array.from(e.target.files)]);
        }
    };

    const handleRemoveAttachment = (index) => {
        const newAttachments = [...attachments];
        newAttachments.splice(index, 1);
        setAttachments(newAttachments);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--color-surface)',
                width: '100%',
                maxWidth: '500px', // Wider for transport info
                maxHeight: '90vh',
                overflowY: 'auto',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-md)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{initialData ? 'Edit Activity' : 'Add Activity'}</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Title</label>
                        <input
                            required
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder={formData.type === 'transport' ? "e.g. Flight to Doha" : `e.g. ${randomPlaceholder}`}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Type</label>
                        <select
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="sight">Sightseeing</option>
                            <option value="food">Food</option>
                            <option value="transport">Transport / Flight</option>
                            <option value="car_rental">Car Rental</option>
                            <option value="stay">Accommodation</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Responsibility (Tag)</label>
                        <input
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                            value={formData.responsibility || ''}
                            onChange={e => setFormData({ ...formData, responsibility: e.target.value })}
                            placeholder="e.g. Jason, Cathryn, Joint"
                        />
                    </div>

                    {(formData.type === 'transport' || formData.type === 'car_rental' || formData.type === 'stay') ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {legs.map((leg, index) => (
                                    <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '1rem', background: '#f8fafc', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#64748b' }}>
                                                {formData.type === 'stay' ? 'Duration Info' : `Leg ${index + 1}`}
                                            </span>
                                            {legs.length > 1 && (
                                                <button type="button" onClick={() => removeLeg(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* DEPARTURE (Leg) / CHECK IN */}
                                        <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed #cbd5e1' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>
                                                {formData.type === 'car_rental'
                                                    ? (formData.title && formData.title.toLowerCase().includes('drop off') ? 'DROP OFF LOCATION' : 'PICK UP')
                                                    : (formData.type === 'stay' ? 'CHECK IN' : 'DEPARTURE')}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <input type="date" required value={leg.depDate} onChange={e => updateLeg(index, 'depDate', e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                <input type="time" value={leg.depTime} onChange={e => updateLeg(index, 'depTime', e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                            </div>
                                            <PlaceAutocomplete
                                                defaultValue={leg.depLocation}
                                                placeholder={
                                                    formData.type === 'car_rental' ? "From e.g. London Airport Rental" :
                                                        (formData.type === 'stay' ? "Hotel Location" : "From e.g. Melbourne Airport")
                                                }
                                                onPlaceSelect={(place) => {
                                                    const updates = { depLocation: place.name || place.address };
                                                    if (place.lat) {
                                                        updates.depLat = place.lat;
                                                        updates.depLng = place.lng;
                                                    }
                                                    // For Stays, sync location to arrival too if implied
                                                    if (formData.type === 'stay') {
                                                        updates.arrLocation = place.name || place.address;
                                                        if (place.lat) {
                                                            updates.arrLat = place.lat;
                                                            updates.arrLng = place.lng;
                                                        }
                                                    }
                                                    updateLeg(index, updates);
                                                }}
                                            />
                                        </div>

                                        {/* ARRIVAL (Leg) / CHECK OUT */}
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>
                                                {formData.type === 'car_rental'
                                                    ? (formData.title && formData.title.toLowerCase().includes('drop off') ? 'NEXT DESTINATION (Optional)' : 'DROP OFF')
                                                    : (formData.type === 'stay' ? 'CHECK OUT' : 'ARRIVAL')}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <input type="date" required value={leg.arrDate} onChange={e => updateLeg(index, 'arrDate', e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                <input type="time" value={leg.arrTime} onChange={e => updateLeg(index, 'arrTime', e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                            </div>

                                            {/* Hide Destination Location for Stay (Redundant) */}
                                            {formData.type !== 'stay' && (
                                                <PlaceAutocomplete
                                                    defaultValue={leg.arrLocation}
                                                    placeholder={formData.type === 'car_rental' ? "To e.g. Cotswolds Hotel" : "To e.g. Doha Airport"}
                                                    onPlaceSelect={(place) => {
                                                        const updates = { arrLocation: place.name || place.address };
                                                        if (place.lat) {
                                                            updates.arrLat = place.lat;
                                                            updates.arrLng = place.lng;
                                                        }
                                                        updateLeg(index, updates);
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <div style={{ marginTop: '0.5rem' }}>
                                            <input
                                                placeholder={
                                                    formData.type === 'car_rental' ? "Vehicle / Booking Ref" :
                                                        (formData.type === 'stay' ? "Booking Reference / Confirmation" : "Flight No. (e.g. QF1)")
                                                }
                                                value={leg.flightNumber}
                                                onChange={e => updateLeg(index, 'flightNumber', e.target.value)}
                                                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addLeg}
                                    style={{
                                        width: '100%', padding: '0.5rem', border: '1px dashed #64748b', borderRadius: 'var(--radius-md)',
                                        background: 'white', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '500'
                                    }}
                                >
                                    <span>+ Add Stopover / Leg</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        /* STANDARD LAYOUT FOR NON-TRANSPORT */
                        <>
                            {/* DATE & TIME SECTION */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.mode === 'span'}
                                        onChange={e => setFormData({
                                            ...formData,
                                            mode: e.target.checked ? 'span' : 'single_day',
                                            startDate: formData.date,
                                            endDate: formData.date // Default to same day initially
                                        })}
                                    />
                                    Multi-Day / Spanning Event
                                </label>
                            </div>

                            {formData.mode === 'span' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Start Date</label>
                                            <input
                                                type="date"
                                                required
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                                                value={formData.startDate || formData.date}
                                                onChange={e => setFormData({ ...formData, startDate: e.target.value, date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>End Date</label>
                                            <input
                                                type="date"
                                                required
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                                                value={formData.endDate || formData.date}
                                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Start Time</label>
                                            <input
                                                type="time"
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                                                value={formData.time}
                                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>End Time</label>
                                            <input
                                                type="time"
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                                                value={formData.endTime || ''}
                                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Date</label>
                                        <input
                                            type="date"
                                            required
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Time</label>
                                        <input
                                            type="time"
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                                            value={formData.time}
                                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Location</label>
                                <PlaceAutocomplete
                                    defaultValue={formData.location}
                                    onPlaceSelect={(place) => {
                                        if (place.lat && place.lng) {
                                            setFormData({
                                                ...formData,
                                                location: place.name || place.address,
                                                lat: place.lat,
                                                lng: place.lng
                                            });
                                        } else {
                                            setFormData({
                                                ...formData,
                                                location: place.name
                                            });
                                        }
                                    }}
                                />
                                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    {formData.lat && formData.lng ? (
                                        <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center' }}>
                                            <MapPin size={12} style={{ marginRight: '2px' }} /> Pin synced to map
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--color-text-muted)' }}>
                                            Search and select from dropdown to pin on map
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Notes / Instructions</label>
                        <textarea
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)', minHeight: '80px', fontFamily: 'inherit' }}
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder={`Notes... ${randomPlaceholder}`}
                        />
                    </div>

                    {/* ATTACHMENTS */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Attachments</label>

                        {/* File List */}
                        {attachments.length > 0 && (
                            <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {attachments.map((file, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden' }}>
                                            <Paperclip size={12} />
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                                                {file.name || file.title}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    // Handle Preview
                                                    const blob = file.blob || file.data || file; // 'file' is Blob if new upload
                                                    if (blob) {
                                                        const url = URL.createObjectURL(blob);
                                                        window.open(url, '_blank');
                                                        // Note: We can't revoke efficiently here without effect cleanup, 
                                                        // but browser cleans up on page unload or we rely on GC.
                                                    } else {
                                                        alert('Cannot open file');
                                                    }
                                                }}
                                                style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
                                                title="View"
                                            >
                                                {/* Eye Icon */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                            </button>
                                            <button type="button" onClick={() => handleRemoveAttachment(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Remove">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 0.75rem', border: '1px dashed #cbd5e1', borderRadius: 'var(--radius-md)',
                            color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', background: 'white'
                        }}>
                            <Paperclip size={16} />
                            <span>Attach Documents (Tickets/Receipts)</span>
                            <input
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                        </label>
                    </div>

                    <button type="submit" style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: '600',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '0.5rem'
                    }}>{initialData ? 'Update Activity' : 'Save Activity'}</button>
                </form>
            </div>
        </div >
    );
}
