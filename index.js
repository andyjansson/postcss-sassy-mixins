var postcss = require('postcss'),
    vars = require('postcss-simple-vars'),
    path = require('path'),
    fs = require('fs'),
    glob = require('glob');

var stringToAtRule = function (str, obj) {
    obj.name   = str.match(/^@([^\s]*)/)[1];
    obj.params = str.replace(/^@[^\s]*\s+/, '');
    return obj;
};

var objectToNodes = function (node, obj, source) {
    var name, value, decl, rule;
    for ( name in obj ) {
        value = obj[name];
        if ( typeof value === 'object' ) {
            if ( name[0] === '@' ) {
                rule = postcss.atRule(stringToAtRule(name, { source: source }));
            } else {
                rule = postcss.rule({ selector: name, source: source });
            }
            node.append(rule);
            if ( typeof value === 'object' ) objectToNodes(rule, value, source);
        } else {
            decl = postcss.decl({
                prop:   name,
                value:  value.toString(),
                source: source
            });
            node.append(decl);
        }
    }
    return node;
};

var insertObject = function (rule, obj) {
    var root = objectToNodes(postcss.root(), obj, rule.source);
    rule.parent.insertBefore(rule, root);
};

var parseNameAndArgs = function (str, rule) {
    var name = str.split('(', 1)[0],
        rest = str.slice(name.length).trim(),
        args;

    if (rest.length) {
        if (
            rest.substring(0, 1) !== '(' ||
            rest.substring(rest.length - 1) !== ')'
            ) {
            throw rule.error(
                'Syntax error',
                { plugin: 'postcss-sassy-mixins' }
            );
        }
        args = rest.substring(1, rest.length - 1);
    }

    return {
        name: name,
        args: args
    };
};

var defineMixin = function (result, mixins, rule) {
    var parsed = parseNameAndArgs(rule.params, rule),
        args = [];

    if (parsed.args) {
        args = postcss.list.comma(parsed.args).map(function(str) {
            var arg = str.split(':', 1)[0];
            var defaults = str.slice(arg.length + 1);
            return [arg.slice(1).trim(), defaults.trim()];
        });
    }

    var content = false;
    rule.walkAtRules('content', function () {
        content = true;
        return false;
    });

    mixins[parsed.name] = { mixin: rule, args: args, content: content };
    rule.remove();
};

var insertMixin = function (result, mixins, rule, opts) {
    var parsed = parseNameAndArgs(rule.params, rule),
        params = [];

    if (parsed.args) {
        params = postcss.list.comma(parsed.args);
    }

    var def = mixins[parsed.name];
    var mixin = def && def.mixin;

    if (!def) {
        if ( !opts.silent ) {
            throw rule.error('Undefined mixin ' + parsed.name);
        }
    }
    else if (mixin.name === 'mixin') {
        var values = { };
        for ( var i = 0; i < def.args.length; i++ ) {
            values[ def.args[i][0] ] = params[i] || def.args[i][1];
        }

        var clones = [];
        for ( i = 0; i < mixin.nodes.length; i++ ) {
            clones.push( mixin.nodes[i].clone() );
        }

        var proxy = postcss.rule({ nodes: clones });
        if ( def.args.length ) {
            vars({ only: values })(proxy);
        }

        if ( def.content ) {
            proxy.walkAtRules('content', function (place) {
                place.replaceWith(rule.nodes);
            });
        }
        rule.parent.insertBefore(rule, clones);
    }
    else if ( typeof mixin === 'object' ) {
        insertObject(rule, mixin, rule.source);
    }
    else if ( typeof mixin === 'function' ) {
        var args  = [rule].concat(params);
        var nodes = mixin.apply(this, args);
        if ( typeof nodes === 'object' ) {
            insertObject(rule, nodes, rule.source);
        }
    }

    if ( rule.parent ) rule.remove();
};

module.exports = postcss.plugin('postcss-sassy-mixins', function (opts) {
    if ( typeof opts === 'undefined' ) opts = { };

    var i;
    var mixins = { };

    if ( opts.mixinsDir ) {
        var dirs = opts.mixinsDir;
        if ( !(dirs instanceof Array) ) dirs = [dirs];

        for ( i = 0; i < dirs.length; i++ ) {
            var dir   = dirs[i];
            var files = fs.readdirSync(dir);
            for ( var j = 0; j < files.length; j++ ) {
                var file = path.join(dir, files[j]);
                if ( path.extname(file) === '.js' ) {
                    var name = path.basename(file, '.js');
                    mixins[name] = { mixin: require(file) };
                }
            }
        }
    }

    if ( opts.mixinsFiles ) {
        var globs = opts.mixinsFiles;
        if ( !(globs instanceof Array) ) globs = [globs];

        globs.forEach(function(pattern) {
            glob.sync(pattern).forEach(function(file2) {
                var name2 = path.basename(file2, path.extname(file2));
                mixins[name2] = { mixin: require(file2) };
            });
        });
    }

    if ( typeof opts.mixins === 'object' ) {
        for ( i in opts.mixins ) mixins[i] = { mixin: opts.mixins[i] };
    }

    return function (css, result) {
        css.walkAtRules('mixin', function (rule) {
            defineMixin(result, mixins, rule);
        });
        css.walkAtRules('include', function (rule) {
            insertMixin(result, mixins, rule, opts);
        });
    };
});
