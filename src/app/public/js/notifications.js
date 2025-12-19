/**
 * Global Notification System
 * Non-blocking notifications with progress tracking
 */

console.log('[NotificationManager] Loading notification system...');

class NotificationManager {
    constructor() {
        console.log('[NotificationManager] Initializing...');
        this.notifications = new Map();
        this.nextId = 1;
        this.ensureContainer();
    }

    ensureContainer() {
        if (!document.getElementById('global-notifications-container')) {
            const container = document.createElement('div');
            container.id = 'global-notifications-container';
            document.body.appendChild(container);
        }
    }

    /**
     * Show a simple notification
     */
    showNotification(type, title, message, autoDismiss = 5000) {
        const id = `notif-${this.nextId++}`;
        const container = document.getElementById('global-notifications-container');

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.dataset.id = id;
        notification.innerHTML = `
            <div class="notification-header">
                <h4>${title}</h4>
                <button class="notification-close" data-close="${id}">&times;</button>
            </div>
            <div class="notification-body">
                <p>${message}</p>
            </div>
        `;

        container.appendChild(notification);
        this.notifications.set(id, { element: notification, type });

        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.closeNotification(id);
        });

        if (autoDismiss > 0) {
            const timer = setTimeout(() => this.closeNotification(id), autoDismiss);
            this.notifications.get(id).timer = timer;

            notification.addEventListener('mouseenter', () => clearTimeout(timer));
            notification.addEventListener('mouseleave', () => {
                const newTimer = setTimeout(() => this.closeNotification(id), 2000);
                this.notifications.get(id).timer = newTimer;
            });
        }

        return id;
    }

    /**
     * NEU: Lade-Benachrichtigung OHNE Progress-Bar
     */
    showLoadingNotification(title, message = 'Processing...') {
        const id = `notif-${this.nextId++}`;
        const container = document.getElementById('global-notifications-container');

        const notification = document.createElement('div');
        notification.className = 'notification notification-progress';
        notification.dataset.id = id;
        notification.innerHTML = `
            <div class="notification-header">
                <h4>
                    <div class="notification-spinner"></div>
                    ${title}
                </h4>
                <button class="notification-close" data-close="${id}">&times;</button>
            </div>
            <div class="notification-body">
                <p class="loading-text" style="margin:0; color: var(--text-muted); font-size: 0.9rem;">${message}</p>
            </div>
        `;

        container.appendChild(notification);
        this.notifications.set(id, { element: notification, type: 'loading' });

        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.closeNotification(id);
        });

        return id;
    }

    /**
     * Show a progress notification
     */
    showProgressNotification(title) {
        const id = `notif-${this.nextId++}`;
        const container = document.getElementById('global-notifications-container');

        const notification = document.createElement('div');
        notification.className = 'notification notification-progress';
        notification.dataset.id = id;
        notification.innerHTML = `
            <div class="notification-header">
                <h4>
                    <div class="notification-spinner"></div>
                    ${title}
                </h4>
                <button class="notification-close" data-close="${id}">&times;</button>
            </div>
            <div class="notification-body">
                <div class="progress-info">Preparing...</div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                </div>
            </div>
        `;

        container.appendChild(notification);
        this.notifications.set(id, { element: notification, type: 'progress' });

        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.closeNotification(id);
        });

        return id;
    }

    updateProgress(id, current, total, message = null) {
        const notif = this.notifications.get(id);
        if (!notif) return;

        if (notif.type === 'progress') {
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            const progressBar = notif.element.querySelector('.progress-bar-fill');
            const progressInfo = notif.element.querySelector('.progress-info');
            if (progressBar) progressBar.style.width = `${percentage}%`;
            if (progressInfo) progressInfo.textContent = message || `${current} of ${total} items...`;
        } else if (notif.type === 'loading') {
            const loadingText = notif.element.querySelector('.loading-text');
            if (loadingText && message) loadingText.textContent = message;
        }
    }

    closeNotification(id) {
        const notif = this.notifications.get(id);
        if (!notif) return;
        if (notif.timer) clearTimeout(notif.timer);
        notif.element.classList.add('closing');
        setTimeout(() => {
            notif.element.remove();
            this.notifications.delete(id);
        }, 200);
    }

    closeAll() {
        this.notifications.forEach((_, id) => this.closeNotification(id));
    }
}

console.log('[NotificationManager] Creating global instance...');
window.NotificationManager = new NotificationManager();