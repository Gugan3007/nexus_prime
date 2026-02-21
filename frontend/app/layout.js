import './globals.css';
import Sidebar from './components/Sidebar';

export const metadata = {
  title: 'Nexus-Prime | Smart Quotation Intelligence',
  description: 'AI-powered procurement intelligence system for vendor quotation analysis and comparison',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-grid" />
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
