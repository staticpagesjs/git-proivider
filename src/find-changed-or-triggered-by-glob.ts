import { normalize, relative } from 'path/posix';
import micromatch from 'micromatch';

import  { Git } from './git.js';

export namespace findChangedOrTriggeredByGlob {
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
		triggers: Record<string, string | string[] | { (matches: string[]): string[]; }>;
		triggersCwd?: string;
	};
}

const getTriggered = (git: Git, ref: string, tcwd: string, pastCommit: string | undefined, triggers: Record<string, string | string[] | { (matches: string[]): string[]; }>) => {
	const result = new Set<string>();

	let ntcwd = normalize(tcwd).replace(/\\/g, '/');
	if (!ntcwd.endsWith('/')) ntcwd += '/';
	if (ntcwd.startsWith('/')) ntcwd = ntcwd.substring(1);

	let files;
	if (pastCommit) {
		files = git.changedFiles(pastCommit, ntcwd, ref);
	} else {
		files = git.tree(ntcwd, ref);
	}

	for (const srcPattern of Object.keys(triggers)) {
		const filesMatchingSrcPattern = micromatch(files, srcPattern);

		if (filesMatchingSrcPattern.length > 0) {
			const dest = triggers[srcPattern];
			if (typeof dest === 'function') {
				const destPatterns = dest(filesMatchingSrcPattern);
				for (const pattern of destPatterns) {
					result.add(pattern);
				}
			} else if (Array.isArray(dest)) {
				for (const pattern of dest) {
					result.add(pattern);
				}
			} else {
				result.add(dest);
			}
		}
	}
	return [...result];
};

/**
 * Finds files by glob pattern, keeping only those where the
 * modification time is newer than the time provided by `storage.get()` or
 * the file path matches patterns provided by triggering files that are newer.
 */
export async function* findChangedOrTriggeredByGlob({
	repository = '.',
	branch = 'master',
	cwd = '.',
	pattern = '**',
	ignore,
	filter,
	storage,
	triggers,
	triggersCwd = cwd
}: findChangedOrTriggeredByGlob.Options) {
	// normalize cwd
	let ncwd = normalize(cwd).replace(/\\/g, '/');
	if (!ncwd.endsWith('/')) ncwd += '/';
	if (ncwd.startsWith('/')) ncwd = ncwd.substring(1);

	const git = new Git({
		cwd: repository,
	});

	const mmOpts = { ignore };
	const currCommit = git.currentCommit(branch);
	const pastCommit = await storage.get();

	// get file list since previous commit or all files if no previous commit
	if (pastCommit) {
		const files = git.changedFiles(pastCommit, ncwd, branch)
			.map(x => relative(ncwd, x));

		const triggeredPatterns = getTriggered(git, branch, triggersCwd, pastCommit, triggers);

		if (typeof filter === 'function') {
			for (const file of files) {
				if (
					(
						micromatch.isMatch(file, pattern, mmOpts) ||
						micromatch.isMatch(file, triggeredPatterns)
					) &&
					filter(file)
				)
					yield file;
			}
		} else {
			for (const file of files) {
				if (
					micromatch.isMatch(file, pattern, mmOpts) ||
					micromatch.isMatch(file, triggeredPatterns)
				)
					yield file;
			}
		}
	} else {
		const files = git.tree(ncwd, branch)
			.map(x => x.substring(ncwd.length));

		if (typeof filter === 'function') {
			for (const file of files) {
				if (micromatch.isMatch(file, pattern, mmOpts) && filter(file))
					yield file;
			}
		} else {
			for (const file of files) {
				if (micromatch.isMatch(file, pattern, mmOpts))
					yield file;
			}
		}
	}

	storage.set(currCommit);
}

export default findChangedOrTriggeredByGlob;
