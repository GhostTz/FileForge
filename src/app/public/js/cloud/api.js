export async function fetchItems(parentId = null) {
    const url = parentId ? `api/cloud/items?parentId=${parentId}` : 'api/cloud/items';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch items');
    return await response.json();
}

export async function fetchPath(itemId) {
    if (!itemId) return [{ id: null, name: 'Home' }];
    const response = await fetch(`api/cloud/path/${itemId}`);
    if (!response.ok) throw new Error('Failed to fetch path');
    return await response.json();
}

export async function fetchView(viewName) {
    const response = await fetch(`api/cloud/${viewName}`);
    if (!response.ok) throw new Error(`Failed to fetch ${viewName}`);
    return await response.json();
}

export async function createFolder(name, parentId) {
    const response = await fetch('api/cloud/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId })
    });
    if (!response.ok) throw new Error('Failed to create folder');
}

export async function moveItemsToTrash(itemIds) {
    const response = await fetch('api/cloud/items/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds })
    });
    if (!response.ok) throw new Error('Failed to move items to trash');
}



export async function toggleFavorite(itemId, isFavorite) {
    const response = await fetch(`api/cloud/item/${itemId}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite })
    });
    if (!response.ok) throw new Error('Failed to toggle favorite');
}

export async function fetchFolders() {
    const response = await fetch('api/cloud/folders');
    if (!response.ok) throw new Error('Failed to fetch folders');
    return await response.json();
}

export async function moveItems(itemIds, destinationId) {
    const response = await fetch('api/cloud/items/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, destinationId })
    });
    if (!response.ok) throw new Error('Failed to move items');
}

export async function getDownloadPath(itemId) {
    const response = await fetch(`api/cloud/download/${itemId}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get download path');
    }
    return await response.json();
}

export async function searchItems(term) {
    const response = await fetch(`api/cloud/search?term=${encodeURIComponent(term)}`);
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
}

export async function restoreItems(itemIds) {
    const response = await fetch('api/cloud/trash/restore', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds })
    });
    if (!response.ok) throw new Error('Failed to restore items');
}

export async function permanentlyDeleteItem(itemId) {
    const response = await fetch(`api/cloud/trash/item/${itemId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to permanently delete item');
}

export async function fetchSettings() {
    const response = await fetch('api/user/settings');
    if (!response.ok) throw new Error('Failed to fetch settings');
    return await response.json();
}