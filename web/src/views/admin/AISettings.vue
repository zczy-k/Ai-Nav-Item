<template>
  <div class="ai-settings">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>🤖 AI 智能生成</h2>
      <div class="connection-status" :class="connectionStatus">
        <span class="status-dot"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- 快速开始提示（未配置时显示） -->
    <div class="quick-start" v-if="!config.hasApiKey && !config.apiKey">
      <div class="quick-start-icon">🚀</div>
      <div class="quick-start-content">
        <h4>快速开始</h4>
        <p>配置 AI 服务后，可自动为卡片生成名称、描述和标签</p>
        <div class="quick-start-steps">
          <span class="step">1. 选择提供商</span>
          <span class="step">2. 填写 API Key</span>
          <span class="step">3. 测试连接</span>
        </div>
      </div>
    </div>

    <!-- 提供商选择 -->
    <div class="section provider-section">
      <div class="section-header">
        <h3>选择 AI 提供商</h3>
        <span class="section-hint">推荐使用 DeepSeek，性价比高</span>
      </div>
      
      <div class="provider-grid">
        <div 
          v-for="(provider, key) in providers" 
          :key="key"
          class="provider-card"
          :class="{ active: config.provider === key, recommended: provider.recommended }"
          @click="selectProvider(key)"
        >
          <div class="provider-icon">{{ provider.icon }}</div>
          <div class="provider-info">
            <span class="provider-name">{{ provider.name }}</span>
            <span class="provider-tag" v-if="provider.recommended">推荐</span>
            <span class="provider-tag local" v-if="provider.local">本地</span>
          </div>
        </div>
      </div>
    </div>

    <!-- API 配置 -->
    <div class="section config-section">
      <div class="section-header">
        <h3>API 配置</h3>
        <a 
          v-if="currentProvider.docsUrl" 
          :href="currentProvider.docsUrl" 
          target="_blank" 
          class="docs-link"
        >
          📖 获取 API Key
        </a>
      </div>

      <div class="config-form">
        <!-- API Key -->
        <div class="form-item" v-if="needsApiKey">
          <label>
            <span class="label-text">API Key</span>
            <span class="label-status" :class="{ configured: config.hasApiKey }">
              {{ config.hasApiKey ? '✓ 已配置' : '未配置' }}
            </span>
          </label>
          <div class="input-group">
            <input 
              :type="showApiKey ? 'text' : 'password'" 
              v-model="config.apiKey" 
              :placeholder="config.hasApiKey ? '已配置（留空保持不变）' : '请输入 API Key'"
              class="input"
            />
            <button type="button" class="input-btn" @click="showApiKey = !showApiKey" title="显示/隐藏">
              {{ showApiKey ? '🙈' : '👁️' }}
            </button>
            <button type="button" class="input-btn" @click="pasteApiKey" title="粘贴">
              📋
            </button>
          </div>
        </div>

        <!-- Base URL -->
        <div class="form-item" v-if="needsBaseUrl">
          <label>
            <span class="label-text">Base URL</span>
          </label>
          <input 
            type="text" 
            v-model="config.baseUrl" 
            :placeholder="currentProvider.defaultBaseUrl || '请输入 API 地址'"
            class="input"
          />
          <span class="form-hint">不需要加 /v1/chat/completions</span>
        </div>

        <!-- 模型选择 -->
        <div class="form-item">
          <label>
            <span class="label-text">模型</span>
          </label>
          <div class="model-select">
            <select v-model="selectedModel" class="input" @change="onModelChange">
              <option value="">自定义模型</option>
              <option v-for="model in currentProvider.models" :key="model" :value="model">
                {{ model }}
              </option>
            </select>
            <input 
              v-if="selectedModel === ''" 
              type="text" 
              v-model="config.model" 
              :placeholder="currentProvider.defaultModel"
              class="input model-input"
            />
          </div>
        </div>

        <!-- 高级设置（可折叠） -->
        <div class="advanced-toggle" @click="showAdvanced = !showAdvanced">
          <span>{{ showAdvanced ? '▼' : '▶' }} 高级设置</span>
        </div>
        
        <div class="advanced-settings" v-show="showAdvanced">
          <div class="form-item">
            <label>
              <span class="label-text">请求间隔</span>
              <span class="label-value">{{ config.requestDelay }}ms</span>
            </label>
            <input 
              type="range" 
              v-model.number="config.requestDelay" 
              min="500" 
              max="5000"
              step="100"
              class="slider"
            />
            <span class="form-hint">批量生成时的调用间隔，防止触发限流</span>
          </div>
        </div>

        <!-- 自动生成开关 -->
        <div class="form-item auto-generate">
          <label class="switch-label">
            <span class="switch-text">
              <span class="switch-title">自动生成</span>
              <span class="switch-desc">添加卡片时自动生成名称、描述和标签</span>
            </span>
            <label class="switch">
              <input type="checkbox" v-model="config.autoGenerate" />
              <span class="switch-slider"></span>
            </label>
          </label>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <button 
            class="btn btn-outline" 
            @click="testConnection" 
            :disabled="testing || !canTest"
          >
            <span class="btn-icon">{{ testing ? '⏳' : '🔗' }}</span>
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          <button 
            class="btn btn-primary" 
            @click="saveConfig" 
            :disabled="saving"
          >
            <span class="btn-icon">{{ saving ? '⏳' : '💾' }}</span>
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 批量生成 -->
    <div class="section batch-section">
      <div class="section-header">
        <h3>批量生成</h3>
        <button class="btn-icon-only" @click="refreshStats" :disabled="refreshing" title="刷新统计">
          {{ refreshing ? '⏳' : '🔄' }}
        </button>
      </div>

      <!-- 统计信息 -->
      <div class="stats-bar" v-if="stats">
        <div class="stat-chip">
          <span class="stat-num">{{ stats.total }}</span>
          <span class="stat-label">总数</span>
        </div>
        <div class="stat-chip" :class="{ warning: stats.emptyName > 0 }">
          <span class="stat-num">{{ stats.emptyName }}</span>
          <span class="stat-label">缺名称</span>
        </div>
        <div class="stat-chip" :class="{ warning: stats.emptyDesc > 0 }">
          <span class="stat-num">{{ stats.emptyDesc }}</span>
          <span class="stat-label">缺描述</span>
        </div>
        <div class="stat-chip" :class="{ warning: stats.emptyTags > 0 }">
          <span class="stat-num">{{ stats.emptyTags }}</span>
          <span class="stat-label">缺标签</span>
        </div>
      </div>

      <!-- 任务进行中 -->
      <div class="task-progress" v-if="batchRunning">
        <div class="progress-header">
          <span class="progress-title">{{ batchLabel }}</span>
          <span class="progress-count">{{ batchProgress.current }} / {{ batchProgress.total }}</span>
        </div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <span class="progress-percent">{{ progressPercent }}%</span>
        </div>
        <div class="progress-detail" v-if="batchProgress.currentCard">
          <span class="current-item">{{ batchProgress.currentCard }}</span>
          <span class="eta" v-if="estimatedTime">预计剩余 {{ estimatedTime }}</span>
        </div>
        <!-- 并发状态指示器 -->
        <div class="concurrency-status">
          <span class="concurrency-label">
            <span class="concurrency-icon">{{ batchProgress.isRateLimited ? '🐢' : '🚀' }}</span>
            {{ concurrencyText }}
          </span>
          <span class="concurrency-badge" :class="concurrencyClass">
            并发 {{ batchProgress.concurrency || 1 }}
          </span>
        </div>
        <button class="btn btn-danger btn-sm" @click="stopBatch" :disabled="stopping">
          {{ stopping ? '停止中...' : '⏹️ 停止任务' }}
        </button>
      </div>

      <!-- 操作按钮 -->
      <div class="batch-actions" v-else>
        <!-- 一键补全 -->
        <div class="action-group primary-action" v-if="totalMissing > 0">
          <button 
            class="btn btn-primary btn-lg"
            @click="startBatchAll"
            :disabled="starting || !config.hasApiKey"
          >
            <span class="btn-icon">✨</span>
            一键补全所有缺失 ({{ totalMissing }})
          </button>
          <span class="action-hint">自动补充缺少的名称、描述和标签</span>
        </div>

        <div class="action-divider" v-if="totalMissing > 0">
          <span>或选择单项操作</span>
        </div>

        <!-- 单项操作 -->
        <div class="action-grid">
          <div class="action-card">
            <div class="action-card-header">
              <span class="action-icon">📝</span>
              <span class="action-title">名称</span>
            </div>
            <div class="action-card-body">
              <button 
                class="btn btn-sm"
                @click="startBatch('name', 'empty')"
                :disabled="!stats || stats.emptyName === 0 || starting || !config.hasApiKey"
              >
                补充缺失 ({{ stats?.emptyName || 0 }})
              </button>
              <button 
                class="btn btn-sm btn-outline-warning"
                @click="startBatch('name', 'all')"
                :disabled="!stats || stats.total === 0 || starting || !config.hasApiKey"
              >
                全部重新生成
              </button>
            </div>
          </div>

          <div class="action-card">
            <div class="action-card-header">
              <span class="action-icon">📄</span>
              <span class="action-title">描述</span>
            </div>
            <div class="action-card-body">
              <button 
                class="btn btn-sm"
                @click="startBatch('description', 'empty')"
                :disabled="!stats || stats.emptyDesc === 0 || starting || !config.hasApiKey"
              >
                补充缺失 ({{ stats?.emptyDesc || 0 }})
              </button>
              <button 
                class="btn btn-sm btn-outline-warning"
                @click="startBatch('description', 'all')"
                :disabled="!stats || stats.total === 0 || starting || !config.hasApiKey"
              >
                全部重新生成
              </button>
            </div>
          </div>

          <div class="action-card">
            <div class="action-card-header">
              <span class="action-icon">🏷️</span>
              <span class="action-title">标签</span>
            </div>
            <div class="action-card-body">
              <button 
                class="btn btn-sm"
                @click="startBatch('tags', 'empty')"
                :disabled="!stats || stats.emptyTags === 0 || starting || !config.hasApiKey"
              >
                补充缺失 ({{ stats?.emptyTags || 0 }})
              </button>
              <button 
                class="btn btn-sm btn-outline-warning"
                @click="startBatch('tags', 'all')"
                :disabled="!stats || stats.total === 0 || starting || !config.hasApiKey"
              >
                全部重新生成
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast 消息 -->
    <transition name="toast">
      <div class="toast" :class="messageType" v-if="message">
        <span class="toast-icon">{{ messageIcon }}</span>
        <span class="toast-text">{{ message }}</span>
      </div>
    </transition>
  </div>
