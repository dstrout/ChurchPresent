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
});

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

function search() {
	var searchBox = $("#search-box").addClass('loading');
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
