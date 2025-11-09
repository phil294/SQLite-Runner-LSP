const path = require('path');
const { workspace, window } = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');

let client;

function activate(context) {
	const server_module = context.asAbsolutePath(path.join('server', 'server.js'));

	const debug_options = { execArgv: ['--nolazy', '--inspect=6009'] };

	const server_options = {
		run: { module: server_module, transport: TransportKind.ipc },
		debug: {
			module: server_module,
			transport: TransportKind.ipc,
			options: debug_options
		}
	};

	const client_options = {
		documentSelector: [
			{ scheme: 'file', language: 'sql' },
			{ scheme: 'file', pattern: '**/*.sqlite' }
		],
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	client = new LanguageClient(
		'sqlite_runner_lsp',
		'SQLite Runner LSP',
		server_options,
		client_options
	);

	client.start();
}

function deactivate() {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

module.exports = {
	activate,
	deactivate
};
