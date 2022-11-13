# Static Pages / Git IO

This package provides a reader which parses objects from a git repository to an AsyncIterable document stream, and a writer that renders documents into git repository objects. Additional utilities also available in this package to find, filter and parse documents. Compatible with standard and bare repositories. Git must be installed and available from the PATH.


## Reader

The `reader` is an abstract factory that creates an AsyncIterable.

### Usage
```js
import * as git from '@static-pages/gitio';

const asyncIterable = file.reader({
  repository: '/path/to/repository.git',
  branch: 'my-branch',
  mode: git.findByGlob,
  cwd: 'pages',
  pattern: '**/*.json',
  ignore: '**/ignored-file*',
  parser: git.parseHeader(
    body => JSON.parse(body.toString())
  ),
});

// one example source file:
// # /path/to/repository.git >>> my-branch:pages/my/folder/file.json
// {"hello":"world"}

// one item in the asyncIterable:
// {
//   header: {
//     commit: {
//       hash: '07a9be0276679c344d2129a4dba2ef63a1507125',
//       abbrev: '07a9be0',
//       authorName: 'The Author',
//       authorEmail: 'the-author@example.com',
//       authorDate: '2022-10-12T17:14:16.000Z',
//       commiterName: 'The Committer',
//       commiterEmail: 'the-committer@example.com',
//       committerDate: '2022-11-15T20:11:12.000Z'
//     },
//     repository: '/path/to/repository.git',
//     branch: 'my-branch',
//     cwd: 'pages',
//     path: 'my/folder/file.json',
//     dirname: 'my/folder',
//     basename: 'file',
//     extname: '.json'
//   },
//   hello: 'world'
// }
```

### Utilities for the reader

To specify the exact implementation of the reader you can set `options.mode` to one of the following file listing provider:

- `findAll` is a simple recursive directory lister, it will collect all files in the specified directory.
- `findByGlob` (default) is a glob matcher which will collect all files matching a given pattern.
- `findChangedByGlob` is a glob matcher that filters the newly committed files only.
- `findChangedOrTriggeredByGlob` is the same as `findChangedByGlob` with the addition of a triggering mechanism: You can specify file relations between glob patterns. When a file matches a pattern and it is a newly committed file, it can 'trigger' another file, meaning that file will be included in the result.

Parsing the file contents to an understandable document is another task of the reading process. At this parsing step, a header may be added to the document to help tracking of the source file.

- `parseHeader` captures the filename of the iterated file and creates a `header` object enriched with git commit information (see reader usage example).


## Writer

The `writer` is a factory that creates a writer function. 

### Usage
```js
import * as git from '@static-pages/gitio';

// setup a new writer
const write = git.writer({
  repository: '/path/to/repository.git',
  branch: 'my-branch',
  authorName: 'The Author',
  authorEmail: 'the-author@example.com',
  message: 'My Commit Message.',
  cwd: 'dist',
  namer: [
    git.nameByUrl,
    git.nameByHeader,
    () => { throw new Error('Cant name document.'); }
  ],
  renderer: d => d.body,
});

const pageData = {
  url: 'folder/file',
  body: '[file contents]',
};

// writes to 'dist/folder/file.html'
write(pageData);

// creates a commit from the writes
write.teardown();
```
### Utilities for the writer

There are two helper functions for output naming.

- `nameByHeader` tries to extract `header.path` and replace its extension to `.html`.
- `nameByUrl` tries to use the `url` property and appends a `.html` to it.


## Docs

### __`reader(options: reader.Options): AsyncIterable<Record<string, unknown>>`__

Reads documents from a specified branch of a git repository. The base implementation is specified by the `mode` option, depending on that setting the available options may change.

#### `options`
- `repository` (default: `.`) sets the git repository path.
- `branch` (default: `master`) sets the branch of the targeted repository.
- `cwd` (default: `pages`) sets the current working directory inside the targeted repository.
- `mode` (default: `findByGlob`) a factory that provides an iterable or an async iterable file list, eg. `findByGlob` or `findAll`. The reader will iterate over this file list when reading the files into documents. The factory will recieve all `options` set on the `reader`, so changing the value of the `mode` may change how you need to parameterize the `reader`.
- `parser` (required) a function that recieves the file contents as a `Buffer` and produces a `Record<string, unknown>` document. Call `buffer.toString()` to convert the buffer to an utf8 string.
- `onError` (default: `(e) => { console.error(e); }`) an error handler that gets called when something throws while reading and parsing the files. Set it to `(e) => { throw e; }` to completely halt the iteration.


### __`findAll(options: findAll.Options): Iterable<string>`__

Generates an iterable list of all existing files in a directory. The file paths are relative paths.

Use this function as a value for the `mode` property of the `reader`.

#### `options`
- `repository` (default: `.`) sets the git repository path.
- `branch` (default: `master`) sets the branch of the targeted repository.
- `cwd` (default: `.`) sets the current working directory inside the targeted repository.
- `filter` (default: `undefined`) a callback function that gets called on every file name. Return `true` to keep that filename.


### __`findByGlob(options: findByGlob.Options): Iterable<string>`__

Generates an iterable list of files matching a pattern. The file paths are relative paths. See the file reader example.

Use this function as a value for the `mode` property of the `reader`.

#### `options`
- `repository` (default: `.`) sets the git repository path.
- `branch` (default: `master`) sets the branch of the targeted repository.
- `cwd` (default: `.`) sets the current working directory inside the targeted repository.
- `pattern` (default: `**`) glob pattern(s) that selects the files to read. Can be a `string` or a `string` array.
- `ignore` (default: `undefined`) glob pattern(s) that selects the files to ignore. Can be a `string` or a `string` array.
- `filter` (default: `undefined`) a callback function that gets called on every file name. Return `true` to keep that filename.


