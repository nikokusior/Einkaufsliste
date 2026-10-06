// Offline-Unterstützung für die Einkaufsliste:
// Beim Öffnen wird zuerst das Netz versucht (damit Updates ankommen),
// gibt es innerhalb von 3 Sekunden keine Antwort, kommt die gespeicherte Kopie.
var CACHE = "einkaufsliste-v1";
var FILES = ["./", "index.html", "icon.png", "manifest.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error("timeout")); }, ms);
    promise.then(
      function (v) { clearTimeout(t); resolve(v); },
      function (err) { clearTimeout(t); reject(err); }
    );
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    withTimeout(fetch(req, { cache: "no-cache" }), 3000)
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match("index.html");
          return Response.error();
        });
      })
  );
});
