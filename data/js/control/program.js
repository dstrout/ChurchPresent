function initGUI() {
	console.log("Initializing GUI");
}

var searchTimeout = null;
var dragElem = null;
var lastDragY = null;

var programHistory = [];

var emptySlide = $('<div class="empty"><span class="item-title">Empty slide</span></div>').data({
	'itemData': {'type': 'empty', 'slides': {'length': 1, 'empty': ''}}
});

$(function() {

	$(document).on('keyup', function(e) {
		if (e.keyCode == 46) {
			var selectedItem = $("#program>.selected");
			if (selectedItem.length) {
				if (selectedItem.hasClass('present-active')) {
					if (selectedItem.next().length) selectedItem.next().addClass('present-active');
					else if (selectedItem.prev().length) selectedItem.prev().addClass('present-active');
				}

				selectedItem.remove();
				updateProgram();
			}
		}
	});

	$("#search-box").on({
		"keyup keydown": function(e) { clearTimeout(searchTimeout); searchTimeout = setTimeout(doSearch, 250); e.stopPropagation(); },
		"focus": function() {
			this.select();

			//if ($("#search-results").attr("data-resultsfor") == this.value) $("#search-results").show();
		}
	});

	$("#empty-slide-btn").on("click", function() {
		var programSelected = $("#program>.selected");
		if (programSelected.length) {
			programSelected.after(newEmptySlide());
			updateProgram();
		} else {
			$("#program").append(newEmptySlide());
			updateProgram();
		}
	});

	$("#program").sortable({
		"appendTo": "body",
		"receive": addToProgram,
		"containment": "#program",
		"update": updateProgram,
		"start": function(e, ui) {
			ui.item.click();
		}/* ,
		"receive": function(e, ui) {
			console.log(ui);
		} */
	}).on("click", function(e) {
		if (e.target.id == 'program') {
			$("#program>div").removeClass('selected');
		}
	}).on("dblclick", ">*", function() {
		$(this).addClass('present-active').siblings().removeClass('present-active');
		updateProgram();
	});

	$("body").on({
		"click": function(e) {
			$(this).siblings().removeClass('selected').end().addClass('selected');
		}
	}, "#program>*");

	$("body").on("click", function() {
		$("#search-results, #search-menu").hide();
		closeContextMenu();
	});

	$("#program-item-contextmenu").on("click", function(e) {
		e.stopPropagation();
	});

	$("#search-results").on({
		"mousedown": function(e) {
			e.stopPropagation();
		},
		"mouseleave": function(e) {
			if ($('.ui-draggable-dragging').length) $(this).hide();
		}
	});

});

function doSearch() {
	$("#search-results").hide();

	var $this = $("#search-box");
	if ($this.val().length < 4) return false;

	var search = $this.addClass("loading").val();

	searchEscaped = db.escape(search);
	searchEscaped = searchEscaped.substr(1, searchEscaped.length - 2);
	//console.log(searchEscaped);

	var results = [];
	var songsReady = false;
	var scriptureReady = false;

	db.query("SELECT * FROM songs WHERE title LIKE '%"+searchEscaped+"%' ORDER BY title", null, function(err, result) {
		/* console.log(err);
		console.log(result);
		console.log(result[0].copyright);
		console.log(typeof result); */

		$.each(result, function(i, song) {
			//console.log(song.title);
			results.push({
				'type': 'song',
				'id': 'song-' + song.songid + '-' + new Date().getTime(),
				'name': song.title,
				'copyright': song.copyright,
				'author': song.author
			})
		});

		songsReady = true;
		if (scriptureReady) showSearchResults(results);
	});

	var reference = new RegExp(/(?:\d\s*)?[A-Z]?[a-z]+\s*\d+(?:[:-]\d+)?(?:\s*-\s*\d+)?(?::\d+|(?:\s*[A-Z]?[a-z]+\s*\d+:\d+))?/);
	if (reference.test(search)) {
		var esvApiSettings = '&include-footnotes=false&include-subheadings=false&include-headings=false&include-selahs=false&include-passage-references=false';
		var scriptureRequest = nodeRequest({
			url: 'https://api.esv.org/v3/passage/text/?q=' + encodeURIComponent(search) + esvApiSettings,
			headers: {
				'Authorization': 'Token 6123296c087f20c95782765c775da552b1aac4f7'
			}
		}, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var scriptureResponse = JSON.parse(body);
				if (!scriptureResponse.passages.length) {
					scriptureReady = true;
					if (songsReady) showSearchResults(results);
					return;
				}

				var startingChapterVerse = scriptureResponse.parsed[0][0].toString();
				startingChapterVerse = startingChapterVerse.substr(startingChapterVerse.length - 6);

				var chapterVerse = new Array(parseInt(startingChapterVerse.substr(0, 3)), parseInt(startingChapterVerse.substr(3, 6)));

				var verseArray = {
					length: 0
				};

				var passage = scriptureResponse.passages[0];
				passage = $.trim(passage.substr(0, passage.length - 6));
				passage = passage.split('[');
				$.each(passage, function(i, verse) {
					var verseNum = parseInt(verse);
					if (isNaN(verseNum)) return true;

					//console.log(verseNum);
					//console.log(chapterVerse);

					if (verseNum < chapterVerse[1]) {
						chapterVerse[0]++;
						chapterVerse[1] = verseNum;
					}

					chapterVerse[1] = verseNum;

					var verseReference = chapterVerse[0] + ':' + verseNum;

					verseArray[verseReference + "_" + uuid()] = $.trim(verse.substr(verseNum.toString().length + 1)).replace(/LORD/g, '<span class="small-caps">Lord</span>');

					verseArray.length++;
				});

				results.push({
					'type': 'scripture',
					'id': 'scripture-' + new Date().getTime(),
					'friendlyId': scriptureResponse.canonical,
					'name': scriptureResponse.canonical,
					'copyright': 'The Holy Bible, English Standard Version Copyright &copy; 2006 by Crossway Bibles, a division of Good News Publishers',
					'slides': verseArray
				});

				scriptureReady = true;
				if (songsReady) showSearchResults(results);
			}
		});

	} else {
		scriptureReady = true;
		if (songsReady) showSearchResults(results);
	}
}

