'use client';
import { useState, useEffect } from 'react';
import { HiOutlineChatBubbleLeftRight, HiOutlineClipboardDocument, HiOutlineEnvelope } from 'react-icons/hi2';

const API_URL = 'http://localhost:8000';

export default function NegotiatePage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copiedIdx, setCopiedIdx] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/compare`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '[]'
                });
                const result = await res.json();

                if (result.detail) {
                    console.error(result.detail);
                } else {
                    setData({
                        vendor_analyses: result.vendor_details,
                        comparison: result.comparison
                    });
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    const vendors = data?.vendor_analyses || [];

    const copyToClipboard = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const getWeaknessColor = (dim) => {
        const map = { cost: '#6c63ff', quality: '#00d4ff', speed: '#00e676', risk: '#ff6b9d' };
        return map[dim] || '#6c63ff';
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-breadcrumb">Nexus-Prime <span>/</span> Negotiation Copilot</div>
                <h1>Negotiation Copilot</h1>
                <p>AI-generated negotiation strategies targeting each vendor's weakest point. Copy and send to vendors directly.</p>
            </div>

            {loading ? (
                <div className="glass-card"><div className="card-body"><div className="shimmer" style={{ height: 300 }} /></div></div>
            ) : vendors.length === 0 ? (
                <div className="glass-card">
                    <div className="empty-state">
                        <div className="empty-icon">💬</div>
                        <h3>No Analysis Data</h3>
                        <p>Run the analysis from the Compare page to generate negotiation strategies.</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {vendors.map((v, i) => {
                        const neg = v.negotiation_copilot;
                        const weakColor = getWeaknessColor(neg.weakest_dimension);
                        return (
                            <div key={i} className="negotiation-card" style={{ animation: `fadeInUp 0.6s ease forwards`, animationDelay: `${i * 0.15}s`, opacity: 0 }}>
                                <div className="negotiation-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-bright)' }}>
                                            {v.document_metadata.vendor_name}
                                        </h3>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Quotation: {v.document_metadata.quotation_id} | Score: {v.mcd_scoring.nexus_trust_score?.toFixed(1)}/100
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                                            background: `${weakColor}15`, color: weakColor, border: `1px solid ${weakColor}30`,
                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                        }}>
                                            Weak: {neg.weakest_dimension}
                                        </span>
                                    </div>
                                </div>
                                <div className="negotiation-body">
                                    {/* Dimension Scores */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                                        {Object.entries(v.mcd_scoring.score_breakdown).map(([key, val]) => {
                                            const isWeak = key.replace('_score', '') === neg.weakest_dimension;
                                            return (
                                                <div key={key} style={{
                                                    padding: '12px', borderRadius: 'var(--radius-sm)',
                                                    background: isWeak ? 'rgba(255,82,82,0.06)' : 'rgba(108,99,255,0.04)',
                                                    border: `1px solid ${isWeak ? 'rgba(255,82,82,0.2)' : 'var(--border-subtle)'}`,
                                                    textAlign: 'center',
                                                }}>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: '4px' }}>
                                                        {key.replace('_score', '')}
                                                    </div>
                                                    <div style={{
                                                        fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700,
                                                        color: isWeak ? 'var(--accent-danger)' : 'var(--text-bright)',
                                                    }}>{val.toFixed(0)}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="negotiation-weakness">
                                        <h4>⚡ Identified Weakness</h4>
                                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{neg.identified_weakness}</p>
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                        <div className="negotiation-email">
                                            {neg.suggested_email_script}
                                        </div>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '11px', padding: '6px 12px' }}
                                            onClick={() => copyToClipboard(neg.suggested_email_script, i)}
                                        >
                                            {copiedIdx === i ? '✓ Copied!' : <><HiOutlineClipboardDocument /> Copy</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Strategy Tips */}
                    <div className="glass-card">
                        <div className="card-header"><h3>💡 Pro Negotiation Tips</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {[
                                    { title: 'Leverage Competition', desc: 'Mention competing bids to create urgency. Never reveal the exact competing price.', color: '#6c63ff' },
                                    { title: 'Bundle Volume', desc: 'Offer multi-year or larger volume commitments in exchange for per-unit discounts.', color: '#00d4ff' },
                                    { title: 'Payment Leverage', desc: 'Offer faster payment (Net 15) in exchange for a 2-3% early payment discount.', color: '#00e676' },
                                    { title: 'Warranty Extension', desc: 'Request extended warranty as a value-add instead of direct price reduction.', color: '#ff6b9d' },
                                ].map((tip, ti) => (
                                    <div key={ti} style={{
                                        padding: '16px', borderRadius: 'var(--radius-sm)',
                                        background: `${tip.color}08`, border: `1px solid ${tip.color}20`,
                                    }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: tip.color, marginBottom: '6px' }}>{tip.title}</h4>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
