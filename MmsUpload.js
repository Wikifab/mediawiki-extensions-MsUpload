var MsUpload = {

	fileError: function ( uploader, file, errorText ) {
		file.li.warning.text( errorText );
		file.li.addClass( 'yellow' );
		file.li.type.addClass( 'error' );
		file.li.warning.show();
		file.li.click( function () { // Remove li at click
			file.li.fadeOut( 'fast', function () {
		 		$( this ).remove();
		 		uploader.trigger( 'CheckFiles' );
		 	});
		});
	}, 

	galleryArray: [],
	insertGallery: function () {
		var galleryText = 'File:' + MsUpload.galleryArray.join( '\nFile:' );
		mw.toolbar.insertTags( '<gallery>\n' + galleryText + '\n</gallery>\n', '', '', '' );
	},

	filesArray: [],
	insertFiles: function () {
		mw.toolbar.insertTags( '[[File:' + MsUpload.filesArray.join( ']]\n[[File:' ) + ']]\n', '', '', '' );
	},

	insertLinks: function () {
		if ( window.msuVars.useMsLinks === true ) {
			mw.toolbar.insertTags( '*{{#l:' + MsUpload.filesArray.join( '}}\n*{{#l:' ) + '}}\n', '', '', '' );
		} else {
			mw.toolbar.insertTags( '*[[:File:' + MsUpload.filesArray.join( ']]\n*[[:File:' ) + ']]\n', '', '', '' );
		}
	},

	unconfirmedReplacements: 0,
	warningText: function ( fileItem, warning, uploader ) {
		switch ( warning ) {
			case '':
			case '&nbsp;':
			case '&#160;':
				$( fileItem.warning ).empty()
					.siblings( '.file-name' ).show()
					.siblings( '.file-name-input' ).hide()
					.siblings( '.file-extension' ).hide();
				break;

			case 'Error: Unknown result from API':
			case 'Error: Request failed':
				$( fileItem.warning ).text( warning );
				break;

			default:
				// IMPORTANT! The code below assumes that every warning not captured by the code above is about a file being replaced
				$( fileItem.warning ).html( warning );

				// We break when the particula warning when a file name starts with IMG
				if ( warning.indexOf( 'The name of the file you are uploading begins with' ) === 0 ) {
					break; // When the file name starts with "IMG", MediaWiki issues this warning. Display it and continue.
				}
				if ( warning.indexOf( 'Der Dateiname beginnt mit' ) === 0 ) {
					break; // Make it work for German too. Must be done this way because the error response doesn't include an error code.
				}

				// When hovering over the link to the file about to be replaced, show the thumbnail
				$( fileItem.warning ).find( 'a' ).mouseover( function () {
					$( fileItem.warning ).find( 'div.thumb' ).show();
				}).mouseout( function () {
					$( fileItem.warning ).find( 'div.thumb' ).hide();
				});

				// If a file with the same name already exists, add a checkbox to confirm the replacement
				if ( window.msuVars.confirmReplace ) {

					MsUpload.unconfirmedReplacements++;

					var title = $( fileItem.warning ).siblings( '.file-name' );

					var checkbox = $( '<input>' ).attr( 'type', 'checkbox' ).click( function ( event ) {
						if ( $( this ).is( ':checked' ) ) {
							title.show().next().hide();
							MsUpload.unconfirmedReplacements--;
						} else {
							title.hide().next().show().select();
							MsUpload.unconfirmedReplacements++;
						}
						uploader.trigger( 'CheckFiles' );
					});
					$( '<label>' ).append( checkbox ).append( mw.msg( 'msu-replace-file' ) ).appendTo( fileItem.warning );
				}
				break;
		}
		uploader.trigger( 'CheckFiles' );
		fileItem.loading.hide();
	},

	checkUploadWarning: function ( filename, fileItem, uploader ) {
		$.ajax({ url: mw.util.wikiScript( 'api' ), dataType: 'json', type: 'POST',
		data: {
			format: 'json',
			action: 'query',
			titles: 'File:' + filename,
			prop: 'imageinfo',
			iiprop: 'uploadwarning'
		}, success: function ( data ) {
			if ( data && data.query && data.query.pages ) {
				var pages = data.query.pages;
				$.each( pages, function ( index, value ) {
					MsUpload.warningText( fileItem, value.imageinfo[0].html, uploader ); // Pass on the warning message
					return false; // Break out
				});
			} else {
				MsUpload.warningText( fileItem, 'Error: Unknown result from API', uploader );
			}
		}, error: function () {
			MsUpload.warningText( fileItem, 'Error: Request failed', uploader );
		}});
	},

	build: function ( file, uploader ) {

		// Auto category
		if ( window.msuVars.showAutoCat && mw.config.get( 'wgNamespaceNumber' ) === 14 ) {
			file.cat = window.msuVars.checkAutoCat; // Predefine
			$( '<input>' ).attr({
				'class': 'msupload-check-index',
				'type': 'checkbox',
				'checked': file.cat
			}).change( function () {
				file.cat = this.checked; // Save
			}).appendTo( file.li );
	
			$( '<span>' ).attr( 'class', 'msupload-check-span' ).text( mw.config.get('wgPageName').replace( /_/g, ' ' ) ).appendTo( file.li );
		}

		// Insert an input field for changing the file title
		var fileNameInput = $( '<input>' ).attr({
			'class': 'file-name-input',
			'size': file.name.length,
			'name': 'filename',
			'value': file.name.substr( 0, file.name.length - file.extension.length - 1 )
		}).change( function () {
			file.name = this.value + '.' + file.extension;
			$( this ).prev().text( file.name );
			MsUpload.unconfirmedReplacements = 0; // Hack! If the user renames a file to avoid replacing it, this forces the Upload button to appear, but it also does when a user just renames a file that wasn't about to replace another
			MsUpload.checkUploadWarning( this.value, file.li, uploader );
		}).keydown( function ( event ) {
			// For convenience, when pressing enter, save the new title
			if ( event.keyCode === 13 ) {
				$( this ).change();
				event.preventDefault();
			}
		}).hide().insertAfter( file.li.title );

		var fileExtension = $( '<span>' ).addClass( 'file-extension' ).text( '.' + file.extension ).hide().insertAfter( fileNameInput );

		file.li.title.click( function () {
			file.li.title.hide();
			fileNameInput.show().select();
			fileExtension.show();
		});

		// Insert the progress bar
		var progressState = $( '<span>' ).addClass( 'file-progress-state' );
		file.li.children().first().after( progressState );
	},

	checkExtension: function ( file, uploader ) {
		mw.log( file );

		file.li.loading.show();
		file.extension = file.name.split( '.' ).pop().toLowerCase();

		if ( $.inArray( file.extension, mw.config.get( 'wgFileExtensions' ) ) !== -1 ) {
			switch( file.extension ) {
				case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': case 'tif': case 'tiff':
					file.group = 'image';
					try {
						var image = new o.Image();
						image.onload = function () {
							this.embed( file.li.type.get( 0 ), {
								width: 30,
								height: 30,
								crop: true
							});
						};
						image.load( file.getSource() );
						file.li.type.addClass( 'file-load' );
					} catch ( event ) {
						file.li.type.addClass( 'image' );
					}
					break;

				case 'mov': case 'avi':
					file.group = 'video';
					file.li.type.addClass( 'video' );
					break;

				case 'pdf':
					file.li.type.addClass( 'pdf' );
					break;
			}
			MsUpload.checkUploadWarning( file.name, file.li, uploader );

			file.li.cancel = $( '<span>' ).attr({ 'class': 'file-cancel', 'title': mw.msg( 'msu-cancel-upload' ) });
			file.li.cancel.click( function () {
				uploader.removeFile( file );
				if ( file.group === 'image' ) {
					var index = $.inArray( file.name, MsUpload.galleryArray );
					if ( index !== -1 ) {
						MsUpload.galleryArray.splice( index, 1 );
					}
					uploader.trigger( 'CheckFiles' );
				}
				file.li.fadeOut( 'fast', function () {
					$( this ).remove();
					uploader.trigger( 'CheckFiles' );
				});
			});
			file.li.prepend( file.li.cancel );

			MsUpload.build( file, uploader );
		} else { // Wrong datatype
			file.li.loading.hide( 'fast', function () {
				uploader.removeFile( file );
				uploader.refresh();
			});
			MsUpload.fileError( uploader, file, mw.msg( 'msu-ext-not-allowed', mw.config.get( 'wgFileExtensions' ).length ) + ' ' + mw.config.get( 'wgFileExtensions' ).join( ',' ) );
		}
	},

	cleanAll: function (uploader) {
		MsUpload.galleryArray.length = 0; // Reset
		uploader.splice( 0, uploader.files.length );
		$( '#'+ uploader.uploaderId + '-list .file' ).hide( 'fast', function () {
			$( '#'+ uploader.uploaderId + '-insert-gallery' ).unbind( 'click' );
			$( '#'+ uploader.uploaderId + '-bottom' ).hide();
		});
	},
	
	uploaderCount: 0,

	uploaders: [],
	//  clone of createUploader, to allow multiple uploader on the same page
	createNamedUploader: function (parentElement) {
		
		MsUpload.uploaderCount ++;
		
		var uploaderId = 'msupload-' + MsUpload.uploaderCount ;
		
		// Define the GUI elements
		var uploadDiv = $( '<div>' ).attr({ 'id':  uploaderId + '-div', 'class': 'msupload-div'} ),
			uploadContainer = $( '<div>' ).attr({ 'id': uploaderId + '-container', 'class': 'start-loading', 'title': mw.msg( 'msu-button-title' ) }),
			uploadButton = $( '<div>' ).attr({ 'id': uploaderId + '-select', 'class': 'msupload-select'} ),
			statusDiv = $( '<div>' ).attr({ 'id': uploaderId + '-status', 'class': 'msupload-status'} ).hide(),
			uploadList = $( '<ul>' ).attr({ 'id': uploaderId + '-list', 'class': 'msupload-list'} ),
			bottomDiv = $( '<div>' ).attr({ 'id': uploaderId + '-bottom', 'class': 'msupload-bottom'} ).hide(),
			loadingButton = $( '<i>' ).attr({ 'id': uploaderId + '-loading-button', 'class': 'msupload-loading-button fa fa-spinner fa-spin fa-1x fa-fw'} ).hide(),
			startButton = $( '<a>' ).attr({ 'id': uploaderId + '-files', 'class': 'msupload-files'} ).hide(),
			cleanAll = $( '<a>' ).attr({ 'id': uploaderId + '-clean-all', 'class': 'msupload-clean-all'} ).text( mw.msg( 'msu-clean-all' ) ).hide(),
			galleryInsert = $( '<a>' ).attr({ 'id': uploaderId + '-insert-gallery', 'class': 'msupload-insert-gallery'} ).hide(),
			filesInsert = $( '<a>' ).attr({ 'id': uploaderId + '-insert-files', 'class': 'msupload-insert-files'} ).hide(),
			linksInsert = $( '<a>' ).attr({ 'id': uploaderId + '-insert-links', 'class': 'msupload-insert-links'} ).hide(),
			uploadDrop = $( '<div>' ).attr({ 'id': uploaderId + '-dropzone' , 'class': 'msupload-dropzone'}).text(mw.msg( 'msu-dropzone' )).hide();
		
		// Add them to the DOM
		bottomDiv.append( loadingButton, startButton, cleanAll );
		//bottomDiv.append( galleryInsert, filesInsert, linksInsert );
		uploadDiv.append( statusDiv, uploadDrop, uploadList, bottomDiv );
		uploadDrop.prepend( uploadButton );
		parentElement.prepend( uploadDiv );
		parentElement.prepend( uploadContainer );
		
		// Create the Uploader object
		MsUpload.uploaders[uploaderId] = new plupload.Uploader({
			'runtimes': 'html5,flash,silverlight,html4',
			'browse_button': uploaderId + '-select',
			'container': uploaderId + '-container',
			'max_file_size': '100mb',
			'drop_element': uploaderId + '-dropzone',
			'url': window.msuVars.scriptPath + '/api.php',
			'flash_swf_url': window.msuVars.scriptPath + '/extensions/MsUpload/plupload/Moxie.swf',
			'silverlight_xap_url': window.msuVars.path + '/extensions/MsUpload/plupload/Moxie.xap'
		});
		
		MsUpload.uploaders[uploaderId].uploaderId = uploaderId;

		// Bind events
		MsUpload.uploaders[uploaderId].bind( 'PostInit', MsUpload.onPostInit );
		MsUpload.uploaders[uploaderId].bind( 'FilesAdded', MsUpload.onFilesAdded );
		MsUpload.uploaders[uploaderId].bind( 'QueueChanged', MsUpload.onQueueChanged );
		MsUpload.uploaders[uploaderId].bind( 'StateChanged', MsUpload.onStateChanged );
		MsUpload.uploaders[uploaderId].bind( 'FilesRemoved', MsUpload.onFilesRemoved );
		MsUpload.uploaders[uploaderId].bind( 'BeforeUpload', MsUpload.onBeforeUpload );
		MsUpload.uploaders[uploaderId].bind( 'UploadProgress', MsUpload.onUploadProgress );
		MsUpload.uploaders[uploaderId].bind( 'Error', MsUpload.onError );
		MsUpload.uploaders[uploaderId].bind( 'FileUploaded', MsUpload.onFileUploaded );
		MsUpload.uploaders[uploaderId].bind( 'CheckFiles', MsUpload.onCheckFiles );
		MsUpload.uploaders[uploaderId].bind( 'UploadComplete', MsUpload.onCheckFiles );

		startButton.click( function ( event ) {
			MsUpload.uploaders[uploaderId].start();
			event.preventDefault();
		});
		cleanAll.click( function ( event ) {
			MsUpload.cleanAll(MsUpload.uploaders[uploaderId]);
			event.preventDefault();
		});

		// Initialise
		MsUpload.uploaders[uploaderId].init();
		
		
	},
	
	createMultipleUploader: function () {
		$(".sfImagePreviewWrapper").each(function (i) {
			var parentTemplate = $(this).parents('.multipleTemplateStarter');
			
			//if this div is a hidden template, do not apply uploader on it :
			console.log('parent : ' + parentTemplate.length);
			if (parentTemplate.length > 0) {
				return;
			}
			
			var elementCreated = $(this).find('.msupload-div');
			// to be able to call this fonction many time to add uploader to added div :
			// we create uploader only if not already present :
			if (elementCreated.length == 0) {
				MsUpload.createNamedUploader($(this));
			}
			// add event on add step button :
			$(this).parents('.multipleTemplateInstance').find('.addAboveButton').click(function () {
				// whe launch createMultipleUploader after a timeout, 
				//to be sure news divs are created before executing
				setTimeout(MsUpload.createMultipleUploader, 100);
			});
		});
	},

	uploader: null,
	createUploader: function () {
		
		// Define the GUI elements
		var uploadDiv = $( '<div>' ).attr( 'id', 'msupload-div' ),
			uploadContainer = $( '<div>' ).attr({ 'id': 'msupload-container', 'class': 'start-loading', 'title': mw.msg( 'msu-button-title' ) }),
			uploadButton = $( '<div>' ).attr( 'id', 'msupload-select' ),
			statusDiv = $( '<div>' ).attr( 'id', 'msupload-status' ).hide(),
			uploadList = $( '<ul>' ).attr( 'id', 'msupload-list' ),
			bottomDiv = $( '<div>' ).attr( 'id', 'msupload-bottom' ).hide(),
			startButton = $( '<a>' ).attr( 'id', 'msupload-files' ).hide(),
			cleanAll = $( '<a>' ).attr( 'id', 'msupload-clean-all' ).text( mw.msg( 'msu-clean-all' ) ).hide(),
			galleryInsert = $( '<a>' ).attr( 'id', 'msupload-insert-gallery' ).hide(),
			filesInsert = $( '<a>' ).attr( 'id', 'msupload-insert-files' ).hide(),
			linksInsert = $( '<a>' ).attr( 'id', 'msupload-insert-links' ).hide(),
			uploadDrop = $( '<div>' ).attr( 'id', 'msupload-dropzone' ).text(mw.msg( 'msu-dropzone' )).hide();

		// Add them to the DOM
		bottomDiv.append( startButton, cleanAll, galleryInsert, filesInsert, linksInsert );
		uploadDiv.append( statusDiv, uploadDrop, uploadList, bottomDiv );
		//$( '#wikiEditor-ui-toolbar' ).after( uploadDiv );
		uploadContainer.append( uploadButton );
		//$( '#wikiEditor-ui-toolbar .group-insert' ).append( uploadContainer );
		
		$( '#bodyContent').prepend( uploadDiv );
		$( '#bodyContent' ).prepend( uploadContainer );
		

		// Create the Uploader object
		MsUpload.uploader = new plupload.Uploader({
			'runtimes': 'html5,flash,silverlight,html4',
			'browse_button': 'msupload-select',
			'container': 'msupload-container',
			'max_file_size': '100mb',
			'drop_element': 'msupload-dropzone',
			'url': window.msuVars.scriptPath + '/api.php',
			'flash_swf_url': window.msuVars.scriptPath + '/extensions/MsUpload/plupload/Moxie.swf',
			'silverlight_xap_url': window.msuVars.path + '/extensions/MsUpload/plupload/Moxie.xap'
		});
		
		MsUpload.uploader.uploaderId = 'msupload' ;

		// Bind events
		MsUpload.uploader.bind( 'PostInit', MsUpload.onPostInit );
		MsUpload.uploader.bind( 'FilesAdded', MsUpload.onFilesAdded );
		MsUpload.uploader.bind( 'QueueChanged', MsUpload.onQueueChanged );
		MsUpload.uploader.bind( 'StateChanged', MsUpload.onStateChanged );
		MsUpload.uploader.bind( 'FilesRemoved', MsUpload.onFilesRemoved );
		MsUpload.uploader.bind( 'BeforeUpload', MsUpload.onBeforeUpload );
		MsUpload.uploader.bind( 'UploadProgress', MsUpload.onUploadProgress );
		MsUpload.uploader.bind( 'Error', MsUpload.onError );
		MsUpload.uploader.bind( 'FileUploaded', MsUpload.onFileUploaded );
		MsUpload.uploader.bind( 'CheckFiles', MsUpload.onCheckFiles );
		MsUpload.uploader.bind( 'UploadComplete', MsUpload.onCheckFiles );

		startButton.click( function ( event ) {
			MsUpload.uploader.start();
			event.preventDefault();
		});

		// Initialise
		MsUpload.uploader.init();
	},

	onPostInit: function ( uploader ) {
		mw.log( 'MsUpload DEBUG: runtime: ' + uploader.runtime + ' features: ' + JSON.stringify( uploader.features ) );
		$( '#'+ uploader.uploaderId + '-container' ).removeClass( 'start-loading' );
		if ( uploader.features.dragdrop && window.msuVars.useDragDrop ) {
			$( '#'+ uploader.uploaderId + '-dropzone' ).show();
			$( '#'+ uploader.uploaderId + '-dropzone' ).bind( 'dragover',function () {
				 $( this ).addClass( 'drop-over' ).css( 'padding', 20 );
			}).bind( 'dragleave',function () {
				 $( this ).removeClass( 'drop-over' ).css( 'padding', 0 );
			}).bind( 'drop',function () {
				 $( this ).removeClass( 'drop-over' ).css( 'padding', 0 );
			});
			
	 	} else {
	 		$( '#'+ uploader.uploaderId + '-div' ).addClass( 'nodragdrop' );
	 	}
	},

	onFilesAdded: function ( uploader, files ) {
		$.each( files, function ( i, file ) {
			file.name = mw.config.get('wgPageName') + '_' + file.name;
			console.log(mw.config);
			// iOS6 by SLBoat
			if ( ( navigator.platform === 'iPad' || navigator.platform === 'iPhone' ) ) {
				if ( file.name.indexOf( 'image' ) !== -1 && file.name.length < 11 ) {
					var heute = new Date(),
						fileNameApple = navigator.platform + '_image_' + heute.getFullYear() + '-' + heute.getMonth() + '-' + heute.getDate() + '-' + heute.getTime(); // Because each image is named 'image.jpg' in iOS6
					file.name = fileNameApple + '_' + i + '.' + file.name.split( '.' ).pop(); // image_Y-M-D_0.jpg
				}
			}
			file.li = $( '<li>' ).attr( 'id', file.id ).addClass( 'file' ).appendTo( $( '#'+ uploader.uploaderId + '-list' ) );
			file.li.type = $( '<span>' ).addClass( 'file-type' ).appendTo( file.li );
			file.li.title = $( '<span>' ).addClass( 'file-name' ).text( file.name ).appendTo( file.li );
			file.li.size = $( '<span>' ).addClass( 'file-size' ).text( plupload.formatSize( file.size ) ).appendTo( file.li );
			file.li.loading = $( '<span>' ).addClass( 'file-loading' ).appendTo( file.li );
			file.li.warning = $( '<span>' ).addClass( 'file-warning' ).appendTo( file.li );
			MsUpload.checkExtension( file, uploader );
		});
		uploader.refresh(); // Reposition Flash/Silverlight
		uploader.trigger( 'CheckFiles' );
	},

	onQueueChanged: function ( uploader ) {
		uploader.trigger( 'CheckFiles' );
	},

	onStateChanged: function ( uploader ) {
		mw.log( uploader.state );
		if ( uploader.files.length === ( uploader.total.uploaded + uploader.total.failed ) ) {
			//mw.log( 'State: ' + uploader.files.length ) // All files uploaded
		}
	},

	onFilesRemoved: function ( uploader, files ) {
		mw.log( 'Files removed' );
		//uploader.trigger( 'CheckFiles' );
	},

	onBeforeUpload: function ( uploader, file ) {
		file.li.title.text( file.name ).show(); // Show title
		$( '#' + file.id + ' .file-name-input' ).hide(); // Hide the file name input
		$( '#' + file.id + ' .file-extension' ).hide(); // Hide the file extension
		uploader.settings.multipart_params = {
			'filename': file.name,
			'token': mw.user.tokens.get( 'editToken' ),
			'action': 'upload',
			'ignorewarnings': true,
			'comment': mw.msg( 'msu-comment' ),
			'format': 'json'
		}; // Set multipart_params
		$( '#' + file.id + ' .file-progress-state' ).text( '0%' );
		$( '#'+ uploader.uploaderId + '-loading-button' ).show();
	},

	onUploadProgress: function ( uploader, file ) {
		$( '#' + file.id + ' .file-progress-state' ).text( file.percent + '%' );
	},
	
	onError: function ( uploader, error ) {
		mw.log( error );
		$( '#' + error.file.id + ' .file-warning' ).html(
			'Error ' + error.code + ', ' + error.message + ( error.file ? ', File: ' + error.file.name : '' )
		);
		$( '#'+ uploader.uploaderId + '-status' ).append( error.message );
		uploader.refresh(); // Reposition Flash/Silverlight
	},

	onFileUploaded: function ( uploader, file, success ) {
		mw.log( success );
		file.li.title.unbind( 'click' );
		file.li.title.unbind( 'mouseover' );
		$( '#' + file.id + ' .file-cancel' ).fadeOut( 'fast' );
		$( '#' + file.id + ' .file-progress-state' ).fadeOut( 'fast' );

		try {
			var result = $.parseJSON( success.response );
			if ( result.error ) {
				MsUpload.fileError( uploader, file, result.error.info );
			} else {
				file.li.type.addClass( 'ok' );
				file.li.addClass( 'green' );
				file.li.warning.fadeOut( 'fast' );

				if ( file.cat && mw.config.get( 'wgNamespaceNumber' ) === 14 ) { // Should the categroy be set?
					$.get( mw.util.wikiScript(), {
						action: 'ajax',
						rs: 'MsUpload::saveCat',
						rsargs: [ file.name, mw.config.get('wgPageName') ]
					}, 'json' );
				}
				/*
				$( '<a>' ).text( mw.msg( 'msu-insert-link' ) ).click( function () {
					if ( window.msuVars.useMsLinks === true ) {
						mw.toolbar.insertTags( '{{#l:' + file.name + '}}', '', '', '' ); // Insert link
					} else {
						mw.toolbar.insertTags( '[[:File:' + file.name + ']]', '', '', '' ); // Insert link
					}
				}).appendTo( file.li );
				// function use to insert link into standart (non-form) wikipage with toolbar
				if ( file.group === 'image' ) {
					MsUpload.galleryArray.push( file.name );
					if ( MsUpload.galleryArray.length === 2 ) { // Bind click function only the first time
						$( '#'+ uploader.uploaderId + '-insert-gallery' ).click( MsUpload.insertGallery ).text( mw.msg( 'msu-insert-gallery' ) ).show();
					}
					$( '<span>' ).text( ' | ' ).appendTo( file.li );
					$( '<a>' ).text( mw.msg( 'msu-insert-image' ) ).click( function () {
						mw.toolbar.insertTags( '[[File:' + file.name + window.msuVars.imgParams + ']]', '', '', '' );
					}).appendTo( file.li );
				} else if ( file.group === 'video' ) {
					$( '<span>' ).text( ' | ' ).appendTo( file.li );
					$( '<a>' ).text( mw.msg( 'msu-insert-video' ) ).click( function () {
						mw.toolbar.insertTags( '[[File:' + file.name + ']]', '', '', '' );
					}).appendTo( file.li );
				}*/
				MsUpload.filesArray.push( file.name );
				/*
				if ( MsUpload.filesArray.length === 2 ) { // Bind click function only the first time
					$( '#'+ uploader.uploaderId + '-insert-files' ).click( MsUpload.insertFiles ).text( mw.msg( 'msu-insert-files' ) ).show();
					$( '#'+ uploader.uploaderId + '-insert-links' ).click( MsUpload.insertLinks ).text( mw.msg( 'msu-insert-links' ) ).show();
				}*/
				// automatically add image to forms inputs.
				MsUpload.addImageToFormsInputs(uploader,file);
				// look 
			}
		} catch( error ) {
			MsUpload.fileError( uploader, file, 'Error: ' + success.response.replace( /(<([^>]+)>)/ig, '' ) ); // Remove html tags
		}
		uploader.removeFile( file ); // For preventing a second upload afterwards

		$( '#'+ uploader.uploaderId + '-loading-button' ).hide();
	},
	
	addImageToFormsInputs: function (uploader, file) {
		
		// file.name : nom du fichier à ajouter :
		
		var inputs = $('#' + uploader.uploaderId  +'-container' ).parents('.col-pic-step').find('input.createboxInput');
		
		emptiesInputs = inputs.filter(function() { return this.value == ""; });
		
		if (emptiesInputs.length > 0) {
			// if we get an input with no value, we add filename to it
			emptiesInputs.first().val(file.name);
		} else {
			MsUpload.fileError( uploader, file, 'Error: ' + 'file limit exceded' ); 
		}
	},

	onCheckFiles: function ( uploader ) {
		var filesLength = uploader.files.length,
			listLength = $( '#'+ uploader.uploaderId + '-list li' ).length;

		mw.log( 'files: ' + filesLength + ', gallery: ' + MsUpload.galleryArray.length + ', list: ' + listLength );

		if ( filesLength ) {
			$( '#'+ uploader.uploaderId + '-bottom' ).show();
			if ( filesLength === 1 ) {
				$( '#'+ uploader.uploaderId + '-files' ).text( mw.msg( 'msu-upload-this' ) ).show();
			} else {
				$( '#'+ uploader.uploaderId + '-files' ).text( mw.msg( 'msu-upload-all' ) ).show();
			}
		} else {
			$( '#'+ uploader.uploaderId + '-files' ).hide();
		}

		if ( MsUpload.unconfirmedReplacements ) {
			$( '#'+ uploader.uploaderId + '-files' ).hide();
		}

		if ( MsUpload.filesArray.length > 1 ) {
			$( '#'+ uploader.uploaderId + '-insert-files' ).show();
			$( '#'+ uploader.uploaderId + '-insert-links' ).show();
		} else {
			$( '#'+ uploader.uploaderId + '-insert-files' ).hide();
			$( '#'+ uploader.uploaderId + '-insert-links' ).hide();
		}

		if ( MsUpload.galleryArray.length > 1 ) {
			$( '#'+ uploader.uploaderId + '-insert-gallery' ).show();
			$( '#'+ uploader.uploaderId + '-bottom' ).show();
		} else {
			$( '#'+ uploader.uploaderId + '-insert-gallery' ).hide();
		}

		if ( listLength ) {
			$( '#'+ uploader.uploaderId + '-bottom' ).show();
			$( '#'+ uploader.uploaderId + '-clean-all' ).text( mw.msg( 'msu-clean-all' ) ).show();
		} else {
			$( '#'+ uploader.uploaderId + '-bottom' ).hide();
		}
		uploader.refresh(); // Reposition Flash/Silverlight
		
		// auto-start upload
		if (filesLength && ! MsUpload.unconfirmedReplacements ) {
			console.log('autoStarting !');
			//uploader.start();
		}
	},

	init: function () {
		if ( $.inArray( mw.config.get( 'wgAction' ), [ 'edit', 'submit' ] ) !== -1 ) {
			mw.loader.using( 'user.options', function () {
				if ( mw.user.options.get( 'usebetatoolbar' ) ) {
					mw.loader.using( 'ext.wikiEditor.toolbar', function () {
						$.when(
							mw.loader.using( 'ext.wikiEditor.toolbar' ), $.ready
						).then( MsUpload.createUploader );
					});
				}
			});
		}
		if ( $.inArray( mw.config.get( 'wgAction' ), [ 'formedit' ] ) !== -1 ) {
			MsUpload.createMultipleUploader();
			// add event on new step button, to appli drop-zone on new steps
			$('.multipleTemplateAdder').click(function () {
				// whe launch createMultipleUploader after a timeout, 
				//to be sure news divs are created before executing
				setTimeout(MsUpload.createMultipleUploader, 100);
			});
		}
	}
};

$( MsUpload.init );

// function called when an step is added, to apply drop zone on new fields
msUploadReload = function () {
	$( MsUpload.createMultipleUploader );
};

