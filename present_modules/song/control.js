module.exports = {

  load: function() {
    return new Promise(function(resolve, reject) {
      resolve('ready');
    });
  },

  search: function(search) {
    return new Promise(function(resolve, reject) {
      reject('Could not load songs');
    });
  },

  add: function() {

  }

}
