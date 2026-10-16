// The backend returns { message: 'Validation failed', errors: [{source,field,message}] }.
// Display actionable fields instead of discarding that structured response.
type ValidationIssue = { source?: string; field?: string; message?: string };
type ResponseError = { response?: { data?: { message?: string; errors?: ValidationIssue[] } } };

const fieldNames: Record<string, string> = {
  name: 'Exercise name',
  painCategory: 'Body region / pain category',
  videoUrl: 'YouTube URL',
  sets: 'Sets',
  repetitions: 'Repetitions',
  dayNumber: 'Day number',
  title: 'Day title',
  exercises: 'Exercises',
  id: 'Programme ID',
  dayId: 'Programme day ID',
};

export function formatApiValidationError(error: unknown, fallback: string): string {
  const data = (error as ResponseError | null)?.response?.data;
  const issues = Array.isArray(data?.errors) ? data.errors : [];
  const descriptions = issues
    .filter((item) => item && typeof item.message === 'string' && typeof item.field === 'string')
    .map((item) => `${fieldNames[item.field!] || item.field}: ${item.message}`);
  if (descriptions.length) return descriptions.join('; ');
  return typeof data?.message === 'string' && data.message.trim()
    ? data.message : fallback;
}
