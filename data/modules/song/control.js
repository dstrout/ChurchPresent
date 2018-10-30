
var songSearchTimeout;
$('<input type="text" id="songSearchTB" placeholder="Search songs...">').on('keydown keyup', function() {
	clearTimeout(songSearchTimeout);
	songSearchTimeout = setTimeout(songSearch, 300);
}).appendTo('#songStaging');
$("#songStaging").append('<div id="songList" class="module-sortable select-list"></div>');

$("#songList, #program").on("contextmenu mousedown", ".song", function() {
	$(this).addClass("selected").siblings().removeClass("selected");
});

$("#songList").on("contextmenu", ".song", function() {
	showMenu({
		"Delete song": songDelete,
		"---": "",
		"Edit Song": songEdit,
	}, this);
});

$("#program").on("contextmenu", ".song", function() {
	showMenu({
		"Edit Display": songEdit,
		"Edit Sequence": songEditSequence,
		"---": "",
		"Remove from program": songDelete,
	}, this);
});

readyCallback("database", function() {
	
	db.query("SELECT * FROM songs ORDER BY title", null, function(err, result) {
		/* console.log(err);
		console.log(result);
		console.log(result[0].copyright);
		console.log(typeof result); */
		
		$.each(result, function(i, song) {
			var songElem = $('<div class="song module-sortable-elem" data-itemtype="song">'+song.title+'</div>');
			
			songElem.data({
				item: {
					'songID': song.songid,
					'title': song.title,
					'author': song.author.toString(),
					'copyright': song.copyright.toString()
				}
			})
			
			songElem.appendTo("#songList").on('addToProgram', loadSong);
			
		});
		
		songAreaSizing();
		
		updateModuleDraggables();
		
		componentReady('modules.song');
	});
	
});

function loadSong() {
	console.log('loading song at '+new Date().getTime());
	var $this = $(this);
	$this.addClass("selected").siblings().removeClass("selected");
	
	var songData = $this.data('item');
	
	var songID = parseInt(songData.songID).toString();
	if (isNaN(songID)) return false;
	db.query("SELECT * FROM songsequences WHERE songid="+songID+" ORDER BY defaultsequence DESC", null, function(err, result) {
		if (err) { console.log(err); return false; }
		//console.log(result);
		var sequences = {};
		$.each(result, function(i, sequence) {
			if (i == result.length - 1) var lastSequence = true;
			else var lastSequence = false;
			
			var author = sequence.sequenceauthor;
			if (!author) author = songData.author;
			var copyright = sequence.sequencecopyright;
			if (!copyright) author = songData.copyright;
			sequences[sequence.sequenceid] = {'sequence': sequence.sequencename, 'author': author, 'copyright': copyright, 'slides': []};
			
			var textQuery = "SELECT sequenceparts.partorder, songparts.parttype, songparts.partnum, songparts.text FROM sequenceparts "+
			                "INNER JOIN songparts ON sequenceparts.partid = songparts.partid "+
							"WHERE sequenceparts.sequenceid = "+sequence.sequenceid+" ORDER BY sequenceparts.partorder ASC";
			
			db.query(textQuery, null, function(err, result) {
				//console.log(err);
				//console.log(result);
				
				$.each(result, function(j, part) {
					sequences[sequence.sequenceid].slides.push({'label': part.parttype+part.partnum, 'text': part.text});
				});
				
				if (lastSequence) {
					songData.sequences = sequences;
					$this.data({
						'item': songData,
						'itemReady': true
					});
					
					updateProgram();
				}
			});
			
			if (sequence.defaultsequence) { songData.selectedSequence = sequence.sequenceid; console.log('default sequence found'); }
		});
	});
}

function songDelete() {
	alert("Removing song "+$(this).text()+".");
}

function songEdit() {
	alert("Editing song "+$(this).text()+".");
}

function songEditSequence() {
	
}

function songSearch() {
	console.log('Searching for song with search string "'+$("#songSearchTB").val()+'"');
}

function songAreaSizing() {
	var sl = $("#songList");
	sl.height(window.innerHeight - sl.offset().top - 12);
}

$(window).on("resize", songAreaSizing);