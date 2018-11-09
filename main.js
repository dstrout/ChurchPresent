const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const fs = require('fs')

let settings = {}

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

		} else {
			console.log(settingsFile);
			try {
				settings = JSON.parse(settingsFile);
				console.log(settings);
			} catch (e) {
				console.error("Could not load settings file JSON");
			}

		}

		//console.log(settings);

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

	appWindows.controlWindow = new BrowserWindow({
		width: settings.controlWindow.w,
		height: settings.controlWindow.h,
		x: settings.controlWindow.x,
		y: settings.controlWindow.y,
		show: false,
		icon: path.join(__dirname, 'icon.png'),
		autoHideMenuBar: false
	})

	appWindows.controlWindow.setMenu(null);

	// and load the index.html of the app.
	appWindows.controlWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'core/html/index.html'),
		protocol: 'file:',
		slashes: true
	}))

	// Emitted when the window is closed.
	appWindows.controlWindow.on('close', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		var controlWindow = appWindows.controlWindow.getBounds();
		settings.controlWindow.x = controlWindow.x;
		settings.controlWindow.y = controlWindow.y;
		settings.controlWindow.width = controlWindow.width;
		settings.controlWindow.height = controlWindow.height;
		console.log(settings);

		fs.writeFile(path.join(__dirname, 'settings.json'), JSON.stringify(settings, null, '    ') + "\n", function(){})

		appWindows.controlWindow = null
		appWindows.presentWindow.destroy()
		appWindows.presentWindow = null

		app.exit();
	})
	appWindows.controlWindow.on('minimize', function () {
		appWindows.presentWindow.hide()
	})
	appWindows.controlWindow.on('restore', function () {
		appWindows.presentWindow.show()
		appWindows.controlWindow.focus()
	})



	appWindows.controlWindow.webContents.once('did-finish-load', () => {
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
			pathname: path.join(__dirname, 'core/present.html'),
			protocol: 'file:',
			slashes: true,
			frame: false
		}))

		appWindows.presentWindow.webContents.once('did-finish-load', () => {
			appWindows.loadingWindow.webContents.send('loadStatus', 'Presenter ready, loading modules (0/'+settings.modules.length+')...');
		});
  	});

	//appWindows.presentWindow.show();appWindows.presentWindow.setFullScreen(true);appWindows.presentWindow.setAlwaysOnTop(true);
	//appWindows.loadingWindow.close();appWindows.loadingWindow = null;appWindows.controlWindow.show();appWindows.controlWindow.focus();
	//appWindows.controlWindow.webContents.openDevTools()

	//handleMessaging();
}

function handleMessaging() {

	electron.ipcMain.on('control.request', (event, msg) => {
		//console.log(arg)  // prints "ping"
		//event.returnValue = ''

		if (msg == "settings") event.returnValue = JSON.stringify(settings);
		if (msg == "fonts") event.returnValue = '';
		if (msg == "showMenu") {
			var menu = electron.Menu.buildFromTemplate([
				{"label": "Test"}
			]);
			menu.popup(appWindows.controlWindow, {async: false});
			menu.closePopup();
			event.returnValue = '';
		}

	});

	electron.ipcMain.on('control.showMenu', (msgEvent, msg) => {

		var srcMenuItems = JSON.parse(msg);
		var menuItems = [];
		for (var i=0; i<srcMenuItems.length; i++) {
			var thisItem = srcMenuItems[i];
			if (thisItem.label == "---") menuItems.push({"type": "separator"});
			else {
				menuItems.push({
					click: function(menuItem){msgEvent.sender.send('menuAction', menuItem.actionName);console.log(menuItem);},
					"label": thisItem.label,
					"actionName": thisItem.action
				});
			}
		}
		console.log(menuItems);
		var menu = electron.Menu.buildFromTemplate(menuItems);
		menu.popup(appWindows.controlWindow, {async: true});
		//menu.closePopup();
		msgEvent.returnValue = '';

	});

	electron.ipcMain.on('control.presentRender', (msgEvent, msg) => {
		appWindows.presentWindow.send('renderProgram');
		msgEvent.returnValue = '';
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
})
