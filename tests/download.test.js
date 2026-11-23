import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadName } from '../src/utils/download.js';

test('download name preserves Korean but strips paths and control characters', () => {
  assert.equal(downloadName('한글 문서.pdf'), '한글 문서.pdf');
  assert.equal(downloadName('C:\\fakepath\\한글.pdf'), '한글.pdf');
  assert.equal(downloadName('../a\r\nb.txt'), 'a__b.txt');
  assert.equal(downloadName('..'), 'download');
});
