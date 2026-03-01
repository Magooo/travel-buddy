import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import PlaceAutocomplete from './PlaceAutocomplete';

export default function ManageSectionsModal({ isOpen, onClose, tripId }) {
    const [formData, setFormData] = useState({
        title: '',
        startDate: '',
        endDate: '',
        color: '#3b82f6'
    });
    const [editingId, setEditingId] = useState(null);

    const sections = useLiveQuery(
        () => db.sections.where({ tripId }).toArray(),
        [tripId]
    );

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setFormData({
            title: '',
            startDate: '',
            endDate: '',
            color: '#3b82f6'
        });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingId) {
            console.log('Updating section:', { ...formData, tripId });
            await db.sections.update(editingId, { ...formData, tripId });
        } else {
            console.log('Adding section:', { ...formData, tripId });
            await db.sections.add({ ...formData, tripId });
        }
        resetForm();
    };

    const handleEdit = (section) => {
        setFormData({
            title: section.title,
            startDate: section.startDate,
            endDate: section.endDate,
            color: section.color
        });
        setEditingId(section.id);
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this section?')) {
            await db.sections.delete(id);
            if (editingId === id) resetForm();
        }
    };

    if (!isOpen) return null;

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
                maxWidth: '500px',
                maxHeight: '80vh',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Manage Trip Sections</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Section Title</label>
                        <input
                            required
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. England Road Trip"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Start Date</label>
                            <input
                                type="date"
                                required
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>End Date</label>
                            <input
                                type="date"
                                required
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Area / Location (for Map)</label>
                        <PlaceAutocomplete
                            defaultValue={formData.locationName}
                            placeholder="e.g. London, Tokyo"
                            onPlaceSelect={(place) => {
                                setFormData({
                                    ...formData,
                                    lat: place.lat,
                                    lng: place.lng,
                                    locationName: place.name || place.address
                                });
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Color Code</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="color"
                                style={{ height: '2.5rem', width: '4rem', padding: '0', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                {['#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#ec4899', '#ef4444'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color: c })}
                                        style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: c, border: formData.color === c ? '2px solid black' : '1px solid #ddd', cursor: 'pointer' }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <button type="submit" style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        fontWeight: '600',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}>
                        {editingId ? 'Update Section' : <><Plus size={18} /> Add Section</>}
                    </button>
                    {editingId && (
                        <button type="button" onClick={resetForm} style={{ fontSize: '0.8rem', color: '#64748b', textDecoration: 'underline', alignSelf: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel Edit</button>
                    )}
                </form>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#475569' }}>Current Sections</h3>
                    {sections?.length === 0 && <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>No sections defined yet.</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {sections?.sort((a, b) => a.startDate.localeCompare(b.startDate)).map(section => (
                            <div key={section.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', borderLeft: `4px solid ${section.color}`
                            }}>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{section.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        {new Date(section.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(section.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => handleEdit(section)} style={{ fontSize: '0.8rem', color: '#3b82f6', background: 'white', border: '1px solid #e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer' }}>Edit</button>
                                    <button onClick={() => handleDelete(section.id)} style={{ color: '#ef4444', background: 'white', border: '1px solid #e2e8f0', padding: '0.25rem', borderRadius: '0.25rem', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
