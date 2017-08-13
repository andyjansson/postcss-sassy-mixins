import postcss from 'postcss';
import simpleVars from 'postcss-simple-vars';

function parseNameAndArgs(rule) {
    const name = rule.params.split('(', 1)[0];
    const rest = rule.params.slice(name.length).trim();
    const args = [];

    if (rest) {
        if (rest.substring(rest.length - 1) !== ')')
			throw rule.error('Syntax error', { plugin: 'postcss-sassy-mixins' });
        
        const items = postcss.list.comma(rest.substring(1, rest.length - 1));
        args.push(...items);
    }

	return { name, args };
}

function objectToNodes(node, obj, source) {
	Object.keys(obj).forEach(key => {
		if (typeof obj[key] === 'object') {
			let rule;
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
			const decl = postcss.decl({
				prop: key,
				value: obj[key].toString(),
				source: source
			});
			node.append(decl);
		}
	});
	return node;
}

export function define(rule, mixins) {
    const parsed = parseNameAndArgs(rule);
    const args = [];

    if (parsed.args.length) {
        const items = parsed.args.map(item => {
            const pos = item.indexOf(":");
            const arg = item.substring(1, ~pos ? pos : item.length);
            const defaults = item.substring(arg.length + 2).trim();

            return [arg, defaults];
        });

        args.push(...items);
    }

    const content = rule.nodes.some(node => node.type === 'atrule' && node.name === 'content');

    mixins[parsed.name] = { 
        mixin: rule, 
        args: args, 
        content: content 
    };

    rule.remove();
}

export function include(rule, mixins, opts) {
    const {name, args} = parseNameAndArgs(rule);
    const definition = mixins[name];

    if (!definition && !opts.silent)
        throw rule.error(`Undefined mixin ${name}`);

    let mixin = definition && definition.mixin;

    if (typeof mixin === 'function') {
        const fArgs = [rule].concat(args);
        mixin = mixin.apply(this, fArgs);
    }

    if (typeof mixin === 'object') {
        if (mixin.type && mixin.name && mixin.type === 'atrule' && mixin.name === 'mixin') {
            const values = definition.args.reduce((obj, curr, i) =>
                Object.assign(obj, { [curr[0]]: args[i] || curr[1] }), {});

            const clones = mixin.nodes.map(node => node.clone());
            const proxy = postcss.rule();
            proxy.append(...clones);

            if (definition.args.length)
                simpleVars({ only: values })(proxy);

            if (definition.content) {
                proxy.walkAtRules('content', content => {
                    if (typeof rule.nodes !== 'undefined')
                        content.replaceWith(...rule.nodes.map(node => node.clone()));
                    else
                        content.remove();
                });
            }

            proxy.walkAtRules('include', innerRule => include(innerRule, mixins, opts));
            rule.before(proxy.nodes);
        }
        else {
            const root = objectToNodes(postcss.root(), mixin, rule.source);
            rule.before(root);
        }
    }
    else {
        throw rule.error(`Invalid return value in mixin ${name}`);
    }
    
    rule.remove();
}
