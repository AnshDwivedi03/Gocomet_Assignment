import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ChevronLeft, Zap } from 'lucide-react';

const TRIGGER_OPTIONS = [
  { value: 'ANY_BID', label: 'Any Bid Received', hint: 'The timer resets whenever any supplier places a bid within the window.' },
  { value: 'ANY_RANK_CHANGE', label: 'Any Supplier Rank Change', hint: 'The timer resets if the ranking order among suppliers shifts.' },
  { value: 'L1_RANK_CHANGE', label: 'Lowest Bidder (L1) Change', hint: 'Only resets when a new supplier takes the #1 lowest-price spot.' },
];

function CreateRfqPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    bidStartDate: '',
    bidCloseDate: '',
    forcedBidCloseDate: '',
    pickupDate: '',
    triggerWindowMinutes: 10,
    extensionDurationMinutes: 5,
    extensionTriggerType: 'ANY_BID',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const fillExampleData = () => {
    const now = new Date();
    const formatForInput = (date) => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date - offset).toISOString().slice(0, 16);
    };

    setForm({
      name: 'Test Shipment: MUM to NY #001',
      bidStartDate: formatForInput(new Date(now.getTime() + 1 * 60000)), // +1 min
      bidCloseDate: formatForInput(new Date(now.getTime() + 15 * 60000)), // +15 min
      forcedBidCloseDate: formatForInput(new Date(now.getTime() + 45 * 60000)), // +45 min
      pickupDate: formatForInput(new Date(now.getTime() + 48 * 3600000)), // +2 days
      triggerWindowMinutes: 10,
      extensionDurationMinutes: 5,
      extensionTriggerType: 'ANY_BID',
    });
    setError('');
  };

  const validate = () => {
    if (!form.name.trim()) return 'RFQ Name is required.';
    if (!form.bidStartDate) return 'Bid Start Date is required.';
    if (!form.bidCloseDate) return 'Bid Close Date is required.';
    if (!form.forcedBidCloseDate) return 'Forced Bid Close Date is required.';
    if (new Date(form.forcedBidCloseDate) <= new Date(form.bidCloseDate)) {
      return 'Forced Bid Close Time must be later than Bid Close Time.';
    }
    if (new Date(form.bidStartDate) >= new Date(form.bidCloseDate)) {
      return 'Bid Start Date must be before Bid Close Date.';
    }
    if (form.triggerWindowMinutes < 1) return 'Trigger Window must be at least 1 minute.';
    if (form.extensionDurationMinutes < 1) return 'Extension Duration must be at least 1 minute.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        bidStartDate: new Date(form.bidStartDate).toISOString(),
        bidCloseDate: new Date(form.bidCloseDate).toISOString(),
        forcedBidCloseDate: new Date(form.forcedBidCloseDate).toISOString(),
        pickupDate: form.pickupDate ? new Date(form.pickupDate).toISOString() : null,
        triggerWindowMinutes: parseInt(form.triggerWindowMinutes),
        extensionDurationMinutes: parseInt(form.extensionDurationMinutes),
      };
      const result = await api.createRfq(payload);
      navigate(`/rfq/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="page-heading">
        <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ChevronLeft size={16} /> Back to Auctions
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1>Launch New Auction</h1>
            <p>Configure your RFQ with smart auction rules and extension triggers.</p>
          </div>
          <button type="button" onClick={fillExampleData} className="btn btn-ghost btn-sm" style={{ border: '1px dashed var(--color-border)', color: 'var(--color-accent)' }}>
            ✨ Fill Example Data
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Core Details */}
        <div className="glass-card" style={{ marginBottom: 'var(--gap-lg)' }}>
          <div className="field-section-label">Auction Details</div>
          <div className="field-grid">
            <div className="field-group" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">RFQ Name / Reference</label>
              <input
                className="field-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Freight Route #MUM-DEL-2026"
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label">Bid Start Date & Time</label>
              <input
                className="field-input"
                type="datetime-local"
                name="bidStartDate"
                value={form.bidStartDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label">Bid Close Date & Time</label>
              <input
                className="field-input"
                type="datetime-local"
                name="bidCloseDate"
                value={form.bidCloseDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label">Forced Bid Close Date & Time</label>
              <input
                className="field-input"
                type="datetime-local"
                name="forcedBidCloseDate"
                value={form.forcedBidCloseDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label">Pickup / Service Date</label>
              <input
                className="field-input"
                type="datetime-local"
                name="pickupDate"
                value={form.pickupDate}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Auction Mechanics */}
        <div className="glass-card" style={{ marginBottom: 'var(--gap-lg)' }}>
          <div className="field-section-label">
            <Zap size={14} style={{ marginRight: 4 }} /> Auction Extension Rules
          </div>
          <div className="field-grid">
            <div className="field-group">
              <label className="field-label">Trigger Window (X Minutes)</label>
              <input
                className="field-input"
                type="number"
                name="triggerWindowMinutes"
                value={form.triggerWindowMinutes}
                onChange={handleChange}
                min={1}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                How many minutes before close the system watches for activity.
              </span>
            </div>
            <div className="field-group">
              <label className="field-label">Extension Duration (Y Minutes)</label>
              <input
                className="field-input"
                type="number"
                name="extensionDurationMinutes"
                value={form.extensionDurationMinutes}
                onChange={handleChange}
                min={1}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Additional time appended when the trigger condition fires.
              </span>
            </div>
          </div>
          <div className="field-group" style={{ marginTop: 'var(--gap-md)' }}>
            <label className="field-label">Extension Trigger Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)', marginTop: 'var(--gap-sm)' }}>
              {TRIGGER_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`trigger-option${form.extensionTriggerType === opt.value ? ' selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="extensionTriggerType"
                    value={opt.value}
                    checked={form.extensionTriggerType === opt.value}
                    onChange={handleChange}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{opt.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="alert-box alert-box-error" style={{ marginBottom: 'var(--gap-md)' }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'Creating Auction…' : 'Launch Auction'}
        </button>
      </form>
    </div>
  );
}

export default CreateRfqPage;
