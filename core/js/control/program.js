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

  $('body').on('item-select', '.selectable', function() {
    $(this).addClass('selected').siblings('.selected').removeClass('selected');
  });

  $('body').on('item-unselect', '.selectable', function() {
    $(this).removeClass('selected');
  });

  var searchHeight = $("#item-search").height() - 1;
  $("#program-options").height(searchHeight).css('lineHeight', searchHeight.toString()+'px');
  $("#program-items").attr('style', 'height:calc(100% - '+ searchHeight +'px);').sortable({
    axis: 'y',
    cancel: '.empty-program',
    containment: 'parent',
    cursor: 'default',
    distance: 10,
    opacity: .5,
    receive: addSearchResult,
  });
});

function programInit() {
  console.log('App ready, checking for existing program...');
  if (settings.lastProgram && fs.existsSync(settings.lastProgram)) {
    console.log('Loading '+settings.lastProgram);
    loadProgram(settings.lastProgram, true);
  }
};

function search() {
  var searchBox = $("#search-box");
	var search = searchBox.val();
	var lastSearch = searchBox.data('lastSearch');
	if (search == '') {
    $("#search-results .search-result").hide();
    return;
  } else if (lastSearch == search) {
    $("#search-results .search-result").show();
    return;
  } else {
    searchBox.data('lastSearch', search);
  }

  searchBox.addClass('loading');

	var searches = [];
	moduleList.forEach(function(module) {
		var searchPromise = modules[module].search(search).catch(function(fail) {

		});
		searches.push(searchPromise);
	});
	Promise.all(searches).then(showSearchResults);
}

function showSearchResults(results) {
  var resultList = $("#search-results").empty();

  var resultCount = 0;
  var resultArray = [];
  if (results.length) {
    results.forEach(function(moduleResults){
      if (moduleResults.length) {
        moduleResults.forEach(function(result) {
          resultArray.push(result);
        });
      }
    });
  }

  if (!resultArray.length) {
    resultList.append('<div class="no-results">No results found</div>');
  } else {
    console.log(resultArray);
    resultArray.forEach(function(result) {
      var item = $('<div class="search-result '+ result.type +'-search-result selectable">'+ result.title +'</div>')
      .data('item', result).on('contextmenu', itemMenu).appendTo(resultList);
    });
  }

  $("#search-box").removeClass('loading');

  $("#search-results .search-result").draggable({
    connectToSortable: '#program-items',
    cursor: 'default',
    cursorAt: {top: 10, left: 10},
    helper: 'clone',
    revert: 'invalid',
    scroll: false,
    start: function(e, ui) {
      var sidebarWidth = $("#sidebar").width();
      ui.helper.addClass('search-result-dragging').width(sidebarWidth);
      $("#program-items").sortable('option', 'axis', false);
      $("#program-items").sortable('option', 'containment', false);
    },
    stop: function(e, ui) {
      $("#program-items").sortable('option', 'axis', 'y');
      $("#program-items").sortable('option', 'containment', 'parent');
    }
  })
}

function addSearchResult(e, ui) {
  //console.log(e);
  //console.log(ui);
  var searchResult = ui.item;
  var newItem = ui.helper;
  var itemData = searchResult.data('item');

  newItem.removeClass('search-result-dragging search-result').removeAttr('style').data('item', itemData);
  var itemModule = itemData.type;
  newItem.removeClass(itemModule +'-search-result').addClass(itemModule+'program-item program-item');

  if (modules[itemModule].add) {
    newItem.addClass('item-loading');
    Promise.resolve(modules[itemModule].add(itemData)).then(function(newItemData) {
      newItem.data('item', newItemData);
      updateProgram();
    }, function(fail) {
      basicDialog('Could not add item', 'There was an error when adding this item to the program.', 'error', ['OK'])
      newItem.remove();
    });
  } else {
    updateProgram();
  }
}

function getProgram() {
  var program = [];
  $("#program-items .program-item").each(function() {
    var itemCopy = JSON.parse(JSON.stringify($(this).data('item')));
    delete itemCopy.actions;
    program.push(itemCopy);
  });
  return program;
}

function updateProgram() {
  var program = getProgram();
  electron.ipcRenderer.send('program-data', program);
}

function loadProgram(programPath, quiet) {
  if (!programPath) {
    console.log('no program to load');
    return false;
  }

  if (!fs.existsSync(programPath)) {
    console.log(programPath+' does not exist');
    if (!quiet) basicDialog('Could not load program', 'The program '+programPath+' does not exist.', 'error');
    return;
  }

  fs.readFile(programPath, 'utf8', function(err, programJSON) {
    if (err || !programJSON) {
      if (!quiet) basicDialog('Could not load program', 'The program '+programPath+' could not be loaded.', 'error');
    }

    var program = {};
    try {
      program = JSON.parse(programJSON);
    } catch {
      if (!quiet) basicDialog('Invalid program', 'That doesn\'t seem to be a valid ChurchPresent program file.', 'error');
      return;
    }

    if (!program.title) program.title = 'Untitled program';
    if (!program.items) program.items = [];
  });
}

function createModuleActions() {
	moduleList.forEach(function(module) {
    var moduleName = modules[module].constructor.name.replace(/_/g, ' ');

		if (modules[module].options && modules[module].options.length) {
			var optionList = modules[module].options;
			var moduleMenuWrapper = $('<div id="'+module+'-menu" data-module="'+module+'" class="module-option-menu">'+
			'<img src="../../present_modules/'+module+'/icon.png" title="'+moduleName+' options">'+
      '<div class="menu-options"></div></div>');
      var moduleMenu = moduleMenuWrapper.find('.menu-options');
			optionList.forEach(function(option) {
        $('<button>'+option.label+'</button>').on('click', option.action).appendTo(moduleMenu);
      });
      $("#module-options").append(moduleMenuWrapper);
		}
	});

  $('#module-options .module-option-menu img').on('click', function() {
    $(this).parent().siblings().find('.menu-options').slideUp(150);
    $(this).next().slideToggle(150);
  });

  $('#module-options .module-option-menu .menu-options button').on('click', function() {
    $(this).parent().slideUp(150);
  });

  var sidebarHeight = $("#sidebar").height();
  var searchHeight = $("#item-search").outerHeight();
  var moduleOptionsHeight = $("#module-options").outerHeight();
  var sidebarReservedHeight = searchHeight + moduleOptionsHeight;

  $("#search-results").css('height', 'calc(100% - '+ sidebarReservedHeight +'px)');
}

function itemMenu(e) {
  console.log(e);
  var $this = $(this).trigger('item-select');

  var item = $this.data('item');
  if (item.actions) {
    var menu = $("#item-menu").empty().off('click').on('click', function() {
      $this.trigger('item-unselect');
      hideMenu();
    });
    item.actions.forEach(function(menuItem) {
      menu.append($('<div class="item-menu-item">'+ menuItem.label +'</div>').on('click', menuItem.action));
    });

    menu.css({top: e.pageY, left: e.pageX}).fadeIn(50);
  }
}

function hideMenu() {
  $("#item-menu").fadeOut(50);
}
