// 快速访问面板
let allBookmarks = [];
let pinnedBookmarks = new Set();
let bookmarkTags = new Map(); // 书签标签
let allTags = new Set(); // 所有标签
let currentTab = 'frequent';
let currentTagFilter = null; // 当前标签筛选

// 分隔符书签URL（这些不是真实书签，不显示）
const SEPARATOR_URLS = [
    'https://separator.mayastudios.com/',
    'http://separator.mayastudios.com/'
];

// 检查是否为分隔符书签
function isSeparatorBookmark(url) {
    if (!url) return false;
    return SEPARATOR_URLS.some(sep => url.startsWith(sep));
}

// 标准化URL用于去重
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '') + urlObj.pathname.replace(/\/$/, '') + urlObj.search;
    } catch {
        return url.toLowerCase();
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadPinnedBookmarks();
    await loadTags();
    await loadBookmarks();
    bindEvents();
    renderTagCloud();
}

// 加载固定的书签
async function loadPinnedBookmarks() {
    try {
        const result = await chrome.storage.local.get(['pinnedBookmarks']);
        if (result.pinnedBookmarks) {
            pinnedBookmarks = new Set(result.pinnedBookmarks);
        }
    } catch (e) {
        console.error('加载固定书签失败:', e);
    }
}

// 加载标签数据
async function loadTags() {
    try {
        const result = await chrome.storage.local.get(['bookmarkTags']);
        if (result.bookmarkTags) {
            bookmarkTags = new Map(Object.entries(result.bookmarkTags));
            allTags.clear();
            for (const tags of bookmarkTags.values()) {
                tags.forEach(tag => allTags.add(tag));
            }
        }
    } catch (e) {
        console.error('加载标签失败:', e);
    }
}

// URL到标签的映射
let urlToTagsMap = new Map();

// 构建URL到标签的映射
function buildUrlToTagsMap() {
    urlToTagsMap.clear();
    
    console.log('开始构建URL到标签映射');
    console.log('bookmarkTags数量:', bookmarkTags.size);
    console.log('originalBookmarksMap数量:', originalBookmarksMap.size);
    
    // 遍历所有书签标签
    for (const [bookmarkId, tags] of bookmarkTags.entries()) {
        // 查找这个ID对应的书签
        const bookmark = originalBookmarksMap.get(bookmarkId);
        if (bookmark && bookmark.url) {
            const normalizedUrl = normalizeUrl(bookmark.url);
            // 合并标签（同一URL可能有多个书签）
            if (urlToTagsMap.has(normalizedUrl)) {
                const existingTags = urlToTagsMap.get(normalizedUrl);
                tags.forEach(tag => {
                    if (!existingTags.includes(tag)) {
                        existingTags.push(tag);
                    }
                });
            } else {
                urlToTagsMap.set(normalizedUrl, [...tags]);
            }
        }
    }
    
    console.log('URL到标签映射完成，数量:', urlToTagsMap.size);
    console.log('映射内容:', Array.from(urlToTagsMap.entries()).slice(0, 5));
}

// 获取书签的标签（通过URL匹配）
function getBookmarkTagsForDisplay(bookmark) {
    // 先尝试直接通过ID获取
    if (bookmarkTags.has(bookmark.id)) {
        return bookmarkTags.get(bookmark.id);
    }
    
    // 通过URL匹配
    const normalizedUrl = normalizeUrl(bookmark.url);
    if (urlToTagsMap.has(normalizedUrl)) {
        return urlToTagsMap.get(normalizedUrl);
    }
    
    return [];
}

// 通过ID查找书签（在原始书签树中查找）
let originalBookmarksMap = new Map();

function buildBookmarksMap(nodes) {
    for (const node of nodes) {
        if (node.children) {
            buildBookmarksMap(node.children);
        } else if (node.url) {
            originalBookmarksMap.set(node.id, node);
        }
    }
}

