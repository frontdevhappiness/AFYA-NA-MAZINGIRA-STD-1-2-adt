(() => {
  const heading = document.querySelector('[data-id="pg017_n0015"]');
  if (!heading) return;

  let normalizing = false;

  const normalizeHeading = () => {
    if (normalizing) return;

    const wordNumbers = Array.from(heading.querySelectorAll('[data-word-index]'))
      .filter((word) => word.textContent.trim() === '4');
    if (wordNumbers.length) {
      normalizing = true;
      heading.querySelectorAll(':scope > .pg017-activity-number').forEach((number) => {
        if (!number.hasAttribute('data-word-index')) number.remove();
      });
      wordNumbers.at(-1).classList.add('pg017-activity-number');
      normalizing = false;
      return;
    }

    const text = heading.textContent.replace(/\s+/g, ' ').trim();
    const number = heading.querySelector(':scope > .pg017-activity-number');
    const directText = Array.from(heading.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (number && text === 'Shughuli ya 4' && directText === 'Shughuli ya') return;
    if (!/^Shughuli ya\s+(?:4\s*)+$/.test(text)) return;

    normalizing = true;
    heading.textContent = 'Shughuli ya ';
    const existingNumber = document.createElement('span');
    existingNumber.className = 'pg017-activity-number';
    existingNumber.textContent = '4';
    heading.append(existingNumber);
    normalizing = false;
  };

  const observer = new MutationObserver(normalizeHeading);
  const start = () => {
    normalizeHeading();
    observer.observe(heading, {
      childList: true,
      characterData: true,
      subtree: true
    });
    setTimeout(normalizeHeading, 1000);
  };

  if (document.readyState === 'complete') {
    setTimeout(start, 500);
  } else {
    window.addEventListener('load', () => setTimeout(start, 500), { once: true });
  }
})();
