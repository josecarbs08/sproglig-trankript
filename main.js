/**
 * Klasse Transkript — Main Entry Point
 * Connects all modules and handles UI interactions.
 */
import { TranscriptionEngine } from './js/transcription.js';
import { SessionManager } from './js/session.js';
import { TranscriptRenderer } from './js/renderer.js';
import { SummaryEngine } from './js/summary.js';
import { ExportManager } from './js/export.js';
import { MicMonitor } from './js/mic-monitor.js';
import { PipManager } from './js/pip.js';
import { saveSession } from './js/supabase.js';

class KlasseTranskript {
  constructor() {
    // Core modules
    this.engine = new TranscriptionEngine();
    this.session = new SessionManager();
    this.renderer = new TranscriptRenderer();
    this.summary = new SummaryEngine();
    this.exporter = new ExportManager();
    this.micMonitor = new MicMonitor();
    this.pip = new PipManager();

    // State
    this.segmentStartIndex = 0;
    this.isPaused = false;

    // DOM refs
    this.els = {
      btnStart: document.getElementById('btn-start'),
      btnPause: document.getElementById('btn-pause'),
      btnStop: document.getElementById('btn-stop'),
      btnPip: document.getElementById('btn-pip'),
      btnExport: document.getElementById('btn-export'),
      btnSettings: document.getElementById('btn-settings'),
      btnLangDe: document.getElementById('btn-lang-de'),
      btnLangEs: document.getElementById('btn-lang-es'),
      btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
      timerDisplay: document.getElementById('timer-display'),
      sessionTimer: document.getElementById('session-timer'),
      sessionDate: document.getElementById('session-date-text'),
      recordingIndicator: document.getElementById('recording-indicator'),
      engineStatus: document.getElementById('engine-status'),
      micLevelContainer: document.getElementById('mic-level-container'),
      micLevelBar: document.getElementById('mic-level-bar'),
      sidebar: document.getElementById('sidebar'),
      // Modals
      exportModal: document.getElementById('export-modal'),
      exportTxt: document.getElementById('export-txt'),
      exportMd: document.getElementById('export-md'),
      exportJson: document.getElementById('export-json'),
      exportClose: document.getElementById('export-close'),
      settingsModal: document.getElementById('settings-modal'),
      settingsSave: document.getElementById('settings-save'),
      settingsClose: document.getElementById('settings-close'),
      settingAutosave: document.getElementById('setting-autosave'),
      settingFontsize: document.getElementById('setting-fontsize'),
      settingTimestamps: document.getElementById('setting-timestamps'),
      settingAutoscroll: document.getElementById('setting-autoscroll'),
    };

    this._init();
  }

  _init() {
    // Set current date
    this._updateDate();

    // Load saved settings
    this._loadSettings();

    // Check for saved session
    this._checkSavedSession();

    // Connect engine callbacks
    this.engine.onResult = (text, lang) => {
      this.renderer.addEntry(text, lang);
      this.renderer.clearInterim();
    };

    this.engine.onInterim = (text) => {
      this.renderer.setInterim(text);
    };

    this.engine.onError = (error) => {
      console.error('Transcription error:', error);
      this._showNotification(error.message, 'error');
    };

    this.engine.onStateChange = (isListening) => {
      // Update recording indicator
      this.els.recordingIndicator.classList.toggle('hidden', !isListening);
    };

    this.engine.onStatusUpdate = (statusMsg) => {
      if (this.els.engineStatus) {
        this.els.engineStatus.textContent = statusMsg;
      }
      this._updatePip();
    };

    // Connect session callbacks
    this.session.onTimerTick = (time) => {
      this.els.timerDisplay.textContent = time;
      this._updatePip();
    };

    this.session.onStateChange = (state) => {
      this._updateUIState(state);
    };

    this.session.onAutoSave = () => {
      this._autoSave();
    };

    // Bind button events
    this._bindEvents();

    // Check browser support
    if (!this.engine.isSupported()) {
      this._showNotification(
        'Tu navegador no soporta la Web Speech API. Usa Chrome o Edge.', 
        'error'
      );
      this.els.btnStart.disabled = true;
    }

    // Show PiP button if supported
    if (this.pip.isSupported()) {
      this.els.btnPip.classList.remove('hidden');
    }

    // Connect PiP callbacks
    this.pip.onLanguageChange = (lang) => {
      this._setLanguage(lang);
    };

    this.pip.onClose = () => {
      this._showNotification('Mini ventana cerrada', 'info');
    };

    // Global messaging (via extension)
    this._initGlobalMessaging();
  }

