import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import { PianoAudio } from '../src/music/playback';
test('studio renders the demo, transport, inspector and full 61-note keyboard', () => {
  const html = renderToStaticMarkup(React.createElement(App));
  assert.match(html, /Goodness of God/);
  assert.match(html, /Chord inspector/);
  assert.match(html, /Play progression/);
  assert.equal((html.match(/class="piano-key /g) || []).length, 61);
  assert.match(html, /aria-label="C2/);
  assert.match(html, /aria-label="C7/);
  assert.match(html, /I love You Lord/);
});
test('stop cancels an audio preview awaiting browser context resume', async () => {
  let resume: () => void = () => {};
  let oscillatorCount = 0;
  const parameter = {
    value: 0,
    setTargetAtTime() {},
    cancelScheduledValues() {},
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
  const node = () => ({
    connect() {},
    disconnect() {},
    gain: { ...parameter },
    threshold: { ...parameter },
    ratio: { ...parameter },
    delayTime: { ...parameter },
  });
  class FakeAudioContext {
    currentTime = 0;
    destination = {};
    createGain = node;
    createDynamicsCompressor = node;
    createDelay = node;
    resume() {
      return new Promise<void>((r) => {
        resume = r;
      });
    }
    createOscillator() {
      oscillatorCount++;
      return { frequency: { ...parameter }, connect() {}, disconnect() {}, start() {}, stop() {} };
    }
  }
  const old = globalThis.AudioContext;
  Object.defineProperty(globalThis, 'AudioContext', {
    value: FakeAudioContext,
    writable: true,
    configurable: true,
  });
  try {
    const audio = new PianoAudio();
    const pending = audio.play([60, 64, 67]);
    audio.stop();
    resume();
    await pending;
    assert.equal(oscillatorCount, 0);
  } finally {
    Object.defineProperty(globalThis, 'AudioContext', {
      value: old,
      writable: true,
      configurable: true,
    });
  }
});
