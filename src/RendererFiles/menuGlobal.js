const CommandKind = {
  None: 0,
  Submenu: 1,
  Copy: 2,
  CopyAbsolutePath: 3,
  Cut: 4,
  Paste: 5,
  NewFile_Directory: 6,
  NewFile_File: 7,
  DeleteFile_Directory: 8,
  DeleteFile_File: 9,
  RenameFile_Directory: 10,
  RenameFile_File: 11,
  Find: 12,
};

/**
 * This needs to wrap the list.js?
 */
class MenuOption {
    commandKind = CommandKind.None;
    text = '';
    /**
     * If submenu is not null, the commandKind will be overriden to be CommandKind.Submenu
     * @type {MenuOption[]}
     */
    submenu = null;

    /**
     * @param {CommandKind.None} commandKind 
     * @param {string} text 
     * @param {MenuOption[]} submenu If submenu is not null, the commandKind will be overriden to be CommandKind.Submenu
     */
    constructor(commandKind, text, submenu) {
        this.commandKind = commandKind;
        this.text = text;
        if (submenu) {
            this.submenu = submenu;
        }
    }
}

let recentBoundingClientRectTop = null;
/**
 * TODO: You need to move this to 'MENU_onMouseMove_WRAPIT(...)' and pass it to 'MENU_onMouseMove' in some way that remembers the state during the throttle or whatever I can't word it right now but I understand that it is wrong and why it is but I'm too tired to write the fix.
 */
let recentBoundingClientRectTop_ID = null;

let MENU_onMouseMove_timer = null;
let MENU_onMouseMove_event = null;

let MENU_context = null;
let MENU_target = null;
let MENU_restoreFocusToElement = null;
let MENU_cursorIndex = 0;

// TODO: maybe the menu should always be empty, and just be some div that moves left top positions and you can put anything you want in it.

/* a delegate of kind: () => {} */
let MENU_onHideAction = null;

function menuHide(shouldRestoreFocus) {
    const menu = document.getElementById('MENU');

    MENU_removeEvents();

    if (MENU_onHideAction) {
        MENU_onHideAction();
    }
    
    // TODO: menu.innerHTML is "somewhat" inefficient because it triggers HTML parser or something but should be localized right?
    menu.innerHTML = '';

    MENU_context = null;
    MENU_target = null;

    if (menu.style.visibility !== 'hidden') {
        menu.style.visibility = 'hidden';

        recentBoundingClientRectTop = null;
        recentBoundingClientRectTop_ID++;

        if (MENU_restoreFocusToElement) {
            if (shouldRestoreFocus) {
                MENU_restoreFocusToElement.focus();
            }
            MENU_restoreFocusToElement = null;
        }
    }
}

/**
 * TODO: Why am I separating 'menuSet' and 'menuShow'?
 * @param {*} context 
 * @param {*} target 
 * @param {*} optionList 
 * @param {*} left 
 * @param {*} top 
 * @param {*} NOTshouldFocus 
 * @param {*} index 
 */
