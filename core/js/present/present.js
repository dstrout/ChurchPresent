var ipcRenderer = nodeRequire('electron').ipcRenderer;
var settings = JSON.parse(ipcRenderer.sendSync('control.request', 'settings'));

ipcRenderer.on('renderProgram', (event, arg) => {
	renderProgram();
});

$(function() {

	var modules = settings.modules;
	for (var i=0; i<modules.length; i++) {

		var moduleName = modules[i];

		var moduleScript = document.createElement('script');
		moduleScript.src = 'data/modules/'+ modules[i] +'/present.js';
		document.head.appendChild(moduleScript);

		var moduleStyle = document.createElement('link');
		moduleStyle.setAttribute('rel', 'stylesheet');
		moduleStyle.setAttribute('href', 'data/modules/'+modules[i]+'/present.css');
		document.head.appendChild(moduleStyle);

	}

	$('body').on({
		'click': function(e) { programNext(e.ctrlKey, e.altKey); },
		'contextmenu': function(e) { programPrevious(e.ctrlKey, e.altKey); }
	});
	$(document).on('keyup', function(e) {
		if (e.keyCode == 33) programPrevious(e.ctrlKey, e.altKey);
		else if (e.keyCode == 34) programNext(e.ctrlKey, e.altKey);
	});

});

function renderProgram() {
	console.log('present: render program instruction received at ' + new Date().getTime() );

	var program = JSON.parse(window.localStorage.program);

	$("#emptyProgram").hide();
	$("#program-items").empty();
	$("body").addClass("rendering");
	$.each(program.items, function(i, programItem) {
		var itemContainer = $('<div class="'+programItem.type+' item"></div>').appendTo('#program-items');

		if (programItem.name) itemContainer.append('<div class="title">'+programItem.name+'</div>');
		if (programItem.author) itemContainer.append('<div class="author">'+programItem.author+'</div>');
		var contentBlock = $('<div class="content"></div>').appendTo(itemContainer);
		if (programItem.copyright) itemContainer.append('<div class="copyright">'+programItem.copyright+'</div>');

		$.each(programItem.slides, function(j, slideContent) {
			if (j == 'length') return true;
			contentBlock.append('<div class="slide">'+slideContent+'</div>');
		});

		contentBlock.find('>*:first-child').addClass('active');
	});

	$("#program-items").children().each(function() {
		var $this = $(this).show();
		var notContentHeight = 0;
		$this.children().not('.content').each(function() {
			notContentHeight += $(this).outerHeight(true);
		});
		$this.find('.content').height($this.height() - notContentHeight);
		$this.removeAttr('style');
	}).first().addClass('active');

	$("body").removeClass("rendering");
}

function programPrevious(toPrevItem, skip2) {
	var currentItem = $("#program-items .item.active");
	var currentSlide = $("#program-items .item.active .slide.active");

	if (toPrevItem) {
		currentItem.find('.slide').removeClass('active').first().addClass('active');
		programPrevious(false, false);
		if (skip2) programPrevious(false, false);
	} else {
		if (currentSlide.prev().length && !currentSlide.hasClass('no-switch')) {
			currentSlide.removeClass('active').prev().addClass('active');
		} else if (currentItem.prev().length && !currentItem.hasClass('no-switch')) {
			currentItem.removeClass('active').prev().addClass('active');
		}
	}
}

function programNext(toNextItem, skip2) {
	var currentItem = $("#program-items .item.active");
	var currentSlide = $("#program-items .item.active .slide.active");

	if (toNextItem) {
		currentItem.find('.slide').removeClass('active').last().addClass('active');
		programNext(false, false);
		if (skip2) programNext(false, false);
		currentItem.find('.slide').removeClass('active').first().addClass('active');
	} else {
		if (currentSlide.next().length && !currentSlide.hasClass('no-switch')) {
			currentSlide.removeClass('active').next().addClass('active');
		} else if (currentItem.next().length && !currentItem.hasClass('no-switch')) {
			currentItem.removeClass('active').next().addClass('active');
		}
	}
}
