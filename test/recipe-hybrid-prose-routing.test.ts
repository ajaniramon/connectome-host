import { describe, expect, it } from 'bun:test';
import { validateRecipe } from '../src/recipe.js';
const base = (proseRouting?: unknown) => ({ name: 'test', agent: { systemPrompt: '', ...(proseRouting === undefined ? {} : { proseRouting }) } });
describe('hybrid prose routing recipe', () => {
  it('accepts locus, explicit, hybrid, and omission', () => {
    expect(validateRecipe(base()).agent.proseRouting).toBeUndefined();
    for (const mode of ['locus', 'explicit', 'hybrid'] as const) expect(validateRecipe(base(mode)).agent.proseRouting).toBe(mode);
  });
  it('rejects unknown modes', () => {
    expect(() => validateRecipe(base('triple-magic'))).toThrow(/proseRouting/);
  });
});
