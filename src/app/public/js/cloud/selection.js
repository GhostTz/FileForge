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

export function initializeMarqueeSelection() {
    DOM.mainContent.addEventListener('mousedown', (e) => {
        if (e.target !== DOM.mainContent && e.target !== DOM.fileGrid) return;
        
        state.isMarqueeSelecting = true;
        const rect = DOM.mainContent.getBoundingClientRect();
        state.marqueeStart.x = e.clientX - rect.left;
        state.marqueeStart.y = e.clientY - rect.top;

        DOM.marqueeBox.style.left = `${state.marqueeStart.x}px`;
        DOM.marqueeBox.style.top = `${state.marqueeStart.y}px`;
        DOM.marqueeBox.style.width = '0px';
        DOM.marqueeBox.style.height = '0px';
        DOM.marqueeBox.style.display = 'block';
    });

    DOM.mainContent.addEventListener('mousemove', (e) => {
        if (!state.isMarqueeSelecting) return;
        e.preventDefault();

        const rect = DOM.mainContent.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const width = currentX - state.marqueeStart.x;
        const height = currentY - state.marqueeStart.y;

        DOM.marqueeBox.style.width = `${Math.abs(width)}px`;
        DOM.marqueeBox.style.height = `${Math.abs(height)}px`;
        DOM.marqueeBox.style.left = `${width > 0 ? state.marqueeStart.x : currentX}px`;
        DOM.marqueeBox.style.top = `${height > 0 ? state.marqueeStart.y : currentY}px`;

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
    });

    window.addEventListener('mouseup', () => {
        if (state.isMarqueeSelecting) {
            state.isMarqueeSelecting = false;
            DOM.marqueeBox.style.display = 'none';
        }
    });
}