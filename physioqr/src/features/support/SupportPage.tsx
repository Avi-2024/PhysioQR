import React, { useState } from 'react';
import { LifeBuoy, Plus, MessageSquare } from 'lucide-react';
import { MOCK_SUPPORT_TICKETS } from '../../mocks/mockDoctorData';

export function SupportPage() {
  const [tickets, setTickets] = useState(MOCK_SUPPORT_TICKETS);
  const [showNewModal, setShowNewModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newTck = {
      id: `TCK-${Date.now().toString().slice(-3)}`,
      category: 'General Inquiry',
      subject,
      description,
      status: 'open' as const,
      createdDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setTickets([newTck, ...tickets]);
    setShowNewModal(false);
    setSubject('');
    setDescription('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#17212B' }}>Doctor Help & Support Center</h2>
          <p style={{ fontSize: '13.5px', color: '#5D6975', marginTop: '2px' }}>
            Submit tickets or contact physioqr clinic support for QR standees, payouts, or technical queries
          </p>
        </div>

        <button className="btn-primary-teal" onClick={() => setShowNewModal(true)}>
          <Plus className="w-4 h-4" /> Create Support Ticket
        </button>
      </div>

      <div className="card-section" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8ED' }}>
          <h3 className="section-card-title">My Support Tickets</h3>
        </div>

        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Category</th>
              <th>Subject</th>
              <th>Created Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((tck) => (
              <tr key={tck.id}>
                <td><strong>{tck.id}</strong></td>
                <td>{tck.category}</td>
                <td>{tck.subject}</td>
                <td>{tck.createdDate}</td>
                <td>
                  <span className={`badge-status ${tck.status === 'open' ? 'pending' : 'verified'}`}>
                    {tck.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#17212B' }}>Create Support Ticket</h3>
            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '4px' }}>Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Request extra clinic desk QR standee"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '4px' }}>Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide details about your query..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', outline: 'none' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn-outline" onClick={() => setShowNewModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-teal">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
