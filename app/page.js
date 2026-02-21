'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HiOutlineCloudArrowUp, HiOutlineChartBar, HiOutlineScale,
  HiOutlineChatBubbleLeftRight, HiOutlineShieldCheck, HiOutlineBolt,
  HiOutlineDocumentCheck, HiOutlineCpuChip, HiOutlineArrowRight,
  HiOutlineBeaker, HiOutlineGlobeAlt
} from 'react-icons/hi2';

const API_URL = 'http://localhost:8000';

export default function HomePage() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const features = [
    {
      icon: <HiOutlineDocumentCheck />,
      title: '7-Phase Forensic Analysis',
      desc: 'Every quotation undergoes a strict chain-of-thought pipeline: metadata check, extraction, normalization, quality assessment, risk scrubbing, MCDA scoring, and negotiation strategy.',
      color: '#6c63ff',
    },
    {
      icon: <HiOutlineCpuChip />,
      title: 'Smart Extraction Engine',
      desc: 'Automatically ingest PDFs, DOCX, and raw quotations. Our forensic parser extracts line items, taxes, shipping costs, and hidden fees with zero manual input.',
      color: '#00d4ff',
    },
    {
      icon: <HiOutlineShieldCheck />,
      title: 'Legal & Risk Scrubbing',
      desc: 'AI-powered fine print scanner detects variable pricing clauses, force majeure, auto-renewal traps, and penalizes risky payment terms automatically.',
      color: '#ff6b9d',
    },
    {
      icon: <HiOutlineScale />,
      title: 'Multi-Criteria Decision Analysis',
      desc: 'Weighted scoring across Cost (40%), Quality (30%), Speed (20%), and Risk (10%) with customizable buyer priorities for truly objective comparisons.',
      color: '#00e676',
    },
    {
      icon: <HiOutlineGlobeAlt />,
      title: 'Brand & Sentiment Intelligence',
      desc: 'Cross-references market intelligence, ESG scores, customer reviews, ISO certifications, and brand trust tiers for holistic vendor evaluation.',
      color: '#ffab40',
    },
    {
      icon: <HiOutlineChatBubbleLeftRight />,
      title: 'Negotiation Copilot',
      desc: 'AI identifies each vendor\'s weakest point and generates ready-to-send email scripts for strategic negotiation leverage.',
      color: '#e040fb',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <HiOutlineBolt /> Nexus-Prime Intelligence Engine v1.0
        </div>
        <h1 className="hero-title">
          <span className="gradient-text">Smart Quotation</span><br />
          Intelligence System
        </h1>
        <p className="hero-subtitle">
          AI-powered procurement intelligence that ingests vendor quotations in any format,
          performs forensic analysis, and delivers multi-criteria recommendations with
          full transparency and auditability.
        </p>
        <div className="hero-actions">
          <Link href="/upload" className="btn btn-primary btn-lg">
            <HiOutlineCloudArrowUp /> Upload Quotation
          </Link>
          <Link href="/compare" className="btn btn-secondary btn-lg">
            <HiOutlineScale /> Compare Vendors
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="stats-grid" style={{ animationDelay: '0.3s' }}>
        <div className="stat-card purple" style={{ animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.1s', opacity: 0 }}>
          <div className="stat-icon purple"><HiOutlineDocumentCheck /></div>
          <div className="stat-info">
            <h4>Analysis Engine</h4>
            <div className="stat-value">7-Phase</div>
            <div className="stat-change">Chain-of-Thought Pipeline</div>
          </div>
        </div>
        <div className="stat-card cyan" style={{ animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.2s', opacity: 0 }}>
          <div className="stat-icon cyan"><HiOutlineBeaker /></div>
          <div className="stat-info">
            <h4>Scoring Model</h4>
            <div className="stat-value">MCDA</div>
            <div className="stat-change">Multi-Criteria Decision Analysis</div>
          </div>
        </div>
        <div className="stat-card pink" style={{ animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.3s', opacity: 0 }}>
          <div className="stat-icon pink"><HiOutlineShieldCheck /></div>
          <div className="stat-info">
            <h4>Risk Detection</h4>
            <div className="stat-value">Real-Time</div>
            <div className="stat-change">Clause Scanner Active</div>
          </div>
        </div>
        <div className="stat-card green" style={{ animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.4s', opacity: 0 }}>
          <div className="stat-icon green"><HiOutlineBolt /></div>
          <div className="stat-info">
            <h4>Backend Status</h4>
            <div className="stat-value">{health ? 'Online' : 'Offline'}</div>
            <div className="stat-change">{health ? `${health.analyses_stored} analyses stored` : 'Start backend to connect'}</div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="features-grid">
        {features.map((f, i) => (
          <div
            key={i}
            className="feature-card"
            style={{ animation: 'fadeInUp 0.6s ease forwards', animationDelay: `${0.1 * (i + 1)}s`, opacity: 0 }}
          >
            <div className="feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
              {f.icon}
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div style={{
        marginTop: '60px',
        textAlign: 'center',
        padding: '48px',
        background: 'var(--gradient-card)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--text-bright)',
          marginBottom: '12px',
        }}>
          Ready to Analyze?
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
          Upload vendor quotations or run the built-in sample analysis to see Nexus-Prime in action.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/compare" className="btn btn-primary">
            <HiOutlineBolt /> Run Sample Analysis <HiOutlineArrowRight />
          </Link>
          <Link href="/upload" className="btn btn-secondary">
            <HiOutlineCloudArrowUp /> Upload Your Own
          </Link>
        </div>
      </div>
    </div>
  );
}
