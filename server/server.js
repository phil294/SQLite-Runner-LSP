const {
	createConnection,
	TextDocuments,
	DiagnosticSeverity,
	ProposedFeatures,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let has_configuration_capability = false;
let has_workspace_folder_capability = false;
let has_diagnostic_related_information_capability = false;

connection.onInitialize((params) => {
	const capabilities = params.capabilities;

	has_configuration_capability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	has_workspace_folder_capability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	has_diagnostic_related_information_capability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental
		}
	};
	if (has_workspace_folder_capability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (has_configuration_capability) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (has_workspace_folder_capability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

const document_settings = new Map();

connection.onDidChangeConfiguration(change => {
	if (has_configuration_capability) {
		document_settings.clear();
	} else {
		global_settings = change.settings.sqlite_runner_lsp || default_settings;
	}
	documents.all().forEach(validate_text_document);
});

function get_document_settings(resource) {
	if (!has_configuration_capability) {
		return Promise.resolve(global_settings);
	}
	let result = document_settings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'sqlite_runner_lsp'
		});
		document_settings.set(resource, result);
	}
	return result;
}

documents.onDidClose(e => {
	document_settings.delete(e.document.uri);
});

documents.onDidChangeContent(change => {
	validate_text_document(change.document);
});

async function validate_text_document(text_document) {
	const text = text_document.getText();
	const diagnostics = [];

	// Create temp database and SQL file
	const temp_dir = os.tmpdir();
	const temp_db = path.join(temp_dir, `sqlite_lsp_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);
	const temp_sql = path.join(temp_dir, `sqlite_lsp_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);

	try {
		fs.writeFileSync(temp_sql, text);

		// Run sqlite3 CLI
		await new Promise((resolve) => {
			exec(`sqlite3 "${temp_db}" < "${temp_sql}"`, (error, stdout, stderr) => {
				const output = stdout + stderr;

				// Parse errors from output
				// Format: "Parse error near line 231: near "do": syntax error"
				// Format: "Runtime error near line 295: FOREIGN KEY constraint failed (19)"
				const error_regex = /(Parse error|Runtime error) near line (\d+): (.+)/g;
				let match;

				while ((match = error_regex.exec(output)) !== null) {
					const error_type = match[1];
					const line_number = parseInt(match[2]) - 1; // Convert to 0-indexed
					const message = match[3].trim();

					const lines = text.split('\n');
					const line_text = lines[line_number] || '';

					diagnostics.push({
						severity: DiagnosticSeverity.Error,
						range: {
							start: { line: line_number, character: 0 },
							end: { line: line_number, character: line_text.length }
						},
						message: `${error_type}: ${message}`,
						source: 'sqlite-runner'
					});
				}

				resolve();
			});
		});
	} catch (error) {
		// General error
		diagnostics.push({
			severity: DiagnosticSeverity.Error,
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 }
			},
			message: `Error: ${error.message}`,
			source: 'sqlite-runner'
		});
	} finally {
		// Cleanup temp files
		try {
			if (fs.existsSync(temp_db)) fs.unlinkSync(temp_db);
			if (fs.existsSync(temp_sql)) fs.unlinkSync(temp_sql);
		} catch (cleanup_error) {
			// Ignore cleanup errors
		}
	}

	connection.sendDiagnostics({ uri: text_document.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	connection.console.log('We received a file change event');
});

documents.listen(connection);
connection.listen();
