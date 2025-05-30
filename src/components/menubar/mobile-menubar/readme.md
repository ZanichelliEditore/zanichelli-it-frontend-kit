# zanit-mobile-menubar



<!-- Auto Generated Below -->


## Overview

Mobile menubar component.

## Properties

| Property      | Attribute      | Description                              | Type            | Default     |
| ------------- | -------------- | ---------------------------------------- | --------------- | ----------- |
| `current`     | `current`      | ID of the current active item.           | `string`        | `undefined` |
| `items`       | `items`        | Menubar items.                           | `MenubarItem[]` | `[]`        |
| `loading`     | `loading`      | Whether the menubar is loading the data. | `boolean`       | `false`     |
| `searchQuery` | `search-query` | Initial search query.                    | `string`        | `undefined` |


## Events

| Event    | Description                        | Type                              |
| -------- | ---------------------------------- | --------------------------------- |
| `search` | Emitted on search form submission. | `CustomEvent<{ query: string; }>` |


## Dependencies

### Used by

 - [zanit-menubar](..)

### Graph
```mermaid
graph TD;
  zanit-menubar --> zanit-mobile-menubar
  style zanit-mobile-menubar fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
