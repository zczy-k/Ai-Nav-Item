// background.js - 后台服务脚本
// 用于处理右键菜单、快速添加到导航页、分类子菜单

// 缓存的菜单数据
let cachedMenus = [];
let lastMenuFetchTime = 0;
const MENU_CACHE_MS = 5 * 60 * 1000; // 5分钟缓存
let isLoadingMenus = false; // 防止并发请求

// 扩展安装/更新时注册右键菜单
chrome.runtime.onInstalled.addListener(async () => {
    await registerContextMenus();
});

// 扩展启动时注册右键菜单
chrome.runtime.onStartup.addListener(async () => {
    await registerContextMenus();
});

// 注册基础右键菜单
async function registerContextMenus() {
    try {
        await chrome.contextMenus.removeAll();
        
        // 快速添加（使用上次分类）
        chrome.contextMenus.create({
            id: 'nav_quick_add',
            title: '⚡ 快速添加到导航页',
            contexts: ['page', 'link']
        });
        
        // 分类子菜单父项
        chrome.contextMenus.create({
            id: 'nav_category_parent',
            title: '📂 添加到分类...',
            contexts: ['page', 'link']
        });
        
        // 加载分类子菜单
        await loadAndCreateCategoryMenus();
        
        // 分隔线
        chrome.contextMenus.create({
            id: 'nav_separator',
            type: 'separator',
            contexts: ['page', 'link']
        });
        
        // 选择分类添加（打开完整界面）
        chrome.contextMenus.create({
            id: 'nav_add_with_dialog',
            title: '🚀 更多选项...',
            contexts: ['page', 'link']
        });
        
    } catch (e) {
        console.error('注册右键菜单失败:', e);
    }
}

