# SQLite Runner LSP

A very simple VSCode extension (and LSP) that validates SQL files by running them against a temporary SQLite database in real-time.

![demo showing parse error and syntax error](./demo/main.png)

## Install

From the [VSCode Marketplace here](https://marketplace.visualstudio.com/items?itemName=phil294.sqlite-runner-lsp) or from [Open VSIX here](https://open-vsx.org/extension/phil294/sqlite-runner-lsp).

## Usage

1. You need to have `sqlite3` as a global executable available in your `$PATH`.
1. Open any `.sql` or `.sqlite` file
1. Start writing SQL statements
1. Errors will appear inline as you type

Each validation run creates a fresh temporary database, so you can test `CREATE TABLE` statements and other DDL without conflicts.

There are no configurable options.

## Development for VSCode extension

Run `npm i` and then launch `Client + Server`
