/** Executor-boundary contract tests: the automation prompt message's declared
 * source (dsh 0.1.7 message-source and `notice`-summary rules) and the
 * unattended capability allowlist.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  automationNoticeSource,
  boundContextSummary,
  CONTEXT_SUMMARY_MAX_CHARS,
  unattendedToolGuardReason,
} from '../src/executor.ts'

const definition = { id: 'kauto-1', name: '巡检' }
const run = { id: 'krun-de933d38-2a2e-4d50-8e27-9eb47e486e69', scheduledFor: '2026-09-26T04:56:13.860Z', trigger: 'manual' }

test('the automation prompt declares its own source kind and the notice form', () => {
  const source = automationNoticeSource(definition, run)
  // dsh 0.1.7 dropped the shared `{kind:'plugin', plugin}` catch-all: a producer
  // declares its own kind, and a `notice` must carry its one-line account.
  assert.equal(source.kind, 'automation')
  assert.equal(source.form, 'notice')
  assert.equal(source.automationId, 'kauto-1')
  assert.equal(source.runId, run.id)
  assert.equal(source.trigger, 'manual')
  assert.equal(source.scheduledFor, run.scheduledFor)
  assert.match(source.summary, /巡检/)
  assert.match(source.summary, new RegExp(run.id))
})

test('the notice summary stays inside the framework bound', () => {
  assert.equal(boundContextSummary('short'), 'short')
  const long = boundContextSummary('x'.repeat(CONTEXT_SUMMARY_MAX_CHARS + 40))
  assert.equal(long.length, CONTEXT_SUMMARY_MAX_CHARS)
  assert.ok(long.endsWith('…'))

  // A pathological definition name must not evict the run identity a reader
  // needs verbatim, and must never exceed the documented width.
  const source = automationNoticeSource({ id: 'kauto-2', name: '名'.repeat(400) }, run)
  assert.ok(source.summary.length <= CONTEXT_SUMMARY_MAX_CHARS)
  assert.match(source.summary, new RegExp(run.id))
  assert.ok(source.summary.endsWith(run.id))

  // A nameless definition still identifies itself by id.
  const unnamed = automationNoticeSource({ id: 'kauto-3', name: '   ' }, run)
  assert.match(unnamed.summary, /kauto-3/)
})

test('the unattended allowlist denies interactive and recursive capability', () => {
  assert.equal(unattendedToolGuardReason('bash', { command: 'ls' }), undefined)
  assert.equal(unattendedToolGuardReason('read', { file_path: '/x' }), undefined)
  assert.match(String(unattendedToolGuardReason('bash', { command: 'x', run_in_background: true })), /background/)
  assert.match(String(unattendedToolGuardReason('automation_create', {})), /recursive automation/)
  assert.match(String(unattendedToolGuardReason('subagent', {})), /allowlist/)
})
