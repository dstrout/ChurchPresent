const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const fs = require('fs')

let settings = {}
let modulesEnabled = 0;
let modulesLoaded = 0;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let appWindows = {}

function startLoad() {
	var primaryScreen = electron.screen.getPrimaryDisplay();
	//console.log(primaryScreen.bounds);

	appWindows.loadingWindow = new BrowserWindow({
		backgroundColor: "#5599FF",
		x: primaryScreen.bounds.width / 2 - 400,
		y: primaryScreen.bounds.height / 2 - 300,
		width: 800,
		height: 600,
		frame: false
	});

	appWindows.loadingWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'core/html/loading.html'),
		protocol: 'file:',
		slashes: true
	}));

	appWindows.loadingWindow.webContents.on('did-finish-load', () => {
    	appWindows.loadingWindow.webContents.send('loadStatus', 'Loading settings...');
		loadSettings();
		//setTimeout(loadSettings, 5000);
  	});
}

function loadSettings() {
	settings.controlDisplay = electron.screen.getPrimaryDisplay().id,
	settings.presentDisplay = electron.screen.getPrimaryDisplay().id,

	fs.readFile(path.join(__dirname, 'settings.json'), 'utf8', function(err, settingsFile) {
		appWindows.loadingWindow.webContents.send('loadStatus', 'Getting ready...');

		if (err) {

			console.error('Could not read settings file!');
      app.exit();

		} else {
			//console.log(settingsFile);
			try {
				settings = JSON.parse(settingsFile);
				//console.log(settings);
			} catch (e) {
				console.error("Could not load settings file JSON");
			}

		}

		console.log(settings);

		createWindows();

	});

}

function createWindows() {
	var displays = electron.screen.getAllDisplays();
	//console.log(displays);app.exit();return;

	if (!settings.controlDisplay || !validDisplay(settings.controlDisplay)) {
		settings.controlDisplay = displays[0].id;
	}

	if (!settings.presentDisplay || !validDisplay(settings.presentDisplay)) {
		if (displays.length >= 2) settings.presentDisplay = displays[1].id;
		else settings.presentDisplay = displays[0].id;
	}

	if (settings.controlDisplay && !settings.controlWindow) {

		for (var i = 0; i < displays.length; i++) {

			if (displays[i].id == settings.controlDisplay) {

				thisDisplay = displays[i];
				settings.controlWindow = {
					"x": thisDisplay.workArea.x + 30,
					"y": thisDisplay.workArea.y + 30,
					"w": thisDisplay.workArea.width - 60,
					"h": thisDisplay.workArea.height - 60
				}

			}

		}

	}

	var presentDisplay;

	for (var i = 0; i < displays.length; i++) {

		if (displays[i].id == settings.presentDisplay) {

			presentDisplay = displays[i];

		}

	}

	var controlWindowProperties = {
		show: false,
		icon: path.join(__dirname, 'icon.png'),
		autoHideMenuBar: false,
    minWidth: 1000,
    minHeight: 750,
	};

	if (!settings.controlWindow.maximized) {
		controlWindowProperties.width = settings.controlWindow.w;
		controlWindowProperties.height = settings.controlWindow.h;
		controlWindowProperties.x = settings.controlWindow.x;
		controlWindowProperties.y = settings.controlWindow.y;
	}

	appWindows.controlWindow = new BrowserWindow(controlWindowProperties);

	if (settings.controlWindow.maximized) {
		appWindows.controlWindow.maximize();
	}

	appWindows.controlWindow.setMenu(null);

	// and load the index.html of the app.
	appWindows.controlWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'core/html/index.html'),
		protocol: 'file:',
		slashes: true
	}))

	// Emitted when the window is closed.
	appWindows.controlWindow.on('close', callItADay);

	appWindows.controlWindow.on('minimize', function () {
		appWindows.presentWindow.hide()
	});
	appWindows.controlWindow.on('restore', function () {
		appWindows.presentWindow.show()
		appWindows.controlWindow.focus()
	});



	appWindows.controlWindow.webContents.once('did-finish-load', () => {
		appWindows.controlWindow.webContents.openDevTools();
  	appWindows.loadingWindow.webContents.send('loadStatus', 'Controller ready, starting presenter...');

		appWindows.presentWindow = new BrowserWindow({
			x: presentDisplay.workArea.x,
			y: presentDisplay.workArea.y,
			show: false,
			skipTaskbar: true,
			autoHideMenuBar: true,
		})
		appWindows.presentWindow.setMenu(null);
		appWindows.presentWindow.loadURL(url.format({
			pathname: path.join(__dirname, 'core/html/present.html'),
			protocol: 'file:',
			slashes: true,
			frame: false
		}));
		appWindows.presentWindow.on('close', nope);
		appWindows.presentWindow.on('minimize', function(e) {
			e.preventDefault();
			appWindows.presentWindow.restore();
			appWindows.presentWindow.focus();
			appWindows.presentWindow.setMenu(null);
			return false;
		});

		appWindows.presentWindow.webContents.once('did-finish-load', () => {
			//appWindows.presentWindow.on('close', function(){return false;});
			appWindows.presentWindow.webContents.openDevTools();
			settings.modules.forEach(function(module) {
				if (module.enabled) modulesEnabled++;
			});
			appWindows.loadingWindow.webContents.send('loadStatus', 'Core ready, loading modules (0/'+modulesEnabled+')...');
			appWindows.controlWindow.webContents.send('windowsReady', JSON.stringify(settings));
		});

  });

	handleMessaging();
}

