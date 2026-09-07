/* Page 12 only: pair each original sign clip with its narration group. */
(function () {
  'use strict';
  var boundary = 36.88;
  var activeSegment = null;
  var previousPlay = HTMLMediaElement.prototype.play;
  function signVideo() {
    return Array.from(document.querySelectorAll('video')).find(function (video) {
      return /\/sl_pg012_combined_v1\.mp4(?:[?#]|$)/.test(video.currentSrc || video.src);
    });
  }
  function align() {
    var video = signVideo();
    if (!video || !video.readyState || activeSegment === null) return;
    if (activeSegment === 1 && video.currentTime < boundary) video.currentTime = boundary;
    else if (activeSegment === 0 && video.currentTime >= boundary) video.currentTime = 0;
  }
  HTMLMediaElement.prototype.play = function () {
    var media = this;
    var result = previousPlay.apply(media, arguments);
    if (!(media instanceof HTMLAudioElement)) return result;
    var match = (media.src || media.currentSrc || '').match(/\/(pg012_(?:n0002|n0004|n0006|n0008|n0010|im002))[^/]*\.(?:mp3|wav)(?:[?#]|$)/);
    if (!match) return result;
    var segment = /(?:n0008|n0010|im002)$/.test(match[1]) ? 1 : 0;
    Promise.resolve(result).then(function () { activeSegment = segment; align(); }, function () {});
    return result;
  };
  document.addEventListener('loadedmetadata', function (event) {
    if (event.target === signVideo()) align();
  }, true);
})();
