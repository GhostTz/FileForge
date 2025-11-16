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
        image: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
        text: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
        favorite: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        delete: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
    };
    
    // --- STATE MANAGEMENT ---
    let state = {
        currentView: 'myFiles',
        currentPath: ['Home'],
        fileSystem: {
            Home: { type: 'folder', items: {} }
        },
        trash: [],
        favorites: new Set(),
        nextId: 0,
        itemToDelete: null
    };

    // --- HELPER FUNCTIONS ---
    const getItemByPath = (path) => {
        let current = state.fileSystem;
        for (const part of path) {
            if (current[part] && current[part].type === 'folder') {
                current = current[part].items;
            } else { return null; }
        }
        return current;
    };

    const generateId = () => `item-${state.nextId++}`;

    const findItemAndParent = (itemId, startNode = state.fileSystem.Home) => {
        const items = startNode.items;
        for (const key in items) {
            if (key === itemId) return { item: items[key], parent: items };
            if (items[key].type === 'folder') {
                const found = findItemAndParent(itemId, items[key]);
                if (found) return found;
            }
        }
        return null;
    };
    
    const getAllItems = (node = state.fileSystem.Home.items, result = []) => {
        Object.values(node).forEach(item => {
            result.push(item);
            if (item.type === 'folder' && item.items) getAllItems(item.items, result);
        });
        return result;
    };

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
            breadcrumbsContainer.innerHTML += `<a class="${isLast ? 'active' : ''}" data-path-index="${index}">${part}</a>`;
        });
    };
    
    const renderFiles = () => {
        fileGrid.innerHTML = '';
        let itemsToRender = [];
        let currentSearch = searchInput.value.toLowerCase();

        if (state.currentView === 'myFiles') {
            const currentFolder = getItemByPath(state.currentPath);
            itemsToRender = currentFolder ? Object.values(currentFolder) : [];
        } else if (state.currentView === 'favorites') {
             itemsToRender = getAllItems().filter(item => state.favorites.has(item.id));
        } else if (state.currentView === 'trash') {
            itemsToRender = state.trash;
        }

        if(currentSearch) {
            itemsToRender = itemsToRender.filter(item => item.name.toLowerCase().includes(currentSearch));
        }
        
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

        itemsToRender.sort((a,b) => (a.type === 'folder' && b.type !== 'folder') ? -1 : 1).forEach(item => {
            const isFavorite = state.favorites.has(item.id);
            const fileMeta = item.type === 'folder'
                ? `${Object.keys(item.items).length} items`
                : `${item.fileType.toUpperCase()} • ${item.size}`;
            
            const fileElementHTML = `<div class="file-item ${item.type === 'folder' ? 'is-folder' : ''}" data-id="${item.id}"><div class="file-icon">${ICONS[item.icon]}</div><div class="file-details"><p class="file-info">${item.name}</p><p class="file-meta">${fileMeta}</p></div><div class="file-actions"><button class="file-action-btn favorite ${isFavorite ? 'is-favorite' : ''}" data-action="favorite">${ICONS.favorite}</button><button class="file-action-btn" data-action="delete">${ICONS.delete}</button></div></div>`;
            fileGrid.insertAdjacentHTML('beforeend', fileElementHTML);
        });
    };

    const updateUI = () => {
        setActiveSidebarLink();
        renderBreadcrumbs();
        renderFiles();
        newBtn.style.display = state.currentView === 'myFiles' ? 'flex' : 'none';
    };


    // --- ACTION HANDLERS ---
    const switchToExplorer = () => {
        explorerView.classList.remove('hidden');
        uploadView.classList.add('hidden');
    };

    const switchToUpload = () => {
        explorerView.classList.add('hidden');
        uploadView.classList.remove('hidden');
        uploadQueueContainer.innerHTML = '';
        uploadCompleteBtn.classList.add('hidden');
    };

    const navigateToFolder = (itemId) => {
        const currentFolder = getItemByPath(state.currentPath);
        const folder = currentFolder ? currentFolder[itemId] : null;
        if (folder && folder.type === 'folder') {
            state.currentPath.push(folder.name);
            searchInput.value = '';
            updateUI();
        }
    };

    const navigateToBreadcrumb = (pathIndex) => {
        if(state.currentView !== 'myFiles') return;
        state.currentPath = state.currentPath.slice(0, pathIndex + 1);
        searchInput.value = '';
        updateUI();
    };

    const openCreateFolderModal = () => {
        createFolderModal.classList.remove('hidden');
        newFolderNameInput.value = '';
        newFolderNameInput.focus();
    };

    const closeCreateFolderModal = () => createFolderModal.classList.add('hidden');
    
    const handleCreateFolder = () => {
        const folderName = newFolderNameInput.value.trim();
        if (folderName) {
            const currentFolder = getItemByPath(state.currentPath);
            if (!currentFolder) return;
            const newId = generateId();
            currentFolder[newId] = { id: newId, name: folderName, type: 'folder', icon: 'folder', items: {} };
            updateUI();
            closeCreateFolderModal();
        }
    };

    const openDeleteModal = (itemId) => {
        const result = findItemAndParent(itemId);
        if (!result) return;
        state.itemToDelete = itemId;
        deleteModalText.innerHTML = `Are you sure you want to move "<strong>${result.item.name}</strong>" to the Trash?`;
        confirmDeleteModal.classList.remove('hidden');
    };
    
    const closeDeleteModal = () => {
        confirmDeleteModal.classList.add('hidden');
        state.itemToDelete = null;
    };
    
    const handleDeleteItem = () => {
        if (!state.itemToDelete) return;
        const result = findItemAndParent(state.itemToDelete);
        if(!result) return;
        const { item, parent } = result;
        state.trash.push(item);
        delete parent[state.itemToDelete];
        updateUI();
        closeDeleteModal();
    };
    
    const toggleFavorite = (itemId) => {
        if(state.favorites.has(itemId)) state.favorites.delete(itemId);
        else state.favorites.add(itemId);
        updateUI();
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
    searchInput.addEventListener('input', renderFiles);
    
    breadcrumbsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (target && target.dataset.pathIndex) {
            navigateToBreadcrumb(parseInt(target.dataset.pathIndex));
        }
    });

    fileGrid.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        const actionBtn = e.target.closest('.file-action-btn');
        if (actionBtn) {
            e.stopPropagation(); // Prevent folder navigation when clicking a button inside
            const action = actionBtn.dataset.action;
            const itemId = fileItem.dataset.id;
            if (action === 'favorite') toggleFavorite(itemId);
            if (action === 'delete') openDeleteModal(itemId);
        } else if (fileItem.classList.contains('is-folder')) {
            navigateToFolder(fileItem.dataset.id);
        }
    });
    
    const setupSidebarNav = (viewName) => {
        state.currentView = viewName;
        if(viewName === 'myFiles') state.currentPath = ['Home'];
        searchInput.value = '';
        updateUI();
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
    
    // Upload Simulation Logic
    const handleFiles = (fileList) => {
        uploadQueueContainer.innerHTML = '';
        uploadCompleteBtn.classList.add('hidden');
        let filesToUpload = Array.from(fileList);
        if (filesToUpload.length === 0) return;
        let completed = 0;
        filesToUpload.forEach((file, index) => {
            const itemHTML = `<div class="upload-item"><p>${file.name}<span>Queued</span></p><div class="upload-progress"><div class="upload-progress-bar"><div class="upload-progress-fill" id="fill-${index}"></div></div><span class="upload-percentage" id="percent-${index}">0%</span></div></div>`;
            uploadQueueContainer.insertAdjacentHTML('beforeend', itemHTML);
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    completed++;
                    if(completed === filesToUpload.length) {
                        uploadCompleteBtn.textContent = `Upload complete: ${completed} file(s) added`;
                        uploadCompleteBtn.classList.remove('hidden');
                    }
                }
                document.getElementById(`fill-${index}`).style.width = `${progress}%`;
                document.getElementById(`percent-${index}`).textContent = `${Math.round(progress)}%`;
            }, 300);
        });
    };
    
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
    document.getElementById('browse-files-btn').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = e => handleFiles(e.target.files);
        input.click();
    });

    // --- INITIALIZATION ---
    updateUI();
})();