function showSearchResults(results) {
	$("#no-results").hide();
	//console.log(results);

	$("#search-results").empty().attr('data-resultsfor', $("#search-box").val());

	if (!results.length) $("#no-results").show();
	else {
		$.each(results, function(i, result) {
			$('<div class="search-result '+result.type+'"><span class="item-title">'+result.name+'</span></div>').data({
				"itemData": result
			}).appendTo("#search-results");
		});

		$("#search-results>*").draggable({
			/*"containment": "#program",*/
			"connectToSortable": "#program",
			"helper": "clone",
			"opacity": .5,
			"appendTo": "body"
		});

		$("#search-results").show();
	}

	$("#search-box").removeClass("loading");
}

function updateModuleDraggables() {
	$("#search-results").draggable({
		/*"containment": "#program",*/
		"connectToSortable": "#program",
		"helper": "clone",
		"opacity": .5,
		"appendTo": "body",
		"start": function(e, ui) {
			$(ui.helper).css('width', '300px');
		}
	});
}

function addToProgram(e, ui) {
	var elem = ui.helper.removeClass('ui-draggable ui-draggable-handle search-result').removeAttr('style').click().on("contextmenu", function(e) {
		e.preventDefault();

		var $this = $(this).click();
		var itemData = $this.data('itemData');
		var itemType = itemData.type;

		showContextMenu(this);

		return false;
	});

	var itemData = ui.item.data('itemData');
	ui.helper.data('itemData', itemData);

	if (itemData.type == 'song') {
		var $this = elem;
		$this.addClass('loading');

		var sequences = [];

		var songID = $this.data('itemData').id.split('-')[1];

		db.query("SELECT * FROM songsequences WHERE songid="+songID, null, function(err, result) {
			if (!result.length) {
				$this.attr('data-error', 'No sequences found for this song.').removeClass('loading');
			}

			var resultCount = result.length;

			$.each(result, function(i, sequence) {
				var thisSequence = {
					"name": sequence.sequencename,
					"author": sequence.sequenceauthor,
					"copyright": sequence.sequencecopyright,
					"slides": {
						length: 0
					},
					"isDefault": false
				}

				if (sequence.defaultsequence == 1) {
					thisSequence.isDefault = true;

					if (thisSequence.author != 0) itemData.author = thisSequence.author;
					if (thisSequence.copyright != 0) itemData.copyright = thisSequence.copyright;
				}

				db.query("SELECT songparts.*, sequenceparts.* FROM songparts INNER JOIN sequenceparts ON songparts.partid = sequenceparts.partid "+
				"WHERE sequenceparts.sequenceid = "+sequence.sequenceid+" ORDER BY sequenceparts.partorder ASC", null, function(err, result2) {
					$.each(result2, function(j, songPart) {
						thisSequence.slides[songPart.parttype + songPart.partnum + '_' + uuid()] = songPart.text;
						thisSequence.slides.length++;
					});

					sequences.push(thisSequence);

					if (thisSequence.isDefault) {
						itemData.slides = thisSequence.slides;
					}

					if (i == resultCount - 1) {
						itemData.sequences = sequences;
						$this.data('itemData', itemData).removeClass('loading');
						updateProgram();
					}
				});
			});

		});
	} else updateProgram();
}

/* function addToProgram(e, ui) {
	console.log(ui);
	var programItem = ui.helper;
	programItem.removeAttr('style');
	programItem.trigger('addToProgram');

	if (ui.item.data('item')) programItem.data('item', ui.item.data('item'));

	var itemEvents = jQuery._data(ui.item.get(0), "events");
	if (!itemEvents.addToProgram) { // if the item doesn't have custom code it needs to run when added, mark it as ready and update the program
		programItem.data('itemReady', true);
		updateProgram();
	} else { // otherwise, mark the item as not ready and call the specified callback functions
		console.log('adding item event handlers');
		programItem.data('itemReady', false);
		jQuery._data(ui.item.get(0), "events").addToProgram.forEach(function(thisEvent) {
			thisEvent.handler.call(programItem.get(0));
		});
	}
} */

function updateProgram() {
	var program = {"items": []};
	$("#program>*").each(function() {

		var $this = $(this);
		if (!$this.hasClass('loading')) {
			program.items.push($this.data('itemData'));
		}

	});

	window.localStorage.setItem('program', JSON.stringify(program));

	renderProgram();
}

function renderProgram() {
	console.log('control: sending render program instruction at ' + new Date().getTime() );
	ipcRenderer.send('control.presentRender', '');
}

function showContextMenu(item) {
	$('#program-item-contextmenu').addClass('open');
}

function closeContextMenu() {
	$('#program-item-contextmenu').removeClass('open');
}

function newEmptySlide() {
	var thisEmptySlide = emptySlide.clone(true);
	var emptySlideData = thisEmptySlide.data('itemData');
	emptySlideData.id = 'empty-' + new Date().getTime();
	thisEmptySlide.data('itemData', emptySlideData);
	return thisEmptySlide;
}

function uuid() {
	var uuid = "", i, random;
	for (i = 0; i < 32; i++) {
		random = Math.random() * 16 | 0;

		if (i == 8 || i == 12 || i == 16 || i == 20) {
			uuid += "-"
		}
		uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
	}
	return uuid;
}
