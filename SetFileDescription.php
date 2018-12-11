<?php

use ApiBase;

/**
 * Set description for a file
 *
 * @author Julien
 */
class SetFileDescription extends ApiBase {

	public function __construct($query, $moduleName) {
		parent::__construct ( $query, $moduleName );
	}
	public function getAllowedParams() {
		return array (
			'filename' => array ( //value from which to search
					ApiBase::PARAM_TYPE => 'string',
					ApiBase::PARAM_REQUIRED => false
			),
			'description' => array ( //search for files matching this value
					ApiBase::PARAM_TYPE => 'string',
					ApiBase::PARAM_REQUIRED => false
			)
		);
	}
	public function getParamDescription() {
		return [ ];
	}
	public function getDescription() {
		return false;
	}
	public function execute() {

		global $wgPageMediaGallerySearchLimit;

		// $user = $this->getUser();

		// if(!$user->isAllowed( '' )){
		//		throw new \PermissionsError( '' );
		// }

		$input = $this->getMain()->getVal( 'input' );
		$offset = $this->getMain()->getVal( 'offset' );

		if (empty($input)) {
			$list = 'allimages'; //$list is the API to use
		} else {
			$list = 'search';
		}
		
		$requestParams = array(
			'action' => 'query',
			'list' => $list
		);

		switch ($list) {
			case 'search': //here we assume $input is not empty
				if ($input) {
					$requestParams['srsearch'] = $input;
				}
				$requestParams['srnamespace'] = NS_FILE;
				if ($offset) {
					$requestParams['sroffset'] = intval($offset);
				}
				$requestParams['srlimit'] = $wgPageMediaGallerySearchLimit;
				break;
			case 'allimages': //here we assume $input is empty
				$requestParams['ailimit'] = $wgPageMediaGallerySearchLimit;
				$requestParams['aiprop'] = 'url|mime';
				$requestParams['aisort'] = 'timestamp';
				$requestParams['aidir'] = 'descending';
				if ($offset) {
					$requestParams['aistart'] = intval($offset);
				}
				break;
			default:
		}

		$searchResults = self::APIFauxRequest($requestParams);

		switch ($list) {
			case 'search': //here we assume $input is not empty
				if (isset($searchResults['query']) && isset($searchResults['query']['search'])){
					foreach ($searchResults['query']['search'] as $key => $value) {
						if (!isset($value['title'])) {
							continue;
						}
						$file = wfLocalFile(\Title::newFromText($value['title']));
						$a = array();
						$a['filename'] = $file->getName();
						$a['mime'] = $file->getMimeType();
						if ($file->getMimeType() == 'application/sla') {

							$requestParams['iiprop'] = 'url';
							$requestParams['action'] = 'query';
							$requestParams['titles'] = 'File:' . $file->getName();
							$requestParams['iiurlwidth'] = '400px';
							$requestParams['prop'] = 'imageinfo';

							$imageInfoResult = self::APIFauxRequest($requestParams);

							if (isset($imageInfoResult['query']) && isset($imageInfoResult['query']['pages'])){

								$pages = $imageInfoResult['query']['pages'];

								$a['fileurl'] = reset($pages)['imageinfo'][0]['thumburl'];
							} else {
								$a['fileurl'] = $file->getUrl();
							}

						} else {
							$a['fileurl'] = $file->getUrl();
						}
						$r['search'][] = $a;
					}
					if (isset($searchResults['continue']) && isset($searchResults['continue']['sroffset'])) {
						$r['continue']['offset'] = $searchResults['continue']['sroffset'];
					}
				} else {

				}
				break;
			case 'allimages': //here we assume $input is empty
				if (isset($searchResults['query']) && isset($searchResults['query']['allimages'])){
					foreach ($searchResults['query']['allimages'] as $key => $value) {
						if (!isset($value['name'])) {
							continue;
						}
						$a = array();
						$a['filename'] = $value['name'];
						$a['mime'] = $value['mime'];
						if ($value['mime'] == 'application/sla') {

							$requestParams = [];
							$requestParams['action'] = 'query';
							$requestParams['iiprop'] = 'url';
							$requestParams['titles'] = 'File:' . $value['name'];
							$requestParams['iiurlwidth'] = '400px';
							$requestParams['prop'] = 'imageinfo';

							$imageInfoResult = self::APIFauxRequest($requestParams);

							if (isset($imageInfoResult['query']) && isset($imageInfoResult['query']['pages'])){

								$pages = $imageInfoResult['query']['pages'];

								$a['fileurl'] = reset($pages)['imageinfo'][0]['thumburl'];
							} else {
								$a['fileurl'] = $value['url'];
							}

						} else {
							$a['fileurl'] = $value['url'];
						}
						$r['search'][] = $a;
					}
					if (isset($searchResults['continue']) && isset($searchResults['continue']['aicontinue'])) {
						$r['continue']['offset'] = $searchResults['continue']['aicontinue'];
					}
				} else {

				}
				break;
			default:
		}

		$this->getResult()->addValue ( null, $this->getModuleName(), $r );
	}

	public function needsToken() {
		return 'csrf';
	}

	/**
	 * Execute a request to the API within mediawiki using FauxRequest
	 *
     * @param $data array Array of non-urlencoded key => value pairs, the fake GET/POST values
     * @param $wasPosted bool Whether to treat the data as POST 
     * @param $session MediaWiki\\Session\\Session | array | null Session, session data array, or null
     * @param $protocol string 'http' or 'https' 
     * @return array the result data array
     *
	 * @see https://doc.wikimedia.org/mediawiki-core/master/php/classFauxRequest.html
	 */
	private function APIFauxRequest($data = [],
		  	$wasPosted = false,
		  	$session = null,
		  	$protocol = 'http' ){

		$res = array();

		$apiParams = new \FauxRequest($data, $wasPosted, $session, $protocol);

		try {
			$api = new \ApiMain( $apiParams );
			$api->execute();
			$res = $api->getResult()->getResultData();
		} catch (\Exception $e) {
			trigger_error("API exception : " . $e->getMessage(), E_USER_WARNING);
		}

		return $res;
	}
}