  _initGlobalMessaging() {
    console.log('[App] Init Global Messaging listener...');
    
    window.addEventListener('message', (event) => {
      // Security: Filter messages to ensure they come from our extension script
      if (event.data && event.data.source === 'klasse-transkript-extension') {
        const { command, action } = event.data;
        
        if (action === 'pong') {
          console.log('[App] 🟢 Extension detected and active!');
          this._showNotification('Extensión conectada', 'success');
          return;
        }

        if (command === 'set-lang-de') {
          console.log('[App] Extension command: set-lang-de');
          this._setLanguage('de-DE');
          this._showNotification('Idioma: Alemán (Vía Atajo)', 'info');
        } else if (command === 'set-lang-es') {
          console.log('[App] Extension command: set-lang-es');
          this._setLanguage('es-MX');
          this._showNotification('Idioma: Español (Vía Atajo)', 'info');
        } else if (command === 'toggle-recording') {
          console.log('[App] Extension command: toggle-recording');
          this._handleToggleRecording();
        }
      }
    });

    // Try to "ping" the extension after a delay
    setTimeout(() => {
      console.log('[App] Checking extension status...');
      // This will only work if the content script is already injected
      window.postMessage({ source: 'klasse-transkript-app', action: 'ping' }, '*');
    }, 2000);
  }

  _handleToggleRecording() {
    if (this.session.state === 'idle') {
      this._handleStart();
      this._showNotification('Iniciando (Vía Atajo)', 'success');
    } else if (this.session.state === 'recording') {
      this._handlePause();
      this._showNotification('Pausado (Vía Atajo)', 'info');
    } else if (this.session.state === 'paused') {
      this._handleResume();
      this._showNotification('Reanudando (Vía Atajo)', 'success');
    }
  }

  _bindEvents() {
    // Main controls
    this.els.btnStart.addEventListener('click', () => this._handleStart());
    this.els.btnPause.addEventListener('click', () => this._handlePause());
    this.els.btnStop.addEventListener('click', () => this._handleStop());
    this.els.btnPip.addEventListener('click', () => this._togglePip());

    // Language switcher
    this.els.btnLangDe.addEventListener('click', () => this._setLanguage('de-DE'));
    this.els.btnLangEs.addEventListener('click', () => this._setLanguage('es-MX'));

    // Sidebar toggle
    this.els.btnToggleSidebar.addEventListener('click', () => {
      this.els.sidebar.classList.toggle('collapsed');
    });

    // Export
    this.els.btnExport.addEventListener('click', () => this._showModal(this.els.exportModal));
    this.els.exportTxt.addEventListener('click', () => this._exportTxt());
    this.els.exportMd.addEventListener('click', () => this._exportMd());
    this.els.exportJson.addEventListener('click', () => this._exportJson());
    this.els.exportClose.addEventListener('click', () => this._hideModal(this.els.exportModal));

    // Settings
    this.els.btnSettings.addEventListener('click', () => this._showModal(this.els.settingsModal));
    this.els.settingsSave.addEventListener('click', () => this._saveSettings());
    this.els.settingsClose.addEventListener('click', () => this._hideModal(this.els.settingsModal));

    // Modal backdrop close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => {
        this._hideModal(this.els.exportModal);
        this._hideModal(this.els.settingsModal);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._handleKeyboard(e));

