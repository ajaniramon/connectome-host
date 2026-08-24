import { describe, expect, test } from 'bun:test';
import { validateRecipe } from '../src/recipe.js';

function recipe(modules?: Record<string, unknown>) {
  return {
    name: 'instructions-test',
    agent: { systemPrompt: 'test' },
    ...(modules === undefined ? {} : { modules }),
  };
}

describe('recipe modules.instructions validation', () => {
  test('allows the field to be omitted', () => {
    expect(validateRecipe(recipe()).modules?.instructions).toBeUndefined();
  });

  test('accepts boolean shorthand', () => {
    expect(validateRecipe(recipe({ instructions: true })).modules?.instructions).toBe(true);
    expect(validateRecipe(recipe({ instructions: false })).modules?.instructions).toBe(false);
  });

  test('accepts a full object config', () => {
    const parsed = validateRecipe(recipe({
      instructions: {
        path: 'shared/HOUSE-RULES.md',
        header: '## House rules',
        maxBytes: 4096,
        position: 'afterUser',
      },
    }));
    expect(parsed.modules?.instructions).toEqual({
      path: 'shared/HOUSE-RULES.md',
      header: '## House rules',
      maxBytes: 4096,
      position: 'afterUser',
    });
  });

  test('accepts an empty object (all defaults)', () => {
    expect(validateRecipe(recipe({ instructions: {} })).modules?.instructions).toEqual({});
  });

  test('rejects non-boolean, non-object values', () => {
    expect(() => validateRecipe(recipe({ instructions: 'yes' }))).toThrow(/boolean or object/);
    expect(() => validateRecipe(recipe({ instructions: ['x'] }))).toThrow(/boolean or object/);
  });

  test('rejects unknown fields', () => {
    expect(() => validateRecipe(recipe({ instructions: { file: 'AGENTS.md' } })))
      .toThrow(/unknown field "file"/);
  });

  test('rejects a path without a "<mountName>/<relativePath>" shape', () => {
    expect(() => validateRecipe(recipe({ instructions: { path: 'AGENTS.md' } })))
      .toThrow(/<mountName>\/<relativePath>/);
    expect(() => validateRecipe(recipe({ instructions: { path: '/etc/passwd' } })))
      .toThrow(/<mountName>\/<relativePath>/);
    expect(() => validateRecipe(recipe({ instructions: { path: 'mount/' } })))
      .toThrow(/<mountName>\/<relativePath>/);
    expect(() => validateRecipe(recipe({ instructions: { path: '' } })))
      .toThrow(/non-empty string/);
  });

  test('rejects invalid maxBytes', () => {
    expect(() => validateRecipe(recipe({ instructions: { maxBytes: 0 } })))
      .toThrow(/positive integer/);
    expect(() => validateRecipe(recipe({ instructions: { maxBytes: 1.5 } })))
      .toThrow(/positive integer/);
    expect(() => validateRecipe(recipe({ instructions: { maxBytes: '32768' } })))
      .toThrow(/positive integer/);
  });

  test('rejects invalid position', () => {
    expect(() => validateRecipe(recipe({ instructions: { position: 'prepend' } })))
      .toThrow(/'system', 'beforeUser', or 'afterUser'/);
  });

  test('rejects non-string header', () => {
    expect(() => validateRecipe(recipe({ instructions: { header: 42 } })))
      .toThrow(/header must be a string/);
  });

  test('rejects instructions when workspace is disabled', () => {
    expect(() => validateRecipe(recipe({ instructions: true, workspace: false })))
      .toThrow(/requires modules\.workspace/);
    expect(() => validateRecipe(recipe({ instructions: {}, workspace: false })))
      .toThrow(/requires modules\.workspace/);
  });

  test('allows instructions with default (omitted) workspace and explicit workspace', () => {
    expect(() => validateRecipe(recipe({ instructions: true }))).not.toThrow();
    expect(() => validateRecipe(recipe({
      instructions: true,
      workspace: { mounts: [{ name: 'instructions', path: './instructions', mode: 'read-write' }] },
    }))).not.toThrow();
  });

  test('allows instructions: false alongside workspace: false', () => {
    expect(() => validateRecipe(recipe({ instructions: false, workspace: false }))).not.toThrow();
  });
});
