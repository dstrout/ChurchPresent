
var presenter;
var $p;
var ipcRenderer = nodeRequire('electron').ipcRenderer;
var settings = JSON.parse(ipcRenderer.sendSync('control.request', 'settings'));
var fonts = JSON.parse(ipcRenderer.sendSync('control.request', 'fonts'));

const mysql = nodeRequire('electron').remote.require('mysql');
var db = mysql.createConnection({
	'host': settings.db.host,
	'user': settings.db.user,
	'password': settings.db.pass,
	'database': settings.db.database
})

db.connect(function(err) {
	if (err) console.log(err);
});

const nodeRequest = nodeRequire('electron').remote.require('request');

$(function() {
	
	
	
});

var menuElem;
function showMenu(menu, elem) {
	menuElem = elem;
	
	var menuItems = [];
	jQuery.each(menu, function(label, action) {
		menuItems.push({"label": label, "action": action.name})
	});
	console.log(menuItems);
	ipcRenderer.send('control.showMenu', JSON.stringify(menuItems));
}

ipcRenderer.on('menuAction', (event, arg) => {
	if (window[arg] && jQuery.isFunction(window[arg])) window[arg].call(menuElem);
	menuElem = null;
});

function doneLoading() {
	console.log('all components ready');
	initGUI();
}