# No-man's folly

No-man's folly is a free diagramming tool. This is a tool for people who love diagramming within.

Links
- Application: https://no-mans-folly.com/
- Documentation: https://doc.no-mans-folly.com/ ([Repository](https://github.com/miyanokomiya/no-mans-folly-assets))

## License
This repository is licensed under the GNU Affero General Public License, Version 3. Individual files may have a different, but compatible license.

The content you create with this tool is yours and we make no copyright claim on it. However, you still need to follow certain license when you use external assets provided by thrid parties.

## External icons
External icon are managed in below repository. They aren't under the license of this repository.
https://github.com/miyanokomiya/no-mans-folly-assets

## Development

### Coding standards

- There're some no-restricted-paths rules declared in `.eslintrc.json`.
- `useXXX` can be used only when the function is related to React Hooks.
    - Place them into `src/hooks` or near by related components.
- `newXXX` can be used only when the function isn't related to React Hooks but is composable.
    - Place them into `src/composables`.
- `state` may refer to the state pattern outside React components.
- React related packages are available only in `src/components`, `src/hooks` and `src/contexts`.
    - Feature driven directories should have similar structure as well.

#### State pattern
Operations in the canvas should be managed via state pattern.
All state transition and handling should be shynchronous. Use `defineAsyncState` to make a state that handles something asynchronously.

### Data persistence via Indexed DB 
Diagram data can be saved and restored via Indexed DB without opening a workspace. Add `indexeddb=1` to URL query to turn on this functionality.  
This functionality is never intended for production environment.

### Show debug information
`debug` attribute in `UserSetting` is used as a flag to show debug information in the app. Check "Debug mode" in the "Setting" panel to turn on this value.  
You can turn on this flag in other than develop environment by directly modifying `UserSetting` saved in `localStorage`.

Debug information list
- Current state name at the top right of the canvas

### Terminology hint
Terminologies are defined in `src/utils/terminology.ts`.  
`<AppText>` creates hints for terminologies when the text contains `[[KEYWORD]]` format.

Some modifiers are available to adjust key text.

- `(l)`: make key text lowercase.

### Feature flags
Add feature flags in `src/composables/featureFlags.ts` if necessary.

### Deployment
`main` branch is automatically deployed to the production.