    // Prevent accidental close
    window.addEventListener('beforeunload', (e) => {
      if (this.session.state === 'recording' || this.session.state === 'paused') {
        e.preventDefault();
        e.returnValue = '¿Seguro que quieres salir? La transcripción se perderá.';
      }
    });
  }

  _handleKeyboard(e) {
    // Alt+1: German
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      this._setLanguage('de-DE');
      return;
    }

    // Alt+2: Spanish
    if (e.altKey && e.key === '2') {
      e.preventDefault();
      this._setLanguage('es-MX');
      return;
    }

    // Space: Pause/Resume (only when not in input)
    if (e.code === 'Space' && !this._isInputFocused()) {
      if (this.session.state === 'recording') {
        e.preventDefault();
        this._handlePause();
      } else if (this.session.state === 'paused') {
        e.preventDefault();
        this._handleResume();
      }
    }

    // Escape: Close modals
    if (e.key === 'Escape') {
      this._hideModal(this.els.exportModal);
      this._hideModal(this.els.settingsModal);
    }
  }

  _isInputFocused() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
  }

  // --- Action Handlers ---

  async _handleStart() {
    if (this.session.state === 'paused') {
      this._handleResume();
      return;
    }

    // Fresh start
    this.renderer.clear();
    this.summary.clear();
    this.segmentStartIndex = 0;

    // Start mic monitor first to warm up the microphone
    const micResult = await this.micMonitor.start();
    if (micResult.success) {
      this._showNotification(`Micrófono: ${micResult.micName}`, 'success');
      this.els.micLevelContainer.classList.remove('hidden');
    } else {
      this._showNotification(`Error de micrófono: ${micResult.error}`, 'error');
    }

    // Connect mic level callback
    this.micMonitor.onLevel = (level) => {
      if (this.els.micLevelBar) {
        this.els.micLevelBar.style.width = `${level}%`;
        this.els.micLevelBar.className = 'mic-level-bar' + 
          (level > 80 ? ' clipping' : level > 50 ? ' high' : '');
      }
    };

    this.session.start();
    this.renderer.setSessionStartTime(this.session.startTime);
    
    // Small delay to let mic warm up before starting recognition
    setTimeout(() => {
      this.engine.start();
    }, 500);
  }

  _handlePause() {
    if (this.session.state !== 'recording') return;

    this.engine.pause();
    this.renderer.clearInterim();
    
    // Generate summary for this segment
    const entries = this.renderer.getEntries();
    const elapsed = this.session.getFormattedTime();
    this.summary.generateSummary(
      this.session.segmentCount,
      entries,
      this.segmentStartIndex,
      elapsed
    );

    // Add pause marker to transcript
    this.renderer.addPauseMarker(this.session.segmentCount, elapsed);
    
    this.session.pause();
    this.isPaused = true;

    // Auto-save immediately on pause
    this._autoSave();

    // Update button to show "Reanudar"
    this.els.btnStart.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      <span>Reanudar</span>
    `;
    this.els.btnStart.disabled = false;
  }

  _handleResume() {
    this.segmentStartIndex = this.renderer.getEntries().length;
    this.session.resume();
    this.engine.resume();
    this.isPaused = false;

    // Restore button
    this.els.btnStart.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Iniciar</span>
    `;
  }

  _handleStop() {
    if (this.session.state === 'idle') return;

    // Confirm if there's significant content
    const entries = this.renderer.getEntries();
    if (entries.length > 5) {
      if (!confirm('¿Detener la sesión? Podrás exportar la transcripción después.')) {
        return;
      }
    }

    this.engine.stop();
    this.renderer.clearInterim();
    
    // Generate final summary if needed
    if (entries.length > this.segmentStartIndex) {
      this.summary.generateSummary(
        this.session.segmentCount,
        entries,
        this.segmentStartIndex,
        this.session.getFormattedTime()
      );
    }

    this.session.stop();
    this.isPaused = false;

    // Stop mic monitor
    this.micMonitor.stop();
    this.els.micLevelContainer.classList.add('hidden');

    // Reset start button
    this.els.btnStart.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Iniciar</span>
    `;
  }

  // --- Language ---

  _setLanguage(langCode) {
    this.engine.setLanguage(langCode);
    
    // Update UI
    this.els.btnLangDe.classList.toggle('active', langCode === 'de-DE');
    this.els.btnLangEs.classList.toggle('active', langCode === 'es-MX');

    // Update PiP
    this._updatePip();

    // Visual feedback
    const btn = langCode === 'de-DE' ? this.els.btnLangDe : this.els.btnLangEs;
    btn.style.transform = 'scale(1.1)';
    
    // Flash blue
    const originalBg = btn.style.background;
    const originalColor = btn.style.color;
    btn.style.background = 'rgba(59, 130, 246, 0.15)'; 
    btn.style.color = '#2563eb';
    
    setTimeout(() => { 
      btn.style.transform = ''; 
      btn.style.background = originalBg;
      btn.style.color = originalColor;
    }, 300);
  }

  // --- UI State ---

  _updateUIState(state) {
    const { btnStart, btnPause, btnStop, btnExport, sessionTimer } = this.els;

    switch (state) {
      case 'idle':
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnStop.disabled = true;
        btnExport.disabled = true;
        sessionTimer.classList.remove('active');
        break;

      case 'recording':
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnStop.disabled = false;
        btnExport.disabled = true;
        sessionTimer.classList.add('active');
        break;

      case 'paused':
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnStop.disabled = false;
        btnExport.disabled = false;
        sessionTimer.classList.remove('active');
        break;

      case 'stopped':
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnStop.disabled = true;
        btnExport.disabled = false;
        sessionTimer.classList.remove('active');
        this.els.recordingIndicator.classList.add('hidden');
        break;
    }
  }

  _updateDate() {
    const dateStr = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.els.sessionDate.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  // --- Export ---

  _exportTxt() {
    const entries = this.renderer.getEntriesForExport();
    const sessionData = this.session.getSessionData();
    this.exporter.exportTxt(entries, sessionData);
    this._hideModal(this.els.exportModal);
    this._showNotification('Transcripción exportada como TXT', 'success');
  }

  _exportMd() {
    const entries = this.renderer.getEntriesForExport();
    const sessionData = this.session.getSessionData();
    const summaries = this.summary.getSummaries();
    this.exporter.exportMarkdown(entries, sessionData, summaries);
    this._hideModal(this.els.exportModal);
    this._showNotification('Transcripción exportada como Markdown', 'success');
  }

  _exportJson() {
    const entries = this.renderer.getEntriesForExport();
    const sessionData = this.session.getSessionData();
    const notionData = this.summary.getNotionReadyData(entries, sessionData);
    this.exporter.exportJson(notionData);
    this._hideModal(this.els.exportModal);
    this._showNotification('Transcripción exportada como JSON (Notion-ready)', 'success');
  }

  // --- Modals ---

  _showModal(modal) {
    if (modal) modal.classList.remove('hidden');
  }

  _hideModal(modal) {
    if (modal) modal.classList.add('hidden');
  }

  // --- Settings ---

  _saveSettings() {
    const autosave = parseInt(this.els.settingAutosave.value) || 10;
    const fontsize = parseInt(this.els.settingFontsize.value) || 16;
    const timestamps = this.els.settingTimestamps.checked;
    const autoscroll = this.els.settingAutoscroll.checked;

    this.session.setAutoSaveInterval(autosave);
    this.renderer.setFontSize(fontsize);
    this.renderer.setShowTimestamps(timestamps);
    this.renderer.setAutoScroll(autoscroll);

    // Save to localStorage
    const settings = { autosave, fontsize, timestamps, autoscroll };
    localStorage.setItem('klasse-transkript-settings', JSON.stringify(settings));

    this._hideModal(this.els.settingsModal);
    this._showNotification('Configuración guardada', 'success');
  }

  _loadSettings() {
    try {
      const saved = localStorage.getItem('klasse-transkript-settings');
      if (!saved) return;

      const settings = JSON.parse(saved);
      
      if (settings.autosave) {
        this.els.settingAutosave.value = settings.autosave;
        this.session.setAutoSaveInterval(settings.autosave);
      }
      if (settings.fontsize) {
        this.els.settingFontsize.value = settings.fontsize;
        this.renderer.setFontSize(settings.fontsize);
      }
      if (settings.timestamps !== undefined) {
        this.els.settingTimestamps.checked = settings.timestamps;
        this.renderer.setShowTimestamps(settings.timestamps);
      }
      if (settings.autoscroll !== undefined) {
        this.els.settingAutoscroll.checked = settings.autoscroll;
        this.renderer.setAutoScroll(settings.autoscroll);
      }
    } catch (e) {
      // ignore
    }
  }

  // --- Auto-save & Session Recovery ---

  _autoSave() {
    const entries = this.renderer.getEntries();
    const summaries = this.summary.getSummaries();
    
    // Local save
    this.session.saveWithTranscript({ entries, summaries });

    // Supabase save (non-blocking)
    const sessionData = this.session.getSessionData();
    saveSession(sessionData, entries).then(res => {
      if (res.success) {
        console.log('[App] Auto-saved to Supabase');
      }
    });
  }

  _checkSavedSession() {
    const saved = this.session.getSavedSession();
    if (!saved || !saved.transcript) return;

    const { entries, summaries } = saved.transcript;
    if (!entries || entries.length === 0) return;

    // Offer to restore
    const minutes = Math.floor(saved.totalElapsed / 60000);
    if (confirm(`Se encontró una sesión guardada (${entries.length} fragmentos, ${minutes} min). ¿Deseas restaurarla?`)) {
      this.session.restoreSession(saved);
      this.renderer.setSessionStartTime(saved.startTime);
      this.renderer.restoreEntries(entries);
      
      if (summaries) {
        this.summary.restoreSummaries(summaries);
      }

      this.segmentStartIndex = entries.length;
      
      // Update UI to paused state
      this._updateUIState('paused');
      this.els.timerDisplay.textContent = this.session.getFormattedTime();
      this.els.btnExport.disabled = false;

      // Update start button to resume
      this.els.btnStart.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span>Reanudar</span>
      `;

      this._showNotification('Sesión restaurada correctamente', 'success');
    } else {
      this.session._clearSavedSession();
    }
  }

  // --- PiP ---

  async _togglePip() {
    if (this.pip.isActive) {
      this.pip.close();
    } else {
      await this.pip.open({
        timer: this.session.getFormattedTime(),
        status: this.els.engineStatus?.textContent || '',
        lang: this.engine.currentLang,
      });
      this._updatePip();
      this._showNotification('Mini ventana abierta', 'success');
    }
  }

  _updatePip() {
    if (!this.pip.isActive) return;

    const entries = this.renderer.getEntries();
    const lastText = entries.length > 0 ? entries[entries.length - 1].text : 'Sin transcripción reciente';

    this.pip.update({
      timer: this.session.getFormattedTime(),
      status: this.els.engineStatus?.textContent || '',
      lang: this.engine.currentLang,
      lastText: lastText
    });
  }

  // --- Notifications ---

  _showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 12px 24px;
      background: ${type === 'error' ? 'rgba(239, 68, 68, 0.9)' : type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(124, 106, 239, 0.9)'};
      color: white;
      border-radius: 12px;
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      z-index: 2000;
      opacity: 0;
      transition: all 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Remove after 3s
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  window.app = new KlasseTranskript();
});
