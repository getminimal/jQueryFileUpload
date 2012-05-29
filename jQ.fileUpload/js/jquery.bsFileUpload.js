;(function($, window, undefined) {

	// Extend String
	if (typeof String.prototype.format !== 'function') {
		String.prototype.format = function() {
			var formatted = this;
			for(arg in arguments) {
				formatted = formatted.replace('{' + arg + '}', arguments[arg]);
			}

			return formatted;
		};
	}

	// Extend Array
	if (typeof Array.prototype.sum !== 'function') {
		Array.prototype.sum = function() {
			var summe = 0;

			for(var i in this) {
				if (typeof this[i] === 'number') {
					summe += this[i];
				}
			}

			return summe;
		};
	}

	// Set basic plugin info
	var pluginName = 'bsFileUpload',
		document = window.document,
		defaults = {
			maxFiles          : 99,
			thumbSize         : "240x160",
			previewImages     : true,
			removeAfterUpload : false,
			fileIconPath      : './jQ.fileUpload/fileicons/{0}.png',
			uploadHandler     : 'upload.php',

			// Custom Events
			uplDragEnter : function(e) { },
			uplDragLeave : function(e) { },
			uplDragOver  : function(e) { },
			uplDrop      : function(e, count, files) { },
			uplStarted   : function(e) { },
			uplError     : function(e, reason) { },
			uplCompleted : function(e) { }
		};

	// The actual plugin constructor
	function Plugin(element, options)
	{
		// Public attributes
		this.element = element;
		this.options = $.extend({}, defaults, options) ;

		// Private attributes
		this._defaults = defaults;
		this._name = pluginName;

		// Additional attributes
		this._states = {
			pending    : 0,
			processing : 1,
			completed  : 2
		};

		this.init();
	}

	Plugin.prototype.init = function()
	{
		var $this = this;

		// Creating a list
		if ($($this.element).has('ul').length == 0) {
			$($this.element).wrapInner($('<ul>'));
		}

		$($this.element).has('ul').addClass('clearfix');

		// Append an hidden input file select
		var hiddenInput = $('<input>').attr({
			type     : 'file',
			id       : 'uplFileSelect',
			name     : 'files[]',
			multiple : true
		}).hide();

		$('body').append(hiddenInput);

		// Checking the thumbsize
		if ($.isArray(this.options.thumbSize) && this.options.thumbSize.length === 2) {
			this.options._thumbSize = this.options.thumbSize;
		} else if (typeof this.options.thumbSize === 'string' && this.options.thumbSize.match(/^[0-9]+x{1}[0-9]+/)) {
			this.options._thumbSize = this.options.thumbSize.split('x');
		} else {
			this.options._thumbSize = [240, 160];
		}

		// Bind events
		$(this.element).on('dragenter', $this, $this.evtDragEnter);
		$(this.element).on('dragleave', $this, $this.evtDragLeave);
		$(this.element).on('dragover',  $this, $this.evtDragOver);
		$(this.element).on('drop',      $this, $this.evtDrop);
		$(this.element).on('click',     $this, $this.evtClick);
		$(hiddenInput).on('change',     $this, $this.evtFileSelect);

		// Reset attributes
		$this.reset();
	};

	/**
	* Resets the current attributes for bytes loaded, state, filecount etc.
	*/
	Plugin.prototype.reset = function()
	{
		this.state       = this._states.pending;
		this.filesLoaded = 0;
		this.filesTotal  = 0;
		this.bytesLoaded = [];
		this.bytesTotal  = [];

		$(this.element).find('li').remove();
	};

	Plugin.prototype.evtClick = function(e)
	{
		// Ref to plugin and to original event
		var $this = e.data,
			eOrg  = e.originalEvent;

		e.stopPropagation();
		e.preventDefault();

		if ($this.state !== $this._states.processing) {
			$('#uplFileSelect').click();
		}
	};

	Plugin.prototype.evtFileSelect = function(e)
	{
		// Ref to plugin and to original event
		var $this = e.data,
			eOrg  = e.originalEvent;

		var files = e.currentTarget.files;

		// Process currently dropped/selected files
		if ($this.state !== $this._states.processing) {
			$this.processSelectedFiles(files);
		}
	};

	/**
	* Method is triggered, when an item is dragged over the target container.
	* @param {Event} e The dragEvent.
	* @return {void}
	*/
	Plugin.prototype.evtDragEnter = function(e)
	{
		// Ref to plugin and to original event
		var $this = e.data,
			eOrg  = e.originalEvent;

		// Prevent default behaviour
		e.stopPropagation();
		e.preventDefault();

		eOrg.dataTransfer.dropEffect = 'copy';

		// Dispatch event
		if (typeof $this.options.uplDragEnter === 'function') {
			$this.options.uplDragEnter.call($this, $.extend(e, {data : null}));
		}
	};

	/**
	* Method is triggered, when the dragzone is left.
	* @param {Event} e The dragEvent.
	* @return {void}
	*/
	Plugin.prototype.evtDragLeave = function(e)
	{
		// Ref to plugin and to original event
		var $this = e.data,
			eOrg  = e.originalEvent;

		// Prevent default behaviour
		e.stopPropagation();
		e.preventDefault();

		// Dispatch event
		if (typeof $this.options.uplDragLeave === 'function') {
			$this.options.uplDragLeave.call($this, $.extend(e, {data : null}));
		}
	};

	Plugin.prototype.evtDragOver = function(e)
	{
		// Ref to plugin and to original event
		var $this = e.data,
			eOrg  = e.originalEvent;

		e.stopPropagation();
		e.preventDefault();

		eOrg.dataTransfer.dropEffect = 'copy';

		if (typeof $this.options.uplDragOver === 'function') {
			$this.options.uplDragOver.call(this, e);
		}
	};

	Plugin.prototype.evtDrop = function(e)
	{
		// Ref to plugin and to original event
		var $this = e.data,
			eOrg  = e.originalEvent;

		var dataTransfer = eOrg.dataTransfer,
			files        = dataTransfer.files;

		e.stopPropagation();
		e.preventDefault();

		// Process currently dropped/selected files
		if ($this.state !== $this._states.processing) {
			$this.processSelectedFiles(files);
		}
	};

	Plugin.prototype.processSelectedFiles = function(files)
	{
		// Ref to plugin and to original event
		var $this = this;

		var count = files.length;

		// Reset current upload container
		$this.reset();
		$this.state = $this._states.processing;

		for (var i = 0; i < Math.min(count, $this.options.maxFiles); i++) {
			var currentFile = files[i],
				fileReader  = new FileReader();

			// Set attributes so we could use them in callback
			fileReader.index = i;
			fileReader.file  = currentFile;

			// Increasing filecount
			$this.filesTotal++;

			// Callback for loadEnd Event
			$(fileReader).on('load', $this, $this.evtFileLoaded);
			fileReader.readAsDataURL(currentFile);
		};
	};

	Plugin.prototype.evtFileLoaded = function(e)
	{
		// Reference to Plugin
		var $this = e.data;

		var imgData      = e.target.result,
			currentFile  = e.target.file,
			currentIndex = e.target.index;

		var htmlTemplate = '<li>'
						 + '<div class="uplPreviewContainer clearfix">'
						 + '<div class="uplPreviewContainerInner clearfix">'
						 + '<div class="uplProgressBarBack">'
						 + '<div class="uplProgressBarFront">0 %'
						 + '</div>'
						 + '</div>'
						 + '</div>'
						 + '</div>'
						 + '</li>';

		var listItem = $(htmlTemplate);

		$(listItem).find('div.uplPreviewContainer, div.uplPreviewContainerInner').css({
			width           : $this.options._thumbSize[0] + 'px',
			height          : $this.options._thumbSize[1] + 'px'
		});

		// Preview images or show icon in background?
		if ($this.options.previewImages === true && currentFile.type.match(/^image/i)) {
			$(listItem).find('div.uplPreviewContainer').css({
				backgroundImage : 'url(' + imgData + ')',
			});
		} else {
			var extension = currentFile.name.split('.');
			var ext = extension[extension.length - 1];

			$(listItem).find('div.uplPreviewContainer').css({
				backgroundImage : 'url(' + $this.options.fileIconPath.format(ext) + ')',
			}).addClass('uplPreviewIcon');
		}

		// Append the list item
		$($this.element).find('ul').append(listItem);

		// Change progressbar position
		$(listItem).find('div.uplProgressBarBack').css({
			marginTop : $this.options._thumbSize[1] - $(listItem).find('div.uplProgressBarBack').height() - 12 + 'px'
		});

		// Processing the upload!
		$this.processUpload(currentFile, currentIndex, listItem);
	};

	Plugin.prototype.processUpload = function(file, index, domElement)
	{
		// Reference to Plugin
		var $this = this;

		var fd = new FormData();
			fd.append("file", file);

		// We append the current set options
		for (var key in $this.options) {
			var value = $this.options[key];

			// Join Arrays
			if ($.isArray(value)) {
				value = value.join(';');
			}

			if (typeof value !== 'function'
				&& !key.match(/^_/)
			) {
				try {
					fd.append(key, value);
				} catch (e) { }
			}
		}

		// Additional information
		fd.append('fileIndex', index);

		// Processing XHR
		var xhr = new XMLHttpRequest();
		xhr.open('POST', $this.options.uploadHandler, true);

		$(xhr.upload).on('progress', function(e) {
			var eOrg  = e.originalEvent;

			var percentCompleted = 0,
				percentCompleteRounded = 0;
				progressBarWidth = 0;

			if (eOrg.lengthComputable) {
				var baseWidth = $(domElement).find('.uplProgressBarBack').width();

				percentComplete = (eOrg.loaded / eOrg.total) * 100;
				percentCompleteRounded = Math.round(percentComplete * 100) / 100;
				progressBarWidth = (eOrg.loaded / eOrg.total) * baseWidth;

				$this.bytesLoaded[index] = eOrg.loaded;
				$this.bytesTotal[index] = eOrg.total;
			}

			$(domElement).find('.uplProgressBarFront').css({
				width : progressBarWidth + 'px'
			}).html(percentCompleteRounded + ' %');
		});

		$(xhr).on('load', function(e) {
			var eOrg  = e.originalEvent;

			console.info(eOrg);

			if (eOrg.lengthComputable) {
				//$this.bytesLoaded[index] = eOrg.loaded;
			}

			if (this.status == 200) {
				var resp = JSON.parse(this.response);
				console.log('Server got:', resp);

				var baseWidth = $(domElement).find('.uplProgressBarBack').width();
				$(domElement).find('.uplProgressBarFront').css({
					width : baseWidth + 'px'
				}).html('100 %');

				if ($this.options.removeAfterUpload === true) {
					window.setTimeout(function() {
						$(domElement).fadeOut(1000, function() {
							$(this).remove();
						});
					}, 1000);
				}
			} else {

			}

			// Increase files loaded state
			$this.filesLoaded++;

			console.info($this.bytesLoaded.sum());
			console.info($this.bytesTotal.sum());

			// All finished
			if ($this.filesLoaded === $this.filesTotal) {
				$this.state = $this._states.completed;
			}
		});

		xhr.send(fd);
	};

	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn[pluginName] = function (options) {
		return this.each(function () {
			if (!$.data(this, 'plugin_' + pluginName)) {
				$.data(this, 'plugin_' + pluginName, new Plugin(this, options));
			}
		});
	}

}(jQuery, window));