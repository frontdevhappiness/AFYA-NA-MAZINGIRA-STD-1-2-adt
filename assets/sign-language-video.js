(function () {
  "use strict";

  var VIDEO_SELECTOR = 'video[src*="/video/"]';
  var enhancedHandles = new WeakSet();
  var enhancedPlayers = new WeakSet();
  var scheduled = false;

  function viewportSize() {
    var viewport = window.visualViewport;
    return {
      left: viewport ? viewport.offsetLeft : 0,
      top: viewport ? viewport.offsetTop : 0,
      width: viewport ? viewport.width : document.documentElement.clientWidth || window.innerWidth,
      height: viewport ? viewport.height : window.innerHeight
    };
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
  }

  function setStyle(player, property, value) {
    if (player.style.getPropertyValue(property) !== value) {
      player.style.setProperty(property, value);
    }
  }

  function movePlayer(player, x, y) {
    var size = viewportSize();
    // Size the player before measuring it, including when browser zoom or an
    // on-screen keyboard makes the visual viewport smaller than the page.
    setStyle(player, "--sign-language-viewport-width", size.width + "px");
    setStyle(player, "--sign-language-viewport-height", size.height + "px");
    var rect = player.getBoundingClientRect();
    var margin = 8;
    var nextX = clamp(x, size.left + margin, Math.max(size.left + margin, size.left + size.width - rect.width - margin));
    var nextY = clamp(y, size.top + margin, Math.max(size.top + margin, size.top + size.height - rect.height - margin));
    setStyle(player, "left", nextX + "px");
    setStyle(player, "top", nextY + "px");
    setStyle(player, "right", "auto");
    setStyle(player, "bottom", "auto");
  }

  function keepPlayerOnScreen(player) {
    if (!player.isConnected || document.fullscreenElement) return;
    var rect = player.getBoundingClientRect();
    movePlayer(player, rect.left, rect.top);
  }

  function observePlayer(player) {
    if (enhancedPlayers.has(player)) return;
    enhancedPlayers.add(player);
    // The runtime can restore a saved position or change the player's height
    // after metadata loads. Re-check those changes as well as window resizes.
    new MutationObserver(scheduleInstall).observe(player, {
      attributes: true, attributeFilter: ["style", "class"]
    });
    if (window.ResizeObserver) {
      new ResizeObserver(scheduleInstall).observe(player);
    }
  }

  function enhanceHandle(handle, player) {
    if (enhancedHandles.has(handle) || !player || !player.querySelector("video")) return;
    enhancedHandles.add(handle);
    handle.setAttribute("data-sign-language-drag-handle", "");
    player.setAttribute("data-sign-language-player", "");
    var drag = null;

    function start(clientX, clientY) {
      var rect = player.getBoundingClientRect();
      drag = { x: clientX - rect.left, y: clientY - rect.top };
      player.setAttribute("data-sign-language-dragging", "");
    }
    function move(clientX, clientY) {
      if (drag) movePlayer(player, clientX - drag.x, clientY - drag.y);
    }
    function finish() {
      drag = null;
      player.removeAttribute("data-sign-language-dragging");
      scheduleInstall();
    }

    handle.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      start(event.clientX, event.clientY);
      if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener("pointermove", function (event) {
      if (!drag) return;
      move(event.clientX, event.clientY);
      event.preventDefault();
    });
    handle.addEventListener("pointerup", function (event) {
      if (!drag) return;
      move(event.clientX, event.clientY);
      finish();
      event.preventDefault();
    });
    handle.addEventListener("pointercancel", finish);
    var video = player.querySelector("video");
    if (video) video.addEventListener("loadedmetadata", scheduleInstall);
  }

  function install() {
    scheduled = false;
    Array.prototype.forEach.call(document.querySelectorAll(VIDEO_SELECTOR), function (video) {
      var player = video.parentElement;
      if (!player || window.getComputedStyle(player).position !== "fixed") return;
      var handle = Array.prototype.find.call(player.children, function (child) {
        return child.getAttribute && child.getAttribute("role") === "button";
      });
      if (handle) {
        enhanceHandle(handle, player);
        observePlayer(player);
        // Already enhanced players must still be clamped on every resize.
        keepPlayerOnScreen(player);
      }
    });
  }
  function scheduleInstall() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(install);
  }

  new MutationObserver(scheduleInstall).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", scheduleInstall);
  window.addEventListener("orientationchange", scheduleInstall);
  window.addEventListener("pageshow", scheduleInstall);
  document.addEventListener("fullscreenchange", scheduleInstall);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleInstall);
    window.visualViewport.addEventListener("scroll", scheduleInstall);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleInstall, { once: true });
  } else {
    scheduleInstall();
  }
})();
