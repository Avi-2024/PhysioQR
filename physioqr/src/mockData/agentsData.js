/**
 * Mock Field Agents Data (SRS Section 4)
 */

export const MOCK_AGENTS = [
  {
    id: "AGT-001",
    name: "Amit Kumar",
    mobile: "+91 98765 43210",
    city: "Mumbai",
    region: "West Zone",
    status: "Active",
    doctorsRegistered: 5,
    doctorsApproved: 4,
    monthlyTarget: 10,
    targetAchievementPercent: 50,
    clinicVisits: [
      {
        id: "VIS-101",
        doctorName: "Dr. Rajesh Sharma",
        clinicName: "City Spine & Joint Clinic",
        visitDate: "2026-08-01",
        outcome: "Doctor Registered",
        notes: "Dr. Sharma was enthusiastic about QR based patient tracking."
      },
      {
        id: "VIS-102",
        doctorName: "Dr. Vikram Sethi",
        clinicName: "Sethi Sports Med Clinic",
        visitDate: "2026-08-04",
        outcome: "Follow-up required",
        notes: "Needs verification documents for clinic license."
      }
    ]
  },
  {
    id: "AGT-002",
    name: "Suresh Verma",
    mobile: "+91 91234 56789",
    city: "Ahmedabad",
    region: "Gujarat Zone",
    status: "Active",
    doctorsRegistered: 4,
    doctorsApproved: 3,
    monthlyTarget: 8,
    targetAchievementPercent: 50,
    clinicVisits: []
  }
];
