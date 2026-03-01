import React from 'react';
import { X, Clock, MapPin, FileText } from 'lucide-react';
import { db } from '../lib/db';

export default function DayDetailModal({ isOpen, onClose, date, activities = [], onEditActivity, onDeleteActivity }) {
    if (!isOpen || !date) return null;

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'white',
                borderRadius: '1rem',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{formattedDate}</h2>
                        <div style={{ color: '#64748b' }}>{activities.length} Activities</div>
                    </div>
                    <button onClick={onClose} style={{
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        background: '#f1f5f9',
                        border: 'none'
                    }}>
                        <X size={24} color="#64748b" />
                    </button>
                </div>

                {/* Content */}
                <div style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activities.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            No activities planned for this day.
                        </div>
                    ) : (
                        activities.map((act) => {
                            const isSpan = act.mode === 'span';
                            const isStart = isSpan && act.startDate === date;
                            const isEnd = isSpan && act.endDate === date;
                            const isMiddle = isSpan && !isStart && !isEnd;

                            return (
                                <div key={act.id} style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.75rem',
                                    padding: '1rem',
                                    display: 'flex',
                                    gap: '1rem',
                                    background: isMiddle ? '#f8fafc' : 'white',
                                    opacity: isMiddle ? 0.8 : 1
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        minWidth: '4rem',
                                        paddingTop: '0.25rem'
                                    }}>
                                        <span style={{ fontWeight: 'bold', color: '#334155' }}>{isMiddle ? 'Cont.' : (act.time || 'All Day')}</span>
                                        {isSpan && <span style={{ fontSize: '0.7rem', color: '#3b82f6', background: '#eeffff', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>Multi-day</span>}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#1e293b' }}>{act.title}</h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {/* Type Badge */}
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <span style={{
                                                    background: '#f1f5f9',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem',
                                                    color: '#64748b',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {act.type.replace('_', ' ')}
                                                </span>
                                                {act.responsibility && (
                                                    <span style={{
                                                        background: '#fce7f3',
                                                        color: '#be185d', // Pinkish for responsibility
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {act.responsibility}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Loc/Notes */}
                                            {(act.location || act.notes) && (
                                                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                                    {act.location && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {act.location}</div>}
                                                    {act.notes && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>"{act.notes}"</div>}
                                                </div>
                                            )}

                                            {/* Attachments */}
                                            {act.attachments && act.attachments.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {act.attachments.map((file, idx) => (
                                                        <div key={idx}
                                                            onClick={() => {
                                                                if (file.url) {
                                                                    window.open(file.url, '_blank');
                                                                } else if (file.blob) {
                                                                    const url = URL.createObjectURL(file.blob);
                                                                    window.open(url, '_blank');
                                                                } else {
                                                                    alert('File content not available locally.');
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                                fontSize: '0.85rem', color: '#0369a1', cursor: 'pointer',
                                                                padding: '4px', background: '#e0f2fe', borderRadius: '4px', width: 'fit-content'
                                                            }}>
                                                            <FileText size={14} />
                                                            <span style={{ textDecoration: 'underline' }}>{file.title || file.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => onEditActivity(act)}
                                            style={{ padding: '0.5rem', background: '#eff6ff', color: '#3b82f6', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div >
    );
}
