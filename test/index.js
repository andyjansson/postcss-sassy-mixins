var postcss = require('postcss');
var expect  = require('chai').expect;
var path    = require('path');
var mixins = require('../');

var test = function (input, output, opts) {
	var result = postcss(mixins(opts)).process(input);
	expect(result.css).to.eql(output);
	expect(result.warnings()).to.be.empty;
};

describe('postcss-sassy-mixins', function () {
	it('throws error on unknown mixin', function () {
		expect(function () {
			test('@include A');
		}).to.throw('Undefined mixin A');
	});

	it('can remove unknown mixins on request', function () {
		test('@include A; a{}', 'a{}', { silent: true });
	});

	it('supports mixin arguments', function () {
		test('a { @include color(black); }', 'a { color: black; }', {
			mixins: {
				color: function (rule, color) {
					rule.replaceWith({ prop: 'color', value: color });
				}
			}
		});
	});

	it('removes @include at-rule', function () {
		test('a { @include none; }', 'a { }', {
			mixins: {
				none: function () { }
			}
		});
	});

	it('converts returned object to nodes', function () {
		test('a { @include color(black); }', 'a { color: black; }', {
			mixins: {
				color: function (rule, color) {
					return { color: color };
				}
			}
		});
	});

	it('supports object mixins', function () {
		test('@include obj;',
			'@media screen {\n    b {\n        one: 1\n    }\n}', 
			{
				mixins: {
					obj: {
						'@media screen': {
							'b': {
								one: 1
							}
						}
					}
				}
			}
		);
	});

	it('supports mixins', function () {
		test('@mixin black { color: black; } a { @include black; }',
			'a { color: black; }');
	});

	it('only replaces assigned variables', function () {
		test('@mixin color($color) { color: $color $other; } ' +
			'a { @include color(black); }',
			'a { color: black $other; }');
	});

	it('supports default values', function () {
		test('@mixin c($color: black) { color: $color; } a { @include c; }',
			'a { color: black; }');
	});

	it('supports mixins with content', function () {
		test('@mixin m { @media { @content; } } @include m { a {} }',
			'@media {\n    a {}\n}');
	});

	it('supports using supplied arguments', function () {
		test('@mixin m($a, $b: b, $c: c) { v: $a $b $c; } @include m(1, 2);',
			'v: 1 2 c;');
	});

	it('supports loading mixins from a directory', function () {
		test('a { @include a(1); @include b; }', 'a { a: 1; b: 2; }', {
			mixinsDir: path.join(__dirname, 'mixins')
		});
	});

	it('supports loading mixins from multiple directories', function () {
		test('a { @include a(1); @include c; }', 'a { a: 1; c: 3; }', {
			mixinsDir: [
				path.join(__dirname, 'mixins'),
				path.join(__dirname, 'other')
			]
		});
	});

	it('supports loading mixins from file glob', function () {
		test('a { @include a(1); @include b; }', 'a { a: 1; b: 2; }', {
			mixinsFiles: path.join(__dirname, 'mixins', '*.js')
		});
	});

	it('supports loading mixins from multiple file globs', function () {
		test('a { @include a(1); @include c; }', 'a { a: 1; c: 3; }', {
			mixinsFiles: [
				path.join(__dirname, 'mixins', '!(b.js)'),
				path.join(__dirname, 'other', '*')
			]
		});
	});

	it('supports nested mixins', function () {
		test('@mixin a($col) { background: $col; }'
			+ '@mixin b($col) { @include a($col); color: white; }'
			+ 'a { @include b(black); }',
			'a { background: black; color: white; }',
			{ }
		);
	});
});
