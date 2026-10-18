const test = require('node:test');
const assert = require('node:assert/strict');
const { extractYouTubeVideoId, isValidYouTubeVideoUrl } = require('../src/utils/youtubeVideoUrl');
const { validateSchema } = require('../src/middlewares/validate.middleware');

const videoLinks = [
  ['https://youtu.be/ml6cT4AZdqI?si=0VwhyxF63Vulcq5Z', 'ml6cT4AZdqI'],
  ['https://www.youtube.com/watch?v=ml6cT4AZdqI&si=abc', 'ml6cT4AZdqI'],
  ['https://youtube.com/watch?si=abc&v=ml6cT4AZdqI', 'ml6cT4AZdqI'],
  ['https://m.youtube.com/watch?v=ml6cT4AZdqI', 'ml6cT4AZdqI'],
  ['https://www.youtube.com/shorts/ml6cT4AZdqI?feature=share', 'ml6cT4AZdqI'],
  ['https://www.youtube.com/embed/ml6cT4AZdqI', 'ml6cT4AZdqI'],
  ['https://www.youtube.com/live/ml6cT4AZdqI?t=10', 'ml6cT4AZdqI'],
];

test('YouTube share links and normal player formats use one consistent parser', () => {
  for (const [url, id] of videoLinks) {
    assert.equal(extractYouTubeVideoId(url), id, url);
    assert.equal(isValidYouTubeVideoUrl(url), true, url);
  }
});

test('reject fake YouTube domains and malformed video IDs', () => {
  for (const url of [
    'https://fake-youtube.com/watch?v=ml6cT4AZdqI',
    'https://youtube.com.evil.org/watch?v=ml6cT4AZdqI',
    'https://youtu.be/bad',
    'javascript:alert(1)',
    'https://example.com/knee-stretch',
    'not a url',
  ]) assert.equal(isValidYouTubeVideoUrl(url), false, url);
});

async function validate(body) {
  const req = { body, params: {}, query: {} };
  let status = 200;
  let response;
  let nextCalled = false;
  const res = {
    status(value) { status = value; return this; },
    json(value) { response = value; return this; },
  };
  await validateSchema({ body: {
    name: { type: 'string', required: true, min: 2, max: 150 },
    videoUrl: { type: 'youtubeUrl' },
    sets: { type: 'number', min: 0, max: 100 },
  } })(req, res, () => { nextCalled = true; });
  return { status, response, nextCalled, body: req.body };
}

test('new exercise can save without video, or with a shared YouTube link', async () => {
  const blank = await validate({ name: 'Single Knee to Chest', videoUrl: '', sets: 2 });
  assert.equal(blank.nextCalled, true);
  assert.equal(blank.status, 200);
  const shared = await validate({ name: 'Single Knee to Chest',
    videoUrl: 'https://youtu.be/ml6cT4AZdqI?si=0VwhyxF63Vulcq5Z',
  });
  assert.equal(shared.nextCalled, true);
  assert.equal(shared.status, 200);
});

test('invalid URL response includes exact field and message for frontend', async () => {
  const invalid = await validate({ name: 'Single Knee to Chest',
    videoUrl: 'https://youtu.be/incorrect',
  });
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalid.status, 400);
  assert.equal(invalid.response.message, 'Validation failed');
  assert.equal(invalid.response.errors[0].field, 'videoUrl');
  assert.match(invalid.response.errors[0].message, /YouTube/);
});
