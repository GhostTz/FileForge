(() => {
    // --- DOM ELEMENTS ---
    const explorerView = document.getElementById('explorer-view');
    const uploadView = document.getElementById('upload-view');
    const explorerUploadBtn = document.getElementById('explorer-upload-btn');
    const explorerBtn = document.getElementById('explorer-btn');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const fileGrid = document.getElementById('file-grid');
    const searchInput = document.getElementById('file-search-input');
    const newBtn = document.getElementById('new-btn');
    const dropZone = document.getElementById('drop-zone');
    const uploadQueueContainer = document.getElementById('upload-queue');
    const uploadCompleteBtn = document.getElementById('upload-complete-btn');
    const breadcrumbsContainer = document.getElementById('breadcrumbs');
    const emptyFolderView = document.getElementById('empty-folder-view');
    const emptyFolderTitle = document.getElementById('empty-folder-title');
    const emptyFolderText = document.getElementById('empty-folder-text');
    
    // Modals
    const createFolderModal = document.getElementById('create-folder-modal');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const newFolderNameInput = document.getElementById('new-folder-name-input');
    const confirmCreateFolderBtn = document.getElementById('confirm-create-folder');
    const cancelCreateFolderBtn = document.getElementById('cancel-create-folder');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const deleteModalText = document.getElementById('delete-modal-text');

    const navLinks = {
        myFiles: document.getElementById('nav-my-files'),
        favorites: document.getElementById('nav-favorites'),
        trash: document.getElementById('nav-trash')
    };

    // --- ICONS ---
    const ICONS = {
        folder: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
        file: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
        favorite: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        delete: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
    };
    
    // --- STATE MANAGEMENT ---
    let state = {
        currentView: 'myFiles',
        currentParentId: null,
        currentPath: [{ id: null, name: 'Home' }],
        items: [],
        itemToDelete: null
    };

    // --- API FUNCTIONS ---
    const fetchItems = async (parentId = null) => {
        try {
            const url = parentId ? `/api/cloud/items?parentId=${parentId}` : '/api/cloud/items';
            const response = await fetch(url);
            state.items = await response.json();
            updateUI();
        } catch (error) {
            console.error("Failed to fetch items:", error);
        }
    };
    
    const fetchPath = async (itemId) => {
        if (!itemId) {
            state.currentPath = [{ id: null, name: 'Home' }];
            return;
        }
        try {
            const response = await fetch(`/api/cloud/path/${itemId}`);
            state.currentPath = await response.json();
        } catch (error) {
            console.error("Failed to fetch path:", error);
        }
    }

    const fetchView = async (viewName) => {
        try {
            const response = await fetch(`/api/cloud/${viewName}`);
            state.items = await response.json();
            updateUI();
        } catch (error) {
            console.error(`Failed to fetch ${viewName}:`, error);
        }
    }

    // --- RENDER FUNCTIONS ---
    const setActiveSidebarLink = () => {
        Object.values(navLinks).forEach(link => link.classList.remove('active'));
        if (navLinks[state.currentView]) {
            navLinks[state.currentView].classList.add('active');
        } else {
             navLinks.myFiles.classList.add('active');
        }
    };

    const renderBreadcrumbs = () => {
        breadcrumbsContainer.innerHTML = '';
        if (state.currentView !== 'myFiles') {
            const viewName = state.currentView.charAt(0).toUpperCase() + state.currentView.slice(1);
            breadcrumbsContainer.innerHTML = `<a class="active">${viewName}</a>`;
            return;
        }
        state.currentPath.forEach((part, index) => {
            if (index > 0) {
                breadcrumbsContainer.innerHTML += `<span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>`;
            }
            const isLast = index === state.currentPath.length - 1;
            breadcrumbsContainer.innerHTML += `<a class="${isLast ? 'active' : ''}" data-id="${part.id}">${part.name}</a>`;
        });
    };
    
    const renderFiles = () => {
        fileGrid.innerHTML = '';
        const itemsToRender = state.items;
        
        if (itemsToRender.length === 0) {
            emptyFolderView.classList.remove('hidden');
            fileGrid.classList.add('hidden');
             if (state.currentView === 'favorites') {
                emptyFolderTitle.textContent = 'No favorites yet';
                emptyFolderText.textContent = 'Click the star icon on any file or folder to add it here.';
            } else if (state.currentView === 'trash') {
                emptyFolderTitle.textContent = 'Trash is empty';
                emptyFolderText.textContent = 'Deleted items will appear here.';
            } else {
                emptyFolderTitle.textContent = 'This folder is empty';
                emptyFolderText.textContent = 'Drag and drop files here or use the "Upload" button.';
            }
        } else {
            emptyFolderView.classList.add('hidden');
            fileGrid.classList.remove('hidden');
        }

        itemsToRender.sort((a,b) => (a.type === 'folder' && b.type !== 'file') ? -1 : 1).forEach(item => {
            const meta = item.file_meta ? JSON.parse(item.file_meta) : {};
            const fileMeta = item.type === 'folder'
                ? `${meta.itemCount || 0} items` // This would need another query to be accurate, placeholder for now
                : `${meta.fileType || 'File'} • ${meta.size || '0 KB'}`;
            
            const fileElementHTML = `<div class="file-item ${item.type === 'folder' ? 'is-folder' : ''}" data-id="${item.id}" data-name="${item.name}"><div class="file-icon">${ICONS[item.type]}</div><div class="file-details"><p class="file-info">${item.name}</p><p class="file-meta">${fileMeta}</p></div><div class="file-actions"><button class="file-action-btn favorite ${item.is_favorite ? 'is-favorite' : ''}" data-action="favorite">${ICONS.favorite}</button><button class="file-action-btn" data-action="delete">${ICONS.delete}</button></div></div>`;
            fileGrid.insertAdjacentHTML('beforeend', fileElementHTML);
        });
    };

    const updateUI = () => {
        setActiveSidebarLink();
        renderBreadcrumbs();
        renderFiles();
        newBtn.style.display = state.currentView === 'myFiles' ? 'flex' : 'none';
        searchInput.style.display = state.currentView === 'myFiles' ? 'block' : 'none';
    };

    // --- ACTION HANDLERS ---
    const switchToExplorer = () => {
        explorerView.classList.remove('hidden');
        uploadView.classList.add('hidden');
    };

    const switchToUpload = () => {
        explorerView.classList.add('hidden');
        uploadView.classList.remove('hidden');
    };
    
    const navigateToFolder = async (folderId, folderName) => {
        state.currentParentId = folderId;
        await fetchPath(folderId);
        await fetchItems(folderId);
    };

    const navigateToBreadcrumb = async (element) => {
        const id = element.dataset.id === 'null' ? null : element.dataset.id;
        state.currentParentId = id;
        await fetchPath(id);
        await fetchItems(id);
    };

    const openCreateFolderModal = () => {
        createFolderModal.classList.remove('hidden');
        newFolderNameInput.value = '';
        newFolderNameInput.focus();
    };

    const closeCreateFolderModal = () => createFolderModal.classList.add('hidden');
    
    const handleCreateFolder = async () => {
        const folderName = newFolderNameInput.value.trim();
        if (folderName) {
            await fetch('/api/cloud/folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: folderName, parentId: state.currentParentId })
            });
            await fetchItems(state.currentParentId);
            closeCreateFolderModal();
        }
    };

    const openDeleteModal = (itemElement) => {
        state.itemToDelete = { id: itemElement.dataset.id, name: itemElement.dataset.name };
        deleteModalText.innerHTML = `Are you sure you want to move "<strong>${state.itemToDelete.name}</strong>" to the Trash?`;
        confirmDeleteModal.classList.remove('hidden');
    };
    
    const closeDeleteModal = () => {
        confirmDeleteModal.classList.add('hidden');
        state.itemToDelete = null;
    };
    
    const handleDeleteItem = async () => {
        if (!state.itemToDelete) return;
        await fetch(`/api/cloud/item/${state.itemToDelete.id}`, { method: 'DELETE' });
        
        // Re-fetch current view
        if (state.currentView === 'myFiles') await fetchItems(state.currentParentId);
        else await fetchView(state.currentView);
        
        closeDeleteModal();
    };
    
    const toggleFavorite = async (itemId, currentStatus) => {
        await fetch(`/api/cloud/item/${itemId}/favorite`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ isFavorite: !currentStatus })
        });
        
        if (state.currentView === 'myFiles') await fetchItems(state.currentParentId);
        else await fetchView(state.currentView);
    };


    // --- EVENT LISTENERS ---
    explorerUploadBtn.addEventListener('click', switchToUpload);
    explorerBtn.addEventListener('click', switchToExplorer);

    gridViewBtn.addEventListener('click', () => {
        fileGrid.classList.remove('list-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
    });

    listViewBtn.addEventListener('click', () => {
        fileGrid.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
    });

    newBtn.addEventListener('click', openCreateFolderModal);
    
    breadcrumbsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (target && !target.classList.contains('active')) {
            navigateToBreadcrumb(target);
        }
    });

    fileGrid.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        const actionBtn = e.target.closest('.file-action-btn');
        if (actionBtn) {
            e.stopPropagation();
            const action = actionBtn.dataset.action;
            const itemId = fileItem.dataset.id;
            if (action === 'favorite') {
                const currentStatus = actionBtn.classList.contains('is-favorite');
                toggleFavorite(itemId, currentStatus);
            }
            if (action === 'delete') openDeleteModal(fileItem);
        } else if (fileItem.classList.contains('is-folder')) {
            navigateToFolder(fileItem.dataset.id, fileItem.dataset.name);
        }
    });
    
    const setupSidebarNav = async (viewName) => {
        state.currentView = viewName;
        state.currentParentId = null;
        state.currentPath = [{id: null, name: 'Home'}];
        searchInput.value = '';
        
        if(viewName === 'myFiles') await fetchItems();
        else await fetchView(viewName);
    };

    navLinks.myFiles.addEventListener('click', (e) => { e.preventDefault(); setupSidebarNav('myFiles'); });
    navLinks.favorites.addEventListener('click', (e) => { e.preventDefault(); setupSidebarNav('favorites'); });
    navLinks.trash.addEventListener('click', (e) => { e.preventDefault(); setupSidebarNav('trash'); });

    // Modal Event Listeners
    confirmCreateFolderBtn.addEventListener('click', handleCreateFolder);
    cancelCreateFolderBtn.addEventListener('click', closeCreateFolderModal);
    createFolderModal.addEventListener('click', (e) => { if(e.target === createFolderModal) closeCreateFolderModal(); });
    newFolderNameInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') handleCreateFolder(); });

    confirmDeleteBtn.addEventListener('click', handleDeleteItem);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteModal.addEventListener('click', (e) => { if(e.target === confirmDeleteModal) closeDeleteModal(); });
    
    // Upload Simulation Logic omitted for brevity as it's purely visual
    
    // --- INITIALIZATION ---
    fetchItems();
})();