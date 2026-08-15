import { describe, expect, it } from 'vitest';
import { render } from './scenes';
import { createNewSave } from '../state/defaults';

describe('render — {name} and the character-name swap', () => {
  it('substitutes {name} with the player\'s own name', () => {
    const save = createNewSave('Wren');
    expect(render('{name}, wake up.', save)).toBe('Wren, wake up.');
  });

  it('swaps a colliding character\'s name wherever it appears in plain text', () => {
    const save = createNewSave('Ellen');
    expect(render('the corner has Ellen.', save)).toBe('the corner has Robyn.');
  });

  /**
   * The regression this test exists for: a line spoken BY the collided
   * character, addressing the player by their own (identical) name via
   * `{name}`, must not have that `{name}` swapped too. "Ellen" the
   * character goes by "Robyn"; "Ellen" the player is still "Ellen".
   */
  it('never touches the name that came from {name}, even when it is identical to the swapped character', () => {
    const save = createNewSave('Ellen');
    expect(render('{name}! Hold on — thirty seconds.', save)).toBe('Ellen! Hold on — thirty seconds.');
  });

  it('leaves ordinary names untouched for an adult speaker, who never uses handles', () => {
    const save = createNewSave('Wren');
    expect(render('the corner has Ellen.', save, 'Mom')).toBe('the corner has Ellen.');
  });
});

describe('render — the player\'s own handle', () => {
  it('leaves a kid character\'s real name untouched — only the player has a handle', () => {
    const save = createNewSave('Wren');
    expect(render('the corner has Ellen.', save)).toBe('the corner has Ellen.');
    expect(render('Deja said to meet at the jobsite.', save, 'Aaron')).toBe('Deja said to meet at the jobsite.');
    expect(render('Deja said to meet at the jobsite.', save, 'Mom')).toBe('Deja said to meet at the jobsite.');
  });

  it('substitutes {name} with the player\'s own handle for a kid speaker', () => {
    const save = createNewSave('Wren', 'Ghost');
    expect(render('{name}, over here.', save, 'Ellen')).toBe('Ghost, over here.');
  });

  it('substitutes {name} with the player\'s own handle for narration (no speaker)', () => {
    const save = createNewSave('Wren', 'Ghost');
    expect(render('{name} keeps walking.', save)).toBe('Ghost keeps walking.');
  });

  it('substitutes {name} with the player\'s real name for an adult speaker', () => {
    const save = createNewSave('Wren', 'Ghost');
    expect(render('{name}, straight home after.', save, 'Mom')).toBe('Wren, straight home after.');
  });

  it('falls back to the player\'s name when no handle was chosen', () => {
    const save = createNewSave('Wren');
    expect(render('{name}, over here.', save, 'Ellen')).toBe('Wren, over here.');
  });
});
