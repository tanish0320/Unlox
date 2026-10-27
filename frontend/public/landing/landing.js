/**
 * Fullscreen Plain Chalkboard Controller
 * Tap anywhere to advance to next greeting immediately
 */

document.addEventListener('DOMContentLoaded', () => {
    const chalkEngine = new ChalkboardEngine('chalkboard-canvas-container');
    window.chalkEngine = chalkEngine;

    const board = document.getElementById('fullscreen-board');

    // Tap/Click Anywhere on the Greenboard to disintegrate & advance immediately
    const handleTap = (e) => {
        if (e) {
            e.stopPropagation();
        }
        if (window.onChalkboardSkip) {
            window.onChalkboardSkip();
            return;
        }
        if (chalkEngine) {
            chalkEngine.disintegrateIntoPowder();
        }
    };

    if (board) {
        board.addEventListener('click', handleTap);
        board.addEventListener('touchend', handleTap);
    }

    // Keyboard shortcuts: Space, Enter, Escape, ArrowRight to advance immediately; M to toggle audio
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'Escape') {
            e.preventDefault();
            handleTap(e);
        } else if (e.code === 'KeyM') {
            if (window.chalkAudio) {
                window.chalkAudio.toggleSound();
            }
        }
    });
});
