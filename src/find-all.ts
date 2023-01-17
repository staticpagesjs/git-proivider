import { normalize, relative } from 'path/posix';

import { Git } from './git.js';

export namespace findAll {
	export type Options = {
		repository?: string;
		branch?: string;
		cwd?: string;
		filter?(file: string): boolean;
	};
}

/**
 * Finds all files in a specified directory of a git repository.
 * Always returns relative paths to cwd.
 */
export function* findAll({
	repository = '.',
	branch = 'master',
	cwd = '.',
	filter,
}: findAll.Options): Iterable<string> {
	// normalize cwd
	let ncwd = normalize(cwd).replace(/\\/g, '/');
	if (!ncwd.endsWith('/')) ncwd += '/';
	if (ncwd.startsWith('/')) ncwd = ncwd.substring(1);

	const git = new Git({
		env: {
			GIT_DIR: repository,
		}
	});

	const files = git.tree(ncwd, branch).map(x => relative(ncwd, x));

	if (typeof filter === 'function') {
		for (const file of files) {
			if (filter(file)) yield file;
		}
	} else {
		for (const file of files) {
			yield file;
		}
	}
}

export default findAll;
