const SONGS = [
  "DANCE...",
  "BEAT UP CHANEL$",
  "CANNIBALISM!",
  "OLD TECHNOLOGY",
  "CRANK",
  "GAS STATION",
  "YES GODDD",
  "UNKNOWN LOVERZ",
  "OLD FLING$",
  "I'M ACTUALLY KINDA FAMOUS",
  "$T. LOSER",
  "WHAT IS IT LIKE, TO BE LIKED?",
  "*PRAYER*",
  "BRITTANY MURPHY."
];

// UI Elements
const screens = {
    start: document.getElementById('start-screen'),
    battle: document.getElementById('battle-screen'),
    results: document.getElementById('results-screen')
};

const ui = {
    startBtn: document.getElementById('start-btn'),
    cardLeft: document.getElementById('card-left'),
    cardRight: document.getElementById('card-right'),
    titleLeft: document.querySelector('#card-left .song-title'),
    titleRight: document.querySelector('#card-right .song-title'),
    progressBar: document.getElementById('progress-bar'),
    currentStep: document.getElementById('current-step'),
    totalSteps: document.getElementById('total-steps'),
    leaderboard: document.getElementById('leaderboard'),
    shareImgBtn: document.getElementById('share-img-btn'),
    shareTextBtn: document.getElementById('share-text-btn'),
    restartBtn: document.getElementById('restart-btn')
};

// Global State
let comparisonResolve = null;
let comparisonsDone = 0;
let finalRanking = [];
// For 14 items, merge sort worst-case comparisons is exactly ~43
const ESTIMATED_TOTAL = 43; 

// Navigation
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Initialization
function init() {
    ui.startBtn.addEventListener('click', startGame);
    ui.cardLeft.addEventListener('click', () => handleChoice(-1));
    ui.cardRight.addEventListener('click', () => handleChoice(1));
    ui.shareImgBtn.addEventListener('click', shareResultsImg);
    ui.shareTextBtn.addEventListener('click', shareResultsText);
    ui.restartBtn.addEventListener('click', () => showScreen('start'));
}

async function startGame() {
    comparisonsDone = 0;
    updateProgress();
    showScreen('battle');
    
    // Copy songs array and shuffle it lightly to prevent initial order bias
    let items = [...SONGS].sort(() => Math.random() - 0.5);
    
    // Run the async merge sort
    finalRanking = await mergeSort(items);
    
    renderResults();
    showScreen('results');
}

// Logic: Async Merge Sort
async function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    
    const mid = Math.floor(arr.length / 2);
    const left = await mergeSort(arr.slice(0, mid));
    const right = await mergeSort(arr.slice(mid));
    
    return await merge(left, right);
}

async function merge(left, right) {
    let result = [];
    let i = 0;
    let j = 0;
    
    while(i < left.length && j < right.length) {
        // askUser returns -1 if left is preferred, 1 if right is preferred
        const comp = await askUser(left[i], right[j]);
        if (comp <= 0) {
            result.push(left[i]);
            i++;
        } else {
            result.push(right[j]);
            j++;
        }
    }
    
    return result.concat(left.slice(i)).concat(right.slice(j));
}

// UI Interaction for Comparison
function askUser(songA, songB) {
    return new Promise(resolve => {
        ui.titleLeft.textContent = songA;
        ui.titleRight.textContent = songB;
        
        // Re-trigger card entrance animations
        ui.cardLeft.classList.remove('animate-left');
        ui.cardRight.classList.remove('animate-right');
        
        // Force reflow
        void ui.cardLeft.offsetWidth; 
        
        ui.cardLeft.classList.add('animate-left');
        ui.cardRight.classList.add('animate-right');

        // Store the resolve function so the click handler can call it
        comparisonResolve = resolve;
    });
}

function handleChoice(value) {
    if (comparisonResolve) {
        comparisonsDone++;
        updateProgress();
        const resolve = comparisonResolve;
        comparisonResolve = null;
        resolve(value);
    }
}

function updateProgress() {
    // If we exceed estimate slightly, cap visual at 99% until complete
    const percent = Math.min((comparisonsDone / ESTIMATED_TOTAL) * 100, 99);
    ui.progressBar.style.width = `${percent}%`;
    ui.currentStep.textContent = comparisonsDone;
}

// Results Handling
function renderResults() {
    ui.leaderboard.innerHTML = '';
    ui.progressBar.style.width = '100%'; // max out the bar
    
    finalRanking.forEach((song, index) => {
        const row = document.createElement('div');
        row.className = 'rank-row';
        
        row.innerHTML = `
            <div class="rank-number">#${index + 1}</div>
            <div class="rank-song">${song}</div>
        `;
        
        // Add staggered fade-in animation
        row.style.animation = `fadeIn 0.5s ease forwards ${index * 0.04}s`;
        row.style.opacity = '0';
        
        ui.leaderboard.appendChild(row);
    });
}

// Export functionality
async function shareResultsText() {
    const text = `My WOR$T GIRL IN AMERICA by $LAYYYTER Ranking:\n\n` + 
        finalRanking.map((song, i) => `${i + 1}. ${song}`).join('\n');
        
    try {
        await navigator.clipboard.writeText(text);
        
        const originalText = ui.shareTextBtn.textContent;
        ui.shareTextBtn.textContent = 'COPIED!';
        setTimeout(() => {
            ui.shareTextBtn.textContent = originalText;
        }, 2000);
    } catch (err) {
        alert('Failed to copy. Here is your text:\n\n' + text);
    }
}

async function shareResultsImg() {
    const captureArea = document.getElementById('capture-area');
    
    const originalText = ui.shareImgBtn.textContent;
    ui.shareImgBtn.textContent = 'GENERATING...';
    
    // Temporarily hide hover states if active
    const oldStyle = document.body.style.cssText;
    document.body.style.pointerEvents = 'none';
    
    // FIX: html2canvas ignores CSS animations. We must explicitly reverse the opaque entrance state.
    const rows = captureArea.querySelectorAll('.rank-row');
    rows.forEach(row => {
        row.style.animation = 'none';
        row.style.opacity = '1';
    });
    
    try {
        const canvas = await html2canvas(captureArea, {
            backgroundColor: '#719eb7', // Matches CSS --bg-color
            scale: 2, // 2x resolution for crispness
            logging: false,
        });
        
        canvas.toBlob(async (blob) => {
            try {
                // Attempt direct clipboard write (works on desktop Chromium/Safari usually)
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                ui.shareImgBtn.textContent = 'IMAGE COPIED!';
            } catch (err) {
                console.error('Clipboard write failed, triggering download instead', err);
                // Fallback: Download file explicitly if Clipboard API is restricted
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'slayyyter_ranking.png';
                a.click();
                URL.revokeObjectURL(url);
                ui.shareImgBtn.textContent = 'DOWNLOADED!';
            }
            
            setTimeout(() => {
                ui.shareImgBtn.textContent = originalText;
            }, 2500);
        });
    } catch(err) {
        console.error(err);
        alert('Failed to generate image block.');
        ui.shareImgBtn.textContent = originalText;
    } finally {
        document.body.style.cssText = oldStyle;
    }
}

// Start app
init();
