import { DOM, ICONS } from './constants.js';
import { state } from './state.js';

/**
 * Main function to update all visual components based on the current state
 */
export function updateUI() {
    setActiveSidebarLink();
    renderBreadcrumbs();
    renderFiles();
    updateSelectionToolbar();

    // Toggle visibility of global buttons based on view (Trash vs. Others)
    const isTrash = state.currentView === 'trash';
    DOM.newBtn.classList.toggle('hidden', isTrash);
    DOM.explorerUploadBtn.classList.toggle('hidden', isTrash);
    
    // Toggle Empty Trash button
    if (DOM.emptyTrashBtn) {
        DOM.emptyTrashBtn.classList.toggle('hidden', !isTrash || state.items.length === 0);
    }

    // Handle Download Lock in File Preview Modal
    const previewDownloadBtn = document.getElementById('preview-download-action-btn');
    if (previewDownloadBtn) {
        previewDownloadBtn.disabled = state.isDownloading;
        previewDownloadBtn.style.opacity = state.isDownloading ? "0.5" : "1";
        previewDownloadBtn.style.cursor = state.isDownloading ? "not-allowed" : "pointer";
    }
}

/**
 * Sync the sidebar active classes with the current view
 */
function setActiveSidebarLink() {
    Object.values(DOM.navLinks).forEach(link => {
        if (link) link.classList.remove('active');
    });

    if (DOM.navLinks[state.currentView]) {
        DOM.navLinks[state.currentView].classList.add('active');
    } else {
        DOM.navLinks.myFiles.classList.add('active');
    }
}

/**
 * Renders the breadcrumb navigation based on current path or search status
 */
function renderBreadcrumbs() {
    if (!DOM.breadcrumbsContainer) return;
    DOM.breadcrumbsContainer.innerHTML = '';

    // Search Mode Breadcrumbs
    if (state.isSearching) {
        DOM.breadcrumbsContainer.innerHTML = `<a class="active">Search results for "${state.currentSearchTerm}"</a>`;
        return;
    }

    // Special View Breadcrumbs (Favorites, Trash)
    if (state.currentView !== 'myFiles') {
        const viewName = state.currentView.charAt(0).toUpperCase() + state.currentView.slice(1);
        DOM.breadcrumbsContainer.innerHTML = `<a class="active">${viewName}</a>`;
        return;
    }

    // Folder Path Breadcrumbs
    state.currentPath.forEach((part, index) => {
        if (index > 0) {
            DOM.breadcrumbsContainer.innerHTML += `<span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>`;
        }
        const isLast = index === state.currentPath.length - 1;
        DOM.breadcrumbsContainer.innerHTML += `<a class="${isLast ? 'active' : ''}" data-id="${part.id}">${part.name}</a>`;
    });
}

/**
 * Renders the file grid/list based on items in state
 */
function renderFiles() {
    if (!DOM.fileGrid) return;
    DOM.fileGrid.innerHTML = '';
    const itemsToRender = state.items;

    // Handle Empty States
    if (itemsToRender.length === 0) {
        DOM.emptyFolderView.classList.remove('hidden');
        DOM.fileGrid.classList.add('hidden');
        
        if (state.isSearching) {
            DOM.emptyFolderTitle.textContent = 'No results found';
            DOM.emptyFolderText.textContent = `Your search for "${state.currentSearchTerm}" did not match anything.`;
        } else if (state.currentView === 'favorites') {
            DOM.emptyFolderTitle.textContent = 'No favorites yet';
            DOM.emptyFolderText.textContent = 'Click the star icon on any file to add it here.';
        } else if (state.currentView === 'trash') {
            DOM.emptyFolderTitle.textContent = 'Trash is empty';
            DOM.emptyFolderText.textContent = 'Items you delete will appear here.';
        } else {
            DOM.emptyFolderTitle.textContent = 'This folder is empty';
            DOM.emptyFolderText.textContent = 'Use the "Upload" button to upload files';
        }
    } else {
        DOM.emptyFolderView.classList.add('hidden');
        DOM.fileGrid.classList.remove('hidden');
    }

    // Sort: Folders first, then Files
    const sortedItems = [...itemsToRender].sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
    });

    const isTrashView = state.currentView === 'trash';

    // Render each item
    sortedItems.forEach(item => {
        const meta = item.file_meta ? JSON.parse(item.file_meta) : {};
        const fileMeta = item.type === 'folder' ? '' : `${(meta.fileType || 'file').toUpperCase()} • ${meta.size || '0 KB'}`;
        const isSelected = state.selectedItems.has(item.id.toString());

        // Define available actions based on view
        const actionsHTML = isTrashView ? `
            <button class="file-action-btn" data-action="restore" title="Restore">${ICONS.restore}</button>
            <button class="file-action-btn" data-action="permanent-delete" title="Delete Permanently">${ICONS.delete}</button>
        ` : `
            <button class="file-action-btn favorite ${item.is_favorite ? 'is-favorite' : ''}" data-action="favorite" title="Favorite">${ICONS.favorite}</button>
            <button class="file-action-btn" data-action="delete" title="Move to Trash">${ICONS.delete}</button>
        `;

        const fileElementHTML = `
            <div class="file-item ${item.type === 'folder' ? 'is-folder' : ''} ${isSelected ? 'selected' : ''}" 
                 data-id="${item.id}" 
                 data-name="${item.name}" 
                 data-size="${meta.sizeBytes || 0}" 
                 draggable="false">
                <div class="selection-checkbox">${ICONS.check}</div>
                <div class="file-icon">${ICONS[item.type]}</div>
                <div class="file-details">
                    <p class="file-info">${item.name}</p>
                    <p class="file-meta">${fileMeta}</p>
                </div>
                <div class="file-actions">
                    ${actionsHTML}
                </div>
            </div>`;
        
        DOM.fileGrid.insertAdjacentHTML('beforeend', fileElementHTML);
    });
}