function menuSet(context, target, optionList, left, top, NOTshouldFocus, index, onHideAction) {

    MENU_onHideAction = onHideAction;

    // When rendering the menu, you need to preferably NOT use getBoundingClientRect
    // but instead have a cached value.
    //
    // And invalidate the cache under certain scenarios.
    //
    const menuElement = document.getElementById('MENU');

    if (menuElement.style.visibility !== 'hidden') {
        menuHide(/*shouldRestoreFocus*/ false);
    }

    if (menuElement.style.visibility === 'hidden') {
        menuElement.style.visibility = '';

        if (menuElement.children.length === 0) {
            if (optionList && optionList.length > 0) {
                let virtualizationBoundary = document.createElement('div');
                virtualizationBoundary.id = "MENU_virtualizationBoundary";
                let cursor = document.createElement('div');
                cursor.id = "MENU_cursor";
                let optionListElement = document.createElement('div');
                optionListElement.id = "MENU_optionList";
                menuElement.appendChild(virtualizationBoundary);
                menuElement.appendChild(cursor);
                menuElement.appendChild(optionListElement);
                MENU_removeEvents(); // I'm 99% sure this invocation isn't needed here but I just can't do this right now.
                MENU_addEvents();
                for (var i = 0; i < optionList.length; i++) {
                    const entry = optionList[i];
                    const optionElement = document.createElement('div');
                    optionElement.className = 'menuOption';
                    optionElement.innerText = entry.text;

                    if (entry.submenu) {
                        optionElement.setAttribute("data-command-kind", CommandKind.Submenu);
                        optionElement.innerText += '>';
                    }
                    else {
                        optionElement.setAttribute("data-command-kind", entry.commandKind);
                    }

                    optionListElement.appendChild(optionElement);
                }
            }
        }
    }

    if (!index) {
        index = 0;
        if (MENU_cursorIndex !== index) {
            MENU_setCursorIndex(index);
        }
    }

    recentBoundingClientRectTop = null;
    recentBoundingClientRectTop_ID++;

    MENU_context = context;
    MENU_target = target;
    
    menuElement.style.left = left + 'px';
    menuElement.style.top = top + 'px';

    MENU_restoreFocusToElement = document.activeElement;

    if (!NOTshouldFocus) {
        menuElement.focus();
    }
}

function MENU_onMouseMove_WRAPIT(event) {
	MENU_onMouseMove_event = event;
    if (!MENU_onMouseMove_timer) {
    	MENU_onMouseMove(event);
        MENU_onMouseMove_timer = setTimeout(MENU_onMouseMove_timeoutFunc, 90);
    }
}

function MENU_onMouseMove_timeoutFunc(event) {
    if (/*trailing && lastArgs*/ MENU_onMouseMove_event) {
        MENU_onMouseMove(MENU_onMouseMove_event);
        MENU_onMouseMove_event = null;
        MENU_onMouseMove_timer = setTimeout(MENU_onMouseMove_timeoutFunc, 90);
    } else {
        MENU_onMouseMove_timer = null;
    }
}

// TODO: I know this kinda is a mess but I'm all over the place right now and just trying to force some progress
function MENU_onMouseMove(event) {
    const MENU_optionListElement = document.getElementById('MENU_optionList');
    if (!MENU_optionListElement) {
    	return;
    }

	const local_recentBoundingClientRectTop_ID = recentBoundingClientRectTop_ID;
    if (local_recentBoundingClientRectTop_ID != recentBoundingClientRectTop_ID)
        return;
    if (!recentBoundingClientRectTop) {
        recentBoundingClientRectTop = MENU_optionListElement.getBoundingClientRect().top;
    }
    
    const { indexClicked, elementClicked } = menuGetRelativeMouseEventData(event, recentBoundingClientRectTop, MENU_optionListElement);
    MENU_setCursorIndex(indexClicked);
}

async function optionOnClick(indexClicked, elementClicked) {
    switch (MENU_context) {
        case 'EXPLORER':
            await EXPLORER_MenuOnClick(indexClicked, elementClicked);
            break;
        case 'EDITOR':
            await EDITOR_MenuOnClick(indexClicked, elementClicked);
            break;
        case 'EXPLORER_pickFolderOrWorkspaceButton':
            await EXPLORER_pickFolderOrWorkspaceButton_MenuOnClick(indexClicked, elementClicked);
            break;
    }
    menuHide(/*shouldRestoreFocus*/ true);
}

// padding, mouse events?

function menuGetRelativeMouseEventData(event, top) {

    const MENU_optionListElement = document.getElementById('MENU_optionList');
    if (!MENU_optionListElement) {
    	return;
    }

    let relativeY = event.clientY - top;
    let sumHeight = 4; // The menu 'padding-top: 4px'
    let indexClicked = -1;
    let elementClicked = null;

    for (var i = 0; i < MENU_optionListElement.children.length; i++) {
        let nodeElement = MENU_optionListElement.children[i];

        if ((sumHeight += nodeElement.clientHeight) >= relativeY) {
            elementClicked = nodeElement;
            indexClicked = i;
            break;
        }
    }

    return {
        indexClicked: indexClicked,
        elementClicked: elementClicked
    };
}

