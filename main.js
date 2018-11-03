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

function loadSettings() {
	console.log(electron.screen.getAllDisplays());
	app.exit();return;
	settings.controlDisplay = electron.screen.getPrimaryDisplay().id,
	settings.presentDisplay = electron.screen.getPrimaryDisplay().id,

	fs.readFile(path.join(__dirname, 'settings.json'), 'utf8', function(err, settingsFile) {

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
	var primaryScreen = electron.screen.getPrimaryDisplay();
	//console.log(primaryScreen.bounds);

	appWindows.loadingWindow = new BrowserWindow({
		backgroundColor: "#5599FF",
		x: primaryScreen.bounds.width / 2 - 400,
		y: primaryScreen.bounds.height / 2 - 300,
		width: 800,
		height: 600,
		frame: false
	})

	appWindows.loadingWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'loading.html'),
		protocol: 'file:',
		slashes: true
	}))

	if (settings.controlDisplay && !settings.controlWindow) {

		for (var i = 0; i < displays.length; i++) {

			if (displays[i].id == settings.controlDisplay) {

				thisDisplay = displays[i];
				settings.controlWindow = {
					"x": thisDisplay.workArea.x + 20,
					"y": thisDisplay.workArea.y + 20,
					"w": thisDisplay.workArea.width - 40,
					"h": thisDisplay.workArea.height - 40
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
		y: settings.controlWindow.y - 28,
		show: false,
		icon: path.join(__dirname, 'icon.png')
	})

	// and load the index.html of the app.
	appWindows.controlWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}))

	/* appWindows.controlWindow.once('ready-to-show', () => {
		appWindows.loadingWindow.close()
		appWindows.loadingWindow = null
		appWindows.controlWindow.show()
		appWindows.presentWindow.show()
		//console.log(appWindows.controlWindow.getBounds());
	}) */

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()

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

	appWindows.presentWindow = new BrowserWindow({
		x: presentDisplay.workArea.x + 10,
		y: presentDisplay.workArea.y + 10,
		show: false,
		skipTaskbar: true
	})
	appWindows.presentWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'present.html'),
		protocol: 'file:',
		slashes: true
	}))

	appWindows.presentWindow.show();appWindows.presentWindow.setFullScreen(true);appWindows.presentWindow.setAlwaysOnTop(true);
	appWindows.loadingWindow.close();appWindows.loadingWindow = null;appWindows.controlWindow.show();appWindows.controlWindow.focus();

	handleMessaging();
}

function handleMessaging() {

	electron.ipcMain.on('control.request', (event, msg) => {
		//console.log(arg)  // prints "ping"
		//event.returnValue = ''

		if (msg == "settings") event.returnValue = JSON.stringify(settings);
		if (msg == "fonts") event.returnValue = JSON.stringify(getFonts());
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

function getFonts() {
	var spawn = require( 'child_process' ).spawnSync;
	var fonts = spawn( 'fc-list' );
	var fontList = fonts.stdout.toString().split("\n");
	var fontArray = {};
	var styles = [];
	var styleWeights = {
		"thin": '100',
		"extralight": '200',
		"light": '300',
		"regular": '400',
		"medium": '500',
		"semibold": '600',
		"bold": '700',
		"extrabold": '800',
		"black": '900',
		"italic": '400i',
		'100': '100',
		'100i': '100i',
		'200': '200',
		'200i': '200i',
		'300': '300',
		'300i': '300i',
		'400': '400',
		'400i': '400i',
		'500': '500',
		'500i': '500i',
		'600': '600',
		'600i': '600i',
		'700': '700',
		'700i': '700i',
		'800': '800',
		'800i': '800i',
		'900': '900',
		'900i': '900i',
		'italic': '400i',
		'normal': '400',
		'standard': '400'
	}
	var noStyleMatch = [];
	var noStyleMatchWithNames = [];
	for (var i=0; i<fontList.length; i++) {
		if (fontList[i].indexOf(':') == -1) continue;

		var thisFont = fontList[i].split(':');
		var fontName = thisFont[1].split(',')[0].trim();
		if (!fontArray[fontName]) fontArray[fontName] = [];

		var styles = thisFont[2].split('style=')[1].split(',');
		for (var j=0; j<styles.length; j++) {
			var thisStyle = styles[j].toString().toLowerCase().trim();
			if (thisStyle == 'italic' || thisStyle == 'oblique' || thisStyle == 'slanted') thisStyle = 'regular italic';
			var italic = '';
			if (thisStyle.indexOf('italic') != -1 || thisStyle.indexOf('oblique') != -1 || thisStyle.indexOf('slanted') != -1) italic = 'i';
			var weight = styleWeights[
				thisStyle.replace(/\-/g, '').replace(/ /g, '').replace('italic', '').replace('slanted', '').replace('oblique', '').trim()
			];
			if (!weight) {
				if (noStyleMatch.indexOf(thisStyle) == -1) {
					noStyleMatch.push(thisStyle);
					noStyleMatchWithNames.push(fontName+': '+thisStyle);
				}
				continue;
			}
			weight += italic;

			if (fontArray[fontName].indexOf(weight.toString()) == -1)
				fontArray[fontName].push(weight.toString());

			if (styles.indexOf(weight) == -1) styles[styles.length] = weight;
		}
	}

	return fontArray;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', loadSettings);

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
