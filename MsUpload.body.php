<?php

class MsUpload {

	static function addToForm($text) {

		static $isStarted = false;
		if (!$isStarted) {
			self::start();
			$isStarted = true;
		}
	}

	static function start() {
		global $wgOut, $wgScriptPath, $wgJsMimeType, $wgMSL_FileTypes, $wgMSU_useMsLinks,
			$wgMSU_showAutoCat, $wgMSU_autoIndex, $wgMSU_checkAutoCat, $wgMSU_confirmReplace,
			$wgMSU_useDragDrop, $wgMSU_imgParams, $wgFileExtensions,
			$wgMSU_wrapperClass,$wgMSU_secondaryWrapperClass, $wgMSU_useDragDropAllContainer;

		$wgOut->addModules( 'ext.MsUpload' );
		$wgOut->addJsConfigVars( array(
			'wgFileExtensions' => array_values( array_unique( $wgFileExtensions ) ),
		));

		if ( $wgMSU_imgParams ) {
			$wgMSU_imgParams = '|' . $wgMSU_imgParams;
		}

		if ( ! $wgMSU_wrapperClass) {
			//$wgMSU_WrapperClass = 'sfImagePreviewWrapper';
			$wgMSU_wrapperClass = 'wfImagePreviewGalleryWrapper';
		}
		if ( ! $wgMSU_secondaryWrapperClass) {
			$wgMSU_secondaryWrapperClass = 'sfImagePreview';
		}

		// get max upload file size :
		$file_upload_max_size = self::file_upload_max_size();
		$msuVars = array(
			'scriptPath' => $wgScriptPath,
			'useDragDrop' => $wgMSU_useDragDrop,
			'showAutoCat' => $wgMSU_showAutoCat,
			'checkAutoCat' => $wgMSU_checkAutoCat,
			'useMsLinks' => $wgMSU_useMsLinks,
			'confirmReplace' => $wgMSU_confirmReplace,
			'imgParams' => $wgMSU_imgParams,
			'wrapperClass' => $wgMSU_wrapperClass,
			'secondaryWrapperClass' => $wgMSU_secondaryWrapperClass,
			'useDragDropAllContainer' => $wgMSU_useDragDropAllContainer,
			'fileUploadMaxSize' => $file_upload_max_size,
		);

		$msuVars = json_encode( $msuVars );
		$wgOut->addScript( "<script type=\"$wgJsMimeType\">window.msuVars = $msuVars;</script>\n" );
		//$wgOut->addScript( '<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>' . "\n");


		$modal = self::getmodalHtml();
		$wgOut->addHTML($modal);
		return true;
	}

	static function file_upload_max_size() {
		static $max_size = -1;

		if ($max_size < 0) {
			// Start with post_max_size.
			$post_max_size = self::parse_size(ini_get('post_max_size'));
			if ($post_max_size > 0) {
				$max_size = $post_max_size;
			}

			// If upload_max_size is less, then reduce. Except if upload_max_size is
			// zero, which indicates no limit.
			$upload_max = self::parse_size(ini_get('upload_max_filesize'));
			if ($upload_max > 0 && $upload_max < $max_size) {
				$max_size = $upload_max;
			}
			if($max_size > 0) {
				// conversion in MB :
				$max_size = intval($max_size / (1024 * 1024));
			}
		}

		return $max_size;
	}

	static function parse_size($size) {
		$unit = preg_replace('/[^bkmgtpezy]/i', '', $size); // Remove the non-unit characters from the size.
		$size = preg_replace('/[^0-9\.]/', '', $size); // Remove the non-numeric characters from the size.
		if ($unit) {
			// Find the position of the unit in the ordered string which is the power of magnitude to multiply a kilobyte by.
			return round($size * pow(1024, stripos('bkmgtpezy', $unit[0])));
		}
		else {
			return round($size);
		}
	}

	static function getmodalHtml() {
		$maxSize = self::file_upload_max_size();
		return '
				<div class="modal fade" id="msUploadModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
				<div class="modal-dialog" role="document">
				<div class="modal-content">
				<div class="modal-header">
				<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
				<h4 class="modal-title" ><i class="fa fa-warning" aria-hidden"true"=""></i> '.wfMessage('msu-messagetitle-file-too-large').'</h4>
				</div>
				<div class="modal-body">
				'.wfMessage('msu-upload-error-file-too-large', $maxSize).'
				</div>

				<div class="modal-footer">
				<a><button type="button"  class="btn btn-primary" data-dismiss="modal" aria-label="Close">'.wfMessage('close').'</button></a>
				</div>

				</div>
				</div>
				</div>';
	}

	static function saveCat( $filename, $category ) {
        global $wgContLang, $wgUser;
		$mediaString = strtolower( $wgContLang->getNsText( NS_FILE ) );
		$title = $mediaString . ':' . $filename;
		$text = "\n[[" . $category . "]]";
		$wgEnableWriteAPI = true;
		$params = new FauxRequest(array (
			'action' => 'edit',
			'section'=> 'new',
			'title' =>  $title,
			'text' => $text,
			'token' => $wgUser->editToken(),//$token."%2B%5C",
		), true, $_SESSION );
		$enableWrite = true;
		$api = new ApiMain( $params, $enableWrite );
		$api->execute();
		if ( defined( 'ApiResult::META_CONTENT' ) ) {
			$data = $api->getResult()->getResultData();
		} else {
			$data = &$api->getResultData();
		}
		return $mediaString;

/* The code below does the same and is better, but for some reason it doesn't update the categorylinks table, so it's no good
		global $wgContLang, $wgUser;
		$title = Title::newFromText( $filename, NS_FILE );
		$page = new WikiPage( $title );
		$text = $page->getText();
		$text .= "\n\n[[" . $category . "]]";
		$summary = wfMessage( 'msu-comment' );
		$status = $page->doEditContent( $text, $summary, EDIT_UPDATE, false, $wgUser );
		$value = $status->value;
		$revision = $value['revision'];
		$page->doEditUpdates( $revision, $wgUser );
		return true;
*/
	}
}
