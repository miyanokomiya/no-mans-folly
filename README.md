# No-man's folly

## Coding standards

- `useXXX` can be used only when the function is related to React Hooks.
- `newXXX` can be used only when the function isn't related to React Hooks but is composable.
- `state` generally refers to the state pattern.
- All state transition and handling should be shynchronous.
    - TODO: To handle something asynchronously, create dedicated state blocking canvas events.

## External icons
- Put icon files at `public/shapes` directory.
- Run `scripts/shape_icons.js` to generate `index.json` that contains index information of icons.

```
$ node ./scripts/shape_icons.js ./public/shapes/TARGET_DIRECTORY
```

- Directory structure is reflected to UI as it is.
- The script generates unique id for each icon. Those ids change every time it runs.
