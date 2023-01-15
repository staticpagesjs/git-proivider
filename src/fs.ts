import { Git } from './git';

type CommonOptions = {
	repository?: string;
	branch?: string;
	cwd?: string;
};

export function fs({
	repository = '.',
	branch = 'master',
	cwd = '.',
	message,
	authorName = 'anonymous',
	authorEmail = 'anonymous@example.com',
	commiterName = authorName,
	commiterEmail = authorEmail,
}: {
	repository?: string;
	branch?: string;
	cwd?: string;
	message?: string;
	authorName?: string;
	authorEmail?: string;
	commiterName?: string;
	commiterEmail?: string;
}) {
	const git = new Git({
		GIT_DIR: repository,
		GIT_AUTHOR_NAME: authorName,
		GIT_AUTHOR_EMAIL: authorEmail,
		GIT_COMMITTER_NAME: commiterName,
		GIT_COMMITTER_EMAIL: commiterEmail,
	});

	return {
		history(path: string) {
		},

		restore(path: string, commit: string) {
		},

		readDir(path: string, {
			recursive = false,
			stats = false,
		}: {
			recursive?: boolean;
			stats?: boolean;
		}) {

		},

		readFile(path: string) {

		},

		writeFile(path: string, contents: string | NodeJS.ArrayBufferView, {
			message,
			authorName = 'anonymous',
			authorEmail = 'anonymous@example.com',
			commiterName = authorName,
			commiterEmail = authorEmail,
		}: {
			message?: string;
			authorName?: string;
			authorEmail?: string;
			commiterName?: string;
			commiterEmail?: string;
		}) {

		},

		remove(path: string, {
			message,
			authorName = 'anonymous',
			authorEmail = 'anonymous@example.com',
			commiterName = authorName,
			commiterEmail = authorEmail,
		}: {
			message?: string;
			authorName?: string;
			authorEmail?: string;
			commiterName?: string;
			commiterEmail?: string;
		}) {

		},

		move(oldpath: string, newpath: string, {
			message,
			authorName = 'anonymous',
			authorEmail = 'anonymous@example.com',
			commiterName = authorName,
			commiterEmail = authorEmail,
		}: {
			message?: string;
			authorName?: string;
			authorEmail?: string;
			commiterName?: string;
			commiterEmail?: string;
		}) {

		},

		batch(actions: ({
			path: string;
		} & ({
			action: 'write';
			contents: string | NodeJS.ArrayBufferView;
		} | {
			action: 'remove';
		} | {
			action: 'move';
			destination: string;
		}))[], {
			message,
			authorName = 'anonymous',
			authorEmail = 'anonymous@example.com',
			commiterName = authorName,
			commiterEmail = authorEmail,
		}: {
			message?: string;
			authorName?: string;
			authorEmail?: string;
			commiterName?: string;
			commiterEmail?: string;
		}) {

		}
	};
}
