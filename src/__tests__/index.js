import path from 'path';

import test from 'ava';
import postcss from 'postcss';

import mixins from '../';

function testFixture(t, fixture, expected, opts) {
    return postcss(mixins(opts)).process(fixture).then(results => {
        t.deepEqual(results.css, expected);
    });
}

function testThrows(t, fixture, opts) {
    t.throws(() => postcss(mixins(opts)).process(fixture).css);
}

test(
    'should invoke mixins',
    testFixture,
    '@mixin foo { bar: baz; } bat { @include foo; }',
    'bat { bar: baz; }'
);

test(
    'should invoke mixins with arguments',
    testFixture,
    '@mixin foo($bar) { baz: $bar bat; } qux { @include foo(quux); }',
    'qux { baz: quux bat; }'
);

test(
    'should invoke mixins with default arguments',
    testFixture,
    '@mixin foo($bar: quux) { baz: $bar bat; } qux { @include foo(); }',
    'qux { baz: quux bat; }'
);

test(
    'should invoke mixins with default arguments overridden',
    testFixture,
    '@mixin foo($bar: quux) { baz: $bar bat; } qux { @include foo(qux); }',
    'qux { baz: qux bat; }'
);

test(
    'should invoke mixins with @content (1)',
    testFixture,
    '@mixin foo { @content; } bar { @include foo { baz: bat }; }',
    'bar { baz: bat; }'
);

test(
    'should invoke mixins with @content (2)',
    testFixture,
    '@mixin foo { @content; } bar { @include foo; }',
    'bar { }'
);

test(
    'should invoke nested mixins',
    testFixture,
    '@mixin foo { qux: quux; } @mixin bar { @include foo; baz: bat; } foo { @include bar; }',
    'foo { qux: quux; baz: bat; }'
);

test(
    'should invoke mixin from object',
    testFixture,
    'foo { @include foo; }',
    'foo { @bar baz { bat { qux: quux } } }',
    {
        mixins: {
            foo: {
                '@bar baz': {
                    'bat': {
                        'qux': 'quux'
                    }
                }
            }
        }
    }
);

test(
    'should invoke mixin from function',
    testFixture,
    'foo { @include foo(bat); }',
    'foo { baz: bat; }',
    {
        mixins: {
            foo: (rule, bar) => ({
                baz: bar
            })
        }
    }
);

test(
    'should load mixins from mixinsFiles (1)',
    testFixture,
    'foo { @include foo(bar); @include bar(); }',
    'foo { foo: bar; bar: baz; }',
    {
        mixinsFiles: path.join(__dirname, 'fixtures', 'mixins', '*.js')
    }
);


test(
    'should load mixins from mixinsFiles (2)',
    testFixture,
    'foo { @include foo(bar); @include bar(); @include baz(); }',
    'foo { foo: bar; bar: baz; baz: bat; }',
    {
        mixinsFiles: [
            path.join(__dirname, 'fixtures', 'mixins', '*.js'),
            path.join(__dirname, 'fixtures', 'other', '*.js')
        ]
    }
);

test(
    'should load mixins from mixinsDir',
    testFixture,
    'foo { @include foo(bar); @include bar(); }',
    'foo { foo: bar; bar: baz; }',
    {
        mixinsDir: path.join(__dirname, 'fixtures', 'mixins')
    }
);


test(
    'should load mixins from mixinsDir (2)',
    testFixture,
    'foo { @include foo(bar); @include bar(); @include baz(); }',
    'foo { foo: bar; bar: baz; baz: bat; }',
    {
        mixinsDir: [
            path.join(__dirname, 'fixtures', 'mixins'),
            path.join(__dirname, 'fixtures', 'other')
        ]
    }
);

test(
    'should throw error when invoking unknown mixin',
    testThrows,
    'bat { @include foo; }'
);

test(
    'should throw error when invoking mixin without closing parenthesis',
    testThrows,
    '@mixin foo($bar) { baz: $bar bat; } qux { @include foo(quux; }'
);

test(
    "should throw error when invoking function which doesn't return an object",
    testThrows,
    'foo { @include error(); }',
    {
        mixinsFiles: path.join(__dirname, 'fixtures', 'mixins', '*.js')
    }
);
