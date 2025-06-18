"use strict";

let bookmarkData;
let badgeType;

chrome.runtime.onInstalled.addListener(() => {
  registerListeners();
  refreshTree();
  updateBadgeTextType();
});

chrome.runtime.onStartup.addListener(() => {
  registerListeners();
  refreshTree();
  updateBadgeTextType();
});

function registerListeners() {
  chrome.bookmarks.onCreated.addListener(refreshTree);
  chrome.bookmarks.onRemoved.addListener(refreshTree);
  chrome.bookmarks.onChanged.addListener(refreshTree);
  chrome.bookmarks.onImportEnded.addListener(refreshTree);

  chrome.tabs.onUpdated.addListener(updateBadgeText);
  chrome.storage.onChanged.addListener(updateBadgeTextType);

  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      updateBadgeText(undefined, undefined, tab);
    });
  });
}

function refreshTree() {
  chrome.bookmarks.search({}, (results) => {
    bookmarkData = results;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        updateBadgeText(undefined, undefined, tabs[0]);
      }
    });
  });
}

function updateBadgeText(tabId, changeInfo, tab) {
  if (!bookmarkData || !tab || !tab.url) return;

  console.log("updateBadgeText");

  let count = 0;

  if (badgeType === "domain") {
    const reg = /:\/\/[^/]*/;
    const url = reg.exec(tab.url)?.[0];
    if (!url) return;

    for (let i = 0; i < bookmarkData.length; i++) {
      const b = bookmarkData[i];
      if (b.url && b.url.includes(url)) count++;
    }
  } else if (badgeType === "total") {
    count = bookmarkData.filter((b) => b.url).length;
  } else if (badgeType === "today") {
    const startTime = new Date().setHours(0, 0, 0, 0);
    const endTime = new Date().setHours(24, 0, 0, 0);
    count = bookmarkData.filter(
      (b) => b.url && b.dateAdded >= startTime && b.dateAdded <= endTime
    ).length;
  } else {
    count = "";
  }

  setBadgeText(count);
}

function updateBadgeTextType() {
  console.log("updateBadgeTextType");

  chrome.storage.sync.get({ badge: "domain" }, (items) => {
    badgeType = items.badge;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        updateBadgeText(undefined, undefined, tabs[0]);
      }
    });
  });
}

function setBadgeText(count) {
  if (typeof count === "string") {
    chrome.action.setBadgeText({ text: count });
    return;
  }

  if (count > 999999) {
    count = parseInt(count / 1000000) + "m";
  } else if (count > 999) {
    count = parseInt(count / 1000) + "k";
  }

  chrome.action.setBadgeText({ text: count.toString() });
}
