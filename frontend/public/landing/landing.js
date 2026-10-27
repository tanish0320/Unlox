/**
 * Fullscreen Plain Chalkboard Controller
 * Tap anywhere to skip intro
 */

document.addEventListener('DOMContentLoaded', () => {
    const chalkEngine = new ChalkboardEngine('chalkboard-canvas-container');
    window.chalkEngine = chalkEngine;

    const board = document.getElementById('fullscreen-board');

    // Tap/Click Anywhere on the Greenboard to Skip immediately
    const handleSkip = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (board) {
            board.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            board.style.opacity = '0';
            board.style.transform = 'scale(0.98)';
            setTimeout(() => {
                if (window.onChalkboardSkip) {
                    window.onChalkboardSkip();
                } else if (window.location.pathname.startsWith('/landing')) {
                    // Navigate to root app
                    window.location.href = '/';
                } else {
                    board.style.opacity = '1';
                    board.style.transform = 'scale(1)';
                    chalkEngine.disintegrateIntoPowder();
                }
            }, 380);
        }
    };

    if (board) {
        board.addEventListener('click', handleSkip);
        board.addEventListener('touchend', handleSkip);
    }

    // Keyboard shortcuts: Space, Enter, Escape, or S to skip immediately; M to toggle audio
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' || e.code === 'KeyS' || e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            handleSkip(e);
        } else if (e.code === 'KeyM') {
            if (window.chalkAudio) {
                window.chalkAudio.toggleSound();
            }
        }
    });
});
