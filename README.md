# babel-dedentor

[babel-plugin-dedent](https://github.com/MartinKolarik/babel-plugin-dedent) with more configuration.

## Install

```sh
yarn add --save-dev babel-dedentor
```

In your `babel.config.json`:

```js
{
  "plugins": [
    [
      "babel-dedentor",
      {
        // Showing default configuration, all of the following fields are optional
        "tagName": "dedent",
        // Retain the function call, useful for dedenting SQL statements and `chalk` strings.
        "keepFunctionCall": false,
        "trimLeft": true,
        "trimRight": true
      }
    ]
  ]
}
```

Prefer type safe Babel configuration? Try the following:

```js
import { useDedentPlugin } from "babel-dedentor"

export default {
  plugins: [
    useDedentPlugin({
      tagName: "dedent",
      keepFunctionCall: false,
      trimLeft: true,
      trimRight: true,
    }),
  ],
}
```

## Usage

Indentation will be removed from all strings tagged with `dedent` tag (or any tag specified in your configuration).

```js
expect(dedent`Line #1
	Line #2
	Line #3`).to.equal("Line #1\nLine #2\nLine #3")

// Leading/trailing line break is removed.
expect(
  dedent`
	Line #1
	Line #2
	Line #3
	`
).to.equal("Line #1\nLine #2\nLine #3")

// No more than one leading/trailing line break is removed.
expect(
  dedent`

	Line #1
	Line #2
	Line #3

	`
).to.equal("\nLine #1\nLine #2\nLine #3\n")

// Only the "base" indentation is removed.
expect(
  dedent`
	Line #1
		Line #2
			Line #3
	`
).to.equal("Line #1\n\tLine #2\n\t\tLine #3")

// The last line is ignored if it doesn't contain anything else than whitespace.
expect(
  (function () {
    return dedent`
			Line #1
			Line #2
			Line #3
		`
  })()
).to.equal("Line #1\nLine #2\nLine #3")

// Escaped characters are ignored.
expect(
  dedent`
	\tLine #1
	\tLine #2
	\tLine #3
	`
).to.equal("\tLine #1\n\tLine #2\n\tLine #3")
```

## License

Copyright (c) 2020 ~proteria.

Copyright (c) 2015 - 2020 Martin Kolárik.

Released under the MIT license.