// 加载分类并创建子菜单
async function loadAndCreateCategoryMenus() {
    try {
        const config = await chrome.storage.sync.get(['navUrl']);
        if (!config.navUrl) {
            console.warn('未配置导航站地址，跳过加载分类菜单');
            return;
        }
        
        const navServerUrl = config.navUrl.replace(/\/$/, '');
        
        // 检查缓存
        if (cachedMenus.length > 0 && Date.now() - lastMenuFetchTime < MENU_CACHE_MS) {
            createCategorySubMenus(cachedMenus);
            return;
        }
        
        // 防止并发请求
        if (isLoadingMenus) {
            console.log('正在加载菜单，跳过重复请求');
            return;
        }
        
        isLoadingMenus = true;
        
        // 获取菜单数据（带超时）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
        
        try {
            const response = await fetch(`${navServerUrl}/api/menus`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const menus = await response.json();
            
            // 验证数据格式
            if (!Array.isArray(menus)) {
                throw new Error('菜单数据格式错误');
            }
            
            cachedMenus = menus;
            lastMenuFetchTime = Date.now();
            
            // 持久化缓存到storage（离线可用）
            await chrome.storage.local.set({ 
                cachedMenus: menus,
                lastMenuFetchTime: Date.now()
            });
            
            createCategorySubMenus(menus);
            console.log(`成功加载 ${menus.length} 个分类菜单`);
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // 如果网络失败，尝试从storage加载缓存
            if (cachedMenus.length === 0) {
                const stored = await chrome.storage.local.get(['cachedMenus', 'lastMenuFetchTime']);
                if (stored.cachedMenus && Array.isArray(stored.cachedMenus)) {
                    cachedMenus = stored.cachedMenus;
                    lastMenuFetchTime = stored.lastMenuFetchTime || 0;
                    createCategorySubMenus(cachedMenus);
                    console.log('从本地缓存加载菜单');
                    return;
                }
            }
            
            throw fetchError;
        }
    } catch (e) {
        console.error('加载分类菜单失败:', e.message);
        // 即使失败也创建基础菜单，保证功能可用
    } finally {
        isLoadingMenus = false;
    }
}

// 创建分类子菜单
function createCategorySubMenus(menus) {
    if (!menus || menus.length === 0) {
        console.warn('没有可用的分类菜单');
        return;
    }
    
    // 最多显示12个常用分类
    const topMenus = menus.slice(0, 12);
    
    topMenus.forEach((menu) => {
        try {
            // 创建主分类
            chrome.contextMenus.create({
                id: `nav_menu_${menu.id}`,
                parentId: 'nav_category_parent',
                title: menu.name || '未命名分类',
                contexts: ['page', 'link']
            });
            
            // 如果有子分类，创建子菜单（最多显示8个）
            if (menu.subMenus && Array.isArray(menu.subMenus) && menu.subMenus.length > 0) {
                menu.subMenus.slice(0, 8).forEach(subMenu => {
                    chrome.contextMenus.create({
                        id: `nav_submenu_${menu.id}_${subMenu.id}`,
                        parentId: `nav_menu_${menu.id}`,
                        title: subMenu.name || '未命名子分类',
                        contexts: ['page', 'link']
                    });
                });
            }
        } catch (e) {
            console.error(`创建菜单项失败 (${menu.name}):`, e.message);
        }
    });
}

// 刷新分类菜单
async function refreshCategoryMenus() {
    try {
        const config = await chrome.storage.sync.get(['navUrl']);
        if (!config.navUrl) return;
        
        // 强制刷新缓存
        lastMenuFetchTime = 0;
        
        // 重新注册所有菜单（会自动获取最新数据）
        await registerContextMenus();
    } catch (e) {
        console.error('刷新分类菜单失败:', e);
    }
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
        let url = info.linkUrl || tab?.url || info.pageUrl;
        let title = info.linkText || tab?.title || '';
        
        if (!url) {
            console.warn('无法获取URL');
            return;
        }
        
        // 过滤特殊协议
        if (url.startsWith('chrome://') || url.startsWith('edge://') || 
            url.startsWith('about:') || url.startsWith('chrome-extension://')) {
            showNotification('无法添加', '不支持添加浏览器内部页面');
            return;
        }
        
        // 快速添加（使用上次分类）
        if (info.menuItemId === 'nav_quick_add') {
            await quickAddToNav(url, title);
            return;
        }
        
        // 打开完整界面
        if (info.menuItemId === 'nav_add_with_dialog') {
            const bookmarksUrl = chrome.runtime.getURL('bookmarks.html') + 
                `?addToNav=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
            chrome.tabs.create({ url: bookmarksUrl });
            return;
        }
        
        // 添加到指定分类
        if (info.menuItemId.startsWith('nav_menu_') || info.menuItemId.startsWith('nav_submenu_')) {
            await addToSpecificCategory(info.menuItemId, url, title);
            return;
        }
    } catch (e) {
        console.error('处理右键菜单失败:', e);
        showNotification('操作失败', e.message || '请稍后重试');
    }
});

// 添加到指定分类
async function addToSpecificCategory(menuItemId, url, title) {
    try {
        let menuId, subMenuId = null;
        
        if (menuItemId.startsWith('nav_submenu_')) {
            // nav_submenu_menuId_subMenuId
            const parts = menuItemId.replace('nav_submenu_', '').split('_');
            menuId = parseInt(parts[0]);
            subMenuId = parseInt(parts[1]);
        } else {
            // nav_menu_menuId
            menuId = parseInt(menuItemId.replace('nav_menu_', ''));
        }
        
        const config = await chrome.storage.sync.get(['navUrl']);
        const token = (await chrome.storage.local.get(['navAuthToken'])).navAuthToken;
        
        if (!config.navUrl) {
            showNotification('请先配置', '请先在书签管理器中配置导航站地址');
            return;
        }
        
        if (!token) {
            showNotification('需要登录', '请在书签管理器中登录导航站');
            const bookmarksUrl = chrome.runtime.getURL('bookmarks.html') + 
                `?addToNav=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
            chrome.tabs.create({ url: bookmarksUrl });
            return;
        }
        
        const navServerUrl = config.navUrl.replace(/\/$/, '');
        
        // 构建卡片数据（包含自动生成的标签和描述）
        const card = await buildCardData(url, title, navServerUrl, token);
        
        const response = await fetch(`${navServerUrl}/api/batch/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                menu_id: menuId,
                sub_menu_id: subMenuId,
                cards: [card]
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                await chrome.storage.local.remove(['navAuthToken']);
                showNotification('登录已过期', '请重新登录');
                return;
            }
            throw new Error('添加失败');
        }
        
        const result = await response.json();
        
        // 保存为上次使用的分类
        await chrome.storage.sync.set({ lastMenuId: menuId.toString(), lastSubMenuId: subMenuId?.toString() || '' });
        
        if (result.added > 0) {
            showNotification('添加成功', `已添加到导航页`);
        } else if (result.skipped > 0) {
            showNotification('已跳过', '该网站已存在于导航页');
        }
    } catch (e) {
        console.error('添加到分类失败:', e);
        showNotification('添加失败', e.message);
    }
}

// 快速添加（使用上次分类）
async function quickAddToNav(url, title) {
    try {
        const config = await chrome.storage.sync.get(['navUrl', 'lastMenuId', 'lastSubMenuId']);
        const token = (await chrome.storage.local.get(['navAuthToken'])).navAuthToken;
        
        if (!config.navUrl || !config.lastMenuId) {
            showNotification('请先配置', '请先添加一次书签以设置默认分类');
            chrome.tabs.create({ url: chrome.runtime.getURL('bookmarks.html') });
            return;
        }
        
        if (!token) {
            showNotification('需要登录', '请在书签管理器中登录导航站');
            const bookmarksUrl = chrome.runtime.getURL('bookmarks.html') + 
                `?addToNav=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
            chrome.tabs.create({ url: bookmarksUrl });
            return;
        }
        
        const navServerUrl = config.navUrl.replace(/\/$/, '');
        
        // 构建卡片数据（包含自动生成的标签和描述）
        const card = await buildCardData(url, title, navServerUrl, token);
        
        const response = await fetch(`${navServerUrl}/api/batch/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                menu_id: parseInt(config.lastMenuId),
                sub_menu_id: config.lastSubMenuId ? parseInt(config.lastSubMenuId) : null,
                cards: [card]
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                await chrome.storage.local.remove(['navAuthToken']);
                showNotification('登录已过期', '请重新登录');
                return;
            }
            throw new Error('添加失败');
        }
        
        const result = await response.json();
        
        if (result.added > 0) {
            showNotification('添加成功', `已添加 "${card.title}" 到导航页`);
        } else if (result.skipped > 0) {
            showNotification('已跳过', '该网站已存在于导航页');
        }
    } catch (e) {
        console.error('快速添加失败:', e);
        showNotification('添加失败', e.message);
    }
}

// 显示通知
function showNotification(title, message) {
    // 检查通知权限
    if (!chrome.notifications) {
        console.warn('通知API不可用');
        return;
    }
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: 1
    }).catch(e => {
        console.warn('创建通知失败:', e.message);
    });
}

// ==================== 自动生成标签和描述 ====================

// 截断文本到指定长度
function truncateText(text, maxLength) {
    if (!text) return '';
    text = text.trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1) + '…';
}

// 自动生成描述
function generateDescription(title, domain) {
    if (!title && !domain) return '';
    
    let desc = '';
    if (title) {
        desc = title.replace(/[\|\-–—_]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    if (domain && !desc.toLowerCase().includes(domain.toLowerCase())) {
        desc = desc ? `${desc} - ${domain}` : domain;
    }
    
    return truncateText(desc, 100);
}

// 自动生成标签名称
function generateTagNames(url, title) {
    const tags = [];
    
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace(/^www\./, '');
        const pathname = urlObj.pathname.toLowerCase();
        
        const domainTagMap = {
            'github.com': '开发', 'gitlab.com': '开发', 'stackoverflow.com': '技术',
            'youtube.com': '视频', 'bilibili.com': '视频', 'zhihu.com': '问答',
            'juejin.cn': '技术', 'csdn.net': '技术', 'cnblogs.com': '技术',
            'medium.com': '博客', 'dev.to': '技术', 'twitter.com': '社交',
            'x.com': '社交', 'facebook.com': '社交', 'linkedin.com': '职场',
            'reddit.com': '社区', 'v2ex.com': '社区', 'taobao.com': '购物',
            'jd.com': '购物', 'amazon.com': '购物', 'douban.com': '影视',
            'netflix.com': '影视', 'spotify.com': '音乐', 'wikipedia.org': '百科',
            'notion.so': '工具', 'figma.com': '设计', 'dribbble.com': '设计',
            'google.com': '搜索', 'baidu.com': '搜索', 'bing.com': '搜索'
        };
        
        for (const [site, tag] of Object.entries(domainTagMap)) {
            if (domain.includes(site)) {
                tags.push(tag);
                break;
            }
        }
        
        const pathKeywords = {
            '/doc': '文档', '/docs': '文档', '/api': 'API', '/blog': '博客',
            '/news': '新闻', '/tool': '工具', '/download': '下载', '/learn': '学习'
        };
        
        for (const [path, tag] of Object.entries(pathKeywords)) {
            if (pathname.includes(path) && !tags.includes(tag)) {
                tags.push(tag);
                break;
            }
        }
        
        if (title) {
            const titleLower = title.toLowerCase();
            const titleKeywords = {
                '文档': '文档', 'doc': '文档', 'api': 'API', '教程': '教程',
                '工具': '工具', 'tool': '工具', '官网': '官网'
            };
            
            for (const [keyword, tag] of Object.entries(titleKeywords)) {
                if (titleLower.includes(keyword) && !tags.includes(tag)) {
                    tags.push(tag);
                    break;
                }
            }
        }
    } catch (e) {}
    
    return tags.slice(0, 2).map(tag => truncateText(tag, 8));
}

// 获取或创建标签ID
async function getOrCreateTagIds(tagNames, navServerUrl, token) {
    if (!tagNames || tagNames.length === 0) return [];
    
    const tagIds = [];
    
    // 获取已有标签
    let existingTags = [];
    try {
        const response = await fetch(`${navServerUrl}/api/tags`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            existingTags = await response.json();
        }
    } catch (e) {}
    
    for (const tagName of tagNames) {
        const existing = existingTags.find(t => t.name === tagName);
        if (existing) {
            tagIds.push(existing.id);
        } else {
            try {
                const response = await fetch(`${navServerUrl}/api/tags`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name: tagName })
                });
                
                if (response.ok) {
                    const newTag = await response.json();
                    tagIds.push(newTag.id);
                    existingTags.push({ id: newTag.id, name: tagName });
                }
            } catch (e) {}
        }
    }
    
    return tagIds;
}

// 构建卡片数据（包含自动生成的标签和描述）
async function buildCardData(url, title, navServerUrl, token) {
    let logo = '';
    let domain = '';
    try {
        const urlObj = new URL(url);
        logo = `https://api.xinac.net/icon/?url=${urlObj.origin}&sz=128`;
        domain = urlObj.hostname.replace(/^www\./, '');
    } catch (e) {}
    
    const cardTitle = truncateText(title || domain || '无标题', 20);
    const description = generateDescription(title, domain);
    const tagNames = generateTagNames(url, title);
    const tagIds = await getOrCreateTagIds(tagNames, navServerUrl, token);
    
    return {
        title: cardTitle,
        url,
        logo,
        description,
        tagIds
    };
}

// 监听来自内容脚本和其他页面的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'quickAddToNav') {
        quickAddToNav(request.url, request.title)
            .then(() => sendResponse({ success: true }))
            .catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
    
    if (request.action === 'addToCategory') {
        addToSpecificCategory(`nav_menu_${request.menuId}`, request.url, request.title)
            .then(() => sendResponse({ success: true }))
            .catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
    
    if (request.action === 'getMenus') {
        (async () => {
            try {
                const config = await chrome.storage.sync.get(['navUrl']);
                if (!config.navUrl) {
                    sendResponse({ success: false, error: '未配置导航站' });
                    return;
                }
                
                const navServerUrl = config.navUrl.replace(/\/$/, '');
                
                // 如果缓存有效且不是强制刷新，使用缓存
                if (!request.forceRefresh && cachedMenus.length > 0 && Date.now() - lastMenuFetchTime < MENU_CACHE_MS) {
                    sendResponse({ success: true, menus: cachedMenus });
                    return;
                }
                
                const response = await fetch(`${navServerUrl}/api/menus`);
                if (!response.ok) throw new Error('获取失败');
                
                const menus = await response.json();
                cachedMenus = menus;
                lastMenuFetchTime = Date.now();
                sendResponse({ success: true, menus });
            } catch (e) {
                // 如果请求失败但有缓存，返回缓存
                if (cachedMenus.length > 0) {
                    sendResponse({ success: true, menus: cachedMenus, fromCache: true });
                } else {
                    sendResponse({ success: false, error: e.message });
                }
            }
        })();
        return true;
    }
    
    if (request.action === 'refreshMenus') {
        // 立即返回，后台异步刷新
        sendResponse({ success: true });
        refreshCategoryMenus().catch(e => console.error('刷新菜单失败:', e));
        return false;
    }
    
    if (request.action === 'getConfig') {
        (async () => {
            const config = await chrome.storage.sync.get(['navUrl', 'lastMenuId', 'lastSubMenuId']);
            const token = (await chrome.storage.local.get(['navAuthToken'])).navAuthToken;
            sendResponse({ ...config, hasToken: !!token });
        })();
        return true;
    }
});