function handleMessaging() {

	electron.ipcMain.on('present-load', (event, module, moduleSettings) => {
		console.log('Received request from control to load '+module+' module');
		appWindows.presentWindow.webContents.send('load-module', module, moduleSettings);
	});

	electron.ipcMain.on('present-loaded', (event, module, response) => {
		console.log('Present says '+module+' module loaded with this info: '+response);
		appWindows.controlWindow.webContents.send('present-loaded:'+module, response);
		modulesLoaded++;
		appWindows.loadingWindow.webContents.send('loadStatus', 'Core ready, loading modules ('+modulesLoaded+'/'+modulesEnabled+')...');
	});

	electron.ipcMain.on('present-load-failed', (event, module, error) => {
		console.error('Present says '+module+' module failed to load with this info: '+error);
		appWindows.controlWindow.webContents.send('present-load-failed:'+module, error);
		modulesLoaded++;
		appWindows.loadingWindow.webContents.send('loadStatus', 'Core ready, loading modules ('+modulesLoaded+'/'+modulesEnabled+')...');
	});

	electron.ipcMain.on('modules-loaded', (event) => {
		console.log('Control says all modules loaded');

		appWindows.controlWindow.show();
		appWindows.controlWindow.focus();

		appWindows.presentWindow.show();
		appWindows.presentWindow.setFullScreen(true);
		appWindows.presentWindow.setAlwaysOnTop(true);

		appWindows.loadingWindow.close();
		appWindows.loadingWindow = null;

		appWindows.controlWindow.focus();
	});

	electron.ipcMain.on('open-control-inspector', (event) => {
		appWindows.controlWindow.webContents.openDevTools();
	});

	electron.ipcMain.on('open-present-inspector', (event) => {
		appWindows.presentWindow.webContents.openDevTools();
	});

  electron.ipcMain.on('directory-dialog', (event, defaultPath, title) => {
    var dialogOptions = {
      title: 'Select a directory',
      properties: ['openDirectory'],
    };
    if (title) dialogOptions.title = title;
    if (fs.existsSync(defaultPath)) dialogOptions.defaultPath = defaultPath;

    event.returnValue = electron.dialog.showOpenDialog(appWindows.controlWindow, dialogOptions);
  });

  electron.ipcMain.on('file-open-dialog', (event, defaultPath, title) => {
    var dialogOptions = {};
    if (title) dialogOptions.title = title;
    if (fs.existsSync(defaultPath)) dialogOptions.defaultPath = defaultPath;

    event.returnValue = electron.dialog.showOpenDialog(appWindows.controlWindow, dialogOptions);
  });

  electron.ipcMain.on('file-save-dialog', (event, defaultPath, title) => {
    var dialogOptions = {};
    if (title) dialogOptions.title = title;
    if (defaultPath && fs.existsSync(defaultPath)) dialogOptions.defaultPath = defaultPath;

    event.returnValue = electron.dialog.showSaveDialog(appWindows.controlWindow, dialogOptions);
  });

  electron.ipcMain.on('basic-dialog', (event, title, message, type, actions) => {
    var dialogOptions = {
      'title': title,
      'message': message,
      'buttons': actions,
      'type': type,
    };

    event.returnValue = electron.dialog.showMessageBox(appWindows.controlWindow, dialogOptions);
  });

  electron.ipcMain.on('program-data', (event, program) => {
    appWindows.presentWindow.webContents.send('program-data', program);
  });

}

function validDisplay(displayId) {
	var displays = electron.screen.getAllDisplays();
	var valid = false;
	displays.forEach(function(display) {
		if (display.id == displayId) valid = true;
	});
	return valid;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', startLoad);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		//app.exit()
	}
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
});

function writeSettings() {
	fs.writeFile(path.join(__dirname, 'settings.json'), JSON.stringify(settings, null, '    ') + "\n", function(){})
}

function nope(e) {
	if (e) e.preventDefault();
	return false;
}

function callItADay() {
	// Dereference the window object, usually you would store windows
	// in an array if your app supports multi windows, this is the time
	// when you should delete the corresponding element.
	if (appWindows.controlWindow.isMaximized()) {
		settings.controlWindow = { 'maximized': true };
	} else {
		var controlWindow = appWindows.controlWindow.getBounds();
		settings.controlWindow = {};
		settings.controlWindow.x = controlWindow.x;
		settings.controlWindow.y = controlWindow.y;
		settings.controlWindow.w = controlWindow.width;
		settings.controlWindow.h = controlWindow.height;
	}
	//console.log(settings);
	writeSettings();

	appWindows.controlWindow = null
	appWindows.presentWindow.destroy()
	appWindows.presentWindow = null

	app.exit();
}