/**
 * Updates the multi-selection toolbar visibility and labels
 */
export function updateSelectionToolbar() {
    const count = state.selectedItems.size;
    const isTrash = state.currentView === 'trash';

    if (!DOM.selectionToolbar || !DOM.defaultToolbar) return;

    // Toggle Restore vs Move button in toolbar
    if (DOM.selectionMoveBtn) DOM.selectionMoveBtn.classList.toggle('hidden', isTrash);
    if (DOM.selectionRestoreBtn) DOM.selectionRestoreBtn.classList.toggle('hidden', !isTrash);
    
    // Toggle Rename button (Only 1 item selected, not in Trash)
    if (DOM.selectionRenameBtn) {
        DOM.selectionRenameBtn.classList.toggle('hidden', count !== 1 || isTrash);
    }

    // Handle Download button Lock
    const downloadBtn = document.getElementById('selection-download-btn');
    if (downloadBtn) {
        downloadBtn.classList.toggle('hidden', isTrash);
        downloadBtn.disabled = state.isDownloading;
        downloadBtn.style.opacity = state.isDownloading ? "0.5" : "1";
    }

    // Toggle Toolbar Visibility
    if (count > 0) {
        // Updated: Only display the number for better responsiveness
        if (DOM.selectionCount) DOM.selectionCount.textContent = count;
        
        DOM.defaultToolbar.classList.add('hidden');
        DOM.selectionToolbar.classList.remove('hidden');
        
        if (DOM.selectionDeleteBtn) {
            DOM.selectionDeleteBtn.innerHTML = isTrash ? `${ICONS.delete} Delete Permanently` : `${ICONS.delete} Delete`;
        }
    } else {
        DOM.defaultToolbar.classList.remove('hidden');
        DOM.selectionToolbar.classList.add('hidden');
    }

    // Sync "Select All" checkbox state
    if (DOM.selectAllCheckbox) {
        const totalItems = state.items.length;
        if (totalItems > 0 && count === totalItems) {
            DOM.selectAllCheckbox.classList.add('checked');
        } else {
            DOM.selectAllCheckbox.classList.remove('checked');
        }
    }
}

/**
 * View Switchers
 */
export function switchToExplorer() {
    DOM.explorerView.classList.remove('hidden');
    DOM.uploadView.classList.add('hidden');
}

export function switchToUpload() {
    DOM.explorerView.classList.add('hidden');
    DOM.uploadView.classList.remove('hidden');
}

/**
 * Renders the folder tree recursively for the move modal
 */
export function renderFolderTree(nodes, parentElement) {
    const ul = document.createElement('ul');
    nodes.forEach(node => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="folder-tree-item" data-id="${node.id}">${ICONS.folder}<span>${node.name}</span></div>`;
        if (node.children && node.children.length > 0) {
            renderFolderTree(node.children, li);
        }
        ul.appendChild(li);
    });
    parentElement.appendChild(ul);
}