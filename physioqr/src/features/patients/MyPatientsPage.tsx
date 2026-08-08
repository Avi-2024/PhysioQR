import React, { useState } from 'react';
import { Search, X, Eye, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { MOCK_REFERRAL_PATIENTS } from '../../mocks/mockDoctorData';
import { ReferralPatient } from '../../types/doctor.types';
import { formatCurrency, formatDate } from '../../lib/formatters';

export function MyPatientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPain, setSelectedPain] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<ReferralPatient | null>(null);

  const filteredPatients = MOCK_REFERRAL_PATIENTS.filter((pat) => {
    const matchesSearch = pat.name.toLowerCase().includes(searchTerm.toLowerCase()) || pat.mobileMasked.includes(searchTerm);
    const matchesPain = selectedPain === 'all' || pat.painCategory.includes(selectedPain);
    const matchesPayment = selectedPayment === 'all' || pat.paymentStatus === selectedPayment;
    return matchesSearch && matchesPain && matchesPayment;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 13.1 Patient List Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#17212B' }}>My Referred Patients</h2>
          <p style={{ fontSize: '13.5px', color: '#5D6975', marginTop: '2px' }}>
            {filteredPatients.length} total referrals registered via your QR code
          </p>
        </div>

        <button className="btn-outline" onClick={() => alert('Exporting patient list to CSV...')}>
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Export CSV
        </button>
      </div>

      {/* 13.2 Search and Filters */}
      <div className="card-section" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '12px', color: '#84909C' }} />
            <input
              type="text"
              placeholder="Search by patient name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13.5px', outline: 'none' }}
            />
          </div>

          <select
            value={selectedPain}
            onChange={(e) => setSelectedPain(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF' }}
          >
            <option value="all">All Pain Categories</option>
            <option value="Knee">Knee Pain</option>
            <option value="Lower Back">Lower Back Pain</option>
            <option value="Neck">Neck & Shoulder</option>
          </select>

          <select
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF' }}
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>

          {(searchTerm || selectedPain !== 'all' || selectedPayment !== 'all') && (
            <button
              className="btn-outline"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => {
                setSearchTerm('');
                setSelectedPain('all');
                setSelectedPayment('all');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* 13.3 Patient Table */}
      <div className="card-section" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Registration Date</th>
              <th>Pain Category</th>
              <th>Assigned Program</th>
              <th>Program Progress</th>
              <th>Payment</th>
              <th>Doctor Commission</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#84909C' }}>
                  No patients match your selected search or filter criteria.
                </td>
              </tr>
            ) : (
              filteredPatients.map((pat) => (
                <tr key={pat.id}>
                  <td>
                    <strong>{pat.name}</strong>
                    <div style={{ fontSize: '11px', color: '#84909C' }}>{pat.mobileMasked}</div>
                  </td>
                  <td>{formatDate(pat.registrationDate)}</td>
                  <td>{pat.painCategory}</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pat.programName}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: '#E2E8ED', borderRadius: '4px', overflow: 'hidden', minWidth: '60px' }}>
                        <div style={{ width: `${pat.programProgress}%`, height: '100%', background: pat.programProgress === 100 ? '#0E8345' : '#14756E' }}></div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>{pat.programProgress}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge-status ${pat.paymentStatus}`}>
                      {pat.paymentStatus.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <strong>{formatCurrency(pat.commissionAmount)}</strong>
                    <div style={{ fontSize: '11px', color: '#84909C' }}>{pat.commissionStatus}</div>
                  </td>
                  <td>
                    <button className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setSelectedPatient(pat)}>
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 13.4 Patient Detail Drawer */}
      {selectedPatient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#FFFFFF', height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8ED', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#17212B' }}>{selectedPatient.name}</h3>
                <span style={{ fontSize: '12px', color: '#5D6975' }}>Referral ID: {selectedPatient.id}</span>
              </div>
              <button className="icon-btn-badge" onClick={() => setSelectedPatient(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '13.5px' }}>
              <div style={{ background: '#F6F8FA', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5D6975' }}>Mobile:</span><strong>{selectedPatient.mobileMasked}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5D6975' }}>Registration Date:</span><strong>{formatDate(selectedPatient.registrationDate)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5D6975' }}>Pain Category:</span><strong>{selectedPatient.painCategory}</strong></div>
              </div>

              <div style={{ background: '#F6F8FA', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F5F5A' }}>Assigned Rehabilitation Program</h4>
                <div><strong>{selectedPatient.programName}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ color: '#5D6975' }}>Status:</span>
                  <span className={`badge-status ${selectedPatient.programStatus}`}>{selectedPatient.programStatus.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5D6975' }}>Progress:</span>
                  <strong>{selectedPatient.programProgress}% Completed</strong>
                </div>
              </div>

              <div style={{ background: '#F1FAF8', border: '1px solid #DDF3F0', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F5F5A' }}>Financial & Commission Summary</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5D6975' }}>Patient Paid:</span><strong>{formatCurrency(selectedPatient.paymentAmount)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5D6975' }}>Doctor Commission (60%):</span><strong style={{ color: '#0F5F5A', fontSize: '15px' }}>{formatCurrency(selectedPatient.commissionAmount)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5D6975' }}>Commission Status:</span><span className={`badge-status ${selectedPatient.commissionStatus}`}>{selectedPatient.commissionStatus.toUpperCase()}</span></div>
                {selectedPatient.releaseDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#5D6975' }}>Holding Period Release:</span><strong>{formatDate(selectedPatient.releaseDate)}</strong></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
