import { normalize, relative } from 'path/posix';
import micromatch from 'micromatch';

import { Git } from './git.js';

export namespace findByGlob {
	export type Options = {
		repository?: string;
		branch?: string;
		cwd?: string;
		pattern?: string | string[];
		ignore?: string | string[];
		filter?(file: string): boolean;
	};
}

/**
 * Finds files by glob pattern in a git repository.
 * Always returns relative paths to cwd.
 */
export function* findByGlob({
	repository = '.',
	branch = 'master',
	cwd = '.',
	pattern = '**',
	ignore,
	filter
}: findByGlob.Options): Iterable<string> {
	// normalize cwd
	let ncwd = normalize(cwd).replace(/\\/g, '/');
	if (!ncwd.endsWith('/')) ncwd += '/';
	if (ncwd.startsWith('/')) ncwd = ncwd.substring(1);

	const git = new Git({
		cwd: repository,
	});

	const mmOpts = { ignore };

	const files = git.tree(ncwd, branch).map(x => relative(ncwd, x));

	console.log(ncwd, branch, files);
	console.log(git.diagnostics());


	if (typeof filter === 'function') {
		for (const file of files) {
			if (micromatch.isMatch(file, pattern, mmOpts) && filter(file)) yield file;
		}
	} else {
		for (const file of files) {
			if (micromatch.isMatch(file, pattern, mmOpts)) yield file;
		}
	}
}

export default findByGlob;
