/**
 * LoreGraph Extension for SillyTavern
 * Handles UI Integration, Settings, and Two-Way Memory Sync
 */

(function() {
    const EXTENSION_NAME = "LoreGraph";
    const SETTINGS_KEY = "loregraph_settings";
    
    // Locate the extension folder path dynamically
    const scriptPath = document.currentScript ? document.currentScript.src : null;
    const extensionRoot = scriptPath ? scriptPath.substring(0, scriptPath.lastIndexOf('/')) : 'extensions/LoreGraph';
    
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
    
    // --- UI: EXTENSIONS MENU (Collapsible) ---
    function addSettingsPanel() {
        const container = $('#extensions_settings');
        if (container.length === 0) return;
        
        // Avoid duplicates
        if ($('#loregraph-settings-panel').length > 0) return;

        const panelHtml = `
            <div id="loregraph-settings-panel" class="settings_block">
                <div class="loregraph_header styled_header_bar">
                    <h3>LoreGraph Configuration</h3>
                    <span class="indicator">▼</span>
                </div>
                
                <div class="loregraph_content" style="display: none; padding: 10px; border: 1px solid rgba(255,255,255,0.1); border-top: none;">
                    
                    <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <div class="menu_button" id="loregraph_open_btn_internal" style="width: 90%; margin: 0 auto;">
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
                        <option value="gemini-1.5-pro" ${settings.model === 'gemini-1.5-pro' ? 'selected' : ''}>Gemini 1.5 Pro</option>
                    </select>
                    
                    <div style="margin-top:10px; display:flex; align-items:center;">
                        <input id="loregraph_autoinject" type="checkbox" ${settings.autoInject ? 'checked' : ''} />
                        <label for="loregraph_autoinject" style="margin-left:10px;">Auto-Inject Memory into Prompt</label>
                    </div>
                    <small style="display:block; margin-top:5px; color:#aaa; font-style:italic;">
                        Automatically adds the relationship summary to the AI's context.
                    </small>
                    
                    <div style="margin-top:15px; text-align:right;">
                        <div id="loregraph_save_btn" class="menu_button">Save Settings</div>
                    </div>
                </div>
            </div>
        `;
        
        container.append(panelHtml);
    }
    
    // Event Delegation for Settings UI
    $(document).on('click', '#loregraph-settings-panel .loregraph_header', function() {
        const content = $(this).next('.loregraph_content');
        content.slideToggle(200);
        const icon = $(this).find('.indicator');
        // Simple toggle visual
        setTimeout(() => icon.text(content.is(':visible') ? '▲' : '▼'), 200);
    });

    $(document).on('click', '#loregraph_save_btn', function() {
        settings.apiKey = $('#loregraph_apikey').val();
        settings.model = $('#loregraph_model').val();
        settings.autoInject = $('#loregraph_autoinject').is(':checked');
        saveSettings();
        toastr.success('LoreGraph settings saved!');
        if(graphWindow) {
            sendToGraph('CONFIG', { apiKey: settings.apiKey });
        }
    });

    $(document).on('click', '#loregraph_open_btn_internal', function() {
        openGraphWindow();
    });


    // --- UI: MAGIC WAND / TOOLS MENU INJECTION ---
    function addToolsMenuItem() {
        // We look for the container that holds standard tools. 
        // Usually identified by ID #extensions_menu or classes containing list items.
        // We use #token_counter as a reference point since it is standard.
        
        if ($('#loregraph_tool_item').length > 0) return;

        const menuItemHtml = `
            <li id="loregraph_tool_item" class="list-group-item">
                <div class="loregraph-menu-link" style="cursor: pointer; display: flex; align-items: center;">
                    <span class="fa-solid fa-circle-nodes" style="margin-right: 10px; width: 20px; text-align: center;"></span>
                    <span>Open LoreGraph</span>
                </div>
            </li>
        `;

        // Strategy: Find the parent of 'Token Counter' or 'Open Data Bank'
        // This ensures we are in the correct "Magic Wand" dropdown list
        let anchor = $('#token_counter').closest('ul') || $('#token_counter').closest('.list-group');
        
        if (anchor.length === 0) {
             anchor = $('#databank_button').closest('ul');
        }

        if (anchor.length > 0) {
            anchor.append(menuItemHtml);
            
            // Bind click
            $('#loregraph_tool_item').on('click', function() {
                // Close the dropdown if possible (ST usually handles this, but just in case)
                // $(this).closest('.dropdown-menu').removeClass('show'); 
                openGraphWindow();
            });
        } else {
            console.warn("[LoreGraph] Could not find Magic Wand menu list. Using fallback toolbar button.");
            addFallbackToolbarButton();
        }
    }
    
    function addFallbackToolbarButton() {
        if ($('#loregraph-toolbar-btn').length > 0) return;
        const btnHtml = `
            <div id="loregraph-toolbar-btn" class="menu_button fa-solid fa-circle-nodes" title="Open LoreGraph" style="cursor: pointer; margin-left: 5px;"></div>
        `;
        // Try adding to top bar if Magic Wand fails
        const topBar = $('#top-bar') || $('.quick-access-bar');
        if (topBar.length) {
            topBar.append(btnHtml);
            $('#loregraph-toolbar-btn').on('click', openGraphWindow);
        }
    }

    // --- GRAPH WINDOW ---
    function openGraphWindow() {
        const iframeUrl = `${extensionRoot}/index.html`;
        const dialogId = 'loregraph-dialog';
        
        // Check if already open
        if ($('#' + dialogId).length) {
            if ($('#' + dialogId).dialog('isOpen') !== true) {
                $('#' + dialogId).dialog('open');
            }
            $('#' + dialogId).parent().show();
            return;
        }
        
        const html = `<iframe id="loregraph-frame" src="${iframeUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
        
        // Create Dialog
        $(`<div id="${dialogId}" title="LoreGraph Monitor" style="overflow:hidden; padding:0;">${html}</div>`).dialog({
            width: Math.min(window.innerWidth * 0.9, 1200),
            height: Math.min(window.innerHeight * 0.8, 800),
            autoOpen: true,
            modal: false,
            resizable: true,
            draggable: true,
            closeOnEscape: false,
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

    // --- MESSAGE HANDLING ---
    function onChatUpdate(data) {
        if (data && data.mes && graphWindow) {
            const isUser = data.is_user;
            const name = isUser ? "User" : (data.name || "Character");
            sendToGraph('NEW_CONTEXT', { 
                text: `${name}: ${data.mes}` 
            });
        }
    }
    
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'LOREGRAPH_READY') {
            if(settings.apiKey) {
                sendToGraph('CONFIG', { apiKey: settings.apiKey });
            }
        }
        if (data.type === 'LOREGRAPH_EXPORT') {
            currentMemoryBlock = data.summary;
        }
    });

    // --- INITIALIZATION ---
    $(document).ready(function() {
        loadSettings();
        
        // Wait for UI to settle
        setTimeout(() => {
            addSettingsPanel();
            addToolsMenuItem(); // Inject into Magic Wand menu
        }, 2000);
        
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
        
        if (window.eventSource) {
            window.eventSource.on(window.event_types.MESSAGE_RECEIVED, onChatUpdate);
            window.eventSource.on(window.event_types.CHAT_CHANGED, () => {
                sendToGraph('RESET', {});
            });
        }
        
        console.log('[LoreGraph] Loaded.');
    });
    
    // --- PROMPT INJECTION HOOK ---
    if (window.extension_prompts) {
        window.extension_prompts.push((data) => {
            if(settings.autoInject && currentMemoryBlock) {
                return `\n\n[Relationship Graph State]:\n${currentMemoryBlock}`;
            }
            return "";
        });
    }

})();
