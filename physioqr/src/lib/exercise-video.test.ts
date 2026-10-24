import { describe, expect, it } from 'vitest';
import { extractYouTubeVideoId, getExerciseYouTubeId, getVideoAvailabilityMessage } from './exercise-video';

describe('patient exercise video playback', () => {
  it('supports common YouTube video URL formats and query parameter ordering', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?feature=shared&v=ABCDEFGHIJK')).toBe('ABCDEFGHIJK');
    expect(extractYouTubeVideoId('https://m.youtube.com/watch?v=ABCDEFGHIJK&t=20s')).toBe('ABCDEFGHIJK');
    expect(extractYouTubeVideoId('https://youtu.be/ABCDEFGHIJK?si=copy')).toBe('ABCDEFGHIJK');
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/ABCDEFGHIJK')).toBe('ABCDEFGHIJK');
    expect(extractYouTubeVideoId('https://www.youtube.com/live/ABCDEFGHIJK')).toBe('ABCDEFGHIJK');
  });

  it('rejects unsafe links and mismatched video IDs', () => {
    expect(extractYouTubeVideoId('https://youtube.com.evil.example/watch?v=ABCDEFGHIJK')).toBe('');
    expect(extractYouTubeVideoId('javascript:alert(1)')).toBe('');
    expect(getExerciseYouTubeId({ youtubeVideoId: 'ABCDEFGHIJK', videoUrl: 'https://youtu.be/ABCDEFGHIJL' })).toBe('');
    expect(getExerciseYouTubeId({ videoUrl: 'https://youtu.be/ABCDEFGHIJK' })).toBe('ABCDEFGHIJK');
  });

  it('cannot reopen links removed from demo exercises in patient responses', () => {
    expect(getExerciseYouTubeId({ videoUrl: '', youtubeVideoId: '' })).toBe('');
    expect(getVideoAvailabilityMessage({ total: 3, ready: 0, awaitingClinicalReview: 3 })).toMatch(/awaiting clinical review/i);
    expect(getVideoAvailabilityMessage({ total: 3, ready: 3 })).toBe('');
    expect(getVideoAvailabilityMessage({ total: 3, demoOnly: 3 })).toMatch(/testing\/demo/i);
  });
});