</template>

<script>
import axios from 'axios';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const api = {
  get: (url) => axios.get(url, { headers: authHeaders() }),
  post: (url, data) => axios.post(url, data, { headers: authHeaders() })
};


const PROVIDERS = {
  deepseek: { 
    name: 'DeepSeek', 
    icon: '🔮', 
    recommended: true,
    needsApiKey: true, 
    needsBaseUrl: false, 
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder'],
    defaultBaseUrl: 'https://api.deepseek.com',
    docsUrl: 'https://platform.deepseek.com/api_keys'
  },
  openai: { 
    name: 'OpenAI', 
    icon: '🤖', 
    needsApiKey: true, 
    needsBaseUrl: false, 
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultBaseUrl: 'https://api.openai.com',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: { 
    name: 'Claude', 
    icon: '🧠', 
    needsApiKey: true, 
    needsBaseUrl: false, 
    defaultModel: 'claude-3-haiku-20240307',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    defaultBaseUrl: '',
    docsUrl: 'https://console.anthropic.com/settings/keys'
  },
  gemini: { 
    name: 'Gemini', 
    icon: '💎', 
    needsApiKey: true, 
    needsBaseUrl: false, 
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    defaultBaseUrl: '',
    docsUrl: 'https://aistudio.google.com/app/apikey'
  },
  zhipu: { 
    name: '智谱 GLM', 
    icon: '🇨🇳', 
    needsApiKey: true, 
    needsBaseUrl: false, 
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-air', 'glm-4'],
    defaultBaseUrl: '',
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys'
  },
  qwen: { 
    name: '通义千问', 
    icon: '☁️', 
    needsApiKey: true, 
    needsBaseUrl: false, 
    defaultModel: 'qwen-turbo',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    defaultBaseUrl: '',
    docsUrl: 'https://dashscope.console.aliyun.com/apiKey'
  },
  moonshot: { 
    name: 'Kimi', 
    icon: '🌙', 
    needsApiKey: true, 
    needsBaseUrl: false, 
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultBaseUrl: '',
    docsUrl: 'https://platform.moonshot.cn/console/api-keys'
  },
  groq: { 
    name: 'Groq', 
    icon: '⚡', 
    needsApiKey: true, 
    needsBaseUrl: false, 
    defaultModel: 'llama-3.1-8b-instant',
    models: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    defaultBaseUrl: '',
    docsUrl: 'https://console.groq.com/keys'
  },
  doubao: { 
    name: '豆包', 
    icon: '🫘', 
    needsApiKey: true, 
    needsBaseUrl: false, 
    defaultModel: 'doubao-lite-4k',
    models: ['doubao-lite-4k', 'doubao-pro-4k'],
    defaultBaseUrl: '',
    docsUrl: 'https://console.volcengine.com/ark'
  },
  ollama: { 
    name: 'Ollama', 
    icon: '🦙', 
    local: true,
    needsApiKey: false, 
    needsBaseUrl: true, 
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5'],
    defaultBaseUrl: 'http://localhost:11434',
    docsUrl: 'https://ollama.com/'
  },
  custom: { 
    name: '自定义', 
    icon: '⚙️', 
    needsApiKey: true, 
    needsBaseUrl: true, 
    defaultModel: '',
    models: [],
    defaultBaseUrl: '',
    docsUrl: ''
  }
};

export default {
  name: 'AISettings',
  data() {
    return {
      providers: PROVIDERS,
      config: {
        provider: 'deepseek',
        apiKey: '',
        baseUrl: '',
        model: '',
        requestDelay: 1500,
        autoGenerate: false,
        hasApiKey: false
      },
      selectedModel: '',
      showApiKey: false,
      showAdvanced: false,
      testing: false,
      saving: false,
      refreshing: false,
      starting: false,
      stopping: false,
      connectionTested: false,
      connectionOk: false,
      stats: null,
      batchRunning: false,
      batchType: '',
      batchMode: '',
      batchProgress: { current: 0, total: 0, currentCard: '', concurrency: 3, isRateLimited: false },
      batchStartTime: null,
      pollTimer: null,
      message: '',
      messageType: 'info'
    };
  },
  computed: {
    currentProvider() {
      return PROVIDERS[this.config.provider] || PROVIDERS.deepseek;
    },
    needsApiKey() {
      return this.currentProvider.needsApiKey;
    },
    needsBaseUrl() {
      return this.currentProvider.needsBaseUrl;
    },
    canTest() {
      if (this.needsApiKey && !this.config.apiKey && !this.config.hasApiKey) return false;
      if (this.needsBaseUrl && !this.config.baseUrl && !this.currentProvider.defaultBaseUrl) return false;
      return true;
    },
    connectionStatus() {
      if (!this.config.hasApiKey && !this.config.apiKey) return 'unconfigured';
      if (this.connectionTested) return this.connectionOk ? 'connected' : 'error';
      return 'unknown';
    },
    statusText() {
      const statusMap = {
        unconfigured: '未配置',
        connected: '已连接',
        error: '连接失败',
        unknown: '待测试'
      };
      return statusMap[this.connectionStatus];
    },
    progressPercent() {
      if (!this.batchProgress.total) return 0;
      return Math.round((this.batchProgress.current / this.batchProgress.total) * 100);
    },
    batchLabel() {
      const typeLabels = { name: '名称', description: '描述', tags: '标签', all: '全部内容' };
      const typeLabel = typeLabels[this.batchType] || '内容';
      const modeLabel = this.batchMode === 'all' ? '重新生成' : '补充';
      return `正在${modeLabel}${typeLabel}`;
    },
    totalMissing() {
      if (!this.stats) return 0;
      return this.stats.emptyName + this.stats.emptyDesc + this.stats.emptyTags;
    },
    estimatedTime() {
      if (!this.batchStartTime || !this.batchProgress.current || this.batchProgress.current < 2) return '';
      const elapsed = Date.now() - this.batchStartTime;
      const avgTime = elapsed / this.batchProgress.current;
      const remaining = (this.batchProgress.total - this.batchProgress.current) * avgTime;
      if (remaining < 60000) return `${Math.round(remaining / 1000)}秒`;
      return `${Math.round(remaining / 60000)}分钟`;
    },
    messageIcon() {
      const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
      return icons[this.messageType] || 'ℹ️';
    },
    concurrencyText() {
      if (this.batchProgress.isRateLimited) {
        return '检测到限流，已降速';
      }
      const c = this.batchProgress.concurrency || 1;
      if (c >= 4) return '高速并行处理中';
      if (c >= 2) return '并行处理中';
      return '串行处理中';
    },
    concurrencyClass() {
      if (this.batchProgress.isRateLimited) return 'rate-limited';
      const c = this.batchProgress.concurrency || 1;
      if (c >= 4) return 'high';
      if (c >= 2) return 'medium';
      return 'low';
    }
  },
  async mounted() {
    await this.loadConfig();
    await this.refreshStats();
    await this.checkRunningTask();
  },
  beforeUnmount() {
    this.stopPolling();
  },
  methods: {
    selectProvider(key) {
      if (this.config.provider === key) return;
      this.config.provider = key;
      this.config.apiKey = '';
      this.config.hasApiKey = false;
      this.config.baseUrl = '';
      this.selectedModel = '';
      this.config.model = '';
      this.connectionTested = false;
    },
    onModelChange() {
      if (this.selectedModel) {
        this.config.model = this.selectedModel;
      }
    },
    async pasteApiKey() {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          this.config.apiKey = text.trim();
          this.showMessage('已粘贴', 'success');
        }
      } catch (e) {
        this.showMessage('无法访问剪贴板', 'error');
      }
    },
    stopPolling() {
      if (this.pollTimer) {
        clearTimeout(this.pollTimer);
        this.pollTimer = null;
      }
    },
    async loadConfig() {
      try {
        const res = await api.get('/api/ai/config');
        if (res.data.success) {
          const cfg = res.data.config;
          this.config.provider = cfg.provider || 'deepseek';
          this.config.hasApiKey = cfg.hasApiKey;
          this.config.baseUrl = cfg.baseUrl || '';
          this.config.model = cfg.model || '';
          this.config.requestDelay = cfg.requestDelay || 1500;
          this.config.autoGenerate = cfg.autoGenerate || false;
          
          // 设置模型选择
          if (cfg.model && this.currentProvider.models?.includes(cfg.model)) {
            this.selectedModel = cfg.model;
          }
        }
      } catch (e) {
        // 静默处理
      }
    },
    async checkRunningTask() {
      try {
        const res = await api.get('/api/ai/batch-task/status');
        if (res.data.success && res.data.running) {
          this.batchRunning = true;
          this.batchType = res.data.type;
          this.batchMode = res.data.mode;
          this.batchProgress = {
            current: res.data.current || 0,
            total: res.data.total || 0,
            currentCard: res.data.currentCard || ''
          };
          this.batchStartTime = Date.now() - (res.data.current * 2000);
          this.startPolling();
        }
      } catch (e) {
        // 静默处理
      }
    },
    async saveConfig() {
      this.saving = true;
      try {
        const res = await api.post('/api/ai/config', {
          provider: this.config.provider,
          apiKey: this.config.apiKey || undefined,
          baseUrl: this.config.baseUrl || this.currentProvider.defaultBaseUrl,
          model: this.config.model || this.currentProvider.defaultModel,
          requestDelay: this.config.requestDelay,
          autoGenerate: this.config.autoGenerate
        });
        if (res.data.success) {
          this.showMessage('配置保存成功', 'success');
          this.config.hasApiKey = true;
          this.config.apiKey = '';
          // 保存后自动测试连接
          setTimeout(() => this.testConnection(), 500);
        } else {
          this.showMessage(res.data.message, 'error');
        }
      } catch (e) {
        this.showMessage(e.response?.data?.message || '保存失败', 'error');
      } finally {
        this.saving = false;
      }
    },
    async testConnection() {
      this.testing = true;
      this.connectionTested = false;
      try {
        const res = await api.post('/api/ai/test');
        this.connectionTested = true;
        if (res.data.success) {
          this.connectionOk = true;
          this.showMessage('连接成功', 'success');
        } else {
          this.connectionOk = false;
          this.showMessage(res.data.message, 'error');
        }
      } catch (e) {
        this.connectionTested = true;
        this.connectionOk = false;
        this.showMessage(e.response?.data?.message || '连接失败', 'error');
      } finally {
        this.testing = false;
      }
    },
    async refreshStats() {
      if (this.refreshing) return;
      this.refreshing = true;
      try {
        const [nameRes, descRes, tagsRes, allRes] = await Promise.all([
          api.get('/api/ai/empty-cards?type=name'),
          api.get('/api/ai/empty-cards?type=description'),
          api.get('/api/ai/empty-cards?type=tags'),
          api.get('/api/ai/empty-cards?type=description&mode=all')
        ]);
        this.stats = {
          emptyName: nameRes.data.total || 0,
          emptyDesc: descRes.data.total || 0,
          emptyTags: tagsRes.data.total || 0,
          total: allRes.data.total || 0
        };
      } catch (e) {
        // 静默处理
      } finally {
        this.refreshing = false;
      }
    },
    async startBatchAll() {
      // 一键补全所有缺失内容
      if (this.starting || this.batchRunning) return;
      
      // 按顺序执行：名称 -> 描述 -> 标签
      const tasks = [];
      if (this.stats?.emptyName > 0) tasks.push({ type: 'name', count: this.stats.emptyName });
      if (this.stats?.emptyDesc > 0) tasks.push({ type: 'description', count: this.stats.emptyDesc });
      if (this.stats?.emptyTags > 0) tasks.push({ type: 'tags', count: this.stats.emptyTags });
      
      if (tasks.length === 0) {
        this.showMessage('没有需要补充的内容', 'info');
        return;
      }
      
      // 先执行第一个任务
      await this.startBatch(tasks[0].type, 'empty');
    },
    async startBatch(type, mode) {
      if (this.starting || this.batchRunning) return;
      
      if (mode === 'all') {
        const typeLabels = { name: '名称', description: '描述', tags: '标签' };
        const confirmMsg = `确定要重新生成所有卡片的${typeLabels[type]}吗？这将覆盖现有内容。`;
        if (!confirm(confirmMsg)) return;
      }
      
      this.starting = true;
      this.stopPolling();

      try {
        const res = await api.post('/api/ai/batch-task/start', { type, mode });
        
        if (!res.data.success) {
          this.showMessage(res.data.message || '启动任务失败', 'error');
          return;
        }
        
        if (res.data.total === 0) {
          this.showMessage('没有需要处理的卡片', 'info');
          await this.refreshStats();
          return;
        }
        
        this.batchType = type;
        this.batchMode = mode;
        this.batchProgress = { current: 0, total: res.data.total, currentCard: '正在处理...' };
        this.batchRunning = true;
        this.batchStartTime = Date.now();
        this.showMessage(`任务已启动，共 ${res.data.total} 个卡片`, 'info');
        this.startPolling();
        
      } catch (e) {
        this.showMessage(e.response?.data?.message || '启动任务失败', 'error');
      } finally {
        this.starting = false;
      }
    },
    startPolling() {
      const poll = async () => {
        if (!this.batchRunning) {
          this.stopPolling();
          return;
        }
        
        try {
          const res = await api.get('/api/ai/batch-task/status');
          
          if (!res.data.success) {
            this.pollTimer = setTimeout(poll, 1500);
            return;
          }
          
          if (res.data.total > 0) {
            this.batchProgress.current = res.data.current || 0;
            this.batchProgress.total = res.data.total;
            this.batchProgress.currentCard = res.data.currentCard || '';
            this.batchProgress.concurrency = res.data.concurrency || 1;
            this.batchProgress.isRateLimited = res.data.isRateLimited || false;
          }
          
          if (res.data.running) {
            this.pollTimer = setTimeout(poll, 800);
          } else {
            this.onTaskComplete(res.data);
          }
        } catch (e) {
          this.pollTimer = setTimeout(poll, 2000);
        }
      };
      
      poll();
    },
    onTaskComplete(data) {
      this.stopPolling();
      this.batchRunning = false;
      this.batchStartTime = null;
      
      const successCount = data.successCount || 0;
      const total = data.total || this.batchProgress.total;
      
      if (total > 0) {
        this.showMessage(`完成！成功处理 ${successCount} / ${total} 个卡片`, 'success');
      } else {
        this.showMessage('任务已完成', 'success');
      }
      
      setTimeout(() => this.refreshStats(), 300);
    },
    async stopBatch() {
      if (this.stopping) return;
      this.stopping = true;
      try {
        await api.post('/api/ai/batch-task/stop');
        this.showMessage('正在停止任务...', 'info');
      } catch (e) {
        // 静默处理
      } finally {
        setTimeout(() => { this.stopping = false; }, 2000);
      }
    },
    showMessage(msg, type = 'info') {
      this.message = msg;
      this.messageType = type;
      setTimeout(() => { this.message = ''; }, 4000);
    }
  }
};
</script>

