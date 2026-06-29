import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Clock, AlertTriangle, ArrowRight, Rocket, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';

function RfqListPage() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRfqs();
  }, []);

  const loadRfqs = async () => {
    try {
      const data = await api.listRfqs();
      setRfqs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="pill pill-active"><span className="live-dot" /> Active</span>;
      case 'CLOSED':
        return <span className="pill pill-closed">Closed</span>;
      case 'FORCE_CLOSED':
        return <span className="pill pill-force-closed">Force Closed</span>;
      default:
        return <span className="pill">{status}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a');
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount) => {
    if (amount == null) return 'No bids yet';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="animate-in">
        <div className="page-heading">
          <div className="skeleton skeleton-text" style={{ width: '30%', height: 28 }} />
          <div className="skeleton skeleton-text" style={{ width: '50%', marginTop: 12 }} />
        </div>
        <div className="rfq-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="page-heading">
        <div className="page-heading-row">
          <div>
            <h1>Live Auctions</h1>
            <p>Monitor active bidding and track supplier competition across all your RFQs.</p>
          </div>
          <Link to="/create" className="btn btn-primary btn-lg">
            <Rocket size={18} /> Launch New Auction
          </Link>
        </div>
      </div>

      {rfqs.length === 0 ? (
        <div className="glass-card">
          <div className="no-data">
            <FolderOpen size={56} />
            <h3>No Auctions Running</h3>
            <p>Launch your first auction to start receiving competitive offers from suppliers.</p>
            <Link to="/create" className="btn btn-primary">Get Started</Link>
          </div>
        </div>
      ) : (
        <div className="rfq-grid">
          {rfqs.map((rfq, i) => (
            <Link
              to={`/rfq/${rfq.id}`}
              key={rfq.id}
              className="rfq-card animate-in"
              style={{ opacity: 0, animationDelay: `${i * 0.07}s` }}
            >
              <div className="rfq-card-header">
                <div>
                  <div className="rfq-card-name">{rfq.name}</div>
                  <div className="rfq-card-id">{rfq.id.slice(0, 10)}…</div>
                </div>
                {getStatusPill(rfq.status)}
              </div>

              <div className="rfq-card-stats">
                <div className="rfq-card-stat">
                  <span className="rfq-card-stat-label">Lowest Offer</span>
                  <span className="rfq-card-stat-value" style={{ color: rfq.lowestBidAmount ? 'var(--color-accent)' : undefined, fontWeight: rfq.lowestBidAmount ? 700 : 500 }}>
                    {formatAmount(rfq.lowestBidAmount)}
                  </span>
                </div>
                <div className="rfq-card-stat">
                  <span className="rfq-card-stat-label">Closes At</span>
                  <span className="rfq-card-stat-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    {formatDate(rfq.currentBidCloseDate)}
                  </span>
                </div>
                <div className="rfq-card-stat" style={{ gridColumn: '1 / -1' }}>
                  <span className="rfq-card-stat-label">Hard Deadline</span>
                  <span className="rfq-card-stat-value" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-danger)' }}>
                    <AlertTriangle size={12} />
                    {formatDate(rfq.forcedBidCloseDate)}
                  </span>
                </div>
              </div>

              <div className="rfq-card-footer">
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  View details
                </span>
                <ArrowRight size={16} style={{ color: 'var(--color-primary)' }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default RfqListPage;
