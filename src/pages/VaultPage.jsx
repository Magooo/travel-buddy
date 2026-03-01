import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { FileText, Upload, Trash2, Eye, X } from 'lucide-react';

export default function VaultPage() {
    const [isUploading, setIsUploading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);

    // Get active trip
    const trip = useLiveQuery(async () => {
        const activeId = parseInt(localStorage.getItem('activeTripId') || '0');
        if (activeId) return await db.trips.get(activeId);
        return await db.trips.orderBy('startDate').first();
    });

    // Get documents for this trip
    const documents = useLiveQuery(async () => {
        if (!trip) return [];
        return await db.documents.where({ tripId: trip.id }).toArray();
    }, [trip]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await db.documents.add({
                tripId: trip.id,
                title: file.name,
                type: file.type,
                blob: file, // Storing file object directly
                created_at: new Date()
            });
            alert('Document saved offline!');
        } catch (err) {
            console.error("Upload failed", err);
            alert('Failed to save document. It might be too large.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this document?')) {
            await db.documents.delete(id);
        }
    };

    const handlePreview = (doc) => {
        // Fallback to doc.data if doc.blob is missing (legacy support)
        const fileData = doc.blob || doc.data;
        if (fileData) {
            const url = URL.createObjectURL(fileData);
            setPreviewDoc({ ...doc, url });
        } else {
            console.error('No blob/data found for doc:', doc);
            alert('Error: Document data missing.');
        }
    };

    const closePreview = () => {
        if (previewDoc) {
            URL.revokeObjectURL(previewDoc.url);
            setPreviewDoc(null);
        }
    };

    if (!trip) return <div style={{ padding: '2rem' }}>Please select a trip first.</div>;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header style={{ padding: '1.5rem', flexShrink: 0 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-primary)' }}>Document Vault</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Secure offline storage for {trip.title}</p>
            </header>

            <div style={{ flex: 1, padding: '0 1.5rem 1.5rem', overflowY: 'auto' }}>
                {/* Upload Area */}
                <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed #cbd5e1',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2rem',
                    marginBottom: '2rem',
                    cursor: 'pointer',
                    background: isUploading ? '#f1f5f9' : 'transparent'
                }}>
                    <Upload size={32} color="#64748b" style={{ marginBottom: '0.5rem' }} />
                    <span style={{ fontWeight: '600', color: 'var(--color-text-muted)' }}>
                        {isUploading ? 'Saving...' : 'Tap to Upload PDF or Image'}
                    </span>
                    <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading} />
                </label>

                {/* Document List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {documents?.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No documents yet.</div>}

                    {documents?.map(doc => (
                        <div key={doc.id} style={{
                            background: 'var(--color-surface)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <div style={{
                                background: '#e0f2fe',
                                color: '#0284c7',
                                width: '3rem',
                                height: '3rem',
                                borderRadius: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FileText size={20} />
                            </div>

                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {new Date(doc.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <button onClick={() => handlePreview(doc)} style={{ color: 'var(--color-text-muted)', padding: '0.5rem' }}><Eye size={20} /></button>
                            <button onClick={() => handleDelete(doc.id)} style={{ color: '#ef4444', padding: '0.5rem' }}><Trash2 size={20} /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Preview Modal */}
            {previewDoc && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={closePreview} style={{ color: 'white' }}><X size={32} /></button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                        {previewDoc.type.includes('pdf') ? (
                            <iframe src={previewDoc.url} style={{ width: '100%', maxWidth: '800px', height: '100%', background: 'white' }} />
                        ) : (
                            <img src={previewDoc.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
