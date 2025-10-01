// وظائف إدارة الأكواد
const CODES_API = {
    async getCodes() {
        try {
            const localData = localStorage.getItem('codes_data');
            if (localData) {
                return JSON.parse(localData);
            }
            return {};
        } catch (error) {
            console.error('Error loading codes:', error);
            return {};
        }
    },

    async saveCodes(codes) {
        try {
            localStorage.setItem('codes_data', JSON.stringify(codes));
            console.log('Codes saved successfully:', Object.keys(codes).length, 'codes');
            return true;
        } catch (error) {
            console.error('Error saving codes:', error);
            return false;
        }
    },

    async getCodeById(id) {
        try {
            const codes = await this.getCodes();
            return codes[id] || null;
        } catch (error) {
            console.error('Error getting code by ID:', error);
            return null;
        }
    },

    async createCode(codeData) {
        try {
            const codes = await this.getCodes();
            const codeId = 'code_' + Date.now();
            
            codes[codeId] = {
                id: codeId,
                name: codeData.name,
                value: codeData.value,
                createdAt: Date.now(),
                usageCount: 0
            };

            const saved = await this.saveCodes(codes);
            if (saved) {
                console.log('Code created successfully:', codeId);
                return codeId;
            }
            return null;
        } catch (error) {
            console.error('Error creating code:', error);
            return null;
        }
    },

    async updateCode(codeId, codeData) {
        try {
            const codes = await this.getCodes();
            
            if (!codes[codeId]) {
                console.log('Code not found for update:', codeId);
                return false;
            }

            codes[codeId] = {
                ...codes[codeId],
                name: codeData.name,
                value: codeData.value
            };

            return await this.saveCodes(codes);
        } catch (error) {
            console.error('Error updating code:', error);
            return false;
        }
    },

    async deleteCode(codeId) {
        try {
            const codes = await this.getCodes();
            
            if (!codes[codeId]) {
                return false;
            }

            delete codes[codeId];
            return await this.saveCodes(codes);
        } catch (error) {
            console.error('Error deleting code:', error);
            return false;
        }
    },

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