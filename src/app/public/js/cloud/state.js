export const state = {
    currentView: 'myFiles',
    currentParentId: null,
    currentPath: [{ id: null, name: 'Home' }],
    items: [],
    itemToDelete: null,
    selectedItems: new Set(),
    destinationFolderId: null,
    isMarqueeSelecting: false,
    marqueeStart: { x: 0, y: 0 },
    isSearching: false,
    currentSearchTerm: '',
    isEmptyingTrash: false
};

export function clearSelection() {
    state.selectedItems.clear();
}