// background.js - 后台服务脚本
// 用于处理右键菜单和快速添加到导航页功能

// 扩展安装/更新时注册右键菜单
chrome.runtime.onInstalled.addListener(async () => {
    await registerContextMenus();
});

// 扩展启动时注册右键菜单
chrome.runtime.onStartup.addListener(async () => {
    await registerContextMenus();
});

// 注册右键菜单
async function registerContextMenus() {
    try {
        // 先清理旧菜单
        await chrome.contextMenus.removeAll();
        
        // 在页面上右键 - 添加当前页面
        chrome.contextMenus.create({
            id: 'nav_add_current_page',
            title: '⚡ 快速添加到导航页',
            contexts: ['page']
        });
        
        // 在链接上右键 - 添加链接
        chrome.contextMenus.create({
            id: 'nav_add_link',
            title: '⚡ 添加链接到导航页',
            contexts: ['link']
        });
        
        // 在书签栏书签上右键 - 添加书签
        chrome.contextMenus.create({
            id: 'nav_add_bookmark',
            title: '⚡ 添加到导航页',
            contexts: ['bookmark']
        });
        
        // 分隔线
        chrome.contextMenus.create({
            id: 'nav_separator',
            type: 'separator',
            contexts: ['page', 'link', 'bookmark']
        });
        
        // 选择分类添加
        chrome.contextMenus.create({
            id: 'nav_add_with_category',
            title: '🚀 选择分类添加到导航页...',
            contexts: ['page', 'link', 'bookmark']
        });
        
    } catch (e) {
        console.error('注册右键菜单失败:', e);
    }
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    
    try {
        let url = '';
        let title = '';
        
        // 根据不同的菜单项获取URL和标题
        if (info.menuItemId === 'nav_add_current_page') {
            url = tab?.url || info.pageUrl;
            title = tab?.title || '';
        } else if (info.menuItemId === 'nav_add_link') {
            url = info.linkUrl;
            title = info.linkText || '';
        } else if (info.menuItemId === 'nav_add_bookmark') {
            // 书签右键，需要获取书签信息
            if (info.bookmarkId) {
                const [bookmark] = await chrome.bookmarks.get(info.bookmarkId);
                if (bookmark) {
                    url = bookmark.url;
                    title = bookmark.title;
                }
            }
        } else if (info.menuItemId === 'nav_add_with_category') {
            // 选择分类添加 - 打开书签管理器
            if (info.bookmarkId) {
                const [bookmark] = await chrome.bookmarks.get(info.bookmarkId);
                if (bookmark) {
                    url = bookmark.url;
                    title = bookmark.title;
                }
            } else if (info.linkUrl) {
                url = info.linkUrl;
                title = info.linkText || '';
            } else {
                url = tab?.url || info.pageUrl;
                title = tab?.title || '';
            }
            
            // 打开书签管理器并传递参数
            if (url) {
                const bookmarksUrl = chrome.runtime.getURL('bookmarks.html') + 
                    `?addToNav=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
                chrome.tabs.create({ url: bookmarksUrl });
            }
            return;
        }
        
        // 快速添加
        if (url && (info.menuItemId === 'nav_add_current_page' || 
                    info.menuItemId === 'nav_add_link' || 
                    info.menuItemId === 'nav_add_bookmark')) {
            await quickAddToNavFromBackground(url, title);
        }
    } catch (e) {
        console.error('处理右键菜单失败:', e);
    }
});

// 从后台快速添加到导航页
async function quickAddToNavFromBackground(url, title) {
    try {
        // 获取配置
        const config = await chrome.storage.sync.get(['navUrl', 'lastMenuId', 'lastSubMenuId']);
        const token = (await chrome.storage.local.get(['navAuthToken'])).navAuthToken;
        
        if (!config.navUrl || !config.lastMenuId) {
            // 没有配置，显示通知并打开设置
            showNotification('请先配置导航站', '请在书签管理器中先添加一次书签以配置导航站地址和默认分类');
            chrome.tabs.create({ url: chrome.runtime.getURL('bookmarks.html') });
            return;
        }
        
        if (!token) {
            // 没有token，需要登录
            showNotification('需要登录', '请在书签管理器中登录导航站');
            const bookmarksUrl = chrome.runtime.getURL('bookmarks.html') + 
                `?addToNav=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
            chrome.tabs.create({ url: bookmarksUrl });
            return;
        }
        
        // 构建卡片数据
        const navServerUrl = config.navUrl.replace(/\/$/, '');
        let logo = '';
        try {
            const urlObj = new URL(url);
            logo = `https://api.xinac.net/icon/?url=${urlObj.origin}&sz=128`;
        } catch (e) {}
        
        const cards = [{
            title: title || '无标题',
            url: url,
            logo: logo,
            description: ''
        }];
        
        // 发送请求
        const response = await fetch(`${navServerUrl}/api/batch/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                menu_id: parseInt(config.lastMenuId),
                sub_menu_id: config.lastSubMenuId ? parseInt(config.lastSubMenuId) : null,
                cards
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // token过期
                await chrome.storage.local.remove(['navAuthToken']);
                showNotification('登录已过期', '请重新登录导航站');
                const bookmarksUrl = chrome.runtime.getURL('bookmarks.html') + 
                    `?addToNav=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
                chrome.tabs.create({ url: bookmarksUrl });
                return;
            }
            throw new Error('添加失败');
        }
        
        const result = await response.json();
        
        if (result.added > 0) {
            showNotification('添加成功', `已添加 "${title || url}" 到导航页`);
        } else if (result.skipped > 0) {
            showNotification('已跳过', `"${title || url}" 已存在于导航页`);
        }
        
    } catch (e) {
        console.error('快速添加失败:', e);
        showNotification('添加失败', e.message);
    }
}

// 显示通知
function showNotification(title, message) {
    console.log(`[通知] ${title}: ${message}`);
    
    // 使用系统通知
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message
    }).catch(e => console.warn('创建通知失败:', e));
}

// 监听来自其他页面的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'quickAddToNav') {
        quickAddToNavFromBackground(request.url, request.title)
            .then(() => sendResponse({ success: true }))
            .catch(e => sendResponse({ success: false, error: e.message }));
        return true; // 异步响应
    }
});
