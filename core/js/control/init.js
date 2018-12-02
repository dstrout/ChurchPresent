let settings = null;
let modules = [];
let electron = nodeRequire('electron');
let loading = [];

nodeRequire('electron').ipcRenderer.on('windowsReady', (event, message) => {
	settings = JSON.parse(message);
	loadModules();
});

function loadModules() {
	//var loading = [];
	settings.modules.forEach(function(module) {
		if (module.enabled) {
			console.log('Loading '+module.name+' control module');
			modules[module.name] = nodeRequire('../../present_modules/'+module.name+'/control.js');
			loading[loading.length] = modules[module.name].load();
			loading[loading.length] = loadPresentModule(module.name);
		}
	});

	// No need for a reject catcher - the main process and loading window will kill execution at that point
	Promise.all(loading).then(function() {
		electron.ipcRenderer.send('modules-loaded');
	});
}

function loadPresentModule(module) {
	console.log('Loading '+module+' present module');
	electron.ipcRenderer.send('present-load', module);
	return new Promise(function(resolve, reject) {
		electron.ipcRenderer.on('present-loaded:'+module, (event, response) => {
	  	resolve(response);
		});
		electron.ipcRenderer.on('present-load-failed:'+module, (event, response) => {
	  	reject(response);
		});
	});
}
