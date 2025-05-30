# Zanichelli.it frontend kit

A set of styles and components to be used for the development of the Zanichelli.it frontend.

## Usage

To install the package, run:

```bash
yarn add @zanichelli/zanichelli-it-frontend-kit
```

In your project import the library by adding the following line to your `index.tsx` or `index.js` file:

```javascript
import '@zanichelli/zanichelli-it-frontend-kit';
```

or import the specific components you need:

```javascript
import '@zanichelli/zanichelli-it-frontend-kit/zanit-menubar';
```

Import the styles in your main stylesheet:

```css
@import '@zanichelli/zanichelli-it-frontend-kit/dist/zanichelli-it-frontend-kit/zanichelli-it-frontend-kit.css';
```

or

```css
@import '@zanichelli/zanichelli-it-frontend-kit/style.css';
```

## Components

The components are built using Stencil.js and are available as web components. You can use them in any framework or even in plain HTML.
Their documentation is available in the `src/components` folder, where you can find a `readme.md` file for each component.

The available components are those exported in the package.json file.
