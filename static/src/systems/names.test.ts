import { describe, expect, it } from 'vitest';
import {
  backupNameFor,
  collidingCharacter,
  NAME_SWAP_FROM_FLAG,
  NAME_SWAP_TO_FLAG,
  RESERVED_NAMES,
  resolveCharacterName,
} from './names';
import { createNewSave } from '../state/defaults';

describe('collidingCharacter', () => {
  it('matches case-insensitively and trims whitespace', () => {
    expect(collidingCharacter('ellen')).toBe('Ellen');
    expect(collidingCharacter('  DEJA  ')).toBe('Deja');
  });

  it('is null for an ordinary name', () => {
    expect(collidingCharacter('Wren')).toBeNull();
  });

  it('does not fire on a name that merely contains a reserved one', () => {
    // "Deja" inside "Dejah" must not read as a collision — this is an exact
    // match on the whole typed name, not a substring scan.
    expect(collidingCharacter('Dejah')).toBeNull();
  });
});

describe('the backup table', () => {
  it('gives every reserved name its own distinct backup', () => {
    const backups = RESERVED_NAMES.map((n) => backupNameFor(n));
    expect(new Set(backups).size).toBe(backups.length);
  });

  it('never picks a backup that is itself a reserved name — that would just move the collision', () => {
    const reservedLower = new Set(RESERVED_NAMES.map((n) => n.toLowerCase()));
    for (const n of RESERVED_NAMES) {
      expect(reservedLower.has(backupNameFor(n).toLowerCase())).toBe(false);
    }
  });
});

describe('resolveCharacterName', () => {
  it('returns the canonical name when nothing has been swapped', () => {
    expect(resolveCharacterName({}, 'Ellen')).toBe('Ellen');
  });

  it('returns the backup only for the character that was actually swapped', () => {
    const flags = { [NAME_SWAP_FROM_FLAG]: 'Ellen', [NAME_SWAP_TO_FLAG]: 'Robyn' };
    expect(resolveCharacterName(flags, 'Ellen')).toBe('Robyn');
    expect(resolveCharacterName(flags, 'Deja')).toBe('Deja');
  });
});

describe('createNewSave — name collision at creation', () => {
  it('stamps a swap when the player picks a reserved character name', () => {
    const save = createNewSave('Ellen');
    expect(save.player.flags[NAME_SWAP_FROM_FLAG]).toBe('Ellen');
    expect(save.player.flags[NAME_SWAP_TO_FLAG]).toBe('Robyn');
    // The player's own name is never touched by the collision it caused.
    expect(save.player.name).toBe('Ellen');
  });

  it('stamps nothing at all for an ordinary name', () => {
    const save = createNewSave('Wren');
    expect(save.player.flags[NAME_SWAP_FROM_FLAG]).toBeUndefined();
    expect(save.player.flags[NAME_SWAP_TO_FLAG]).toBeUndefined();
  });
});
