$(document).on('keyup', function(e) {
	if (e.keyCode == 73 && e.ctrlKey && e.shiftKey) {
		electron.ipcRenderer.send('open-control-inspector');
	}
});

var searchWait;

$(function() {
	$('#search-box').on('keydown', function() {
		clearTimeout(searchWait);
		searchWait = setTimeout(search, 500);
	});
	console.log(modules);
});

function search() {
	var searchBox = $("#search-box");
	var search = searchBox.val();
	var lastSearch = searchBox.data('lastSearch');
	if (lastSearch == search || search == '') return;
	else searchBox.data('lastSearch', search);

	var searches = [];
	moduleList.forEach(function(module) {
		var searchPromise = modules[module].search(search).catch(function(fail) {

		});
		searches.push(searchPromise);
	});
	console.log(searches);
}
