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
     * @param {string} type - 'success', 'error', 'info'
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {number} autoDismiss - Auto-dismiss after ms (0 = no auto-dismiss)
     * @returns {string} notification ID
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

        // Close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.closeNotification(id);
        });

        // Auto-dismiss if specified
        if (autoDismiss > 0) {
            const timer = setTimeout(() => this.closeNotification(id), autoDismiss);
            this.notifications.get(id).timer = timer;

            // Pause on hover
            notification.addEventListener('mouseenter', () => clearTimeout(timer));
            notification.addEventListener('mouseleave', () => {
                const newTimer = setTimeout(() => this.closeNotification(id), 2000);
                this.notifications.get(id).timer = newTimer;
            });
        }

        return id;
    }

    /**
     * Show a progress notification
     * @param {string} title - Notification title
     * @returns {string} notification ID
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

        // Close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.closeNotification(id);
        });

        return id;
    }

    /**
     * Update progress notification
     * @param {string} id - Notification ID
     * @param {number} current - Current progress value
     * @param {number} total - Total progress value
     * @param {string} message - Optional custom message
     */
    updateProgress(id, current, total, message = null) {
        console.log(`[NotificationManager] updateProgress called: id=${id}, current=${current}, total=${total}`);
        const notif = this.notifications.get(id);
        if (!notif || notif.type !== 'progress') {
            console.log('[NotificationManager] Notification not found or not progress type');
            return;
        }

        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        console.log(`[NotificationManager] Calculated percentage: ${percentage}%`);

        const progressBar = notif.element.querySelector('.progress-bar-fill');
        const progressInfo = notif.element.querySelector('.progress-info');

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        } else {
            console.log('[NotificationManager] Progress bar element not found!');
        }

        if (progressInfo) {
            progressInfo.textContent = message || `${current} of ${total} items...`;
        }
    }

    /**
     * Close a notification
     * @param {string} id - Notification ID
     */
    closeNotification(id) {
        const notif = this.notifications.get(id);
        if (!notif) return;

        // Clear timer if exists
        if (notif.timer) {
            clearTimeout(notif.timer);
        }

        // Add closing animation
        notif.element.classList.add('closing');

        // Remove after animation
        setTimeout(() => {
            notif.element.remove();
            this.notifications.delete(id);
        }, 200);
    }

    /**
     * Close all notifications
     */
    closeAll() {
        this.notifications.forEach((_, id) => this.closeNotification(id));
    }
}

// Create global instance
console.log('[NotificationManager] Creating global instance...');
window.NotificationManager = new NotificationManager();
console.log('[NotificationManager] Successfully initialized! Available as window.NotificationManager');
