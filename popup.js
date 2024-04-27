// Settings
const kLinkPatternsSettingKey = "linkPatternsSettingKey";
const kUnrestrictLinksSettingKey = "unrestrictLinksSettingKey";
const kUnrestrictLinksTokenSettingKey = "unrestrictLinksTokenSettingKey";
const kActionSettingKey = "actionSettingKey";
const kOpenNewTabSettingKey = "openNewTabSettingKey";
const kNewTabUrlSettingKey = "newTabUrlSettingKey";
const kCloseTabsSettingKey = "closeTabsSettingKey";

// HTML components id
const kLinkPatternsLabelId = "linkPatternsLabel";
const kLinkPatternsTextAreaId = "linkPatterns";
const kGoButtonId = "goButton";
const kActionSelectId = "actionSelect";
const kUnrestrictCheckboxId = "unrestrictCheckbox";
const kSetupUnrestrictIconId = "setupUnrestrictIcon";
const kOpenNewTabCheckboxId = "openNewTabCheckbox";
const kSetupNewTabUrlIconId = "setupNewTabUrlIcon";
const kCloseTabsCheckboxId = "closeTabsCheckbox";

document.addEventListener('DOMContentLoaded', function () {
	console.log("DOMContentLoaded");
	
	loadLocalStorageConfig();
	localizeUI();
	
	const linkPatternsTextArea = document.getElementById(kLinkPatternsTextAreaId);
	linkPatternsTextArea.addEventListener('input', function() {
		setSetting(kLinkPatternsSettingKey, linkPatternsTextArea.value);
	});
	
	document.getElementById(kGoButtonId).addEventListener('click', function() {
		chrome.tabs.query({}, function (tabs) {
			console.log("goButton clicked");
			
			const unrestrict = document.getElementById(kUnrestrictCheckboxId).checked;
			const action = document.getElementById(kActionSelectId).value;

			if (action === 'download' && !unrestrict) {
				alert(chrome.i18n.getMessage('cannotDownloadWithoutUnrestrictError'));
				return;
			}

			chrome.runtime.sendMessage({ 
				action: "processTabs", 
				tabs: tabs,
				unrestrict: unrestrict,
				action: action
			});
		});
	});
	
	document.getElementById(kSetupUnrestrictIconId).addEventListener('click', function() {
		promptSetting(kUnrestrictLinksTokenSettingKey, chrome.i18n.getMessage('enterRealDebridDescription'));
	});

	document.getElementById(kSetupNewTabUrlIconId).addEventListener('click', function() {
		promptSetting(kNewTabUrlSettingKey, chrome.i18n.getMessage('enterNewTabUrlToOpen'));
	});
	
	const openNewTabCheckbox = document.getElementById(kOpenNewTabCheckboxId);
	openNewTabCheckbox.addEventListener('change', function() {
		setSetting(kOpenNewTabSettingKey, openNewTabCheckbox.checked);
	});
	
	const unrestrictCheckbox = document.getElementById(kUnrestrictCheckboxId);
	unrestrictCheckbox.addEventListener('change', function() {
		setSetting(kUnrestrictLinksSettingKey, unrestrictCheckbox.checked);
	});
	
	const closeTabsCheckbox = document.getElementById(kCloseTabsCheckboxId);
	closeTabsCheckbox.addEventListener('change', function() {
		setSetting(kCloseTabsSettingKey, closeTabsCheckbox.checked);
	});

	const actionSelect = document.getElementById(kActionSelectId);
	actionSelect.addEventListener('change', function() {
		setSetting(kActionSettingKey, actionSelect.value);
	});

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		chrome.tabs.getCurrent((currentTab) => {
			if (request.action === 'showErrorAlert') {
				alert(request.message);
			}
			else if (request.action === 'handleUrlsResult') {
				const urls = request.urls;
				
				const action = document.getElementById(kActionSelectId).value || 'copy';
				if (action === 'download') {
					console.log("Download all urls");
					urls.forEach(function(url) {
						chrome.downloads.download({	url: url })
					});
				} else {
					console.log("Copy all urls");
					const joinedUrls = urls.join('\n');
					copyToClipboard(joinedUrls);

					var message = chrome.i18n.getMessage('downloadLinksCopied', [urls.length]);
					alert(message + "\n\n" + joinedUrls);
				}
				
				const openNewTabCheckbox = document.getElementById(kOpenNewTabCheckboxId);
				if (openNewTabCheckbox.checked) {
					getSetting(kNewTabUrlSettingKey, function(value) {
						if (value) {
							chrome.tabs.create({ url: value });
						}
					});
				}
				
				const closeTabsCheckbox = document.getElementById(kCloseTabsCheckboxId);
				if (closeTabsCheckbox.checked) {
					chrome.tabs.remove(request.tabsIds);
				}
			}
		});
	});
});

function loadLocalStorageConfig() {
	const keys = [
		kLinkPatternsSettingKey,
		kActionSettingKey,
		kUnrestrictLinksSettingKey,
		kOpenNewTabSettingKey,
		kCloseTabsSettingKey
	];
	
	chrome.storage.local.get(keys, function (result) {
		const linkPatterns = result[kLinkPatternsSettingKey] || '';
		document.getElementById(kLinkPatternsTextAreaId).value = linkPatterns;

		const actionSetting = result[kActionSettingKey] || "copy";
		document.getElementById(kActionSelectId).value = actionSetting;
		
		loadCheckbox(kUnrestrictCheckboxId, result[kUnrestrictLinksSettingKey]);
		loadCheckbox(kOpenNewTabCheckboxId, result[kOpenNewTabSettingKey]);
		loadCheckbox(kCloseTabsCheckboxId, result[kCloseTabsSettingKey]);
	});
}

function loadCheckbox(id, storedValue) {
	const value = storedValue || false;
	document.getElementById(id).checked = value;
}

function localizeUI() {
	document.getElementById(kLinkPatternsLabelId).innerText = chrome.i18n.getMessage('linkPatternsDescription');
	document.getElementById(kLinkPatternsTextAreaId).placeholder = chrome.i18n.getMessage('linkPatternsPlaceholder');
	document.getElementById(kGoButtonId).innerText = chrome.i18n.getMessage('goButton');
	
	document.querySelector("label[for=" + kUnrestrictCheckboxId + "]").innerText = chrome.i18n.getMessage('unrestrictLinks');
	document.querySelector("label[for=" + kOpenNewTabCheckboxId + "]").innerText = chrome.i18n.getMessage('openNewTab');
	document.querySelector("label[for=" + kCloseTabsCheckboxId + "]").innerText = chrome.i18n.getMessage('closeTabs');

	document.querySelector("option[value=copy]").innerHTML = chrome.i18n.getMessage('copyLinks');
	document.querySelector("option[value=download]").innerHTML = chrome.i18n.getMessage('downloadAutomatically');
}

function promptSetting(key, title) {
	getSetting(key, function(value) {
		const newValue = prompt(title, value);

		if (newValue !== null) {
			chrome.storage.local.set({ [key]: newValue }, function() {
				console.log(`Setting \`${key}\` has been updated with value: ${newValue}`);
			});
		}
	});
}

function getSetting(key, callback) {
	chrome.storage.local.get([key], function(result) {
		if (typeof callback === 'function') {
			callback(result[key] || '');
		}
	});
}

function setSetting(key, value) {
	chrome.storage.local.set({ [key]: value}, function() {
		console.log(`Setting \`${key}\` has been updated with value: ${value}`);
	});
}

function copyToClipboard(text) {
	var textArea = document.createElement("textarea");
	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.select();
	document.execCommand('copy');
	document.body.removeChild(textArea);
}