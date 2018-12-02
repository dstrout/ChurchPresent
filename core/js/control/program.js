$(document).on('keyup', function(e) {
	if (e.keyCode == 73 && e.ctrlKey && e.shiftKey) {
		electron.ipcRenderer.send('open-control-inspector');
	}
});

$(function() {

});
