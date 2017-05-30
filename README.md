# PostCSS Sassy Mixins [![Build Status][ci-img]][ci]

[PostCSS] plugin for sass-like mixins.

[PostCSS]:                 https://github.com/postcss/postcss
[postcss-mixins]:          https://github.com/postcss/postcss-mixins
[ci-img]:                  https://travis-ci.org/andyjansson/postcss-sassy-mixins.svg
[ci]:                      https://travis-ci.org/andyjansson/postcss-sassy-mixins

## Installation

```js
npm install postcss-sassy-mixins
```

## Usage

```js
var postcss = require('postcss');
var mixins = require('postcss-sassy-mixins');

var options = {
   // options here
};

var output = postcss()
  .use(mixins(options))
  .process(css)
  .css;
```

```css
@mixin border-radius($radius) {
  -webkit-border-radius: $radius;
     -moz-border-radius: $radius;
      -ms-border-radius: $radius;
          border-radius: $radius;
}

.box { @include border-radius(10px); }
```

Turns into:

```css
.box {
  -webkit-border-radius: 10px;
  -moz-border-radius: 10px;
  -ms-border-radius: 10px;
  border-radius: 10px;
}
```

## Options

### `mixins`

Type: `Object`

Object of mixins. The mixin can either be a function or an object.

```js
require('postcss-mixins')({
    mixins: {
        clearfix: {
            '&::after': {
                content: '""',
                display: 'table',
                clear: 'both'
            }
        },
        color: function (rule, color) {
            rule.replaceWith({ prop: 'color', value: color });
        }
    }
})
```

### `mixinsDir`

Type: `string|string[]`

Autoload all mixins from one or more directories. The name of the mixin will be taken from file name.

```js
// gulpfile.js

require('postcss-mixins')({
    mixinsDir: path.join(__dirname, 'mixins')
})

// mixins/clearfix.js

module.exports = {
    '&::after': {
        content: '""',
        display: 'table',
        clear: 'both'
    }
}
```

### `mixinsFiles`

Type: `string|string[]`

Similar to [`mixinsDir`](#mixinsdir), except you provide
[glob](https://github.com/isaacs/node-glob) syntax to target or not target
specific files.

```js
require('postcss-mixins')({
    mixinsFiles: path.join(__dirname, 'mixins', '!(*.spec.js)')
})
```

### `silent`

Type: `boolean`

Remove unknown mixins and do not throw a error. Default is `false`.
