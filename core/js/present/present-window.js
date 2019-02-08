let modules = [];
let electron = nodeRequire('electron');
let ipcRenderer = electron.ipcRenderer;

ipcRenderer.on('load-module', (event, module, moduleSettings) => {
		modules[module] = nodeRequire('../../present_modules/'+module+'/present.js');
		modules[module].load(moduleSettings).then(function(success) {
			ipcRenderer.send('present-loaded', module, success);
		}, function(error) {
			ipcRenderer.send('present-load-failed', module, error);
		});
});

$(document).on('keyup', function(e) {
	if (e.keyCode == 73 && e.ctrlKey && e.shiftKey) {
		electron.ipcRenderer.send('open-present-inspector');
	}
});
