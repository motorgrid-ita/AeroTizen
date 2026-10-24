const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const manifest = require('./integration_integrity.json');
test('combined QA preserves all 18 V992.56 image bytes and the official Frame service and manifest', () => {
  assert.equal(Object.keys(manifest).length, 21);
  for (const [file, sha256] of Object.entries(manifest)) {
    const bytes = fs.readFileSync(path.join(__dirname, '..', file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), sha256, file);
  }
});
