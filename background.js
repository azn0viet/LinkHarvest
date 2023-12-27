let allURLs = [];
let handledTabsIds = [];

const kRealDebridUnrestrictUrl = "https://api.real-debrid.com/rest/1.0/unrestrict/link";
const kUnrestrictLinksTokenSettingKey = "unrestrictLinksTokenSettingKey";
const kLinkPatternsSettingKey = "linkPatternsSettingKey";

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	processTabs(request.tabs, request.unrestrict);
});

function showAlert(msg) {
	chrome.runtime.sendMessage({ action: 'showErrorAlert', message: msg });
}

function processTabs(tabs, unrestrict) {
	chrome.storage.local.get([kLinkPatternsSettingKey, kUnrestrictLinksTokenSettingKey], function(result) {
		if (!result[kLinkPatternsSettingKey]) {
			showAlert(chrome.i18n.getMessage('pleaseEnterAtLeastOneLinkPattern'));
			return;
		}
		
		if (unrestrict && !result[kUnrestrictLinksTokenSettingKey]) {
			showAlert(chrome.i18n.getMessage('pleaseEnterRealDebridTokenAPI'));
			return;
		}
		
		const linkPatterns = result[kLinkPatternsSettingKey].split('\n');
		
		tabs.forEach(function (tab) {
			checkAndAddUrlForTab(tab, linkPatterns);
		});
		
		if (allURLs.length === 0) {
			console.log("No URL found");
			showAlert(chrome.i18n.getMessage('noDownloadLinksDetected'));
			return;
		}
		
		if (unrestrict) {
			unrestrictLinks(allURLs, result[kUnrestrictLinksTokenSettingKey]);
		} else {
			handleURLsResult(allURLs);
		}
	});
}

function checkAndAddUrlForTab(tab, linkPatterns) {
	if (!containsAny(tab.url, linkPatterns)) {
		return;
	}
	
	console.log("Added URL: " + tab.url);
	
	if (!allURLs.includes(tab.url)) {
		allURLs.push(tab.url);
	}
	
	handledTabsIds.push(tab.id);
}

function handleURLsResult(urls) {
	console.log("handleURLsResult: " + urls);

	chrome.runtime.sendMessage({ 
		action: 'handleUrlsResult',
		urls: urls,
		tabsIds: handledTabsIds
	});
	
	reset();
}

function reset() {
	console.log("reset");
	
	allURLs = [];
	handledTabsIds = [];
}

function containsAny(url, patterns) {
	return patterns.some(pattern => url.includes(pattern));
}

async function unrestrictLinks(urls, token) {
	const unrestrictedUrls = [];
	
	for (const url of urls) {
		try {
			const result = await unrestrictLink(url, token)
			unrestrictedUrls.push(result);
		} catch {
			console.log("Error for URL " + url + ": " + error.message);
			continue;
		}
	}
	
	handleURLsResult(unrestrictedUrls);
}

async function unrestrictLink(link, token) {
	try {
		// Options de la requête
		const requestOptions = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json'
			},
			body: 'link=' + link
		};
		
		const response = await fetch(kRealDebridUnrestrictUrl, requestOptions);

		if (!response.ok) {
		  throw new Error(`Erreur HTTP! Statut: ${response.status}`);
		}

		const data = await response.json();
		console.log('Réponse de l\'API:', data);
		return data.download;
	} catch (error) {
		console.error('Erreur lors de la requête:', error);
		throw error; // Propagez l'erreur pour qu'elle puisse être gérée ailleurs si nécessaire
	}
}