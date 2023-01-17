import { normalize, relative } from 'path/posix';
import micromatch from 'micromatch';

import  { Git } from './git.js';

export namespace findChangedByGlob {
	export type Options = {
		repository?: string;
		branch?: string;
		cwd?: string;
		pattern?: string | string[];
		ignore?: string | string[];
		filter?(file: string): boolean;
		storage: {
			get(): string | undefined | Promise<string | undefined>;
			set(commit: string): void;
		};
	};
}

/**
 * Finds files by glob pattern in a git repository, keeping only those where the
 * file is modified since the commit provided by `storage.get()`.
 */
export async function* findChangedByGlob({
	repository = '.',
	branch = 'master',
	cwd = '.',
	pattern = '**',
	ignore,
	filter,
	storage
}: findChangedByGlob.Options) {
	// normalize cwd
	let ncwd = normalize(cwd).replace(/\\/g, '/');
	if (!ncwd.endsWith('/')) ncwd += '/';
	if (ncwd.startsWith('/')) ncwd = ncwd.substring(1);

	const git = new Git({
		env: {
			GIT_DIR: repository,
		}
	});

	const mmOpts = { ignore };
	const currCommit = git.currentCommit(branch);
	const pastCommit = await storage.get();

	// get file list since previous commit or all files if no previous commit
	let files;
	if (pastCommit) {
		files = git.changedFiles(pastCommit, ncwd, branch);
	} else {
		files = git.tree(ncwd, branch);
	}

	// make files relative to cwd
	files = files.map(x => relative(ncwd, x));

	if (typeof filter === 'function') {
		for (const file of files) {
			if (micromatch.isMatch(file, pattern, mmOpts) && filter(file)) yield file;
		}
	} else {
		for (const file of files) {
			if (micromatch.isMatch(file, pattern, mmOpts)) yield file;
		}
	}
	storage.set(currCommit);
}

export default findChangedByGlob;
