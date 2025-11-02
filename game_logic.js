// --- 1. SETUP HIRAGANA GRID ---
const hiragana = [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'さ', 'し', 'す', 'せ', 'そ',
    'た', 'ち', 'つ', 'て', 'と',
    'な', 'に', 'ぬ', 'ね', 'の',
    'は', 'ひ', 'ふ', 'へ', 'ほ',
    'ま', 'み', 'む', 'め', 'も',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'わ', 'を', 'ん',
    'が', 'ぎ', 'ぐ', 'げ', 'ご',
    'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
    'だ', 'ぢ', 'づ', 'で', 'ど',
    'ば', 'び', 'ぶ', 'べ', 'ぼ',
    'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'
];

// Find the grid container from the HTML
const gridContainer = document.getElementById('hiragana-container');

// Loop through each hiragana and create a button
hiragana.forEach(char => {
    const button = document.createElement('button');
    button.textContent = char;
    gridContainer.appendChild(button);
});


// --- 2. SETUP POP-UP MENU ---
// Get all the new HTML elements we need
const openMenuButton = document.getElementById('open-menu-btn');
const closeMenuButton = document.getElementById('close-menu-btn');
const menuModal = document.getElementById('menu-modal');

// Listen for a click on the "Menu" button
openMenuButton.addEventListener('click', () => {
    menuModal.classList.add('is-visible');
});

// Listen for a click on the "Close" button (inside the modal)
closeMenuButton.addEventListener('click', () => {
    menuModal.classList.remove('is-visible');
});

// (Optional) Also close the modal if the user clicks on the black background
menuModal.addEventListener('click', (event) => {
    if (event.target === menuModal) {
        menuModal.classList.remove('is-visible');
    }
});

// --- 3. (NEW) SETUP TRACING CANVAS ---
const canvas = document.getElementById('tracing-canvas');
// We will add drawing logic here later in the project!
console.log('Tracing canvas is ready.', canvas);

