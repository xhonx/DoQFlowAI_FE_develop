import assert from 'node:assert/strict';
import test from 'node:test';
import { createVulnFlagReader } from '../src/utils/labFlags.js';

test('only explicit lab mode can enable a flag', () => {
  for (const mode of ['development', 'production', 'test']) {
    assert.equal(createVulnFlagReader(mode, '1-1')('1-1'), false);
  }
  assert.equal(createVulnFlagReader('lab')('1-1'), false);
});
test('parses only selected IDs and rejects unsupported ones', () => {
  const enabled = createVulnFlagReader('lab', ' 1-1, 2-2,1-1, ');
  assert.equal(enabled('1-1'), true);
  assert.equal(enabled('2-2'), true);
  assert.equal(enabled('3-4'), false);
  assert.throws(() => createVulnFlagReader('lab', '1-6'));
});
