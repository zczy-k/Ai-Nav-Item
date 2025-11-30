// popup.js - 扩展弹窗脚本

let menus = [];

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadSettings();
    bindEvents();
}

// 加载所有设置
async function loadSettings() {
    const result = await chrome.storage.sync.get([
        'navUrl', 'newtabMode', 'floatBtnEnabled', 
        'lastMenuId', 'lastSubMenuId'
    ]);

    // 新标签页模式
    document.getElementById('newtabMode').value = result.newtabMode || 'nav';

    // 导航站地址
    if (result.navUrl) {
        document.getElementById('navUrlInput').value = result.navUrl;
        document.getElementById('openNav').disabled = false;
        // 加载分类
        await loadMenus();
    } else {
        document.getElementById('openNav').disabled = true;
    }

    // 浮动按钮开关
    document.getElementById('floatBtnEnabled').checked = result.floatBtnEnabled !== false;

    // 默认分类
    if (result.lastMenuId) {
        document.getElementById('defaultMenuSelect').value = result.lastMenuId;
        await loadSubMenus(result.lastMenuId);
        if (result.lastSubMenuId) {
            document.getElementById('defaultSubMenuSelect').value = result.lastSubMenuId;
        }
    }
}

// 绑定事件
function bindEvents() {
    // 新标签页模式切换
    document.getElementById('newtabMode').addEventListener('change', async (e) => {
        await chrome.storage.sync.set({ newtabMode: e.target.value });
        showStatus('navUrlStatus', '模式已切换，请刷新新标签页', false);
    });

    // 保存导航站地址
    document.getElementById('saveNavUrl').addEventListener('click', saveNavUrl);
    document.getElementById('navUrlInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveNavUrl();
    });

    // 刷新分类
    document.getElementById('refreshMenus').addEventListener('click', async () => {
        await loadMenus(true);
    });

    // 默认分类选择
    document.getElementById('defaultMenuSelect').addEventListener('change', async (e) => {
        const menuId = e.target.value;
        await chrome.storage.sync.set({ lastMenuId: menuId, lastSubMenuId: '' });
        await loadSubMenus(menuId);
        // 通知 background 刷新右键菜单
        chrome.runtime.sendMessage({ action: 'refreshMenus' });
        showStatus('menuStatus', '默认分类已保存', false);
    });

    // 默认子分类选择
    document.getElementById('defaultSubMenuSelect').addEventListener('change', async (e) => {
        await chrome.storage.sync.set({ lastSubMenuId: e.target.value });
        showStatus('menuStatus', '默认子分类已保存', false);
    });

    // 浮动按钮开关
    document.getElementById('floatBtnEnabled').addEventListener('change', async (e) => {
        await chrome.storage.sync.set({ floatBtnEnabled: e.target.checked });
    });

    // 访问导航站
    document.getElementById('openNav').addEventListener('click', () => {
        const url = document.getElementById('navUrlInput').value.trim();
        if (url) {
            chrome.tabs.create({ url });
            window.close();
        }
    });

    // 打开书签管理器
    document.getElementById('openBookmarks').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('bookmarks.html') });
        window.close();
    });
}

// 保存导航站地址
async function saveNavUrl() {
    const input = document.getElementById('navUrlInput');
    let url = input.value.trim();

    if (!url) {
        showStatus('navUrlStatus', '请输入导航站地址', true);
        return;
    }

    // 验证URL格式
    try {
        const urlObj = new URL(url);
        if (!urlObj.protocol.startsWith('http')) {
            throw new Error('Invalid protocol');
        }
        url = urlObj.origin; // 只保留 origin
    } catch (e) {
        showStatus('navUrlStatus', '请输入有效的URL（需包含 http:// 或 https://）', true);
        return;
    }

    // 保存
    await chrome.storage.sync.set({ navUrl: url });
    input.value = url;
    document.getElementById('openNav').disabled = false;
    showStatus('navUrlStatus', '导航站地址已保存', false);

    // 加载分类
    await loadMenus(true);
    
    // 通知 background 刷新
    chrome.runtime.sendMessage({ action: 'refreshMenus' });
}

// 加载分类列表
async function loadMenus(forceRefresh = false) {
    const select = document.getElementById('defaultMenuSelect');
    const subSelect = document.getElementById('defaultSubMenuSelect');
    
    select.innerHTML = '<option value="">加载中...</option>';
    subSelect.innerHTML = '<option value="">-- 不使用子分类 --</option>';

    try {
        const response = await chrome.runtime.sendMessage({ 
            action: 'getMenus', 
            forceRefresh 
        });

        if (!response.success) {
            select.innerHTML = '<option value="">加载失败</option>';
            showStatus('menuStatus', response.error || '加载分类失败', true);
            return;
        }

        menus = response.menus;

        if (menus.length === 0) {
            select.innerHTML = '<option value="">暂无分类</option>';
            return;
        }

        // 填充分类选项
        select.innerHTML = '<option value="">-- 选择默认分类 --</option>';
        menus.forEach(menu => {
            const option = document.createElement('option');
            option.value = menu.id;
            option.textContent = menu.name;
            select.appendChild(option);
        });

        // 恢复之前的选择
        const result = await chrome.storage.sync.get(['lastMenuId', 'lastSubMenuId']);
        if (result.lastMenuId) {
            select.value = result.lastMenuId;
            await loadSubMenus(result.lastMenuId);
            if (result.lastSubMenuId) {
                subSelect.value = result.lastSubMenuId;
            }
        }

        if (forceRefresh) {
            showStatus('menuStatus', '分类已刷新', false);
        }
    } catch (e) {
        select.innerHTML = '<option value="">加载失败</option>';
        showStatus('menuStatus', '加载分类失败: ' + e.message, true);
    }
}

// 加载子分类
async function loadSubMenus(menuId) {
    const subSelect = document.getElementById('defaultSubMenuSelect');
    subSelect.innerHTML = '<option value="">-- 不使用子分类 --</option>';

    if (!menuId) return;

    const menu = menus.find(m => m.id.toString() === menuId.toString());
    if (menu && menu.subMenus && menu.subMenus.length > 0) {
        menu.subMenus.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            subSelect.appendChild(option);
        });
    }
}

// 显示状态信息
function showStatus(elementId, message, isError) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = 'status-text' + (isError ? ' error' : '');
    el.style.display = 'block';

    if (!isError) {
        setTimeout(() => {
            el.style.display = 'none';
        }, 2000);
    }
}