// 渲染标签云（显示所有标签）
function renderTagCloud() {
    const container = document.getElementById('tagCloud');
    if (!container) return;
    
    if (allTags.size === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    container.innerHTML = '';
    
    // 统计每个标签的使用次数
    const tagCounts = {};
    for (const tags of bookmarkTags.values()) {
        for (const tag of tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
    }
    
    // 按使用次数排序
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    
    // 添加"全部"按钮
    const allBtn = document.createElement('button');
    allBtn.className = 'tag-btn' + (currentTagFilter === null ? ' active' : '');
    allBtn.textContent = '全部';
    allBtn.addEventListener('click', () => {
        currentTagFilter = null;
        renderBookmarks();
    });
    container.appendChild(allBtn);
    
    // 添加标签按钮
    for (const [tag, count] of sortedTags.slice(0, 15)) { // 最多显示15个标签
        const tagBtn = document.createElement('button');
        tagBtn.className = 'tag-btn' + (currentTagFilter === tag ? ' active' : '');
        tagBtn.textContent = `${tag} (${count})`;
        tagBtn.addEventListener('click', () => {
            currentTagFilter = tag;
            renderBookmarks();
        });
        container.appendChild(tagBtn);
    }
}

// 根据当前书签动态渲染标签云
function renderTagCloudForBookmarks(bookmarks) {
    const container = document.getElementById('tagCloud');
    if (!container) return;
    
    // 统计当前书签中的标签
    const tagCounts = {};
    for (const bookmark of bookmarks) {
        const tags = getBookmarkTagsForDisplay(bookmark);
        for (const tag of tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
    }
    
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    
    if (sortedTags.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    container.innerHTML = '';
    
    // 添加"全部"按钮
    const allBtn = document.createElement('button');
    allBtn.className = 'tag-btn' + (currentTagFilter === null ? ' active' : '');
    allBtn.textContent = '全部';
    allBtn.addEventListener('click', () => {
        currentTagFilter = null;
        renderBookmarks();
    });
    container.appendChild(allBtn);
    
    // 添加标签按钮（显示当前书签中的标签）
    for (const [tag, count] of sortedTags.slice(0, 15)) {
        const tagBtn = document.createElement('button');
        tagBtn.className = 'tag-btn' + (currentTagFilter === tag ? ' active' : '');
        tagBtn.textContent = `${tag} (${count})`;
        tagBtn.addEventListener('click', () => {
            currentTagFilter = tag;
            renderBookmarks();
        });
        container.appendChild(tagBtn);
    }
}

// 保存固定的书签
async function savePinnedBookmarks() {
    try {
        await chrome.storage.local.set({ pinnedBookmarks: Array.from(pinnedBookmarks) });
    } catch (e) {
        console.error('保存固定书签失败:', e);
    }
}

// 加载书签
async function loadBookmarks() {
    try {
        const tree = await chrome.bookmarks.getTree();
        const rawBookmarks = [];
        collectAllBookmarks(tree, rawBookmarks);
        
        // 构建书签ID映射（用于标签查找）
        originalBookmarksMap.clear();
        buildBookmarksMap(tree);
        
        // 构建URL到标签的映射
        buildUrlToTagsMap();
        
        // 过滤分隔符并去重
        const seenUrls = new Set();
        allBookmarks = [];
        
        for (const bookmark of rawBookmarks) {
            // 跳过分隔符
            if (isSeparatorBookmark(bookmark.url)) continue;
            
            // 去重
            const normalizedUrl = normalizeUrl(bookmark.url);
            if (seenUrls.has(normalizedUrl)) continue;
            
            seenUrls.add(normalizedUrl);
            allBookmarks.push(bookmark);
        }
        
        renderBookmarks();
    } catch (error) {
        console.error('加载书签失败:', error);
    }
}

function collectAllBookmarks(nodes, bookmarks) {
    for (const node of nodes) {
        if (node.children) {
            collectAllBookmarks(node.children, bookmarks);
        } else if (node.url) {
            bookmarks.push(node);
        }
    }
}

// 绑定事件
function bindEvents() {
    // 搜索
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // 标签切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            // 切换标签页时清除标签筛选
            currentTagFilter = null;
            renderBookmarks();
        });
    });
    
    // 设置按钮
    document.getElementById('settingsBtn').addEventListener('click', () => {
        chrome.tabs.create({ url: 'bookmarks.html' });
    });
}

// 搜索
function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    
    if (!query) {
        renderBookmarks();
        return;
    }
    
    const results = allBookmarks.filter(b => {
        const title = (b.title || '').toLowerCase();
        const url = (b.url || '').toLowerCase();
        return title.includes(query) || url.includes(query);
    });
    
    renderBookmarkCards(results);
}

// 渲染书签
async function renderBookmarks() {
    const container = document.getElementById('bookmarksGrid');
    container.innerHTML = '<div class="loading">加载中...</div>';
    
    let bookmarks = [];
    
    // 第一步：根据标签页筛选书签
    switch (currentTab) {
        case 'frequent':
            bookmarks = await getFrequentBookmarks();
            break;
        case 'recent':
            bookmarks = await getRecentBookmarks();
            break;
        case 'pinned':
            bookmarks = allBookmarks.filter(b => pinnedBookmarks.has(b.id));
            break;
        case 'all':
            // 显示所有书签，按标题排序
            bookmarks = [...allBookmarks].sort((a, b) => 
                (a.title || '').localeCompare(b.title || '')
            );
            break;
    }
    
    console.log('标签页筛选后书签数量:', bookmarks.length);
    
    // 第二步：根据当前标签页的书签，更新标签云
    renderTagCloudForBookmarks(bookmarks);
    
    // 第三步：如果有标签筛选，在当前书签中应用
    if (currentTagFilter) {
        console.log('应用标签筛选:', currentTagFilter);
        
        bookmarks = bookmarks.filter(b => {
            const tags = getBookmarkTagsForDisplay(b);
            return tags.includes(currentTagFilter);
        });
        
        console.log('标签筛选后书签数量:', bookmarks.length);
    }
    
    // 更新标签显示数量
    updateTabCounts();
    
    renderBookmarkCards(bookmarks);
}

