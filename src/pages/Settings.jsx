import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Trash2, Plus, RefreshCw, LogOut } from 'lucide-react';

export default function Settings() {
    const trips = useLiveQuery(() => db.trips.toArray());
    const [isCreating, setIsCreating] = useState(false);
    const [newTrip, setNewTrip] = useState({ title: '', startDate: '', endDate: '' });

    const handleCreateTrip = async (e) => {
        e.preventDefault();
        if (!newTrip.title) return;

        await db.trips.add({
            title: newTrip.title,
            startDate: newTrip.startDate,
            endDate: newTrip.endDate,
            created_at: new Date()
        });

        setIsCreating(false);
        setNewTrip({ title: '', startDate: '', endDate: '' });

        // Auto-activate the new trip
        const lastTrip = await db.trips.orderBy('id').last();
        if (lastTrip) {
            localStorage.setItem('activeTripId', lastTrip.id);
            alert('Trip created and activated!');
            window.location.href = '/';
        }
    };

    const handleDeleteAll = async () => {
        if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
            await db.delete();
            window.location.reload();
        }
    };

    return (
        <div>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>Settings & Trips</h1>
            </header>

            {/* Trip Management Section */}
            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    My Trips
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        style={{ background: 'var(--color-primary)', color: 'white', padding: '0.5rem', borderRadius: '50%' }}
                    >
                        <Plus size={20} />
                    </button>
                </h2>

                {isCreating && (
                    <form onSubmit={handleCreateTrip} style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Trip Name</label>
                            <input
                                value={newTrip.title}
                                onChange={e => setNewTrip({ ...newTrip, title: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                                placeholder="e.g. Italy 2026"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Start</label>
                                <input type="date" value={newTrip.startDate} onChange={e => setNewTrip({ ...newTrip, startDate: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>End</label>
                                <input type="date" value={newTrip.endDate} onChange={e => setNewTrip({ ...newTrip, endDate: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }} />
                            </div>
                        </div>
                        <button type="submit" style={{ background: 'var(--color-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: '600' }}>Save Trip</button>
                    </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {trips?.map(trip => (
                        <div key={trip.id} style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: '600' }}>{trip.title}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {trip.id}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('activeTripId', trip.id);
                                        window.location.href = '/';
                                    }}
                                    style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.75rem', borderRadius: '1rem', cursor: 'pointer', border: 'none', fontWeight: '600' }}>
                                    Open
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm(`Delete "${trip.title}"?\n\nThis will permanently remove the trip and all its valid activities.`)) {
                                            await db.transaction('rw', db.trips, db.days, db.activities, db.sections, async () => {
                                                await db.trips.delete(trip.id);
                                                await db.days.where({ tripId: trip.id }).delete();
                                                await db.activities.where({ tripId: trip.id }).delete();
                                                await db.sections.where({ tripId: trip.id }).delete();
                                            });
                                            // Ensure the trip is removed from Cloud preventing it from reappearing on refresh
                                            try {
                                                if (typeof trip.id === 'string' || trip.id.length > 10) {
                                                    await supabase.from('trips').delete().eq('id', trip.id);
                                                }
                                            } catch (err) {
                                                console.error("Supabase failed to delete trip:", err);
                                            }
                                        }
                                    }}
                                    style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '1rem', cursor: 'pointer', border: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Trash2 size={12} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* App Settings */}
            <section>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Data & Storage</h2>
                <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <button
                        onClick={handleDeleteAll}
                        style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', textAlign: 'left' }}
                    >
                        <Trash2 size={20} />
                        <span>Reset Application (Delete All Data)</span>
                    </button>
                    <div style={{ borderTop: '1px solid #e2e8f0' }}></div>
                    <button
                        onClick={async () => {
                            const { forceSeed } = await import('../lib/forceSeed');
                            await forceSeed();
                            window.location.href = '/';
                        }}
                        style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text)', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <RefreshCw size={20} />
                        <span>Force Refresh Trip Data</span>
                    </button>
                </div>
            </section>

            {/* Team Management */}
            <section>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Team & Members</h2>
                <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '1rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Invite New Member</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="email"
                                placeholder="Enter email address"
                                id="invite-email"
                                style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-md)' }}
                            />
                            <button
                                onClick={async () => {
                                    const email = document.getElementById('invite-email').value;
                                    if (!email) return alert('Please enter an email.');

                                    const { error } = await supabase.auth.signInWithOtp({
                                        email,
                                        options: {
                                            shouldCreateUser: true,
                                            // emailRedirectTo: window.location.origin
                                        }
                                    });

                                    if (error) alert('Error sending invite: ' + error.message);
                                    else {
                                        alert(`Invitation sent to ${email}! They will receive a Magic Link to log in.`);
                                        document.getElementById('invite-email').value = '';
                                    }
                                }}
                                style={{ background: 'var(--color-primary)', color: 'white', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                            >
                                Send Invite
                            </button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                            They will receive an email with a "Magic Link". Clicking it will log them in automatically. They can then set a password in their Account settings.
                        </p>
                    </div>
                </div>
            </section>

            {/* Account Settings */}
            <section style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Account</h2>
                <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <button
                        onClick={async () => {
                            const newPassword = prompt('Enter new password:');
                            if (newPassword) {
                                const { error } = await supabase.auth.updateUser({ password: newPassword });
                                if (error) alert('Error: ' + error.message);
                                else alert('Password updated successfully!');
                            }
                        }}
                        style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text)', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <RefreshCw size={20} />
                        <span>Update Password</span>
                    </button>
                    <div style={{ borderTop: '1px solid #e2e8f0' }}></div>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/login';
                        }}
                        style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text)', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </section>
        </div>
    );
}
