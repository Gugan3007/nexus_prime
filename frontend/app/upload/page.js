'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineCloudArrowUp, HiOutlineDocumentText, HiOutlineArrowRight, HiOutlineBolt } from 'react-icons/hi2';

const API_URL = 'http://localhost:8000';

export default function UploadPage() {
    const router = useRouter();
    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [mode, setMode] = useState('file'); // 'file' | 'manual'

    const [marketIntel, setMarketIntel] = useState({
        brand_tier: 'Mid-Market',
        customer_rating: 3.5,
        esg_score: 50,
        market_sentiment: '',
    });
    const [priorities, setPriorities] = useState({
        cost: 0.40, quality: 0.30, speed: 0.20, risk: 0.10,
    });
    const [manualData, setManualData] = useState({
        vendor_name: '',
        quotation_id: '',
        date_issued: '',
        valid_until: '',
        currency: 'USD',
        delivery_terms: '',
        payment_terms: '',
        warranty: '',
        raw_text: '',
        fine_print: '',
    });
    const [result, setResult] = useState(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else setDragActive(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    }, []);

    const handleFileUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);

        try {
            const uploadPromises = files.map(async (f) => {
                const formData = new FormData();
                formData.append('file', f);
                formData.append('market_intelligence', JSON.stringify(marketIntel));
                formData.append('buyer_priorities', JSON.stringify(priorities));

                const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
                if (!res.ok) throw new Error('Failed to upload file');
                return await res.json();
            });

            const results = await Promise.all(uploadPromises);
            setResult(results.length === 1 ? results[0] : { multiple: true, count: results.length });
        } catch (err) {
            alert('Backend error or timeout. Ensure the server is running and API keys are valid.');
        }

        setUploading(false);
    };

    const handleManualSubmit = async () => {
        setUploading(true);
        try {
            const res = await fetch(`${API_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    raw_document: manualData,
                    market_intelligence: marketIntel,
                    buyer_priorities: priorities,
                }),
            });
            const data = await res.json();
            setResult(data);
        } catch (err) {
            alert('Backend not reachable. Please start the backend server.');
        }
        setUploading(false);
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-breadcrumb">Nexus-Prime <span>/</span> Ingest Quotation</div>
                <h1>Ingest Vendor Quotation</h1>
                <p>Upload a PDF/DOCX quotation or manually enter vendor data for 7-phase forensic analysis.</p>
            </div>

            {/* Mode Tabs */}
            <div className="tabs">
                <button className={`tab-btn ${mode === 'file' ? 'active' : ''}`} onClick={() => setMode('file')}>
                    📄 File Upload
                </button>
                <button className={`tab-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
                    ✏️ Manual Entry
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Left: Upload/Manual Form */}
                <div>
                    {mode === 'file' ? (
                        <div className="glass-card" style={{ marginBottom: '20px' }}>
                            <div className="card-body">
                                <div
                                    className={`upload-zone ${dragActive ? 'active' : ''}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('file-input').click()}
                                >
                                    <input
                                        id="file-input"
                                        type="file"
                                        accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files)])}
                                    />
                                    <div className="upload-icon"><HiOutlineCloudArrowUp /></div>
                                    <h3>{files.length > 0 ? `${files.length} file(s) selected` : 'Drop quotation files here'}</h3>
                                    <p>{files.length > 0 ? files.map(f => f.name).join(', ') : 'Supports PDF, Word, CSV, Excel, Image'}</p>
                                </div>
                                {files.length > 0 && (
                                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                        <button className="btn btn-primary btn-lg" onClick={handleFileUpload} disabled={uploading}>
                                            {uploading ? <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Analyzing {files.length} file(s)...</> : <><HiOutlineBolt /> Run 7-Phase Analysis on All</>}
                                        </button>
                                        <button className="btn btn-secondary" style={{ marginLeft: '12px' }} onClick={() => setFiles([])} disabled={uploading}>Clear</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ marginBottom: '20px' }}>
                            <div className="card-header"><h3>✏️ Manual Quotation Entry</h3></div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Vendor Name *</label>
                                        <input className="form-input" type="text" value={manualData.vendor_name}
                                            onChange={e => setManualData({ ...manualData, vendor_name: e.target.value })} placeholder="e.g. TechCorp Global" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Quotation ID</label>
                                        <input className="form-input" type="text" value={manualData.quotation_id}
                                            onChange={e => setManualData({ ...manualData, quotation_id: e.target.value })} placeholder="e.g. QT-2026-001" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Date Issued</label>
                                        <input className="form-input" type="date" value={manualData.date_issued}
                                            onChange={e => setManualData({ ...manualData, date_issued: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Valid Until</label>
                                        <input className="form-input" type="date" value={manualData.valid_until}
                                            onChange={e => setManualData({ ...manualData, valid_until: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Currency</label>
                                        <select className="form-select" value={manualData.currency}
                                            onChange={e => setManualData({ ...manualData, currency: e.target.value })}>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                            <option value="INR">INR</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Delivery Terms</label>
                                        <input className="form-input" type="text" value={manualData.delivery_terms}
                                            onChange={e => setManualData({ ...manualData, delivery_terms: e.target.value })} placeholder="e.g. 2 weeks" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Payment Terms</label>
                                        <input className="form-input" type="text" value={manualData.payment_terms}
                                            onChange={e => setManualData({ ...manualData, payment_terms: e.target.value })} placeholder="e.g. Net 30" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Warranty</label>
                                        <input className="form-input" type="text" value={manualData.warranty}
                                            onChange={e => setManualData({ ...manualData, warranty: e.target.value })} placeholder="e.g. 2 years" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Quotation Text / Body</label>
                                    <textarea className="form-textarea" value={manualData.raw_text}
                                        onChange={e => setManualData({ ...manualData, raw_text: e.target.value })}
                                        placeholder="Paste the full quotation text here..." rows={6} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fine Print / Terms & Conditions</label>
                                    <textarea className="form-textarea" value={manualData.fine_print}
                                        onChange={e => setManualData({ ...manualData, fine_print: e.target.value })}
                                        placeholder="Fine print, hidden clauses, legal terms..." rows={4} />
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                    <button className="btn btn-primary btn-lg" onClick={handleManualSubmit}
                                        disabled={uploading || !manualData.vendor_name}>
                                        {uploading ? 'Analyzing...' : <><HiOutlineBolt /> Run 7-Phase Analysis</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Config Panel */}
                <div>
                    <div className="glass-card" style={{ marginBottom: '20px' }}>
                        <div className="card-header"><h3>📊 Market Intelligence</h3></div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Brand Tier</label>
                                <select className="form-select" value={marketIntel.brand_tier}
                                    onChange={e => setMarketIntel({ ...marketIntel, brand_tier: e.target.value })}>
                                    <option value="Enterprise">Tier 1: Enterprise</option>
                                    <option value="Mid-Market">Tier 2: Mid-Market</option>
                                    <option value="Startup">Tier 3: Unverified</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Customer Rating ({marketIntel.customer_rating}/5.0)</label>
                                <input type="range" min="1" max="5" step="0.1" value={marketIntel.customer_rating}
                                    onChange={e => setMarketIntel({ ...marketIntel, customer_rating: parseFloat(e.target.value) })}
                                    style={{ width: '100%' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">ESG Score ({marketIntel.esg_score})</label>
                                <input type="range" min="0" max="100" value={marketIntel.esg_score}
                                    onChange={e => setMarketIntel({ ...marketIntel, esg_score: parseInt(e.target.value) })}
                                    style={{ width: '100%' }} />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card">
                        <div className="card-header"><h3>⚖️ Buyer Priorities</h3></div>
                        <div className="card-body">
                            {Object.entries(priorities).map(([key, val]) => (
                                <div key={key} className="priority-slider" style={{ marginBottom: '16px' }}>
                                    <label>
                                        <span style={{ textTransform: 'capitalize' }}>{key}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{Math.round(val * 100)}%</span>
                                    </label>
                                    <input type="range" min="0" max="100" value={val * 100}
                                        onChange={e => setPriorities({ ...priorities, [key]: parseInt(e.target.value) / 100 })} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Preview */}
            {result && (
                <div className="glass-card" style={{ marginTop: '24px' }}>
                    <div className="card-header">
                        <h3>✅ Analysis Complete</h3>
                        {result.multiple ? (
                            <button className="btn btn-primary" onClick={() => router.push('/compare')}>
                                Compare {result.count} Vendors <HiOutlineArrowRight />
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={() => router.push('/analysis')}>
                                View Full Analysis <HiOutlineArrowRight />
                            </button>
                        )}
                    </div>
                    <div className="card-body">
                        {result.multiple ? (
                            <p>Successfully analyzed {result.count} quotation files. Click "Compare Vendors" to view the MCDA scoring and side-by-side comparison.</p>
                        ) : (
                            <pre style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                padding: '16px',
                                background: 'rgba(108,99,255,0.04)',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'auto',
                                maxHeight: '400px',
                            }}>
                                {JSON.stringify(result.analysis || result, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
