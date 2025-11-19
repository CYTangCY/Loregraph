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

        // CSS for the collapsible header
        const panelHtml = `
            <div id="loregraph-settings-panel" class="settings_block">
                <div id="loregraph_header" style="background-color:rgba(0,0,0,0.2); padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: 5px;">
                    <h3 style="margin:0; display:inline-block;">LoreGraph Configuration</h3>
                    <span style="opacity:0.6;">▼</span>
                </div>
                
                <div id="loregraph_content" class="styled_group" style="display: none; margin-top: 10px; padding: 10px;">
                    
                    <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <button id="loregraph_open_btn_internal" class="menu_button" style="width: 100%; font-weight: bold; padding: 10px;">
                            <i class="fa-solid fa-diagram-project"></i> Open Graph Window
                        </button>
                        <small style="display:block; text-align:center; margin-top:5px; color:#aaa;">
                            Click here if the toolbar button is missing.
                        </small>
                    </div>

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
        container.append(panelHtml);
        
        // Collapsible Logic
        $('#loregraph_header').on('click', function() {
            $('#loregraph_content').slideToggle();
            const icon = $(this).find('span');
            icon.text(icon.text() === '▼' ? '▲' : '▼');
        });

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

        // Internal Open Button
        $('#loregraph_open_btn_internal').on('click', openGraphWindow);
    }

    // --- UI: TOOLBAR BUTTON ---
    function addToolbarButton() {
        if ($('#loregraph-toolbar-btn').length > 0) return;
        
        const btnHtml = `
            <div id="loregraph-toolbar-btn" class="menu_button fa-solid fa-circle-nodes" title="Open LoreGraph" style="cursor: pointer; margin-left: 5px; order: 99;"></div>
        `;
        
        // Strategy 1: Extensions Button (Top Bar)
        let target = $('#extensions_button');
        
        // Strategy 2: Quick Access Bar (if configured)
        if (target.length === 0) {
            target = $('.quick-access-bar'); // Common container class
        }

        // Strategy 3: Top Bar container
        if (target.length === 0) {
            target = $('#top-bar');
        }
        
        if (target.length) {
            target.after(btnHtml);
        } else {
            // Fallback: Fixed Position (Last Resort)
            console.warn("[LoreGraph] Could not find toolbar. Using floating button.");
            $('body').append(`<div id="loregraph-toolbar-btn" style="position:fixed; top:50px; right:10px; z-index:2000; background:rgba(0,0,0,0.5); padding:10px; border-radius:50%; border: 1px solid #444;" class="fa-solid fa-circle-nodes" title="Open LoreGraph"></div>`);
        }
        
        $('#loregraph-toolbar-btn').on('click', openGraphWindow);
    }

    // --- GRAPH WINDOW ---
    function openGraphWindow() {
        // Create iframe container if not exists
        const iframeUrl = 'extensions/LoreGraph/index.html';
        const dialogId = 'loregraph-dialog';
        
        if ($('#' + dialogId).length) {
            // If utilizing jQuery UI dialog
            if ($('#' + dialogId).dialog('isOpen') !== true) {
                $('#' + dialogId).dialog('open');
            }
            $('#' + dialogId).parent().show(); // Safety for hidden elements
            return;
        }
        
        const html = `<iframe id="loregraph-frame" src="${iframeUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
        
        // Use SillyTavern's global popup/dialog system if possible, otherwise generic jQuery UI
        // We construct a robust dialog here
        const dialog = $(`<div id="${dialogId}" title="LoreGraph Monitor" style="overflow:hidden; padding:0;">${html}</div>`).dialog({
            width: window.innerWidth * 0.8,
            height: window.innerHeight * 0.8,
            autoOpen: true,
            modal: false,
            resizable: true,
            draggable: true,
            create: function() {
                // Make it look like ST window
                $(this).parent().css({ 'z-index': 2000, 'position': 'fixed' });
            },
            close: function() {
                // Just hide logic handled by dialog
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
        if (data && data.mes && graphWindow) {
            // Determine name (User vs Character)
            const isUser = data.is_user;
            const name = isUser ? "User" : (data.name || "Character");
            
            sendToGraph('NEW_CONTEXT', { 
                text: `${name}: ${data.mes}` 
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
            if(settings.autoInject) {
                // Optional: Toast notification
                // toastr.info('LoreGraph Memory Updated');
            }
        }
    });

    // --- INITIALIZATION ---
    $(document).ready(function() {
        loadSettings();
        
        // Delay UI injection slightly to ensure ST DOM is ready
        setTimeout(() => {
            addSettingsPanel();
            addToolbarButton();
        }, 1000);
        
        // Register Slash Command
        if (window.SlashCommandParser) {
            window.SlashCommandParser.addCommandObject(
                window.SlashCommandParser.createCommandObject(
                    'loregraph', {
                        function: (args, val) => { openGraphWindow(); return ""; },
                        helpString: "Open LoreGraph Window"
                    }
                )
            );
        }
        
        // Hook Chat Events
        if (window.eventSource) {
            // New Message
            window.eventSource.on(window.event_types.MESSAGE_RECEIVED, onChatUpdate);
            // Chat Changed / Cleared
            window.eventSource.on(window.event_types.CHAT_CHANGED, () => {
                sendToGraph('RESET', {});
            });
        }
        
        console.log('[LoreGraph] Loaded.');
    });
    
    // --- PROMPT INJECTION HOOK ---
    // This injects the memory into the prompt before it goes to the LLM
    if (window.extension_prompts) {
        window.extension_prompts.push((data) => {
            if(settings.autoInject && currentMemoryBlock) {
                return `\n\n[Relationship Graph State]:\n${currentMemoryBlock}`;
            }
            return "";
        });
    }

})();
