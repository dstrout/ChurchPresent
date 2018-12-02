module.exports = {

  load: function() {
    return new Promise(function(resolve, reject) {
      resolve('ready');
    });
  },

  search: function() {
    return new Promise(function(resolve, reject) {
      reject('Could not load ESV Bible results');
    });
  },

  add: function() {

  }

}


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
