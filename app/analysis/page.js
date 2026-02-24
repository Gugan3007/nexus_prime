'use client';
import { useState, useEffect } from 'react';
import NexusScoreGauge from '../components/NexusScoreGauge';
import {
    HiOutlineBolt, HiOutlineArrowPath, HiOutlineDocumentCheck,
    HiOutlineShieldCheck, HiOutlineClock, HiOutlineBanknotes,
} from 'react-icons/hi2';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AnalysisPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedVendor, setSelectedVendor] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
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
        } catch (err) {
            console.error('Backend not reachable');
        }
        setLoading(false);
    };

    const vendors = data?.vendor_analyses || [];
    const v = vendors[selectedVendor];

    const getRiskClass = (level) => level?.toLowerCase() || 'moderate';
    const getTierClass = (tier) => {
        if (tier?.includes('Tier 1')) return 'tier1';
        if (tier?.includes('Tier 3')) return 'tier3';
        return 'tier2';
    };

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <h1>Vendor Analysis</h1>
                    <p>Loading analysis data...</p>
                </div>
                <div className="glass-card"><div className="card-body"><div className="shimmer" style={{ height: 400 }} /></div></div>
            </div>
        );
    }

    if (!v) {
        return (
            <div>
                <div className="page-header">
                    <h1>Vendor Analysis</h1>
                    <p>No analysis data available. Run an analysis from the Compare page first.</p>
                </div>
                <div className="glass-card">
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No Data Available</h3>
                        <p>Start the backend server and run the analysis pipeline from the Compare page.</p>
                    </div>
                </div>
            </div>
        );
    }

    const phases = [
        { name: 'Document Metadata', icon: '📄', data: v.document_metadata },
        { name: 'Commercial Extraction', icon: '💰', data: { items: v.line_items?.length, ...v.commercial_summary } },
        { name: 'Metric Normalization', icon: '📐', data: { delivery_days: v.commercial_summary.normalized_delivery_days, payment: v.commercial_summary.payment_terms } },
        { name: 'Quality & Brand', icon: '⭐', data: v.quality_and_intelligence },
        { name: 'Risk Scrubbing', icon: '🛡️', data: v.risk_analysis },
        { name: 'MCDA Scoring', icon: '🎯', data: v.mcd_scoring },
        { name: 'Negotiation Strategy', icon: '💬', data: v.negotiation_copilot },
    ];

    return (
        <div>
            <div className="page-header">
                <div className="page-breadcrumb">Nexus-Prime <span>/</span> Vendor Analysis</div>
                <h1>Deep Vendor Analysis</h1>
                <p>Full 7-phase forensic breakdown of each vendor quotation.</p>
            </div>

            {/* Vendor Selector */}
            <div className="tabs" style={{ marginBottom: '24px' }}>
                {vendors.map((vendor, i) => (
                    <button key={i}
                        className={`tab-btn ${selectedVendor === i ? 'active' : ''}`}
                        onClick={() => setSelectedVendor(i)}>
                        {vendor.document_metadata.vendor_name}
                    </button>
                ))}
            </div>

            {/* Top Stats */}
            <div className="stats-grid">
                <div className="stat-card purple">
                    <div className="stat-icon purple"><HiOutlineBanknotes /></div>
                    <div className="stat-info">
                        <h4>Total Landed Cost</h4>
                        <div className="stat-value">
                            {v.commercial_summary.true_total_landed_cost_usd?.toLocaleString()} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{v.commercial_summary.original_currency_code || ''}</span>
                        </div>
                    </div>
                </div>
                <div className="stat-card cyan">
                    <div className="stat-icon cyan"><HiOutlineClock /></div>
                    <div className="stat-info">
                        <h4>Delivery Days</h4>
                        <div className="stat-value">{v.commercial_summary.normalized_delivery_days}</div>
                    </div>
                </div>
                <div className="stat-card pink">
                    <div className="stat-icon pink"><HiOutlineShieldCheck /></div>
                    <div className="stat-info">
                        <h4>Risk Level</h4>
                        <div className="stat-value">{v.risk_analysis.overall_risk_level}</div>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green"><HiOutlineDocumentCheck /></div>
                    <div className="stat-info">
                        <h4>Nexus Score</h4>
                        <div className="stat-value">{v.mcd_scoring.nexus_trust_score?.toFixed(1)}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', marginTop: '24px' }}>
                {/* Left: Score Gauge & Badges */}
                <div>
                    <div className="glass-card" style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <NexusScoreGauge score={v.mcd_scoring.nexus_trust_score} size={180} />
                            <span className={`tier-badge ${getTierClass(v.quality_and_intelligence.brand_tier)}`}>
                                {v.quality_and_intelligence.brand_tier}
                            </span>
                            <span className={`risk-badge ${getRiskClass(v.risk_analysis.overall_risk_level)}`}>
                                {v.risk_analysis.overall_risk_level} RISK
                            </span>
                        </div>
                    </div>

                    <div className="glass-card">
                        <div className="card-header"><h3>Score Breakdown</h3></div>
                        <div className="card-body">
                            {Object.entries(v.mcd_scoring.score_breakdown).map(([key, val]) => (
                                <div key={key} style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key.replace('_score', '')}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-bright)' }}>{val.toFixed(1)}/100</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className={`progress-fill ${val >= 70 ? 'green' : val >= 40 ? 'purple' : 'red'}`}
                                            style={{ width: `${val}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: 7-Phase Detail */}
                <div>
                    {/* Line Items Table */}
                    <div className="glass-card" style={{ marginBottom: '20px' }}>
                        <div className="card-header"><h3>📋 Extracted Line Items ({v.line_items?.length})</h3></div>
                        <div className="card-body" style={{ overflow: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>SKU</th>
                                        <th>Qty</th>
                                        <th>UoM</th>
                                        <th>Unit Price</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {v.line_items?.map((item, li) => (
                                        <tr key={li}>
                                            <td>{item.description}</td>
                                            <td className="mono">{item.sku_or_part || 'N/A'}</td>
                                            <td>{item.quantity}</td>
                                            <td>{item.unit_measure}</td>
                                            <td className="amount">{item.unit_price_usd?.toLocaleString()} {v.commercial_summary.original_currency_code || ''}</td>
                                            <td className="amount">{item.subtotal_usd?.toLocaleString()} {v.commercial_summary.original_currency_code || ''}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid var(--border-active)' }}>
                                        <td colSpan={4}></td>
                                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Base Total</td>
                                        <td className="amount">{v.commercial_summary.total_base_cost_usd?.toLocaleString()} {v.commercial_summary.original_currency_code || ''}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={4}></td>
                                        <td style={{ color: 'var(--text-muted)' }}>+ Tax</td>
                                        <td className="amount">{v.commercial_summary.total_tax_usd?.toLocaleString()} {v.commercial_summary.original_currency_code || ''}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={4}></td>
                                        <td style={{ color: 'var(--text-muted)' }}>+ Shipping</td>
                                        <td className="amount">{v.commercial_summary.shipping_and_handling_usd?.toLocaleString()} {v.commercial_summary.original_currency_code || ''}</td>
                                    </tr>
                                    <tr style={{ background: 'rgba(108,99,255,0.06)' }}>
                                        <td colSpan={4}></td>
                                        <td style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>LANDED COST</td>
                                        <td className="amount" style={{ fontSize: '16px', color: 'var(--accent-primary)' }}>
                                            {v.commercial_summary.true_total_landed_cost_usd?.toLocaleString()} {v.commercial_summary.original_currency_code || ''}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quality & Certifications */}
                    <div className="glass-card" style={{ marginBottom: '20px' }}>
                        <div className="card-header"><h3>⭐ Quality & Intelligence</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div className="vendor-metric">
                                    <span className="metric-label">Customer Rating</span>
                                    <span className="metric-value" style={{ fontSize: '14px' }}>
                                        ⭐ {v.quality_and_intelligence.customer_rating_out_of_5 === 0 ? 'N/A' : `${v.quality_and_intelligence.customer_rating_out_of_5}/5`}
                                    </span>
                                </div>
                                <div className="vendor-metric">
                                    <span className="metric-label">ESG Score</span>
                                    <span className="metric-value">{v.quality_and_intelligence.esg_score_classification}</span>
                                </div>
                                <div className="vendor-metric">
                                    <span className="metric-label">Warranty</span>
                                    <span className="metric-value" style={{ fontSize: '13px' }}>{v.quality_and_intelligence.warranty_raw || v.quality_and_intelligence.warranty_classification}</span>
                                </div>
                            </div>
                            <div>
                                <span className="metric-label" style={{ marginBottom: '8px', display: 'block' }}>Certifications</span>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {v.quality_and_intelligence.certifications_detected?.map((cert, ci) => (
                                        <span key={ci} style={{
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                                            background: 'rgba(0,230,118,0.08)', color: 'var(--accent-success)',
                                            border: '1px solid rgba(0,230,118,0.2)',
                                        }}>✓ {cert}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Risk Analysis */}
                    <div className="glass-card" style={{ marginBottom: '20px' }}>
                        <div className="card-header">
                            <h3>🛡️ Risk Analysis</h3>
                            <span className={`risk-badge ${getRiskClass(v.risk_analysis.overall_risk_level)}`}>
                                {v.risk_analysis.overall_risk_level}
                            </span>
                        </div>
                        <div className="card-body">
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.7 }}>
                                {v.risk_analysis.risk_justification}
                            </p>
                            {v.risk_analysis.hidden_clauses_detected?.map((clause, ci) => (
                                <div key={ci} style={{
                                    padding: '10px 14px', marginBottom: '8px', fontSize: '13px',
                                    background: clause === 'None detected' ? 'rgba(0,230,118,0.06)' : 'rgba(255,82,82,0.06)',
                                    color: clause === 'None detected' ? 'var(--accent-success)' : 'var(--accent-danger)',
                                    border: `1px solid ${clause === 'None detected' ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                }}>
                                    {clause === 'None detected' ? '✅' : '⚠️'} {clause}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Negotiation */}
                    <div className="negotiation-card">
                        <div className="negotiation-header">
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-bright)' }}>
                                💬 Negotiation Copilot
                            </h3>
                        </div>
                        <div className="negotiation-body">
                            <div className="negotiation-weakness">
                                <h4>⚡ Identified Weakness</h4>
                                <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{v.negotiation_copilot.identified_weakness}</p>
                            </div>
                            <div className="negotiation-email">
                                {v.negotiation_copilot.suggested_email_script}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
