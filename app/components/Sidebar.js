'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HiOutlineHome, HiOutlineCloudArrowUp, HiOutlineChartBar,
    HiOutlineScale, HiOutlineChatBubbleLeftRight, HiOutlineClipboardDocumentList,
    HiOutlineCog6Tooth, HiOutlineShieldCheck
} from 'react-icons/hi2';

const navItems = [
    { label: 'INTELLIGENCE', type: 'section' },
    { href: '/', label: 'Dashboard', icon: HiOutlineHome },
    { href: '/upload', label: 'Ingest Quotation', icon: HiOutlineCloudArrowUp },
    { href: '/analysis', label: 'Vendor Analysis', icon: HiOutlineChartBar },
    { label: 'DECISION', type: 'section' },
    { href: '/compare', label: 'Compare Vendors', icon: HiOutlineScale },
    { href: '/negotiate', label: 'Negotiation Copilot', icon: HiOutlineChatBubbleLeftRight },
    { label: 'GOVERNANCE', type: 'section' },
    { href: '/audit', label: 'Audit Trail', icon: HiOutlineClipboardDocumentList },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">N</div>
                <div>
                    <div className="sidebar-title">NEXUS-PRIME</div>
                    <div className="sidebar-subtitle">Procurement AI</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item, i) => {
                    if (item.type === 'section') {
                        return (
                            <div key={i} className="sidebar-section-label">{item.label}</div>
                        );
                    }
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon"><Icon /></span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-status">
                    <span className="status-dot"></span>
                    <span>Engine Online</span>
                </div>
            </div>
        </aside>
    );
}
