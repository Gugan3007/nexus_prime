'use client';
import { useState, useEffect } from 'react';
import { HiOutlineClipboardDocumentList, HiOutlineArrowPath, HiOutlineTrash, HiOutlineClock } from 'react-icons/hi2';

const API_URL = 'http://localhost:8000';

export default function AuditPage() {
    const [auditLog, setAuditLog] = useState([]);
    const [analyses, setAnalyses] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [auditRes, analysesRes] = await Promise.all([
                fetch(`${API_URL}/api/audit`),
                fetch(`${API_URL}/api/analyses`),
            ]);
            const auditData = await auditRes.json();
            const analysesData = await analysesRes.json();
            setAuditLog(auditData.audit_log || []);
            setAnalyses(analysesData.analyses || {});
        } catch (e) {
            console.error('Backend not reachable');
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const clearAll = async () => {
        if (!confirm('Clear all stored analyses and audit log?')) return;
        try {
            await fetch(`${API_URL}/api/clear`, { method: 'DELETE' });
            fetchData();
        } catch (e) { console.error(e); }
    };

    const getActionIcon = (action) => {
        const map = {
            'SAMPLE_ANALYSIS': '🔬',
            'SINGLE_ANALYSIS': '📄',
            'FILE_UPLOAD': '📤',
            'COMPARISON': '⚖️',
        };
        return map[action] || '📝';
    };

    const getActionColor = (action) => {
        const map = {
            'SAMPLE_ANALYSIS': '#6c63ff',
            'SINGLE_ANALYSIS': '#00d4ff',
            'FILE_UPLOAD': '#00e676',
            'COMPARISON': '#ff6b9d',
        };
        return map[action] || '#6c63ff';
    };

    const storedCount = Object.keys(analyses).length;

    return (
        <div>
            <div className="page-header">
                <div className="page-breadcrumb">Nexus-Prime <span>/</span> Audit Trail</div>
                <h1>Audit Trail & History</h1>
                <p>Full transparency into every analysis, comparison, and decision made by Nexus-Prime.</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card purple">
                    <div className="stat-icon purple"><HiOutlineClipboardDocumentList /></div>
                    <div className="stat-info">
                        <h4>Audit Entries</h4>
                        <div className="stat-value">{auditLog.length}</div>
                    </div>
                </div>
                <div className="stat-card cyan">
                    <div className="stat-icon cyan"><HiOutlineClock /></div>
                    <div className="stat-info">
                        <h4>Stored Analyses</h4>
                        <div className="stat-value">{storedCount}</div>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green" style={{ cursor: 'pointer' }} onClick={fetchData}>
                        <HiOutlineArrowPath />
                    </div>
                    <div className="stat-info">
                        <h4>Actions</h4>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 12px' }} onClick={fetchData}>
                                <HiOutlineArrowPath /> Refresh
                            </button>
                            <button className="btn btn-danger" style={{ fontSize: '11px', padding: '4px 12px' }} onClick={clearAll}>
                                <HiOutlineTrash /> Clear All
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '8px' }}>
                {/* Audit Log Timeline */}
                <div className="glass-card">
                    <div className="card-header"><h3>📜 Activity Timeline</h3></div>
                    <div className="card-body">
                        {loading ? (
                            <div className="shimmer" style={{ height: 200 }} />
                        ) : auditLog.length === 0 ? (
                            <div className="empty-state" style={{ padding: '40px' }}>
                                <div className="empty-icon">📜</div>
                                <h3>No Activity Yet</h3>
                                <p>Run an analysis to see audit entries here.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {auditLog.map((entry, i) => (
                                    <div key={i} className="audit-item" style={{ animation: `fadeInUp 0.4s ease forwards`, animationDelay: `${i * 0.05}s`, opacity: 0 }}>
                                        <div className="audit-marker" style={{ background: getActionColor(entry.action) }} />
                                        <div className="audit-content">
                                            <div className="audit-action">
                                                {getActionIcon(entry.action)} {entry.action?.replace(/_/g, ' ')}
                                            </div>
                                            <div className="audit-details">{entry.details}</div>
                                            <div className="audit-time">{new Date(entry.timestamp).toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stored Analyses */}
                <div className="glass-card">
                    <div className="card-header"><h3>🗄️ Stored Results</h3></div>
                    <div className="card-body">
                        {storedCount === 0 ? (
                            <div className="empty-state" style={{ padding: '30px' }}>
                                <div className="empty-icon">🗄️</div>
                                <h3>No Stored Data</h3>
                                <p>Analyze vendors to store results.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Object.entries(analyses).map(([id, analysis], i) => (
                                    <div key={id} style={{
                                        padding: '14px', borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(108,99,255,0.04)',
                                        border: '1px solid var(--border-subtle)',
                                    }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-bright)', marginBottom: '4px' }}>
                                            {analysis.document_metadata?.vendor_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            ID: {id.substring(0, 12)}...
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                            <span style={{
                                                fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                                                background: 'rgba(108,99,255,0.1)', color: 'var(--accent-primary)',
                                            }}>
                                                Score: {analysis.mcd_scoring?.nexus_trust_score?.toFixed(1)}
                                            </span>
                                            <span className={`risk-badge ${analysis.risk_analysis?.overall_risk_level?.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                                {analysis.risk_analysis?.overall_risk_level}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
