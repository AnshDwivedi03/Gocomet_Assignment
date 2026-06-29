const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = {
  // RFQ endpoints
  async createRfq(data) {
    const res = await fetch(`${API_BASE}/rfqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create RFQ');
    return res.json();
  },

  async listRfqs() {
    const res = await fetch(`${API_BASE}/rfqs`);
    if (!res.ok) throw new Error('Failed to fetch RFQs');
    return res.json();
  },

  async getRfqDetails(id) {
    const res = await fetch(`${API_BASE}/rfqs/${id}`);
    if (!res.ok) throw new Error('Failed to fetch RFQ details');
    return res.json();
  },

  async submitBid(rfqId, data) {
    const res = await fetch(`${API_BASE}/rfqs/${rfqId}/bids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit bid');
    return res.json();
  },
};
