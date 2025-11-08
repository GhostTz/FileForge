document.addEventListener('DOMContentLoaded', () => {
    const heroText = document.querySelector('.hero h1');
    const originalText = heroText.innerText;
    const newText = originalText.replace('File Experience', '<span>File Experience</span>');
    heroText.innerHTML = newText;
});