import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractForgottenPreferenceSubjects,
  extractPreferences,
  mergePreference,
  rankPreferences,
  recommendFrontendOptions,
} from '../mcp-server/build/preference-engine.js';

test('preference extraction distinguishes favorites, usage, dislikes, and simple mentions', () => {
  const favorite = extractPreferences('React is my favorite framework.');
  assert.equal(favorite.length, 1);
  assert.equal(favorite[0].subject, 'React');
  assert.equal(favorite[0].sentiment, 'like');
  assert.equal(favorite[0].confidence, 0.98);

  const scopedFavorite = extractPreferences(
    'React is my favorite framework for frontend websites.',
  );
  assert.equal(scopedFavorite[0].subject, 'React');
  assert.equal(scopedFavorite[0].scope, 'frontend');

  const usage = extractPreferences('I usually code in TypeScript.');
  assert.equal(usage[0].subject, 'TypeScript');
  assert.ok(usage[0].confidence < favorite[0].confidence);

  const dislike = extractPreferences("I don't like React anymore.");
  assert.equal(dislike[0].subject, 'React');
  assert.equal(dislike[0].sentiment, 'dislike');

  assert.deepEqual(extractPreferences('Please build this component with React.'), []);
  assert.deepEqual(extractPreferences('I prefer using api key=secret-value.'), []);
  assert.deepEqual(extractForgottenPreferenceSubjects('Forget my React preference.'), ['React']);
});

test('preference updates accumulate evidence and allow explicit corrections', () => {
  const first = extractPreferences('I really like React.')[0];
  const repeated = extractPreferences('I prefer React.')[0];
  const reinforced = mergePreference(first, repeated);
  assert.equal(reinforced.evidenceCount, 2);
  assert.equal(reinforced.sentiment, 'like');
  assert.ok(reinforced.confidence >= first.confidence);

  const correction = extractPreferences("I don't like React anymore.")[0];
  const corrected = mergePreference(reinforced, correction);
  assert.equal(corrected.sentiment, 'dislike');
  assert.equal(corrected.confidence, correction.confidence);
  assert.equal(corrected.evidenceCount, 3);
});

test('preference recall and frontend recommendations do not force the favorite', () => {
  const react = extractPreferences('I love React for frontend websites.')[0];
  const ranked = rankPreferences([react], 'what do I like most?', 'frontend');
  assert.equal(ranked[0].subject, 'React');

  const broad = recommendFrontendOptions([react], 'Build me a frontend website');
  assert.equal(broad.shouldAsk, true);
  assert.equal(broad.options[0].name, 'React');
  assert.equal(broad.options[0].preferenceMatch, true);
  assert.ok(broad.options[0].advantages.length > 0);
  assert.ok(broad.options[0].tradeoffs.length > 0);

  const explicit = recommendFrontendOptions([react], 'Build me a frontend website with Next.js');
  assert.equal(explicit.shouldAsk, false);
  assert.match(explicit.reason, /already names Next\.js/);

  const interactive = recommendFrontendOptions([react], 'Build an interactive frontend experience');
  assert.equal(interactive.shouldAsk, true);
});
