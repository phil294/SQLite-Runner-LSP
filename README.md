# SQLite Runner LSP

A very simple VSCode extension (and LSP) that validates SQL files by running them against a temporary SQLite database in real-time.

## Usage

1. You need to have `sqlite3` as a global executable available in your `$PATH`.
1. Open any `.sql` or `.sqlite` file (they will be recognized as `sqlite` language)
1. Start writing SQL statements
1. Errors will appear inline as you type

Each validation run creates a fresh temporary database, so you can test `CREATE TABLE` statements and other DDL without conflicts.

There are no configurable options.

## Development for VSCode extension

Run `npm i` and then launch `Client + Server`