<style scoped>
.ai-settings {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary, #1f2937);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  background: var(--bg-secondary, #f3f4f6);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
}

.connection-status.connected .status-dot { background: #10b981; }
.connection-status.error .status-dot { background: #ef4444; }
.connection-status.unconfigured .status-dot { background: #f59e0b; }

/* 快速开始 */
.quick-start {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: #fff;
  margin-bottom: 24px;
}

.quick-start-icon {
  font-size: 2.5rem;
}

.quick-start-content h4 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
}

.quick-start-content p {
  margin: 0 0 12px 0;
  opacity: 0.9;
  font-size: 14px;
}

.quick-start-steps {
  display: flex;
  gap: 16px;
}

.quick-start-steps .step {
  padding: 4px 10px;
  background: rgba(255,255,255,0.2);
  border-radius: 12px;
  font-size: 12px;
}

/* 区块 */
.section {
  background: var(--card-bg, #fff);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary, #1f2937);
}

.section-hint {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.docs-link {
  font-size: 13px;
  color: var(--primary-color, #3b82f6);
  text-decoration: none;
}

.docs-link:hover {
  text-decoration: underline;
}

/* 提供商选择 */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.provider-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--card-bg, #fff);
}

.provider-card:hover {
  border-color: var(--primary-color, #3b82f6);
  transform: translateY(-2px);
}

.provider-card.active {
  border-color: var(--primary-color, #3b82f6);
  background: var(--primary-light, #eff6ff);
}

.provider-icon {
  font-size: 1.5rem;
  margin-bottom: 6px;
}

.provider-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.provider-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  text-align: center;
}

.provider-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  background: var(--primary-color, #3b82f6);
  color: #fff;
}

.provider-tag.local {
  background: #10b981;
}

/* 表单 */
.config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
}

.label-status {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.label-status.configured {
  color: #10b981;
}

.label-value {
  font-size: 12px;
  color: var(--primary-color, #3b82f6);
  font-weight: 500;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 10px;
  font-size: 14px;
  background: var(--input-bg, #fff);
  color: var(--text-primary, #1f2937);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-btn {
  padding: 10px 14px;
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 10px;
  background: var(--bg-secondary, #f9fafb);
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}

.input-btn:hover {
  background: var(--bg-hover, #f3f4f6);
}

.model-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-input {
  margin-top: 0;
}

.form-hint {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--border-color, #e5e7eb);
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color, #3b82f6);
  cursor: pointer;
}

/* 高级设置 */
.advanced-toggle {
  padding: 10px 0;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  user-select: none;
}

.advanced-toggle:hover {
  color: var(--primary-color, #3b82f6);
}

.advanced-settings {
  padding: 16px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 10px;
}

/* 自动生成开关 */
.auto-generate {
  padding: 16px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 12px;
}

.switch-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.switch-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
}

.switch-desc {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.switch {
  position: relative;
  width: 48px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--border-color, #d1d5db);
  border-radius: 26px;
  transition: 0.3s;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.switch input:checked + .switch-slider {
  background: var(--primary-color, #3b82f6);
}

.switch input:checked + .switch-slider:before {
  transform: translateX(22px);
}

/* 按钮 */
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

.btn-primary {
  background: var(--primary-color, #3b82f6);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #2563eb);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color, #d1d5db);
  color: var(--text-primary, #1f2937);
}

.btn-outline:hover:not(:disabled) {
  background: var(--bg-secondary, #f9fafb);
}

.btn-danger {
  background: #ef4444;
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-sm {
  padding: 8px 14px;
  font-size: 13px;
}

.btn-lg {
  padding: 14px 28px;
  font-size: 15px;
}

.btn-outline-warning {
  background: transparent;
  border: 1px solid #f59e0b;
  color: #f59e0b;
}

.btn-outline-warning:hover:not(:disabled) {
  background: #fef3c7;
}

.btn-icon-only {
  padding: 8px;
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.btn-icon-only:hover:not(:disabled) {
  background: var(--bg-secondary, #f3f4f6);
}

.btn-icon-only:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-secondary, #f3f4f6);
  border-radius: 20px;
}

.stat-chip.warning {
  background: #fef3c7;
}

.stat-num {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-color, #3b82f6);
}

.stat-chip.warning .stat-num {
  color: #f59e0b;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

/* 任务进度 */
.task-progress {
  padding: 20px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.progress-title {
  font-weight: 500;
  color: var(--text-primary, #1f2937);
}

.progress-count {
  font-size: 14px;
  color: var(--text-secondary, #6b7280);
}

.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--border-color, #e5e7eb);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color, #3b82f6);
  min-width: 40px;
}

.progress-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
}

.current-item {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

.eta {
  color: var(--primary-color, #3b82f6);
}

/* 并发状态 */
.concurrency-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: var(--card-bg, #fff);
  border-radius: 8px;
  font-size: 13px;
}

.concurrency-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #6b7280);
}

.concurrency-icon {
  font-size: 16px;
}

.concurrency-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.concurrency-badge.high {
  background: #dcfce7;
  color: #16a34a;
}

.concurrency-badge.medium {
  background: #dbeafe;
  color: #2563eb;
}

.concurrency-badge.low {
  background: #fef3c7;
  color: #d97706;
}

.concurrency-badge.rate-limited {
  background: #fee2e2;
  color: #dc2626;
}

/* 批量操作 */
.batch-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.primary-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.action-hint {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.action-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary, #9ca3af);
  font-size: 12px;
}

.action-divider::before,
.action-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color, #e5e7eb);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.action-card {
  padding: 16px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 12px;
}

.action-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.action-icon {
  font-size: 1.2rem;
}

.action-title {
  font-weight: 500;
  color: var(--text-primary, #1f2937);
}

.action-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 14px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
}

.toast.success { background: #10b981; }
.toast.error { background: #ef4444; }
.toast.info { background: #3b82f6; }
.toast.warning { background: #f59e0b; }

.toast-icon { font-size: 18px; }

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* 响应式 */
@media (max-width: 640px) {
  .provider-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-start {
    flex-direction: column;
    text-align: center;
  }
  
  .quick-start-steps {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .stats-bar {
    justify-content: center;
  }
}

/* 暗色模式 */
:root.dark .section,
:root.dark .provider-card {
  background: var(--card-bg-dark, #1f2937);
}

:root.dark .provider-card.active {
  background: var(--primary-dark, #1e3a5f);
}

:root.dark .input {
  background: var(--input-bg-dark, #374151);
  border-color: var(--border-color-dark, #4b5563);
  color: #fff;
}

:root.dark .stat-chip,
:root.dark .action-card,
:root.dark .task-progress,
:root.dark .auto-generate,
:root.dark .advanced-settings {
  background: var(--bg-dark, #374151);
}

:root.dark .connection-status {
  background: var(--bg-dark, #374151);
}
</style>
