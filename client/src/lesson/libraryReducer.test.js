import assert from 'node:assert/strict'
import test from 'node:test'
import { initialLibrary, libraryReducer } from './libraryReducer.js'

function twoLessons() {
  return ['a', 'b'].reduce((state, id) => libraryReducer(state, {
    type: 'lesson_created', id, document: { fileName: `${id}.txt` }, teacherPrompt: 'Teach this.',
  }), initialLibrary)
}

function act(state, id, action) {
  return libraryReducer(state, { type: 'lesson_action', id, action })
}

function openingReply(state, id) {
  const planned = act(state, id, { type: 'plan_ready', plan: { steps: [{ id: 's1' }, { id: 's2' }] } })
  const streaming = act(planned, id, { type: 'tutor_turn_started', id: `${id}-reply`, kind: 'start_step' })
  return act(streaming, id, { type: 'tutor_delta', id: `${id}-reply`, text: `Reply for ${id}` })
}

function finish(state, id, stepComplete = false) {
  return act(state, id, { type: 'tutor_turn_finished', id: `${id}-reply`, meta: { stepComplete, sourceIds: ['p1'] } })
}

test('switching lessons preserves independent drafts, including multiline text', () => {
  let state = act(twoLessons(), 'a', { type: 'draft_changed', text: 'טיוטה\nבשתי שורות' })
  state = act(state, 'b', { type: 'draft_changed', text: 'Another answer' })
  state = libraryReducer(state, { type: 'lesson_opened', id: 'a' })
  assert.equal(state.lessons.a.draft, 'טיוטה\nבשתי שורות')
  assert.equal(state.lessons.b.draft, 'Another answer')
})

test('sending clears only that lesson draft', () => {
  let state = act(twoLessons(), 'a', { type: 'draft_changed', text: 'Answer A' })
  state = act(state, 'b', { type: 'draft_changed', text: 'Keep B' })
  state = act(state, 'a', { type: 'student_message_sent', id: 'student-a', text: 'Answer A' })
  assert.equal(state.lessons.a.draft, '')
  assert.equal(state.lessons.b.draft, 'Keep B')
  assert.equal(state.lessons.a.messages.at(-1).text, 'Answer A')
  assert.equal(state.lessons.b.messages.length, 0)
})

test('background chunks do not mark a reply ready until it finishes', () => {
  let state = openingReply(twoLessons(), 'a')
  assert.equal(state.lessons.a.hasUnreadReply, false)
  state = finish(state, 'a')
  assert.equal(state.lessons.a.hasUnreadReply, true)
  assert.equal(state.lessons.b.hasUnreadReply, false)
})

test('opening a lesson clears only its unread marker without changing its draft', () => {
  let state = finish(openingReply(twoLessons(), 'a'), 'a')
  state = libraryReducer(state, { type: 'lesson_opened', id: null })
  state = finish(openingReply(state, 'b'), 'b')
  state = act(state, 'a', { type: 'draft_changed', text: 'Keep this' })
  state = libraryReducer(state, { type: 'lesson_opened', id: 'a' })
  assert.equal(state.lessons.a.hasUnreadReply, false)
  assert.equal(state.lessons.b.hasUnreadReply, true)
  assert.equal(state.lessons.a.draft, 'Keep this')
})

test('a reply seen in the active lesson is not marked unread', () => {
  const state = finish(openingReply(twoLessons(), 'b'), 'b')
  assert.equal(state.lessons.b.hasUnreadReply, false)
})

test('background step completion advances only its own lesson and keeps the marker', () => {
  let state = openingReply(twoLessons(), 'a')
  state = act(state, 'b', { type: 'plan_ready', plan: { steps: [{ id: 's1' }] } })
  state = finish(state, 'a', true)
  state = act(state, 'a', { type: 'tutor_turn_started', id: 'next-step', kind: 'start_step' })
  assert.equal(state.lessons.a.currentStepIndex, 1)
  assert.equal(state.lessons.a.hasUnreadReply, true)
  assert.equal(state.lessons.b.currentStepIndex, 0)
})

test('late events for a deleted lesson leave other drafts and messages untouched', () => {
  let state = openingReply(twoLessons(), 'a')
  state = act(state, 'b', { type: 'draft_changed', text: 'Keep B' })
  state = libraryReducer(state, { type: 'lesson_deleted', id: 'a' })
  assert.equal(finish(state, 'a'), state)
  assert.equal(state.lessons.b.draft, 'Keep B')
  assert.equal(state.lessons.b.messages.length, 0)
})
