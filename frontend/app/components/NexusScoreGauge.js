'use client';
import { useEffect, useRef } from 'react';

export default function NexusScoreGauge({ score, size = 160, label = 'Trust Score' }) {
    const canvasRef = useRef(null);
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference - (score / 100) * circumference;

    const getColor = (s) => {
        if (s >= 80) return '#00e676';
        if (s >= 60) return '#6c63ff';
        if (s >= 40) return '#ffab40';
        return '#ff5252';
    };

    const getGrade = (s) => {
        if (s >= 90) return 'A+';
        if (s >= 80) return 'A';
        if (s >= 70) return 'B+';
        if (s >= 60) return 'B';
        if (s >= 50) return 'C';
        if (s >= 40) return 'D';
        return 'F';
    };

    const color = getColor(score);

    return (
        <div className="score-gauge">
            <div className="score-circle" style={{ width: size, height: size }}>
                <svg width={size} height={size}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(108,99,255,0.1)"
                        strokeWidth="8"
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashoffset}
                        style={{
                            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)',
                            filter: `drop-shadow(0 0 8px ${color}40)`,
                        }}
                    />
                </svg>
                <div className="score-value">
                    <span className="score-number" style={{ color }}>{score.toFixed(1)}</span>
                    <span className="score-label">{label}</span>
                </div>
            </div>
            <div style={{
                padding: '4px 14px',
                borderRadius: '20px',
                background: `${color}15`,
                color: color,
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '1px',
                border: `1px solid ${color}30`,
            }}>
                GRADE: {getGrade(score)}
            </div>
        </div>
    );
}
