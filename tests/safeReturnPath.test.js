import assert from 'node:assert/strict';
import test from 'node:test';
import { safeReturnPath } from '../src/utils/safeReturnPath.js';

test('preserves document, version, and fragment after login', () => {
  assert.equal(safeReturnPath('/documents/7?version=2#content'), '/documents/7?version=2#content');
  assert.equal(safeReturnPath('/documents/7/compare?from=1&to=2'), '/documents/7/compare?from=1&to=2');
  assert.equal(safeReturnPath('/?q=%ED%95%9C%EA%B8%80'), '/?q=%ED%95%9C%EA%B8%80');
});
test('rejects external, encoded, malformed and authentication-loop targets', () => {
  for (const value of [undefined, null, 3, '', 'https://example.com', '//example.com',
    '/\\example.com', '/%5cexample.com', '/%255cexample.com', '/%2fexample.com',
    '/a\n/b', '/%0aexample.com', '/%E0%A4%A', '/login', '/signup?next=/',
    '/a/../login', '/%6cogin', '/a/..//example.com', 'javascript:alert(1)']) {
    assert.equal(safeReturnPath(value), '/', String(value));
  }
});
