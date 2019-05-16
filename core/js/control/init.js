let settings = null;
let modules = [];
let moduleList = [];
let electron = nodeRequire('electron');
let fs = nodeRequire('fs');
let loading = [];
let churchPresent = {
	'interface': buildInterface,

	'addItem': function(item) {

	},
}

nodeRequire('electron').ipcRenderer.on('windowsReady', (event, message) => {
	settings = JSON.parse(message);
	console.log(settings);
	loadModules();
});

/*window.onload = function() {
	const ElectronTitlebarWindows = nodeRequire('electron-titlebar-windows');
	const titlebar = new ElectronTitlebarWindows({
		draggable: true,
		color: 'black',
	});
	titlebar.appendTo(document.getElementById('titlebar'));
}*/

function loadModules() {
	//var loading = [];
	settings.modules.forEach(function(module) {
		if (module.enabled) {
			console.log('Loading '+module.name+' control module');
			modules[module.name] = nodeRequire('../../present_modules/'+module.name+'/control.js');
			moduleList.push(module.name);
			loading[loading.length] = modules[module.name].load(module.settings, churchPresent);
			loading[loading.length] = loadPresentModule(module);
		}
	});

	// No need for a reject catcher - the main process and loading window will kill execution at that point
	Promise.all(loading).then(function() {
		createModuleActions();
		electron.ipcRenderer.send('modules-loaded');
    programInit();
	});
}

function loadPresentModule(module) {
	console.log('Loading '+module.name+' present module');
	electron.ipcRenderer.send('present-load', module.name, JSON.stringify(module.settings));
	return new Promise(function(resolve, reject) {
		electron.ipcRenderer.on('present-loaded:'+module.name, (event, response) => {
  		resolve(response);
		});
		electron.ipcRenderer.on('present-load-failed:'+module.name, (event, response) => {
  		reject(response);
		});
	});
}

function buildInterface(interfaceContent) {
  console.log(interfaceContent);
  if (interfaceContent.fields) {
    var contentEl = $("#interface-content").html('');
    if (interfaceContent.title) {
      contentEl.append('<h2 class="interface-title">'+ interfaceContent.title +'</h2>');
    }

    var form = $('<form class="interface-form"></form>').appendTo(contentEl);
    jQuery.each(interfaceContent.fields, function(fieldName, fieldDetails) {
      if (fieldDetails.type == 'select') {
        var thisInput = $('<select name="'+ fieldName +'"></select>');
        if (fieldDetails.css) thisInput.css(fieldDetails.css);
        jQuery.each(fieldDetails.options, function(i, option){
          var selected = '';
          if (fieldDetails.value && fieldDetails.value == option.value) selected = ' selected';
          thisInput.append('<option value="'+ option.value +'"'+ selected +'>'+ option.label +'</option>');
        });
      } else if (fieldDetails.type == 'textarea') {
        var thisInput = $('<textarea name="'+ fieldName +'"></textarea>');
        if (fieldDetails.value) thisInput.val(fieldDetails.value);
        if (fieldDetails.css) thisInput.css(fieldDetails.css);
        if (fieldDetails.placeholder) thisInput.attr('placeholder', fieldDetails.placeholder);
      } else if (fieldDetails.type == 'checkbox') {
        var checked = '';
        if (fieldDetails.value) checked = ' checked';
        if (fieldDetails.text) {
          var thisInput = $('<label><input type="checkbox" name="'+ fieldName +'"'+ checked +'> '+ fieldDetails.text +'</label>');
        } else {
          var thisInput = $('<input type="checkbox" name="'+ fieldName +'"'+ checked +'>');
        }
      } else if (fieldDetails.type == 'radio') {
        var thisInput = $('<div class="radio-set"></div>');
        jQuery.each(fieldDetails.options, function(i, option){
          var checked = '';
          if (fieldDetails.value && fieldDetails.value == option.value) checked = ' checked';
          thisInput.append('<label class="radio-label"><input type="radio" name="'+ fieldName +'" value="'+ option.value +'"'+ checked +'> '+ option.label +'</label>');
        });
      } else {
        if (!fieldDetails.type) fieldDetails.type = 'text';
        var thisInput = $('<input type="'+ fieldDetails.type +'" name="'+ fieldName +'">');
        if (fieldDetails.value) {
          thisInput.val(fieldDetails.value);
          thisInput.attr('data-orig-value', fieldDetails.value);
        }
        if (fieldDetails.css) thisInput.css(fieldDetails.css);
        if (fieldDetails.placeholder) thisInput.attr('placeholder', fieldDetails.placeholder);
      }

      var fieldWrapper = $('<div class="interface-field" data-field-name="'+ fieldName +'"></div>');
      if (fieldDetails.containerLayout) {
        fieldWrapper.addClass('container-layout-'+ fieldDetails.containerLayout);
      }
      if (fieldDetails.label) {
        fieldWrapper.append('<label for="'+ fieldName +'" class="interface-label">'+ fieldDetails.label +'</label>');
      }
      fieldWrapper.append(thisInput);
      fieldWrapper.appendTo(form);
    });

    var submitBtn = $('<div class="interface-form-submit"><button type="submit"></button></div>');
    if (interfaceContent.submitBtn) {
      submitBtn.find('button').text(interfaceContent.submitBtn).data('orig-text', interfaceContent.submitBtn);
    }
    submitBtn.appendTo(form);

    form.on('submit', function(e) {
      e.preventDefault();
      var values = {};
      var $this = $(this);

      $this.find('div.interface-field .error').remove();

      $this.find('input, select, textarea').each(function() {
        var isRadio = false;
        if (this.tagName.toLowerCase() == 'input' && this.type.toLowerCase() == 'radio') isRadio = true;

        if (this.tagName.toLowerCase() == 'input' && this.type.toLowerCase() == 'checkbox') {
          if (this.checked) values[this.name] = true;
          else values[this.name] = false;
        } else if ( (isRadio && this.checked) || !isRadio ) {
          values[this.name] = this.value;
        }
      });
      console.log(values);

      $this.find('.interface-form-submit button').prop('disabled', true).text('Hang on...');

      if (interfaceContent.validate) {
        interfaceContent.validate(values).then(function() {
          interfaceContent.callback(values).then(closeInterface, closeInterface);
        }, function(fieldErrors) {
          console.log(fieldErrors);
          $.each(fieldErrors, function(field, errorText) {
            $this.find('div.interface-field[data-field-name="'+ field +'"]').append('<div class="error">'+ errorText +'</div>');
          });

          var s = $this.find('.interface-form-submit button').prop('disabled', false);
          s.text(s.data('orig-text'));
        });
      } else if (interfaceContent.callback) {
        interfaceContent.callback(values).then(closeInterface, closeInterface);
      } else {
        closeInterface();
      }
    });

    $("#interface").fadeIn();

    fsInputs();

    return true;
  } else if (interfaceContent.html) {
    var contentEl = $("#interface-content").html('');
    var thisInterface = $('<div class="custom-interface">'+interfaceContent.html+'</div>').appendTo(contentEl);
    thisInterface.on('closeinterface', closeInterface);
    return thisInterface;
  } else return false;
}

