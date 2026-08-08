/**
 * Mock Doctors Data (SRS Section 5 & 22)
 * Includes Split Model and Platform Fee Model examples
 */

export const MOCK_DOCTORS = [
  {
    id: "DR001",
    name: "Dr. Rajesh Sharma",
    qualification: "MBBS, MS (Orthopedics)",
    specialization: "Orthopedic Specialist",
    clinicName: "City Spine & Joint Clinic",
    city: "Mumbai",
    agentId: "AGT-001",
    agentName: "Amit Kumar",
    status: "Approved", // Approved, Pending, Suspended
    qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://physioqr.in/register?doctor=DR001",
    referralLink: "https://physioqr.in/register?doctor=DR001",
    
    // Revenue Model (SRS Section 22.1 - Split Model)
    pricingModel: "SPLIT",
    patientFee: 500,               // Patient pays 500 total through app
    doctorSharePercentage: 60,     // Doctor gets 60% (300 INR), Platform gets 40% (200 INR)
    holdingPeriodDays: 15,

    // Wallet & Earnings
    totalReferredPatients: 12,
    totalPaidPatients: 10,
    wallet: {
      pendingShare: 600,     // In holding period
      availableShare: 2400,  // Ready for withdrawal
      withdrawnTotal: 1500,
      totalEarned: 4500,
    },
    bankDetails: {
      accountHolder: "Rajesh Sharma",
      accountNumber: "XXXXXX4829",
      bankName: "HDFC Bank",
      ifsc: "HDFC0001234",
      kycVerified: true,
    }
  },
  {
    id: "DR002",
    name: "Dr. Priya Patel",
    qualification: "BPT, MPT (Musculoskeletal)",
    specialization: "Senior Physiotherapist",
    clinicName: "Patel Physio Center",
    city: "Ahmedabad",
    agentId: "AGT-002",
    agentName: "Suresh Verma",
    status: "Approved",
    qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://physioqr.in/register?doctor=DR002",
    referralLink: "https://physioqr.in/register?doctor=DR002",
    
    // Revenue Model (SRS Section 22.2 - Platform Fee Model)
    pricingModel: "PLATFORM_FEE",
    doctorClinicFee: 400,          // Collected in-person by doctor
    platformFee: 200,              // Patient pays 200 online to PhysioQR
    doctorSharePercentage: 0,      // Doctor doesn't receive share from the online platform fee
    holdingPeriodDays: 15,

    wallet: {
      pendingShare: 0,
      availableShare: 0,
      withdrawnTotal: 0,
      totalEarned: 0,
    },
    totalReferredPatients: 8,
    totalPaidPatients: 6,
    bankDetails: {
      accountHolder: "Priya Patel",
      accountNumber: "XXXXXX9012",
      bankName: "ICICI Bank",
      ifsc: "ICIC0005678",
      kycVerified: true,
    }
  },
  {
    id: "DR003",
    name: "Dr. Vikram Sethi",
    qualification: "MBBS, DNB (Sports Medicine)",
    specialization: "Sports Injury Specialist",
    clinicName: "Sethi Sports Med Clinic",
    city: "Delhi",
    agentId: "AGT-001",
    agentName: "Amit Kumar",
    status: "Pending", // Awaiting Admin verification
    qrCodeUrl: "",
    referralLink: "",
    pricingModel: "SPLIT",
    patientFee: 700,
    doctorSharePercentage: 65,
    holdingPeriodDays: 15,
    wallet: { pendingShare: 0, availableShare: 0, withdrawnTotal: 0, totalEarned: 0 },
    totalReferredPatients: 0,
    totalPaidPatients: 0,
    bankDetails: { kycVerified: false }
  }
];
