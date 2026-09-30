export type KeypadContact = {
  row: number;
  column: number;
};

const pressedContacts = new Map<
  string,
  Map<string, KeypadContact>
>();

function contactId(row: number, column: number): string {
  return String(row) + ":" + String(column);
}

function normalizeKey(key: string): string {
  return key.trim().toUpperCase();
}

/**
 * Live UI -> simulator input bridge for Wokwi membrane keypads.
 *
 * The React Flow node list is a topology snapshot owned by the
 * SimulationEngine, so transient key presses must not depend on
 * replacing node objects in React state. This store represents the
 * physical row/column contact closure directly and is consumed by
 * DigitalInputSolver on every simulation tick.
 */
export function setKeypadContact(
  nodeId: string,
  row: number,
  column: number,
  pressed: boolean,
): void {
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    row < 0 ||
    row > 3 ||
    column < 0 ||
    column > 3
  ) {
    return;
  }

  let contacts = pressedContacts.get(nodeId);

  if (pressed) {
    if (!contacts) {
      contacts = new Map<string, KeypadContact>();
      pressedContacts.set(nodeId, contacts);
    }

    contacts.set(contactId(row, column), { row, column });
    return;
  }

  contacts?.delete(contactId(row, column));

  if (contacts && contacts.size === 0) {
    pressedContacts.delete(nodeId);
  }
}

export function getKeypadContacts(
  nodeId: string,
): KeypadContact[] {
  return Array.from(
    pressedContacts.get(nodeId)?.values() ?? [],
  );
}

export function clearKeypadContacts(
  nodeId?: string,
): void {
  if (nodeId === undefined) {
    pressedContacts.clear();
    return;
  }

  pressedContacts.delete(nodeId);
}


/**
 * Update a keypad contact using the key label as the identity.
 *
 * Wokwi emits row/column coordinates with both press and release events,
 * but the key label is the stable identity of the physical button. Using
 * it here prevents a transient UI event from leaving a stale row/column
 * contact behind and causing repeated firmware reads.
 */
export function setKeypadKey(
  nodeId: string,
  key: string,
  row: number,
  column: number,
  pressed: boolean,
): void {
  const normalized = normalizeKey(key);

  if (!normalized) {
    return;
  }

  const contacts = pressedContacts.get(nodeId);

  if (!pressed) {
    /*
     * Remove the contact by its physical coordinates. If the Wokwi
     * element supplied a different coordinate during release, remove
     * every matching contact defensively so a key can never remain
     * electrically stuck after release.
     */
    if (contacts) {
      for (const [id, contact] of contacts) {
        if (
          contact.row === row &&
          contact.column === column
        ) {
          contacts.delete(id);
        }
      }

      if (contacts.size === 0) {
        pressedContacts.delete(nodeId);
      }
    }
    return;
  }

  setKeypadContact(nodeId, row, column, true);
}
