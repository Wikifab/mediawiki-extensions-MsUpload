<?php

$wgExtensionCredits['parserhook'][] = array(
	'name' => 'MsUpload',
	'url' => 'http://www.mediawiki.org/wiki/Extension:MsUpload',
	'version' => '12.0',
	'descriptionmsg' => 'msu-desc',
	'license-name' => 'GPL-2.0+',
	'author' => array( '[mailto:wiki@ratin.de Martin Schwindl]', '[mailto:wiki@keyler-consult.de Martin Keyler]', '[https://www.mediawiki.org/wiki/User:Luis_Felipe_Schenone Luis Felipe Schenone]' ),
);

$wgResourceModules['ext.MsUploadplupload'] = array(
	'scripts' => array(
		'plupload/plupload.full.min.js',
	),
	'localBasePath' => __DIR__,
	'remoteExtPath' => 'MmsUpload',
);

$wgResourceModules['ext.MsUpload'] = array(
	'scripts' => array(
		'MsUpload.js',
		'MmsUpload.js'
	),
	'dependencies' => array(
			'jquery.ui.draggable',
			'jquery.ui.droppable',
			'jquery.ui.sortable',
			'jquery.ui.progressbar',
			'ext.MsUploadplupload'
	),
	'styles' => array(
			'MsUpload.css',
			'MmsUpload.css',
	),
	'messages' => array(
		'msu-button-title',
		'msu-insert-link',
		'msu-insert-gallery',
		'msu-insert-files',
		'msu-insert-links',
		'msu-insert-image',
		'msu-insert-video',
		'msu-cancel-upload',
		'msu-replace-file',
		'msu-clean-all',
		'msu-ext-not-allowed',
		'msu-upload-this',
		'msu-upload-all',
		'msu-dropzone',
		'msu-comment',
		'msu-remove-image',
		'msu-upload-nbfile-exceed',
		'msu-upload-error-file-too-large',
		'mmsupload-conflicting-imgs-modal-header',
		'mmsupload-conflicting-imgs-modal-old-image-label',
		'mmsupload-conflicting-imgs-modal-new-image-label',
		'mmsupload-conflicting-imgs-modal-whattodo',
		'mmsupload-conflicting-imgs-modal-option-replace',
		'mmsupload-conflicting-imgs-modal-option-rename',
		'mmsupload-conflicting-imgs-modal-option-rename-input-label',
		'mmsupload-conflicting-imgs-modal-option-ignore',
		'mmsupload-conflicting-imgs-modal-applytoall',
		'mmsupload-conflicting-imgs-modal-submit'
	),
	'localBasePath' => __DIR__,
	'remoteExtPath' => 'MmsUpload',
);

$wgMessagesDirs['MsUpload'] = __DIR__ . '/i18n';

$wgAutoloadClasses['MsUpload'] = __DIR__ . '/MsUpload.body.php';

$wgHooks['EditPage::showEditForm:initial'][] = 'MsUpload::start';
$wgHooks['FormEdit::showEditForm:initial'][] = 'MsUpload::start';
$wgHooks['sfRenderingEnd'][] = 'MsUpload::addToForm';

$wgAjaxExportList[] = 'MsUpload::saveCat';

// Default configuration
$wgMSU_useDragDrop = true;
$wgMSU_showAutoCat = true;
$wgMSU_checkAutoCat = true;
$wgMSU_useMsLinks = false;
$wgMSU_confirmReplace = true;
$wgMSU_imgParams = '400px';
$wgMSU_wrapperClass = '';
$wgMSU_secondaryWrapperClass = '';
$wgMSU_useDragDropAllContainer = true;
