// نظام إدارة الأكواد مع PHP
const CODES_API = {
    baseUrl: 'api/codes.php',
    
    async request(endpoint = '', options = {}) {
        try {
            const url = this.baseUrl + endpoint;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    },

    // الحصول على جميع الأكواد
    async getCodes() {
        try {
            const result = await this.request();
            if (result.success) {
                return result.codes || {};
            }
            return {};
        } catch (error) {
            console.error('Error loading codes:', error);
            return this.getLocalCodes();
        }
    },

    // الحصول على كود بواسطة ID
    async getCodeById(id) {
        try {
            const result = await this.request(`?id=${encodeURIComponent(id)}`);
            if (result.success && result.code) {
                return result.code;
            }
            return null;
        } catch (error) {
            console.error('Error getting code by ID:', error);
            const codes = await this.getLocalCodes();
            return codes[id] || null;
        }
    },

    // إنشاء كود جديد
    async createCode(codeData) {
        try {
            const result = await this.request('', {
                method: 'POST',
                body: JSON.stringify(codeData)
            });
            
            if (result.success) {
                await this.saveLocalCode(result.codeId, result.code);
                return result.codeId;
            }
            return null;
        } catch (error) {
            console.error('Error creating code:', error);
            return this.createLocalCode(codeData);
        }
    },

    // تحديث كود موجود
    async updateCode(codeId, codeData) {
        try {
            const result = await this.request('', {
                method: 'PUT',
                body: JSON.stringify({
                    id: codeId,
                    name: codeData.name,
                    value: codeData.value
                })
            });
            
            if (result.success) {
                await this.updateLocalCode(codeId, codeData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating code:', error);
            return this.updateLocalCode(codeId, codeData);
        }
    },

    // تحديث عداد الاستخدام
    async updateUsage(codeId) {
        try {
            const response = await fetch('api/update.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: codeId })
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error updating usage:', error);
            return false;
        }
    },

    // حذف كود
    async deleteCode(codeId) {
        try {
            const result = await this.request('', {
                method: 'DELETE',
                body: JSON.stringify({ id: codeId })
            });
            
            if (result.success) {
                await this.deleteLocalCode(codeId);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting code:', error);
            return this.deleteLocalCode(codeId);
        }
    },

    // البحث في الأكواد
    async searchCodes(query) {
        try {
            const codes = await this.getCodes();
            const results = {};
            const searchTerm = query.toLowerCase().trim();
            
            if (!searchTerm) {
                return codes;
            }
            
            for (const [id, code] of Object.entries(codes)) {
                if (
                    (code.name && code.name.toLowerCase().includes(searchTerm)) ||
                    (code.value && code.value.toLowerCase().includes(searchTerm)) ||
                    (id && id.toLowerCase().includes(searchTerm))
                ) {
                    results[id] = code;
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error searching codes:', error);
            return {};
        }
    },

    // === النسخ الاحتياطي في localStorage ===
    async getLocalCodes() {
        try {
            const localData = localStorage.getItem('codes_backup');
            return localData ? JSON.parse(localData) : {};
        } catch {
            return {};
        }
    },

    async saveLocalCode(codeId, codeData) {
        try {
            const codes = await this.getLocalCodes();
            codes[codeId] = codeData;
            localStorage.setItem('codes_backup', JSON.stringify(codes));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    },

    async createLocalCode(codeData) {
        try {
            const codes = await this.getLocalCodes();
            const codeId = 'local_code_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            
            const newCode = {
                id: codeId,
                name: codeData.name,
                value: codeData.value,
                createdAt: Date.now(),
                usageCount: 0
            };
            
            codes[codeId] = newCode;
            localStorage.setItem('codes_backup', JSON.stringify(codes));
            return codeId;
        } catch (error) {
            console.error('Error creating local code:', error);
            return null;
        }
    },

    async updateLocalCode(codeId, codeData) {
        try {
            const codes = await this.getLocalCodes();
            if (codes[codeId]) {
                codes[codeId] = { ...codes[codeId], ...codeData };
                localStorage.setItem('codes_backup', JSON.stringify(codes));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating local code:', error);
            return false;
        }
    },

    async deleteLocalCode(codeId) {
        try {
            const codes = await this.getLocalCodes();
            if (codes[codeId]) {
                delete codes[codeId];
                localStorage.setItem('codes_backup', JSON.stringify(codes));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting local code:', error);
            return false;
        }
    }
};

// نظام التوقيت
const TIMER = {
    canUserAccessCode(codeId) {
        try {
            const userKey = `used_${codeId}`;
            const lastUsed = localStorage.getItem(userKey);
            const now = Date.now();
            const twentyFourHours = 24 * 60 * 60 * 1000;

            if (lastUsed && (now - parseInt(lastUsed) < twentyFourHours)) {
                return {
                    allowed: false,
                    remainingTime: twentyFourHours - (now - parseInt(lastUsed))
                };
            }

            return { allowed: true };
        } catch (error) {
            console.error('Error checking access:', error);
            return { allowed: true };
        }
    },

    recordUsage(codeId) {
        try {
            localStorage.setItem(`used_${codeId}`, Date.now().toString());
        } catch (error) {
            console.error('Error recording usage:', error);
        }
    }
};

// التبليغات
function showNotification(message, type = 'success') {
    try {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            max-width: 90vw;
            word-wrap: break-word;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    } catch (error) {
        console.error('Error showing notification:', error);
        alert(message);
    }
}