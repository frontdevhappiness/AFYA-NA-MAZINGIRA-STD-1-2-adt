(function () {
  "use strict";

  function start() {
    var section = document.querySelector('[data-section-id="pg067_sec001"]');
    if (!section) return;
    var cards = Array.from(section.querySelectorAll('[data-picture-number]'));
    var inputs = Array.from(section.querySelectorAll('[data-drop-answer]'));
    if (cards.length !== 8 || inputs.length !== 8) return;

    var selectedCard = null;
    var status = document.createElement('div');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    section.appendChild(status);

    function announce(message) {
      status.textContent = '';
      window.setTimeout(function () { status.textContent = message; }, 30);
    }

    function refreshCards() {
      cards.forEach(function (card) {
        var number = card.getAttribute('data-picture-number');
        var assigned = inputs.some(function (input) { return input.value.trim() === number; });
        card.style.opacity = assigned ? '0.58' : '1';
        card.style.outline = card === selectedCard ? '4px solid #ec4899' : assigned ? '3px solid #14b8a6' : '';
        card.style.outlineOffset = card === selectedCard || assigned ? '3px' : '';
        card.setAttribute('aria-pressed', card === selectedCard ? 'true' : 'false');
      });
    }

    function assign(input, number) {
      inputs.forEach(function (other) {
        if (other !== input && other.value.trim() === number) {
          other.value = '';
          other.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      input.value = number;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.style.backgroundColor = '#ecfeff';
      var letter = input.getAttribute('data-drop-answer');
      selectedCard = null;
      refreshCards();
      announce('Picha ' + number + ' imewekwa chini ya maana ' + letter + '.');
    }

    function selectCard(card) {
      selectedCard = card;
      refreshCards();
      announce('Picha ' + card.getAttribute('data-picture-number') + ' imechaguliwa. Buruta au chagua kisanduku cha maana inayolingana.');
    }

    cards.forEach(function (card) {
      card.addEventListener('dragstart', function (event) {
        var number = card.getAttribute('data-picture-number');
        event.dataTransfer.setData('text/plain', number);
        event.dataTransfer.effectAllowed = 'move';
        selectCard(card);
      });
      card.addEventListener('dragend', function () {
        if (selectedCard === card) selectedCard = null;
        refreshCards();
      });
      card.addEventListener('click', function () { selectCard(card); });
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectCard(card);
          inputs[0].focus();
        }
      });
    });

    inputs.forEach(function (input) {
      input.addEventListener('dragover', function (event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        input.style.outline = '4px solid #ec4899';
        input.style.outlineOffset = '2px';
      });
      input.addEventListener('dragleave', function () {
        input.style.outline = '';
        input.style.outlineOffset = '';
      });
      input.addEventListener('drop', function (event) {
        event.preventDefault();
        input.style.outline = '';
        input.style.outlineOffset = '';
        var number = event.dataTransfer.getData('text/plain');
        if (/^[1-8]$/.test(number)) assign(input, number);
      });
      input.addEventListener('click', function () {
        if (selectedCard) assign(input, selectedCard.getAttribute('data-picture-number'));
      });
      input.addEventListener('input', function () {
        if (!/^[1-8]?$/.test(input.value)) input.value = input.value.replace(/[^1-8]/g, '').slice(0, 1);
        if (!input.value) input.style.backgroundColor = '';
        refreshCards();
      });
    });

    refreshCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