function fsInputs() {
  $('#interface input[type="directory"]').each(function() {
    var $this = $(this);

    var tb = $('<input type="text" name="'+ $this.attr('name') +'" class="fs-path directory-textbox" readonly>');
    if ($this.val()) tb.val($this.val());
    tb.on('click', function(){$(this).prev().click();});
    $this.after(tb);

    var btn = $('<button class="fs-dialog-btn directory-dialog-btn" type="button">Select a directory</button>');
    if ($this.attr('placeholder')) btn.text($this.attr('placeholder'));
    btn.on('click', function() {
      var $this = $(this);
      var newPath = directoryDialog($this.next().val(), $this.text());
      if (newPath) $this.next().val(newPath[0]);
    });

    $this.after(btn);
    $this.remove();

    var buttonWidth = Math.ceil(btn.width()) + 25;

    tb.css('width', 'calc(100% - '+ buttonWidth +'px)');
  });

  $('#interface input[type="file"]').each(function() {
    var $this = $(this);

    var tb = $('<input type="text" name="'+ $this.attr('name') +'" class="fs-path file-textbox" readonly>');
    if ($this.val()) tb.val($this.val());
    tb.on('click', function(){$(this).prev().click();});
    $this.after(tb);

    var btn = $('<button class="fs-dialog-btn file-dialog-btn" type="button">Select a file</button>');
    if ($this.attr('placeholder')) btn.text($this.attr('placeholder'));
    btn.on('click', function() {
      var $this = $(this);
      var newPath = openFileDialog($this.next().val(), $this.text());
      console.log(newPath);
      if (newPath) $this.next().val(newPath[0]);
    });

    $this.after(btn);
    $this.remove();

    var buttonWidth = Math.ceil(btn.width()) + 25;

    tb.css('width', 'calc(100% - '+ buttonWidth +'px)');
  });
}

function directoryDialog(defaultPath, title) {
  return electron.ipcRenderer.sendSync('directory-dialog', defaultPath, title);
}

function openFileDialog(defaultPath, title) {
  return electron.ipcRenderer.sendSync('file-open-dialog', defaultPath, title);
}

function saveFileDialog(defaultPath, title) {
  return electron.ipcRenderer.sendSync('file-save-dialog', defaultPath, title);
}

function basicDialog(title, message, type, actions) {
  if (!actions) actions = ['OK'];
  return electron.ipcRenderer.sendSync('basic-dialog', title, message, type, actions);
}

function closeInterface() {
  $("#interface").fadeOut();
}
