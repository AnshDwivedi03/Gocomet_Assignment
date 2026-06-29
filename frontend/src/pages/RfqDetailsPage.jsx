import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ChevronLeft, Clock, AlertTriangle, Hourglass, ArrowUpRight, BarChart3, Award, Settings, Zap, Send } from 'lucide-react';
import { format } from 'date-fns';

// Countdown Hook
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, expired: true });

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true });
        return;
      }

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60),
        expired: false,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

// Human-readable trigger names
const TRIGGER_NAMES = {
  ANY_BID: 'Any Bid Received',
  ANY_RANK_CHANGE: 'Any Rank Shift',
  L1_RANK_CHANGE: 'L1 (Top Bidder) Swap',
};

function RfqDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');

  const [bidForm, setBidForm] = useState({
    supplierId: '',
    carrierName: '',
    freightCharges: '',
    originCharges: '',
    destinationCharges: '',
    transitTime: '',
    quoteValidity: '',
  });

  const loadDetails = useCallback(async () => {
    try {
      const data = await api.getRfqDetails(id);
      setRfq(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
    // Live polling
    const interval = setInterval(loadDetails, 5000);
    return () => clearInterval(interval);
  }, [loadDetails]);

  const countdown = useCountdown(rfq?.currentBidCloseDate);

  const handleBidChange = (e) => {
    const { name, value } = e.target;
    setBidForm(prev => ({ ...prev, [name]: value }));
    setBidError('');
    setBidSuccess('');
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    if (!bidForm.supplierId.trim() || !bidForm.carrierName.trim()) {
      setBidError('Supplier ID and Carrier Name are required.');
      return;
    }
    const freight = parseFloat(bidForm.freightCharges) || 0;
    const origin = parseFloat(bidForm.originCharges) || 0;
    const dest = parseFloat(bidForm.destinationCharges) || 0;
    if (freight + origin + dest <= 0) {
      setBidError('Total charges must be greater than zero.');
      return;
    }

    setBidSubmitting(true);
    try {
      const result = await api.submitBid(id, {
        supplierId: bidForm.supplierId.trim(),
        carrierName: bidForm.carrierName.trim(),
        freightCharges: freight,
        originCharges: origin,
        destinationCharges: dest,
        transitTime: parseInt(bidForm.transitTime) || null,
        quoteValidity: bidForm.quoteValidity || null,
      });
      setBidSuccess(result.extended
        ? '🔥 Offer placed! Auction deadline was extended.'
        : '✅ Offer placed successfully!');
      setBidForm({ supplierId: '', carrierName: '', freightCharges: '', originCharges: '', destinationCharges: '', transitTime: '', quoteValidity: '' });
      await loadDetails();
    } catch (err) {
      setBidError(err.message);
    } finally {
      setBidSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, hh:mm:ss a');
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount) => {
    if (amount == null) return '—';
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getRankMedal = (index) => {
    const rank = index + 1;
    const label = `L${rank}`;
    if (rank === 1) return <span className="rank-medal gold" title="Rank 1">🥇</span>;
    if (rank === 2) return <span className="rank-medal silver" title="Rank 2">🥈</span>;
    if (rank === 3) return <span className="rank-medal bronze" title="Rank 3">🥉</span>;
    return <span className="rank-medal other">{label}</span>;
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

  if (loading || !rfq) {
    return (
      <div className="animate-in" style={{ padding: 'var(--gap-3xl) 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--gap-md)' }}>
          <div className="skeleton" style={{ width: 200, height: 24 }} />
          <div className="skeleton" style={{ width: 300, height: 16 }} />
          <div style={{ display: 'flex', gap: 'var(--gap-md)', marginTop: 'var(--gap-lg)' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ width: 180, height: 90, borderRadius: 'var(--rounded-lg)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isActive = rfq.status === 'ACTIVE' && !countdown.expired;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-heading">
        <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="page-heading-row">
          <div>
            <h1>{rfq.name}</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
              {rfq.id}
            </p>
          </div>
          {getStatusPill(rfq.status)}
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="metrics-row">
        <div className="metric-tile">
          <div className="metric-tile-label">Total Offers</div>
          <div className="metric-tile-value glow">{rfq.bids?.length || 0}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-tile-label">Best Price</div>
          <div className="metric-tile-value" style={{ color: 'var(--color-accent)' }}>
            {rfq.bids?.length > 0 ? formatAmount(rfq.bids[0].totalAmount) : '—'}
          </div>
        </div>
        <div className="metric-tile">
          <div className="metric-tile-label">Current Deadline</div>
          <div className="metric-tile-value" style={{ fontSize: '0.95rem' }}>
            {formatDate(rfq.currentBidCloseDate)}
          </div>
        </div>
        <div className="metric-tile">
          <div className="metric-tile-label">Hard Cutoff</div>
          <div className="metric-tile-value" style={{ fontSize: '0.95rem', color: 'var(--color-danger)' }}>
            {formatDate(rfq.forcedBidCloseDate)}
          </div>
        </div>
      </div>

      {/* Countdown */}
      {isActive && (
        <div className="glass-card" style={{ marginBottom: 'var(--gap-lg)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 'var(--gap-md)', color: 'var(--color-text-secondary)' }}>
            <Hourglass size={18} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Closing In</span>
          </div>
          <div className="timer-row" style={{ justifyContent: 'center' }}>
            {countdown.d > 0 && (
              <>
                <div className="timer-block">
                  <div className="timer-digit">{String(countdown.d).padStart(2, '0')}</div>
                  <div className="timer-unit">Days</div>
                </div>
                <div className="timer-colon">:</div>
              </>
            )}
            <div className="timer-block">
              <div className="timer-digit">{String(countdown.h).padStart(2, '0')}</div>
              <div className="timer-unit">Hrs</div>
            </div>
            <div className="timer-colon">:</div>
            <div className="timer-block">
              <div className="timer-digit">{String(countdown.m).padStart(2, '0')}</div>
              <div className="timer-unit">Min</div>
            </div>
            <div className="timer-colon">:</div>
            <div className="timer-block">
              <div className="timer-digit">{String(countdown.s).padStart(2, '0')}</div>
              <div className="timer-unit">Sec</div>
            </div>
          </div>
        </div>
      )}

      {/* Config Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gap-sm)', marginBottom: 'var(--gap-lg)' }}>
        <div className="config-tag">
          <Settings size={14} />
          Window: <strong>{rfq.triggerWindowMinutes} min</strong>
        </div>
        <div className="config-tag">
          <Zap size={14} />
          Extension: <strong>{rfq.extensionDurationMinutes} min</strong>
        </div>
        <div className="config-tag">
          <BarChart3 size={14} />
          Trigger: <strong>{TRIGGER_NAMES[rfq.extensionTriggerType] || rfq.extensionTriggerType}</strong>
        </div>
      </div>

      {/* Main Content */}
      <div className="detail-columns">
        {/* Left Column */}
        <div>
          {/* Leaderboard */}
          <div className="glass-card" style={{ marginBottom: 'var(--gap-lg)' }}>
            <div className="glass-card-header">
              <div className="glass-card-title">
                <Award size={18} style={{ color: 'var(--color-primary)' }} /> Supplier Leaderboard
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {rfq.bids?.length || 0} offers
              </span>
            </div>

            {rfq.bids?.length === 0 ? (
              <div className="no-data" style={{ padding: 'var(--gap-xl)' }}>
                <p style={{ marginBottom: 0 }}>No offers received yet. Be the first to compete!</p>
              </div>
            ) : (
              <div className="data-table-wrap" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Supplier</th>
                      <th>Carrier</th>
                      <th>Freight</th>
                      <th>Origin</th>
                      <th>Dest.</th>
                      <th>Total</th>
                      <th>Transit</th>
                      <th>Validity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.bids.map((bid, i) => (
                      <tr key={bid.id}>
                        <td>{getRankMedal(i)}</td>
                        <td style={{ fontWeight: 600 }}>{bid.supplierId}</td>
                        <td>{bid.carrierName}</td>
                        <td>{formatAmount(bid.freightCharges)}</td>
                        <td>{formatAmount(bid.originCharges)}</td>
                        <td>{formatAmount(bid.destinationCharges)}</td>
                        <td style={{ fontWeight: 700, color: i === 0 ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                          {formatAmount(bid.totalAmount)}
                        </td>
                        <td>{bid.transitTime ? `${bid.transitTime} days` : '—'}</td>
                        <td>{bid.quoteValidity || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bid Form */}
          {isActive && (
            <div className="glass-card">
              <div className="glass-card-header">
                <div className="glass-card-title">
                  <ArrowUpRight size={18} style={{ color: 'var(--color-primary)' }} /> Place Your Offer
                </div>
              </div>
              <form onSubmit={handleBidSubmit}>
                <div className="field-grid">
                  <div className="field-group">
                    <label className="field-label">Supplier ID</label>
                    <input className="field-input" name="supplierId" value={bidForm.supplierId} onChange={handleBidChange} placeholder="e.g. Vendor-Alpha" required />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Carrier Name</label>
                    <input className="field-input" name="carrierName" value={bidForm.carrierName} onChange={handleBidChange} placeholder="e.g. FastTrack Logistics" required />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Freight Charges (₹)</label>
                    <input className="field-input" type="number" step="0.01" name="freightCharges" value={bidForm.freightCharges} onChange={handleBidChange} placeholder="0.00" required />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Origin Charges (₹)</label>
                    <input className="field-input" type="number" step="0.01" name="originCharges" value={bidForm.originCharges} onChange={handleBidChange} placeholder="0.00" required />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Destination Charges (₹)</label>
                    <input className="field-input" type="number" step="0.01" name="destinationCharges" value={bidForm.destinationCharges} onChange={handleBidChange} placeholder="0.00" required />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Transit Time (days)</label>
                    <input className="field-input" type="number" name="transitTime" value={bidForm.transitTime} onChange={handleBidChange} placeholder="e.g. 5" />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Quote Validity</label>
                    <input className="field-input" name="quoteValidity" value={bidForm.quoteValidity} onChange={handleBidChange} placeholder="e.g. 14 days" />
                  </div>
                </div>

                {bidError && (
                  <div className="alert-box alert-box-error" style={{ marginBottom: 'var(--gap-md)' }}>
                    {bidError}
                  </div>
                )}
                {bidSuccess && (
                  <div className="alert-box alert-box-success" style={{ marginBottom: 'var(--gap-md)' }}>
                    {bidSuccess}
                  </div>
                )}

                <button type="submit" className="btn btn-primary" disabled={bidSubmitting} style={{ width: '100%' }}>
                  {bidSubmitting ? 'Submitting…' : 'Place Offer'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Activity Feed */}
        <div>
          <div className="glass-card" style={{ position: 'sticky', top: 80 }}>
            <div className="glass-card-header">
              <div className="glass-card-title">
                <BarChart3 size={18} style={{ color: 'var(--color-primary)' }} /> Activity Feed
              </div>
            </div>

            {rfq.logs?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--gap-xl)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No activity recorded yet.
              </div>
            ) : (
              <div className="feed" style={{ maxHeight: 520, overflowY: 'auto' }}>
                {rfq.logs.map(log => (
                  <div className="feed-item" key={log.id}>
                    <div className={`feed-icon ${log.type === 'BID_SUBMITTED' ? 'type-bid' : 'type-extend'}`}>
                      {log.type === 'BID_SUBMITTED' ? <Send size={16} /> : <Zap size={16} />}
                    </div>
                    <div className="feed-body">
                      <div className="feed-text">{log.description}</div>
                      <div className="feed-timestamp">{formatDate(log.createdAt)}</div>
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

export default RfqDetailsPage;
