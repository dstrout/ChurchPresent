/*function renderSong(song, container) {
	var $container = $(container);
	$container.css({
		'fontFamily': '"Times New Roman", serif',
		'lineHeight': 1.61803398875
	})
	var title = $('<div class="songTitle" style=\'color:#FFF837;font-size:25px;\'">'+song.title+'</div>').appendTo($container);
	var author = $('<div class="songAuthor" style=\'color:#00FCDC;font-size:18px;\'">'+song.author+'</div>').appendTo($container);
	var copyright = $('<div class="songCopyright" style=\'color:#00FCDC;font-size:18px;\'">'+song.copyright+'</div>').appendTo($container);
}*/

module.exports = {

  load: function(settings) {
    return new Promise(function(resolve, reject) {
      resolve('ready');
    });
  },

  render: function() {
    return new Promise(function(resolve, reject) {
      resolve('<div></div>');
    });
  },

}