function MENU_init() {
    menuHide();
}

function MENU_addEvents() {
    let menu = document.getElementById('MENU');
    menu.addEventListener('blur', menuHide);
    menu.addEventListener('click', MENU_onclick);
    menu.addEventListener('keydown', MENU_onKeyDown);
    menu.addEventListener('mousemove', MENU_onMouseMove_WRAPIT);
}

function MENU_removeEvents() {
    let menu = document.getElementById('MENU');
    menu.removeEventListener('blur', menuHide);
    menu.removeEventListener('click', MENU_onclick);
    menu.removeEventListener('keydown', MENU_onKeyDown);
    menu.removeEventListener('mousemove', MENU_onMouseMove_WRAPIT);
}

async function MENU_onclick(event) {
    const MENU_optionListElement = document.getElementById('MENU_optionList');
    if (!MENU_optionListElement) {
    	return;
    }

    let listBoundingClientRect = MENU_optionListElement.getBoundingClientRect();
    let { indexClicked, elementClicked } = menuGetRelativeMouseEventData(event, listBoundingClientRect.top);
    await optionOnClick(indexClicked, elementClicked);
}

// submenus:
// =========
// Add salt to the "MENU" id specifically.
// Then all the inner elements can be specified by the hardcoded index that they reside at within the "MENU" element's child list.

function MENU_setCursorIndex(index) {
    const cursorElement = document.getElementById('MENU_cursor');
     // The menu 'padding-top: 4px'
    cursorElement.style.top = 4 + (APP_lineHeight * index) + 'px';
    MENU_cursorIndex = index;
}

function MENU_validateCursor() {
    const MENU_optionListElement = document.getElementById('MENU_optionList');
    if (!MENU_optionListElement) {
    	return;
    }

    if (MENU_cursorIndex >= MENU_optionListElement.children.length) {
        if (MENU_optionListElement.children.length > 0) {
            MENU_setCursorIndex(MENU_optionListElement.children.length - 1);
        }
        else {
            MENU_setCursorIndex(0);
        }
        return;
    }
    else if (MENU_cursorIndex < 0) {
        MENU_cursorIndex = 0;
    }
}

function MENU_onKeyDown(event) {
    const MENU_optionListElement = document.getElementById('MENU_optionList');
    if (!MENU_optionListElement) {
    	return;
    }
    
    MENU_validateCursor();
    if (MENU_optionListElement.children.length === 0) return;

    switch (event.key) {
        case 'ArrowDown':
            if (MENU_cursorIndex < MENU_optionListElement.children.length - 1) {
                MENU_setCursorIndex(MENU_cursorIndex + 1);
            }
            break;
        case 'ArrowUp':
            if (MENU_cursorIndex > 0) {
                MENU_setCursorIndex(MENU_cursorIndex - 1);
            }
            break;
        case 'Escape':
            menuHide(/*shouldRestoreFocus*/ true);
            break;
        case 'Enter':
        case ' ':
            return optionOnClick(MENU_cursorIndex, MENU_optionListElement.children[MENU_cursorIndex], MENU_optionListElement);
    }
}

// Is blur event guaranteed if you click something other than the menu?
//
// ... in my app it seems to be guaranteed.
// but you no longer eat the mousedown event...
//
/*function listenHandlerToCloseMenu(event) {
    if (event.target.id === 'MENU_virtualizationBoundary' ||
        event.target.id === 'MENU_cursor' ||
        event.target.id === 'MENU_optionList' ||
        event.target.className === 'menuOption') {

        return;
    }
    event.preventDefault();
    event.stopPropagation();
    menuHide();
}*/
/*
//let bodyElement = document.getElementById('ROOT');
//bodyElement.removeEventListener('mousedown', listenHandlerToCloseMenu, /*useCapturing*//* true);
*/
/*
// Is blur event guaranteed if you click something other than the menu?
//
// ... in my app it seems to be guaranteed.
// but you no longer eat the mousedown event...
//
//let bodyElement = document.getElementById('ROOT');
//bodyElement.addEventListener('mousedown', listenHandlerToCloseMenu, /*useCapturing*//* true);
*/
