importScripts('/js/idb.js');
importScripts('/js/utility.js');

var CACHE_STATIC_NAME = 'static-v5';
var CACHE_DYNAMIC_NAME = 'dynamic-v2';
var STATIC_FILES = [
  '/',
  '/index.html',
  '/js/app.js',
  '/js/utility.js',
  '/js/idb.js',
  '/js/promise.js',
  '/js/fetch.js',
  ];

var kioskid='';

  self.addEventListener('install', function (event) {
    console.log('[Service Worker] Installing Service Worker ...', event);
    event.waitUntil(
      caches.open(CACHE_STATIC_NAME)
        .then(function (cache) {
          console.log('[Service Worker] Precaching App Shell');
          cache.addAll(STATIC_FILES);
        })
    )
  });
  
  self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activating Service Worker ....', event);
    event.waitUntil(
      caches.keys()
        .then(function(keyList) {
          return Promise.all(keyList.map(function(key) {
            if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
              console.log('[Service Worker] Removing old cache.', key);
              return caches.delete(key);
            }
          }));
        })
    );
    return self.clients.claim();
  });

  function isInArray(string, array) {
    var cachePath;
    if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
      console.log('matched ', string);
      cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
    } else {
      cachePath = string; // store the full request (for CDNs)
    }
    return array.indexOf(cachePath) > -1;
  }
   
  self.addEventListener('message', function(event) {
    kioskid = event.data.message;
});

  self.addEventListener('fetch', function (event) {

    var url = 'https://adlet-goa.herokuapp.com/api/v1/kiosks/'+kioskid;
    if (event.request.url.indexOf(url) > -1) {
      event.respondWith(fetch(event.request)
        .then(function (res) {
          var clonedRes = res.clone();
          clearAllData('videos')
            .then(function () {
              return clonedRes.json();
            })
            .then(function (datas) {
              for(var key in datas.data.data.ads){
                writeData('videos', datas.data.data.ads[key])
              }
                
            });
          return res;
        })
      );
    } else if (isInArray(event.request.url, STATIC_FILES)) {
      event.respondWith(
        caches.match(event.request)
      );
    } else {
      event.respondWith(
        caches.match(event.request)
          .then(function (response) {
            if (response) {
              return response;
            } else {
              return fetch(event.request)
                .then(function (res) {
                  return caches.open(CACHE_DYNAMIC_NAME)
                    .then(function (cache) {
                      //trimCache(CACHE_DYNAMIC_NAME, 5);
                      cache.put(event.request.url, res.clone());
                      return res;
                    })
                })
            }
          })
      );
    }
  });
  
