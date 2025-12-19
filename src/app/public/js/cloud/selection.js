import { DOM } from './constants.js';
import { state } from './state.js';
import { updateSelectionToolbar } from './ui.js';

export function toggleSelection(itemId, element) {
    const id = itemId.toString();
    if (state.selectedItems.has(id)) {
        state.selectedItems.delete(id);
        element.classList.remove('selected');
    } else {
        state.selectedItems.add(id);
        element.classList.add('selected');
    }
    updateSelectionToolbar();
}

function checkIntersection(rect1, rect2) {
    return !(rect2.left > rect1.right || rect2.right < rect1.left || rect2.top > rect1.bottom || rect2.bottom < rect1.top);
}

let scrollAnimationFrame = null;
let currentMousePosition = { x: 0, y: 0 };

function updateSelection() {
    const marqueeRect = DOM.marqueeBox.getBoundingClientRect();

    document.querySelectorAll('.file-item').forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const id = item.dataset.id;
        if (checkIntersection(marqueeRect, itemRect)) {
            if (!state.selectedItems.has(id)) {
                item.classList.add('selected');
                state.selectedItems.add(id);
            }
        } else {
            if (state.selectedItems.has(id)) {
                item.classList.remove('selected');
                state.selectedItems.delete(id);
            }
        }
    });
    updateSelectionToolbar();
}

function handleAutoScroll() {
    if (!state.isMarqueeSelecting) {
        scrollAnimationFrame = null;
        return;
    }

    const rect = DOM.mainContent.getBoundingClientRect();
    const threshold = 50; // Distance from edge to trigger scroll
    const maxScrollSpeed = 15; // Maximum pixels to scroll per frame

    let scrollDelta = 0;

    if (currentMousePosition.y < rect.top + threshold) {
        const distance = rect.top + threshold - currentMousePosition.y;
        scrollDelta = -Math.min(maxScrollSpeed, (distance / threshold) * maxScrollSpeed);
    }
    else if (currentMousePosition.y > rect.bottom - threshold) {
        const distance = currentMousePosition.y - (rect.bottom - threshold);
        scrollDelta = Math.min(maxScrollSpeed, (distance / threshold) * maxScrollSpeed);
    }

    if (scrollDelta !== 0) {
        DOM.mainContent.scrollTop += scrollDelta;

        const newRect = DOM.mainContent.getBoundingClientRect();
        const currentX = currentMousePosition.x - newRect.left;
        const currentY = currentMousePosition.y - newRect.top;

        const width = currentX - state.marqueeStart.x;
        const height = currentY - state.marqueeStart.y;

        DOM.marqueeBox.style.width = `${Math.abs(width)}px`;
        DOM.marqueeBox.style.height = `${Math.abs(height)}px`;
        DOM.marqueeBox.style.left = `${width > 0 ? state.marqueeStart.x : currentX}px`;
        DOM.marqueeBox.style.top = `${height > 0 ? state.marqueeStart.y : currentY}px`;

        updateSelection();

        scrollAnimationFrame = requestAnimationFrame(handleAutoScroll);
    } else {
        scrollAnimationFrame = null;
    }
}

export function initializeMarqueeSelection() {
    // Prevent default drag behavior on the file grid
    DOM.fileGrid.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
    });

    // Prevent text selection during drag
    DOM.mainContent.addEventListener('selectstart', (e) => {
        if (state.isMarqueeSelecting) {
            e.preventDefault();
            return false;
        }
    });

    DOM.mainContent.addEventListener('mousedown', (e) => {
        // Only start marquee selection if clicking on the background (not on a file item)
        const clickedFileItem = e.target.closest('.file-item');
        if (clickedFileItem) return;

        // Check if clicked on main content or file grid or empty space
        if (e.target !== DOM.mainContent && e.target !== DOM.fileGrid && !DOM.fileGrid.contains(e.target)) return;

        // Prevent default browser behaviors
        e.preventDefault();
        e.stopPropagation();

        state.isMarqueeSelecting = true;
        const rect = DOM.mainContent.getBoundingClientRect();
        state.marqueeStart.x = e.clientX - rect.left;
        state.marqueeStart.y = e.clientY - rect.top + DOM.mainContent.scrollTop;

        DOM.marqueeBox.style.left = `${e.clientX - rect.left}px`;
        DOM.marqueeBox.style.top = `${e.clientY - rect.top + DOM.mainContent.scrollTop}px`;
        DOM.marqueeBox.style.width = '0px';
        DOM.marqueeBox.style.height = '0px';
        DOM.marqueeBox.style.display = 'block';

        return false;
    }, true); // Use capture phase

    DOM.mainContent.addEventListener('mousemove', (e) => {
        if (!state.isMarqueeSelecting) return;
        e.preventDefault();
        e.stopPropagation();

        // Update current mouse position for auto-scroll
        currentMousePosition.x = e.clientX;
        currentMousePosition.y = e.clientY;

        const rect = DOM.mainContent.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top + DOM.mainContent.scrollTop;

        const width = currentX - (state.marqueeStart.x);
        const height = currentY - state.marqueeStart.y;

        DOM.marqueeBox.style.width = `${Math.abs(width)}px`;
        DOM.marqueeBox.style.height = `${Math.abs(height)}px`;
        DOM.marqueeBox.style.left = `${width > 0 ? (state.marqueeStart.x) : currentX}px`;
        DOM.marqueeBox.style.top = `${height > 0 ? state.marqueeStart.y : currentY}px`;

        updateSelection();

        // Start auto-scroll if near edges and not already scrolling
        if (!scrollAnimationFrame) {
            const threshold = 50;
            if (e.clientY < rect.top + threshold || e.clientY > rect.bottom - threshold) {
                scrollAnimationFrame = requestAnimationFrame(handleAutoScroll);
            }
        }

        return false;
    }, true); // Use capture phase

    window.addEventListener('mouseup', (e) => {
        if (state.isMarqueeSelecting) {
            e.preventDefault();
            e.stopPropagation();

            state.isMarqueeSelecting = false;
            DOM.marqueeBox.style.display = 'none';

            // Cancel any ongoing auto-scroll
            if (scrollAnimationFrame) {
                cancelAnimationFrame(scrollAnimationFrame);
                scrollAnimationFrame = null;
            }
        }
    }, true); // Use capture phase
}