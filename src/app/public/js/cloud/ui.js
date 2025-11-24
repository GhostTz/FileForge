import { DOM, ICONS } from './constants.js';
import { state } from './state.js';

export function updateUI() {
    setActiveSidebarLink();
    renderBreadcrumbs();
    renderFiles();
    updateSelectionToolbar();

    const isTrash = state.currentView === 'trash';
    DOM.newBtn.classList.toggle('hidden', isTrash);
    DOM.explorerUploadBtn.classList.toggle('hidden', isTrash);
    DOM.emptyTrashBtn.classList.toggle('hidden', !isTrash || state.items.length === 0);
}

function setActiveSidebarLink() {
    Object.values(DOM.navLinks).forEach(link => link.classList.remove('active'));
    if (DOM.navLinks[state.currentView]) {
        DOM.navLinks[state.currentView].classList.add('active');
    } else {
        DOM.navLinks.myFiles.classList.add('active');
    }
}

function renderBreadcrumbs() {
    DOM.breadcrumbsContainer.innerHTML = '';

    if (state.isSearching) {
        DOM.breadcrumbsContainer.innerHTML = `<a class="active">Search results for "${state.currentSearchTerm}"</a>`;
        return;
    }

    if (state.currentView !== 'myFiles') {
        const viewName = state.currentView.charAt(0).toUpperCase() + state.currentView.slice(1);
        DOM.breadcrumbsContainer.innerHTML = `<a class="active">${viewName}</a>`;
        return;
    }
    state.currentPath.forEach((part, index) => {
        if (index > 0) {
            DOM.breadcrumbsContainer.innerHTML += `<span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>`;
        }
        const isLast = index === state.currentPath.length - 1;
        DOM.breadcrumbsContainer.innerHTML += `<a class="${isLast ? 'active' : ''}" data-id="${part.id}">${part.name}</a>`;
    });
}

function renderFiles() {
    DOM.fileGrid.innerHTML = '';
    const itemsToRender = state.items;

    if (itemsToRender.length === 0) {
        DOM.emptyFolderView.classList.remove('hidden');
        DOM.fileGrid.classList.add('hidden');
        if (state.isSearching) {
            DOM.emptyFolderTitle.textContent = 'No results found';
            DOM.emptyFolderText.textContent = `Your search for "${state.currentSearchTerm}" did not match any files or folders.`;
        } else if (state.currentView === 'favorites') {
            DOM.emptyFolderTitle.textContent = 'No favorites yet';
            DOM.emptyFolderText.textContent = 'Click the star icon on any file or folder to add it here.';
        } else if (state.currentView === 'trash') {
            DOM.emptyFolderTitle.textContent = 'Trash is empty';
            DOM.emptyFolderText.textContent = 'Items you delete will appear here.';
        } else {
            DOM.emptyFolderTitle.textContent = 'This folder is empty';
            DOM.emptyFolderText.textContent = 'Drag and drop files here or use the "Upload" button.';
        }
    } else {
        DOM.emptyFolderView.classList.add('hidden');
        DOM.fileGrid.classList.remove('hidden');
    }

    const isTrashView = state.currentView === 'trash';
    itemsToRender.sort((a, b) => (a.type === 'folder' && b.type !== 'file') ? -1 : 1).forEach(item => {
        const meta = item.file_meta ? JSON.parse(item.file_meta) : {};
        const fileMeta = item.type === 'folder' ? '' : `${(meta.fileType || 'file').toUpperCase()} • ${meta.size || '0 KB'}`;
        const isSelected = state.selectedItems.has(item.id.toString());

        const actionsHTML = isTrashView ? `
            <button class="file-action-btn" data-action="restore" title="Restore">${ICONS.restore}</button>
            <button class="file-action-btn" data-action="permanent-delete" title="Delete Permanently">${ICONS.delete}</button>
        ` : `
            <button class="file-action-btn favorite ${item.is_favorite ? 'is-favorite' : ''}" data-action="favorite">${ICONS.favorite}</button>
            <button class="file-action-btn" data-action="delete">${ICONS.delete}</button>
        `;

        const fileElementHTML = `
            <div class="file-item ${item.type === 'folder' ? 'is-folder' : ''} ${isSelected ? 'selected' : ''}" data-id="${item.id}" data-name="${item.name}" draggable="false">
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

export function updateSelectionToolbar() {
    const count = state.selectedItems.size;
    const isTrash = state.currentView === 'trash';

    DOM.selectionMoveBtn.classList.toggle('hidden', isTrash);
    DOM.selectionRestoreBtn.classList.toggle('hidden', !isTrash);

    if (count > 0) {
        DOM.selectionCount.textContent = `${count} selected`;
        DOM.defaultToolbar.classList.add('hidden');
        DOM.selectionToolbar.classList.remove('hidden');
        DOM.selectionDeleteBtn.innerHTML = isTrash
            ? `${ICONS.delete} Delete Permanently`
            : `${ICONS.delete} Delete`;
    } else {
        DOM.defaultToolbar.classList.remove('hidden');
        DOM.selectionToolbar.classList.add('hidden');
    }
}

export function switchToExplorer() {
    DOM.explorerView.classList.remove('hidden');
    DOM.uploadView.classList.add('hidden');
}

export function switchToUpload() {
    DOM.explorerView.classList.add('hidden');
    DOM.uploadView.classList.remove('hidden');
}

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