### __`findChangedByGlob(options: findChangedByGlob.Options): AsyncIterable<string>`__

Decorates the `findByGlob` mode, adding capability to ignore files that does not changed since a given commit. This commit is retrieved by `storage.get()` and when the iteration is done the `storage.set(commit)` is called to preserve the most recent commit hash.

Use this function as a value for the `mode` property of the `reader`.

#### `options`
- `repository` (default: `.`) sets the git repository path.
- `branch` (default: `master`) sets the branch of the targeted repository.
- `cwd` (default: `.`) sets the current working directory inside the targeted repository.
- `pattern` (default: `**`) glob pattern(s) that selects the files to read. Can be a `string` or a `string` array.
- `ignore` (default: `undefined`) glob pattern(s) that selects the files to ignore. Can be a `string` or a `string` array.
- `filter` (default: `undefined`) a callback function that gets called on every file name. Return `true` to keep that filename.
- `storage` (required) an object with `get()` and `set()` members to store and retrieve commit hashes.


### __`findChangedOrTriggeredByGlob(options: findChangedOrTriggeredByGlob.Options): AsyncIterable<string>`__

Decorates the `findByGlob` mode, adding capability to ignore files that does not changed since a given commit. This commit is retrieved by `storage.get()` and when the iteration is done the `storage.set(commit)` is called to preserve the most recent commit hash. Additionally you must provide a pattern map which describes file relations, eg.: when a file is modified and matches a pattern like `abc*.yaml`, we want to keep the files in the iterable that matches `efg*.md`.

Use this function as a value for the `mode` property of the `reader`.

#### `options`
- `repository` (default: `.`) sets the git repository path.
- `branch` (default: `master`) sets the branch of the targeted repository.
- `cwd` (default: `.`) sets the current working directory inside the targeted repository.
- `pattern` (default: `**`) glob pattern(s) that selects the files to read. Can be a `string` or a `string` array.
- `ignore` (default: `undefined`) glob pattern(s) that selects the files to ignore. Can be a `string` or a `string` array.
- `filter` (default: `undefined`) a callback function that gets called on every file name. Return `true` to keep that filename.
- `storage` (required) an object with `get()` and `set()` members to store and retrieve commit hashes.
- `triggers` (required) an object where the keys and values are glob patterns which defines relations between files. When key matches a modified or new file, all files will be filtered in the result that matches the value.


### __`parseHeader<R extends Record<string, unknown>>(bodyParser?: { (body: Buffer, file: string, options: Record<string, unknown>): R; }): { (body: Buffer, file: string, options: Record<string, unknown>): R; }`__

Helper to parse the full file path into a header segment with additional information about the commit. See the file reader example.

The returned document contains these properties:
- `data.header.commit.hash` is the current commit hash.
- `data.header.commit.abbrev` is the current commit hash abbreviated.
- `data.header.commit.authorName` is the name of the author of the commit.
- `data.header.commit.authorEmail` is the email of the author of the commit.
- `data.header.commit.authorDate` is the date when the author submitted their work.
- `data.header.commit.commiterName` is the name of the committer.
- `data.header.commit.commiterEmail` is the email of the committer.
- `data.header.commit.committerDate` is the date when the committer saved their commit.
- `data.header.repository` is the absolute path of the git repository.
- `data.header.cwd` is the current working directory inside the git repository.
- `data.header.path` is the file path relative to the `cwd`.
- `data.header.dirname` is equivalent to `dirname(path)`.
- `data.header.basename` is equivalent to `basename(path, extname)`.
- `data.header.extname` is equivalent to `extname(path)`.

#### `bodyParser`
Callback function to parse the contents of the file. Eg. a json file should use `d => JSON.parse(d.toString())`.  
This function can be sync or async; the `parseHeader` returns a sync function when the `bodyParser` is sync, and returns an async function when `bodyParser` is async.
Default: return the unchanged buffer in a property named `body`.


### __`writer(options: writer.Options): { (data: Record<string, unknown>): void }`__

Writes documents to a specified branch of a git repository.

#### `options`
- `repository` (default: `.`) sets the git repository path.
- `branch` (default: `master`) sets the branch of the targeted repository.
- `cwd` (default: `.`) sets the current working directory inside the targeted repository.
- `namer` (default: `[nameByUrl, nameByHeader, throw error]`) a callback (async or sync) that generates a file name for the output. It can be a function or an array of functions.
- `renderer` (required) a callback (async or sync) that generates the file contents. It can return a `string`, a `NodeJS.ArrayBufferView` or `void`. In the latter case, the writing is omitted.
- `onError` (default: `(e) => { console.error(e); }`) an error handler that gets called when something throws while rendering and writing the files.


### __`nameByHeader(data: Record<string, unknown>): string | void`__

Tries to name output files the same as the input was. Replaces the original filename extension to `.html`.

Use this function as a value for the `namer` property of the `writer`.

### __`nameByUrl(data: Record<string, unknown>): string | void`__

Tries to name output files by the `url` property of the document. Appends `.html` extension to it.

Use this function as a value for the `namer` property of the `writer`.


### Other notes

- Windows style backslashes are always normalized to Unix style forward slashes in paths.


## Where to use this?
This module can be used to generate static HTML pages from/to file based sources. Read more at the [Static Pages JS project page](https://staticpagesjs.github.io/).
