import fs from 'fs';
import path from 'path';

import {plugin} from 'postcss';
import glob from 'glob';

import {define, include} from './mixins';

export default plugin('', (opts = {}) => {
    const mixins = {};

    if (opts.mixinsDir) {
        let dirs = opts.mixinsDir;

        if (!Array.isArray(dirs))
            dirs = [dirs];

        dirs.forEach(dir => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                if (path.extname(file) !== '.js')
                    return;

                file = path.join(dir, file);
                const name = path.basename(file, '.js');
                mixins[name] = { mixin: require(file) };
            });
        });
    }

    if (opts.mixinsFiles) {
        let globs = opts.mixinsFiles;

        if (!Array.isArray(globs))
            globs = [globs];

        globs.forEach(pattern => {
            glob.sync(pattern).forEach(file => {
				const name = path.basename(file, path.extname(file));
				mixins[name] = { mixin: require(file) };
            });
        });
    }

    if (typeof opts.mixins === 'object') {
		Object.keys(opts.mixins).forEach(name => {
			mixins[name] = { mixin: opts.mixins[name] };
		});
    }

    return css => {
		css.walkAtRules('mixin', rule => define(rule, mixins));
		css.walkAtRules('include', rule => include(rule, mixins, opts));
    }
});
