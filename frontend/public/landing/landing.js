/**
 * Fullscreen Plain Chalkboard Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const chalkEngine = new ChalkboardEngine('chalkboard-canvas-container');
    window.chalkEngine = chalkEngine;

    // Clicking anywhere on the green board triggers immediate powder fall & advances to next language
    const board = document.getElementById('fullscreen-board');
    if (board) {
        board.addEventListener('click', () => {
            if (chalkEngine.state === 'HOLDING') {
                chalkEngine.disintegrateIntoPowder();
            } else if (chalkEngine.state === 'WRITING') {
                chalkEngine.disintegrateIntoPowder();
            }
        });
    }

    // Skip Button Handler
    const skipBtn = document.getElementById('skip-intro-btn');
    const handleSkip = (e) => {
        if (e) e.stopPropagation();
        const boardEl = document.getElementById('fullscreen-board');
        if (boardEl) {
            boardEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            boardEl.style.opacity = '0';
            boardEl.style.transform = 'scale(0.98)';
            setTimeout(() => {
                if (window.onChalkboardSkip) {
                    window.onChalkboardSkip();
                } else {
                    boardEl.style.opacity = '1';
                    boardEl.style.transform = 'scale(1)';
                    // Jump to last greeting or reset
                    chalkEngine.disintegrateIntoPowder();
                }
            }, 400);
        }
    };

    if (skipBtn) {
        skipBtn.addEventListener('click', handleSkip);
    }

    // Keyboard shortcuts: Spacebar/Arrow/Enter to advance immediately, Esc/KeyS to skip, M to toggle audio
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' || e.code === 'KeyS') {
            e.preventDefault();
            handleSkip(e);
        } else if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'Enter') {
            e.preventDefault();
            chalkEngine.disintegrateIntoPowder();
        } else if (e.code === 'KeyM') {
            if (window.chalkAudio) {
                window.chalkAudio.toggleSound();
            }
        }
    });
});
