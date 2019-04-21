function Song() {

  // Required module functions

  var self = this;

  this.load = function(settings, churchPresent) {
    self.settings = settings;
    self.churchPresent = churchPresent;
    self.songs = [];
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
  }

  this.search = function(search) {
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
          song.type = 'song',
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
  }

  this.add = function() {

  }

  this.songSettings = function() {
    self.churchPresent.interface({
      'title': 'Song Settings',
      'fields': {
        'songDirectory': {
          'type': 'directory',
          'label': 'Song location',
          'hint': 'Where the program will look for song files',
          'value': self.settings.songsPath,
          'placeholder': 'Select a directory',
        },
        'file': {
          'type': 'file',
          'label': 'File selector',
          'placeholder': 'Pick something',
        }
      },
      'submitBtn': 'Save',
      'validate': self.validateSettings,
      'callback': self.updateSettings,
    });
  }

  this.addSong = function() {

  }

  this.editSong = function(song) {

  }

  this.chooseSequence = function(song) {

  }

  this.options = [{'label': 'Settings', 'action': this.songSettings}, {'label': 'New song', 'action': this.addSong}];

  // Utility functions

  this.cleanSearchTerms = function(search) {
    var ok = 'abcdefghijklmnopqrstuvwxyz 0123456789';
    var cleaned = '';
    search = search.toLowerCase().split('');
    search.forEach(function(c) {
      if (ok.indexOf(c) != -1) cleaned += c;
    });
    return cleaned;
  }

}

module.exports = new Song();
