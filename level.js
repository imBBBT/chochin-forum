document.addEventListener('DOMContentLoaded', () => {
  const classicBox = document.querySelector('.box_classic');
  if (classicBox) {
    classicBox.style.cursor = 'pointer';
    classicBox.addEventListener('click', () => {
      window.location.href = 'level/classic.html';
    });
  }

  const challengeBox = document.querySelector('.box_challenge');
  if (challengeBox) {
    challengeBox.style.cursor = 'pointer';
    challengeBox.addEventListener('click', () => {
      window.location.href = 'level/challenge.html';
    });
  }

  const platformerBox = document.querySelector('.box_platformer');
  if (platformerBox) {
    platformerBox.style.cursor = 'pointer';
    platformerBox.addEventListener('click', () => {
      window.location.href = 'level/platformer.html';
    });
  }
});
