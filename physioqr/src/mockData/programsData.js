/**
 * Mock Rehabilitation Programs & Day-Wise Videos (SRS Section 16 & 17 & 18)
 */

export const PAIN_CATEGORIES = [
  { id: "cat-1", name: "Lower Back Pain", description: "Lumbar spine relief & core stabilization" },
  { id: "cat-2", name: "Knee Pain", description: "Quadriceps strengthening & joint mobility" },
  { id: "cat-3", name: "Neck & Shoulder Pain", description: "Cervical mobility & posture correction" },
  { id: "cat-4", name: "Ankle & Foot Mobility", description: "Achilles tendon stretching & plantar care" }
];

export const MOCK_PROGRAMS = [
  {
    id: "PROG-101",
    categoryId: "cat-1",
    title: "14-Day Lower Back Recovery Program",
    difficulty: "Beginner",
    durationDays: 14,
    defaultPrice: 500,
    description: "Designed by Senior Physiotherapists to reduce stiffness and rebuild lumbar stability.",
    days: [
      {
        dayNumber: 1,
        title: "Day 1: Gentle Lumbar Mobility & Pelvic Tilts",
        videos: [
          {
            id: "vid-1",
            title: "Introduction & Warm-up Exercises",
            youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            youtubeId: "dQw4w9WgXcQ",
            duration: "04:15",
            sets: "2 sets x 10 reps",
            rest: "30s rest"
          },
          {
            id: "vid-2",
            title: "Cat-Cow Stretch & Supine Knee-to-Chest",
            youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            youtubeId: "dQw4w9WgXcQ",
            duration: "06:30",
            sets: "3 sets x 12 reps",
            rest: "45s rest"
          }
        ]
      },
      {
        dayNumber: 2,
        title: "Day 2: Glute Activation & Bird-Dog Hold",
        videos: [
          {
            id: "vid-3",
            title: "Glute Bridges & Isometric Hold",
            youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            youtubeId: "dQw4w9WgXcQ",
            duration: "05:00",
            sets: "3 sets x 10 reps",
            rest: "30s rest"
          }
        ]
      },
      {
        dayNumber: 3,
        title: "Day 3: Core Decompression & Hamstring Lengthening",
        videos: [
          {
            id: "vid-4",
            title: "Hamstring Doorway Stretch",
            youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            youtubeId: "dQw4w9WgXcQ",
            duration: "05:45",
            sets: "2 sets x 45s hold",
            rest: "30s rest"
          }
        ]
      }
    ]
  },
  {
    id: "PROG-102",
    categoryId: "cat-2",
    title: "14-Day Knee Strengthening & Mobility",
    difficulty: "Intermediate",
    durationDays: 14,
    defaultPrice: 600,
    description: "Targeted quad exercises and VMO strengthening to reduce patellofemoral pain.",
    days: [
      {
        dayNumber: 1,
        title: "Day 1: Quad Sets & Straight Leg Raises",
        videos: [
          {
            id: "vid-5",
            title: "Isometric Quad Sets & Ankle Pumps",
            youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            youtubeId: "dQw4w9WgXcQ",
            duration: "05:10",
            sets: "3 sets x 15 reps",
            rest: "30s rest"
          }
        ]
      }
    ]
  }
];