// 更新标签数量显示
function updateTabCounts() {
    const frequentCount = allBookmarks.filter(b => {
        // 简单估算，实际需要异步获取
        return true;
    }).length;
    
    const pinnedCount = allBookmarks.filter(b => pinnedBookmarks.has(b.id)).length;
    const allCount = allBookmarks.length;
    
    // 更新全部标签显示数量
    const allTab = document.querySelector('[data-tab="all"]');
    if (allTab) {
        allTab.textContent = `📚 全部 (${allCount})`;
    }
    
    const pinnedTab = document.querySelector('[data-tab="pinned"]');
    if (pinnedTab) {
        pinnedTab.textContent = `📌 固定 (${pinnedCount})`;
    }
}

// 获取常用书签
async function getFrequentBookmarks() {
    const withUsage = await Promise.all(allBookmarks.map(async (b) => {
        const usage = await getBookmarkUsage(b.url);
        return { bookmark: b, usage };
    }));
    
    return withUsage
        .filter(item => item.usage > 0)
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 24)
        .map(item => item.bookmark);
}

// 获取最近使用的书签
async function getRecentBookmarks() {
    const withLastVisit = await Promise.all(allBookmarks.map(async (b) => {
        try {
            const visits = await chrome.history.getVisits({ url: b.url });
            const lastVisit = visits.length > 0 ? Math.max(...visits.map(v => v.visitTime)) : 0;
            return { bookmark: b, lastVisit };
        } catch {
            return { bookmark: b, lastVisit: 0 };
        }
    }));
    
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return withLastVisit
        .filter(item => item.lastVisit > sevenDaysAgo)
        .sort((a, b) => b.lastVisit - a.lastVisit)
        .slice(0, 24)
        .map(item => item.bookmark);
}

// 获取书签使用频率
async function getBookmarkUsage(url) {
    try {
        const visits = await chrome.history.getVisits({ url });
        return visits.length;
    } catch {
        return 0;
    }
}

// 渲染书签卡片
async function renderBookmarkCards(bookmarks) {
    const container = document.getElementById('bookmarksGrid');
    
    if (bookmarks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>暂无书签</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    for (const bookmark of bookmarks) {
        const usage = await getBookmarkUsage(bookmark.url);
        const card = createBookmarkCard(bookmark, usage);
        container.appendChild(card);
    }
}

function createBookmarkCard(bookmark, usage) {
    const card = document.createElement('a');
    card.className = 'bookmark-card';
    card.href = bookmark.url;
    card.target = '_blank';
    
    const favicon = getFaviconUrl(bookmark.url);
    const isPinned = pinnedBookmarks.has(bookmark.id);
    
    card.innerHTML = `
        <button class="pin-btn ${isPinned ? 'pinned' : ''}" data-id="${bookmark.id}">
            ${isPinned ? '📌' : '📍'}
        </button>
        ${usage > 0 ? `<span class="bookmark-visits">${usage}</span>` : ''}
        <img class="bookmark-favicon" src="${favicon}" loading="lazy">
        <div class="bookmark-title">${escapeHtml(bookmark.title || '无标题')}</div>
        <div class="bookmark-url">${escapeHtml(getDomain(bookmark.url))}</div>
    `;
    
    // Favicon错误处理（多CDN降级）
    const faviconImg = card.querySelector('.bookmark-favicon');
    faviconImg.addEventListener('error', () => {
        handleFaviconError(faviconImg, bookmark.url);
    });
    
    // 固定按钮
    const pinBtn = card.querySelector('.pin-btn');
    pinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(bookmark.id);
    });
    
    return card;
}

// 切换固定状态
async function togglePin(bookmarkId) {
    if (pinnedBookmarks.has(bookmarkId)) {
        pinnedBookmarks.delete(bookmarkId);
    } else {
        pinnedBookmarks.add(bookmarkId);
    }
    
    await savePinnedBookmarks();
    await renderBookmarks();
}

// 工具函数
function getFaviconUrl(url) {
    try {
        const urlObj = new URL(url);
        // 直接从网站获取 favicon（最快最可靠）
        return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch {
        return 'icons/icon48.png';
    }
}

// 处理favicon加载错误，自动切换到CDN
function handleFaviconError(imgElement, url) {
    try {
        const currentSrc = imgElement.src;
        const domain = new URL(url).hostname;
        
        // 如果是直接获取失败，尝试CDN
        if (currentSrc.includes('/favicon.ico')) {
            imgElement.src = `https://api.xinac.net/icon/?url=${domain}&sz=128`;
        } else if (currentSrc.includes('api.xinac.net')) {
            imgElement.src = `https://icon.horse/icon/${domain}`;
        } else {
            imgElement.src = 'icons/icon48.png';
        }
    } catch {
        imgElement.src = 'icons/icon48.png';
    }
}

function getDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
