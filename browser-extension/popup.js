// popup.js - 扩展弹窗脚本

// 每次打开弹窗时刷新右键菜单分类（确保与后台管理同步）
chrome.runtime.sendMessage({ action: 'refreshMenus' }).catch(() => {});

// 加载当前设置
chrome.storage.sync.get(['navUrl', 'newtabMode', 'floatBtnEnabled'], function(result) {
    const urlElement = document.getElementById('currentUrl');
    const openNavBtn = document.getElementById('openNav');
    const modeSelect = document.getElementById('newtabMode');
    const navUrlInfo = document.getElementById('navUrlInfo');
    const navButtons = document.getElementById('navButtons');

    // 浮动按钮开关
    const floatBtnCheckbox = document.getElementById('floatBtnEnabled');
    if (floatBtnCheckbox) {
        floatBtnCheckbox.checked = result.floatBtnEnabled !== false;
        floatBtnCheckbox.addEventListener('change', function() {
            chrome.storage.sync.set({ floatBtnEnabled: this.checked });
        });
    }

    // 设置模式
    const mode = result.newtabMode || 'nav';
    modeSelect.value = mode;

    // 根据模式显示/隐藏导航站相关元素
    if (mode === 'quickaccess') {
        navUrlInfo.style.display = 'none';
        navButtons.style.display = 'none';
    } else {
        navUrlInfo.style.display = 'block';
        navButtons.style.display = 'flex';
    }

    if (result.navUrl) {
        // 隐藏完整网址，只显示已配置状态
        urlElement.textContent = '✅ 已配置';
        urlElement.classList.remove('empty');
        urlElement.style.color = '#10b981';
        openNavBtn.disabled = false;
    } else {
        urlElement.textContent = '❌ 未设置';
        urlElement.classList.add('empty');
        openNavBtn.disabled = true;
    }
});

// 模式切换
document.getElementById('newtabMode').addEventListener('change', function(e) {
    const mode = e.target.value;
    const navUrlInfo = document.getElementById('navUrlInfo');
    const navButtons = document.getElementById('navButtons');

    chrome.storage.sync.set({ newtabMode: mode }, function() {
        if (mode === 'quickaccess') {
            navUrlInfo.style.display = 'none';
            navButtons.style.display = 'none';
        } else {
            navUrlInfo.style.display = 'block';
            navButtons.style.display = 'flex';
        }
        alert('模式已切换，请刷新或重新打开新标签页查看效果');
    });
});

// 打开设置页面
document.getElementById('openSettings').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
});

// 访问管理后台
document.getElementById('openNav').addEventListener('click', function() {
    chrome.storage.sync.get(['navUrl'], function(result) {
        if (result.navUrl) {
            // 管理后台地址为 domain/admin
            let adminUrl = result.navUrl.replace(/\/+$/, '') + '/admin';
            chrome.tabs.create({ url: adminUrl });
            window.close();
        }
    });
});

// 打开书签管理器
document.getElementById('openBookmarks').addEventListener('click', function() {
    chrome.tabs.create({ url: chrome.runtime.getURL('bookmarks.html') });
    window.close();
});

// 检查云备份配置状态，显示提示
// 只有服务器地址已配置且Token有效（已授权）时才不显示提示
async function checkCloudBackupStatus() {
    const tip = document.getElementById('cloudBackupTip');
    if (!tip) return;
    
    try {
        const result = await chrome.storage.local.get(['cloudBackupServer', 'cloudBackupToken', 'cloudBackupPopupDismissed']);
        
        // 检查用户是否在7天内关闭过提示
        if (result.cloudBackupPopupDismissed) {
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - result.cloudBackupPopupDismissed < sevenDays) {
                tip.style.display = 'none';
                return;
            }
        }
        
        // 如果没有配置服务器地址，显示提示
        if (!result.cloudBackupServer) {
            tip.style.display = 'block';
            return;
        }
        
        // 如果没有Token，显示提示
        if (!result.cloudBackupToken) {
            tip.style.display = 'block';
            return;
        }
        
        // 验证Token是否有效
        const serverUrl = result.cloudBackupServer.replace(/\/+$/, '');
        const timestamp = Date.now();
        const response = await fetch(`${serverUrl}/api/extension/verify?_t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.cloudBackupToken}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            },
            cache: 'no-store'
        });
        
        const data = await response.json();
        
        // 如果Token无效，显示提示
        if (!data.success || !data.valid) {
            tip.style.display = 'block';
            return;
        }
        
        // 服务器已配置且Token有效，不显示提示
        tip.style.display = 'none';
    } catch (e) {
        console.error('[云备份检查] 验证失败:', e);
        // 验证失败时显示提示
        tip.style.display = 'block';
    }
}

// 执行云备份状态检查
checkCloudBackupStatus();

// 云备份提示 - 立即配置按钮
document.getElementById('btnSetupCloudBackup').addEventListener('click', function() {
    // 打开书签管理器并自动打开云备份设置
    chrome.tabs.create({ url: chrome.runtime.getURL('bookmarks.html?openCloudBackup=true') });
    window.close();
});

// 云备份提示 - 稍后按钮
document.getElementById('btnDismissCloudTip').addEventListener('click', function() {
    document.getElementById('cloudBackupTip').style.display = 'none';
    // 记住用户选择，7天内不再提示
    chrome.storage.local.set({ cloudBackupPopupDismissed: Date.now() });
});

// 提示框折叠/展开功能
document.getElementById('tipToggle').addEventListener('click', function() {
    const tipBox = document.getElementById('tipBox');
    const tipArrow = document.getElementById('tipArrow');
    if (tipBox.classList.contains('show')) {
        tipBox.classList.remove('show');
        tipArrow.textContent = '▶';
    } else {
        tipBox.classList.add('show');
        tipArrow.textContent = '▼';
    }
});
