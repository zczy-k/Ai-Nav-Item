<template>
  <div class="backup-manage">
    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'local' }]" @click="activeTab = 'local'">
        📦 本地备份
      </button>
      <button :class="['tab', { active: activeTab === 'webdav' }]" @click="activeTab = 'webdav'">
        ☁️ WebDAV备份
      </button>
      <button :class="['tab', { active: activeTab === 'auto' }]" @click="activeTab = 'auto'">
        ⚙️ 自动备份配置
      </button>
    </div>

    <!-- Local Backup Tab -->
    <div v-show="activeTab === 'local'" class="tab-content">
      <div class="toolbar">
      <button class="btn btn-primary" @click="showCreateBackupDialog" :disabled="loading.create">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
        </svg>
        {{ loading.create ? '备份中...' : '创建备份' }}
      </button>
      <button class="btn btn-success" @click="triggerFileUpload" :disabled="loading.upload">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 15V3"/>
        </svg>
        {{ loading.upload ? '上传中...' : '上传备份' }}
      </button>
      <button class="btn btn-secondary" @click="loadBackupList" :disabled="loading.list">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 4v6h6M23 20v-6h-6"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
        {{ loading.list ? '刷新中...' : '刷新列表' }}
      </button>
      <input 
        ref="fileInput" 
        type="file" 
        accept=".zip" 
        @change="handleFileUpload" 
        style="display: none;"
      />
    </div>

    <div v-if="message.text" :class="['message', message.type]">
      {{ message.text }}
    </div>

    <div class="backup-list">
      <div v-if="backups.length === 0 && !loading.list" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <p>暂无备份文件</p>
      </div>

      <div v-else class="backup-grid">
        <div v-for="backup in backups" :key="backup.name" class="backup-card">
          <div class="backup-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2566d8" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="backup-info">
            <div class="backup-name">{{ backup.name }}</div>
            <div class="backup-meta">
              <span class="backup-size">{{ backup.size }}</span>
              <span class="backup-date">{{ formatDate(backup.created) }}</span>
            </div>
          </div>
          <div class="backup-actions">
             <button class="btn-icon btn-restore" @click="confirmAction('restore', backup.name)" title="恢复备份">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
            <button class="btn-icon btn-rename" @click="showRenameDialog(backup.name)" title="重命名">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon" @click="downloadBackup(backup.name)" title="下载备份">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </button>
            <button class="btn-icon btn-danger" @click="confirmAction('delete', backup.name)" title="删除备份">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- WebDAV Backup Tab -->
    <div v-show="activeTab === 'webdav'" class="tab-content">
      <div class="toolbar">
        <button class="btn btn-primary" @click="showWebdavConfig = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
          </svg>
          WebDAV配置
        </button>
        <button class="btn btn-primary" @click="backupToWebdav" :disabled="loading.webdavBackup || !webdavConfig.configured">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          {{ loading.webdavBackup ? '备份中...' : '备份到WebDAV' }}
        </button>
        <button class="btn btn-secondary" @click="loadWebdavBackupList" :disabled="loading.webdavList || !webdavConfig.configured">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          {{ loading.webdavList ? '刷新中...' : '刷新列表' }}
        </button>
      </div>

      <div v-if="message.text" :class="['message', message.type]">
        {{ message.text }}
      </div>

      <div v-if="!webdavConfig.configured" class="info-box">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2566d8" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <p>请先配置WebDAV连接信息（支持：坚果云、Nextcloud、阿里云盘WebDAV、Dropbox等）</p>
      </div>

      <div class="backup-list">
        <div v-if="webdavBackups.length === 0 && !loading.webdavList" class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <p>暂无WebDAV备份</p>
        </div>

        <div v-else class="backup-grid">
          <div v-for="backup in webdavBackups" :key="backup.name" class="backup-card">
            <div class="backup-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M12 18v-6M9 15l3 3 3-3"/>
              </svg>
            </div>
            <div class="backup-info">
              <div class="backup-name">{{ backup.name }}</div>
              <div class="backup-meta">
                <span class="backup-size">{{ backup.size }}</span>
                <span class="backup-date">{{ formatDate(backup.created) }}</span>
              </div>
            </div>
            <div class="backup-actions">
              <button class="btn-icon btn-restore" @click="confirmAction('webdav-restore', backup.name)" title="从WebDAV恢复">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
              </button>
              <button class="btn-icon btn-danger" @click="confirmAction('webdav-delete', backup.name)" title="删除WebDAV备份">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Auto Backup Configuration Tab -->
    <div v-show="activeTab === 'auto'" class="tab-content">
      <div v-if="message.text" :class="['message', message.type]">
        {{ message.text }}
      </div>

      <div class="config-section">
        <h3>⚡ 自动备份配置</h3>
        <p class="config-description">配置系统自动备份策略，包括增量备份和定时备份。</p>

        <!-- Debounce Backup Settings -->
        <div class="config-card">
          <div class="config-header">
            <h4>增量备份（防抖）</h4>
            <label class="switch">
              <input type="checkbox" v-model="autoBackupConfig.debounce.enabled" />
              <span class="slider"></span>
            </label>
          </div>
          <p class="config-info">当数据变更时，延迟一段时间后自动备份。适合频繁修改的场景。</p>
          
          <div v-if="autoBackupConfig.debounce.enabled" class="config-fields">
            <div class="field-row">
              <label>延迟时间（分钟）</label>
              <input type="number" v-model.number="autoBackupConfig.debounce.delay" 
                     min="5" max="1440" class="form-input" />
              <small>范围：5-1440分钟</small>
            </div>
            <div class="field-row">
              <label>每天最多备份次数</label>
              <input type="number" v-model.number="autoBackupConfig.debounce.maxPerDay" 
                     min="1" max="10" class="form-input" />
              <small>范围：1-10次</small>
            </div>
            <div class="field-row">
              <label>保留备份数量</label>
              <input type="number" v-model.number="autoBackupConfig.debounce.keep" 
                     min="1" max="30" class="form-input" />
              <small>范围：1-30个</small>
            </div>
          </div>
        </div>

        <!-- Scheduled Backup Settings -->
        <div class="config-card">
          <div class="config-header">
            <h4>定时备份（每日）</h4>
            <label class="switch">
              <input type="checkbox" v-model="autoBackupConfig.scheduled.enabled" />
              <span class="slider"></span>
            </label>
          </div>
          <p class="config-info">每天在固定时间自动执行备份。</p>
          
          <div v-if="autoBackupConfig.scheduled.enabled" class="config-fields">
            <div class="field-row">
              <label>备份时间</label>
              <div class="time-input">
                <input type="number" v-model.number="autoBackupConfig.scheduled.hour" 
                       min="0" max="23" class="form-input time-field" placeholder="时" />
                <span>:</span>
                <input type="number" v-model.number="autoBackupConfig.scheduled.minute" 
                       min="0" max="59" class="form-input time-field" placeholder="分" />
              </div>
              <small>格式：24小时制，如 02:00</small>
            </div>
            <div class="field-row">
              <label>保留天数</label>
              <input type="number" v-model.number="autoBackupConfig.scheduled.keep" 
                     min="1" max="30" class="form-input" />
              <small>范围：1-30天</small>
            </div>
          </div>
        </div>

        <!-- WebDAV Auto Sync Settings -->
        <div class="config-card">
          <div class="config-header">
            <h4>☁️ WebDAV 自动同步</h4>
            <label class="switch">
              <input type="checkbox" v-model="autoBackupConfig.webdav.enabled" />
              <span class="slider"></span>
            </label>
          </div>
          <p class="config-info">自动将本地备份同步到 WebDAV 云端。需要先配置 WebDAV 连接。</p>
          
          <div v-if="autoBackupConfig.webdav.enabled" class="config-fields">
            <div class="field-row checkbox-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="autoBackupConfig.webdav.syncDaily" />
                <span>同步每日定时备份</span>
              </label>
              <small>每天定时备份后自动上传到 WebDAV</small>
            </div>
            <div class="field-row checkbox-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="autoBackupConfig.webdav.syncIncremental" />
                <span>同步增量备份</span>
              </label>
              <small>增量备份后自动上传（可能频繁，不推荐）</small>
            </div>
          </div>
        </div>

        <!-- Auto Clean Setting -->
        <div class="config-card">
          <div class="config-header">
            <h4>自动清理</h4>
            <label class="switch">
              <input type="checkbox" v-model="autoBackupConfig.autoClean" />
              <span class="slider"></span>
            </label>
          </div>
          <p class="config-info">自动删除超出保留数量/天数的旧备份文件。</p>
        </div>

        <!-- Backup Statistics -->
        <div class="stats-card" v-if="autoBackupStats">
          <h4>📊 备份统计</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">增量备份（今日）</span>
              <span class="stat-value">{{ autoBackupStats.debounceToday || 0 }} 次</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最后增量备份</span>
              <span class="stat-value">{{ formatDate(autoBackupStats.lastDebounce) || '无' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最后定时备份</span>
              <span class="stat-value">{{ formatDate(autoBackupStats.lastScheduled) || '无' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">下次定时备份</span>
              <span class="stat-value">{{ formatNextScheduled() }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="config-actions">
          <button class="btn btn-secondary" @click="loadAutoBackupConfig">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            重置
          </button>
          <button class="btn btn-primary" @click="saveAutoBackupConfig" :disabled="loading.autoBackupConfig">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {{ loading.autoBackupConfig ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>

    <!-- WebDAV配置对话框 -->
    <div v-if="showWebdavConfig" class="modal-overlay">
      <div class="modal-content config-modal">
        <h3>WebDAV配置</h3>
        <div class="form-group">
          <label>WebDAV URL <span class="required">*</span></label>
          <input type="text" v-model="webdavConfigForm.url" placeholder="https://dav.jianguoyun.com/dav/" class="form-input" />
          <small>例：坚果云 https://dav.jianguoyun.com/dav/</small>
        </div>
        <div class="form-group">
          <label>用户名 <span class="required">*</span></label>
          <input type="text" v-model="webdavConfigForm.username" placeholder="邮箱或用户名" class="form-input" />
        </div>
        <div class="form-group">
          <label>密码 <span class="required">*</span></label>
          <input type="password" v-model="webdavConfigForm.password" placeholder="应用密码或访问令牌" class="form-input" />
          <small>注意：某些服务需要使用应用专用密码，而不是登录密码</small>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showWebdavConfig = false">取消</button>
          <button class="btn btn-primary" @click="saveWebdavConfig" :disabled="loading.webdavConfig">
            {{ loading.webdavConfig ? '测试连接中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <div v-if="dialog.show" class="modal-overlay">
      <div class="modal-content">
        <h3>确认{{ dialog.title }}</h3>
        <p>{{ dialog.message }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="dialog.show = false">取消</button>
          <button :class="['btn', dialog.confirmClass]" @click="executeAction">确认</button>
        </div>
      </div>
    </div>

    <!-- 创建备份对话框 -->
    <div v-if="showCreateDialog" class="modal-overlay">
      <div class="modal-content config-modal">
        <h3>创建备份</h3>
        <div class="form-group">
          <label>备份名称（可选）</label>
          <input type="text" v-model="createBackupForm.name" placeholder="例如：添加书签后的备份" class="form-input" maxlength="50" />
          <small>留空则使用默认名称（backup-时间戳）</small>
        </div>
        <div class="form-group">
          <label>备份描述（可选）</label>
          <textarea v-model="createBackupForm.description" placeholder="描述这次备份的内容或目的..." class="form-input" rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showCreateDialog = false">取消</button>
          <button class="btn btn-primary" @click="createBackup" :disabled="loading.create">
            {{ loading.create ? '备份中...' : '创建备份' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <div v-if="showRenameModal" class="modal-overlay">
      <div class="modal-content config-modal">
        <h3>重命名备份</h3>
        <div class="form-group">
          <label>新名称 <span class="required">*</span></label>
          <input type="text" v-model="renameForm.newName" placeholder="输入新的备份名称" class="form-input" maxlength="50" />
          <small>原名称：{{ renameForm.oldName }}</small>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showRenameModal = false">取消</button>
          <button class="btn btn-primary" @click="renameBackup" :disabled="loading.rename || !renameForm.newName.trim()">
            {{ loading.rename ? '重命名中...' : '确认重命名' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';

const activeTab = ref('local');
const backups = ref([]);
const webdavBackups = ref([]);
const showWebdavConfig = ref(false);
const showCreateDialog = ref(false);
const showRenameModal = ref(false);
const fileInput = ref(null);

const loading = reactive({
  create: false,
  list: false,
  delete: false,
  restore: false,
  upload: false,
  rename: false,
  webdavConfig: false,
  webdavBackup: false,
  webdavList: false,
  webdavRestore: false,
  webdavDelete: false,
  autoBackupConfig: false
});

const createBackupForm = reactive({
  name: '',
  description: ''
});

const renameForm = reactive({
  oldName: '',
  newName: ''
});

const message = ref({ text: '', type: '' });

const dialog = reactive({
  show: false,
  filename: '',
  action: null,
  title: '',
  message: '',
  confirmClass: ''
});

const webdavConfig = reactive({
  configured: false,
  url: '',
  username: ''
});

const webdavConfigForm = reactive({
  url: '',
  username: '',
  password: ''
});

const autoBackupConfig = reactive({
  debounce: {
    enabled: true,
    delay: 30,
    maxPerDay: 3,
    keep: 5
  },
  scheduled: {
    enabled: true,
    hour: 2,
    minute: 0,
    keep: 7
  },
  webdav: {
    enabled: false,
    syncDaily: true,
    syncIncremental: false
  },
  autoClean: true
});

const autoBackupStats = ref(null);

const token = localStorage.getItem('token');

// 统一API请求
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return response.json();
}

const showMessage = (text, type = 'success') => {
  message.value = { text, type };
  setTimeout(() => {
    message.value = { text: '', type: '' };
  }, 3000);
};

const showCreateBackupDialog = () => {
  createBackupForm.name = '';
  createBackupForm.description = '';
  showCreateDialog.value = true;
};

const createBackup = async () => {
  loading.create = true;
  const data = await apiRequest('/api/backup/create', { 
    method: 'POST',
    body: JSON.stringify({
      name: createBackupForm.name || null,
      description: createBackupForm.description || null
    })
  });
  if (data.success) {
    showMessage('备份创建成功！');
    showCreateDialog.value = false;
    await loadBackupList();
  } else {
    showMessage(data.message || '备份创建失败', 'error');
  }
  loading.create = false;
};

const showRenameDialog = (filename) => {
  renameForm.oldName = filename;
  renameForm.newName = filename.replace('.zip', '');
  showRenameModal.value = true;
};

const renameBackup = async () => {
  if (!renameForm.newName.trim()) {
    showMessage('请输入新名称', 'error');
    return;
  }
  loading.rename = true;
  const data = await apiRequest(`/api/backup/rename/${renameForm.oldName}`, {
    method: 'PUT',
    body: JSON.stringify({ newName: renameForm.newName })
  });
  if (data.success) {
    showMessage('重命名成功！');
    showRenameModal.value = false;
    await loadBackupList();
  } else {
    showMessage(data.message || '重命名失败', 'error');
  }
  loading.rename = false;
};

const loadBackupList = async () => {
  loading.list = true;
  const data = await apiRequest('/api/backup/list');
  if (data.success) {
    backups.value = data.backups;
  } else {
    showMessage('获取备份列表失败', 'error');
  }
  loading.list = false;
};

const downloadBackup = (filename) => {
  window.open(`/api/backup/download/${filename}?token=${token}`, '_blank');
};

const confirmAction = (action, filename) => {
  dialog.show = true;
  dialog.filename = filename;
  dialog.action = action;
  
  if (action === 'delete') {
    dialog.title = '删除';
    dialog.message = `确定要删除备份文件 ${filename} 吗？`;
    dialog.confirmClass = 'btn-danger';
  } else if (action === 'restore') {
    dialog.title = '恢复';
    dialog.message = `确定要恢复备份文件 ${filename} 吗？`;
    dialog.confirmClass = 'btn-restore';
  } else if (action === 'webdav-restore') {
    dialog.title = '从WebDAV恢复';
    dialog.message = `确定要从WebDAV恢复备份 ${filename} 吗？这将覆盖当前数据。`;
    dialog.confirmClass = 'btn-restore';
  } else if (action === 'webdav-delete') {
    dialog.title = '删除WebDAV备份';
    dialog.message = `确定要删除WebDAV备份 ${filename} 吗？`;
    dialog.confirmClass = 'btn-danger';
  }
};

const executeAction = async () => {
  const { action, filename } = dialog;
  dialog.show = false;

  if (action === 'delete') {
    loading.delete = true;
    const data = await apiRequest(`/api/backup/delete/${filename}`, { method: 'DELETE' });
    if (data.success) {
      showMessage('删除成功！');
      await loadBackupList();
    } else {
      showMessage(data.message || '删除失败', 'error');
    }
    loading.delete = false;
  } else if (action === 'restore') {
    loading.restore = true;
    const data = await apiRequest(`/api/backup/restore/${filename}`, { method: 'POST' });
    if (data.success) {
      showMessage('恢复成功！');
      await loadBackupList();
    } else {
      showMessage(data.message || '恢复失败', 'error');
    }
    loading.restore = false;
  } else if (action === 'webdav-restore') {
    await restoreFromWebdav(filename);
  } else if (action === 'webdav-delete') {
    await deleteWebdavBackup(filename);
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '--';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', { hour12: false });
};

// 上传备份功能
const triggerFileUpload = () => {
  fileInput.value.click();
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // 验证文件类型
  if (!file.name.endsWith('.zip')) {
    showMessage('只支持.zip格式的备份文件', 'error');
    event.target.value = ''; // 清空输入
    return;
  }
  
  // 验证文件大小 (500MB)
  if (file.size > 500 * 1024 * 1024) {
    showMessage('备份文件过大，最大支持500MB', 'error');
    event.target.value = '';
    return;
  }
  
  loading.upload = true;
  
  try {
    const formData = new FormData();
    formData.append('backup', file);
    
    const response = await fetch('/api/backup/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      showMessage('备份文件上传成功！');
      await loadBackupList();
    } else {
      showMessage(data.message || '备份文件上传失败', 'error');
    }
  } catch (error) {
    console.error('上传失败:', error);
    showMessage('备份文件上传失败', 'error');
  } finally {
    loading.upload = false;
    event.target.value = ''; // 清空输入，允许上传同名文件
  }
};

// WebDAV functions
const loadWebdavConfig = async () => {
  const data = await apiRequest('/api/backup/webdav/config');
  if (data.success && data.config) {
    webdavConfig.configured = data.config.configured;
    webdavConfig.url = data.config.url || '';
    webdavConfig.username = data.config.username || '';
  }
};

const saveWebdavConfig = async () => {
  if (!webdavConfigForm.url || !webdavConfigForm.username || !webdavConfigForm.password) {
    showMessage('请填写完整的WebDAV配置信息', 'error');
    return;
  }
  loading.webdavConfig = true;
  const data = await apiRequest('/api/backup/webdav/config', {
    method: 'POST',
    body: JSON.stringify(webdavConfigForm)
  });
  if (data.success) {
    showMessage('WebDAV配置保存成功！');
    showWebdavConfig.value = false;
    webdavConfigForm.url = '';
    webdavConfigForm.username = '';
    webdavConfigForm.password = '';
    await loadWebdavConfig();
  } else {
    showMessage(data.message || 'WebDAV配置保存失败', 'error');
  }
  loading.webdavConfig = false;
};

const backupToWebdav = async () => {
  loading.webdavBackup = true;
  const data = await apiRequest('/api/backup/webdav/backup', { method: 'POST' });
  if (data.success) {
    showMessage('备份到WebDAV成功！');
    await loadWebdavBackupList();
  } else {
    showMessage(data.message || '备份到WebDAV失败', 'error');
  }
  loading.webdavBackup = false;
};

const loadWebdavBackupList = async () => {
  loading.webdavList = true;
  const data = await apiRequest('/api/backup/webdav/list');
  if (data.success) {
    webdavBackups.value = data.backups || [];
  } else {
    showMessage('获取WebDAV备份列表失败', 'error');
  }
  loading.webdavList = false;
};

const restoreFromWebdav = async (filename) => {
  loading.webdavRestore = true;
  const data = await apiRequest('/api/backup/webdav/restore', {
    method: 'POST',
    body: JSON.stringify({ filename })
  });
  if (data.success) {
    showMessage('从WebDAV恢复成功！');
  } else {
    showMessage(data.message || '从WebDAV恢复失败', 'error');
  }
  loading.webdavRestore = false;
};

const deleteWebdavBackup = async (filename) => {
  loading.webdavDelete = true;
  const data = await apiRequest(`/api/backup/webdav/delete/${filename}`, { method: 'DELETE' });
  if (data.success) {
    showMessage('删除成功！');
    await loadWebdavBackupList();
  } else {
    showMessage(data.message || '删除失败', 'error');
  }
  loading.webdavDelete = false;
};

// Auto-backup configuration functions
const loadAutoBackupConfig = async () => {
  const data = await apiRequest('/api/backup/auto/config');
  if (data.success && data.config) {
    Object.assign(autoBackupConfig, data.config);
    autoBackupStats.value = data.stats || null;
  } else {
    showMessage('加载自动备份配置失败', 'error');
  }
};

const saveAutoBackupConfig = async () => {
  loading.autoBackupConfig = true;
  const data = await apiRequest('/api/backup/auto/config', {
    method: 'POST',
    body: JSON.stringify(autoBackupConfig)
  });
  if (data.success) {
    showMessage('自动备份配置保存成功！');
    await loadAutoBackupConfig();
  } else {
    showMessage(data.message || '自动备份配置保存失败', 'error');
  }
  loading.autoBackupConfig = false;
};

const formatNextScheduled = () => {
  if (!autoBackupConfig.scheduled.enabled) return '未启用';
  const hour = String(autoBackupConfig.scheduled.hour).padStart(2, '0');
  const minute = String(autoBackupConfig.scheduled.minute).padStart(2, '0');
  return `每天 ${hour}:${minute}`;
};

onMounted(async () => {
  await loadBackupList();
  await loadWebdavConfig();
  if (webdavConfig.configured) {
    await loadWebdavBackupList();
  }
  await loadAutoBackupConfig();
});
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e3e6ef;
}

.tab {
  padding: 12px 24px;
  border: none;
  background: none;
  font-size: 15px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.tab:hover {
  color: #2566d8;
}

.tab.active {
  color: #2566d8;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #2566d8;
}

.tab-content {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.btn-restore {
  color: #27ae60;
}

.btn-restore:hover {
  background: #e9f7ef;
}

.btn-success {
  background: #16a34a;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #15803d;
}

.btn-success:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.backup-manage {
  width: 100%;
  max-width: 1200px;
  padding: 24px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #2566d8;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #174ea6;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.message {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #999;
}

.empty-state p {
  margin-top: 16px;
  font-size: 16px;
}

.backup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.backup-card {
  background: white;
  border: 1px solid #e3e6ef;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.backup-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.backup-icon {
  flex-shrink: 0;
}

.backup-info {
  flex: 1;
  min-width: 0;
}

.backup-name {
  font-size: 14px;
  font-weight: 500;
  color: #222;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.backup-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.backup-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #f0f0f0;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e0e0e0;
}

.btn-danger {
  color: #e74c3c;
}

.btn-danger:hover {
  background: #fee;
}

.btn-rename {
  color: #f59e0b;
}

.btn-rename:hover {
  background: #fef3c7;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #222;
}

.modal-content p {
  margin: 0 0 24px 0;
  color: #666;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.config-modal {
  max-width: 500px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-group small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.required {
  color: #e74c3c;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e3e6ef;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #2566d8;
}

.info-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 8px;
  margin-bottom: 16px;
}

.info-box p {
  margin: 0;
  color: #1565c0;
  font-size: 14px;
}

.config-section {
  max-width: 800px;
}

.config-section h3 {
  font-size: 24px;
  margin: 0 0 8px 0;
  color: #222;
}

.config-description {
  color: #666;
  margin: 0 0 24px 0;
  line-height: 1.6;
}

.config-card {
  background: white;
  border: 1px solid #e3e6ef;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.config-header h4 {
  margin: 0;
  font-size: 16px;
  color: #222;
}

.config-info {
  color: #666;
  font-size: 13px;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.config-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-row label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.field-row small {
  font-size: 12px;
  color: #999;
}

.time-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-field {
  width: 80px;
}

.checkbox-row {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #333;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label span {
  user-select: none;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2566d8;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.stats-card {
  background: #f8f9fa;
  border: 1px solid #e3e6ef;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.stats-card h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #222;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #2566d8;
}

.config-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .backup-manage {
    padding: 16px;
  }
  
  .backup-grid {
    grid-template-columns: 1fr;
  }
  
  .toolbar {
    flex-wrap: wrap;
  }
  
  .tabs {
    overflow-x: auto;
  }
}
</style>
