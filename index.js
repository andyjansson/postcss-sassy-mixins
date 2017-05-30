var postcss = require('postcss'),
	fs = require('fs'),
	path = require('path'),
	glob = require('glob'),
	vars = require('postcss-simple-vars');

var parseNameAndArgs = function (rule) {
	var name = rule.params.split('(', 1)[0],
		rest = rule.params.slice(name.length).trim(),
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
		args = postcss.list.comma(rest.substring(1, rest.length - 1));
	}

	return {
		name: name,
		args: args
	};
};

var objectToNodes = function (node, obj, source) {
	Object.keys(obj).forEach(function(key) {
		if (typeof obj[key] === 'object') {
			var rule;
			if (key[0] === '@')
				rule = postcss.atRule({
					name: key.match(/^@([^\s]*)/)[1],
					params: key.replace(/^@[^\s]*\s+/, '')
				});
			else
				rule = postcss.rule({ selector: key, source: source });
			node.append(rule);
			objectToNodes(rule, obj[key], source);
		}
		else {
			var decl = postcss.decl({
				prop: key,
				value: obj[key].toString(),
				source: source
			});
			node.append(decl);
		}
	});
	return node;
};

module.exports = postcss.plugin('postcss-sassy-mixins', function (opts) {
	opts = opts || {};
	var mixins = {};
	if (opts.mixinsDir) {
		var dirs = opts.mixinsDir;
		if (!(dirs instanceof Array)) dirs = [dirs];
		dirs.forEach(function(dir) {
			var files = fs.readdirSync(dir);
			files.forEach(function(filename) {
				var file = path.join(dir, filename);
				if (path.extname(file) !== '.js') return;
				var name = path.basename(file, '.js');
				mixins[name] = { mixin: require(file) };
			});
		});
	}

	if (opts.mixinsFiles) {
		var globs = opts.mixinsFiles;
		if (!(globs instanceof Array)) globs = [globs];
		globs.forEach(function(pattern) {
			glob.sync(pattern).forEach(function(file) {
				var name = path.basename(file, path.extname(file));
				mixins[name] = { mixin: require(file) };
			});
		});
	}

	if (typeof opts.mixins === 'object') {
		Object.keys(opts.mixins).forEach(function(name) {
			mixins[name] = { mixin: opts.mixins[name] };
		});
	}

	var defineMixin = function (rule) {
		var parsed = parseNameAndArgs(rule),
			args;

		if (parsed.args)
			args = parsed.args.map(function(str) {
				var arg = str.split(':', 1)[0];
				var defaults = str.slice(arg.length + 1);
				return [arg.slice(1).trim(), defaults.trim()];
			});

		var content = false;
		rule.walkAtRules('content', function () {
			content = true;
			return false;
		});

		mixins[parsed.name] = { mixin: rule, args: args, content: content };
		rule.remove();
	};

	var includeMixin = function (rule) {
		var parsed = parseNameAndArgs(rule);
		var decl = mixins[parsed.name];
		if (!decl && !opts.silent)
			throw rule.error('Undefined mixin ' + parsed.name);
		var mixin = decl && decl.mixin;
		var params = parsed.args || [];
		if (typeof mixin === 'function') {
			var args = [rule].concat(params);
			mixin = mixin.apply(this, args);
		}
		if (typeof mixin === 'object') {
			if (mixin.type && mixin.name &&
				mixin.type === 'atrule' && mixin.name === 'mixin') {
				var values = {};
				if (decl.args) decl.args.forEach(function (arg, i) {
					values[arg[0]] = params[i] || arg[1];
				});
				var clones = [];
				mixin.nodes.forEach(function(node) {
					clones.push(node.clone());
				});
				var proxy = postcss.rule({ nodes: clones });
				if (decl.args) vars({ only: values })(proxy);
				if (decl.content) {
					proxy.walkAtRules('content', function (place) {
						if (typeof rule.nodes !== 'undefined')
							place.replaceWith(rule.nodes);
						else place.remove();
					});
				}
				rule.parent.insertBefore(rule, proxy.nodes);
				proxy.walkAtRules('include', includeMixin);
			}
			else {
				var root = objectToNodes(postcss.root(), mixin, rule.source);
				rule.parent.insertBefore(rule, root);
			}
		}
		rule.remove();
	};
	return function (css) {
		css.walkAtRules('mixin', defineMixin);
		css.walkAtRules('include', includeMixin);
	};
});
