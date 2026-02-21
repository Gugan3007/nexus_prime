'use client';
import { useState, useEffect } from 'react';
import NexusScoreGauge from '../components/NexusScoreGauge';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import {
    HiOutlineBolt, HiOutlineTrophy, HiOutlineArrowPath,
    HiOutlineShieldCheck, HiOutlineClock, HiOutlineBanknotes,
    HiOutlineStar, HiOutlineChevronDown
} from 'react-icons/hi2';

const API_URL = 'http://localhost:8000';
const COLORS = ['#6c63ff', '#00d4ff', '#ff6b9d', '#00e676', '#ffab40'];

export default function ComparePage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activePhase, setActivePhase] = useState(7);
    const [expandedVendor, setExpandedVendor] = useState(null);
    const [priorities, setPriorities] = useState({
        cost: 0.40, quality: 0.30, speed: 0.20, risk: 0.10,
    });

    const runAnalysis = async () => {
        setLoading(true);
        setActivePhase(0);
        const phases = [1, 2, 3, 4, 5, 6, 7];
        for (let p of phases) {
            await new Promise(r => setTimeout(r, 400));
            setActivePhase(p);
        }
        try {
            const res = await fetch(`${API_URL}/api/analyze-samples`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(priorities),
            });
            const result = await res.json();
            setData(result);
        } catch (err) {
            alert('Backend not reachable.');
        }
        setLoading(false);
    };

    const runCompareStored = async () => {
        setLoading(true);
        setActivePhase(0);
        const phases = [1, 2, 3, 4, 5, 6, 7];
        for (let p of phases) {
            await new Promise(r => setTimeout(r, 200));
            setActivePhase(p);
        }
        try {
            const res = await fetch(`${API_URL}/api/compare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([]),
            });
            const result = await res.json();
            if (result.detail) {
                alert(result.detail);
            } else {
                setData({
                    vendor_analyses: result.vendor_details,
                    comparison: result.comparison
                });
            }
        } catch (err) {
            alert('Backend not reachable.');
        }
        setLoading(false);
    };

    const getRiskClass = (level) => {
        return level?.toLowerCase().replace(' ', '') || 'moderate';
    };

    const getTierClass = (tier) => {
        if (tier?.includes('Tier 1')) return 'tier1';
        if (tier?.includes('Tier 3')) return 'tier3';
        return 'tier2';
    };

    const vendors = data?.vendor_analyses || [];
    const comparison = data?.comparison || {};
    const recommended = comparison?.recommended_vendor;

    // Prepare chart data
    const radarData = vendors.length > 0 ? [
        { metric: 'Cost', ...Object.fromEntries(vendors.map((v, i) => [v.document_metadata.vendor_name, v.mcd_scoring.score_breakdown.cost_score])) },
        { metric: 'Quality', ...Object.fromEntries(vendors.map((v, i) => [v.document_metadata.vendor_name, v.mcd_scoring.score_breakdown.quality_score])) },
        { metric: 'Speed', ...Object.fromEntries(vendors.map((v, i) => [v.document_metadata.vendor_name, v.mcd_scoring.score_breakdown.speed_score])) },
        { metric: 'Risk', ...Object.fromEntries(vendors.map((v, i) => [v.document_metadata.vendor_name, v.mcd_scoring.score_breakdown.risk_score])) },
    ] : [];

    const costData = vendors.map((v, i) => ({
        name: v.document_metadata.vendor_name.split(' ').slice(0, 2).join(' '),
        'Base Cost': v.commercial_summary.total_base_cost_usd,
        'Tax': v.commercial_summary.total_tax_usd,
        'Shipping': v.commercial_summary.shipping_and_handling_usd,
        color: COLORS[i],
    }));

    const deliveryData = vendors.map((v, i) => ({
        name: v.document_metadata.vendor_name.split(' ').slice(0, 2).join(' '),
        days: v.commercial_summary.normalized_delivery_days,
        color: COLORS[i],
    }));

    return (
        <div>
            <div className="page-header">
                <div className="page-breadcrumb">Nexus-Prime <span>/</span> Compare Vendors</div>
                <h1>Multi-Vendor Comparison</h1>
                <p>Run the full 7-phase analysis pipeline on sample vendors and compare results with MCDA scoring.</p>
            </div>

            {/* Priority Sliders */}
            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h3>⚖️ Buyer Priority Weights</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-secondary" onClick={runCompareStored} disabled={loading}>
                            {loading ? <><span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Analyzing...</> : <><HiOutlineArrowPath /> Compare Uploaded Vendors</>}
                        </button>
                        <button className="btn btn-primary" onClick={runAnalysis} disabled={loading}>
                            {loading ? <><span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running Pipeline...</> : <><HiOutlineBolt /> Run Sample Analysis</>}
                        </button>
                    </div>
                </div>
                <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                    {[
                        { key: 'cost', label: 'Total Landed Cost', icon: <HiOutlineBanknotes />, color: '#6c63ff' },
                        { key: 'quality', label: 'Quality & Brand', icon: <HiOutlineStar />, color: '#00d4ff' },
                        { key: 'speed', label: 'Delivery Speed', icon: <HiOutlineClock />, color: '#00e676' },
                        { key: 'risk', label: 'Risk Profile', icon: <HiOutlineShieldCheck />, color: '#ff6b9d' },
                    ].map(({ key, label, icon, color }) => (
                        <div key={key} className="priority-slider">
                            <label>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color }}>{icon}</span> {label}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>
                                    {Math.round(priorities[key] * 100)}%
                                </span>
                            </label>
                            <input type="range" min="0" max="100" value={priorities[key] * 100}
                                onChange={e => setPriorities({ ...priorities, [key]: parseInt(e.target.value) / 100 })} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Phase Pipeline */}
            {loading && (
                <div className="phase-pipeline" style={{ marginBottom: '24px' }}>
                    {['Metadata', 'Extraction', 'Normalize', 'Quality', 'Risk', 'Scoring', 'Negotiation'].map((p, i) => (
                        <div key={i} className={`phase-step ${activePhase > i + 1 ? 'completed' : activePhase === i + 1 ? 'active' : ''}`}>
                            <span className="phase-num">{activePhase > i + 1 ? '✓' : i + 1}</span>
                            {p}
                        </div>
                    ))}
                </div>
            )}

            {/* Results */}
            {data && (
                <>
                    {/* Recommendation Banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,191,165,0.05))',
                        border: '1px solid rgba(0,230,118,0.25)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px 32px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        animation: 'fadeInUp 0.6s ease forwards',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: '50%',
                                background: 'rgba(0,230,118,0.15)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                            }}>
                                <HiOutlineTrophy style={{ color: '#00e676' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--accent-success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    ★ Recommended Vendor
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-bright)', fontFamily: 'var(--font-display)' }}>
                                    {recommended}
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', maxWidth: '500px' }}>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {comparison.recommendation_justification}
                            </p>
                            {comparison.savings_vs_most_expensive > 0 && (
                                <div style={{ fontSize: '14px', color: '#00e676', fontWeight: 600, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                                    Potential savings: ${comparison.savings_vs_most_expensive?.toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vendor Cards with Scores */}
                    <div className="vendor-grid" style={{ marginBottom: '32px' }}>
                        {vendors.map((v, i) => {
                            const isWinner = v.document_metadata.vendor_name === recommended;
                            return (
                                <div key={i} className={`vendor-card ${isWinner ? 'winner' : ''}`}
                                    style={{ animation: `fadeInUp 0.6s ease forwards`, animationDelay: `${i * 0.15}s`, opacity: 0 }}>
                                    <div className="vendor-card-header">
                                        <h3>{v.document_metadata.vendor_name}</h3>
                                        <div className="vendor-id">{v.document_metadata.quotation_id}</div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                            <span className={`tier-badge ${getTierClass(v.quality_and_intelligence.brand_tier)}`}>
                                                {v.quality_and_intelligence.brand_tier}
                                            </span>
                                            <span className={`risk-badge ${getRiskClass(v.risk_analysis.overall_risk_level)}`}>
                                                {v.risk_analysis.overall_risk_level}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="vendor-card-body">
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                            <NexusScoreGauge score={v.mcd_scoring.nexus_trust_score} size={140} />
                                        </div>
                                        <div className="vendor-metrics">
                                            <div className="vendor-metric">
                                                <span className="metric-label">Landed Cost</span>
                                                <div className="metric-value">
                                                    {v.commercial_summary.true_total_landed_cost_usd?.toLocaleString()} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{v.commercial_summary.original_currency_code || ''}</span>
                                                </div>
                                            </div>
                                            <div className="vendor-metric">
                                                <span className="metric-label">Delivery</span>
                                                <div className="metric-value">{v.commercial_summary.normalized_delivery_days} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>days</span></div>
                                            </div>
                                            <div className="vendor-metric">
                                                <span className="metric-label">Rating</span>
                                                <div className="metric-value" style={{ fontSize: '14px' }}>
                                                    ⭐ {v.quality_and_intelligence.customer_rating_out_of_5 === 0 ? 'N/A' : `${v.quality_and_intelligence.customer_rating_out_of_5}/5`}
                                                </div>
                                            </div>
                                            <div className="vendor-metric">
                                                <span className="metric-label">Warranty</span>
                                                <span className="metric-value" style={{ fontSize: '13px' }}>{v.quality_and_intelligence.warranty_raw || v.quality_and_intelligence.warranty_classification}</span>
                                            </div>
                                            <div className="vendor-metric">
                                                <span className="metric-label">Payment</span>
                                                <span className="metric-value" style={{ fontSize: '12px' }}>{v.commercial_summary.payment_terms}</span>
                                            </div>
                                            <div className="vendor-metric">
                                                <span className="metric-label">ESG</span>
                                                <span className="metric-value" style={{ fontSize: '12px' }}>{v.quality_and_intelligence.esg_score_classification}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="vendor-card-footer">
                                        <button className="btn btn-secondary" style={{ fontSize: '12px' }}
                                            onClick={() => setExpandedVendor(expandedVendor === i ? null : i)}>
                                            <HiOutlineChevronDown /> Details
                                        </button>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {v.quality_and_intelligence.certifications_detected?.slice(0, 3).map((c, ci) => (
                                                <span key={ci} style={{
                                                    fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                                                    background: 'rgba(108,99,255,0.08)', color: 'var(--text-muted)',
                                                    border: '1px solid var(--border-subtle)',
                                                }}>{c}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedVendor === i && (
                                        <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--border-subtle)' }}>
                                            <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '16px 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Score Breakdown</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                {Object.entries(v.mcd_scoring.score_breakdown).map(([key, val]) => (
                                                    <div key={key}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                                            <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key.replace('_score', '')}</span>
                                                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-bright)' }}>{val.toFixed(1)}</span>
                                                        </div>
                                                        <div className="progress-bar">
                                                            <div className={`progress-fill ${val >= 70 ? 'green' : val >= 40 ? 'purple' : 'red'}`}
                                                                style={{ width: `${val}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '16px 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Line Items</h4>
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Item</th>
                                                        <th>SKU</th>
                                                        <th>Qty</th>
                                                        <th>Unit ($)</th>
                                                        <th>Subtotal ($)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {v.line_items?.map((item, li) => (
                                                        <tr key={li}>
                                                            <td>{item.description}</td>
                                                            <td className="mono">{item.sku_or_part || 'N/A'}</td>
                                                            <td>{item.quantity}</td>
                                                            <td className="amount">{item.unit_price_usd?.toLocaleString()}</td>
                                                            <td className="amount">{item.subtotal_usd?.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {v.risk_analysis.hidden_clauses_detected?.[0] !== 'None detected' && (
                                                <>
                                                    <h4 style={{ fontSize: '13px', color: 'var(--accent-danger)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>⚠ Risk Flags</h4>
                                                    {v.risk_analysis.hidden_clauses_detected.map((c, ci) => (
                                                        <div key={ci} style={{
                                                            padding: '8px 12px', marginBottom: '6px', fontSize: '12px',
                                                            background: 'rgba(255,82,82,0.06)', color: 'var(--accent-danger)',
                                                            border: '1px solid rgba(255,82,82,0.15)', borderRadius: 'var(--radius-sm)',
                                                        }}>⛔ {c}</div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Charts Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        {/* Radar Chart */}
                        <div className="glass-card">
                            <div className="card-header"><h3>🎯 Performance Radar</h3></div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={320}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="rgba(108,99,255,0.15)" />
                                        <PolarAngleAxis dataKey="metric" tick={{ fill: '#9fa8da', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#5c6bc0', fontSize: 10 }} />
                                        {vendors.map((v, i) => (
                                            <Radar key={i}
                                                name={v.document_metadata.vendor_name}
                                                dataKey={v.document_metadata.vendor_name}
                                                stroke={COLORS[i]}
                                                fill={COLORS[i]}
                                                fillOpacity={0.15}
                                                strokeWidth={2}
                                            />
                                        ))}
                                        <Legend wrapperStyle={{ color: '#9fa8da', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#111633',
                                                border: '1px solid rgba(108,99,255,0.2)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Cost Breakdown */}
                        <div className="glass-card">
                            <div className="card-header"><h3>💰 Cost Breakdown</h3></div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={costData} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,99,255,0.08)" />
                                        <XAxis dataKey="name" tick={{ fill: '#9fa8da', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#5c6bc0', fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#111633',
                                                border: '1px solid rgba(108,99,255,0.2)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                            formatter={(value, name, props) => {
                                                const v = vendors[props.payload.name] || vendors.find(ven => ven.document_metadata.vendor_name.includes(props.payload.name));
                                                const currency = v?.commercial_summary?.original_currency_code || '';
                                                return [`${value.toLocaleString()} ${currency}`, name];
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="Base Cost" stackId="a" fill="#6c63ff" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Tax" stackId="a" fill="#ff6b9d" />
                                        <Bar dataKey="Shipping" stackId="a" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Delivery & Negotiation Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Delivery Timeline */}
                        <div className="glass-card">
                            <div className="card-header"><h3>🚚 Delivery Timeline</h3></div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={deliveryData} layout="vertical" barCategoryGap="30%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,99,255,0.08)" />
                                        <XAxis type="number" tick={{ fill: '#5c6bc0', fontSize: 11 }} label={{ value: 'Calendar Days', position: 'insideBottom', offset: -5, fill: '#5c6bc0', fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fill: '#9fa8da', fontSize: 11 }} width={100} />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#111633',
                                                border: '1px solid rgba(108,99,255,0.2)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                            formatter={(v) => `${v} days`}
                                        />
                                        <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                                            {deliveryData.map((entry, index) => (
                                                <Cell key={index} fill={COLORS[index]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Negotiation Preview */}
                        <div className="glass-card">
                            <div className="card-header"><h3>💬 Negotiation Insights</h3></div>
                            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {vendors.map((v, i) => (
                                    <div key={i} style={{
                                        padding: '14px', borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(108,99,255,0.04)',
                                        border: '1px solid var(--border-subtle)',
                                    }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS[i], marginBottom: '6px' }}>
                                            {v.document_metadata.vendor_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--accent-warning)', marginBottom: '4px' }}>
                                            ⚡ {v.negotiation_copilot.identified_weakness}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            Weakest: {v.negotiation_copilot.weakest_dimension}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Empty State */}
            {!data && !loading && (
                <div className="glass-card">
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <h3>Ready to Compare</h3>
                        <p>Click "Compare Uploaded Vendors" to evaluate manually uploaded files, or "Run Sample Analysis" to test the system with 3 diverse sample vendors.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                            <button className="btn btn-secondary" onClick={runCompareStored}><HiOutlineArrowPath /> Compare Uploaded</button>
                            <button className="btn btn-primary" onClick={runAnalysis}><HiOutlineBolt /> Sample Analysis</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
