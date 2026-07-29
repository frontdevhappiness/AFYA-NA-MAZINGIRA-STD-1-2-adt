// Exposes quiz feedback outside role="radio", whose descendants are
// presentational in accessibility APIs. This does not change visual output.
(function () {
  "use strict";

  var ACTIVITY_SELECTOR = [
    'section[data-section-type="activity_quiz"]',
    'section[data-section-type="activity_multiple_choice"]'
  ].join(",");
  var currentAudio = null;

  function stopSpokenFeedback() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function playBookAudio(textId, fallbackText) {
    if (!textId) return speakText(fallbackText, null);
    stopSpokenFeedback();
    var source = new URL(
      "./content/i18n/sw-TZ/audio/" + encodeURIComponent(textId) + ".mp3",
      document.baseURI
    );
    currentAudio = new Audio(source.href);
    currentAudio.addEventListener("ended", function () {
      currentAudio = null;
    }, { once: true });
    currentAudio.play().catch(function () {
      currentAudio = null;
      speakText(fallbackText, null);
    });
  }

  function speakText(text, fallbackTextId) {
    if (!text) return;
    stopSpokenFeedback();
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      if (fallbackTextId) playBookAudio(fallbackTextId, "");
      return;
    }
    var voices = window.speechSynthesis.getVoices();
    if (voices.length === 0 && fallbackTextId) {
      playBookAudio(fallbackTextId, "");
      return;
    }
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = document.documentElement.lang || "sw-TZ";
    utterance.rate = 0.9;
    utterance.voice = voices.find(function (voice) {
      return voice.lang.toLowerCase().startsWith("sw");
    }) || voices.find(function (voice) {
      return voice.lang.toLowerCase().startsWith("en");
    }) || voices[0] || null;
    utterance.onerror = function () {
      if (fallbackTextId) playBookAudio(fallbackTextId, "");
    };
    window.speechSynthesis.speak(utterance);
  }

  function addReference(element, attribute, id) {
    var values = (element.getAttribute(attribute) || "").split(/\s+/).filter(Boolean);
    if (!values.includes(id)) {
      values.push(id);
      element.setAttribute(attribute, values.join(" "));
    }
  }

  function initialize(section, sectionIndex) {
    var sectionId = section.getAttribute("data-section-id") || "activity-" + sectionIndex;
    var announcement = document.createElement("div");
    announcement.id = sectionId + "-feedback-announcement";
    announcement.className = "sr-only";
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.setAttribute("aria-relevant", "additions text");
    section.insertAdjacentElement("afterend", announcement);

    var containers = Array.from(section.querySelectorAll(".feedback-container"));
    containers.forEach(function (container, index) {
      var option = container.closest('[role="radio"], .activity-option');
      var itemId = option && option.getAttribute("data-activity-item");
      container.id = container.id || sectionId + "-" + (itemId || "option-" + index) + "-feedback";
      container.setAttribute("aria-atomic", "true");
      container.setAttribute("aria-relevant", "additions text");
      if (option) addReference(option, "aria-describedby", container.id);
    });

    var lastMessage = "";
    var timer = null;

    function announce(message, assertive) {
      if (!message) return;
      if (timer !== null) window.clearTimeout(timer);
      announcement.setAttribute("role", assertive ? "alert" : "status");
      announcement.setAttribute("aria-live", assertive ? "assertive" : "polite");
      announcement.textContent = "";
      timer = window.setTimeout(function () {
        announcement.textContent = message;
        timer = null;
      }, 50);
    }

    function announceVisibleFeedback() {
      var active = containers.find(function (container) {
        return !container.classList.contains("hidden") && container.textContent.trim();
      });
      if (!active) {
        lastMessage = "";
        return;
      }

      var message = active.textContent.replace(/\s+/g, " ").trim();
      var assertive = active.getAttribute("role") === "alert";
      var freshSignal = ["alert", "status"].includes(active.getAttribute("role")) ||
        active.getAttribute("aria-live") !== "off";

      // The nested live region is unreliable inside role="radio" and could
      // duplicate the external announcement in some screen readers.
      if (active.getAttribute("aria-live") !== "off") active.setAttribute("aria-live", "off");
      if (active.getAttribute("role") !== "note") active.setAttribute("role", "note");

      if (!message || (message === lastMessage && !freshSignal)) return;
      lastMessage = message;
      announce(message, assertive);
      var option = active.closest('[role="radio"], .activity-option');
      playBookAudio(option && option.getAttribute("data-explanation-id"), message);
    }

    var observer = new MutationObserver(announceVisibleFeedback);
    containers.forEach(function (container) {
      observer.observe(container, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["class", "role", "aria-live"]
      });
    });

  }

  function initializeRuntimeResultAudio() {
    var lastRuntimeMessage = "";
    var scheduled = false;

    function readRuntimeAnnouncement() {
      scheduled = false;
      var region = document.getElementById("sr-announcement");
      var message = region ? region.textContent.replace(/\s+/g, " ").trim() : "";
      if (!message) {
        lastRuntimeMessage = "";
        return;
      }
      if (message === lastRuntimeMessage) return;
      lastRuntimeMessage = message;
      speakText(message, null);
    }

    var observer = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      window.setTimeout(readRuntimeAnnouncement, 75);
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }

  function initializeSubmissionGuidance(activity) {
    var sectionId = activity.getAttribute("data-section-id") || "activity";
    var isQuiz = activity.matches(ACTIVITY_SELECTOR);
    var guidance = isQuiz
      ? "Chagua jibu. Kisha bonyeza kitufe cha Tuma ili kupata matokeo."
      : "Kamilisha shughuli. Ukimaliza, bonyeza kitufe cha Tuma ili kupata matokeo.";
    var hint = document.createElement("p");
    hint.id = sectionId + "-submit-guidance";
    hint.className = "sr-only";
    hint.textContent = guidance;
    activity.insertAdjacentElement("afterbegin", hint);
    addReference(activity, "aria-describedby", hint.id);

    var submitStatus = document.createElement("div");
    submitStatus.id = sectionId + "-submit-status";
    submitStatus.className = "sr-only";
    submitStatus.setAttribute("role", "status");
    submitStatus.setAttribute("aria-live", "polite");
    submitStatus.setAttribute("aria-atomic", "true");
    submitStatus.setAttribute("aria-relevant", "additions text");
    activity.insertAdjacentElement("afterend", submitStatus);

    var submitTimer = null;
    function announceSubmit(message) {
      if (submitTimer !== null) window.clearTimeout(submitTimer);
      submitStatus.textContent = "";
      submitTimer = window.setTimeout(function () {
        submitStatus.textContent = message;
        submitTimer = null;
      }, 50);
    }

    activity.addEventListener("focusin", function () {
      announceSubmit(guidance);
      speakText(guidance, null);
    }, { once: true });

    var buttonStates = new WeakMap();
    function enhanceSubmitButtons() {
      document.querySelectorAll("button").forEach(function (button) {
        var visibleName = button.textContent.replace(/\s+/g, " ").trim().toLowerCase();
        var ariaName = (button.getAttribute("aria-label") || "").trim().toLowerCase();
        if (visibleName !== "tuma" && ariaName !== "tuma" &&
            ariaName !== "tuma majibu ili kupata matokeo") return;
        if (button.getAttribute("aria-label") !== "Tuma majibu ili kupata matokeo") {
          button.setAttribute("aria-label", "Tuma majibu ili kupata matokeo");
        }
        addReference(button, "aria-describedby", hint.id);
        var enabled = !button.disabled && button.getAttribute("aria-disabled") !== "true";
        var previous = buttonStates.get(button);
        buttonStates.set(button, enabled);
        if (previous === undefined && enabled) {
          announceSubmit("Kitufe cha Tuma kinapatikana. Bonyeza Tuma ili kupata matokeo.");
        } else if (previous === false && enabled) {
          announceSubmit("Kitufe cha Tuma sasa kimewezeshwa. Bonyeza Tuma ili kupata matokeo.");
          speakText("Kitufe cha Tuma sasa kimewezeshwa. Bonyeza Tuma ili kupata matokeo.", null);
        }
      });
    }

    enhanceSubmitButtons();
    var buttonObserver = new MutationObserver(enhanceSubmitButtons);
    buttonObserver.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled"]
    });

    var answerTimer = null;
    var lastAnswerKey = "";
    var lastAnswerTime = 0;

    function announceAnswerProvided(target) {
      var item = target && target.closest ? target.closest("[data-activity-item]") : null;
      if (!item || !activity.contains(item)) return;
      var itemId = item.getAttribute("data-activity-item") || "answer";
      var now = Date.now();
      if (itemId === lastAnswerKey && now - lastAnswerTime < 400) return;
      lastAnswerKey = itemId;
      lastAnswerTime = now;

      var message;
      var fallbackId = null;
      if (isQuiz) {
        var option = item.closest('[role="radio"], .activity-option') || item;
        var optionText = option.querySelector(".option-text");
        var choice = optionText
          ? optionText.textContent.replace(/^\s*\d+\)\s*/, "").trim()
          : "";
        if (!choice) return;
        message = "Umechagua " + choice + ". Sasa bonyeza kitufe cha Tuma ili kupata matokeo.";
        fallbackId = option.getAttribute("data-activity-item");
      } else {
        message = "Jibu lako limewekwa. Sasa bonyeza kitufe cha Tuma ili kupata matokeo.";
      }
      announceSubmit(message);
      speakText(message, fallbackId);
      enhanceSubmitButtons();
    }

    activity.addEventListener("click", function (event) {
      var item = event.target.closest && event.target.closest("[data-activity-item]");
      if (!item) return;
      var field = item.matches("input[type='text'], textarea") ? item : null;
      if (field) return;
      window.setTimeout(function () { announceAnswerProvided(item); }, 0);
    });

    activity.addEventListener("change", function (event) {
      announceAnswerProvided(event.target);
    });

    activity.addEventListener("input", function (event) {
      if (!event.target.matches("input[type='text'], textarea")) return;
      if (answerTimer !== null) window.clearTimeout(answerTimer);
      answerTimer = window.setTimeout(function () {
        if (event.target.value.trim()) announceAnswerProvided(event.target);
        answerTimer = null;
      }, 700);
    });

    activity.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      var item = event.target.closest && event.target.closest("[data-activity-item]");
      if (!item || item.matches("input[type='text'], textarea")) return;
      window.setTimeout(function () { announceAnswerProvided(item); }, 0);
    });
  }

  function start() {
    var activity = document.querySelector('section[data-section-type^="activity_"]');
    if (!activity) return;
    initializeSubmissionGuidance(activity);
    document.querySelectorAll(ACTIVITY_SELECTOR).forEach(initialize);
    initializeRuntimeResultAudio();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
