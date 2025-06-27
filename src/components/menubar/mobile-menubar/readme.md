# zanit-mobile-menubar



<!-- Auto Generated Below -->


## Overview

Mobile menubar component.

## Properties

| Property      | Attribute      | Description                              | Type            | Default     |
| ------------- | -------------- | ---------------------------------------- | --------------- | ----------- |
| `currentPath` | `current-path` | IDs path of the current item.            | `string[]`      | `[]`        |
| `items`       | `items`        | Menubar items.                           | `MenubarItem[]` | `[]`        |
| `loading`     | `loading`      | Whether the menubar is loading the data. | `boolean`       | `false`     |
| `searchQuery` | `search-query` | Initial search query.                    | `string`        | `undefined` |


## Dependencies

### Used by

 - [zanit-menubar](..)

### Depends on

- [zanit-search-form](../search-form)

### Graph
```mermaid
graph TD;
  zanit-mobile-menubar --> zanit-search-form
  zanit-menubar --> zanit-mobile-menubar
  style zanit-mobile-menubar fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
