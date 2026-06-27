// platform/kernel/src/events/event-token.ts
//
// An EventToken<T> is a typed, name-keyed handle for an event channel.
//
// The generic parameter T describes the event payload type. Like Token<T>
// in the DI container, T is a phantom type — it exists only at compile time
// to give subscribe<T>(token, handler) its handler signature without requiring
// decorators or runtime type metadata.
//
// Usage:
//   export const USER_LOGGED_IN = new EventToken<UserLoggedInPayload>('user.loggedIn');
//
//   eventBus.subscribe(USER_LOGGED_IN, (payload) => {
//     // payload is typed as UserLoggedInPayload
//   });
//
//   eventBus.publish(USER_LOGGED_IN, { userId: '123', contractorId: 'ACC' });

/**
 * Typed event channel token.
 *
 * Two EventToken instances with the same name refer to the same channel.
 * Use a single exported constant per event type to avoid naming mismatches.
 */
export class EventToken<T> {
  /** Human-readable channel name for diagnostics and error messages. */
  readonly name: string;

  constructor(name: string) {
    if (!name || name.trim() === '') {
      throw new Error('EventToken name must not be empty.');
    }
    this.name = name;
  }

  toString(): string {
    return `EventToken(${this.name})`;
  }
}

// T is an intentionally phantom type parameter (used only at compile time).
// ESLint rule @typescript-eslint/no-unused-vars does not apply to class generics.
