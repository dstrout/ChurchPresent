let settings = null;
let modules = [];
let moduleList = [];
let electron = nodeRequire('electron');
let loading = [];

nodeRequire('electron').ipcRenderer.on('windowsReady', (event, message) => {
	settings = JSON.parse(message);
	console.log(settings);
	loadModules();
});

/*window.onload = function() {
	const ElectronTitlebarWindows = nodeRequire('electron-titlebar-windows');
	const titlebar = new ElectronTitlebarWindows({
		draggable: true,
		color: 'black',
	});
	titlebar.appendTo(document.getElementById('titlebar'));
}*/

function loadModules() {
	//var loading = [];
	settings.modules.forEach(function(module) {
		if (module.enabled) {
			console.log('Loading '+module.name+' control module');
			modules[module.name] = nodeRequire('../../present_modules/'+module.name+'/control.js');
			moduleList.push(module.name);
			loading[loading.length] = modules[module.name].load(module.settings);
			loading[loading.length] = loadPresentModule(module);
		}
	});

	// No need for a reject catcher - the main process and loading window will kill execution at that point
	Promise.all(loading).then(function() {
		electron.ipcRenderer.send('modules-loaded');
	});
}

function loadPresentModule(module) {
	console.log('Loading '+module.name+' present module');
	electron.ipcRenderer.send('present-load', module.name, JSON.stringify(module.settings));
	return new Promise(function(resolve, reject) {
		electron.ipcRenderer.on('present-loaded:'+module.name, (event, response) => {
	  		resolve(response);
		});
		electron.ipcRenderer.on('present-load-failed:'+module.name, (event, response) => {
	  		reject(response);
		});
	});
}
