import { describe, expect, it } from 'vitest';
import {
  backupNameFor,
  collidingCharacter,
  collidingHandle,
  isAdultSpeaker,
  KID_HANDLES,
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

describe('KID_HANDLES', () => {
  it('gives every handle its own distinct value — no two kids share one', () => {
    const handles = Object.values(KID_HANDLES);
    expect(new Set(handles).size).toBe(handles.length);
  });

  it('never hands out a handle that collides with a reserved name — that would just move the collision', () => {
    const reservedLower = new Set(RESERVED_NAMES.map((n) => n.toLowerCase()));
    for (const handle of Object.values(KID_HANDLES)) {
      expect(reservedLower.has(handle.toLowerCase())).toBe(false);
    }
  });

  it('only covers kids — every key is a reserved name, and no adult is in it', () => {
    const reserved = new Set<string>(RESERVED_NAMES);
    for (const canonical of Object.keys(KID_HANDLES)) {
      expect(reserved.has(canonical)).toBe(true);
    }
  });
});

describe('isAdultSpeaker', () => {
  it('is true for every adult who appears as a speaker', () => {
    expect(isAdultSpeaker('Mom')).toBe(true);
    expect(isAdultSpeaker('Mr. Arroyo')).toBe(true);
    expect(isAdultSpeaker('Councilwoman Reyes')).toBe(true);
    expect(isAdultSpeaker('Reeta')).toBe(true);
  });

  it('is false for a kid, for the player, and for narration (no speaker at all)', () => {
    expect(isAdultSpeaker('Ellen')).toBe(false);
    expect(isAdultSpeaker('You')).toBe(false);
    expect(isAdultSpeaker(undefined)).toBe(false);
  });
});

describe('collidingHandle', () => {
  it('matches case-insensitively and trims whitespace', () => {
    expect(collidingHandle('nova')).toBe('Ellen');
    expect(collidingHandle('  Files  ')).toBe('Aaron');
  });

  it('is null for a handle nobody has claimed', () => {
    expect(collidingHandle('Ghost')).toBeNull();
  });
});
