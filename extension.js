/**
 * LoreGraph Extension for SillyTavern
 * Handles UI Integration, Settings, and Two-Way Memory Sync
 */

(function() {
    const EXTENSION_NAME = "LoreGraph";
    const SETTINGS_KEY = "loregraph_settings";
    
    // --- PATH DETECTION (CRITICAL FIX for 404) ---
    function getExtensionPath() {
        // Scan all scripts to find the one containing 'extension.js' and 'LoreGraph' in the path
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].src;
            if (src && (src.indexOf('LoreGraph') !== -1 || src.indexOf('loregraph') !== -1)) {
                // Found the script, remove 'extension.js' to get the folder path
                // Handles 'extensions/LoreGraph/extension.js' or 'extensions/LoreGraph-main/extension.js'
                return src.substring(0, src.lastIndexOf('/'));
            }
        }
        // Fallback: Try to guess based on standard folder structure
        return 'extensions/LoreGraph';
    }
    
    const extensionRoot = getExtensionPath();
    console.log('[LoreGraph] Extension Root detected:', extensionRoot);
    
    // Default Settings
    let settings = {
        apiKey: "",
        model: "gemini-2.5-flash",
        autoInject: true
    };
    
    // State
    let currentMemoryBlock = ""; 
    let graphWindow = null; 
    
    // --- SETTINGS ---
    function loadSettings() {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) settings = { ...settings, ...JSON.parse(stored) };
    }
    
    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    
    // --- UI: EXTENSIONS MENU ---
    function addSettingsPanel() {
        const container = $('#extensions_settings');
        if (container.length === 0) return;
        if ($('#loregraph-settings-panel').length > 0) return;

        const panelHtml = `
            <div id="loregraph-settings-panel" class="settings_block">
                <div class="loregraph_header styled_header_bar">
                    <h3>LoreGraph Configuration</h3>
                    <span class="indicator">▼</span>
                </div>
                
                <div class="loregraph_content" style="display: none; padding: 10px; border: 1px solid rgba(255,255,255,0.1); border-top: none;">
                    <div style="margin-bottom: 15px; text-align: center;">
                        <div class="menu_button" id="loregraph_open_btn_internal" style="width: 90%; margin: 0 auto; font-weight:bold;">
                            <i class="fa-solid fa-diagram-project"></i> Open Graph Window
                        </div>
                    </div>

                    <label>Google Gemini API Key</label>
                    <div class="text_pole">
                        <input id="loregraph_apikey" type="password" class="text_pole" placeholder="AIzaSy..." value="${settings.apiKey || ''}" style="width:100%;" />
                    </div>
                    
                    <label>Model</label>
                    <select id="loregraph_model" class="text_pole" style="width:100%;">
                        <option value="gemini-2.5-flash" ${settings.model === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash (Recommended)</option>
                    </select>
                    
                    <div style="margin-top:10px; display:flex; align-items:center;">
                        <input id="loregraph_autoinject" type="checkbox" ${settings.autoInject ? 'checked' : ''} />
                        <label for="loregraph_autoinject" style="margin-left:10px;">Auto-Inject Memory into Prompt</label>
                    </div>
                    
                    <div style="margin-top:15px; text-align:right;">
                        <div id="loregraph_save_btn" class="menu_button">Save Settings</div>
                    </div>
                </div>
            </div>
        `;
        
        container.append(panelHtml);
    }
    
    // Global Event Delegation
    $(document).on('click', '#loregraph-settings-panel .loregraph_header', function() {
        const content = $(this).next('.loregraph_content');
        content.slideToggle(200);
        const icon = $(this).find('.indicator');
        setTimeout(() => icon.text(content.is(':visible') ? '▲' : '▼'), 200);
    });

    $(document).on('click', '#loregraph_save_btn', function() {
        settings.apiKey = $('#loregraph_apikey').val();
        settings.model = $('#loregraph_model').val();
        settings.autoInject = $('#loregraph_autoinject').is(':checked');
        saveSettings();
        toastr.success('LoreGraph settings saved!');
        if(graphWindow) sendToGraph('CONFIG', { apiKey: settings.apiKey });
    });

    $(document).on('click', '#loregraph_open_btn_internal', function() {
        openGraphWindow();
    });

    // --- UI: MAGIC WAND INJECTION ---
    function addToolsMenuItem() {
        if ($('#loregraph_tool_item').length > 0) return;

        const menuItemHtml = `
            <li id="loregraph_tool_item" class="list-group-item">
                <div class="loregraph-menu-link" style="cursor: pointer; display: flex; align-items: center;">
                    <span class="fa-solid fa-circle-nodes" style="margin-right: 10px; width: 20px; text-align: center;"></span>
                    <span>Open LoreGraph</span>
                </div>
            </li>
        `;

        // Try to find the Token Counter to place ourselves next to it
        let target = $('#token_counter');
        if (target.length > 0) {
            target.closest('li').after(menuItemHtml);
        } else {
            // Fallback to just appending to the first list group found in extensions menu or tools
            $('.list-group').first().append(menuItemHtml);
        }
        
        $('#loregraph_tool_item').on('click', function() {
            openGraphWindow();
        });
    }

    // --- GRAPH WINDOW ---
    function openGraphWindow() {
        const iframeUrl = `${extensionRoot}/index.html`;
        const dialogId = 'loregraph-dialog';
        
        if ($('#' + dialogId).length) {
            if ($('#' + dialogId).dialog('isOpen') !== true) $('#' + dialogId).dialog('open');
            return;
        }
        
        const html = `<iframe id="loregraph-frame" src="${iframeUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
        
        $(`<div id="${dialogId}" title="LoreGraph Monitor" style="overflow:hidden; padding:0;">${html}</div>`).dialog({
            width: Math.min(window.innerWidth * 0.9, 1200),
            height: Math.min(window.innerHeight * 0.8, 800),
            autoOpen: true,
            resizable: true,
            create: function() {
                $(this).parent().css({ 'z-index': 2001, 'position': 'fixed' });
            }
        });
        
        graphWindow = document.getElementById('loregraph-frame');
    }
    
    function sendToGraph(type, payload) {
        if (graphWindow && graphWindow.contentWindow) {
            graphWindow.contentWindow.postMessage({ type, ...payload }, '*');
        }
    }

    function onChatUpdate(data) {
        if (data && data.mes && graphWindow) {
            const isUser = data.is_user;
            const name = isUser ? "User" : (data.name || "Character");
            sendToGraph('NEW_CONTEXT', { text: `${name}: ${data.mes}` });
        }
    }
    
    window.addEventListener('message', (event) => {
        if (event.data.type === 'LOREGRAPH_READY' && settings.apiKey) {
            sendToGraph('CONFIG', { apiKey: settings.apiKey });
        }
        if (event.data.type === 'LOREGRAPH_EXPORT') {
            currentMemoryBlock = event.data.summary;
        }
    });

    $(document).ready(function() {
        loadSettings();
        // Wait for SillyTavern to render extensions list
        setTimeout(() => {
            addSettingsPanel();
            addToolsMenuItem();
        }, 1500);
        
        if (window.SlashCommandParser) {
            window.SlashCommandParser.addCommandObject(
                window.SlashCommandParser.createCommandObject('loregraph', {
                    function: () => { openGraphWindow(); return ""; },
                    helpString: "Open LoreGraph Window"
                })
            );
        }
        
        if (window.eventSource) {
            window.eventSource.on(window.event_types.MESSAGE_RECEIVED, onChatUpdate);
            window.eventSource.on(window.event_types.CHAT_CHANGED, () => sendToGraph('RESET', {}));
        }
    });
    
    if (window.extension_prompts) {
        window.extension_prompts.push(() => {
            if(settings.autoInject && currentMemoryBlock) {
                return `\n\n[Relationship Graph State]:\n${currentMemoryBlock}`;
            }
            return "";
        });
    }

})();