module.exports = {

  // Required module functions

  load: function(settings, churchPresent) {
    this.settings = settings;
    this.songs = [];
    var songObject = this;
    return new Promise(function(resolve, reject) {
      var fs = nodeRequire('fs');
      if (fs.existsSync(songObject.songsPath)) {
        reject('Could not find song directory');
        return;
      } else {
        fs.readdir(songObject.settings.songsPath, function(err, items) {
          if (err) {
            reject(err);
            return;
          }

          items.forEach(function(item, songIndex) {
            var fileExt = item.split('.');
            fileExt = fileExt[fileExt.length - 1].toLowerCase();
            if (fileExt != 'json') return;

            fs.readFile(songObject.settings.songsPath + '/' + item, {encoding: 'utf8'}, function(err, data) {
              if (err) {
                console.log('Could not load song '+item);
                return;
              }

              try {
                var song = JSON.parse(data);
                if (!song.meta || !song.meta.name) {
                  console.log('No title found for song '+item);
                  return;
                }

                song.fileName = item;
                songObject.songs.push(song);
              } catch (e) {
                console.log('Invalid JSON in song file '+item);
                if (songIndex == 0) console.log(data);
              }

              if (songIndex == items.length - 1) {
                //console.log('Song module loaded - found ' + items.length + ' songs.');
                resolve('Song module loaded - found ' + items.length + ' songs.');
              }
            });
          });
        });
      }
    });
  },

  search: function(search) {
    var songObject = this;
    return new Promise(function(resolve, reject) {
      if (!songObject.songs) {
        reject('No songs loaded');
      } else {
        var results = [];
        search = search.trim();
        var cleanedSearch = songObject.cleanSearchTerms(search);
        songObject.songs.forEach(function(song) {
          var name = song.meta.name;
          song.title = name;
          song.actions = [
            {'label': 'Edit song', 'action': songObject.editSong},
            {'label': 'Choose sequence', 'action': songObject.chooseSequence}
          ]

          var cleanedName = songObject.cleanSearchTerms(name);
          if (search == name || cleanedSearch == name || cleanedName.indexOf(cleanedSearch) != -1) {
            results.push(song);
          }
        });
        resolve(results);
      }
      resolve([]);
    });
  },

  add: function() {

  },

  options: [{'label': 'Settings', 'action': this.songSettings}, {'label': 'New song', 'action': this.addSong}],

  songSettings: function() {

  },

  addSong: function() {

  },

  editSong: function(song) {

  },

  chooseSequence: function(song) {

  },

  // Utility functions

  cleanSearchTerms: function(search) {
    var ok = 'abcdefghijklmnopqrstuvwxyz 0123456789';
    var cleaned = '';
    search = search.toLowerCase().split('');
    search.forEach(function(c) {
      if (ok.indexOf(c) != -1) cleaned += c;
    });
    return cleaned;
  }

}
