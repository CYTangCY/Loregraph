/**
 * LoreGraph Extension for SillyTavern
 * Handles UI Integration, Settings, and Two-Way Memory Sync
 */

(function() {
    const EXTENSION_NAME = "LoreGraph";
    const SETTINGS_KEY = "loregraph_settings";
    
    // Default Settings
    let settings = {
        apiKey: "",
        model: "gemini-2.5-flash",
        autoInject: true
    };
    
    // State
    let currentMemoryBlock = ""; // The latest graph summary
    let graphWindow = null; // Reference to the popup
    
    // --- SETTINGS MANAGEMENT ---
    function loadSettings() {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            settings = { ...settings, ...JSON.parse(stored) };
        }
    }
    
    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    
    // --- UI: EXTENSIONS MENU ---
    function addSettingsPanel() {
        const container = $('#extensions_settings');
        if (container.length === 0) return;
        
        // Look for existing panel to avoid duplicates
        if ($('#loregraph-settings-panel').length > 0) return;

        const panelHtml = `
            <div id="loregraph-settings-panel" class="settings_block">
                <h3>LoreGraph Configuration</h3>
                <div class="styled_group">
                    <label>Google Gemini API Key</label>
                    <input id="loregraph_apikey" type="password" class="text_pole" placeholder="AIzaSy..." value="${settings.apiKey || ''}" />
                    
                    <label>Model</label>
                    <select id="loregraph_model" class="text_pole">
                        <option value="gemini-2.5-flash" ${settings.model === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash (Recommended)</option>
                        <option value="gemini-1.5-pro" ${settings.model === 'gemini-1.5-pro' ? 'selected' : ''}>Gemini 1.5 Pro</option>
                    </select>
                    
                    <div class="checkbox_label" style="margin-top:10px;">
                        <input id="loregraph_autoinject" type="checkbox" ${settings.autoInject ? 'checked' : ''} />
                        <label for="loregraph_autoinject">Auto-Inject Memory into Prompt</label>
                    </div>
                    <small style="display:block; margin-top:5px; color:#aaa;">
                        When enabled, the relationship graph summary is automatically added to the AI's context.
                    </small>
                    
                    <div style="margin-top:10px;">
                        <button id="loregraph_save_btn" class="menu_button">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
        
        // Append to the settings area
        // SillyTavern extensions list is dynamic, we try to find our slot
        // A robust way is to append to the bottom of the container
        container.append(panelHtml);
        
        // Event Listeners
        $('#loregraph_save_btn').on('click', () => {
            settings.apiKey = $('#loregraph_apikey').val();
            settings.model = $('#loregraph_model').val();
            settings.autoInject = $('#loregraph_autoinject').is(':checked');
            saveSettings();
            toastr.success('LoreGraph settings saved!');
            
            // If graph is open, update it live
            if(graphWindow) {
                sendToGraph('CONFIG', { apiKey: settings.apiKey });
            }
        });
    }

    // --- UI: TOOLBAR BUTTON ---
    function addToolbarButton() {
        // Check for Quick Access Bar or Top Bar
        // SillyTavern UI structure changes, usually #top-bar or .quick-access
        // We'll add to the "Magic Wand" area if possible, or just the top bar.
        
        if ($('#loregraph-toolbar-btn').length > 0) return;
        
        const btnHtml = `
            <div id="loregraph-toolbar-btn" class="menu_button fa-solid fa-circle-nodes" title="Open LoreGraph" style="cursor: pointer; margin-left: 5px;"></div>
        `;
        
        // Try adding near the extensions button in top bar
        const target = $('#extensions_button');
        if (target.length) {
            target.after(btnHtml);
        } else {
            // Fallback
            $('body').append(`<div id="loregraph-toolbar-btn" style="position:fixed; top:10px; right:10px; z-index:2000; background:#222; padding:10px; border-radius:50%;" class="fa-solid fa-circle-nodes"></div>`);
        }
        
        $('#loregraph-toolbar-btn').on('click', openGraphWindow);
    }

    // --- GRAPH WINDOW ---
    function openGraphWindow() {
        // Create iframe container if not exists
        const iframeUrl = 'extensions/LoreGraph/index.html';
        
        // Using SillyTavern's generic popup logic if available, or standard jQuery dialog
        // We'll use a unique ID to prevent multiples
        const dialogId = 'loregraph-dialog';
        
        if ($('#' + dialogId).length) {
            $('#' + dialogId).parent().show();
            $('#' + dialogId).dialog('open');
            return;
        }
        
        const html = `<iframe id="loregraph-frame" src="${iframeUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
        
        const dialog = $(`<div id="${dialogId}" title="LoreGraph Monitor">${html}</div>`).dialog({
            width: 1000,
            height: 700,
            autoOpen: true,
            modal: false,
            resizeable: true,
            close: function() {
                // Just hide, don't destroy so state persists
                // $(this).dialog('destroy').remove(); 
            }
        });
        
        graphWindow = document.getElementById('loregraph-frame');
    }
    
    function sendToGraph(type, payload) {
        if (graphWindow && graphWindow.contentWindow) {
            graphWindow.contentWindow.postMessage({ type, ...payload }, '*');
        }
    }

    // --- MESSAGE HANDLING ---
    
    // 1. Receive Messages from SillyTavern Chat
    function onChatUpdate(data) {
        // 'data' usually contains the message object
        if (data && data.mes && graphWindow) {
            sendToGraph('NEW_CONTEXT', { 
                text: `${data.name}: ${data.mes}` 
            });
        }
    }
    
    // 2. Receive Memory Block from Graph (via postMessage)
    window.addEventListener('message', (event) => {
        const data = event.data;
        
        // Initial Handshake
        if (data.type === 'LOREGRAPH_READY') {
            if(settings.apiKey) {
                sendToGraph('CONFIG', { apiKey: settings.apiKey });
            }
        }
        
        // Memory Update
        if (data.type === 'LOREGRAPH_EXPORT') {
            currentMemoryBlock = data.summary;
            console.log('[LoreGraph] Memory Updated:', currentMemoryBlock.length, 'chars');
            if(settings.autoInject) {
                toastr.info('LoreGraph Memory Updated');
            }
        }
    });

    // --- PROMPT INJECTION (THE MAGIC) ---
    function injectMemoryIntoPrompt(payload) {
        if (!settings.autoInject || !currentMemoryBlock) return;
        
        // payload is the prompt string or array sent to LLM
        // We append our memory block to the system prompt or description
        
        // SillyTavern Prompt Extensions API usually works by modifying the extension_prompt
        // Check if 'extension_prompt' exists in payload (depending on ST version API)
        
        // Standard ST Hook: "chat_completion_source_prompt_wrapper"
        // But here we are just a function called by the hook.
        
        // Add to the "After Scenario" or "Author's Note" slot conceptually
        const injection = `\n\n[Relationship Graph State]:\n${currentMemoryBlock}\n`;
        
        // If payload is string
        if (typeof payload === 'string') {
            return payload + injection;
        }
        return payload; // Fallback
    }

    // --- INITIALIZATION ---
    $(document).ready(function() {
        loadSettings();
        
        // Wait a bit for ST to load extensions UI
        setTimeout(() => {
            addSettingsPanel();
            addToolbarButton();
        }, 2000);
        
        // Register Slash Command
        if (window.SlashCommandParser) {
            window.SlashCommandParser.addCommandObject(
                window.SlashCommandParser.createCommandObject(
                    'loregraph', {
                        function: (args, val) => { openGraphWindow(); return ""; },
                        helpString: "Open LoreGraph"
                    }
                )
            );
        }
        
        // Hook Events
        if (window.eventSource) {
            window.eventSource.on(window.event_types.MESSAGE_RECEIVED, onChatUpdate);
            window.eventSource.on(window.event_types.CHAT_CHANGED, () => {
                sendToGraph('RESET', {});
            });
        }
        
        console.log('[LoreGraph] Loaded.');
    });
    
    // Register Prompt Hook (SillyTavern Specific)
    // This part depends heavily on ST version. 
    // We try to push to the global extension_prompts array if it exists
    if (window.extension_prompts) {
        window.extension_prompts.push((data) => {
            if(settings.autoInject && currentMemoryBlock) {
                // Inject into 'after_scenario' or just return text to append
                return `\n[LoreGraph Memory]\n${currentMemoryBlock}`;
            }
            return "";
        });
    }

})();