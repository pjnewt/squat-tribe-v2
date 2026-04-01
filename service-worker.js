self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open('squat-tribe').then(cache=>{
      return cache.addAll(['./']);
    })
  );
});
