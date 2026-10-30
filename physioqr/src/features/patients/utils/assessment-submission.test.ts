import { describe, expect, it } from 'vitest';
import { getAssessmentSubmissionNotice } from './assessment-submission';

describe('assessment submission acknowledgement', () => {
  it('confirms that routine clearances need no individual Admin approval', () => {
    const notice = getAssessmentSubmissionNotice('cleared');
    expect(notice.title).toContain('submitted successfully');
    expect(notice.description).toContain('No individual Admin approval');
  });

  it('confirms post-operative and red-flag submissions without misrepresenting medical clearance', () => {
    const notice = getAssessmentSubmissionNotice('pending_review');
    expect(notice.title).toContain('submitted successfully');
    expect(notice.description).toContain('clinical safety review');
    expect(notice.description).toContain('before rehabilitation');
    expect(notice.description).not.toContain('automatically cleared');
  });

  it('keeps blocked medical assessments distinct from form rejection', () => {
    const notice = getAssessmentSubmissionNotice('blocked');
    expect(notice.title).toContain('submitted successfully');
    expect(notice.description).toContain('cannot begin');
  });

  it('never invents a clearance outcome from a missing or historical status', () => {
    const notice = getAssessmentSubmissionNotice('completed');
    expect(notice.title).toContain('submitted successfully');
    expect(notice.description).toContain('eligibility will be confirmed');
  });
});
