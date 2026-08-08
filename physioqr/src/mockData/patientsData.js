/**
 * Mock Patient Records (SRS Section 10 & 20)
 */

export const MOCK_PATIENTS = [
  {
    id: "PAT-1001",
    name: "Ramesh Gupta",
    mobile: "+91 99887 76655",
    age: 45,
    gender: "Male",
    referringDoctorId: "DR001",
    referringDoctorName: "Dr. Rajesh Sharma",
    painCategory: "Lower Back Pain",
    assignedProgramId: "PROG-101",
    paymentStatus: "Paid", // Paid, Pending, Refunded
    paidAmount: 500,
    currentDay: 2,
    completedDays: [1],
    exercisesCompletedCount: 2,
    hasRedFlag: false,
    registrationDate: "2026-08-02"
  },
  {
    id: "PAT-1002",
    name: "Sunita Kapoor",
    mobile: "+91 98112 23344",
    age: 52,
    gender: "Female",
    referringDoctorId: "DR002",
    referringDoctorName: "Dr. Priya Patel",
    painCategory: "Knee Pain",
    assignedProgramId: "PROG-102",
    paymentStatus: "Paid",
    paidAmount: 200, // Platform Fee Model
    currentDay: 1,
    completedDays: [],
    exercisesCompletedCount: 0,
    hasRedFlag: false,
    registrationDate: "2026-08-05"
  },
  {
    id: "PAT-1003",
    name: "Vikram Malhotra",
    mobile: "+91 97766 55443",
    age: 38,
    gender: "Male",
    referringDoctorId: "DR001",
    referringDoctorName: "Dr. Rajesh Sharma",
    painCategory: "Lower Back Pain",
    assignedProgramId: "PROG-101",
    paymentStatus: "Pending", // Flagged red flag in assessment
    paidAmount: 0,
    currentDay: 1,
    completedDays: [],
    exercisesCompletedCount: 0,
    hasRedFlag: true,
    redFlagReason: "Reported sudden severe numbness and pain scale 9/10",
    registrationDate: "2026-08-06"
  }
];
