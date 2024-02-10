# No-man's folly

## Coding standards

- `useXXX` can be used only when the function is related to React Hooks.
    - Place them into `src/hooks`.
- `newXXX` can be used only when the function isn't related to React Hooks but is composable.
    - Place them into `src/composables`.
- `state` generally refers to the state pattern.
- All state transition and handling should be shynchronous.
    - TODO: To handle something asynchronously, create dedicated state blocking canvas events.
- `react` related packages are available only in `src/components`, `src/hooks` and `src/contexts`.

## External icons
https://github.com/miyanokomiya/no-mans-folly-assets
