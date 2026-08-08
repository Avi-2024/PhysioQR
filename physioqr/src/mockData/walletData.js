/**
 * Mock Doctor Wallet Transactions & Payout Requests (SRS Section 31 & 32)
 */

export const MOCK_WALLET_LEDGER = [
  {
    id: "TXN-801",
    doctorId: "DR001",
    doctorName: "Dr. Rajesh Sharma",
    patientId: "PAT-1001",
    patientName: "Ramesh Gupta",
    type: "CREDIT_HOLDING",
    amount: 300,
    status: "Pending Holding Period (15 days)",
    date: "2026-08-02",
    description: "Rehabilitation Programme Fee Share (60% of ₹500)"
  },
  {
    id: "TXN-799",
    doctorId: "DR001",
    doctorName: "Dr. Rajesh Sharma",
    patientId: "PAT-0980",
    patientName: "Aakash Mehta",
    type: "CREDIT_RELEASED",
    amount: 300,
    status: "Available for Withdrawal",
    date: "2026-07-15",
    description: "Holding period completed. Funds released to available wallet."
  }
];

export const MOCK_PAYOUT_REQUESTS = [
  {
    id: "PO-301",
    doctorId: "DR001",
    doctorName: "Dr. Rajesh Sharma",
    requestedAmount: 1500,
    bankName: "HDFC Bank",
    accountNumberMasked: "XXXXXX4829",
    requestDate: "2026-07-28",
    status: "Paid", // Requested, Under Review, Approved, Paid, Rejected
    processedDate: "2026-07-30",
    transactionRef: "UTR982347102938"
  },
  {
    id: "PO-302",
    doctorId: "DR001",
    doctorName: "Dr. Rajesh Sharma",
    requestedAmount: 1000,
    bankName: "HDFC Bank",
    accountNumberMasked: "XXXXXX4829",
    requestDate: "2026-08-05",
    status: "Under Review",
    processedDate: null,
    transactionRef: null
  }
];
