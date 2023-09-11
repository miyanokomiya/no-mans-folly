# No-man's folly

## Coding standards

- `useXXX` can be used only when the function is related to React Hooks.
- `newXXX` can be used only when the function isn't related to React Hooks but is composable.
- `state` generally refers to the state pattern.
- All state transition and handling should be shynchronous.
    - TODO: To handle something asynchronously, create dedicated state blocking canvas events.
