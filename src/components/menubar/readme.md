# zanit-menubar

<!-- Auto Generated Below -->


## Overview

Main menubar component. Each item can have a menu with subitems
When a main menubar item is the current active one, a sub-menubar is shown and each subitem can have a menu with subitems.

## Properties

| Property      | Attribute      | Description                                                                                                   | Type                                                       | Default     |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| `area`        | `area`         | The currently active area (e.g. "SCUOLA", "UNIVERSITÀ", "DIZIONARI").                                         | `string`                                                   | `undefined` |
| `current`     | `current`      | Path of the current item.                                                                                     | `string`                                                   | `undefined` |
| `data`        | `data`         | The data to build the menu (as an array of `MenubarItem` or a JSON array) or the url to fetch to retrieve it. | `MenubarItem[] \| Promise<MenubarItem[]> \| URL \| string` | `undefined` |
| `searchQuery` | `search-query` | Initial search query.                                                                                         | `string`                                                   | `undefined` |


## Dependencies

### Depends on

- [zanit-mobile-menubar](mobile-menubar)
- [zanit-search-form](search-form)

### Graph
```mermaid
graph TD;
  zanit-menubar --> zanit-mobile-menubar
  zanit-menubar --> zanit-search-form
  zanit-mobile-menubar --> zanit-search-form
  style zanit-menubar fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
