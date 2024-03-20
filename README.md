# No-man's folly

## Coding standards

- `useXXX` can be used only when the function is related to React Hooks.
    - Place them into `src/hooks`.
- `newXXX` can be used only when the function isn't related to React Hooks but is composable.
    - Place them into `src/composables`.
- `state` generally refers to the state pattern.
- All state transition and handling should be shynchronous.
    - Use `defineAsyncState` to make a state handling something asynchronously.
- `react` related packages are available only in `src/components`, `src/hooks` and `src/contexts`.

## External icons
https://github.com/miyanokomiya/no-mans-folly-assets

## Development

### Data persistence via Indexed DB 
Diagram data can be saved and restored via Indexed DB without opening a workspace. Add `indexeddb=1` to URL query to turn on this functionality.

### Show debug information
`debug`` attribute in `UserSetting` is used as a flag to show debug information in the app. Check "Debug mode" in the "Setting" panel to turn on this value.
You can turn on this flag in other than develop environment by directly modifying `UserSetting` saved in `localStorage`.

Debug information list
- Current state name at the top right of the canvas

### Feature flags
Add feature flags in `src/composables/featureFlags.ts` if necessary.
