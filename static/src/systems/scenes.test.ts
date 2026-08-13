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

  it('leaves ordinary names untouched when nothing collided', () => {
    const save = createNewSave('Wren');
    expect(render('the corner has Ellen.', save)).toBe('the corner has Ellen.');
  });
});
