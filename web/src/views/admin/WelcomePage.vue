<template>
  <div class="welcome-page">
    <h2 class="welcome-title">欢迎您，{{ currentUsername || 'admin' }}！</h2>
    <div class="welcome-cards">
      <div class="welcome-card">
        <div class="welcome-icon time-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#1abc9c" stroke-width="2"/>
            <path d="M12 6v6l4 2" stroke="#1abc9c" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="welcome-label">上次登录时间</div>
        <div class="welcome-value">{{ lastLoginTime || '--' }}</div>
      </div>
      <div class="welcome-card">
        <div class="welcome-icon ip-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#1abc9c" stroke-width="2"/>
            <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" stroke="#1abc9c" stroke-width="2"/>
            <circle cx="12" cy="12" r="2" fill="#1abc9c"/>
          </svg>
        </div>
        <div class="welcome-label">上次登录IP</div>
        <div class="welcome-value">{{ lastLoginIp || '--' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  lastLoginTime: String,
  lastLoginIp: String,
  currentUsername: String
});
</script>

<style scoped>
.welcome-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 48px;
}

.welcome-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 600;
  color: #222;
  margin-bottom: 32px;
}

.welcome-cards {
  display: flex;
  gap: 32px;
}

.welcome-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 32px 40px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1.5px solid #e3e6ef;
}

.welcome-icon {
  width: 48px;
  height: 48px;
  background: #f5f6fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}

.welcome-label {
  font-size: 1.1rem;
  color: #222;
  margin-bottom: 8px;
}

.welcome-value {
  font-size: 2rem;
  color: #1abc9c;
  font-weight: 600;
  letter-spacing: 1px;
}

@media (max-width: 900px) {
  .welcome-cards {
    flex-direction: column;
    gap: 18px;
    align-items: center;
  }
  
  .welcome-card {
    min-width: 220px;
    width: 90vw;
    padding: 24px 10px;
  }
}
</style>
