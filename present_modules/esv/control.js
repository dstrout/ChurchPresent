function ESV_Bible() {

  var self = this;

  this.load = function(settings, churchPresent) {
    return new Promise(function(resolve, reject) {
      if (!settings.notFirstRun) {
          settings.moduleLabel = 'ESV Bible';
          settings.notFirstRun = true;
          self.settings = settings;
          self.saveSettings();
      } else self.settings = settings;
      self.churchPresent = churchPresent;
      resolve('ready');
    });
  }

  this.search = function(search) {
    return new Promise(function(resolve, reject) {
      var reference = new RegExp(/(?:\d\s*)?[A-Z]?[a-z]+\s*\d+(?:[:-]\d+)?(?:\s*-\s*\d+)?(?::\d+|(?:\s*[A-Z]?[a-z]+\s*\d+:\d+))?/);
      if (!reference.test(search)) {
        resolve([]);
        return;
      }

      if (!self.settings.authToken) {
        reject('ESV.org authorization token not set');
      }

      var nodeRequest = nodeRequire('request');
      var esvApiSettings = '&include-footnotes=false&include-subheadings=false&include-headings=false&include-selahs=false&include-passage-references=false';
      nodeRequest({
        url: 'https://api.esv.org/v3/passage/text/?q=' + encodeURIComponent(search) + esvApiSettings,
        headers: {
          'Authorization': 'Token ' + self.settings.authToken,
        }
      }, function(error, response, body) {
        if (error || response.statusCode != 200) {
          var errorMsg = 'Could not load results from ESV.org';
          if (body && body.indexOf('{') === 0) {
            var error = JSON.parse(body);
            if (error.detail) errorMsg += ': '+ error.detail;
          }
          reject(errorMsg);
          return;
        }

        var scriptureResponse = JSON.parse(body);
        if (!scriptureResponse.passages.length) {
          resolve([]);
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

          var verseText = $.trim(verse.substr(verseNum.toString().length + 1))/*.replace(/LORD/g, '<span class="small-caps">Lord</span>')*/;
          if (verseText.indexOf('\n') != -1) {
            verseText = verseText.split("\n");
            $.each(verseText, function(i, thisVerseText) {
                verseText[i] = $.trim(thisVerseText);
            });
            verseText = verseText.join(' ');
          }

          verseArray[verseReference] = verseText;

          verseArray.length++;
        });

        resolve([
          {
            'type': 'esv',
            'id': 'esv-' + new Date().getTime(),
            'title': scriptureResponse.canonical,
            'copyright': 'The Holy Bible, English Standard Version Copyright &copy; 2006 by Crossway Bibles, a division of Good News Publishers',
            'slides': verseArray,
          }
        ]);
      })
    });
  }

  this.add = function() {

  }

  this.saveSettings = function(settings) {

  }

  this.updateSettings = function(settings) {

  }

  this.validateSettings = function(newSettings) {
    return new Promise(function(resolve, reject) {
      var nodeRequest = nodeRequire('request');
      nodeRequest({
        url: 'https://api.esv.org/v3/passage/text/?q=' + encodeURIComponent('Genesis 1:1'),
        headers: {
          'Authorization': 'Token ' + newSettings.authToken,
        }
      }, function(error, response, body) {
        if (error || response.statusCode != 200) {
          var errorMsg = 'Could not load results from ESV.org';
          if (body && body.indexOf('{') === 0) {
            var error = JSON.parse(body);
            if (error.detail) errorMsg += ': '+ error.detail;
          }
          reject({'authToken': errorMsg});
          return;
        }

        resolve(true);
      });
    });
  }

  this.esvSettings = function() {
    console.log(self.churchPresent);
    self.churchPresent.interface({
      'title': 'ESV Bible Settings',
      'fields': {
        'authToken': {
          'type': 'text',
          'label': 'ESV.org authentication token',
          'css': {
            'width': '400px',
            'maxWidth': '85vw',
          },
          'value': self.settings.authToken,
        },
      },
      'submitBtn': 'Save',
      'validate': self.validateSettings,
      'callback': self.updateSettings,
    });
  }

  this.options = [{'label': 'Settings', 'action': this.esvSettings}]

}

module.exports = new ESV_Bible();


/*var reference = new RegExp(/(?:\d\s*)?[A-Z]?[a-z]+\s*\d+(?:[:-]\d+)?(?:\s*-\s*\d+)?(?::\d+|(?:\s*[A-Z]?[a-z]+\s*\d+:\d+))?/);
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
  });*/
