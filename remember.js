
const WidgetKind = {
    None: 0,
    InputText: 1,
    YesCancel: 2,
};

let WIDGET_currentWidgetKind = WidgetKind.None;
/** A delegate of the form: async ({ isCancelled = false, value = '' }) => {}; */
let WIDGET_currentCallback = null;
let WIDGET_restoreFocusToElement = null;
let WIDGET_left = 0;
let WIDGET_top = 0;

// The variable 'WIDGET_element' is "implicitly" being accessed here.
document.getElementById('WIDGET').style.visibility = 'hidden';

// You aren't focusing the widget element itself so blur likely won't work.
//WIDGET_element.addEventListener('focusout', () => WIDGET_hide());

function WIDGET_show(widgetKind, left, top, placeholder, callback) {

    const WIDGET_element = document.getElementById('WIDGET');

    if (WIDGET_currentWidgetKind !== WidgetKind.None) {
        WIDGET_hide(true);
    }
    WIDGET_left = left;
    WIDGET_top = top;
    WIDGET_restoreFocusToElement = document.activeElement;
    WIDGET_currentWidgetKind = widgetKind;
    WIDGET_currentCallback = callback;

    WIDGET_element.style.left = WIDGET_left + 'px';
    WIDGET_element.style.top = WIDGET_top + 'px';
    WIDGET_element.style.visibility = '';

    switch (widgetKind) {
        case WidgetKind.InputText:
            WIDGET_CreateInputText(placeholder);
            break;
        case WidgetKind.YesCancel:
            WIDGET_CreateYesCancel(placeholder);
            break;
    }
}

function WIDGET_hide(shouldRestoreFocus) {

    WIDGET_currentCallback = null;

    const WIDGET_element = document.getElementById('WIDGET');

    switch (WIDGET_currentWidgetKind) {
        case WidgetKind.InputText:
            let input = document.getElementById('WIDGET_inputText');
            input.removeEventListener('keydown', WIDGET_inputTextOnKeyDown);
            break;
        case WidgetKind.YesCancel:
            let yesButtonElement = document.getElementById('WIDGET_YesCancel_yes');
            yesButtonElement.removeEventListener('onclick', WIDGET_YesCancelButtonOnClick_yes);
            let cancelButtonElement = document.getElementById('WIDGET_YesCancel_cancel');
            cancelButtonElement.removeEventListener('onclick', WIDGET_YesCancelButtonOnClick_cancel);
            break;
    }
    WIDGET_element.innerHTML = '';
    WIDGET_element.style.visibility = 'hidden';
    WIDGET_currentWidgetKind = WidgetKind.None;
    if (shouldRestoreFocus && WIDGET_restoreFocusToElement)
        WIDGET_restoreFocusToElement.focus();
}

async function WIDGET_inputTextOnKeyDown(event) {
    if (event.key === 'Enter') {
        let input = document.getElementById('WIDGET_inputText');
        if (WIDGET_currentCallback) {
            await WIDGET_currentCallback({
                isCancelled: false,
                value: input.value
            });
        }
        WIDGET_hide(true);
    }
    else if (event.key === 'Escape') {
        let input = document.getElementById('WIDGET_inputText');
        if (WIDGET_currentCallback) {
            await WIDGET_currentCallback({
                isCancelled: true,
                value: input.value
            });
        }
        WIDGET_hide(true);
    }
}

async function WIDGET_YesCancelButtonOnClick_yes(event) {
    if (WIDGET_currentCallback) {
        await WIDGET_currentCallback({
            isCancelled: false,
            value: 'Yes'
        });
    }
    WIDGET_hide(true);
}

async function WIDGET_YesCancelButtonOnClick_cancel(event) {
    if (WIDGET_currentCallback) {
        await WIDGET_currentCallback({
            isCancelled: true,
            value: 'Cancel'
        });
    }
    WIDGET_hide(true);
}

function WIDGET_CreateInputText(placeholder) {

    const WIDGET_element = document.getElementById('WIDGET');

    if (!placeholder)
        placeholder = '';

    let input = document.createElement('input');
    input.type = "text";
    input.placeholder = placeholder;
    input.id = 'WIDGET_inputText';
    input.addEventListener('keydown', WIDGET_inputTextOnKeyDown.bind(this));
    WIDGET_element.appendChild(input);
    input.focus();
}

function WIDGET_CreateYesCancel(placeholder) {

    const WIDGET_element = document.getElementById('WIDGET');

    if (!placeholder)
        placeholder = '';

    let topDivElement = document.createElement('div');
    topDivElement.innerText = placeholder;

    let bottomDivElement = document.createElement('div');
    let yesButtonElement = document.createElement('button');
    yesButtonElement.innerText = 'Yes';
    yesButtonElement.id = 'WIDGET_YesCancel_yes';
    yesButtonElement.addEventListener('click', WIDGET_YesCancelButtonOnClick_yes);
    bottomDivElement.appendChild(yesButtonElement);
    let cancelButtonElement = document.createElement('button');
    cancelButtonElement.innerText = 'Cancel';
    cancelButtonElement.id = 'WIDGET_YesCancel_cancel';
    cancelButtonElement.addEventListener('click', WIDGET_YesCancelButtonOnClick_cancel);
    bottomDivElement.appendChild(cancelButtonElement);

    WIDGET_element.appendChild(topDivElement);
    WIDGET_element.appendChild(bottomDivElement);
    yesButtonElement.focus();
}


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


const DialogKind = {
    None: "None",
    FindAll: "FindAll",
    Settings: "Settings",
    DocumentSymbol: "DocumentSymbol",
    Debug: "Debug",
};

let DIALOG_currentDialogKind = DialogKind.None;

/** A delegate of the form: () => {} */
let DIALOG_onResizeAction = null;
let DIALOG_restoreFocusToElement = null;

let DIALOG_windowExists = false;

let DIALOG_hasBeenMeaasured = false;

/**
 * defaults to viewport size then getBoundingClientRect says the exact pixels upon trying to resize
 * need to track resizes and store the useragent width/height by the onmousedown and then on resize get proportion and update left top width height.
 */
let DIALOG_left = 0;
let DIALOG_top = 0;
let DIALOG_width = 0;
let DIALOG_height = 0;

let DIALOG_before_X = 0;
let DIALOG_before_Y = 0;

let DIALOG_after_X = 0;
let DIALOG_after_Y = 0;

let DIALOG_FindAll_options_matchWord = false;

let DIALOG_Settings_isDark = true;
let DIALOG_Settings_trueTabs_falseSpaces = true;
let DIALOG_Settings_editorDebugShowAdjacentCharacters = false;

const DIALOG_minTop = 8;
const DIALOG_minLeft = 8;
const DIALOG_minHeight = 100;
const DIALOG_minWidth = 100;

async function DIALOG_show_async(dialogKind, onResizeAction) {
    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    if (DIALOG_currentDialogKind !== DialogKind.None) {
        await DIALOG_hide_async(true);
    }
    DIALOG_restoreFocusToElement = document.activeElement;
    DIALOG_currentDialogKind = dialogKind;
    DIALOG_onResizeAction = onResizeAction;

    DIALOG_element.style.visibility = '';

    DIALOG_createWindow();

    switch (dialogKind) {
        case DialogKind.FindAll:
            return DIALOG_FindAll_Create_async();
        case DialogKind.Settings:
            return DIALOG_Settings_Create_async();
        case DialogKind.DocumentSymbol:
            return DIALOG_DocumentSymbol_Create_async();
        case DialogKind.Debug:
            return DIALOG_Debug_Create_async();
    }
}

async function DIALOG_hide_async(shouldRestoreFocus) {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    switch (DIALOG_currentDialogKind) {
        case DialogKind.FindAll:
            await DIALOG_FindAll_Delete_async();
            break;
        case DialogKind.Settings:
            await DIALOG_Settings_Delete_async();
            break;
        case DialogKind.DocumentSymbol:
            await DIALOG_DocumentSymbol_Delete_async();
            break;
        case DialogKind.Debug:
            await DIALOG_Debug_Delete_async();
            break;
    }

    DIALOG_deleteWindow();

    DIALOG_onResizeAction = null;

    // Don't do this...? if done correctly this won't be an issue. If someone had no events subscribed and wanted to do this themselves they can just do so
    // otherwise you risk memory leaks from unsubscribed events.
    //
    DIALOG_element.innerHTML = '';

    DIALOG_element.style.visibility = 'hidden';
    DIALOG_currentDialogKind = DialogKind.None;
    if (shouldRestoreFocus) {
        if (DIALOG_restoreFocusToElement) {
            DIALOG_restoreFocusToElement.focus();
        }
        DIALOG_restoreFocusToElement = null;
    }
}

async function DIALOG_closeButton_onclick() {
    return DIALOG_hide_async(true);
}

function DIALOG_resize_onmouseenter(event) {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    if (event.buttons & 1) {
        // while resizing you went from one end to the other and it bugged out
        return;
    }

    let resize = document.getElementById('DIALOG_resize');
    if (!resize) return;

    // TODO: cache the bounding client rect
    let dialogBoundingClientRect = DIALOG_element.getBoundingClientRect();

    DIALOG_resize_setCursor(event, dialogBoundingClientRect, resize);
}

/* body and the resize are siblings so the events can't propagate */

function DIALOG_resize_onmousedown(event) {
    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    let resize = document.getElementById('DIALOG_resize');
    if (!resize) return;

    // TODO: cache the bounding client rect
    let dialogBoundingClientRect = DIALOG_element.getBoundingClientRect();

    DIALOG_resize_setCursor(event, dialogBoundingClientRect, resize);

    DIALOG_before_X = event.clientX;
    DIALOG_before_Y = event.clientY;
    DIALOG_after_X = 0;
    DIALOG_after_Y = 0;

    DIALOG_left = dialogBoundingClientRect.left;
    DIALOG_top = dialogBoundingClientRect.top;
    DIALOG_width = dialogBoundingClientRect.width;
    DIALOG_height = dialogBoundingClientRect.height;
    DIALOG_hasBeenMeaasured = true;

    document.body.classList.add('unselectable');
    window.addEventListener('mousemove', DIALOG_resize_body_onmousemove, /*useCapture*/ true);
}

/** does not redraw, only preps the state to be redrawn */
function DIALOG_n_resize_calcOnly(diff_Y, clientY) {
    if (diff_Y < 0) {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_top <= DIALOG_minTop) {
            return; // TODO: ...
        }
        else if (DIALOG_top - absdiff_Y < DIALOG_minTop) {
            clientY += (absdiff_Y - (DIALOG_top - DIALOG_minTop));
            absdiff_Y = DIALOG_top - DIALOG_minTop;
        }
        DIALOG_top -= absdiff_Y;
        DIALOG_height += absdiff_Y;
        DIALOG_before_Y = clientY;
    }
    else {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_height <= DIALOG_minHeight) {
            return; // TODO: ...
        }
        else if (DIALOG_height - absdiff_Y < DIALOG_minHeight) {
            clientY -= (absdiff_Y - (DIALOG_height - DIALOG_minHeight));
            absdiff_Y = DIALOG_height - DIALOG_minHeight;
        }
        DIALOG_height -= absdiff_Y;
        DIALOG_top += absdiff_Y;
        DIALOG_before_Y = clientY;
    }
}

/** does not redraw, only preps the state to be redrawn */
function DIALOG_e_resize_calcOnly(diff_X, clientX) {
    if (diff_X < 0) {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_width <= DIALOG_minWidth) {
            return; // TODO: ...
        }
        else if (DIALOG_width - absdiff_X < DIALOG_minWidth) {
            clientX += (absdiff_X - (DIALOG_width - DIALOG_minWidth));
            absdiff_X = DIALOG_width - DIALOG_minWidth;
        }
        DIALOG_width -= absdiff_X;
        DIALOG_before_X = clientX;
    }
    else {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_left + DIALOG_width + 8 >= window.innerWidth) {
            return; // TODO: ...
        }
        else if (DIALOG_left + DIALOG_width + 8 + absdiff_X > window.innerWidth) {
            let DIALOG_maxWidth = window.innerWidth - 8 - DIALOG_left;
            clientX -= (absdiff_X - (DIALOG_maxWidth - DIALOG_width));
            absdiff_X = DIALOG_maxWidth - DIALOG_width;
        }
        DIALOG_width += absdiff_X;
        DIALOG_before_X = clientX;
    }
}

/** does not redraw, only preps the state to be redrawn */
function DIALOG_s_resize_calcOnly(diff_Y, clientY) {
    if (diff_Y < 0) {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_height <= DIALOG_minHeight) {
            return; // TODO: ...
        }
        else if (DIALOG_height - absdiff_Y < DIALOG_minHeight) {
            // tighten in the other direction because overshoot
            clientY += (absdiff_Y - (DIALOG_height - DIALOG_minHeight));
            absdiff_Y = DIALOG_height - DIALOG_minHeight;
        }
        DIALOG_height -= absdiff_Y;
        DIALOG_before_Y = clientY;
    }
    else {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_top + 8 + DIALOG_height >= window.innerHeight) {
            return; // TODO: ...
        }
        else if (DIALOG_top + 8 + DIALOG_height + absdiff_Y > window.innerHeight) {
            // tighten in the other direction because overshoot
            // -8 is the hardcoded pixel size that the resize element overhangs the dialog.
            let DIALOG_maxHeight = window.innerHeight - 8 - DIALOG_top;
            clientY -= (absdiff_Y - (DIALOG_maxHeight - DIALOG_height));
            absdiff_Y = DIALOG_maxHeight - DIALOG_height;
        }
        DIALOG_height += absdiff_Y;
        DIALOG_before_Y = clientY;
    }
}

/** does not redraw, only preps the state to be redrawn */
function DIALOG_w_resize_calcOnly(diff_X, clientX) {
    if (diff_X < 0) {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_left <= DIALOG_minLeft) {
            return; // TODO: ...
        }
        else if (DIALOG_left - absdiff_X < DIALOG_minLeft) {
            clientX += (absdiff_X - (DIALOG_left - DIALOG_minLeft));
            absdiff_X = DIALOG_left - DIALOG_minLeft;
        }
        DIALOG_width += absdiff_X;
        DIALOG_left -= absdiff_X;
        DIALOG_before_X = clientX;
    }
    else {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_width <= DIALOG_minWidth) {
            return; // TODO: ...
        }
        else if (DIALOG_width - absdiff_X < DIALOG_minWidth) {
            clientX += (absdiff_X - (DIALOG_width - DIALOG_minWidth));
            absdiff_X = DIALOG_width - DIALOG_minWidth;
        }
        DIALOG_width -= absdiff_X;
        DIALOG_left += absdiff_X;
        DIALOG_before_X = clientX;
    }
}

function DIALOG_resize_body_onmousemove(event) {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    let resize = document.getElementById('DIALOG_resize');
    if (!resize) return;

    if (event.buttons & 1) {
        // TODO: I literally can't even right now with this empty if statement
    }
    else {
        document.body.classList.remove('unselectable');
        window.removeEventListener('mousemove', DIALOG_resize_body_onmousemove, /*useCapture*/ true);
        if (DIALOG_onResizeAction) DIALOG_onResizeAction();
        return;
    }

    let diff_X = event.clientX - DIALOG_before_X;
    let diff_Y = event.clientY - DIALOG_before_Y;

    if (diff_Y > -1 && diff_Y < 1) diff_Y = 0;
    if (diff_X > -1 && diff_X < 1) diff_X = 0;

    if (diff_X === 0 && diff_Y === 0) {
        return;
    }

    let clientX = event.clientX;
    let clientY = event.clientY;

    switch (resize.style.cursor) {
        case 'nw-resize':
            DIALOG_n_resize_calcOnly(diff_Y, clientY);
            DIALOG_element.style.height = DIALOG_height + 'px';
            DIALOG_element.style.top = DIALOG_top + 'px';
            DIALOG_w_resize_calcOnly(diff_X, clientX);
            DIALOG_element.style.width = DIALOG_width + 'px';
            DIALOG_element.style.left = DIALOG_left + 'px';
            break;
        case 'w-resize':
            DIALOG_w_resize_calcOnly(diff_X, clientX);
            DIALOG_element.style.width = DIALOG_width + 'px';
            DIALOG_element.style.left = DIALOG_left + 'px';
            break;
        case 'sw-resize':
            DIALOG_s_resize_calcOnly(diff_Y, clientY);
            DIALOG_element.style.height = DIALOG_height + 'px';
            DIALOG_w_resize_calcOnly(diff_X, clientX);
            DIALOG_element.style.width = DIALOG_width + 'px';
            DIALOG_element.style.left = DIALOG_left + 'px';
            break;
        case 'n-resize':
            DIALOG_n_resize_calcOnly(diff_Y, clientY);
            DIALOG_element.style.height = DIALOG_height + 'px';
            DIALOG_element.style.top = DIALOG_top + 'px';
            break;
        case 's-resize':
            DIALOG_s_resize_calcOnly(diff_Y, clientY);
            DIALOG_element.style.height = DIALOG_height + 'px';
            break;
        case 'ne-resize':
            DIALOG_n_resize_calcOnly(diff_Y, clientY);
            DIALOG_element.style.height = DIALOG_height + 'px';
            DIALOG_element.style.top = DIALOG_top + 'px';
            DIALOG_e_resize_calcOnly(diff_X, clientX);
            DIALOG_element.style.width = DIALOG_width + 'px';
            break;
        case 'e-resize':
            DIALOG_e_resize_calcOnly(diff_X, clientX);
            DIALOG_element.style.width = DIALOG_width + 'px';
            break;
        case 'se-resize':
            DIALOG_s_resize_calcOnly(diff_Y, clientY);
            DIALOG_element.style.height = DIALOG_height + 'px';
            DIALOG_e_resize_calcOnly(diff_X, clientX);
            DIALOG_element.style.width = DIALOG_width + 'px';
            break;
    }
}

function DIALOG_resize_setCursor(event, dialogBoundingClientRect, resize) {
    let rX = event.clientX - dialogBoundingClientRect.left;
    let rY = event.clientY - dialogBoundingClientRect.top;
    // left to right
    //     top to bottom
    if (rX < 0) {
        if (rY < 0) {
            resize.style.cursor = 'nw-resize';
        }
        else if (event.clientY < dialogBoundingClientRect.top + dialogBoundingClientRect.height) {
            resize.style.cursor = 'w-resize';
        }
        else {
            resize.style.cursor = 'sw-resize';
        }
    }
    else if (event.clientX < dialogBoundingClientRect.left + dialogBoundingClientRect.width) {
        if (rY < 0) {
            resize.style.cursor = 'n-resize';
        }
        else if (event.clientY < dialogBoundingClientRect.top + dialogBoundingClientRect.height) {
            //resize.style.cursor = 'ns-resize';
        }
        else {
            resize.style.cursor = 's-resize';
        }
    }
    else {
        if (rY < 0) {
            resize.style.cursor = 'ne-resize';
        }
        else if (event.clientY < dialogBoundingClientRect.top + dialogBoundingClientRect.height) {
            resize.style.cursor = 'e-resize';
        }
        else {
            resize.style.cursor = 'se-resize';
        }
    }
}

/** This is the wellknown JS window object: 'window.addEventListener...' not to be confused with what I call the "window" of the dialog. */
function DIALOG_window_onresize() {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    if (!DIALOG_hasBeenMeaasured) return;

    // Max width and min width depend on the left/top so they need to come first.
    if (DIALOG_left <= DIALOG_minLeft) {
        DIALOG_left = DIALOG_minLeft;
        DIALOG_element.style.left = DIALOG_left + 'px';
    }
    if (DIALOG_top <= DIALOG_minTop) {
        DIALOG_top = DIALOG_minTop;
        DIALOG_element.style.top = DIALOG_top + 'px';
    }

    if (DIALOG_height <= DIALOG_minHeight) {
        DIALOG_height = DIALOG_minHeight;
        DIALOG_element.style.height = DIALOG_height + 'px';
    }
    else if (DIALOG_height + DIALOG_top + 8 >= window.innerHeight) {
        DIALOG_height = window.innerHeight - 8 - DIALOG_top;
        DIALOG_element.style.height = DIALOG_height + 'px';
    }

    if (DIALOG_width <= DIALOG_minWidth) {
        DIALOG_width = DIALOG_minWidth;
        DIALOG_element.style.width = DIALOG_width + 'px';
    }	
    else if (DIALOG_left + DIALOG_width + 8 >= window.innerWidth) {
        DIALOG_width = window.innerWidth - 8 - DIALOG_left;
        DIALOG_element.style.width = DIALOG_width + 'px';
    }
}

function DIALOG_toolbar_body_onmousemove(event) {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    let resize = document.getElementById('DIALOG_resize');
    if (!resize) return;

    if (event.buttons & 1) {
        // TODO: I literally can't even right now with this empty if statement
    }
    else {
        document.body.classList.remove('unselectable');
        window.removeEventListener('mousemove', DIALOG_toolbar_body_onmousemove, /*useCapture*/ true);
        if (DIALOG_onResizeAction) DIALOG_onResizeAction();
        return;
    }

    let diff_X = event.clientX - DIALOG_before_X;
    let diff_Y = event.clientY - DIALOG_before_Y;

    if (diff_Y > -1 && diff_Y < 1) diff_Y = 0;
    if (diff_X > -1 && diff_X < 1) diff_X = 0;

    if (diff_X === 0 && diff_Y === 0) {
        return;
    }

    let clientX = event.clientX;
    let clientY = event.clientY;

    if (diff_X < 0) {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_left <= DIALOG_minLeft) {
            //return; // TODO: ...
        }
        else if (DIALOG_left - absdiff_X < DIALOG_minLeft) {
            clientX += (absdiff_X - (DIALOG_left - DIALOG_minLeft));
            absdiff_X = DIALOG_left - DIALOG_minLeft;

            DIALOG_left -= absdiff_X;
            DIALOG_before_X = clientX;
            DIALOG_element.style.left = DIALOG_left + 'px';
        }
        else {
            DIALOG_left -= absdiff_X;
            DIALOG_before_X = clientX;
            DIALOG_element.style.left = DIALOG_left + 'px';
        }
    }
    else if (diff_X > 0) {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_left + DIALOG_width + 8 >= window.innerWidth) {
            //return; // TODO: ...
        }
        else if (DIALOG_left + DIALOG_width + 8 + absdiff_X > window.innerWidth) {
            let DIALOG_maxLeft = window.innerWidth - 8 - DIALOG_width;
            clientX -= (absdiff_X - (DIALOG_maxLeft - DIALOG_left));
            absdiff_X = DIALOG_maxLeft - DIALOG_left;

            DIALOG_left += absdiff_X;
            DIALOG_before_X = clientX;
            DIALOG_element.style.left = DIALOG_left + 'px';
        }
        else {
            DIALOG_left += absdiff_X;
            DIALOG_before_X = clientX;
            DIALOG_element.style.left = DIALOG_left + 'px';
        }
    }

    if (diff_Y < 0) {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_top <= DIALOG_minTop) {
            //return; // TODO: ...
        }
        else if (DIALOG_top - absdiff_Y < DIALOG_minTop) {
            clientY += (absdiff_Y - (DIALOG_top - DIALOG_minTop));
            absdiff_Y = DIALOG_top - DIALOG_minTop;
            
            DIALOG_top -= absdiff_Y;
            DIALOG_before_Y = clientY;
            DIALOG_element.style.top = DIALOG_top + 'px';
        }
        else {
            DIALOG_top -= absdiff_Y;
            DIALOG_before_Y = clientY;
            DIALOG_element.style.top = DIALOG_top + 'px';
        }
    }
    else if (diff_Y > 0) {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_top + 8 + DIALOG_height >= window.innerHeight) {
            //return; // TODO: ...
        }
        else if (DIALOG_top + 8 + DIALOG_height + absdiff_Y > window.innerHeight) {
            let DIALOG_maxTop = window.innerHeight - 8 - DIALOG_height;
            clientY -= (absdiff_Y - (DIALOG_maxTop - DIALOG_top));
            absdiff_Y = DIALOG_maxTop - DIALOG_top;
            
            DIALOG_top += absdiff_Y;
            DIALOG_before_Y = clientY;
            DIALOG_element.style.top = DIALOG_top + 'px';
        }
        else {
            DIALOG_top += absdiff_Y;
            DIALOG_before_Y = clientY;
            DIALOG_element.style.top = DIALOG_top + 'px';
        }
    }
}

function DIALOG_toolbar_onmousedown(event) {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    let resize = document.getElementById('DIALOG_toolbar');
    if (!resize) return;

    // TODO: cache the bounding client rect
    let dialogBoundingClientRect = DIALOG_element.getBoundingClientRect();

    DIALOG_before_X = event.clientX;
    DIALOG_before_Y = event.clientY;
    DIALOG_after_X = 0;
    DIALOG_after_Y = 0;

    DIALOG_left = dialogBoundingClientRect.left;
    DIALOG_top = dialogBoundingClientRect.top;
    DIALOG_width = dialogBoundingClientRect.width;
    DIALOG_height = dialogBoundingClientRect.height;
    DIALOG_hasBeenMeaasured = true;

    document.body.classList.add('unselectable');
    window.addEventListener('mousemove', DIALOG_toolbar_body_onmousemove, /*useCapture*/ true);
}

/**
 * Window is the title bar, maximize, minimize, close etc...
 */
function DIALOG_createWindow() {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    // TODO: Might want to check if the HTML element exists instead.
    if (DIALOG_windowExists) return;
    DIALOG_windowExists = true;

    let toolbar = document.createElement('div');
    toolbar.id = 'DIALOG_toolbar';
    let body = document.createElement('div');
    body.id = 'DIALOG_body';
    let resize = document.createElement('div');
    resize.id = 'DIALOG_resize';

    toolbar.addEventListener('mousedown', DIALOG_toolbar_onmousedown);

    resize.addEventListener('mouseenter', DIALOG_resize_onmouseenter);
    resize.addEventListener('mousedown', DIALOG_resize_onmousedown);
    window.addEventListener('resize', DIALOG_window_onresize);

    DIALOG_element.appendChild(resize);
    DIALOG_element.appendChild(toolbar);
    DIALOG_element.appendChild(body);

    // TODO: You have to actually make sure the text fits
    toolbar.innerText = DIALOG_currentDialogKind;

    let closeButton = document.createElement('button');
    closeButton.innerText = 'x';
    closeButton.id = 'DIALOG_closeButton';

    closeButton.addEventListener('click', DIALOG_closeButton_onclick);

    toolbar.appendChild(closeButton);

    closeButton.focus();
}

/**
 * Window is the title bar, maximize, minimize, close etc...
 */
function DIALOG_deleteWindow() {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    // TODO: Might want to check if the HTML element exists instead.
    if (!DIALOG_windowExists) return;
    // TODO: Perhaps move these respective sets to the end of their functions.
    // This way them being set as a certain value reflects that the entirety of their respective code had been ran but then again... idk
    DIALOG_windowExists = false;

    DIALOG_left = 0;
    DIALOG_top = 0;
    DIALOG_width = 0;
    DIALOG_height = 0;

    DIALOG_before_X = 0;
    DIALOG_before_Y = 0;
    DIALOG_after_X = 0;
    DIALOG_after_Y = 0;

    let toolbar = document.getElementById('DIALOG_toolbar');
    toolbar.removeEventListener('mousedown', DIALOG_toolbar_onmousedown);

    document.body.classList.remove('unselectable');
    window.removeEventListener('mousemove', DIALOG_resize_body_onmousemove, /*useCapture*/ true);
    window.removeEventListener('mousemove', DIALOG_toolbar_body_onmousemove, /*useCapture*/ true);
    if (DIALOG_onResizeAction) DIALOG_onResizeAction();

    window.removeEventListener('resize', DIALOG_window_onresize);

    let resize = document.getElementById('DIALOG_resize');
    resize.removeEventListener('mouseenter', DIALOG_resize_onmouseenter);
    resize.removeEventListener('mousedown', DIALOG_resize_onmousedown);

    let closeButton = document.getElementById('DIALOG_closeButton');
    closeButton.removeEventListener('click', DIALOG_closeButton_onclick);

    DIALOG_element.innerHTML = '';
}


const TrackedSyntaxKind = {
    None: 0,
    String: 1,
    /** only multi-line-comments that span multiple lines are stored in EDITOR_trackedSyntaxList with the 'TrackedSyntaxKind.Comment' */
    Comment: 2,
};

class TrackedSyntaxList {
    data_literal;
    capacity_literal;

    capacity_abstract;
    count_abstract = 0;

    // Storing the trackedSyntaxKind as an int32 isn't the most ideal thing in the world.
    // Previously the ints were being grouped via a class instance.
    // So this still ought to be better than what was done previously.
    field_count = 3;
    // this.trackedSyntaxKind = trackedSyntaxKind;
    // this.start = start;
    // this.length = length;

    trackedSyntaxKind_offset = 0;
    start_offset = 1;
    length_offset = 2;

    constructor(initialCapacity_abstract) {
        let temp_capacity_literal = initialCapacity_abstract * this.field_count;

        this.data_literal = new Uint32Array(temp_capacity_literal);
        this.capacity_abstract = initialCapacity_abstract;
        this.capacity_literal = temp_capacity_literal;

        this.count_abstract = 0;
    }

    /**
     * Does not clear the information, only sets 'this.count' to '0'.
     */
    clear() {
        this.count_abstract = 0;
    }

    /**
     * 
     * @param {TrackedSyntax} trackedSyntax a place to read the data into, since it is stored as just int32 data (not the class)
     * @returns {TrackedSyntax}
     */
    getElementAt(index_abstract) {
        let index_literal = index_abstract * this.field_count;
        EDITOR_pooledTrackedSyntax_trackedSyntaxKind = this.data_literal[index_literal + this.trackedSyntaxKind_offset];
        EDITOR_int_fields[30] = this.data_literal[index_literal + this.start_offset];
        EDITOR_int_fields[31] = this.data_literal[index_literal + this.length_offset];
    }

    getStart(index_abstract) {
        return this.data_literal[(index_abstract * this.field_count) + this.start_offset];
    }

    /**
     * TODO: This function has the 'index_abstract' as the first parameter,
     * meanwhile 'getElementAt(...)' takes this as second parameter.
     * A decision on a consistent position needs to be made.
     * @param {number} index_abstract 
     * @param {number} value 
     */
    setStart(index_abstract, value) {
        this.data_literal[(index_abstract * this.field_count) + this.start_offset] = value;
    }
    
    getLength(index_abstract) {
        return this.data_literal[(index_abstract * this.field_count) + this.length_offset];
    }
    
    /**
     * TODO: This function has the 'index_abstract' as the first parameter,
     * meanwhile 'getElementAt(...)' takes this as second parameter.
     * A decision on a consistent position needs to be made.
     * @param {number} index_abstract 
     * @param {number} value 
     */
    setLength(index_abstract, value) {
        this.data_literal[(index_abstract * this.field_count) + this.length_offset] = value;
    }
    
    /**
     * TODO: This function has the 'index_abstract' as the first parameter,
     * meanwhile 'getElementAt(...)' takes this as second parameter.
     * A decision on a consistent position needs to be made.
     * @param {number} index_abstract 
     * @param {number} value 
     */
    setTrackedSyntaxKind(index_abstract, value) {
        this.data_literal[(index_abstract * this.field_count) + this.trackedSyntaxKind_offset] = value;
    }

    /**
     * TODO: ensure all the parameters are encoded, especially because I'm noticing myself forgetting.
     */
    insert(index_abstract, trackedSyntaxKind, start, length) {
        this.ensureCapacityForInsertion(index_abstract, 1);

        let index_literal = index_abstract * this.field_count;

        if (index_abstract !== this.count_abstract) {
            this.copyTo(this.data_literal, index_abstract, this.data_literal, index_abstract + 1, this.count_abstract - index_abstract);
        }

        this.data_literal[index_literal + this.trackedSyntaxKind_offset] = trackedSyntaxKind;
        this.data_literal[index_literal + this.start_offset] = start;
        this.data_literal[index_literal + this.length_offset] = length;

        this.count_abstract++;
    }

    /**
     * Does not clear trailing information.
     * 
     * count === 0 immediately returns
     */
    removeAt(index_abstract, count_abstract) {

        if (index_abstract > this.count_abstract) { throw new Error('removeAt(...): index_abstract > this.count_abstract'); }
        if (index_abstract + count_abstract > this.count_abstract) { throw new Error('removeAt(...): index_abstract + count_abstract > this.count_abstract'); }
        if (count_abstract === 0) { return; }

        if (index_abstract + count_abstract === this.count_abstract) {
            let shiftableCount_abstract = this.count_abstract - (index_abstract + count_abstract);
            if (shiftableCount_abstract > 0) {
                this.copyTo(
                    this.data_literal,
                    index_abstract + count_abstract,
                    this.data_literal,
                    index_abstract,
                    shiftableCount_abstract);
            }
        }
        else {
            this.copyTo(
                this.data_literal,
                index_abstract + count_abstract,
                this.data_literal,
                index_abstract,
                this.count_abstract - (index_abstract + count_abstract));
        }

        this.count_abstract -= count_abstract;
    }

    /**
     * - If the size asked for cannot be allocated, an exception will be thrown. (presumably the wording "thrown by the runtime" is involved.)
     * - JavaScript numbers do not wrap around to negative values when the value is very large.
     *       They instead approach infinity and lose precision.
     *       - There still is a check for whether the new, expected to be larger, capacity is smaller for whatever reason.
     *         Since this ought to be a negligible check for this method to perform.
     *         And failure to catch that case if it happens is an infinite loop.
     */
    ensureCapacityForInsertion(index_abstract, count_abstract) {
        let capacityPrevious_abstract = this.capacity_abstract;
        while (true) {
            if (this.count_abstract + count_abstract > this.capacity_abstract) {
                this.doubleCapacity();
            }
            else if (index_abstract >= this.capacity_abstract) {
                this.doubleCapacity();
            }
            else {
                break;
            }

            if (this.capacity_abstract === capacityPrevious_abstract) {
                break;
            }
            if (this.capacity_abstract < capacityPrevious_abstract) {
                throw new Error('ensureCapacityForInsertion(...): this.capacity_abstract < capacityPrevious_abstract');
            }

            capacityPrevious_abstract = this.capacity_abstract;
        }
    }

    doubleCapacity() {
        let capacityNew_literal = this.capacity_literal * 2;
        let dataNew_literal = new Uint32Array(capacityNew_literal);
        this.copyTo(this.data_literal, 0, dataNew_literal, 0, this.count_abstract);
        this.data_literal = dataNew_literal;
        this.capacity_literal = capacityNew_literal;
        this.capacity_abstract *= 2;
    }

    /**
     * inclusive/exclusive
     */
    copyTo(dataSource_literal, sourceStart_abstract, dataDestination_literal, destinationStart_abstract, length_abstract) {

        if (dataSource_literal === dataDestination_literal) {
            if (dataSource_literal !== this.data_literal) {
                throw new Error('dataSource_literal === dataDestination_literal ; but dataSource_literal !== this.data_literal');
            }

            // TODO: use 'copyWithin' method here and other such locations

            let distance_abstract = destinationStart_abstract - sourceStart_abstract;

            if (distance_abstract > 0) {
                for (var i_abstract = sourceStart_abstract + length_abstract - 1; i_abstract >= sourceStart_abstract; i_abstract--) {
                    let iplusd_abstract = i_abstract + distance_abstract;
                    let iplusd_literal = iplusd_abstract * this.field_count;
                    let i_literal = i_abstract * this.field_count;
                    this.data_literal[iplusd_literal + this.trackedSyntaxKind_offset] = this.data_literal[i_literal + this.trackedSyntaxKind_offset];
                    this.data_literal[iplusd_literal + this.start_offset] = this.data_literal[i_literal + this.start_offset];
                    this.data_literal[iplusd_literal + this.length_offset] = this.data_literal[i_literal + this.length_offset];
                }
            }
            else {
                for (var i_abstract = destinationStart_abstract; i_abstract < this.count_abstract; i_abstract++) {
                    let iminusd_abstract = i_abstract - distance_abstract;
                    let iminusd_literal = iminusd_abstract * this.field_count;
                    let i_literal = i_abstract * this.field_count;
                    this.data_literal[i_literal + this.trackedSyntaxKind_offset] = this.data_literal[iminusd_literal + this.trackedSyntaxKind_offset];
                    this.data_literal[i_literal + this.start_offset] = this.data_literal[iminusd_literal + this.start_offset];
                    this.data_literal[i_literal + this.length_offset] = this.data_literal[iminusd_literal + this.length_offset];
                }
            }
        }
        else {
            // TODO: use 'set' method here and other such locations
            for (var i_abstract = 0; i_abstract < length_abstract; i_abstract++) {
                let dSplusi_abstract = destinationStart_abstract + i_abstract;
                let dSplusi_literal = dSplusi_abstract * this.field_count;
                let sSplusi_abstract = sourceStart_abstract + i_abstract;
                let sSplusi_literal = sSplusi_abstract * this.field_count;
                dataDestination_literal[dSplusi_literal + this.trackedSyntaxKind_offset] = dataSource_literal[sSplusi_literal + this.trackedSyntaxKind_offset];
                dataDestination_literal[dSplusi_literal + this.start_offset] = dataSource_literal[sSplusi_literal + this.start_offset];
                dataDestination_literal[dSplusi_literal + this.length_offset] = dataSource_literal[sSplusi_literal + this.length_offset];
            }
        }
    }
}

// /**
//  * Strings and comments are the "only syntax" that entirely clobber how text should be lexed.
//  * 
//  * Thus if I do one full file lex to get the positions of them,
//  * then at any scroll position, I can give the respective lexer
//  * that subset of text that the user sees, and lex it quite accurately if not 100% accurately... I'm not sure.
//  */
// interface TrackedSyntax {
//     constructor (trackedSyntaxKind, start, length) {
//         this.trackedSyntaxKind = trackedSyntaxKind;
//         this.start = start;
//         this.length = length;
//     }
// }



/** File contains more than one class (noted only because it doesn't feel obvious that there would be more than one class, this note doesn't exist in every file) */

/** See the "interface TreeViewDirector" towards the bottom of this file */

/**
 * The director maintains a flat optimized list of every element i.e.: represent each element in a uint8array and each one is a byte that maps to the actual.
 * 
 * Then the actual can be a hierarchical datastructure.
 * 
 * You just keep flattening it into a byte array and map back and forth.
 */
class TreeViewComponent {
    constructor(itemHeight) {
        this.rootElement = document.createElement('div');
        this.rootElement.classList.add('TREEVIEW', 'unselectable');
        this.rootElement.tabIndex = 0;
        this.rootElement.style.height = '100%';

        this.virtualizationElement = document.createElement('div');
        this.virtualizationElement.className = 'TREEVIEW_virtualization';
        this.rootElement.appendChild(this.virtualizationElement);

        /** Consider the existence of such methods as 'state_cursor_setIndex' before mutating state directly */
        this.cursorElement = document.createElement('div');
        this.cursorElement.className = 'TREEVIEW_cursor';
        this.rootElement.appendChild(this.cursorElement);

        this.itemListElement = document.createElement('div');
        this.itemListElement.className = 'TREEVIEW_itemList';
        this.rootElement.appendChild(this.itemListElement);

        this.itemHeightTotal = 0;

        /** Consider the existence of such methods as 'state_cursor_setIndex' before mutating state directly */
        this.cursorIndex = 0;

        this._ONSCROLLscrollTop = 0;
        this._ONSCROLLvirtualIndex = 0;
        this._ONSCROLLvirtualCount = 0;
        
        this.event_scroll_async_timer = null;
        this.event_scroll_async_bool = null;

        this.bound_event_click = this.event_click.bind(this);
        this.bound_event_keydown = this.event_keydown.bind(this);
        this.bound_event_scroll_async_WRAPIT = this.event_scroll_async_WRAPIT.bind(this);
        this.bound_event_dblclick = this.event_dblclick.bind(this);
        this.bound_event_contextmenu = this.event_contextmenu.bind(this);
        this.bound_event_windowResize = this.event_windowResize.bind(this);
    }

    /**
     * @param {*} director interface TreeViewDirectory { director.drawItem(divItem, indexItem), director.onkeydown(this.itemListElement.children[relativeIndex], this.cursorIndex, this.items[this.cursorIndex]); }
     * @param {*} itemHeightNumber '50'; cursorTop = currentIndex * itemHeightNumber;
     * @param {*} itemHeightStyleAttributeValueString '50px'; div.style.height = itemHeightStyleAttributeValueString;
     */
    setItems(director, itemHeightNumber, itemHeightStyleAttributeValueString) {
        this.itemListElement.innerHTML = '';
        this.virtualizationElement.style.height = 1 + 'px';
        this.state_cursor_setIndex(0);
        
        this.director = director;
        this.itemHeightNumber = itemHeightNumber;
        this.itemHeightStyleAttributeValueString = itemHeightStyleAttributeValueString;

        this.cursorElement.style.height = this.itemHeightStyleAttributeValueString;
        this.itemHeightTotal = this.director.tvd_getTotalCount() * this.itemHeightNumber;
        this.virtualizationElement.style.height = this.itemHeightTotal + 'px';
        this.boundingClientRect = null;
    }

    /**
     * if (this.rootElement.parentElement) { await this.draw_render_fullReset_async(); return; }
     * Because the "list" is already drawn somewhere and 'draw_delete()' needs to be invoked prior to drawing at a different location.
     * 
     * @param {HTMLElement} parentElement 
     * @param {*} insertBeforeThisChild (if falsey, the list UI is appended to the parent element)
     */
    async draw_create_async(parentElement, insertBeforeThisChild) {
        if (this.rootElement.parentElement) {
            // It is the case that I invoke 'draw_create_async' when creating the tree view for the first time.
            // But I also do this when I re-open the os input file dialog and pick either a separate or the same folder.
            // In this scenario having this invoke a "fullReset" is necessary otherwise nothing appears in the treeview.
            //
            // TODO: but, perhaps this is best left to the consumer of the TreeViewComponent to invoke themselves...
            // ...in such a scenario. Until further decision is made I'll have the invocation here.
            return this.draw_render_fullReset_async();
        }
        parentElement.insertBefore(this.rootElement, insertBeforeThisChild);
        this.draw_addEvents();
        return this.draw_render_async();
    }

    /**
     * if (!this.rootElement.parentElement) return;
     * Because the "list" is not drawn, no UI needs to be removed.
     * (the purpose of this method is more-so related to unsubscribing of events and other such non-automatic actions that need to be performed)
     * 
     * @returns 
     */
    draw_delete() {
        if (!this.rootElement.parentElement) return;
        this.draw_removeEvents();
        this.boundingClientRect = null;
        this.rootElement.parentElement.removeChild(this.rootElement);
    }

    draw_addEvents() {
        this.rootElement.addEventListener('click', this.bound_event_click);
        this.rootElement.addEventListener('keydown', this.bound_event_keydown);
        this.rootElement.addEventListener('scroll', this.bound_event_scroll_async_WRAPIT);
        this.rootElement.addEventListener('dblclick', this.bound_event_dblclick);
        this.rootElement.addEventListener('contextmenu', this.bound_event_contextmenu);
        window.addEventListener('resize', this.bound_event_windowResize);
    }
    
    draw_removeEvents() {
        this.rootElement.removeEventListener('click', this.bound_event_click);
        this.rootElement.removeEventListener('keydown', this.bound_event_keydown);
        this.rootElement.removeEventListener('scroll', this.bound_event_scroll_async_WRAPIT);
        this.rootElement.addEventListener('dblclick', this.bound_event_dblclick);
        this.rootElement.addEventListener('contextmenu', this.bound_event_contextmenu);
        window.removeEventListener('resize', this.bound_event_windowResize);
    }

    async draw_render_async() {
        if (!this.boundingClientRect) {
            this.ensure_boundingClientRect();
        }

        if (this.itemListElement.children.length !== this.virtualCount) {
            return this.draw_render_fullReset_async();
        }
        else {
            this.virtualIndex = Math.floor(this.rootElement.scrollTop / this.itemHeightNumber);
            this.itemListElement.style.top = this.virtualIndex * this.itemHeightNumber + 'px';

            if (this._ONSCROLLscrollTop === this.rootElement.scrollTop &&
                this._ONSCROLLvirtualIndex === this.virtualIndex &&
                this._ONSCROLLvirtualCount === this.virtualCount) {
                    return;
            }

            this._ONSCROLLscrollTop = this.rootElement.scrollTop;

            // If I delay setting 'this._ONSCROLLvirtualIndex' then I can just use that.
            // I can't bear to do that right now though. I'm just gonna make this variable.
            let prevVli = this._ONSCROLLvirtualIndex;
            let currVli = this.virtualIndex;

            this._ONSCROLLvirtualIndex = this.virtualIndex;

            if (this._ONSCROLLvirtualCount === this.virtualCount &&
                this.itemListElement.children.length === this.virtualCount) {

                // The same count of lines is on the UI so you can probably
                // redraw them one by one and save "some" of the existing HTML.

                let diff = currVli - prevVli;

                // There are 3 cases (they correspond respectively to the if, else if, else'):
                // - move small lines to end of list with the content changed
                // - move the final lines to the start with the content changed
                // - keep lines in place and redraw over them all

                let totalCount = this.director.tvd_getTotalCount();

                if (diff > 0 && diff < this.virtualCount) { // move small lines to end of list with the content changed
                    return this.director.tvd_drawItem_BATCH_async(prevVli + this._ONSCROLLvirtualCount, diff, 1);
                }
                else if (diff < 0 && (diff *= -1) < this.virtualCount) { // move the final lines to the start
                    return this.director.tvd_drawItem_BATCH_async(currVli, diff, 2);
                }
                else { // re-use the divs, but keep them in place and redraw over them all
                    return this.director.tvd_drawItem_BATCH_async(this.virtualIndex, this.virtualCount, 3);
                }
            }
        }
    }

    /**
     * This actually only gets invoked if 'this.itemListElement.children.length !== this.virtualCount'...
     * ...But it is a bit more complicated if you want to involve a change to totalCount, you'd need to force the final 'else' case
     * so it is easier to just invoke this directly when you change totalCount?
     */
    async draw_render_fullReset_async() {

        this._ONSCROLLvirtualCount = this.virtualCount;

        this.virtualIndex = Math.floor(this.rootElement.scrollTop / this.itemHeightNumber);
        this.itemListElement.style.top = this.virtualIndex * this.itemHeightNumber + 'px';

        let totalCount = this.director.tvd_getTotalCount();

        if (this.itemListElement.children.length === this.virtualCount) {
            for (let i = 0; i < this.virtualCount; i++) {
                let divItem = this.itemListElement.children[i];
                if (this.virtualIndex + i >= totalCount) {
                    await this.director.tvd_drawItem_async(divItem, this.virtualIndex + i, /*isNull*/ true);
                }
                else {
                    await this.director.tvd_drawItem_async(divItem, this.virtualIndex + i, /*isNull*/ false);
                }
            }
        }
        else {

            this.itemListElement.innerHTML = '';

            for (let i = 0; i < this.virtualCount; i++) {
                
                let divItem = document.createElement('div');
                divItem.style.height = this.itemHeightStyleAttributeValueString;
                divItem.style.whiteSpace = 'nowrap';
                this.itemListElement.appendChild(divItem);
    
                let iconSpan = document.createElement('span');
                iconSpan.style.width = EXPLORER_firstSpanWidth;
                iconSpan.style.display = 'inline-block';
                // TODO: Consider what differences if any exist between the '' iconSpan having an empty height of 0 when left unset, versus if you were to set it to 1px, does this matter? It doesn't seem to impact the "horizontal" space being taken.
                divItem.appendChild(iconSpan);
                divItem.appendChild(document.createTextNode("..."));

                if (this.virtualIndex + i >= totalCount) {
                    await this.director.tvd_drawItem_async(divItem, this.virtualIndex + i, /*isNull*/ true);
                }
                else {
                    await this.director.tvd_drawItem_async(divItem, this.virtualIndex + i, /*isNull*/ false);
                }
            }
        }
    }

    /**
     * TODO: To detect whether the "expand/collapse icon" was clicked, the logic 'if(event.target === nodeElement.children[0])' is used...
     * ...this logic is flawed if one ever were to put an element within the span that became the target...
     * ...thus, you should consider checking the x position of the event against the x position of the nodeElement.children[0].
     * @param {*} event 
     */
    async event_click(event) {
        this.ensure_boundingClientRect();

        let rY = event.clientY - this.boundingClientRect.top + this.rootElement.scrollTop;
        let index = Math.floor(rY / this.itemHeightNumber);
        index = this.state_cursor_validateIndex(index);

        let divItem = this.itemListElement.children[index - this.virtualIndex];

        if (event.target === divItem.children[0]) {
            return this.director.tvd_expandCollapseIconWasClicked_async(divItem, index);
        }
        else {
            this.state_cursor_setIndex(index);
        }
    }

    async event_dblclick(event) {
        this.ensure_boundingClientRect();

        let rY = event.clientY - this.boundingClientRect.top + this.rootElement.scrollTop;
        let index = Math.floor(rY / this.itemHeightNumber);
        index = this.state_cursor_validateIndex(index);

        let divItem = this.itemListElement.children[index - this.virtualIndex];

        if (event.target === divItem.children[0]) {
            // ignore because:
            // await this.director.tvd_expandCollapseIconWasClicked_async(divItem, index);
        }
        else {
            let relativeIndex = this.cursorIndex - this.virtualIndex;
            if (relativeIndex >= 0 && relativeIndex < this.itemListElement.children.length) {
                return this.director.tvd_ondblclick_async(this.itemListElement.children[relativeIndex], this.cursorIndex);
            }
        }
    }

    async event_contextmenu(event) {
        this.ensure_boundingClientRect();

        if (event.button === 2) {
            let rY = event.clientY - this.boundingClientRect.top + this.rootElement.scrollTop;

            this.state_cursor_setIndex(this.state_cursor_validateIndex(
                Math.floor(rY / this.itemHeightNumber)));

            let relativeIndex = this.cursorIndex - this.virtualIndex; // TODO: you need to move this above the divItem assignment and do checks earlier... double check all other uses

            if (relativeIndex >= 0 && relativeIndex < this.itemListElement.children.length) {
                return this.director.tvd_oncontextmenu_async(this.itemListElement.children[relativeIndex], this.cursorIndex, event, relativeIndex);
            }
        } else {
            if (this.cursorIndex >= this.director.tvd_getTotalCount()) {
                return;
            }

            this.state_cursor_setIndex(this.state_cursor_validateIndex(
                this.cursorIndex));
            
            let relativeIndex = this.cursorIndex - this.virtualIndex;

            // TODO: Handle context menu with keyboard when active node is out of view
            if (relativeIndex >= 0 && relativeIndex < this.itemListElement.children.length) {
                return this.director.tvd_oncontextmenu_async(this.itemListElement.children[relativeIndex], this.cursorIndex, event, relativeIndex);
            }
        }
    }

    async event_keydown(event) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (event.ctrlKey) {
                    this.rootElement.scrollBy(0, this.itemHeightNumber);
                }
                else {
                    this.state_cursor_setIndex(this.state_cursor_validateIndex(
                        this.cursorIndex + 1));
                }
                return;
            case 'ArrowUp':
                event.preventDefault();
                if (event.ctrlKey) {
                    this.rootElement.scrollBy(0, -1 * this.itemHeightNumber);
                }
                else {
                    this.state_cursor_setIndex(this.state_cursor_validateIndex(
                        this.cursorIndex - 1));
                }
                return;
            case 'ArrowRight':
                if (!event.ctrlKey) { // If holding ctrl, don't preventDefault so the user can scroll horizontally?
                    event.preventDefault();
                    this.state_cursor_setIndex(this.state_cursor_validateIndex(
                        this.cursorIndex));
                    // TODO: 'ArrowRight' when the cursor is on a valid item but isn't part of the virtualization result.
                    let relativeIndex = this.cursorIndex - this.virtualIndex;
                    if (relativeIndex >= 0 && relativeIndex < this.itemListElement.children.length) {
                        return this.director.tvd_arrowRight_async(this.itemListElement.children[relativeIndex], this.cursorIndex);
                    }
                }
                return;
            case 'ArrowLeft':
            	if (!event.ctrlKey) { // If holding ctrl, don't preventDefault so the user can scroll horizontally?
                    event.preventDefault();
                    this.state_cursor_setIndex(this.state_cursor_validateIndex(
                        this.cursorIndex));
                    let relativeIndex = this.cursorIndex - this.virtualIndex;
                    if (relativeIndex >= 0 && relativeIndex < this.itemListElement.children.length) {
                        return this.director.tvd_arrowLeft_async(this.itemListElement.children[relativeIndex], this.cursorIndex);
                    }
                }
            	return;
            case ' ':
            case 'Enter':
                event.preventDefault();
                this.state_cursor_setIndex(this.state_cursor_validateIndex(
                    this.cursorIndex));
                let relativeIndex = this.cursorIndex - this.virtualIndex;
                if (relativeIndex >= 0 && relativeIndex < this.itemListElement.children.length) {
                    return this.director.tvd_onkeydown_async(this.itemListElement.children[relativeIndex], this.cursorIndex, event.key);
                }
                return;
        }
    }

    /**
     * TODO: intra-app resizes or movements will also invoke this; i.e.: if a list is shown in a dialog and the dialog is resized or moved.
     */
    event_windowResize() {
        this.boundingClientRect = null;
    }

    async event_scroll_async_WRAPIT() {
        this.event_scroll_async_bool = true;
	    if (!this.event_scroll_async_timer) {
            // TODO: Consider trying setTimeout before the await?
	    	await this.event_scroll_async();
	        this.event_scroll_async_timer = setTimeout(this.event_scroll_async_timeoutFunc, 100, this);
	    }
    }
    
    async event_scroll_async_timeoutFunc(context) {
        if (/*trailing && lastArgs*/ context.event_scroll_async_bool) {
            context.event_scroll_async_bool = false; // This should be set to false immediately due to async logic; and any synchronous throttles should follow the pattern for consistency... unless they are passing the variable to the function being throttled...
            await context.event_scroll_async();
            context.event_scroll_async_timer = setTimeout(context.event_scroll_async_timeoutFunc, 100, context);
        } else {
            context.event_scroll_async_timer = null;
        }
    }

	/**
	 * TODO: this should probably return the invocation rather than awaiting?...
	 * ...but take care to consider whether any oddities will occur with setTimeout and async whether you've awaited here or not.
	*/
    async event_scroll_async() {
        return this.draw_render_async();
    }

    ensure_boundingClientRect() {
        if (!this.boundingClientRect) {
            this.boundingClientRect = this.rootElement.getBoundingClientRect();
            this.virtualCount = Math.ceil(this.rootElement.offsetHeight / this.itemHeightNumber);
        }
    }

    /**
     * if (this.cursorIndex === index) return;
     * 
     * @param {*} index 
     */
    state_cursor_setIndex(index) {
        if (this.cursorIndex === index) return;

        this.cursorIndex = index;
        this.cursorTopNumber = this.cursorIndex * this.itemHeightNumber;
        this.cursorElement.style.top = this.cursorTopNumber + 'px';

        this.ensure_boundingClientRect();

        if (this.cursorTopNumber + (2 * this.itemHeightNumber) > this.rootElement.scrollTop + this.boundingClientRect.height) {
            let currentBottom = this.rootElement.scrollTop + this.boundingClientRect.height;
            let changeToMakeBottomTouch = this.cursorTopNumber - currentBottom;
            let entireValueToScrollBy = changeToMakeBottomTouch + (2 * this.itemHeightNumber);
            this.rootElement.scrollBy(0, entireValueToScrollBy);
        }
        else if (this.cursorTopNumber < this.rootElement.scrollTop) {
            this.rootElement.scrollBy(0, this.cursorTopNumber - this.rootElement.scrollTop);
        }
    }

    /**
     * if (this.cursorIndex === index) return;
     * 
     * @param {*} index 
     */
    state_cursor_validateIndex(index) {
        if (index >= this.director.tvd_getTotalCount()) {
            index = this.director.tvd_getTotalCount() - 1;
        }
        if (index < 0) {
            index = 0;
        }
        return index;
    }
}

const TreeViewNodeKind = {
    None: 0,
    isExpandable_isExpanded: 1,
    isExpandable_NOTisExpanded: 2,
    NOTisExpandable_isExpanded: 3,
    NOTisExpandable_NOTisExpanded: 4,
};

class TreeViewNodeList {
    data_literal;
    capacity_literal;

    capacity_abstract;
    count_abstract = 0;

    // Storing the nodeKind as an int32 isn't the most ideal thing in the world.
    // Previously the ints were being grouped via a class instance.
    // So this still ought to be better than what was done previously.
    field_count = 3;
    // this.nodeKind = nodeKind;
    // this.key = key;
    // this.depth = depth;

    nodeKind_offset = 0;
    key_offset = 1;
    depth_offset = 2;

    constructor(initialCapacity_abstract) {
        let temp_capacity_literal = initialCapacity_abstract * this.field_count;

        this.data_literal = new Uint32Array(temp_capacity_literal);
        this.capacity_abstract = initialCapacity_abstract;
        this.capacity_literal = temp_capacity_literal;

        this.count_abstract = 0;
    }

    /**
     * Does not clear the information, only sets 'this.count' to '0'.
     */
    clear() {
        this.count_abstract = 0;
    }

    /**
     * 
     * @param {TreeViewNode} trackedSyntax a place to read the data into, since it is stored as just int32 data (not the class)
     * @returns {TrackedSyntax}
     */
    getElementAt(index_abstract) {
        let index_literal = index_abstract * this.field_count;
        TreeView_pooledNode_nodeKind = this.data_literal[index_literal + this.nodeKind_offset];
        TreeView_pooledNode_key = this.data_literal[index_literal + this.key_offset];
        TreeView_pooledNode_depth = this.data_literal[index_literal + this.depth_offset];
    }

    getKey(index_abstract) {
        return this.data_literal[(index_abstract * this.field_count) + this.key_offset];
    }

    /**
     * TODO: This function has the 'index_abstract' as the first parameter,
     * meanwhile 'getElementAt(...)' takes this as second parameter.
     * A decision on a consistent position needs to be made.
     * @param {number} index_abstract 
     * @param {number} key 
     */
    setKey(index_abstract, key) {
        this.data_literal[(index_abstract * this.field_count) + this.key_offset] = key;
    }
    
    getDepth(index_abstract) {
        return this.data_literal[(index_abstract * this.field_count) + this.depth_offset];
    }
    
    /**
     * TODO: This function has the 'index_abstract' as the first parameter,
     * meanwhile 'getElementAt(...)' takes this as second parameter.
     * A decision on a consistent position needs to be made.
     * @param {number} index_abstract 
     * @param {number} depth 
     */
    setDepth(index_abstract, depth) {
        this.data_literal[(index_abstract * this.field_count) + this.depth_offset] = depth;
    }
    
    /**
     * TODO: This function has the 'index_abstract' as the first parameter,
     * meanwhile 'getElementAt(...)' takes this as second parameter.
     * A decision on a consistent position needs to be made.
     * @param {number} index_abstract 
     * @param {number} nodeKind 
     */
    setNodeKind(index_abstract, nodeKind) {
        this.data_literal[(index_abstract * this.field_count) + this.nodeKind_offset] = nodeKind;
    }

    insert(index_abstract, nodeKind, key, depth) {
        this.ensureCapacityForInsertion(index_abstract, 1);

        let index_literal = index_abstract * this.field_count;

        if (index_abstract !== this.count_abstract) {
            this.copyTo(this.data_literal, index_abstract, this.data_literal, index_abstract + 1, this.count_abstract - index_abstract);
        }

        this.data_literal[index_literal + this.nodeKind_offset] = nodeKind;
        this.data_literal[index_literal + this.key_offset] = key;
        this.data_literal[index_literal + this.depth_offset] = depth;

        this.count_abstract++;
    }

    /**
     * Does not clear trailing information.
     * 
     * count === 0 immediately returns
     */
    removeAt(index_abstract, count_abstract) {

        if (index_abstract > this.count_abstract) { throw new Error('removeAt(...): index_abstract > this.count_abstract'); }
        if (index_abstract + count_abstract > this.count_abstract) { throw new Error('removeAt(...): index_abstract + count_abstract > this.count_abstract'); }
        if (count_abstract === 0) { return; }

        if (index_abstract + count_abstract === this.count_abstract) {
            let shiftableCount_abstract = this.count_abstract - (index_abstract + count_abstract);
            if (shiftableCount_abstract > 0) {
                this.copyTo(
                    this.data_literal,
                    index_abstract + count_abstract,
                    this.data_literal,
                    index_abstract,
                    shiftableCount_abstract);
            }
        }
        else {
            this.copyTo(
                this.data_literal,
                index_abstract + count_abstract,
                this.data_literal,
                index_abstract,
                this.count_abstract - (index_abstract + count_abstract));
        }

        this.count_abstract -= count_abstract;
    }

    /**
     * - If the size asked for cannot be allocated, an exception will be thrown. (presumably the wording "thrown by the runtime" is involved.)
     * - JavaScript numbers do not wrap around to negative values when the value is very large.
     *       They instead approach infinity and lose precision.
     *       - There still is a check for whether the new, expected to be larger, capacity is smaller for whatever reason.
     *         Since this ought to be a negligible check for this method to perform.
     *         And failure to catch that case if it happens is an infinite loop.
     */
    ensureCapacityForInsertion(index_abstract, count_abstract) {
        let capacityPrevious_abstract = this.capacity_abstract;
        while (true) {
            if (this.count_abstract + count_abstract > this.capacity_abstract) {
                this.doubleCapacity();
            }
            else if (index_abstract >= this.capacity_abstract) {
                this.doubleCapacity();
            }
            else {
                break;
            }

            if (this.capacity_abstract === capacityPrevious_abstract) {
                break;
            }
            if (this.capacity_abstract < capacityPrevious_abstract) {
                throw new Error('ensureCapacityForInsertion(...): this.capacity_abstract < capacityPrevious_abstract');
            }

            capacityPrevious_abstract = this.capacity_abstract;
        }
    }

    doubleCapacity() {
        let capacityNew_literal = this.capacity_literal * 2;
        let dataNew_literal = new Uint32Array(capacityNew_literal);
        this.copyTo(this.data_literal, 0, dataNew_literal, 0, this.count_abstract);
        this.data_literal = dataNew_literal;
        this.capacity_literal = capacityNew_literal;
        this.capacity_abstract *= 2;
    }

    /**
     * inclusive/exclusive
     */
    copyTo(dataSource_literal, sourceStart_abstract, dataDestination_literal, destinationStart_abstract, length_abstract) {

        if (dataSource_literal === dataDestination_literal) {
            if (dataSource_literal !== this.data_literal) {
                throw new Error('dataSource_literal === dataDestination_literal ; but dataSource_literal !== this.data_literal');
            }

            // TODO: use 'copyWithin' method here and other such locations

            let distance_abstract = destinationStart_abstract - sourceStart_abstract;

            if (distance_abstract > 0) {
                for (var i_abstract = sourceStart_abstract + length_abstract - 1; i_abstract >= sourceStart_abstract; i_abstract--) {
                    let iplusd_abstract = i_abstract + distance_abstract;
                    let iplusd_literal = iplusd_abstract * this.field_count;
                    let i_literal = i_abstract * this.field_count;
                    this.data_literal[iplusd_literal + this.nodeKind_offset] = this.data_literal[i_literal + this.nodeKind_offset];
                    this.data_literal[iplusd_literal + this.key_offset] = this.data_literal[i_literal + this.key_offset];
                    this.data_literal[iplusd_literal + this.depth_offset] = this.data_literal[i_literal + this.depth_offset];
                }
            }
            else {
                for (var i_abstract = destinationStart_abstract; i_abstract < this.count_abstract; i_abstract++) {
                    let iminusd_abstract = i_abstract - distance_abstract;
                    let iminusd_literal = iminusd_abstract * this.field_count;
                    let i_literal = i_abstract * this.field_count;
                    this.data_literal[i_literal + this.nodeKind_offset] = this.data_literal[iminusd_literal + this.nodeKind_offset];
                    this.data_literal[i_literal + this.key_offset] = this.data_literal[iminusd_literal + this.key_offset];
                    this.data_literal[i_literal + this.depth_offset] = this.data_literal[iminusd_literal + this.depth_offset];
                }
            }
        }
        else {
            // TODO: use 'set' method here and other such locations
            for (var i_abstract = 0; i_abstract < length_abstract; i_abstract++) {
                let dSplusi_abstract = destinationStart_abstract + i_abstract;
                let dSplusi_literal = dSplusi_abstract * this.field_count;
                let sSplusi_abstract = sourceStart_abstract + i_abstract;
                let sSplusi_literal = sSplusi_abstract * this.field_count;
                dataDestination_literal[dSplusi_literal + this.nodeKind_offset] = dataSource_literal[sSplusi_literal + this.nodeKind_offset];
                dataDestination_literal[dSplusi_literal + this.key_offset] = dataSource_literal[sSplusi_literal + this.key_offset];
                dataDestination_literal[dSplusi_literal + this.depth_offset] = dataSource_literal[sSplusi_literal + this.depth_offset];
            }
        }
    }
}

let TreeView_pooledNode_nodeKind = TreeViewNodeKind.None;
let TreeView_pooledNode_key = 0;
let TreeView_pooledNode_depth = 0;

/*
// All TreeViewDirector API that is expected to exist from the perspective of the TreeViewComponent is prefixed with 'tvd_'.
interface TreeViewDirector {

    constructor() {
        // The TreeViewComponent doesn't actually touch this field, thus it isn't prefixed with 'tvd_',
        // but it is still likely that every TreeViewDirector would want to include this field on their object.
        this.nodeList = new TreeViewNodeList(32);

        // The TreeViewComponent doesn't actually touch this field, thus it isn't prefixed with 'tvd_',
        // but it is still likely that every TreeViewDirector would want to include this field on their object.
        this.component = new TreeViewComponent();

        // #override
    }

    // This method should not modify the returned value of 'tvd_getTotalCount()' because it is invoked from within a loop in which the upperLimit is cached as the result of 'tvd_getTotalCount()'.
    // @param {*} divItem every divItem contains a span as its first child, this child is designated to contain innerText that represents expandable/expanded state or not. There exists a textnode as the final "child" as well for the display text.
    // @param {*} indexItem 
    // @param {*} isNull the amount of divs that fill the screen is always rendered at all times. So when a div that was populated, is no longer populated you need to clear any previously rendered content for that div, and then set the 'display: none'.
    //
    async tvd_drawItem_async(divItem, indexItem, isNull) {
        if (isNull) {
            // #override
            return;
        }

        // #override
    }
    
    //
    // Not every key invokes this. 
    //
    async tvd_onkeydown_async(divItem, indexItem, key) {
        // #override
    }
    
    async tvd_ondblclick_async(divItem, indexItem) {
        // #override
    }
    
    async tvd_oncontextmenu_async(divItem, indexItem, event, relativeIndex) {
        // #override
    }

    // TODO: To detect whether the "expand/collapse icon" was clicked, the logic 'if(event.target === nodeElement.children[0])' is used...
    // ...this logic is flawed if one ever were to put an element within the span that became the target...
    // ...thus, you should consider checking the x position of the event against the x position of the nodeElement.children[0].
    // @param {*} event 
    //
    async tvd_expandCollapseIconWasClicked_async(divItem, indexItem) {
        // #override
    }
    
    async tvd_arrowRight_async(divItem, indexItem) {
        // #override
	}
    
    async tvd_arrowLeft_async(divItem, indexItem) {
        // #override
    }

    tvd_getTotalCount() {
        // #override
        return this.nodeList.count_abstract;
    }
}
*/

// /**
//  * Be wary of when 'await'(s) are used, perhaps locally copy the data from this if there is concern of it being overwritten during an 'await'.
//  * 
//  * NOTE: You do not store nodes as object instances. They are stored in a TreeViewNodeList as a typed array which contains values...
//  * ...you then read out a node that exists at some index within the TreeViewNodeList by reading the values into this pooled object.
//  */
// interface TreeViewNode {
//     constructor (nodeKind, key, depth) {
//         this.nodeKind = nodeKind;
//         this.key = key;
//         this.depth = depth;
//     }
// }



class DIALOG_FindAll_TreeViewDirector {

    constructor() {
        /** @type {Array} object or string */
        this.actualData = null;

        /**
         * @type {TreeViewNodeList}
         * */
        this.nodeList = new TreeViewNodeList(32);
        this.component = new TreeViewComponent();
    }

    setData_causes_state_reset(actualData) {
        this.actualData = actualData;

        this.nodeList.clear();

        if (!this.actualData) {
            return;
        }

        this.component.setItems(this, APP_lineHeight, APP_lineHeight + 'px');

        for (let i = 0; i < actualData.length; i++) {
            let nodeKind = TreeViewNodeKind.isExpandable_NOTisExpanded;
            this.nodeList.insert(this.nodeList.count_abstract, nodeKind, i, 0);
            this.component.itemHeightTotal = this.tvd_getTotalCount() * this.component.itemHeightNumber;
            this.component.virtualizationElement.style.height = this.component.itemHeightTotal + 'px';
            // Invoke this?: 'await this.component.draw_render_fullReset_async();'
        }

        // TODO: (speculation) I've never liked saying "line height" I believe that deals with the vertical alignment of text within some container...
        // ...is "line height" a good wording.
    }

    /** WARNING: Code here is very duplicated among this and 'tvd_drawItem_BATCH_async'... editor mouse move is throwing an exception so I need to look at that first. */
    async tvd_drawItem_async(divItem, indexItem, isNull) {

        if (isNull) {
            // TODO: Will the user agent remove a text node that has an "empty" nodeValue?
            divItem.lastChild.nodeValue = 'a';
            divItem.lastChild.title = '';
            divItem.style.display = 'none';
            return;
        }

        divItem.style.display = '';

        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;

        // TODO: ipc to main in bulk with all ids that are to be rendered in the current render...
        // ...don't include the ones that are already rendered either only the new ones that came into view.

        let textNode = divItem.lastChild;
        if (textNode.nodeType !== Node.TEXT_NODE) throw new Error('if (textNode.nodeType !== Node.TEXT_NODE)');
        
        let item = this.actualData[key];
        if (item.filename) {
            textNode.nodeValue = item.filename + '(' + item.count + ')';
            divItem.title = item.absolutePath;
        }
        else {
            textNode.nodeValue = item;
            divItem.title = '';
        }

        switch (nodeKind) {
            case TreeViewNodeKind.isExpandable_isExpanded:
                divItem.children[0].innerText = '-';
                break;
            case TreeViewNodeKind.isExpandable_NOTisExpanded:
                divItem.children[0].innerText = '+';
                break;
            case TreeViewNodeKind.NOTisExpandable_isExpanded:
                // TODO: the 'explorer.js' file currently uses the text '}' for 'case TreeViewNodeKind.NOTisExpandable_isExpanded:'...
                // ...this case isn't currently being hit...
                // ...but if it ever were to be hit, perhaps the width of the span would act weirdly if '}' turns out to be the largest width.
                divItem.children[0].innerText = '}';
                break;
            case TreeViewNodeKind.NOTisExpandable_NOTisExpanded:
                divItem.children[0].innerText = '';
                break;
        }

        divItem.style.marginLeft = EXPLORER_offsetPerDepth * depth + 'px';
    }

    /** WARNING: Code here is very duplicated among this and 'tvd_drawItem_async'... editor mouse move is throwing an exception so I need to look at that first. */
    async tvd_drawItem_BATCH_async(start, length, onePositiveDiff_twoNegativeDiff_orThreeFullScreen) {
        let upperBound = start + length;
        let totalCount = this.nodeList.count_abstract;
        let loopCounter = 0;

        for (var indexItem = start; indexItem < upperBound; indexItem++) {

            let divItem;

            switch (onePositiveDiff_twoNegativeDiff_orThreeFullScreen) {
                case 1:
                    divItem = this.component.itemListElement.children[0];
                    break;
                case 2:
                    divItem = this.component.itemListElement.children[this.component.itemListElement.children.length - 1];
                    break;
                case 3:
                    divItem = this.component.itemListElement.children[loopCounter++];
                    break;
            }

            if (indexItem >= totalCount) {
                // TODO: Will the user agent remove a text node that has an "empty" nodeValue?
                divItem.lastChild.nodeValue = 'a';
                divItem.lastChild.title = '';
                divItem.style.display = 'none';
            }
            else {
                divItem.style.display = '';

                this.nodeList.getElementAt(indexItem);
                let key = TreeView_pooledNode_key;
                let depth = TreeView_pooledNode_depth;
                let nodeKind = TreeView_pooledNode_nodeKind;

                // TODO: ipc to main in bulk with all ids that are to be rendered in the current render...
                // ...don't include the ones that are already rendered either only the new ones that came into view.

                let textNode = divItem.lastChild;
                if (textNode.nodeType !== Node.TEXT_NODE) throw new Error('if (textNode.nodeType !== Node.TEXT_NODE)');
                
                let item = this.actualData[key];
                if (item.filename) {
                    textNode.nodeValue = item.filename + '(' + item.count + ')';
                    divItem.title = item.absolutePath;
                }
                else {
                    textNode.nodeValue = item;
                    divItem.title = '';
                }

                switch (nodeKind) {
                    case TreeViewNodeKind.isExpandable_isExpanded:
                        divItem.children[0].innerText = '-';
                        break;
                    case TreeViewNodeKind.isExpandable_NOTisExpanded:
                        divItem.children[0].innerText = '+';
                        break;
                    case TreeViewNodeKind.NOTisExpandable_isExpanded:
                        // TODO: the 'explorer.js' file currently uses the text '}' for 'case TreeViewNodeKind.NOTisExpandable_isExpanded:'...
                        // ...this case isn't currently being hit...
                        // ...but if it ever were to be hit, perhaps the width of the span would act weirdly if '}' turns out to be the largest width.
                        divItem.children[0].innerText = '}';
                        break;
                    case TreeViewNodeKind.NOTisExpandable_NOTisExpanded:
                        divItem.children[0].innerText = '';
                        break;
                }

                divItem.style.marginLeft = EXPLORER_offsetPerDepth * depth + 'px';
            }

            switch (onePositiveDiff_twoNegativeDiff_orThreeFullScreen) {
                case 1:
                    this.component.itemListElement.appendChild(divItem);
                    break;
                case 2:
                    this.component.itemListElement.insertBefore(divItem, this.component.itemListElement.children[loopCounter++]);
                    break;
                case 3:
                    break;
            }
        }
    }
    
    /*** Not every key invokes this. */
    async tvd_onkeydown_async(divItem, indexItem, key) {
        
    }
    
    async tvd_ondblclick_async(divItem, indexItem) {
        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;

        if (nodeKind === TreeViewNodeKind.NOTisExpandable_NOTisExpanded) {

            let textNode = divItem.lastChild;
            if (textNode.nodeType !== Node.TEXT_NODE) throw new Error('if (textNode.nodeType !== Node.TEXT_NODE)');

            const intValue = parseInt(textNode.nodeValue, 10);
            let absolutePath = null;

            for (let i = indexItem - 1; i >= 0; i--) {
                // If ithElementDepth < currentDepth; // then ithElement is the parent of current.
                if (this.nodeList.getDepth(i) < depth) {
                    absolutePath = this.actualData[this.nodeList.getKey(i)].absolutePath;
                    break;
                }
            }

            if (!absolutePath) {
                return;
            }
            
            await EXPLORER_openInEditor(absolutePath, /*shouldFocus*/ true);
            
            // It was wrong cuz of all the '\0\0\0\t' or something?
            if (intValue > EDITOR_lineEndPositionList.count) {
                return;
            }

            EDITOR_moveCursor_lineIndex_columnIndex(intValue, 0);
        }
    }
    
    async tvd_oncontextmenu_async(divItem, indexItem, event, relativeIndex) {
        
    }

    /**
     * TODO: To detect whether the "expand/collapse icon" was clicked, the logic 'if(event.target === nodeElement.children[0])' is used...
     * ...this logic is flawed if one ever were to put an element within the span that became the target...
     * ...thus, you should consider checking the x position of the event against the x position of the nodeElement.children[0].
     * @param {*} event 
     */
    async tvd_expandCollapseIconWasClicked_async(divItem, indexItem) {
        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;

        if (nodeKind === TreeViewNodeKind.isExpandable_NOTisExpanded) {

            divItem.children[0].innerText = '-';
            this.nodeList.setNodeKind(indexItem, TreeViewNodeKind.isExpandable_isExpanded);

            let searchTextInput = document.getElementById('DIALOG_FindAll_searchTextInput');
            if (!searchTextInput) return;
            let results = await window.myAPI.findAllGetPositions(divItem.title, searchTextInput.value, DIALOG_FindAll_options_matchWord);
            if (!results) {
                return;
            }
            if (results.length > 0) {
                this.actualData.splice(indexItem + 1, 0, ...results);

                for (let i = indexItem + 1; i < this.nodeList.count_abstract; i++) {
                    // TODO: Maybe you could delay this cause you'd know there is an expansion at such and such and then on the fly sum it instead.
                    this.nodeList.setKey(i, this.nodeList.getKey(i) + results.length);
                }

                for (let i = 0; i < results.length; i++) {
                    let nodeKind = TreeViewNodeKind.NOTisExpandable_NOTisExpanded;
                    // TODO: Insert range, or at the least 'pre-emptively' resize the list so that it fits each insertion without resizing per insertion.
                    this.nodeList.insert(indexItem + 1 + i, nodeKind, indexItem + 1 + i, depth + 1);
                    this.component.itemHeightTotal = this.tvd_getTotalCount() * this.component.itemHeightNumber;
                    this.component.virtualizationElement.style.height = this.component.itemHeightTotal + 'px';
                }
            }

            await this.component.draw_render_fullReset_async();
        }
        else if (nodeKind === TreeViewNodeKind.isExpandable_isExpanded) {

            divItem.children[0].innerText = '+';
            this.nodeList.setNodeKind(indexItem, TreeViewNodeKind.isExpandable_NOTisExpanded);

            let countChildren = 0;
            for (let i = indexItem + 1; i < this.nodeList.count_abstract; i++) {
                // If currentDepth < ithElementDepth; then current is a parent of ithElement.
                if (depth < this.nodeList.getDepth(i)) {
                    countChildren++;
                }
                else {
                    break;
                }
            }
            if (countChildren > 0) { // TODO: is this check necessary?
                this.actualData.splice(indexItem + 1, countChildren);
                this.nodeList.removeAt(indexItem + 1, countChildren);
                for (let i = indexItem + 1; i < this.nodeList.count_abstract; i++) {
                    // TODO: Maybe you could delay this cause you'd know there is an expansion at such and such and then on the fly sum it instead.
                    this.nodeList.setKey(i, this.nodeList.getKey(i) - countChildren);
                }
                this.component.itemHeightTotal = this.tvd_getTotalCount() * this.component.itemHeightNumber;
                this.component.virtualizationElement.style.height = this.component.itemHeightTotal + 'px';
                await this.component.draw_render_fullReset_async();
            }
        }
    }
    
    async tvd_arrowRight_async(divItem, indexItem) {
        
	}
    
    async tvd_arrowLeft_async(divItem, indexItem) {
        
    }

    tvd_getTotalCount() {
        return this.nodeList.count_abstract;
    }

    addSpecificMenuOptionsForTarget(optionList, divItem, target) {
        
    }
}

/** @type {DIALOG_FindAll_TreeViewDirector} */
let DIALOG_FindAll_TreeViewDirector_instance = null;

async function DIALOG_FindAll_Create_async() {
    let dialogBody = document.getElementById('DIALOG_body');

    let searchTextInput = document.createElement('input');
    searchTextInput.type = "text";
    searchTextInput.placeholder = 'find all';
    searchTextInput.id = 'DIALOG_FindAll_searchTextInput';
    searchTextInput.style.marginLeft = '5px';
    searchTextInput.style.marginTop = '5px';
    searchTextInput.style.height = 'var(--APP-line-height)';
    searchTextInput.addEventListener('keydown', DIALOG_FindAll_searchTextInput_onkeydown);
    dialogBody.appendChild(searchTextInput);
    searchTextInput.focus();
    
    let divOptions = document.createElement('div');
    divOptions.style.height = 'var(--APP-line-height)';
    divOptions.style.whiteSpace = 'nowrap';
    let checkboxMatchWord = document.createElement('input');
    checkboxMatchWord.type = 'checkbox';
    checkboxMatchWord.id = 'DIALOG_FindAll_checkboxMatchWord';
    checkboxMatchWord.checked = DIALOG_FindAll_options_matchWord;
    checkboxMatchWord.addEventListener('change', DIALOG_FindAll_checkboxMatchWord_onchange);
    divOptions.appendChild(checkboxMatchWord);
    let label_for_checkboxMatchWord = document.createElement('label');
    label_for_checkboxMatchWord.htmlFor = 'DIALOG_FindAll_checkboxMatchWord';
    label_for_checkboxMatchWord.textContent = 'matchWord ';
    divOptions.appendChild(label_for_checkboxMatchWord);
    // TODO: The dialog body doesn't currently have an overflow scrollbar, so this will just clip if text goes offscreen due to...
    // ...the encompassing div having 'white-space: nowrap' style.
    // But this behavior is contrary to the ctrl+f. So I wanted to note it in some way with some immediacy before I continued.
    let spanNotes = document.createElement('span');
    spanNotes.id = 'DIALOG_FindAll_spanNotes';
    spanNotes.className = 'eC';
    divOptions.appendChild(spanNotes);
    dialogBody.appendChild(divOptions);

    // TODO: Remove 'searchResultsDiv'? It is pointlessly wrapping.
    let searchResultsDiv = document.createElement('div');
    searchResultsDiv.id = 'DIALOG_FindAll_searchResultsDiv';
    dialogBody.appendChild(searchResultsDiv);
}

async function DIALOG_FindAll_Delete_async() {
    let searchTextInput = document.getElementById('DIALOG_FindAll_searchTextInput');
    if (searchTextInput) {
        searchTextInput.removeEventListener('keydown', DIALOG_FindAll_searchTextInput_onkeydown);
    }
    
    let checkboxMatchWord = document.getElementById('DIALOG_FindAll_checkboxMatchWord');
    if (checkboxMatchWord) {
    	checkboxMatchWord.removeEventListener('change', DIALOG_FindAll_checkboxMatchWord_onchange);
    }

    DIALOG_FindAll_TreeViewDirector_instance = null;
}

async function DIALOG_FindAll_searchTextInput_onkeydown(event) {
    if (event.key === 'Enter') {
        let dialogBody = document.getElementById('DIALOG_body');
        if (!dialogBody) return;
        let searchResultsDiv = document.getElementById('DIALOG_FindAll_searchResultsDiv');
        if (!searchResultsDiv) return;
        let searchTextInput = document.getElementById('DIALOG_FindAll_searchTextInput');
        if (!searchTextInput) return;
        let spanNotes = document.getElementById('DIALOG_FindAll_spanNotes');
	    if (spanNotes) {
	        spanNotes.innerText = '';
	    }

        let search = searchTextInput.value;
        if (!search) {
            return;
        }

        let results = await window.myAPI.findAll(search, DIALOG_FindAll_options_matchWord);
        if (!DIALOG_FindAll_TreeViewDirector_instance) {
            DIALOG_FindAll_TreeViewDirector_instance = new DIALOG_FindAll_TreeViewDirector();
        }
        DIALOG_FindAll_TreeViewDirector_instance.setData_causes_state_reset(results);
        await DIALOG_FindAll_TreeViewDirector_instance.component.draw_create_async(searchResultsDiv, null);
    }
}

function DIALOG_FindAll_checkboxMatchWord_onchange() {
	// for an onchange event, event.target might always be precise?
	let checkboxMatchWord = document.getElementById('DIALOG_FindAll_checkboxMatchWord');
    if (checkboxMatchWord) {
    	DIALOG_FindAll_options_matchWord = checkboxMatchWord.checked;
    	let spanNotes = document.getElementById('DIALOG_FindAll_spanNotes');
	    if (spanNotes) {
	        spanNotes.innerText = 'NOTE: changing \'matchWord\' here does not re-do the search';
	    }
    }
}

async function DIALOG_Settings_Create_async() {
    let dialogBody = document.getElementById('DIALOG_body');
    if (!dialogBody) return;

    let buttonTheme = document.createElement('button');
    buttonTheme.id = 'SETTINGS_theme';
    buttonTheme.innerText = 'Theme';
    buttonTheme.addEventListener('click', DIALOG_buttonTheme_onclick);
    dialogBody.appendChild(buttonTheme);

    let checkboxTrueTabsFalseSpaces = document.createElement('input');
    checkboxTrueTabsFalseSpaces.type = 'checkbox';
    checkboxTrueTabsFalseSpaces.id = 'SETTINGS_trueTabs_falseSpaces';
    checkboxTrueTabsFalseSpaces.checked = DIALOG_Settings_trueTabs_falseSpaces; // Optional: sets the initial state to checked
    checkboxTrueTabsFalseSpaces.addEventListener('change', DIALOG_checkboxTrueTabsFalseSpaces_onchange);
    dialogBody.appendChild(checkboxTrueTabsFalseSpaces);
	// -----------------------------------------------------------
    let label_for_checkboxTrueTabsFalseSpaces = document.createElement('label');
    label_for_checkboxTrueTabsFalseSpaces.htmlFor = 'SETTINGS_trueTabs_falseSpaces';
    label_for_checkboxTrueTabsFalseSpaces.textContent = 'trueTabs_falseSpaces';
    dialogBody.appendChild(label_for_checkboxTrueTabsFalseSpaces);
    
    let checkboxEditorDebugShowAdjacentCharacters = document.createElement('input');
    checkboxEditorDebugShowAdjacentCharacters.type = 'checkbox';
    checkboxEditorDebugShowAdjacentCharacters.id = 'SETTINGS_editorDebugShowAdjacentCharacters';
    checkboxEditorDebugShowAdjacentCharacters.checked = DIALOG_Settings_editorDebugShowAdjacentCharacters; // Optional: sets the initial state to checked
    checkboxEditorDebugShowAdjacentCharacters.addEventListener('change', DIALOG_checkboxEditorDebugShowAdjacentCharacters_onchange);
    dialogBody.appendChild(checkboxEditorDebugShowAdjacentCharacters);
	// -----------------------------------------------------------
    let label_for_checkboxEditorDebugShowAdjacentCharacters = document.createElement('label');
    label_for_checkboxEditorDebugShowAdjacentCharacters.htmlFor = 'SETTINGS_editorDebugShowAdjacentCharacters';
    label_for_checkboxEditorDebugShowAdjacentCharacters.textContent = 'editorDebugShowAdjacentCharacters';
    dialogBody.appendChild(label_for_checkboxEditorDebugShowAdjacentCharacters);
}

async function DIALOG_Settings_Delete_async() {
    let dialogBody = document.getElementById('DIALOG_body');
    if (!dialogBody) return;
    
    let buttonTheme = document.getElementById('SETTINGS_theme');
    if (buttonTheme) {
        buttonTheme.removeEventListener('click', DIALOG_buttonTheme_onclick);
    }

    let checkboxTrueTabsFalseSpaces = document.getElementById('SETTINGS_trueTabs_falseSpaces');
    if (checkboxTrueTabsFalseSpaces) {
        checkboxTrueTabsFalseSpaces.removeEventListener('change', DIALOG_checkboxTrueTabsFalseSpaces_onchange);
    }
    
    let checkboxEditorDebugShowAdjacentCharacters = document.getElementById('SETTINGS_editorDebugShowAdjacentCharacters');
    if (checkboxEditorDebugShowAdjacentCharacters) {
    	checkboxEditorDebugShowAdjacentCharacters.removeEventListener('change', DIALOG_checkboxEditorDebugShowAdjacentCharacters_onchange);
    }
}

function DIALOG_buttonTheme_onclick() {
    if (DIALOG_Settings_isDark) {
        DIALOG_Settings_isDark = false;
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    }
    else {
        DIALOG_Settings_isDark = true;
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }
}

function DIALOG_checkboxTrueTabsFalseSpaces_onchange() {
    let checkboxTrueTabsFalseSpaces = document.getElementById('SETTINGS_trueTabs_falseSpaces');
    if (!checkboxTrueTabsFalseSpaces) return;

    DIALOG_Settings_trueTabs_falseSpaces = checkboxTrueTabsFalseSpaces.checked;
    if (DIALOG_Settings_trueTabs_falseSpaces) {
        EDITOR_on_tab_bytes = EDITOR_tab_tabsbytes;
    }
    else {
        EDITOR_on_tab_bytes = EDITOR_tab_spacesbytes;
    }
}

function DIALOG_checkboxEditorDebugShowAdjacentCharacters_onchange() {
    let checkboxEditorDebugShowAdjacentCharacters = document.getElementById('SETTINGS_editorDebugShowAdjacentCharacters');
    if (!checkboxEditorDebugShowAdjacentCharacters) return;

    DIALOG_Settings_editorDebugShowAdjacentCharacters = checkboxEditorDebugShowAdjacentCharacters.checked;
    EDITOR_drawCursor(EDITOR_primaryCursor);
}

async function DIALOG_DocumentSymbol_Create_async() {
    let dialogBody = document.getElementById('DIALOG_body');
    if (!dialogBody) return;

    if (EDITOR_documentSymbolResult) {
        let div = document.createElement('div');
        div.innerText = 'EDITOR_documentSymbolResult.length: ' + EDITOR_documentSymbolResult.length;
        div.style.height = APP_lineHeight + 'px';
        div.style.whiteSpace = 'nowrap';
        dialogBody.appendChild(div);
        EDITOR_listComponent.rootElement.style.height = `calc(100% - ${div.style.height})`;
        EDITOR_listComponent.draw_create(dialogBody, null);
    }
    else {
        dialogBody.innerText = 'EDITOR_documentSymbolResult is falsey';
    }
}

async function DIALOG_DocumentSymbol_Delete_async() {
    let dialogBody = document.getElementById('DIALOG_body');
    if (!dialogBody) return;
    if (EDITOR_listComponent) {
        EDITOR_listComponent.draw_delete();
        EDITOR_listComponent = null;
    }
    EDITOR_documentSymbolResult = null;
}

let DEBUG_listData = null;
let DEBUG_listComponent = null;

async function DIALOG_Debug_Create_async() {
    let dialogBody = document.getElementById('DIALOG_body');
    if (!dialogBody) return;
    
    DEBUG_listData = new Uint16Array(65_536);
    for (let i = 0; i < 65_536; i++) {
        DEBUG_listData[i] = i;
    }

    if (!DEBUG_listComponent) {
        DEBUG_listComponent = new ListComponent();
    }
    DEBUG_listComponent.setItems(APP_lineHeight, APP_lineHeight + 'px',
        /*drawItemAction*/ (div, index) => {
            if (index === -1) {
                div.innerText = '';
                div.title = '';
                div.style.display = 'none';
            }
            else {
                let item = DEBUG_listData[index];
                div.innerText = item;
                div.style.display = '';
            }
        },
        /*onkeydownAction*/ (div, index) => {
            //if (index === -1) {
            //    // TODO: if (index === -1)
            //}
            //else {
            //    // TODO: Ensure that json parsing the title like this is a safe way of doing things
            //    const startPosition = JSON.parse(div.title);
            //    EDITOR_moveCursor_lineIndex_columnIndex(startPosition.line, startPosition.character);
            //}
        },
        /*getItemsCountFunc*/ () => {
            if (DEBUG_listData) {
                return DEBUG_listData.length;
            }
            else {
                return 0;
            }
        });
    
    if (DEBUG_listData) {
        let div = document.createElement('div');
        div.innerText = 'DEBUG_listData.length: ' + DEBUG_listData.length;
        div.style.height = APP_lineHeight + 'px';
        div.style.whiteSpace = 'nowrap';
        dialogBody.appendChild(div);
        DEBUG_listComponent.rootElement.style.height = `calc(100% - ${div.style.height})`;
        DEBUG_listComponent.draw_create(dialogBody, null);
    }
    else {
        dialogBody.innerText = 'DEBUG_listData is falsey';
    }
}

async function DIALOG_Debug_Delete_async() {
    let dialogBody = document.getElementById('DIALOG_body');
    if (!dialogBody) return;

    DEBUG_listData = null;
    DEBUG_listComponent = null;
}


/**
 * When in doubt, behavior should replicate that of an HTML element if applicable.
 * i.e.: What happens if I try to show this in two separate places at the same time?
 * - You remove the current parent prior to drawing it at the new parent with the given child index.
 * - TODO: Are you sure you have it written in a way that conforms to your statements made above ^...
 *     - I think I recall adding event listeners to an HTML element prior to having the element having a parent, and then upon
 *           giving it a parent, the event listeners weren't working.
 *           - Is this true? / are there other oddities you don't expect involved?
 * 
 * Now that I think about it... would it be possible / sensible to somehow tell JavaScript this "inherits" an HTML element or something like this?
 * I looked and it seems possible but I'm not sure I want to do this. It kinda gives me the ick (at least at first glance)
 */
class ListComponent {
    /**
     * @param {*} itemHeight invoker provides or does this class calculate it?
     * TODO: itemHeight is never used
     */
    constructor(itemHeight) {
        /**
         * @type {HTMLDivElement}
         */
        this.rootElement = document.createElement('div');
        this.rootElement.className = 'LIST_moveChildNodes';
        this.rootElement.tabIndex = 0;
        this.rootElement.style.height = '100%';

        this.virtualizationElement = document.createElement('div');
        this.virtualizationElement.className = 'LIST_moveChildNodes_virtualization';
        this.rootElement.appendChild(this.virtualizationElement);

        /** Consider the existence of such methods as 'state_cursor_setIndex' before mutating state directly */
        this.cursorElement = document.createElement('div');
        this.cursorElement.className = 'LIST_moveChildNodes_cursor';
        this.rootElement.appendChild(this.cursorElement);

        this.itemListElement = document.createElement('div');
        this.itemListElement.className = 'LIST_moveChildNodes_itemList';
        this.rootElement.appendChild(this.itemListElement);

        this.itemHeightTotal = 0;

        /** Consider the existence of such methods as 'state_cursor_setIndex' before mutating state directly */
        this.cursorIndex = 0;

        this._ONSCROLLscrollTop = 0;
        this._ONSCROLLvirtualIndex = 0;
        this._ONSCROLLvirtualCount = 0;
        
        this.event_scroll_timer = null;
        this.event_scroll_bool = false;

        this.bound_event_click = this.event_click.bind(this);
        this.bound_event_keydown = this.event_keydown.bind(this);
        this.bound_event_scroll_WRAPIT = this.event_scroll_WRAPIT.bind(this);
        this.bound_event_windowResize = this.event_windowResize.bind(this);

        this.domLineNodesZerothIndex = 0;

        /**
         * It could be useful to inherit HTML element due to storage, you'd have to hold a null reference that you can set
         * or store a array of 'List' to somehow hold the reference.
         * 
         * If you inherit HTML element the document likely could do the "storage" of the reference
         * 
         * So then for this reason, you want to be able to understand the context of the section in the app you are working within.
         * This tells you how many ListComponent you need "worst case scenario"
         * 
         * If a certain section of the app only needs to show 1 list at any given moment, you can allocate a single ListComponent
         * and re-use it.
         * 
         * Meanwhile some other section might be displaying 2 lists, so they'd allocate 2 ListComponent.
         * 
         * And if desirable you can set your section's ListComponent to null when you aren't using it
         * with the goal of GC collecting the instance during the time that it isn't being used.
         */
    }

    /**
     * @param {*} itemHeightNumber '50'; cursorTop = currentIndex * itemHeightNumber;
     * @param {*} itemHeightStyleAttributeValueString '50px'; div.style.height = itemHeightStyleAttributeValueString;
     * @param {*} drawItemAction receives the div that represents the individual item in the list, the index of the item OR -1 to indicate the function should clear the div because there is no entry at that location (need to handle null item due to when viewport isn't filled). This div is empty, and you can do "whatever you want to it" provided the height stays consistent.
     * @param {*} onkeydownAction receives the div that represents the individual item in the list, the index of the item OR -1 to indicate there is no entry at that location.
     * @param {*} getItemsCountFunc returns the total count of items
     */
    setItems(itemHeightNumber, itemHeightStyleAttributeValueString, drawItemAction, onkeydownAction, getItemsCountFunc) {
        this.itemListElement.innerHTML = '';
        this.virtualizationElement.style.height = 1 + 'px';
        this.state_cursor_setIndex(0);

        this.itemHeightNumber = itemHeightNumber;
        this.itemHeightStyleAttributeValueString = itemHeightStyleAttributeValueString;
        /** receives the div that represents the individual item in the list, the index of the item, and the item itself. This div is empty, and you can do "whatever you want to it" provided the height stays consistent. */
        this.drawItemAction = drawItemAction;
        /** receives the div that represents the individual item in the list, the index of the item, and the item itself. */
        this.onkeydownAction = onkeydownAction;

        this.cursorElement.style.height = this.itemHeightStyleAttributeValueString;
        this.getItemsCountFunc = getItemsCountFunc;
        this.itemHeightTotal = this.getItemsCountFunc() * this.itemHeightNumber;
        this.virtualizationElement.style.height = this.itemHeightTotal + 'px';
        this.boundingClientRect = null;
    }

    /**
     * if (this.rootElement.parentElement) return;
     * Because the "list" is already drawn somewhere and 'draw_delete()' needs to be invoked prior to drawing at a different location.
     * 
     * @param {HTMLElement} parentElement 
     * @param {*} insertBeforeThisChild (if falsey, the list UI is appended to the parent element)
     */
    draw_create(parentElement, insertBeforeThisChild) {
        if (this.rootElement.parentElement) return;
        parentElement.insertBefore(this.rootElement, insertBeforeThisChild);
        this.draw_addEvents();
        this.draw_render();
    }

    /**
     * if (!this.rootElement.parentElement) return;
     * Because the "list" is not drawn, no UI needs to be removed.
     * (the purpose of this method is more-so related to unsubscribing of events and other such non-automatic actions that need to be performed)
     * 
     * @returns 
     */
    draw_delete() {
        if (!this.rootElement.parentElement) return;
        this.draw_removeEvents();
        this.boundingClientRect = null;
        this.rootElement.parentElement.removeChild(this.rootElement);
    }

    draw_addEvents() {
        this.rootElement.addEventListener('click', this.bound_event_click);
        this.rootElement.addEventListener('keydown', this.bound_event_keydown);
        this.rootElement.addEventListener('scroll', this.bound_event_scroll_WRAPIT);
        window.addEventListener('resize', this.bound_event_windowResize);
    }
    
    draw_removeEvents() {
        this.rootElement.removeEventListener('click', this.bound_event_click);
        this.rootElement.removeEventListener('keydown', this.bound_event_keydown);
        this.rootElement.removeEventListener('scroll', this.bound_event_scroll_WRAPIT);
        window.removeEventListener('resize', this.bound_event_windowResize);
    }

    draw_render() {
        if (!this.boundingClientRect) {
            this.ensure_boundingClientRect();
        }

        if (this.itemListElement.children.length !== this.virtualCount) {
            this.draw_render_fullReset();
        }
        else {
            this.virtualIndex = Math.floor(this.rootElement.scrollTop / this.itemHeightNumber);

            if (this._ONSCROLLscrollTop === this.rootElement.scrollTop &&
                this._ONSCROLLvirtualIndex === this.virtualIndex &&
                this._ONSCROLLvirtualCount === this.virtualCount) {
                    return;
            }

            this._ONSCROLLscrollTop = this.rootElement.scrollTop;

            // If I delay setting 'this._ONSCROLLvirtualIndex' then I can just use that.
            // I can't bear to do that right now though. I'm just gonna make this variable.
            let prevVli = this._ONSCROLLvirtualIndex;
            let currVli = this.virtualIndex;

            this._ONSCROLLvirtualIndex = this.virtualIndex;

            if (this._ONSCROLLvirtualCount === this.virtualCount &&
                this.itemListElement.children.length === this.virtualCount) {

                // The same count of lines is on the UI so you can probably
                // redraw them one by one and save "some" of the existing HTML.

                let diff = currVli - prevVli;

                // There are 3 cases:
                // - move small lines to end of list with the content changed
                // - move the final lines to the start with the content changed
                // - keep lines in place and redraw over them all

                if (diff > 0 && diff < this.virtualCount) {
                    
                    let firstIndexLineThatWasNotAlreadyRendered = prevVli + this._ONSCROLLvirtualCount;
                    let itemsCount = this.getItemsCountFunc();
                    let vertical = (prevVli + this._ONSCROLLvirtualCount) * this.itemHeightNumber;
                    let origin = this.domLineNodesZerothIndex;

                    this.domLineNodesZerothIndex = origin + diff;
                    if (this.domLineNodesZerothIndex >= this.itemListElement.children.length) {
                        this.domLineNodesZerothIndex -= this.itemListElement.children.length;
                    }

                    for (var i = 0; i < diff; i++) {
                        let indexItem = prevVli + this._ONSCROLLvirtualCount + i;

                        let aaa = origin + i;            
                        if (aaa >= this.itemListElement.children.length) {
                            aaa -= this.itemListElement.children.length;
                        }

                        let divItem = this.itemListElement.children[aaa];
                        
                        divItem.style.transform = `translateY(${vertical}px)`;
                        vertical += this.itemHeightNumber;

                        if (indexItem >= itemsCount)
                            this.drawItemAction(divItem, -1);
                        else
                            this.drawItemAction(divItem, indexItem);
                    }
                }
                else if (diff < 0 && (diff *= -1) < this.virtualCount) {

                    // move the final lines to the start
                    // move large lines to start of list with the content changed

                    let itemsCount = this.getItemsCountFunc();

                    let lastIndex;
                    if (this.domLineNodesZerothIndex === 0) {
                        lastIndex = this.itemListElement.children.length - 1;
                    }
                    else {
                        lastIndex = this.domLineNodesZerothIndex - 1;
                    }
                    this.domLineNodesZerothIndex = lastIndex - (diff - 1);

                    if (this.domLineNodesZerothIndex < 0) {
                        this.domLineNodesZerothIndex += this.itemListElement.children.length;
                    }

                    let vertical = (currVli + (diff - 1)) * this.itemHeightNumber;
                    
                    for (var i = 0; i < diff; i++) {
                        let indexItem = currVli + i;
                        
                        let divItem = this.itemListElement.children[lastIndex--];
                        if (lastIndex <= -1) {
                            lastIndex = this.itemListElement.children.length - 1;
                        }

                        divItem.style.transform = `translateY(${vertical}px)`;
                        vertical -= this.itemHeightNumber;

                        if (indexItem >= itemsCount)
                            this.drawItemAction(divItem, -1);
                        else
                            this.drawItemAction(divItem, indexItem);
                    }
                }
                else {
                    // re-use the divs, but keep them in place and redraw over them all

                    let itemsCount = this.getItemsCountFunc();
                    let vertical = this.virtualIndex * this.itemHeightNumber;
                    let origin = this.domLineNodesZerothIndex;
                    
                    for (var i = 0; i < this.virtualCount; i++) {
                        let indexItem = i + this.virtualIndex;

                        let aaa = origin + i;            
                        if (aaa >= this.itemListElement.children.length) {
                            aaa -= this.itemListElement.children.length;
                        }

                        let divItem = this.itemListElement.children[aaa];

                        divItem.style.transform = `translateY(${vertical}px)`;
                        vertical += this.itemHeightNumber;

                        if (indexItem >= itemsCount)
                            this.drawItemAction(divItem, -1);
                        else
                            this.drawItemAction(divItem, indexItem);
                    }
                }

                /*let smallestTopValue = 9999;
                    let smallestTopSourceIndex = -1;
                    let largestTopValue = -1;
                    let largestTopSourceIndex = -1;

                    for (let i = 0; i < this.itemListElement.children.length; i++) {
                        let top = parseInt(this.itemListElement.children[i].style.top);
                        if (top > largestTopValue) {
                            largestTopValue = top;
                            largestTopSourceIndex = i;
                        }
                        if (top < smallestTopValue) {
                            smallestTopValue = top;
                            smallestTopSourceIndex = i;
                        }
                    }

                    if (smallestTopSourceIndex !== this.domLineNodesZerothIndex) {
                        console.log(`c2 => ${smallestTopSourceIndex} !== this.${this.domLineNodesZerothIndex}`);
                    }*/
            }
        }
    }

    draw_render_fullReset() {
        this._ONSCROLLvirtualCount = this.virtualCount;
        this.itemListElement.innerHTML = '';
        this.virtualIndex = Math.floor(this.rootElement.scrollTop / this.itemHeightNumber);
        this.domLineNodesZerothIndex = 0;

        let itemsCount = this.getItemsCountFunc();
        let vertical = this.virtualIndex * this.itemHeightNumber;

        for (let i = 0; i < this.virtualCount; i++) {
            // TODO: you don't break you still populate and then drawItemAction handles a null case?
            if (this.virtualIndex + i >= itemsCount) {
                break;
            }
            let divItem = document.createElement('div');
            divItem.style.height = this.itemHeightStyleAttributeValueString;
            divItem.style.position = 'absolute';
            divItem.style.transform = `translateY(${vertical}px)`;
            vertical += this.itemHeightNumber;
            divItem.innerText = i;
            this.itemListElement.appendChild(divItem);
            this.drawItemAction(divItem, this.virtualIndex + i);
        }
    }

    event_click(event) {
        this.ensure_boundingClientRect();

        let rY = event.clientY - this.boundingClientRect.top + this.rootElement.scrollTop;
        let index = Math.floor(rY / this.itemHeightNumber);
        index = this.state_cursor_validateIndex(index);
        this.state_cursor_setIndex(index);
    }
    
    event_keydown(event) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.state_cursor_setIndex(
                    this.state_cursor_validateIndex(this.cursorIndex + 1));
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.state_cursor_setIndex(
                    this.state_cursor_validateIndex(this.cursorIndex - 1));
                break;
            case ' ':
                event.preventDefault();
                this.state_cursor_setIndex(
                    this.state_cursor_validateIndex(this.cursorIndex));
                let relativeIndex = this.cursorIndex - this.virtualIndex;
                if (relativeIndex >= 0 && relativeIndex < this.itemListElement.children.length) { // check if is in virtualization space
                    relativeIndex += this.domLineNodesZerothIndex; // then map the "relativeIndex" by the origin aka:'this.domLineNodesZerothIndex'... i.e.: which line in the dom is the first line from the top of the screen down.
                    if (relativeIndex >= this.itemListElement.children.length) {
                        relativeIndex -= this.itemListElement.children.length;
                    }
                    this.onkeydownAction(this.itemListElement.children[relativeIndex], this.cursorIndex);
                }
                break;
        }
    }

    /**
     * intra-app resizes or movements will also invoke this; i.e.: if a list is shown in a dialog and the dialog is resized or moved.
     */
    event_windowResize() {
        this.boundingClientRect = null;
    }
    
    event_scroll_WRAPIT() {
        this.event_scroll_bool = true;
	    if (!this.event_scroll_timer) {
	    	this.event_scroll();
	        this.event_scroll_timer = setTimeout(this.event_scroll_timeoutFunc, 100, this);
	    }
    }
    
    event_scroll_timeoutFunc(context) {
        if (/*trailing && lastArgs*/ context.event_scroll_bool) {
            context.event_scroll_bool = false;
            context.event_scroll();
            context.event_scroll_timer = setTimeout(context.event_scroll_timeoutFunc, 100, context);
        } else {
            context.event_scroll_timer = null;
        }
    }
    
    event_scroll() {
        this.draw_render();
    }

    ensure_boundingClientRect() {
        if (!this.boundingClientRect) {
            this.boundingClientRect = this.rootElement.getBoundingClientRect();
            this.virtualCount = Math.ceil(this.rootElement.offsetHeight / this.itemHeightNumber);
        }
    }

    /**
     * if (this.cursorIndex === index) return;
     * 
     * @param {*} index 
     */
    state_cursor_setIndex(index) {
        if (this.cursorIndex === index) return;

        this.cursorIndex = index;
        this.cursorTopNumber = this.cursorIndex * this.itemHeightNumber;
        this.cursorElement.style.top = this.cursorTopNumber + 'px';

        this.ensure_boundingClientRect();

        if (this.cursorTopNumber + (2 * this.itemHeightNumber) > this.rootElement.scrollTop + this.boundingClientRect.height) {
            let currentBottom = this.rootElement.scrollTop + this.boundingClientRect.height;
            let changeToMakeBottomTouch = this.cursorTopNumber - currentBottom;
            let entireValueToScrollBy = changeToMakeBottomTouch + (2 * this.itemHeightNumber);
            this.rootElement.scrollBy(0, entireValueToScrollBy);
        }
        else if (this.cursorTopNumber < this.rootElement.scrollTop) {
            this.rootElement.scrollBy(0, this.cursorTopNumber - this.rootElement.scrollTop);
        }
    }

    /**
     * if (this.cursorIndex === index) return;
     * 
     * @param {*} index 
     */
    state_cursor_validateIndex(index) {
        let itemsCount = this.getItemsCountFunc();
        if (index >= itemsCount) {
            index = itemsCount - 1;
        }
        if (index < 0) {
            index = 0;
        }
        return index;
    }
}

/*
I'm noticing that as I click and drag the slider it doesn't continually update the UI
it seems to only update the UI if I let go or something?

I thought that was because of unresponsiveness or something?
Maybe it is?
or maybe it literally isn't running the code?
Have to confirm one way or the other what is going on.
*/


class ByteList {
    bytes;
    capacity;
    count;

    constructor(initialCapacity) {
        // The Uint8Array avoids serialization during IPC
        this.bytes = new Uint8Array(initialCapacity);
        this.capacity = initialCapacity;
        this.count = 0;
    }

    /**
     * Does not clear the information, only sets 'this.count' to '0'.
     */
    clear() {
        this.count = 0;
    }

    /**
     * TODO: ensure all the parameters are encoded, especially because I'm noticing myself forgetting.
     */
    insert(index, byte) {
        this.ensureCapacityForInsertion(index, 1);

        if (index !== this.count) {
            this.copyTo(this.bytes, index, this.bytes, index + 1, this.count - index);
        }

        this.bytes[index] = byte;

        this.count++;
    }

    insertString(index, string, encoder) {
        this.ensureCapacityForInsertion(index, string.length);

        if (index !== this.count) {
            this.copyTo(this.bytes, index, this.bytes, index + string.length, this.count - index);
        }

        for (var i = 0; i < string.length; i++) {
            this.bytes[index + i] = encoder.encode(string[i]);
        }

        this.count += string.length;
    }
    
    /**
     * @param {number} index 
     * @param {Uint8Array} incomingBs the incoming bytes, name avoids confusion with this.bytes
     * @param {number} offset the offset to begin reading from
     * @param {number} length the amount of bytes to read
     */
    insertBytes(index, incomingBs, offset, length) {
        this.ensureCapacityForInsertion(index, length);

        if (index !== this.count) {
            this.copyTo(this.bytes, index, this.bytes, index + length, this.count - index);
        }

        for (var i = 0; i < length; i++) {
            this.bytes[index + i] = incomingBs[offset + i];
        }

        this.count += length;
    }

    /**
     * 
     * @param {number} sourceStart 
     * @param {number} destinationStart 
     * @param {number} length 
     */
    duplicateWithin(sourceStart, destinationStart, length) {

        if (sourceStart + length > destinationStart) {
            // TODO: This perhaps could result in the initial 'copyTo' step that creates space within the array, having clobbered the source.
            //
            // TODO: I'm gonna throw an error if 'sourceStart + length > destinationStart' that should let me do the simple duplicate case and then go from there.
            //
            // TODO: When copying text you only need to remember the positions maybe, and then if the user loses focus of the app...
            // ...only then would you need to create text from their selection in case they intend to paste to an external app...
            // ...otherwise paste could just be a copyWithin if copy and paste only occurs within the app itself?
            //
            throw new Error('TODO: sourceStart + length > destinationStart');
        }

        this.ensureCapacityForInsertion(destinationStart, length);

        if (destinationStart !== this.count) {
            this.copyTo(this.bytes, destinationStart, this.bytes, destinationStart + length, this.count - destinationStart);
        }

        this.copyTo(this.bytes, sourceStart, this.bytes, destinationStart, length);

        this.count += length;
    }

    /**
     * Does not clear trailing information.
     * 
     * count === 0 immediately returns
     */
    removeAt(index, count) {

        if (index > this.count) { throw new Error('removeAt(...): index > this.count'); }
        if (index + count > this.count) { throw new Error('removeAt(...): index + count > this.count'); }
        if (count === 0) { return; }

        if (index + count === this.count) {
            let shiftableCount = this.count - (index + count);
            if (shiftableCount > 0) {
                this.copyTo(
                    this.bytes,
                    index + count,
                    this.bytes,
                    index,
                    shiftableCount);
            }
        }
        else {
            this.copyTo(
                this.bytes,
                index + count,
                this.bytes,
                index,
                this.count - (index + count));
        }

        this.count -= count;
    }

    /**
     * - If the size asked for cannot be allocated, an exception will be thrown. (presumably the wording "thrown by the runtime" is involved.)
     * - JavaScript numbers do not wrap around to negative values when the value is very large.
     *       They instead approach infinity and lose precision.
     *       - There still is a check for whether the new, expected to be larger, capacity is smaller for whatever reason.
     *         Since this ought to be a negligible check for this method to perform.
     *         And failure to catch that case if it happens is an infinite loop.
     */
    ensureCapacityForInsertion(index, count) {
        let capacityPrevious = this.capacity;
        while (true) {
            if (this.count + count > this.capacity) {
                this.doubleCapacity();
            }
            else if (index >= this.capacity) {
                this.doubleCapacity();
            }
            else {
                break;
            }

            if (this.capacity === capacityPrevious) {
                break;
            }
            if (this.capacity < capacityPrevious) {
                throw new Error('ensureCapacityForInsertion(...): this.capacity < capacityPrevious');
            }

            capacityPrevious = this.capacity;
        }
    }

    doubleCapacity() {
        let capacityNew = this.capacity * 2;
        let bytesNew = new Uint8Array(capacityNew);
        this.copyTo(this.bytes, 0, bytesNew, 0, this.count);
        this.bytes = bytesNew;
        this.capacity = capacityNew;
    }

    /**
     * inclusive/exclusive
     */
    copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {

        if (bytesSource === bytesDestination) {
            if (bytesSource !== this.bytes) {
                throw new Error('bytesSource === bytesDestination ; but bytesSource !== this');
            }

            this.bytes.copyWithin(destinationStart, sourceStart, sourceStart + length);
        }
        else {
            // TODO: use 'set' method here and other such locations
            for (var i = 0; i < length; i++) {
                bytesDestination[destinationStart + i] = bytesSource[sourceStart + i];
            }
        }
    }
}

class UInt32List {
    data;
    capacity;
    count;

    constructor(initialCapacity) {
        this.data = new Uint32Array(initialCapacity);
        this.capacity = initialCapacity;
        this.count = 0;
    }

    /**
     * Does not clear the information, only sets 'this.count' to '0'.
     */
    clear() {
        this.count = 0;
    }

    /**
     * TODO: ensure all the parameters are encoded, especially because I'm noticing myself forgetting.
     */
    insert(index, int32Value) {
        this.ensureCapacityForInsertion(index, 1);

        if (index !== this.count) {
            this.copyTo(this.data, index, this.data, index + 1, this.count - index);
        }

        this.data[index] = int32Value;

        this.count++;
    }

    /**
     * Does not clear trailing information.
     * 
     * count === 0 immediately returns
     */
    removeAt(index, count) {

        if (index > this.count) { throw new Error('removeAt(...): index > this.count'); }
        if (index + count > this.count) { throw new Error('removeAt(...): index + count > this.count'); }
        if (count === 0) { return; }

        if (index + count === this.count) {
            let shiftableCount = this.count - (index + count);
            if (shiftableCount > 0) {
                this.copyTo(
                    this.data,
                    index + count,
                    this.data,
                    index,
                    shiftableCount);
            }
        }
        else {
            this.copyTo(
                this.data,
                index + count,
                this.data,
                index,
                this.count - (index + count));
        }

        this.count -= count;
    }

    /**
     * - If the size asked for cannot be allocated, an exception will be thrown. (presumably the wording "thrown by the runtime" is involved.)
     * - JavaScript numbers do not wrap around to negative values when the value is very large.
     *       They instead approach infinity and lose precision.
     *       - There still is a check for whether the new, expected to be larger, capacity is smaller for whatever reason.
     *         Since this ought to be a negligible check for this method to perform.
     *         And failure to catch that case if it happens is an infinite loop.
     */
    ensureCapacityForInsertion(index, count) {
        let capacityPrevious = this.capacity;
        while (true) {
            if (this.count + count > this.capacity) {
                this.doubleCapacity();
            }
            else if (index >= this.capacity) {
                this.doubleCapacity();
            }
            else {
                break;
            }

            if (this.capacity === capacityPrevious) {
                break;
            }
            if (this.capacity < capacityPrevious) {
                throw new Error('ensureCapacityForInsertion(...): this.capacity < capacityPrevious');
            }

            capacityPrevious = this.capacity;
        }
    }

    doubleCapacity() {
        let capacityNew = this.capacity * 2;
        let bytesNew = new Uint32Array(capacityNew);
        this.copyTo(this.data, 0, bytesNew, 0, this.count);
        this.data = bytesNew;
        this.capacity = capacityNew;
    }

    /**
     * inclusive/exclusive
     */
    copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {

        if (bytesSource === bytesDestination) {
            if (bytesSource !== this.data) {
                throw new Error('bytesSource === bytesDestination ; but bytesSource !== this');
            }

            this.data.copyWithin(destinationStart, sourceStart, sourceStart + length);
        }
        else {
            // TODO: use 'set' method here and other such locations
            for (var i = 0; i < length; i++) {
                bytesDestination[destinationStart + i] = bytesSource[sourceStart + i];
            }
        }
    }
}


let EDITOR_trackedSyntaxList = new TrackedSyntaxList(32);

// What about if there is any overhead relating to const global numbers?
const ASCII_LINE_FEED = 10;
const ASCII_TAB = 9;
const ASCII_SPACE = 32;

/**
 * @type {UInt32List}
 */
let EDITOR_findOverlay_searchResultPositionList;

let EDITOR_textByteList = new ByteList(1024);
const EDITOR_encoder = new TextEncoder();
const EDITOR_decoder = new TextDecoder();

class EDITOR_Cursor {

    static STATIC_CURSOR_ID = 1;
    /**
     * I'm not sure how large I want this, what matters is that I just have a size of anything for the time being, then can change this constant later.
     */
    static GAP_BUFFER_CAPACITY = 32;

    /**
     * After invoking the constructor you likely would want to add to:
     * - get_EDITOR_cursorListElement(),
     * - EDITOR_cursorList,
     * 
     * `get_EDITOR_cursorListElement().appendChild(cursorInstance.caretRow)`
     * `EDITOR_cursorList.splice(index, 0, cursorInstance)`
     */
    constructor() {
        this.indexLine = 0;
        this.indexColumn = 0;
        /**
         * When moving cursor vertically, if the current column index cannot be matched due to the upcoming line being too short,
         * then this will allow a later vertical movement to a line that is long enough to match the original column rather than the minimized one.
         */
        this.STORED_indexColumn = 0;
        this.cursorTopValue = 0;
        this.cursorLeftValue = 0;
        this.selectionAnchor = 0;
        this.selectionEnd = 0;
        this.DRAWN_selectionAnchor = 0;
        this.DRAWN_selectionEnd = 0;
        this.DRAWN_selection_virtualLineIndex = 0;
        this.DRAWN_selection_virtualCount = 0;
        this.editKind = get_EditKind_None();
        this.editLength = 0;
        this.editPosition = 0;
        this.editIndexLine = 0;
        this.editIndexColumn = 0;
        this.END_editIndexLine = 0;
        this.END_editIndexColumn = 0;
        // TODO: This is supposed to say 'cursorId'
        this.cursorIndex = EDITOR_Cursor.STATIC_CURSOR_ID++;
        this.htmlId = "EDITOR_cursor-" + this.cursorIndex;
        
        /**
         * When this is cleared the information is not removed, only 'gapBufferCount' is set to 0.
         */
        this.gapBuffer = new Uint8Array(EDITOR_Cursor.GAP_BUFFER_CAPACITY);
        this.gapBufferCount = 0;
        this.gapBufferWriteToSpanElement = null;
        this.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;

        this.caretRow = document.createElement('div');
        this.caretRow.id = "EDITOR_caretRow-" + this.cursorIndex;
        this.caretRow.className = "EDITOR_caretRow";
        this.cursorElement = document.createElement('div');
        this.cursorElement.id = "EDITOR_cursor-" + this.cursorIndex;
        this.cursorElement.className = "EDITOR_cursor";
        
        this.caretRow.appendChild(this.cursorElement);

        /**
         * Upon an enter keystroke this is inserted onto the newly added line.
         * 
         * The value is stored here to avoid high overhead from indentation matching when holding down the Enter key.
         * 
         * TODO: ^ that being said, you preferably wouldn't store this string allocation long term. If a more "localized" caching can be implemented, that would be preferable. (or the timing upon which this is set to null)
         * 
         * TODO: Don't null this just change the count to 0 and use a separate bool to indicate "nullness". UNLESS if clearing cache and this is for some reason MASSIVE idk maybe > 256 then maybe clear it idk
         * 
         * TODO: clear these when setting text, if not already? My code isn't working so I can't give a better TODO than this
         * 
         * @type {ByteList | null}
         */
        this.cached_indentation_byteList = null;
        this.cached_indentation_string = null;
        this.enterKeyEventKind = get_EnterKeyEventKind_None();

        /**
         * TODO: probably is sensible to use this for the enter key too but I'm firstly adding it for the sake of backspace so
         * I don't have to waste time looping over the removed text to find the line end positions that are being removed.
         * (I could do some kind of other tracking but I chose not to for no particular reason, well I think I chose this one out of laziness and that the other solutions long term like a
         *  list at the editor level 1 of them that is shared among all cursors is probably better or something.)
         * 
         * ========
         * 
         * TODO: Cursor should store this as -1 to signify false,
         * and then it is a number 0 to ... the offset in the pending line end position list
         * and then you have another number too separately that says the length of line endings that this cursor contributed to modifying.
         */
        this.editLineFeedCount = 0;

        /**
         * TODO: Consider putting this at the editor level and then delay setting it to null until all cursors have made use of it?...
         * ...an NRE is thrown with this at the editor level so I'm moving it per cursor but...
         * Then again it is only multiple references, not multiple separate objects...
         */
        this.EDITOR_paste_clipboardContent = null;

        /** same comment that pertains to this.EDITOR_paste_clipboardContent is somewhat relevant here */
        this.EDITOR_duplicate_small = 0;
        /** same comment that pertains to this.EDITOR_paste_clipboardContent is somewhat relevant here */
        this.EDITOR_duplicate_length = 0;
    }

    hasSelection() {
        return this.selectionAnchor >= 0 &&
               this.selectionEnd >= 0 &&
               this.selectionAnchor != this.selectionEnd;
    }
    
    /**
     * The code that clears the editor is dependent on this method NOT clearing 'cursor.selectionDivExists'
     * 
     * Somewhat duplicated code: This messes with the language features if I invoke clear() in the constructor, it puts "| undefined" on all the types.
     */
    clear() {
        this.indexLine = 0;
        this.indexColumn = 0;
        this.STORED_indexColumn = 0;
        this.cursorTopValue = 0;
        this.cursorLeftValue = 0;
        this.selectionAnchor = 0;
        this.selectionEnd = 0;
        this.DRAWN_selectionAnchor = 0;
        this.DRAWN_selectionEnd = 0;
        this.DRAWN_selection_virtualLineIndex = 0;
        this.DRAWN_selection_virtualCount = 0;
        this.editKind = get_EditKind_None();
        this.editLength = 0;
        this.editPosition = 0;
        this.editIndexLine = 0;
        this.editIndexColumn = 0;
        this.END_editIndexLine = 0;
        this.END_editIndexColumn = 0;

        this.gapBufferCount = 0;

        this.cached_indentation_byteList = null;
        this.cached_indentation_string = null;
        this.enterKeyEventKind = get_EnterKeyEventKind_None();

        this.editLineFeedCount = 0;

        this.EDITOR_paste_clipboardContent = null;

        this.EDITOR_duplicate_small = 0;
        this.EDITOR_duplicate_length = 0;
    }

    /**
     * Not all properties are necessarily cloned in this method:
     */
    clone() {
        let clone = new EDITOR_Cursor();
        clone.indexLine = this.indexLine;
        clone.indexColumn = this.indexColumn;
        clone.STORED_indexColumn = this.STORED_indexColumn;
        clone.cursorTopValue = this.cursorTopValue;
        clone.cursorLeftValue = this.cursorLeftValue;
        return clone;
    }
}

const EDITOR_baseElement = document.getElementById('EDITOR');

/* TODO: Caching the get_... for the HTML elements is perhaps beneficial in various places of the code and still is preferable to caching a 'document.getElementById'. */

const get_EDITOR_virtualization_horizontal = () => EDITOR_baseElement.children[0];
const get_EDITOR_virtualization_vertical = () => EDITOR_baseElement.children[1];
const get_EDITOR_gutter = () => EDITOR_baseElement.children[3].children[1];
const get_EDITOR_horizontal_scrollbar = () => EDITOR_baseElement.children[2].children[0];
const get_EDITOR_horizontal_scrollbar_virtualization_boundary = () => EDITOR_baseElement.children[2].children[0].children[0];
const get_EDITOR_body = () => EDITOR_baseElement.children[4];
const get_EDITOR_presentation = () => EDITOR_baseElement.children[4].children[0];
const get_EDITOR_cursorListElement = () => EDITOR_baseElement.children[4].children[1];
const get_EDITOR_textElement = () => EDITOR_baseElement.children[4].children[2];

//                                                                (indexLine + get_EDITOR_offsetLine()) - get_EDITOR_virtualLineIndex()
/** SEE 'EDITOR_getIndexLineToHtml_Correctly'; code duplication: this is explicitly inlined in the uncompiled source of editorGlobal.js within 'EDITOR_getIndexLineToHtml_Correctly' */
const EDITOR_indexLine_VirtualRelative_Unmatched = (indexLine) => (indexLine + get_EDITOR_offsetLine()) - get_EDITOR_virtualLineIndex();

// scroll up logic is wrong consistently.

/**
 * TODO: It should be >= ?
 * 
 * @example EDITOR_getIndexLineToHtml_Correctly(EDITOR_indexLine_VirtualRelative_Unmatched(cursor.indexLine));
 * @returns you capture the variable then check it for < 0 (or the opposite '>=') i.e. => if (indexLine_VirtualRelative < 0) { return bad_state; } else { return good_state; }
 */
function EDITOR_getIndexLineToHtml_Correctly(indexLine) {
    let unmatchedIndexLine = (indexLine + get_EDITOR_offsetLine()) - get_EDITOR_virtualLineIndex();
    return unmatchedIndexLine >= EDITOR_lineEndPositionList.count || unmatchedIndexLine >= get_EDITOR_textElement().children.length || unmatchedIndexLine < 0 ? -1 : ((unmatchedIndexLine = (unmatchedIndexLine + EDITOR_domLineNodesZerothIndex)) > get_EDITOR_virtualCount() ? unmatchedIndexLine - get_EDITOR_virtualCount() : unmatchedIndexLine);
}

/** The argument is a matchedIndexLine i.e.: the result of 'EDITOR_getIndexLineToHtml_Correctly' (no validation is performed on the argument, it is presumed to be the index of a valid text editor line div dom element). This returns -1 if you go out of viewport. It will wrap around if you go too large because 'EDITOR_domLineNodesZerothIndex' isn't 0. */
function EDITOR_getIndexLineToHtml_Correctly_NEXT(matchedIndexLine) {
    // TODO
}

/** The argument is a matchedIndexLine i.e.: the result of 'EDITOR_getIndexLineToHtml_Correctly' (no validation is performed on the argument, it is presumed to be the index of a valid text editor line div dom element). This returns -1 if you go out of viewport. It will wrap around if you go too small because 'EDITOR_domLineNodesZerothIndex' isn't 0. */
function EDITOR_getIndexLineToHtml_Correctly_PREVIOUS(matchedIndexLine) {
    // TODO
}

//const EDITOR_isVisible_indexLine = (indexLine) => EDITOR_baseElement.children[4].children[2];

const EDITOR_debug = document.getElementById('EDITOR_debug');
const EDITOR_findOverlay = document.getElementById('EDITOR_findOverlay');
EDITOR_findOverlay.style.visibility = 'hidden';

const EDITOR_gutterBackgroundColor = document.getElementById('EDITOR_gutter_background_color');

const EDITOR_tab_tabsbytes = new Uint8Array(4);
EDITOR_tab_tabsbytes[0] = ASCII_TAB;
EDITOR_tab_tabsbytes[1] = 0;
EDITOR_tab_tabsbytes[2] = 0;
EDITOR_tab_tabsbytes[3] = 0;
const EDITOR_tab_spacesbytes = new Uint8Array(4);
EDITOR_tab_spacesbytes[0] = ASCII_SPACE;
EDITOR_tab_spacesbytes[1] = ASCII_SPACE;
EDITOR_tab_spacesbytes[2] = ASCII_SPACE;
EDITOR_tab_spacesbytes[3] = ASCII_SPACE;
/**
 * Null characters provide visual width for proportional fonts. They do not get copied or saved out.
 */
let EDITOR_on_tab_bytes = EDITOR_tab_tabsbytes;

/**
 * When a cursor removes a line end the position of the line end is stored in this list until the edit is finalized.
 */
let EDITOR_lineEndPositionList_PENDING = new UInt32List(128);

/**
 * IMPORTANT: use EDITOR_readLineEndPositionList(...) rather than indexing into this directly...
 * ...due to the possibility of pending edits.
 */
let EDITOR_lineEndPositionList = new UInt32List(128);

let EDITOR_primaryCursor = new EDITOR_Cursor();
get_EDITOR_cursorListElement().appendChild(EDITOR_primaryCursor.caretRow);
/**
 * Ensure that the cursors are sorted ascending by positionIndex (which is calculated via the method 'EDITOR_getPositionIndex(...)') at all times.
 */
let EDITOR_cursorList = [EDITOR_primaryCursor];

let EDITOR_textSourceIdentifier = '';
let EDITOR_FORMATTED_textSourceIdentifier = '';
let EDITOR_extensionKind = get_ExtensionKind_None();

let EDITOR_lineEndString = null;

let EDITOR_documentSymbolResult;
/**
 * @type {ListComponent}
 */
let EDITOR_listComponent = null;

let EDITOR_onMouseMove_timer = null;
let EDITOR_onMouseMove_event = null;

let didChangeTextDocumentNotificationPromise = null;

let EDITOR_onResize_timer = null;
let EDITOR_onResize_bool = null;

let EDITOR_offsetWithinSpan_withRespectToThisSpan = null;

let EDITOR_timer = null;

// TODO: - [ ] how could it possibly inline a function if the function isn't const? (this is in relation to the keyword 'function' rather than a const fat arrow function.)

/**
 * having a boolean be a byte isn't ideal, but most engines store them as either 4bytes or 8bytes
 * 
 * primarily the goal is to remove the variable from the marking phase of gc.
 * because the boolean variable could store anything so the gc still has to check that it still stores a primitive
 * and that takes time albeit a small amount of time.
 * */
const EDITOR_byte_fields = new Uint8Array(16);

/** returns a number, beware '===' */
const get_EDITOR_detailRank = () => EDITOR_byte_fields[0];
const set_EDITOR_detailRank = (byte) => EDITOR_byte_fields[0] = byte;

/** returns a number, beware '===' */
const get_EDITOR_recentBoundingClientRect_isNull_intFalsey = () => EDITOR_byte_fields[1];
const set_EDITOR_recentBoundingClientRect_isNull_intFalsey = (byte) => EDITOR_byte_fields[1] = byte;
set_EDITOR_recentBoundingClientRect_isNull_intFalsey(1);

/** returns a number, beware '===' */
const get_EDITOR_findOverlay_show = () => EDITOR_byte_fields[2];
const set_EDITOR_findOverlay_show = (byte) => EDITOR_byte_fields[2] = byte;

/** returns a number, beware '===' */
const get_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching = () => EDITOR_byte_fields[3];
const set_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching = (byte) => EDITOR_byte_fields[3] = byte;

/** returns a number, beware '===' */
const get_EDITOR_isSourceOfLeftMouseButton = () => EDITOR_byte_fields[4];
const set_EDITOR_isSourceOfLeftMouseButton = (byte) => EDITOR_byte_fields[4] = byte;

/** returns a number, beware '===' */
const get_EDITOR_fileStartsWithBom = () => EDITOR_byte_fields[5];
const set_EDITOR_fileStartsWithBom = (byte) => EDITOR_byte_fields[5] = byte;

/** returns a number, beware '===' */
const get_EDITOR_findOverlay_wasSearched = () => EDITOR_byte_fields[6];
const set_EDITOR_findOverlay_wasSearched = (byte) => EDITOR_byte_fields[6] = byte;

/** returns a number, beware '===' */
const get_EDITOR_findOverlay_options_matchWord = () => EDITOR_byte_fields[7];
const set_EDITOR_findOverlay_options_matchWord = (byte) => EDITOR_byte_fields[7] = byte;

/** returns a number, beware '===' */
const get_EDITOR_onScroll_bool = () => EDITOR_byte_fields[8];
const set_EDITOR_onScroll_bool = (byte) => EDITOR_byte_fields[8] = byte;

/**
 * If you have an extension listed here, it is expected that the "function to invoke" exists.
 * As of right now any patterns to naming the function that gets invoked are tentative.
 * But I am not checking whether JS_full_lex or JS_line_lex exist, I'm just switching on ExtensionKind and presuming that function exists.
 */
const get_ExtensionKind_None = () => 0;
const get_ExtensionKind_JavaScript = () => 1;

/**
 * DeleteLtr and BackspaceRtl are both forms of removing text,
 * their edits are stored the same (i.e.: both in "the form of a delete" keypress)
 * The kind delete/backspace tells you how to restore the cursor when doing a ctrl+z and etc...?
 */
const get_EditKind_None = () => 0;
const get_EditKind_InsertLtr = () => 1;
const get_EditKind_DeleteLtr = () => 2;
const get_EditKind_BackspaceRtl = () => 3;
const get_EditKind_RemoveTextNoBatching = () => 4;
const get_EditKind_Tab = () => 5;
const get_EditKind_IndentMore = () => 6;
const get_EditKind_IndentLess = () => 7;
const get_EditKind_Enter = () => 8;
const get_EditKind_Paste = () => 9;
const get_EditKind_Duplicate = () => 10;

/**
 * TODO: Long term this likely should be removed and all enter key logic reduced into an insertion but this will help in the time being.
 */
const get_EnterKeyEventKind_None = () => 0;
const get_EnterKeyEventKind_StartOfLine = () => 1;
const get_EnterKeyEventKind_EndOfLine = () => 2;
const get_EnterKeyEventKind_AmongALine = () => 3;
const get_EnterKeyEventKind_FallbackCase = () => 4;

/**
 * Do not change the order/values of these, they are used in equality comparisons, the larger the number says when double clicking between a character and a punctuation
 * whoever has larger number gets selected then the selection continues while the same kind is being read.
 * 
 * TODO: Bug only 1 character selected when punctuation then letterOrDigit click between them the letterOrDigit is more than 1 contiguous only 1 selected.
 */
const get_CharacterKind_None = () => 0;
const get_CharacterKind_Whitespace = () => 1;
const get_CharacterKind_Punctuation = () => 2;
const get_CharacterKind_LetterOrDigit = () => 3;

const EDITOR_int_fields = new Uint32Array(32);

const get_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching_originMatchNumber = () => EDITOR_int_fields[0];
const set_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching_originMatchNumber = (int) => EDITOR_int_fields[0] = int;

const get_EDITOR_drawn_count_of_digits_longest_line_number = () => EDITOR_int_fields[1];
const set_EDITOR_drawn_count_of_digits_longest_line_number = (int) => EDITOR_int_fields[1] = int;

const get_EDITOR_lineHeight = () => EDITOR_int_fields[2];
const set_EDITOR_lineHeight = (int) => EDITOR_int_fields[2] = int;
set_EDITOR_lineHeight(20);

const get_EDITOR_detail_smallPosition = () => EDITOR_int_fields[3];
const set_EDITOR_detail_smallPosition = (int) => EDITOR_int_fields[3] = int;

const get_EDITOR_detail_largePosition = () => EDITOR_int_fields[4];
const set_EDITOR_detail_largePosition = (int) => EDITOR_int_fields[4] = int;

const get_EDITOR_detailRank3OriginLine = () => EDITOR_int_fields[5];
const set_EDITOR_detailRank3OriginLine = (int) => EDITOR_int_fields[5] = int;

/**
 * Pixels.
 * 
 * The gutter width changes far more frequently than the line height.
 * That is why the gutter width is a JavaScript variable, and the styles are updated from JavaScript.
 * 
 * Whereas the line height is a css variable (and thus could cause layout for the entire application whenever it changes).
 */
const get_EDITOR_gutterWidthStyleValue = () => EDITOR_int_fields[6];
const set_EDITOR_gutterWidthStyleValue = (int) => EDITOR_int_fields[6] = int;
set_EDITOR_gutterWidthStyleValue(32);

/**
 * This is the sum of the 'get_EDITOR_gutterWidthStyleValue()' in addition to the left and right padding
 */
const get_EDITOR_gutterWidthTotal = () => EDITOR_int_fields[7];
const set_EDITOR_gutterWidthTotal = (int) => EDITOR_int_fields[7] = int;
set_EDITOR_gutterWidthTotal(32);

/** The first line of text that you should see shown in the UI given the current scrollTop */
const get_EDITOR_virtualLineIndex = () => EDITOR_int_fields[8];
const set_EDITOR_virtualLineIndex = (int) => EDITOR_int_fields[8] = int;

const get_EDITOR_virtualCount = () => EDITOR_int_fields[9];
const set_EDITOR_virtualCount = (int) => EDITOR_int_fields[9] = int;

/**
 * Prevent earlier members of a then chain from marking didChangeTextDocumentNotificationPromise to null
 * in order to signify resolved
 * 
 * when meanwhile there is more promises in the .then chain that need to resolve.
 * 
 * prefix increment
 */
const get_ticket_didChangeTextDocumentNotificationPromise = () => EDITOR_int_fields[10];
const set_ticket_didChangeTextDocumentNotificationPromise = (int) => EDITOR_int_fields[10] = int;

const get_didChangeTextDocument_version = () => EDITOR_int_fields[11];
const set_didChangeTextDocument_version = (int) => EDITOR_int_fields[11] = int;

/**
 * All the 'EDITOR_cursorList' loops are currently using the variable 'i'.
 * I'm experimenting with a few of the loops though such that at the start of every loop they set this variable equal to 'i'.
 * Then in any functions like getCharacter, I might be able to contextually find the character much faster.
 * */
const get_EDITOR_indexCursor = () => EDITOR_int_fields[12];
const set_EDITOR_indexCursor = (int) => EDITOR_int_fields[12] = int;

const get_EDITOR_offsetLine = () => EDITOR_int_fields[13];
const set_EDITOR_offsetLine = (int) => EDITOR_int_fields[13] = int;

const get_EDITOR_offsetColumn_withRespectToThisIndexLine = () => EDITOR_int_fields[14];
const set_EDITOR_offsetColumn_withRespectToThisIndexLine = (int) => EDITOR_int_fields[14] = int;

const get_EDITOR_offsetColumn = () => EDITOR_int_fields[15];
const set_EDITOR_offsetColumn = (int) => EDITOR_int_fields[15] = int;

const get_EDITOR_totalShift = () => EDITOR_int_fields[16];
const set_EDITOR_totalShift = (int) => EDITOR_int_fields[16] = int;

const get_EDITOR_offsetWithinSpan = () => EDITOR_int_fields[17];
const set_EDITOR_offsetWithinSpan = (int) => EDITOR_int_fields[17] = int;

const get_EDITOR_ONSCROLLvirtualLineIndex = () => EDITOR_int_fields[18];
const set_EDITOR_ONSCROLLvirtualLineIndex = (int) => EDITOR_int_fields[18] = int;
//throw new Error('-1');
// This set used to be -1 to indicate a non existent value, 500 "seems to work" but a proof of it being an equivalent solution has not thoroughly been thought out, only a sort of "yeah that probably works" kinda vibe.
set_EDITOR_ONSCROLLvirtualLineIndex(500);

const get_EDITOR_ONSCROLLvirtualCount = () => EDITOR_int_fields[19];
const set_EDITOR_ONSCROLLvirtualCount = (int) => EDITOR_int_fields[19] = int;
set_EDITOR_ONSCROLLvirtualCount(0);

const get_EDITOR_ONSCROLLscrollTop = () => EDITOR_int_fields[20];
const set_EDITOR_ONSCROLLscrollTop = (int) => EDITOR_int_fields[20] = int;
//throw new Error('-1');
// This set used to be -1 to indicate a non existent value, 500 "seems to work" but a proof of it being an equivalent solution has not thoroughly been thought out, only a sort of "yeah that probably works" kinda vibe.
set_EDITOR_ONSCROLLscrollTop(500);

const get_EDITOR_longestLine_indexLine = () => EDITOR_int_fields[21];
const set_EDITOR_longestLine_indexLine = (int) => EDITOR_int_fields[21] = int;

const get_EDITOR_longestLine_length = () => EDITOR_int_fields[22];
const set_EDITOR_longestLine_length = (int) => EDITOR_int_fields[22] = int;

/**
 * The get_EDITOR_contentWidth() is calculated via Math.ceil(someVar * otherVar) so this is faster to check whether content width will change rather than the multiplication and ceil.
 */
const get_EDITOR_longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar = () => EDITOR_int_fields[23];
const set_EDITOR_longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar = (int) => EDITOR_int_fields[23] = int;

const get_EDITOR_contentWidth = () => EDITOR_int_fields[24];
const set_EDITOR_contentWidth = (int) => EDITOR_int_fields[24] = int;

const get_EDITOR_indent_ORIGINAL_indentBy = () => EDITOR_int_fields[25];
const set_EDITOR_indent_ORIGINAL_indentBy = (int) => EDITOR_int_fields[25] = int;

const get_EDITOR_indent_SMALL_lineAndColumnIndices_indexLine = () => EDITOR_int_fields[26];
const set_EDITOR_indent_SMALL_lineAndColumnIndices_indexLine = (int) => EDITOR_int_fields[26] = int;

const get_EDITOR_indent_startingIndex = () => EDITOR_int_fields[27];
const set_EDITOR_indent_startingIndex = (int) => EDITOR_int_fields[27] = int;

const get_EDITOR_recentBoundingClientRect_left = () => EDITOR_int_fields[28];
const set_EDITOR_recentBoundingClientRect_left = (int) => EDITOR_int_fields[28] = int;

const get_EDITOR_recentBoundingClientRect_top = () => EDITOR_int_fields[29];
const set_EDITOR_recentBoundingClientRect_top = (int) => EDITOR_int_fields[29] = int;

/** TODO: unfortunately leaks into trackedSyntaxTypes.js so I'm gonna manually keep it up to date for now while I decide things. */
const get_EDITOR_pooledTrackedSyntax_start = () => EDITOR_int_fields[30];
/** TODO: unfortunately leaks into trackedSyntaxTypes.js so I'm gonna manually keep it up to date for now while I decide things. */
const set_EDITOR_pooledTrackedSyntax_start = (int) => EDITOR_int_fields[30] = int;

/** TODO: unfortunately leaks into trackedSyntaxTypes.js so I'm gonna manually keep it up to date for now while I decide things. */
const get_EDITOR_pooledTrackedSyntax_length = () => EDITOR_int_fields[31];
/** TODO: unfortunately leaks into trackedSyntaxTypes.js so I'm gonna manually keep it up to date for now while I decide things. */
const set_EDITOR_pooledTrackedSyntax_length = (int) => EDITOR_int_fields[31] = int;

let EDITOR_pooledTrackedSyntax_trackedSyntaxKind = TrackedSyntaxKind.None;

const EDITOR_gutterPaddingLeft = 3;
const EDITOR_gutterPaddingRight = 6;

let EDITOR_characterWidth = 8;
let EDITOR_horizontal_scrollbar_widthValue = 0;

let EDITOR_domLineNodesZerothIndex = 0;

function EDITOR_init() {
    EDITOR_measureLineHeightAndCharacterWidth();

    let gutterPaddingLeft = EDITOR_gutterPaddingLeft + 'px';
    let gutterPaddingRight = EDITOR_gutterPaddingRight + 'px';
    let gutterWidth = EDITOR_characterWidth + 'px';

    get_EDITOR_gutter().style.paddingLeft = gutterPaddingLeft;
    get_EDITOR_gutter().style.paddingRight = gutterPaddingRight; 
    get_EDITOR_gutter().style.width = gutterWidth;

    EDITOR_gutterBackgroundColor.style.paddingLeft = gutterPaddingLeft;
    EDITOR_gutterBackgroundColor.style.paddingRight = gutterPaddingRight; 
    EDITOR_gutterBackgroundColor.style.width = gutterWidth;

    let left = (EDITOR_gutterPaddingLeft + EDITOR_gutterPaddingRight + EDITOR_characterWidth) + 'px';
    let width = 'calc(100% - ' + left + ')';

    get_EDITOR_body().style.marginLeft = left;

    get_EDITOR_body().style.width = width;

    EDITOR_drawHorizontalScrollbar();

    EDITOR_registerHandlers();
}

/**
 * @param {*} indexLine
 * @returns {number} the last valid POSITION index on the line, but with respect to any pending edits.
 */
function EDITOR_readLineEndPositionList(indexLine) {
    let lineEndPositionIndex = EDITOR_lineEndPositionList.data[indexLine];

    // If you need to determine the text without finalizing an edit, you DO have to loop forwards right?
    for (var i = 0; i < EDITOR_cursorList.length; i++) {
        let cursor = EDITOR_cursorList[i];
        if (cursor.editLength > 0 & cursor.editPosition <= lineEndPositionIndex) {
            switch (cursor.editKind) {
                case get_EditKind_InsertLtr():
                    lineEndPositionIndex += cursor.editLength;
                    break;
                case get_EditKind_DeleteLtr():
                case get_EditKind_BackspaceRtl():
                case get_EditKind_RemoveTextNoBatching():
                    lineEndPositionIndex -= cursor.editLength;
                    break;
            }
        }
    }

    return lineEndPositionIndex;
}

function EDITOR_clear() {
    EDITOR_finalizeAllCursors_andClearNonPrimaryCursors();
    EDITOR_primaryCursor.clear();
    EDITOR_clearSelectionStyle(EDITOR_primaryCursor);
    set_EDITOR_recentBoundingClientRect_isNull_intFalsey(1);
    EDITOR_textSourceIdentifier = '';
    EDITOR_FORMATTED_textSourceIdentifier = '';
    EDITOR_extensionKind = get_ExtensionKind_None();
    set_EDITOR_fileStartsWithBom(false);
    EDITOR_lineEndString = null;
    get_EDITOR_textElement().innerHTML = '';
    EDITOR_lineEndPositionList.clear();
    get_EDITOR_gutter().innerHTML = '';
    EDITOR_textByteList.clear();
    set_EDITOR_longestLine_indexLine(0);
    set_EDITOR_longestLine_length(0);
    
    // Explicitly inlining 'clearMulticursorState()' because it currently is and I just don't want to make a decision about this right now.
    // So what I can do is mark the code paragraph for later decision making.
    set_EDITOR_indexCursor(0);
    set_EDITOR_offsetLine(0);
    set_EDITOR_offsetColumn_withRespectToThisIndexLine(0);
    set_EDITOR_offsetColumn(0);
    set_EDITOR_totalShift(0);
    EDITOR_offsetWithinSpan_withRespectToThisSpan = null;
    set_EDITOR_offsetWithinSpan(0);
    
    EDITOR_trackedSyntaxList.clear();
    EDITOR_drawCursor(EDITOR_primaryCursor);
}

/**
 * This function finalizes any pending edits foreach cursor in the EDITOR_cursorList.
 * 
 * Does NOT clear multicursors, only finalizes their respective edits;
 * 
 * see also: 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors'
 * 
 * TODO: many places where this is invoked, it is likely intended to actually invoke 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors'...
 * ...in order to permit slow 1 by 1 support for multicursor foreach scenario...
 * ...actually that's a good point...
 * ...you might wanna start by enabling multi-cursor insertion, but anything else invokes 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors'...
 * ...then you can slowly add in support without breaking things?...
 * ...so specifically what I'm saying here is, an upcoming task would be...
 * ...simply to ensure that nearly every event invokes 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors'...
 * ...and that the ones which can't i.e.: batch insertions; you could do a check if cursor count >1 then finalize only the non-primary or some such...
 * ...then you remove the safeguard for 1 feature at a time.
 */
function EDITOR_finalizeAllCursors() {
    for (let i = EDITOR_cursorList.length - 1; i >= 0; i--) {
        EDITOR_finalizeEdit(EDITOR_cursorList[i]);
    }
}

/**
 * This function finalizes pending edits foreach cursor in the EDITOR_cursorList
 * AND removes any non-EDITOR_primaryCursor from the EDITOR_cursorList.
 * 
 * see also: 'EDITOR_finalizeAllCursors'
 * 
 * TODO: a good name for this function
 */
function EDITOR_finalizeAllCursors_andClearNonPrimaryCursors() {
    for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
        let cursor = EDITOR_cursorList[i];
        EDITOR_finalizeEdit(cursor);
        if (cursor !== EDITOR_primaryCursor) {
            // A cursor is not necessarily rendered, thus this check
            if (cursor.caretRow.parentElement === get_EDITOR_cursorListElement()) {
                get_EDITOR_cursorListElement().removeChild(cursor.caretRow);
            }
            EDITOR_clearSelectionStyle(cursor);
            EDITOR_cursorList.splice(i, 1);
        }
    }
}

/**
 * Returns the underlying uint8array that contains the encoded characters for the text.
 * The uint8array's capacity (i.e.: length) is not what should be saved out.
 * Instead only save the countOfBytesInUse.
 * 
 * The editor stores all line endings as '\n'.
 * When saving the bytes, swap out any '\n' for the 'lineEndString' which may or may not be '\n' (i.e.: it could be '\r\n' or '\r').
 * 
 * Tab characters are stored as '\t\0\0\0'.
 * When saving out the bytes you need to skip over these '\0' characters.
 * 
 * A '\0' character does NOT terminate the subarray's bytes that are in use.
 * You need to iterate specifically for 'countOfBytesInUse'.
 * 
 * @param {*} NOTfinalizePendingEdits if there is a pending edit, it needs to be finalized in order to see the updated text. The default behavior is to finalize the pending edits. To use default behavior, do NOT provide the parameter, or provide a falsey expression like 'null'.
 * @returns
 */
function EDITOR_getFinalizedEditsAndRawSaveFileData(NOTfinalizePendingEdits) {
    if (!NOTfinalizePendingEdits) {
        EDITOR_finalizeAllCursors();
    }
    return {
        uint8arrayTextBytes: EDITOR_textByteList.bytes,
        countOfBytesInUse: EDITOR_textByteList.count,
        lineEndString: EDITOR_lineEndString,
        fileStartsWithBom: Boolean(get_EDITOR_fileStartsWithBom())
    };
}

/**
 * 
 * @param {string} text 
 * @param {string} textSourceIdentifier I intend to have this be an absolute path. Then when the app saves a file, it can verify against the database that this absolute path is "safe" and then write to the file.
 * @param {string} lineEndString pass null (or do not include the parameter) to have line endings set to the first encountered kind in the text. Otherwise specify here. The string is used EXACTLY AS PROVIDED if non-falsey.
 */
function EDITOR_setText(text, fileStartsWithBom, textSourceIdentifier, FORMATTED_textSourceIdentifier, extensionKind, lineEndString) {
    EDITOR_clear();

    set_EDITOR_fileStartsWithBom(fileStartsWithBom);

    EDITOR_textSourceIdentifier = textSourceIdentifier;
    EDITOR_FORMATTED_textSourceIdentifier = FORMATTED_textSourceIdentifier;
    EDITOR_extensionKind = extensionKind;
    EDITOR_language_line_lex_SET(EDITOR_extensionKind);
    EDITOR_lineEndString = lineEndString;

    // When doing a "full reset" it is easier to just add EOF at the end.
    EDITOR_lineEndPositionList.clear();

    /**
     * TODO: I don't know whether I should calculate this from the EDITOR_lineEndPositionList or some such...
     * ...But all in all this detail is nothing relative to me starting the code that tracks the longest line
     * so I stop drawing the horizontal scrollbar during some scroll events.
     * 
     * In terms of changing it after the fact it isn't a big deal is what I mean.
     */
    let lineLength = 0;

    for (var sourceI = 0; sourceI < text.length; sourceI++) {
        switch (text[sourceI]) {
            case '\r':
                if (sourceI < text.length - 1 & text[sourceI + 1] === '\n') {
                    if (!EDITOR_lineEndString) {
                        EDITOR_lineEndString = '\r\n';
                    }
                    sourceI++;
                }
                else {
                    if (!EDITOR_lineEndString) {
                        EDITOR_lineEndString = '\r';
                    }
                }
                if (lineLength > get_EDITOR_longestLine_length()) {
                    set_EDITOR_longestLine_length(lineLength);
                    set_EDITOR_longestLine_indexLine(EDITOR_lineEndPositionList.count);
                }
                lineLength = 0;
                EDITOR_lineEndPositionList.insert(EDITOR_lineEndPositionList.count, EDITOR_textByteList.count);
                EDITOR_textByteList.insert(EDITOR_textByteList.count, ASCII_LINE_FEED);
                break;
            case '\n':
                if (!EDITOR_lineEndString) {
                    EDITOR_lineEndString = '\n';
                }
                if (lineLength > get_EDITOR_longestLine_length()) {
                    set_EDITOR_longestLine_length(lineLength);
                    set_EDITOR_longestLine_indexLine(EDITOR_lineEndPositionList.count);
                }
                lineLength = 0;
                EDITOR_lineEndPositionList.insert(EDITOR_lineEndPositionList.count, EDITOR_textByteList.count);
                EDITOR_textByteList.insert(EDITOR_textByteList.count, ASCII_LINE_FEED);
                break;
            case '\t':
                lineLength += 4;
                EDITOR_textByteList.insertBytes(EDITOR_textByteList.count, EDITOR_tab_tabsbytes, /*offset*/ 0, /*length*/ 4);
                break;
            default:
                lineLength++;
                // TODO: add a function for '.add' and avoid the "pointless" passing of count in scenarios like this.
                //
                // tbh: TODO: 'charCodeAt' also might be more allocation expensive than you expect. It returns a JavaScript number. Switching and returning an index from byte array prehardcoded might avoid an allocation per number returned?
                // ... although I hear most engines store numbers such that the pointer represents the value and you avoid the allocation but even then where is the metadata that tells you how to read that pointer differently than the other ones etc...
                //
                EDITOR_textByteList.insert(EDITOR_textByteList.count, text.charCodeAt(sourceI));
                break;
        }
    }

    EDITOR_lineEndPositionList.insert(EDITOR_lineEndPositionList.count, EDITOR_textByteList.count);

    update_VirtualLineIndex();
    update_virtualCount();

    update_verticalVirtualizationBoundary();

    switch (EDITOR_extensionKind) {
        case get_ExtensionKind_JavaScript():
            EDITOR_trackedSyntaxList = JS_full_lex(EDITOR_textByteList.bytes, EDITOR_textByteList.count);
            break;
    }

    EDITOR_drawGutter_Width();
    // Force 'case 3' within 'EDITOR_onScroll();' downstream
    set_EDITOR_ONSCROLLvirtualLineIndex(get_EDITOR_virtualCount());
    EDITOR_onScroll();
}

/**
 * You may want to update the vertical virtualization boundary prior to actually updating the EDITOR_lineEndPositionList.
 * Thus this function takes a 'lineCount' which defaults to EDITOR_lineEndPositionList.count if falsey.
 * @param {number | null | undefined} lineCount In order to permit arbitrarily updating the vertical virtualization boundary, this takes a lineCount. If falsey, then EDITOR_lineEndPositionList.count is used.
 */
function update_verticalVirtualizationBoundary(lineCount) {
    if (!lineCount) lineCount = EDITOR_lineEndPositionList.count;
    get_EDITOR_virtualization_vertical().style.height = ((lineCount + get_EDITOR_virtualCount() - 1) * get_EDITOR_lineHeight()) + 'px';
}

function update_VirtualLineIndex() {
    set_EDITOR_virtualLineIndex(Math.floor(EDITOR_baseElement.scrollTop / get_EDITOR_lineHeight()));
    let top = (get_EDITOR_virtualLineIndex() * get_EDITOR_lineHeight()) + 'px';
    EDITOR_gutterBackgroundColor.style.top = top;
}

function update_virtualCount() {
    set_EDITOR_virtualCount(Math.ceil(EDITOR_baseElement.offsetHeight / get_EDITOR_lineHeight()));
}

/**
 * If the 'get_EDITOR_drawn_count_of_digits_longest_line_number() === positiveNumbersOnly_countDigitsLoop(EDITOR_lineEndPositionList.count)'
 * then the function does nothing.
 * 
 * TODO: Track the min and max until length changes and then only 2 operations at worst case than while
 */
function EDITOR_drawGutter_Width() {
    let digitCountOfLargestLineNumber = positiveNumbersOnly_countDigitsLoop(EDITOR_lineEndPositionList.count);
    if (get_EDITOR_drawn_count_of_digits_longest_line_number() === digitCountOfLargestLineNumber) return;

    set_EDITOR_drawn_count_of_digits_longest_line_number(digitCountOfLargestLineNumber);

    set_EDITOR_gutterWidthStyleValue(Math.ceil(digitCountOfLargestLineNumber * EDITOR_characterWidth));
    set_EDITOR_gutterWidthTotal(get_EDITOR_gutterWidthStyleValue() + EDITOR_gutterPaddingLeft + EDITOR_gutterPaddingRight);

    let gutterWidth = get_EDITOR_gutterWidthStyleValue() + 'px';
    get_EDITOR_gutter().style.width = gutterWidth;
    EDITOR_gutterBackgroundColor.style.width = gutterWidth;
    
    let left = get_EDITOR_gutterWidthTotal() + 'px';
    let width = 'calc(100% - ' + left + ')';
    get_EDITOR_body().style.marginLeft = left;
    get_EDITOR_body().style.width = width;

    EDITOR_drawHorizontalScrollbar();
}

/**
 * If the state is bad then the following is returned:
 * { goalColumnI: -1, runColumnI: -1, indexChild: -1, lineDiv: null, };
 * 
 * if (walked.goalColumnI === -1) { throw new Error('walked.goalColumnI === -1'); }
 * 
 * if (walked.lineDiv.children.length === 0) { throw new Error('walked.lineDiv.children.length === 0'); }
 * 
 * NOTE: when copying and pasting code be sure the snippet uses the respective 'break' or 'return' that you're interested in...
 * ...as those keywords are common in code that use the result of this function, but can vary on a case by case basis.
 * 
 * @param {EDITOR_Cursor} cursor
 * @returns
 */
function walkLineUntilColumnIndex(cursor) {
    let indexLine_VirtualRelative = EDITOR_getIndexLineToHtml_Correctly(cursor.indexLine);
    if (indexLine_VirtualRelative < 0) {
        return {
            indexColumn_Goal: -1,
            indexColumn_Sum: -1,
            indexColumn_SpanTextContentRelative: -1,
            indexSpan: -1,
            span: null,
            div: null,
        };
    }
    
    let div = get_EDITOR_textElement().children[indexLine_VirtualRelative];
    let indexColumn_Goal = cursor.indexColumn + get_EDITOR_offsetColumn();
    let indexColumn_Sum = 0;

    for (var indexSpan = 0; indexSpan < div.children.length; indexSpan++) {
        let span = div.children[indexSpan];
        if (indexColumn_Goal <= indexColumn_Sum + span.textContent.length) {
            // '<=' because end-of-line text insertion (end of line but prior to the line ending itself).
            // The line ending isn't written to the span, it is represented by the encompassing div itself.
            return {
                indexColumn_Goal: indexColumn_Goal,
                indexColumn_Sum: indexColumn_Sum,
                indexColumn_SpanTextContentRelative: indexColumn_Goal - indexColumn_Sum,
                indexSpan: indexSpan,
                span: span,
                div: div,
            };
        }
        else {
            indexColumn_Sum += span.textContent.length;
        }
    }

    // TODO: When the column index is too large, how should this be handled?
    return {
        indexColumn_Goal: -1,
        indexColumn_Sum: -1,
        indexColumn_SpanTextContentRelative: -1,
        indexSpan: -1,
        span: null,
        div: null,
    };
}

/**
 * Use case: HTML was previously rendered, but the content of the line was modified
 * and logic to more efficiently manipulate the existing HTML is not yet written.
 * 
 * Example modifications:
 * - The same line index had its contents modified.
 * - Visually the line index that virtually appears as that child element is not the same as it previously was
 *   due to various reasons, perhaps a change in scroll position.
 * 
 * Prior to invoking this function ensure the provided elements's innerHTML is empty:
 * - "gutterLineElement.innerHTML = '';"
 * - "divElement.innerHTML = '';"
 * @param {number} indexLine 
 * @param {HTMLElement} gutterLineElement 
 * @param {HTMLElement} divElement 
 */
function EDITOR_drawLine(indexLine, gutterLineElement, textLineElement) {
    if (indexLine >= EDITOR_lineEndPositionList.count) {
        gutterLineElement.innerText = '~';
    }
    else {
        gutterLineElement.innerText = indexLine + 1;
    }

    let trackedSyntax_StartingIndex = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(indexLine);
    if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) {
        trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract;
    }
    let line = EDITOR_getLineBoundaryPositions(indexLine);
    EDITOR_createSpansForLineOfText(textLineElement, line.start, line.end, trackedSyntax_StartingIndex);
}

/**
 * if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) { trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract; }
 * @param {*} indexLine 
 * @returns 
 */
function EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(indexLine) {
    let line = EDITOR_getLineBoundaryPositions(indexLine);
    let positionIndex = line.start;

    let left = 0;
    let right = EDITOR_trackedSyntaxList.count_abstract - 1;

    let lineIndex = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        EDITOR_trackedSyntaxList.getElementAt(mid);
        
        if (get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() > positionIndex) {
            lineIndex = mid;

            if (get_EDITOR_pooledTrackedSyntax_start() === positionIndex) {
                break;
            }
            
            right = mid - 1;
        }
        else if (get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() <= positionIndex) {
            left = mid + 1;
        }
        else {
            return; // NaN
        }
    }

    return lineIndex;
}

/**
 * if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) { trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract; }
 * Probably should make 1 of these and accept a predicate.
 */
function EDITOR_trackedSyntaxReposition_find(positionIndex) {

    let left = 0;
    let right = EDITOR_trackedSyntaxList.count_abstract - 1;

    let lineIndex = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        let start = EDITOR_trackedSyntaxList.getStart(mid);
        
        if (positionIndex <= start) {
            lineIndex = mid;

            if (positionIndex === start) {
                break;
            }
            
            right = mid - 1;
        }
        else if (positionIndex > start) {
            left = mid + 1;
        }
        else {
            return; // NaN
        }
    }

    return lineIndex;
}

/** modification of Google AI Overview "javascript count of digits" */
function positiveNumbersOnly_countDigitsLoop(number) {
  if (number <= 0) return 1;
  let count = 0;

  while (number > 0) {
    number = Math.floor(number / 10); // Remove the last digit
    count++;
  }

  return count;
}

/**
 * The returned div contains a single span which is empty.
 * This div is NOT added to get_EDITOR_textElement().
 */
function EDITOR_getNewAndEmptyLineElement() {
    let div = document.createElement('div');
    div.className = 'eT';
    let span = document.createElement('span');
    div.appendChild(span);
    return div;
}

/**
 * This method will NOT "put a cursor on screen". You need to ensure
 * your cursor exists as a child by appendChild'ing to EDTIOR_cursorListElement.
 * This method instead only moves a cursor that ALREADY is being shown on screen.
 * 
 * If the 'cursor' is not EDITOR_primaryCursor, then the 'NOTscrollCursorIntoView' parameter has no effect.
 * i.e.: only the EDITOR_primaryCursor will ever be scrolled into view via this method.
 * 
 * @param {EDITOR_Cursor} cursor 
 * @param {boolean} NOTscrollCursorIntoView 
 */
function EDITOR_drawCursor(cursor, NOTscrollCursorIntoView) {
    cursor.cursorTopValue = (cursor.indexLine + get_EDITOR_offsetLine()) * get_EDITOR_lineHeight();
    cursor.cursorLeftValue = (cursor.indexColumn + get_EDITOR_offsetColumn()) * EDITOR_characterWidth;

    cursor.caretRow.style.top = cursor.cursorTopValue + 'px';
    cursor.cursorElement.style.left = cursor.cursorLeftValue + 'px';

    EDITOR_createStyleForSelection(cursor);

    if (cursor === EDITOR_primaryCursor) {
        EDITOR_debug.innerHTML = '';
        EDITOR_debug.innerText += '(' + cursor.indexLine + ', ' + cursor.indexColumn + ')';
        
        if (DIALOG_Settings_editorDebugShowAdjacentCharacters) {
	        let previous = EDITOR_getCharacterPrevious(cursor.indexColumn, EDITOR_getPositionIndex(cursor));
	        if (previous === '\n') previous = '\\n';
	        else if (previous === '\t') previous = '\\t';
	        let current = EDITOR_getCharacterCurrent(cursor.indexColumn, EDITOR_getPositionIndex(cursor), EDITOR_getLineEnd_pos(cursor.indexLine));
	        if (current === '\n') current = '\\n';
	        else if (current === '\t') current = '\\t';
	        EDITOR_debug.innerText += ' | (' + previous + ', ' + current + ')';
        }
        
        EDITOR_debug.innerText += ' | (' + cursor.editLength + ')';

        EDITOR_debug.innerText += ' | (' + get_EDITOR_longestLine_indexLine() + ', ' + get_EDITOR_longestLine_length() + ')';

        if (!NOTscrollCursorIntoView) {
            EDITOR_scrollCursorIntoView(cursor);
        }
    }
}

function EDITOR_getLineAndColumnIndices_raw(positionIndex) {
    let left = 0;
    let right = EDITOR_lineEndPositionList.count - 1;

    let lineIndex = -1;
    let columnIndex = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        
        if (EDITOR_lineEndPositionList.data[mid] >= positionIndex) {
            lineIndex = mid;

            if (EDITOR_lineEndPositionList.data[mid] === positionIndex) {
                break;
            }
            
            right = mid - 1;
        }
        else if (EDITOR_lineEndPositionList.data[mid] < positionIndex) {
            left = mid + 1;
        }
        else {
            return; // NaN
        }
    }

    if (lineIndex === -1) {
        return {
          indexLine: 0,
          indexColumn: 0,  
        };
    }

    if (lineIndex === 0) {
        columnIndex = positionIndex;
    }
    else {
        columnIndex = positionIndex - (EDITOR_lineEndPositionList.data[lineIndex - 1] + 1);
    }

    return {
        indexLine: lineIndex,
        indexColumn: columnIndex,
    };
}

function EDITOR_getLineAndColumnIndices(positionIndex) {
    let left = 0;
    let right = EDITOR_lineEndPositionList.count - 1;

    let lineIndex = -1;
    let columnIndex = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        
        if (EDITOR_readLineEndPositionList(mid) >= positionIndex) {
            lineIndex = mid;

            if (EDITOR_readLineEndPositionList(mid) === positionIndex) {
                break;
            }
            
            right = mid - 1;
        }
        else if (EDITOR_readLineEndPositionList(mid) < positionIndex) {
            left = mid + 1;
        }
        else {
            return; // NaN
        }
    }

    if (lineIndex === -1) {
        return {
          indexLine: 0,
          indexColumn: 0,  
        };
    }

    if (lineIndex === 0) {
        columnIndex = positionIndex;
    }
    else {
        columnIndex = positionIndex - (EDITOR_readLineEndPositionList(lineIndex - 1) + 1);
    }

    return {
        indexLine: lineIndex,
        indexColumn: columnIndex,
    };
}

/**
 * This function only clears both the 'cursor.selectionDivExists' and the HTML associated with the selection NOT the actual selection position properties of the cursor.
 * 
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_clearSelectionStyle(cursor) {
    let shouldExistSelectionDiv = false;
    if (cursor.selectionDivExists) {
        for (var i = 0; i < get_EDITOR_presentation().children.length; i++) {
            if (get_EDITOR_presentation().children[i].id === cursor.htmlId) {
                let textSelectionDiv = get_EDITOR_presentation().children[i];
                if (!shouldExistSelectionDiv) {
                    get_EDITOR_presentation().removeChild(textSelectionDiv);
                    cursor.selectionDivExists = false;
                }
                break;
            }
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_createStyleForSelection(cursor) {
    if (cursor.DRAWN_selectionAnchor !== cursor.selectionAnchor ||
        cursor.DRAWN_selectionEnd !== cursor.selectionEnd ||
        cursor.DRAWN_selection_virtualCount !== get_EDITOR_virtualCount() ||
        cursor.DRAWN_selection_virtualLineIndex !== get_EDITOR_virtualLineIndex()) {

        cursor.DRAWN_selectionAnchor = cursor.selectionAnchor;
        cursor.DRAWN_selectionEnd = cursor.selectionEnd;
        cursor.DRAWN_selection_virtualCount = get_EDITOR_virtualCount();
        cursor.DRAWN_selection_virtualLineIndex = get_EDITOR_virtualLineIndex();

        let shouldExistSelectionDiv;
        if (cursor.DRAWN_selectionAnchor === cursor.DRAWN_selectionEnd) {
            shouldExistSelectionDiv = false;
        }
        else {
            shouldExistSelectionDiv = true;
        }

        let textSelectionDiv;

        if (cursor.selectionDivExists) {
            for (var i = 0; i < get_EDITOR_presentation().children.length; i++) {
                if (get_EDITOR_presentation().children[i].id === cursor.htmlId) {
                    textSelectionDiv = get_EDITOR_presentation().children[i];
                    if (!shouldExistSelectionDiv) {
                        get_EDITOR_presentation().removeChild(textSelectionDiv);
                        cursor.selectionDivExists = false;
                    }
                    break;
                }
            }
        }
        else if (shouldExistSelectionDiv) {
            textSelectionDiv = document.createElement('div')
            textSelectionDiv.id = cursor.htmlId;
            get_EDITOR_presentation().appendChild(textSelectionDiv);
            cursor.selectionDivExists = true;
        }

        if (!cursor.selectionDivExists) return;

        // TODO: only somewhat simple viewport based virtualization is implemented from what I remember. i.e.: I think the divs are re-used, but every div is redrawn for the viewport, rather than only recalculating the css for the divs that came or left the viewport.

        let start = cursor.selectionAnchor;
        let startLineAndColumnIndices = EDITOR_getLineAndColumnIndices(start);
        let startLine = startLineAndColumnIndices.indexLine;
        let startColumn = startLineAndColumnIndices.indexColumn;

        let end = cursor.selectionEnd;
        let endLineAndColumnIndices = EDITOR_getLineAndColumnIndices(end);
        let INCLUSIVEendLine = endLineAndColumnIndices.indexLine;
        let INCLUSIVEendColumn = endLineAndColumnIndices.indexColumn;

        // # Virtualization
        if (startLine < get_EDITOR_virtualLineIndex()) {
            startLine = get_EDITOR_virtualLineIndex();
            startColumn = 0;
        }
        let lastLineIndexBeingShown = get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1;
        if (INCLUSIVEendLine > lastLineIndexBeingShown) {
            INCLUSIVEendLine = lastLineIndexBeingShown;
            INCLUSIVEendColumn = EDITOR_getLastValidIndexColumn(INCLUSIVEendLine);
        }

        if (start > end) {
            let temp = end;
            let tempLine = INCLUSIVEendLine;
            let tempColumn = INCLUSIVEendColumn;
            end = start;
            INCLUSIVEendLine = startLine;
            INCLUSIVEendColumn = startColumn;
            start = temp;
            startLine = tempLine;
            startColumn = tempColumn;
        }
        //
        // I do not want to fill the screen with display:none divs for when there is a selection to be shown there (I do it all the time but it doesn't seem sensible here).
        // Thus the first step is to ensure there are a matching amount of divs for the selections to apply their style to.
        //
        let selectedLineCount = INCLUSIVEendLine - startLine + 1;
        if (textSelectionDiv.children.length < selectedLineCount) {
            for (let i = textSelectionDiv.children.length; i < selectedLineCount; i++) {
                textSelectionDiv.appendChild(document.createElement('div'));
            }
        }
        else if (textSelectionDiv.children.length > selectedLineCount) {
            for (let i = selectedLineCount; i < textSelectionDiv.children.length; i++) {
                textSelectionDiv.removeChild(textSelectionDiv.children[i]);
            }
        }

        let lineSelectionDiv;
        let childDivIndex = 0;

        if (startLine == INCLUSIVEendLine) {
            lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
            lineSelectionDiv.className = 'EDITOR_selection';
            lineSelectionDiv.style.left = startColumn * EDITOR_characterWidth + 'px';
            lineSelectionDiv.style.top = get_EDITOR_lineHeight() * startLine + 'px';
            lineSelectionDiv.style.width = (INCLUSIVEendColumn - startColumn) * EDITOR_characterWidth + 'px';
        }
        else {
            // start line
            lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
            lineSelectionDiv.className = 'EDITOR_selection';
            lineSelectionDiv.style.left = startColumn * EDITOR_characterWidth + 'px';
            lineSelectionDiv.style.top = get_EDITOR_lineHeight() * startLine + 'px';
            let line = EDITOR_getLineBoundaryPositions(startLine);
            let lineLength = line.end - line.start;
            lineSelectionDiv.style.width = (lineLength + 1 - startColumn) * EDITOR_characterWidth + 'px';

            // between lines
            for (var lineI = startLine + 1; lineI < INCLUSIVEendLine; lineI++) {
                lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
                lineSelectionDiv.className = 'EDITOR_selection';
                lineSelectionDiv.style.left = '0';
                lineSelectionDiv.style.top = get_EDITOR_lineHeight() * lineI + 'px';
                let line = EDITOR_getLineBoundaryPositions(lineI);
                let lineLength = line.end - line.start;
                lineSelectionDiv.style.width = (lineLength + 1) * EDITOR_characterWidth + 'px';
            }

            // end line
            lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
            lineSelectionDiv.className = 'EDITOR_selection';
            lineSelectionDiv.style.left = '0';
            lineSelectionDiv.style.top = get_EDITOR_lineHeight() * INCLUSIVEendLine + 'px';
            lineSelectionDiv.style.width = INCLUSIVEendColumn * EDITOR_characterWidth + 'px';
        }
    }
}

function EDITOR_createStyleForSelection_indentMore(cursor) {
    let textSelectionDiv;
    if (cursor.selectionDivExists) {
        for (var i = 0; i < get_EDITOR_presentation().children.length; i++) {
            if (get_EDITOR_presentation().children[i].id === cursor.htmlId) {
                textSelectionDiv = get_EDITOR_presentation().children[i];
                break;
            }
        }
    }
    else {
        // TODO: Silent error confusing bad idea
        return;
    }

    let extraWidth = 4 * EDITOR_characterWidth;
    for (let i = 0; i < textSelectionDiv.children.length; i++) {
        let lineSelectionDiv = textSelectionDiv.children[i];
        let widthNumberValue = parseFloat(lineSelectionDiv.style.width, 10);
        widthNumberValue += extraWidth;
        lineSelectionDiv.style.width = widthNumberValue + 'px';
    }

    cursor.DRAWN_selectionAnchor = cursor.selectionAnchor;
    cursor.DRAWN_selectionEnd = cursor.selectionEnd;
}

function EDITOR_getLastValidIndexColumn(indexLine) {
    if (indexLine < EDITOR_lineEndPositionList.count) {
        if (indexLine === 0) {
            return EDITOR_readLineEndPositionList(indexLine) - 0;
        }
        else {
            return EDITOR_readLineEndPositionList(indexLine) - (EDITOR_readLineEndPositionList(indexLine - 1) + 1);
        }
    }
    return 0;
}

/**
 * result.start is the position of the first character on that line.
 * 
 * result.end is the position of the "line end" (i.e.: ascii code for '\n' or EOF).
 * 
 * The inclusivity/exclusivity is in reference to whether the position
 * points to non-line-end-text that exists on the line
 * 
 * NOTE: In performance critical sections this code is explicitly inlined and modified to be as performant as it seemingly can get for that specific section of code.
 * 
 * @returns an object with properties 'start' inclusive, 'end' exclusive
 */
function EDITOR_getLineBoundaryPositions(indexLine) {
    if (indexLine < EDITOR_lineEndPositionList.count) {
        if (indexLine === 0) {
            return {
                start: 0,
                end: EDITOR_readLineEndPositionList(indexLine) - 0
            }
        }
        else {
            return {
                start: (EDITOR_readLineEndPositionList(indexLine - 1) + 1),
                end: EDITOR_readLineEndPositionList(indexLine)
            }
        }
    }
    return {
        start: 0,
        end: 0
    }
}

function EDITOR_getLineStart_pos(indexLine) {
    if (indexLine < EDITOR_lineEndPositionList.count) {
        if (indexLine === 0) {
            return 0;
        }
        else {
            return (EDITOR_readLineEndPositionList(indexLine - 1) + 1);
        }
    }
    return 0;
}

function EDITOR_getLineEnd_pos(indexLine) {
    if (indexLine < EDITOR_lineEndPositionList.count) {
        if (indexLine === 0) {
            return EDITOR_readLineEndPositionList(indexLine) - 0;
        }
        else {
            return EDITOR_readLineEndPositionList(indexLine);
        }
    }
    return 0;
}

/**
 * result.start is the position of the first character on that line.
 * 
 * result.end is the position of the "line end" (i.e.: ascii code for '\n' or EOF).
 * 
 * The inclusivity/exclusivity is in reference to whether the position
 * points to non-line-end-text that exists on the line
 * 
 * @returns an object with properties 'start' inclusive, 'end' exclusive
 */
function EDITOR_getLineBoundaryPositions_raw(indexLine) {
    if (indexLine < EDITOR_lineEndPositionList.count) {
        if (indexLine === 0) {
            return {
                start: 0,
                end: EDITOR_lineEndPositionList.data[indexLine] - 0
            }
        }
        else {
            return {
                start: (EDITOR_lineEndPositionList.data[indexLine - 1] + 1),
                end: EDITOR_lineEndPositionList.data[indexLine]
            }
        }
    }
    return {
        start: 0,
        end: 0
    }
}

function EDITOR_getLineStart_pos_raw(indexLine) {
    if (indexLine < EDITOR_lineEndPositionList.count) {
        if (indexLine === 0) {
            return 0;
        }
        else {
            return (EDITOR_lineEndPositionList.data[indexLine - 1] + 1);
        }
    }
    return 0;
}

function EDITOR_getLineEnd_pos_raw(indexLine) {
    if (indexLine < EDITOR_lineEndPositionList.count) {
        if (indexLine === 0) {
            return EDITOR_lineEndPositionList.data[indexLine] - 0;
        }
        else {
            return EDITOR_lineEndPositionList.data[indexLine];
        }
    }
    return 0;
}

function EDITOR_measureLineHeightAndCharacterWidth() {
    let measureElement = document.createElement('div');
    measureElement.style.width = "fit-content";
    get_EDITOR_textElement().appendChild(measureElement);

    let sampleTextBuilder = [];
    for (var i = 0; i < 11; i++) {
        // This is quite silly.
        // The font is intended to be monospace.
        //
        // Given the comment about monospace, all in all what this method does is:
        // 36 characters repeated 11 times
        //
        // I've in the past found this to give the most accurate character width.
        //
        // I don't want to store this string as one massive string that is 11 times the size,
        // because then it has to sit (presumably) as an interned string or in some data section
        // all app long.
        //
        // Since this is doing a "builder" and monospace, it might be similar to just append the number '0' for (36 * 11) times
        //
        // FURTHERMORE: I need to revisit calcuating the character width, this is somewhat of an early
        // way I found to get it, perhaps it isn't quite so involved.
        //
        sampleTextBuilder.push("abcdefghijklmnopqrstuvwxyz0123456789");
    }
    measureElement.innerHTML = sampleTextBuilder.join("");

    // ... this HAS a decimal part, but it is sensible for it to have one.
    EDITOR_characterWidth = measureElement.offsetWidth / (36 * 11);
    // TODO: This is currently a whole number but regardless, it presumably could end up having a decimal part.
    set_EDITOR_lineHeight(Math.ceil(measureElement.offsetHeight));

    const root = document.documentElement;
    const computedStyles = window.getComputedStyle(root);
    let teLineHeight = get_EDITOR_lineHeight() + 'px';
    let propertyName = '--EDITOR-line-height';
    if (computedStyles.getPropertyValue(propertyName) !== teLineHeight) {
        // avoid layout with if statement
        root.style.setProperty(propertyName, teLineHeight);
    }

    get_EDITOR_textElement().removeChild(measureElement);
}

// TODO: I believe this throttling logic can still be improved upon... I feel like there are too many functions being defined but I'm not sure. I'd prefer 1 less function be involved per throttle case.
function EDITOR_onMouseMove_WRAPIT(event) {
    if (event.buttons & 1 && get_EDITOR_isSourceOfLeftMouseButton()) {
		EDITOR_onMouseMove_event = event;
		
	    if (!EDITOR_onMouseMove_timer) {
	        if (true /*options.leading*/) {
	            EDITOR_onMouseMove(event);
	        }
	        EDITOR_onMouseMove_timer = setTimeout(EDITOR_onMouseMove_timeoutFunc, 90);
	    }
    }
    else {
        set_EDITOR_isSourceOfLeftMouseButton(false);
    }
}

function EDITOR_onMouseMove_timeoutFunc() {
    if (/*trailing && lastArgs*/ EDITOR_onMouseMove_event) {
        EDITOR_onMouseMove(EDITOR_onMouseMove_event);
        EDITOR_onMouseMove_event = null;
        EDITOR_onMouseMove_timer = setTimeout(EDITOR_onMouseMove_timeoutFunc, 90);
    } else {
        EDITOR_onMouseMove_timer = null;
    }
}

function EDITOR_onMouseMove(event) {
    if (get_EDITOR_recentBoundingClientRect_isNull_intFalsey()) {
        return;
    }

    let rX = event.clientX - get_EDITOR_recentBoundingClientRect_left() - get_EDITOR_gutterWidthTotal() + EDITOR_baseElement.scrollLeft;
    let rY = event.clientY - get_EDITOR_recentBoundingClientRect_top() + EDITOR_baseElement.scrollTop;

    let indexColumn = Math.round(rX / EDITOR_characterWidth);
    let indexLine = Math.floor(rY / get_EDITOR_lineHeight());

    if (indexColumn < 0) {
        indexColumn = 0;
    }
    
    if (indexLine < 0) {
        indexLine = 0;
    }

    if (indexLine >= EDITOR_lineEndPositionList.count) {
        indexLine = EDITOR_lineEndPositionList.count - 1;
    }

    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(indexLine);
    if (indexColumn > lastValidIndexColumn) {
        indexColumn = lastValidIndexColumn;
    }

    let cursor = EDITOR_primaryCursor;
    cursor.indexLine = indexLine;
    cursor.indexColumn = indexColumn;
    EDITOR_drawCursor(cursor);

    if (get_EDITOR_detailRank() === 3) {
        EDITOR_onMouseMoveDetailRankThree(event, indexLine, indexColumn);
    }
    else if (get_EDITOR_detailRank() === 2) {
        EDITOR_onMouseMoveDetailRankTwo(event, indexLine, indexColumn);
    }
    else if (get_EDITOR_detailRank() === 1) {
        EDITOR_onMouseMoveDetailRankOne(event, indexLine, indexColumn);
    }
}

function EDITOR_onMouseMoveDetailRankOne(event, lineIndexClicked, columnIndexClicked) {
    let cursor = EDITOR_primaryCursor;
    cursor.indexLine = lineIndexClicked;
    cursor.indexColumn = columnIndexClicked;

    cursor.selectionEnd = EDITOR_getPositionIndex(cursor);

    EDITOR_drawCursor(cursor);
}

function getCharacter(positionIndex) {

    // in this getCharacter function, you'd actually already know the total shift if you just looped forwards.
    // Also this currently is EXTREMELY unoptimized given that it resets the totalShift each time it gets invoked rather than remembering the previous result.

    // maybe when hitting ArrowRight you'd want to finalize the edits?
    // because if you have multicursor with two cursors on the same line
    // you type some letters
    // then ctrl arrow right
    // how would this interact with the line end positions?
    //
    // I think if it were something like this, that it'd relate to whether the user moved they're cursor outisde the range of that cursor's pending "gap buffer" insertion text.
    //
    // additionally this function feels "random access", you need to consider a consecutive approach where you accumulate this state.
    // and that's what the plan was... but it doesn't quite feel like it would go here. Or that there'd be a second function in which you agree to using contextual information to determine the result much faster.

    // Cursors overlapping missed cases:
    // =================================
    // two cursors same line hit home
    // two cursors same line hit end

    // this only gets 1 character why is it using the ..._decode_... functions.

    let totalShift = 0;
    // If you need to determine the text without finalizing an edit, you DO have to loop forwards right?
    for (var i = 0; i < EDITOR_cursorList.length; i++) {
        let cursor = EDITOR_cursorList[i];
        switch (cursor.editKind) {
            case get_EditKind_InsertLtr():
                if (positionIndex >= cursor.editPosition & positionIndex < cursor.editPosition + cursor.editLength) {
                    // TODO: I hear fromCharCode is faster than 'String.fromCodePoint(...)' thus I'm seeing if it is sufficient for my current personal usage...
                    // ...long term it presumably fails for characters that I don't tend to type, but until then this is working so I'll just use fromCharCode.
                    //
                    // TODO: This takes a spread/array; if I give it a single byte does it allocate a length of 1 array every invocation?
                    return String.fromCharCode(cursor.gapBuffer[positionIndex - cursor.editPosition]);
                }
                else if (cursor.editPosition <= positionIndex) {
                    totalShift += cursor.editLength;
                }
                break;
            case get_EditKind_DeleteLtr():
            case get_EditKind_BackspaceRtl():
            case get_EditKind_RemoveTextNoBatching():
                totalShift -= cursor.editLength;
                break;
        }
    }
    // TODO: I hear fromCharCode is faster than 'String.fromCodePoint(...)' thus I'm seeing if it is sufficient for my current personal usage...
    // ...long term it presumably fails for characters that I don't tend to type, but until then this is working so I'll just use fromCharCode.
    //
    // TODO: This takes a spread/array; if I give it a single byte does it allocate a length of 1 array every invocation?
    return String.fromCharCode(EDITOR_textByteList.bytes[positionIndex - totalShift]);
}

/**
 * 'positionIndex' is a calculated value that is commonly calculated.
 * It tends to be the case that you already are using a variable to store the positionIndex.
 * Thus providing that positionIndex is ideal.
 * 
 * @param {*} cursor 
 * @param {*} positionIndex 
 */
function EDITOR_getCharacterPrevious(indexColumn, positionIndex) {
    // TODO: Make a 'getCharacter(...) method so the gap buffer logic can be in one location.
    if (indexColumn !== 0) {
        return getCharacter(positionIndex - 1);
    }
    else {
        // TODO: I'm pretty sure this was supposed to say '\0' but it happens to "work" due to them both being 0.
        return get_CharacterKind_None();
    }
}

/**
  * 'positionIndex' is a calculated value that is commonly calculated.
 * It tends to be the case that you already are using a variable to store the positionIndex.
 * Thus providing that positionIndex is ideal.
 * 
 * @param {*} indexColumn 
 * @param {*} positionIndex 
 * @param {*} line 
 */
function EDITOR_getCharacterCurrent(indexColumn, positionIndex, lineEnd) {
    if (indexColumn < lineEnd) {
        return getCharacter(positionIndex);
    }
    else {
        // TODO: I'm pretty sure this was supposed to say '\0' but it happens to "work" due to them both being 0.
        return get_CharacterKind_None();
    }
}

function EDITOR_getCharacterPrevious_KIND(indexColumn, positionIndex) {
    if (indexColumn !== 0) {
        return EDITOR_getCharacterKind(EDITOR_getCharacterPrevious(indexColumn, positionIndex));
    }
    else {
        return get_CharacterKind_None();
    }
}

function EDITOR_getCharacterCurrent_KIND(indexColumn, positionIndex, lineEnd) {
    if (indexColumn < lineEnd) {
        return EDITOR_getCharacterKind(EDITOR_getCharacterCurrent(indexColumn, positionIndex, lineEnd));
    }
    else {
        return get_CharacterKind_None();
    }
}

function EDITOR_onMouseMoveDetailRankTwo(event, lineIndexClicked, columnIndexClicked) {
    let nextPositionIndex = EDITOR_getPositionIndex_Overload(lineIndexClicked, columnIndexClicked);
    let cursor = EDITOR_primaryCursor;

    if (nextPositionIndex <= get_EDITOR_detail_smallPosition()) {
        if (cursor.selectionAnchor < cursor.selectionEnd) {
            cursor.selectionAnchor = get_EDITOR_detail_largePosition();
        }

        cursor.indexLine = lineIndexClicked;
        cursor.indexColumn = columnIndexClicked;
        let positionIndex = nextPositionIndex;

        cursor.selectionEnd = positionIndex;

        if (nextPositionIndex < get_EDITOR_detail_smallPosition()) {
            let goalCharacterKind = EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, positionIndex, EDITOR_getLineEnd_pos(cursor.indexLine));

            let leftWasFound = false;

            let tempPositionIndex = positionIndex;

            while (cursor.indexColumn > 0) {
                let leftCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, tempPositionIndex);
                if (leftCharacterKind !== goalCharacterKind) {
                    cursor.selectionEnd = tempPositionIndex;
                    leftWasFound = true;
                    break;
                }
                tempPositionIndex--;
                cursor.indexColumn--;
            }

            if (!leftWasFound) {
                cursor.selectionEnd = tempPositionIndex;
            }
        }

        EDITOR_drawCursor(cursor);
    }
    else {
        if (cursor.selectionAnchor > cursor.selectionEnd) {
            cursor.selectionAnchor = get_EDITOR_detail_smallPosition();
        }

        if (nextPositionIndex >= get_EDITOR_detail_largePosition()) {
            cursor.indexLine = lineIndexClicked;
            cursor.indexColumn = columnIndexClicked;
            let positionIndex = nextPositionIndex;

            cursor.selectionEnd = positionIndex;

            let leftCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, positionIndex);
            let goalCharacterKind = leftCharacterKind;

            let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
            lineLength = line.end - line.start;
            let rightWasFound = false;

            let tempPositionIndex = positionIndex;
            while (cursor.indexColumn < lineLength) {
                let rightCharacterKind = EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, tempPositionIndex, line.end);
                if (rightCharacterKind !== goalCharacterKind) {
                    cursor.selectionEnd = tempPositionIndex;
                    rightWasFound = true;
                    break;
                }
                tempPositionIndex++;
                cursor.indexColumn++;
            }

            if (!rightWasFound) {
                // end of line
                cursor.selectionEnd = tempPositionIndex;
            }
        }
        else {
            let largeLineAndColumnIndices = EDITOR_getLineAndColumnIndices(get_EDITOR_detail_largePosition());
            cursor.indexLine = largeLineAndColumnIndices.indexLine;
            cursor.indexColumn = largeLineAndColumnIndices.indexColumn;
            cursor.selectionEnd = get_EDITOR_detail_largePosition();
        }

        EDITOR_drawCursor(cursor);
    }
}

function EDITOR_onMouseMoveDetailRankThree(event, lineIndexClicked, columnIndexClicked) {
    let cursor = EDITOR_primaryCursor;

    if (lineIndexClicked === get_EDITOR_detailRank3OriginLine()) {
        if (cursor.positionIndex !== get_EDITOR_detail_smallPosition()) {
            let smallLineAndColumnPositionIndices = EDITOR_getLineAndColumnIndices(get_EDITOR_detail_smallPosition());
            cursor.indexLine = smallLineAndColumnPositionIndices.indexLine;
            cursor.indexColumn = smallLineAndColumnPositionIndices.indexColumn;
        }

        if (cursor.selectionEnd !== get_EDITOR_detail_smallPosition()) {
            cursor.selectionEnd = get_EDITOR_detail_smallPosition();
        }

        if (cursor.selectionAnchor !== get_EDITOR_detail_largePosition()) {
            cursor.selectionAnchor = get_EDITOR_detail_largePosition();
        }

        EDITOR_drawCursor(cursor);
    }
    else if (lineIndexClicked < get_EDITOR_detailRank3OriginLine()) {
        if (cursor.selectionAnchor < cursor.selectionEnd) {
            let smallLineAndColumnPositionIndices = EDITOR_getLineAndColumnIndices(get_EDITOR_detail_smallPosition());

            cursor.indexLine = smallLineAndColumnPositionIndices.indexLine;
            cursor.indexColumn = smallLineAndColumnPositionIndices.indexColumn;

            cursor.selectionEnd = get_EDITOR_detail_smallPosition();

            EDITOR_drawCursor(cursor);
        }

        cursor.indexLine = lineIndexClicked;
        cursor.indexColumn = 0;

        cursor.selectionEnd = EDITOR_getPositionIndex_Overload(lineIndexClicked, 0);

        EDITOR_drawCursor(cursor);
    }
    else if (lineIndexClicked > get_EDITOR_detailRank3OriginLine()) {

        if (cursor.selectionAnchor !== get_EDITOR_detail_smallPosition()) {
            cursor.selectionAnchor = get_EDITOR_detail_smallPosition();
        }

        cursor.indexLine = lineIndexClicked;
        cursor.indexColumn = columnIndexClicked;
        let positionIndex = EDITOR_getPositionIndex_Overload(lineIndexClicked, columnIndexClicked);

        // move to end of line...
        let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
        let lineLength = line.end - line.start;
        positionIndex += lineLength - cursor.indexColumn;

        if (cursor.indexLine === EDITOR_lineEndPositionList.count - 1) {
            cursor.indexColumn = lineLength;
            cursor.selectionEnd = positionIndex;
        }
        else {
            // wrap to the next line
            cursor.indexLine++;
            cursor.indexColumn = 0;
            positionIndex++;

            cursor.selectionEnd = positionIndex;
        }

        EDITOR_drawCursor(cursor);
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_getPositionIndex(cursor) {
    return EDITOR_getLineStart_pos(cursor.indexLine) + cursor.indexColumn;
}

function EDITOR_getPositionIndex_Overload(indexLine, indexColumn) {
    return EDITOR_getLineStart_pos(indexLine) + indexColumn;
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_getPositionIndex_raw(cursor) {
    return EDITOR_getLineStart_pos_raw(cursor.indexLine) + cursor.indexColumn;
}

function EDITOR_onMouseDownDetailRankOne(event, lineIndexClicked, columnIndexClicked) {
    let cursor = EDITOR_primaryCursor;

    let selectionPlusContextMenuCase = event.button === 2 && cursor.hasSelection();

    if (event.shiftKey && !selectionPlusContextMenuCase) {
        if (!cursor.hasSelection()) {
            cursor.selectionAnchor = EDITOR_getPositionIndex(cursor);
        }
    }

    if (!selectionPlusContextMenuCase) {
        cursor.indexLine = lineIndexClicked;
        cursor.indexColumn = columnIndexClicked;
        cursor.STORED_indexColumn = cursor.indexColumn;
    
        cursor.selectionEnd = EDITOR_getPositionIndex(cursor);

        if (!event.shiftKey) {
            cursor.selectionAnchor = cursor.selectionEnd;
        }
    }

    EDITOR_drawCursor(cursor);
}

function EDITOR_onMouseDownDetailRankTwo(event, lineIndexClicked, columnIndexClicked) {
    if (event.shiftKey) {
        EDITOR_onMouseDownDetailRankOne(event, lineIndexClicked, columnIndexClicked);
        return;
    }

    let cursor = EDITOR_primaryCursor;

    cursor.indexLine = lineIndexClicked;
    cursor.indexColumn = columnIndexClicked;
    let positionIndex = EDITOR_getPositionIndex(cursor);
    
    let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);

    let leftCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, positionIndex);
    let rightCharacterKind = EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, positionIndex, line.end);

    if (leftCharacterKind === rightCharacterKind) {
        let goalCharacterKind = rightCharacterKind;

        let tempIndexColumn = cursor.indexColumn;
        let tempPositionIndex = EDITOR_getPositionIndex_Overload(cursor.indexLine, tempIndexColumn);
        while (tempIndexColumn > 0) {
            tempIndexColumn--;
            tempPositionIndex--;
            leftCharacterKind = EDITOR_getCharacterPrevious_KIND(tempIndexColumn, tempPositionIndex);
            if (leftCharacterKind !== goalCharacterKind) {
                cursor.selectionAnchor = tempPositionIndex;
                break;
            }
        }

        let lineLength = line.end - line.start;
        let rightWasFound = false;
        tempIndexColumn = cursor.indexColumn;
        tempPositionIndex = EDITOR_getPositionIndex_Overload(cursor.indexLine, tempIndexColumn);
        while (tempIndexColumn < lineLength) {
            tempIndexColumn++;
            tempPositionIndex++;
            rightCharacterKind = EDITOR_getCharacterCurrent_KIND(tempIndexColumn, tempPositionIndex, line.end);
            if (rightCharacterKind !== goalCharacterKind) {
                cursor.indexColumn = tempIndexColumn;
                cursor.selectionEnd = tempPositionIndex;
                rightWasFound = true;
                break;
            }
        }

        if (!rightWasFound) {
            // end of line
            cursor.indexColumn = tempIndexColumn;
            cursor.selectionEnd = tempPositionIndex;
        }

        EDITOR_drawCursor(cursor);
    }
    else if (leftCharacterKind > rightCharacterKind) {
        let goalCharacterKind = leftCharacterKind;

        let tempIndexColumn = cursor.indexColumn;
        let originalPositionIndex = EDITOR_getPositionIndex_Overload(cursor.indexLine, tempIndexColumn);
        let tempPositionIndex = originalPositionIndex;

        while (cursor.indexColumn > 0) {
            tempIndexColumn--;
            tempPositionIndex--;
            leftCharacterKind = EDITOR_getCharacterPrevious_KIND(tempIndexColumn, tempPositionIndex);
            if (leftCharacterKind !== goalCharacterKind) {
                cursor.selectionAnchor = tempPositionIndex;
                break;
            }
        }

        cursor.selectionEnd = originalPositionIndex;

        EDITOR_drawCursor(cursor);
    }
    else {
        let goalCharacterKind = rightCharacterKind;

        let positionIndex = EDITOR_getPositionIndex_Overload(cursor.indexLine, cursor.indexColumn);
        cursor.selectionAnchor = positionIndex;

        let lineLength = line.end - line.start;
        let rightWasFound = false;

        while (cursor.indexColumn < lineLength) {
            cursor.indexColumn++;
            positionIndex++;
            rightCharacterKind = EDITOR_getCharacterCurrent(cursor.indexColumn, positionIndex, line.end);
            if (rightCharacterKind !== goalCharacterKind) {
                cursor.selectionEnd = positionIndex;
                rightWasFound = true;
                break;
            }
        }

        if (!rightWasFound) {
            // end of line
            cursor.selectionEnd = positionIndex;
        }

        EDITOR_drawCursor(cursor);
    }

    if (cursor.selectionAnchor < cursor.selectionEnd) {
        set_EDITOR_detail_smallPosition(cursor.selectionAnchor);
        set_EDITOR_detail_largePosition(cursor.selectionEnd);
    }
    else {
        set_EDITOR_detail_smallPosition(cursor.selectionEnd);
        set_EDITOR_detail_largePosition(cursor.selectionAnchor);
    }
}

function EDITOR_onMouseDownDetailRankThree(event, lineIndexClicked, columnIndexClicked) {
    if (event.shiftKey) {
        EDITOR_onMouseDownDetailRankOne(event, lineIndexClicked, columnIndexClicked);
        return;
    }

    let cursor = EDITOR_primaryCursor;

    cursor.indexLine = lineIndexClicked;
    cursor.indexColumn = columnIndexClicked;
    
    cursor.selectionAnchor = EDITOR_getPositionIndex_Overload(cursor.indexLine, 0);
    
    set_EDITOR_detailRank3OriginLine(cursor.indexLine);

    if (cursor.indexLine === EDITOR_lineEndPositionList.count - 1) {
        let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
        cursor.selectionEnd = line.end;
        EDITOR_drawCursor(cursor);
    }
    else {
        cursor.indexLine++;
        cursor.indexColumn = 0;
        let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
        cursor.selectionEnd = line.start;
        EDITOR_drawCursor(cursor);
    }

    if (cursor.selectionAnchor < cursor.selectionEnd) {
        set_EDITOR_detail_smallPosition(cursor.selectionAnchor);
        set_EDITOR_detail_largePosition(cursor.selectionEnd);
    }
    else {
        set_EDITOR_detail_smallPosition(cursor.selectionEnd);
        set_EDITOR_detail_largePosition(cursor.selectionAnchor);
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_insertGapBufferSpan(cursor) {
    let w = walkLineUntilColumnIndex(cursor);
    if (w.indexColumn_Goal === -1 || !w.div || w.div.children.length === 0) {
        cursor.gapBufferWriteToSpanElement = null;
        cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
        return;
    }

    if (w.indexColumn_Goal == 0) {
        // TODO: Ensure 'w.div.children[0]' is equal to the 'w.span' and then change this line to use 'w.span'
        cursor.gapBufferWriteToSpanElement = w.span;
        cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
    }
    else {
        cursor.gapBufferWriteToSpanElement = w.div.children[w.indexSpan];

        if (w.indexColumn_Goal === w.indexColumn_Sum + cursor.gapBufferWriteToSpanElement.textContent.length) {
            cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = cursor.gapBufferWriteToSpanElement.textContent.length;
        }
        else {
            cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = w.indexColumn_SpanTextContentRelative;
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} editKind 
 * @param {*} editPosition 
 * @param {*} editLength 
 */
function EDITOR_startEdit(cursor, editKind, editPosition, editLength) {
    cursor.editKind = editKind;
    cursor.editPosition = editPosition;
    cursor.editIndexLine = cursor.indexLine;
    cursor.editIndexColumn = cursor.indexColumn;
    cursor.editLength = editLength;

    switch (editKind) {
        case get_EditKind_InsertLtr():
            EDITOR_insertGapBufferSpan(cursor);
            break;
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} indexCursor 
 * @returns 
 */
function EDITOR_NOTcanBatch_insert(cursor, indexCursor) {
    return cursor.editKind != get_EditKind_InsertLtr() ||
           cursor.indexLine !== cursor.editIndexLine ||
           cursor.indexColumn !== cursor.editIndexColumn + cursor.editLength ||
           cursor.editLength >= EDITOR_Cursor.GAP_BUFFER_CAPACITY ||
           cursor.hasSelection();
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_NOTcanBatch_backspace(cursor) {
    return cursor.editKind != get_EditKind_BackspaceRtl() ||
           cursor.indexLine !== cursor.editIndexLine ||
           cursor.indexColumn !== cursor.editIndexColumn ||
           cursor.hasSelection();
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_NOTcanBatch_delete(cursor) {
    return cursor.editKind != get_EditKind_DeleteLtr() ||
           cursor.indexLine !== cursor.editIndexLine ||
           cursor.indexColumn !== cursor.editIndexColumn ||
           cursor.hasSelection();
}

/**
 * javascript is single threaded, if this does end up working, don't repeat this in other languages, runtimes, etc... without care.
 * Also I looked at all the async logic and believe everything is in proper timing. This pattern perhaps would break if an await where added somewhere in a critical section?
 * It's actually extremely scuffed lmao. I'm counting on the get_ticket_didChangeTextDocumentNotificationPromise() not being captured on lambda "creation"?
 * but instead inside the lambda when I ask for it it gets the value.
 * This could make sense for references. It "should" be fine because maybe I'm actually capturing 'this' and then accessing the variable from there?
 * could 'this.get_ticket_didChangeTextDocumentNotificationPromise()' result in different lambda variablel capturing such and such?
 * I should probably make sure it works but I'm not there yet.
 */
async function EDITOR_didChangeTextDocumentNotification(absolutePath, version, startLine, startCharacter, endLine, endCharacter, text, ticket) {
    await window.myAPI.didChangeTextDocumentNotification(absolutePath, version, startLine, startCharacter, endLine, endCharacter, text, );
    if (get_ticket_didChangeTextDocumentNotificationPromise() === ticket) {
        didChangeTextDocumentNotificationPromise = null;
    }
}

/**
 * TODO: Exception during finalize softlocks the editor because you can't even clear to reset the state: 'Uncaught (in promise) Error: removeAt(...): index > this.count'
 * 
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_finalizeEdit(cursor) {
    /**
     * Later code needs to know the line index that the removal occurred on.
     * In a naive approach, presume every edit only spans a single line.
     * Then reversing backwards gets you the first line index that "fits" the edit and thus the line index the edit occurred on.
     * 
     * If for whatever reason the first time around this loop fails, then you never decremented so you wouldn't increment to restore
     * the iteration variable to the previous loop's state.
     */
    let lineIndex_editOccurredOn = -1;

    switch (cursor.editKind) {
        case get_EditKind_InsertLtr():
            {
                for (let i = EDITOR_lineEndPositionList.count - 1; i >= 0; i--) {
                    if (cursor.editPosition <= EDITOR_lineEndPositionList.data[i]) {
                        EDITOR_lineEndPositionList.data[i] += cursor.editLength;
                    }
                    else {
                        if (i === EDITOR_lineEndPositionList.count - 1) {
                            lineIndex_editOccurredOn = i;
                        }
                        else {
                            lineIndex_editOccurredOn = i + 1;
                        }
                        break;
                    }
                }
                for (var i = 0; i < EDITOR_trackedSyntaxList.count_abstract; i++) {
                    EDITOR_trackedSyntaxList.getElementAt(i);
                    if (cursor.editPosition <= get_EDITOR_pooledTrackedSyntax_start()) {
                        EDITOR_trackedSyntaxList.setStart(i, get_EDITOR_pooledTrackedSyntax_start() + cursor.editLength);
                    }
                    else if (EDITOR_pooledTrackedSyntax_trackedSyntaxKind === TrackedSyntaxKind.Comment &&
                            cursor.editPosition === get_EDITOR_pooledTrackedSyntax_start() + 1) {

                        // TODO: Insertion of '*' probably shouldn't remove.
                        EDITOR_trackedSyntaxList.removeAt(i, 1);
                    }
                    else if (cursor.editPosition > get_EDITOR_pooledTrackedSyntax_start() && cursor.editPosition < get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length()) {
                        EDITOR_trackedSyntaxList.setLength(i, get_EDITOR_pooledTrackedSyntax_length() + cursor.editLength);
                    }
                }
                EDITOR_textByteList.insertBytes(cursor.editPosition, cursor.gapBuffer, /*offset*/ 0, /*length*/ cursor.gapBufferCount);

                set_ticket_didChangeTextDocumentNotificationPromise(get_ticket_didChangeTextDocumentNotificationPromise() + 1);
                let ticket = get_ticket_didChangeTextDocumentNotificationPromise();
                let textSourceIdentifier = EDITOR_FORMATTED_textSourceIdentifier;
                let lineAndColumnIndices = EDITOR_getLineAndColumnIndices(cursor.editPosition);
                // TODO: Account for any '\0\0\0\t' that exist on the line
                let text = EDITOR_decoder.decode(cursor.gapBuffer.subarray(0, cursor.gapBufferCount));
                set_didChangeTextDocument_version(get_didChangeTextDocument_version() + 1);
                let version = get_didChangeTextDocument_version();
                if (didChangeTextDocumentNotificationPromise) {
                    didChangeTextDocumentNotificationPromise = didChangeTextDocumentNotificationPromise.then(async () => {
                        await EDITOR_didChangeTextDocumentNotification(
                            textSourceIdentifier,
                            version,
                            lineAndColumnIndices.indexLine,
                            lineAndColumnIndices.indexColumn,
                            lineAndColumnIndices.indexLine,
                            lineAndColumnIndices.indexColumn,
                            text,
                            ticket);
                    });
                }
                else {
                    didChangeTextDocumentNotificationPromise = EDITOR_didChangeTextDocumentNotification(
                        textSourceIdentifier,
                        version,
                        lineAndColumnIndices.indexLine,
                        lineAndColumnIndices.indexColumn,
                        lineAndColumnIndices.indexLine,
                        lineAndColumnIndices.indexColumn,
                        text,
                        ticket);
                }

                if (lineIndex_editOccurredOn === get_EDITOR_longestLine_indexLine()) {
                    set_EDITOR_longestLine_length(get_EDITOR_longestLine_length() + cursor.editLength);
                }

                cursor.editKind = get_EditKind_None();
                cursor.editLength = 0;
                cursor.editPosition = 0;
                cursor.editIndexLine = 0;
                cursor.editIndexColumn = 0;
                cursor.END_editIndexLine = 0;
                cursor.END_editIndexColumn = 0;
                cursor.gapBufferCount = 0;
                cursor.gapBufferWriteToSpanElement = null;
                cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
                break;
            }
        case get_EditKind_Enter():
            {
                // TODO: A notification needs to sent to the LSP here
                // TODO: Update the tracked syntax list here... the enter key event actually is invoking 'EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength'...

                // I don't know what to do so I'm starting by making this enum, then switch over it.
                switch (cursor.enterKeyEventKind) {
                    case get_EnterKeyEventKind_StartOfLine():
                        if (cursor.cached_indentation_byteList) {
                            // TODO: Enter key should instead store the position of the indentation, then you can write the byte array that contains all of the "text"...
                            // ...you can insert the span that has the indentation into the same array again.
                            EDITOR_textByteList.insertBytes(cursor.editPosition, cursor.cached_indentation_byteList.bytes, /*offset*/ 0, cursor.cached_indentation_byteList.count);
                        }
                        EDITOR_textByteList.insert(cursor.editPosition + cursor.cached_indentation_byteList.count, ASCII_LINE_FEED);
                        for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
                            EDITOR_lineEndPositionList.data[i] += cursor.editLength;
                        }

                        if (cursor.editIndexLine <= get_EDITOR_longestLine_indexLine()) {
                            set_EDITOR_longestLine_indexLine(get_EDITOR_longestLine_indexLine() + 1);
                        }
                        EDITOR_lineEndPositionList.insert(cursor.editIndexLine, cursor.editPosition + cursor.cached_indentation_byteList.count);
                        break;
                    case get_EnterKeyEventKind_EndOfLine():
                        EDITOR_textByteList.insert(cursor.editPosition, ASCII_LINE_FEED);

                        if (cursor.cached_indentation_byteList) {
                            EDITOR_textByteList.insertBytes(cursor.editPosition + 1, cursor.cached_indentation_byteList.bytes, /*offset*/ 0, cursor.cached_indentation_byteList.count);
                        }
                        for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
                            EDITOR_lineEndPositionList.data[i] += cursor.editLength;
                        }

                        if (cursor.editIndexLine <= get_EDITOR_longestLine_indexLine()) {
                            set_EDITOR_longestLine_indexLine(get_EDITOR_longestLine_indexLine() + 1);
                        }
                        EDITOR_lineEndPositionList.insert(cursor.editIndexLine, cursor.editPosition);
                        break;
                    case get_EnterKeyEventKind_AmongALine():
                        EDITOR_textByteList.insert(cursor.editPosition, ASCII_LINE_FEED);

                        if (cursor.cached_indentation_byteList) {
                            EDITOR_textByteList.insertBytes(cursor.editPosition + 1, cursor.cached_indentation_byteList.bytes, /*offset*/ 0, cursor.cached_indentation_byteList.count);
                        }
                        for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
                            EDITOR_lineEndPositionList.data[i] += cursor.editLength;
                        }
                        
                        if (cursor.editIndexLine <= get_EDITOR_longestLine_indexLine()) {
                            set_EDITOR_longestLine_indexLine(get_EDITOR_longestLine_indexLine() + 1);
                        }
                        EDITOR_lineEndPositionList.insert(cursor.editIndexLine, cursor.editPosition);
                        break;
                    case get_EnterKeyEventKind_FallbackCase():
                        EDITOR_textByteList.insert(cursor.editPosition, ASCII_LINE_FEED);
                        
                        if (cursor.cached_indentation_byteList) {
                            EDITOR_textByteList.insertBytes(cursor.editPosition + 1, cursor.cached_indentation_byteList.bytes, /*offset*/ 0, cursor.cached_indentation_byteList.count);
                        }
                        for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
                            EDITOR_lineEndPositionList.data[i] += cursor.editLength;
                        }

                        if (cursor.editIndexLine <= get_EDITOR_longestLine_indexLine()) {
                            set_EDITOR_longestLine_indexLine(get_EDITOR_longestLine_indexLine() + 1);
                        }
                        EDITOR_lineEndPositionList.insert(cursor.editIndexLine, cursor.editPosition);
                        break;
                }

                if (!cursor.enterKeyEventKind || cursor.enterKeyEventKind === get_EnterKeyEventKind_None() )  {
                    throw new Error('if (!enterKeyEventKind...)');
                }

                cursor.editKind = get_EditKind_None();
                cursor.editLength = 0;
                cursor.editPosition = 0;
                cursor.editIndexLine = 0;
                cursor.editIndexColumn = 0;
                cursor.END_editIndexLine = 0;
                cursor.END_editIndexColumn = 0;
                cursor.gapBufferCount = 0;
                cursor.gapBufferWriteToSpanElement = null;
                cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
                return;
            }
        case get_EditKind_Tab():
            {
                EDITOR_textByteList.insertBytes(cursor.editPosition, EDITOR_on_tab_bytes, /*offset*/ 0, /*length*/ 4);

                for (var i = cursor.editIndexLine; i < EDITOR_lineEndPositionList.count; i++) {
                    EDITOR_lineEndPositionList.data[i] += 4;
                }

                cursor.editKind = get_EditKind_None();
                cursor.editLength = 0;
                cursor.editPosition = 0;
                cursor.editIndexLine = 0;
                cursor.editIndexColumn = 0;
                cursor.END_editIndexLine = 0;
                cursor.END_editIndexColumn = 0;
                cursor.gapBufferCount = 0;
                cursor.gapBufferWriteToSpanElement = null;
                cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
                return;
            }
        case get_EditKind_IndentMore():
            {
                let ORIGINAL_incrementBy = get_EDITOR_indent_ORIGINAL_indentBy();
                let incrementBy = get_EDITOR_indent_ORIGINAL_indentBy();
                set_EDITOR_indent_ORIGINAL_indentBy(0);

                let startingIndex = get_EDITOR_indent_startingIndex();
                set_EDITOR_indent_startingIndex(0);
                let SMALL_lineAndColumnIndices_indexLine = get_EDITOR_indent_SMALL_lineAndColumnIndices_indexLine();
                set_EDITOR_indent_SMALL_lineAndColumnIndices_indexLine(0);

                for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
                    let linePos = EDITOR_getLineBoundaryPositions(lineI);

                    // # Insert the text on the respective line.
                    EDITOR_textByteList.insertBytes(linePos.start, EDITOR_on_tab_bytes, 0 /*offset*/, 4 /*length*/);
                    
                    // # Increment the entry in 'EDITOR_lineEndPositionList' for the respective line
                    EDITOR_lineEndPositionList.data[lineI] += incrementBy;

                    // # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
                    //     # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
                    //     # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
                    incrementBy -= 4;
                }

                // # Any line that is not part of the selected set of lines, and is at a greater indexLine, needs to have their line end position entry updated.
                for (var lineI = startingIndex + 1; lineI < EDITOR_lineEndPositionList.count; lineI++) {
                    EDITOR_lineEndPositionList.data[lineI] += ORIGINAL_incrementBy;
                }

                cursor.editKind = get_EditKind_None();
                cursor.editLength = 0;
                cursor.editPosition = 0;
                cursor.editIndexLine = 0;
                cursor.editIndexColumn = 0;
                cursor.END_editIndexLine = 0;
                cursor.END_editIndexColumn = 0;
                cursor.gapBufferCount = 0;
                cursor.gapBufferWriteToSpanElement = null;
                cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
                return;
            }
        case get_EditKind_IndentLess():
            {
                let ORIGINAL_decrementBy = get_EDITOR_indent_ORIGINAL_indentBy();
                let decrementBy = get_EDITOR_indent_ORIGINAL_indentBy();
                set_EDITOR_indent_ORIGINAL_indentBy(0);

                let startingIndex = get_EDITOR_indent_startingIndex();
                set_EDITOR_indent_startingIndex(0);
                let SMALL_lineAndColumnIndices_indexLine = get_EDITOR_indent_SMALL_lineAndColumnIndices_indexLine();
                set_EDITOR_indent_SMALL_lineAndColumnIndices_indexLine(0);

                for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
                    let innerRemoveCount = 0;
                    let linePos = EDITOR_getLineBoundaryPositions(lineI);
                    let line = linePos;
                    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(lineI);
                    let upperLimitIndexColumn;
                    if (lastValidIndexColumn > 4) {
                        upperLimitIndexColumn = 4;
                    }
                    else {
                        upperLimitIndexColumn = lastValidIndexColumn;
                    }
                    let seenSpace = false;
                    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
                        let c = getCharacter(line.start + i);
                        switch (c) {
                            case ' ':
                                seenSpace = true;
                                innerRemoveCount++;
                                break;
                            case '\t':
                                if (!seenSpace) {
                                    innerRemoveCount += 4;
                                }
                                break outer;
                            default:
                                break outer;
                        }
                    }

                    EDITOR_textByteList.removeAt(linePos.start, innerRemoveCount);
                    EDITOR_lineEndPositionList.data[lineI] -= decrementBy;

                    decrementBy -= innerRemoveCount;
                }

                for (var lineI = startingIndex + 1; lineI < EDITOR_lineEndPositionList.count; lineI++) {
                    EDITOR_lineEndPositionList.data[lineI] -= ORIGINAL_decrementBy;
                }

                cursor.editKind = get_EditKind_None();
                cursor.editLength = 0;
                cursor.editPosition = 0;
                cursor.editIndexLine = 0;
                cursor.editIndexColumn = 0;
                cursor.END_editIndexLine = 0;
                cursor.END_editIndexColumn = 0;
                cursor.gapBufferCount = 0;
                cursor.gapBufferWriteToSpanElement = null;
                cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;
                break;
            }
        case get_EditKind_Paste():
            {
                let content = cursor.EDITOR_paste_clipboardContent;
                cursor.EDITOR_paste_clipboardContent = null;

                let linesInsertedCount = 0;
                let insertionLength = 0;

                for (var sourceI = 0; sourceI < content.length; sourceI++) {
                    switch (content[sourceI]) {
                        case '\t':
                            EDITOR_textByteList.insertBytes(cursor.editPosition + insertionLength, EDITOR_tab_tabsbytes, /*offset*/ 0, /*length*/ 4);
                            insertionLength += 4;
                            break;
                        case '\n':
                            EDITOR_textByteList.insert(cursor.editPosition + insertionLength, ASCII_LINE_FEED);
                            EDITOR_lineEndPositionList.insert(cursor.editIndexLine + linesInsertedCount, cursor.editPosition + insertionLength);
                            insertionLength++;
                            linesInsertedCount++;
                            break;
                        case '\r':
                            if (sourceI < content.length - 1 && content[sourceI + 1] === '\n') {
                                sourceI++;
                            }
                            EDITOR_textByteList.insert(cursor.editPosition + insertionLength, ASCII_LINE_FEED);
                            EDITOR_lineEndPositionList.insert(cursor.editIndexLine + linesInsertedCount, cursor.editPosition + insertionLength);
                            insertionLength++;
                            linesInsertedCount++;
                            break;
                        default:
                            EDITOR_textByteList.insert(cursor.editPosition + insertionLength, content.charCodeAt(sourceI));
                            insertionLength++;
                            break;
                    }
                }

                for (var i = cursor.editIndexLine + linesInsertedCount; i < EDITOR_lineEndPositionList.count; i++) {
                    EDITOR_lineEndPositionList.data[i] += insertionLength;
                }

                cursor.editKind = get_EditKind_None();
                cursor.editLength = 0;
                cursor.editPosition = 0;
                cursor.editIndexLine = 0;
                cursor.editIndexColumn = 0;
                cursor.END_editIndexLine = 0;
                cursor.END_editIndexColumn = 0;
                cursor.gapBufferCount = 0;
                cursor.gapBufferWriteToSpanElement = null;
                cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;

                EDITOR_lineEndPositionList_PENDING.clear();

                return;
            }
        case get_EditKind_Duplicate():
            {
                let small = cursor.EDITOR_duplicate_small;
                let length = cursor.EDITOR_duplicate_length;

                cursor.EDITOR_duplicate_small = 0;
                cursor.EDITOR_duplicate_length = 0;

                let linesInsertedCount = 0;
                let insertionLength = 0;

                EDITOR_textByteList.duplicateWithin(small, cursor.editPosition, length);
                
                // TODO: cursor between '\t\0\0\0' is presumed to be the concern of the editor, duplication logic presumes correctness i.e.: that if the '\t' is selected that the '\0\0\0' that come after is selected too...
                // ...and that no partial selection over those characters could ever occur.

                // TODO: You should be able to do this much faster than looping over the selected bytes since you know the line end positions that exist and would know whether the selection will insert line endings.

                for (let offset = 0; offset < length; offset++) {
                    switch (EDITOR_textByteList.bytes[small + offset]) {
                        case ASCII_TAB:
                            insertionLength += 4;
                            break;
                        case ASCII_LINE_FEED:
                            EDITOR_lineEndPositionList.insert(cursor.editIndexLine + linesInsertedCount, cursor.editPosition + insertionLength);
                            insertionLength++;
                            linesInsertedCount++;
                            break;
                        default:
                            insertionLength++;
                            break;
                    }
                }

                for (var i = cursor.editIndexLine + linesInsertedCount; i < EDITOR_lineEndPositionList.count; i++) {
                    EDITOR_lineEndPositionList.data[i] += insertionLength;
                }

                cursor.editKind = get_EditKind_None();
                cursor.editLength = 0;
                cursor.editPosition = 0;
                cursor.editIndexLine = 0;
                cursor.editIndexColumn = 0;
                cursor.END_editIndexLine = 0;
                cursor.END_editIndexColumn = 0;
                cursor.gapBufferCount = 0;
                cursor.gapBufferWriteToSpanElement = null;
                cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 0;

                EDITOR_lineEndPositionList_PENDING.clear();

                return;
            }
        case get_EditKind_DeleteLtr():
        case get_EditKind_BackspaceRtl():
        case get_EditKind_RemoveTextNoBatching():
            {
                // TODO: surely u'd get this before doing the edit?
                let startLineAndColumnIndices;
                if (cursor.editKind === get_EditKind_RemoveTextNoBatching()) {
                    startLineAndColumnIndices = {
                        indexLine: cursor.editIndexLine,
                        indexColumn: cursor.editIndexColumn,
                    };
                }
                else {
                    startLineAndColumnIndices = EDITOR_getLineAndColumnIndices_raw(cursor.editPosition);
                }
                let endLineAndColumnIndices;
                if (cursor.editKind === get_EditKind_RemoveTextNoBatching()) {
                    endLineAndColumnIndices = {
                        indexLine: cursor.END_editIndexLine,
                        indexColumn: cursor.END_editIndexColumn,
                    };
                }
                else {
                    endLineAndColumnIndices = EDITOR_getLineAndColumnIndices_raw(cursor.editPosition + cursor.editLength);
                }

                if (cursor.editLineFeedCount > 0) {
                    let count = 0;
                    let lastMatchedIndexLine = 0;
                    for (let i = EDITOR_lineEndPositionList_PENDING.count - 1; i >= 0; i--) {
                        let lineEndPos = EDITOR_lineEndPositionList_PENDING.data[i];
                        if (cursor.editPosition <= lineEndPos && cursor.editPosition + cursor.editLength > lineEndPos) {
                            lastMatchedIndexLine = EDITOR_getLineAndColumnIndices_raw(lineEndPos).indexLine;
                            count++;
                            EDITOR_lineEndPositionList_PENDING.removeAt(i, 1);
                        }
                        else if (cursor.editPosition > lineEndPos) {
                            break;
                        }
                    }
                    if (count > 0) {
                        EDITOR_lineEndPositionList.removeAt(lastMatchedIndexLine, count);
                    }
                }
                for (let i = EDITOR_lineEndPositionList.count - 1; i >= 0; i--) {
                    if (cursor.editPosition < EDITOR_lineEndPositionList.data[i]) {
                        EDITOR_lineEndPositionList.data[i] -= cursor.editLength;
                    }
                    else {
                        if (i === EDITOR_lineEndPositionList.count - 1) {
                            lineIndex_editOccurredOn = i;
                        }
                        else {
                            lineIndex_editOccurredOn = i + 1;
                        }
                        break;
                    }
                }
                for (var i = EDITOR_trackedSyntaxList.count_abstract - 1; i >= 0; i--) {
                    EDITOR_trackedSyntaxList.getElementAt(i);
                    if (cursor.editPosition < get_EDITOR_pooledTrackedSyntax_start()) {
                        EDITOR_trackedSyntaxList.setStart(i, get_EDITOR_pooledTrackedSyntax_start() - cursor.editLength);
                    }
                    else if (get_EDITOR_pooledTrackedSyntax_start() >= cursor.editPosition && get_EDITOR_pooledTrackedSyntax_start() < cursor.editPosition + cursor.editLength) {
                        // TODO: This needs to remove more than 1 at a time
                        EDITOR_trackedSyntaxList.removeAt(i, 1);
                    }
                    else if (EDITOR_pooledTrackedSyntax_trackedSyntaxKind === TrackedSyntaxKind.Comment &&
                            (get_EDITOR_pooledTrackedSyntax_start() + 1) >= cursor.editPosition && (get_EDITOR_pooledTrackedSyntax_start() + 1) < cursor.editPosition + cursor.editLength) {
                        // TODO: You can invalidate a >1 char long by removing beyond just the first unless a character afterwards falls into place that is valid by chance
                        //
                        // only multi-line-comments that span multiple lines are stored in EDITOR_trackedSyntaxList with the 'TrackedSyntaxKind.Comment'
                        //
                        EDITOR_trackedSyntaxList.removeAt(i, 1);
                    }
                    else if (cursor.editPosition > get_EDITOR_pooledTrackedSyntax_start() && cursor.editPosition < get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length()) {
                        EDITOR_trackedSyntaxList.setLength(i, get_EDITOR_pooledTrackedSyntax_length() - cursor.editLength);
                    }
                }

                EDITOR_textByteList.removeAt(cursor.editPosition, cursor.editLength);

                set_ticket_didChangeTextDocumentNotificationPromise(get_ticket_didChangeTextDocumentNotificationPromise() + 1);
                let ticket = get_ticket_didChangeTextDocumentNotificationPromise();
                let textSourceIdentifier = EDITOR_FORMATTED_textSourceIdentifier;
                // TODO: Account for any '\0\0\0\t' that exist on the line            
                let text = '';
                set_didChangeTextDocument_version(get_didChangeTextDocument_version() + 1);
                let version = get_didChangeTextDocument_version();
                if (didChangeTextDocumentNotificationPromise) {
                    didChangeTextDocumentNotificationPromise = didChangeTextDocumentNotificationPromise.then(async () => {
                        await EDITOR_didChangeTextDocumentNotification(
                            textSourceIdentifier,
                            version,
                            startLineAndColumnIndices.indexLine,
                            startLineAndColumnIndices.indexColumn,
                            endLineAndColumnIndices.indexLine,
                            endLineAndColumnIndices.indexColumn,
                            text,
                            ticket);
                    });
                }
                else {
                    didChangeTextDocumentNotificationPromise = EDITOR_didChangeTextDocumentNotification(
                        textSourceIdentifier,
                        version,
                        startLineAndColumnIndices.indexLine,
                        startLineAndColumnIndices.indexColumn,
                        endLineAndColumnIndices.indexLine,
                        endLineAndColumnIndices.indexColumn,
                        text,
                        ticket);
                }

                if (lineIndex_editOccurredOn === get_EDITOR_longestLine_indexLine()) {
                    set_EDITOR_longestLine_length(get_EDITOR_longestLine_length() - cursor.editLength);
                }

                cursor.editLineFeedCount = 0;
                cursor.editKind = get_EditKind_None();
                cursor.editLength = 0;
                cursor.editPosition = 0;
                cursor.editIndexLine = 0;
                cursor.editIndexColumn = 0;
                cursor.END_editIndexLine = 0;
                cursor.END_editIndexColumn = 0;

                EDITOR_lineEndPositionList_PENDING.clear();

                /*
                - Syntax is fully encompassed by the removed text  => remove
                - Syntax's open is encompassed by the removed text => invalidate

                invalidate => remove

                Are these the same thing then?

                If the open is removed then yeah
                strings are possibly more complex than the multi-line-comment because the same open as close

                TODO: If the open is > 1 characters long then an insertions among those characters is a break too.
                */

                break;
            }
    }

    // lineIndex_editOccurredOn is initialized to -1
    //
    // When gap buffer is finalized editor tries to redraw the line in order to lex it again.
    // You need to NOT do this when you are working with multiple cursors however, because it bugs everything out.
    // 
    if (EDITOR_cursorList.length === 1) {
        if (lineIndex_editOccurredOn >= 0 && lineIndex_editOccurredOn < EDITOR_lineEndPositionList.count) {
            if (get_EDITOR_gutter().children.length === get_EDITOR_virtualCount() &&
                get_EDITOR_textElement().children.length === get_EDITOR_virtualCount()) {
                    // TODO: Am I missing this 'lineIndex_editOccurredOn < get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount()' in the 'EDITOR_getIndexLineToHtml_Correctly' function??
                    let relativeIndex = EDITOR_getIndexLineToHtml_Correctly(lineIndex_editOccurredOn);
                    if (relativeIndex >= 0) {
                        let gutterLineElement = get_EDITOR_gutter().children[relativeIndex];
                        gutterLineElement.innerHTML = '';
                        let textLineElement = get_EDITOR_textElement().children[relativeIndex];
                        textLineElement.innerHTML = '';
                        EDITOR_drawLine(lineIndex_editOccurredOn, gutterLineElement, textLineElement);
                    }
                    else {
                        // TODO: Consider what to do in this case.
                    }
            }
            else {
                // TODO: Consider what to do in this case.
            }
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} shiftKey 
 */
function EDITOR_preKeyboardMovementSelectionLogic(cursor, shiftKey) {
    if (shiftKey) {
        if (!cursor.hasSelection()) {
            cursor.selectionAnchor = EDITOR_getPositionIndex(cursor);
            cursor.selectionIndexAnchorLine = cursor.indexLine;
            cursor.selectionIndexAnchorColumn = cursor.indexColumn;
        }
    }
    else {
        if (cursor.hasSelection()) {
            cursor.selectionAnchor = cursor.selectionEnd;
            cursor.selectionIndexAnchorLine = cursor.selectionIndexEndLine;
            cursor.selectionIndexAnchorColumn = cursor.selectionIndexEndColumn;
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} shiftKey 
 */
function EDITOR_postKeyboardMovementSelectionLogic(cursor, shiftKey) {
    if (shiftKey) {
        cursor.selectionEnd = EDITOR_getPositionIndex(cursor);
        cursor.selectionIndexEndLine = cursor.indexLine;
        cursor.selectionIndexEndColumn = cursor.indexColumn;
    }
}

/**
 * More accurate description for this method beyond the name:
 * Duplicate the primaryCursor, then move the primaryCursor ArrowDown.
 */
function EDITOR_createCursorLineBelow(event) {
    let indexLastCursor = EDITOR_cursorList.length - 1;
    let lastCursor = EDITOR_cursorList[indexLastCursor];
    let clone = lastCursor.clone();
    event.shiftKey = false;
    EDITOR_arrowDown(lastCursor, /*shiftKey*/ false);
    EDITOR_cursorList.splice(indexLastCursor, 0, clone);
    get_EDITOR_cursorListElement().appendChild(clone.caretRow);
    EDITOR_drawCursor(clone);
    EDITOR_scrollCursorIntoView(lastCursor);
}

function EDITOR_createCursorAtNextMatchSelection(event) {
    if (!EDITOR_primaryCursor.hasSelection()) {
        return;
    }

    if (get_EDITOR_findOverlay_show() && !get_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching()) {
        EDITOR_findOverlay_showSetter(false);
    }

    if (!get_EDITOR_findOverlay_show()) {
        set_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching(true);
        EDITOR_findOverlay_showSetter(true);
        EDITOR_findOverlay_doSearch();

        let small = EDITOR_primaryCursor.selectionAnchor;
        let large = EDITOR_primaryCursor.selectionEnd;
        if (EDITOR_primaryCursor.selectionAnchor > EDITOR_primaryCursor.selectionEnd) {
            small = EDITOR_primaryCursor.selectionEnd;
            large = EDITOR_primaryCursor.selectionAnchor;
        }
        let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
	    if (!spanCurrent) return;
        let current = parseInt(spanCurrent.innerText, 10);
        if (current) {
            set_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching_originMatchNumber(current);
        }
        else {
            EDITOR_findOverlay_showSetter(false);
            return;
        }
    }

    let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
	if (!spanCurrent) return;
	let spanTotal = document.getElementById('EDITOR_findOverlay_total');
	if (!spanTotal) return;
	let upcomingNumber = parseInt(spanCurrent.innerText, 10);
	let total = parseInt(spanTotal.innerText, 10);
	if (upcomingNumber && total) {
		upcomingNumber++;
		if (upcomingNumber > total || upcomingNumber < 1) {
			upcomingNumber = 1;
		}
        if (get_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching_originMatchNumber() === upcomingNumber) {
            return;
        }
	}
	else {
		spanCurrent.innerText = 'parseInt not successful?';
        return;
	}

    let prePosition = EDITOR_getPositionIndex(EDITOR_primaryCursor);

    // Avoid two cursors on the same line; wasteful double determination of primaryCursor index is occurring in this function; even a single case is likely not good long term.
    let upcomingPositionIndex = EDITOR_findOverlay_searchResultPositionList.data[upcomingNumber - 1];
    if (upcomingPositionIndex) {
        let upcomingLineAndColumnIndices = EDITOR_getLineAndColumnIndices(upcomingPositionIndex);
        let indexOfPrimaryCursor = -1;
        for (let i = 0; i < EDITOR_cursorList.length; i++) {
            if (EDITOR_cursorList[i] === EDITOR_primaryCursor) {
                indexOfPrimaryCursor = i;
                break;
            }
        }
        let isPermitted = true;
        if (upcomingLineAndColumnIndices.indexLine === EDITOR_primaryCursor.indexLine) {
            //isPermitted = false;
        }
        // if u have a pending you need finalize before allow any of this keybind
        // if u have this keybind consecutively but then do ANYTHING else you are not allowed to press this keybind again until you clear all multicursors from the origin of having used this keybind.
        // u cannot keybind this if u have multicursors active but u ARE allowed to consecutively use this keybind to make multiple multi-cursors provided the origin of the multicursors was this event and every multicursor only came from this event and no other keybinds were pressed between.
        // it sounds like u need to track the multicursor origin and then when clearing the multicursors to only be primary u need to clear the origin cause no longer multicursor
        // cause there is too much going on so like I said u need to start by limiting interactions and then expand freedom later
        if (upcomingPositionIndex < prePosition) {
            if (upcomingLineAndColumnIndices.indexLine === EDITOR_cursorList[0].indexLine) {
                //isPermitted = false;
            }
        }

        if (!isPermitted) {
            alert('EDITOR_createCursorAtNextMatchSelection: two cursors would have been on the same line, thus this action was prevented. After closing this alert the previous one or many cursors that you had will remain and you can do a multicursor edit with them, then start a new multicursor edit at this "previously a second occurrence" of your selection on a single line. 1 cursor per line is done for the initial implementation to simplify things, then will be expanded upon after to support more than 1 on same line.');
            return;
        }
    }

    let clone = EDITOR_primaryCursor.clone();
    clone.selectionAnchor = EDITOR_primaryCursor.selectionAnchor;
    clone.selectionEnd = EDITOR_primaryCursor.selectionEnd;

    EDITOR_btnNext_onclick();

    let postPosition = EDITOR_getPositionIndex(EDITOR_primaryCursor);

    if (prePosition != postPosition && postPosition != get_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching_originMatchNumber()) {
        let input = document.getElementById('EDITOR_findOverlay_input_elementId');
        if (!input || !input.value) return;

        let indexOfPrimaryCursor = -1;

        for (let i = 0; i < EDITOR_cursorList.length; i++) {
            if (EDITOR_cursorList[i] === EDITOR_primaryCursor) {
                indexOfPrimaryCursor = i;
                break;
            }
        }

        EDITOR_cursorList.splice(indexOfPrimaryCursor, 0, clone);
        get_EDITOR_cursorListElement().appendChild(clone.caretRow);
        EDITOR_drawCursor(clone);

        EDITOR_primaryCursor.selectionAnchor = postPosition;
        EDITOR_primaryCursor.selectionEnd = postPosition + input.value.length;
        EDITOR_primaryCursor.indexColumn += input.value.length;
        EDITOR_drawCursor(EDITOR_primaryCursor);

        // Move primary cursor to index 0 of cursor list.
        if (postPosition < prePosition) {
            EDITOR_cursorList.splice(indexOfPrimaryCursor + 1, 1);
            EDITOR_cursorList.splice(0, 0, EDITOR_primaryCursor);
        }
    }
    else { // TODO: this is dead code with the pre-check of next match number?
        //EDITOR_primaryCursor.selectionAnchor = clone.selectionAnchor;
        //EDITOR_primaryCursor.selectionEnd = clone.selectionEnd;
        //EDITOR_primaryCursor.indexLine = clone.indexLine;
        //EDITOR_primaryCursor.indexColumn = clone.indexColumn;
        //EDITOR_drawCursor(EDITOR_primaryCursor);
    }
}

function EDITOR_cursorIndex_find_closestLessThanOrEqualToExistingCursorIndex(positionIndex) {
    let left = 0;
    let right = EDITOR_cursorList.length - 1;

    let index = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        let cursorPositionIndex = EDITOR_getPositionIndex(EDITOR_cursorList[mid]);
        
        if (positionIndex <= cursorPositionIndex) {
            index = mid;

            if (positionIndex === cursorPositionIndex) {
                break;
            }
            
            right = mid - 1;
        }
        else if (positionIndex > cursorPositionIndex) {
            left = mid + 1;
        }
        else {
            return; // NaN
        }
    }

    return index;
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} shiftKey 
 */
function EDITOR_arrowDown(cursor, shiftKey) {
    EDITOR_movementBasedCacheInvalidation(cursor);
    EDITOR_preKeyboardMovementSelectionLogic(cursor, shiftKey);
    if (cursor.indexLine < EDITOR_lineEndPositionList.count - 1) {
        cursor.indexLine++;
        let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
        if (cursor.STORED_indexColumn > lastValidIndexColumn) {
            cursor.indexColumn = lastValidIndexColumn;
        }
        else {
            cursor.indexColumn = cursor.STORED_indexColumn;
        }
    }
    EDITOR_postKeyboardMovementSelectionLogic(cursor, shiftKey);
    EDITOR_drawCursor(cursor);
}

/**
 * This function is expected to be used for a variety of scenarios,
 * but the initial use-case is caching the indentation when holding the 'enter' key, so that each consecutive event can know what the indentation was on the previous
 * event and not have to re-calculate it.
 * 
 * Then, the idea is that when the cursor moves you invoke this to invalidate that indentation cache so it gets recalculated.
 * 
 * TODO: I am quite certain that there are cases where this should be invoked but it isn't currently.
 * 
 * TODO: I believe this function to be an unoptimized solution, just that there are more pressing matters to attend to.
 * 
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_movementBasedCacheInvalidation(cursor) {
    if (cursor.editKind === get_EditKind_Enter()) {
        //
        // this only happens once even if you have many cursors because the next cursor that enters this function would be and editKind of None.
        //
        // The main concern is when a user holds down the Enter key, so while this change causes any cursor movement to finalize a pending Enter edit, it won't be nearly as detrimental as if holding down the Enter key were to not be optimized.
        //
        // TODO: Permit more than one Enter key edit event to batch
        // TODO: Cap the amount of enter key edit events that can batch as was done with the insertion.
        // TODO: Having Enter be an insertion, instead of its own EditKind, sounds like the better long term goal but it is believed that this change is trainsitionally helpful in getting to that final best solution.
        //
        EDITOR_finalizeAllCursors();
    }
    cursor.cached_indentation_byteList = null;
    cursor.cached_indentation_string = null;
    set_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching(false);
}

/**
 * @param {*} clipboardContent This is a temporary hack to help in transitioning paste to an edit.
 */
function EDITOR_editEvent(editKind, event, clipboardContent) {
    // check for pending => selection
    // if so then finalize all current pending
    // ...this actually is checking for selection, then presuming at least 1 cursor has a pending...
    let shouldFinalizeAllCursors = false;
    let atLeastOneCursorHasASelection = false;
    for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
        let cursor = EDITOR_cursorList[i];
        if (cursor.hasSelection()) {
            shouldFinalizeAllCursors = true;
            atLeastOneCursorHasASelection = true;
            break;
        }
    }
    if (shouldFinalizeAllCursors) {
        shouldFinalizeAllCursors = false;
        EDITOR_finalizeAllCursors();
    }

    // If you have delete/backspace you need to ONLY remove the selection if it exists not remove selection then delete/backspace
    // but insert needs to remove selection AND insert.
    if (editKind === get_EditKind_InsertLtr() || editKind === get_EditKind_Enter() || editKind === get_EditKind_Paste()) {
        // check for get_editKind_None() => selection
        // if so then attempt to remove selection foreach cursor
        // then finalize all those newly made selection removal edits
        if (atLeastOneCursorHasASelection) {
            shouldFinalizeAllCursors = true;
            for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
                let cursor = EDITOR_cursorList[i];
                if (cursor.hasSelection()) {
                    EDITOR_removeSelection(cursor);
                }
            }
        }
        if (shouldFinalizeAllCursors) {
            shouldFinalizeAllCursors = false;
            EDITOR_finalizeAllCursors();
        }
    }

    // check for NOTcanBatch... I don't want the switch in the for loop... if you have a selection then you have a not can batch?
    switch (editKind) {
        case get_EditKind_InsertLtr():
            for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
                let cursor = EDITOR_cursorList[i];
                if (EDITOR_NOTcanBatch_insert(cursor, i)) {
                    shouldFinalizeAllCursors = true;
                    break;
                }
            }
            break;
        case get_EditKind_DeleteLtr():
            for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
                let cursor = EDITOR_cursorList[i];
                if (EDITOR_NOTcanBatch_delete(cursor)) {
                    shouldFinalizeAllCursors = true;
                    break;
                }
            }
            break;
        case get_EditKind_BackspaceRtl():
            for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
                let cursor = EDITOR_cursorList[i];
                if (EDITOR_NOTcanBatch_backspace(cursor)) {
                    shouldFinalizeAllCursors = true;
                    break;
                }
            }
            break;
        case get_EditKind_Tab():
            shouldFinalizeAllCursors = true;
            break;
        case get_EditKind_IndentMore():
            shouldFinalizeAllCursors = true;
            break;
        case get_EditKind_IndentLess():
            shouldFinalizeAllCursors = true;
            break;
        case get_EditKind_Enter():
            shouldFinalizeAllCursors = true;
            break;
        case get_EditKind_Paste():
            shouldFinalizeAllCursors = true;
            break;
        case get_EditKind_Duplicate():
            shouldFinalizeAllCursors = true;
            break;
        default:
            throw new Error(`The EditKind:${editKind} was not recognized.`);
            break;
    }
    if (shouldFinalizeAllCursors) {
        shouldFinalizeAllCursors = false;
        EDITOR_finalizeAllCursors();
    }

    // start/continue edit... I don't want the switch in the for loop
    switch (editKind) {
        case get_EditKind_InsertLtr():
            for (var i = 0; i < EDITOR_cursorList.length; i++) {
                let cursor = EDITOR_cursorList[i];
                set_EDITOR_indexCursor(i);
                EDITOR_movementBasedCacheInvalidation(cursor);
                if (get_EDITOR_offsetColumn_withRespectToThisIndexLine() !== cursor.indexLine) {
                    set_EDITOR_offsetColumn_withRespectToThisIndexLine(cursor.indexLine);
                    set_EDITOR_offsetColumn(0);
                }
                // You can do this because the function 'EDITOR_NOTcanBatch_insert' was already checked for all the cursors, if it is possible to batch, the editKind will stay InsertLtr otherwise it is finalized and set to None.
                // TODO: Use if === get_EditKind_None() for copy and paste safety / it might just even be more readable
                if (cursor.editKind !== get_EditKind_InsertLtr()) {
                    EDITOR_startEdit(cursor, get_EditKind_InsertLtr(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                }
                EDITOR_insertDo(cursor, event.key);
                cursor.STORED_indexColumn = cursor.indexColumn;
                EDITOR_drawCursor(cursor);
                set_EDITOR_offsetColumn(get_EDITOR_offsetColumn() + cursor.editLength);
                set_EDITOR_totalShift(get_EDITOR_totalShift() + cursor.editLength); // this isn't needed here, but it is needed elsewhere so in order to create a pattern it was included here... TODO: maybe get rid of this or...?
            }
            break;
        case get_EditKind_DeleteLtr():
            for (var i = 0; i < EDITOR_cursorList.length; i++) {
                let cursor = EDITOR_cursorList[i];
                set_EDITOR_indexCursor(i);
                EDITOR_movementBasedCacheInvalidation(cursor);
                if (get_EDITOR_offsetColumn_withRespectToThisIndexLine() !== cursor.indexLine) {
                    set_EDITOR_offsetColumn_withRespectToThisIndexLine(cursor.indexLine);
                    set_EDITOR_offsetColumn(0);
                }
                if (cursor.hasSelection()) {
                    EDITOR_removeSelection(cursor);
                }
                else {
                    if (cursor.editKind !== get_EditKind_DeleteLtr()) {
                        EDITOR_startEdit(cursor, get_EditKind_DeleteLtr(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                    }
                    EDITOR_deleteDo(cursor, event);
                }
                EDITOR_drawCursor(cursor);
                set_EDITOR_offsetColumn(get_EDITOR_offsetColumn() - cursor.editLength);
                set_EDITOR_totalShift(get_EDITOR_totalShift() - cursor.editLength); // this isn't needed here, but it is needed elsewhere so in order to create a pattern it was included here... TODO: maybe get rid of this or...?
            }
            break;
        case get_EditKind_BackspaceRtl():
            for (var i = 0; i < EDITOR_cursorList.length; i++) {
                let cursor = EDITOR_cursorList[i];
                set_EDITOR_indexCursor(i);
                EDITOR_movementBasedCacheInvalidation(cursor);
                if (get_EDITOR_offsetColumn_withRespectToThisIndexLine() !== cursor.indexLine) {
                    set_EDITOR_offsetColumn_withRespectToThisIndexLine(cursor.indexLine);
                    set_EDITOR_offsetColumn(0);
                }
                if (cursor.hasSelection()) {
                    EDITOR_removeSelection(cursor);
                }
                else {
                    if (cursor.editKind !== get_EditKind_BackspaceRtl()) {
                        EDITOR_startEdit(cursor, get_EditKind_BackspaceRtl(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                    }
                    EDITOR_backspaceDo(cursor, event);
                    cursor.STORED_indexColumn = cursor.indexColumn;
                }
                EDITOR_drawCursor(cursor);
                set_EDITOR_offsetColumn(get_EDITOR_offsetColumn() - cursor.editLength);
                set_EDITOR_totalShift(get_EDITOR_totalShift() - cursor.editLength); // this isn't needed here, but it is needed elsewhere so in order to create a pattern it was included here... TODO: maybe get rid of this or...?
            }
            break;
        case get_EditKind_Tab():
            for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
                let cursor = EDITOR_cursorList[i];
                EDITOR_movementBasedCacheInvalidation(cursor);
                if (cursor.hasSelection()) {
                    if (event.shiftKey) {
                        if (cursor.editKind !== get_EditKind_IndentLess()) {
                            EDITOR_startEdit(cursor, get_EditKind_IndentLess(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                        }
                        EDITOR_indentLess(cursor);
                    }
                    else {
                        if (cursor.editKind !== get_EditKind_IndentMore()) {
                            EDITOR_startEdit(cursor, get_EditKind_IndentMore(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                        }
                        EDITOR_indentMore(cursor);
                    }
                }
                else {
                    if (event.shiftKey) {
                    	// TODO: This code has a bug and doesn't work with multicursor... EDITOR_onMouseDownDetailRankThree needs to accept a cursor rather than acting on EDITOR_primaryCursor...
                    	// ...multi-cursor in and of itself is buggy that's why I'm not overly concerned with adding this in a bugged state...
                    	// ...everything is buggy and it is very anxiety inducing and for the time being I guess it just has to be that way as I transition
                    	// towards a useable editor all the features are coming together but there's this awkward phase of "I can start using it but also not really" or something I just idk.
                    	EDITOR_onMouseDownDetailRankThree({shiftKey:false}, cursor.indexLine, cursor.indexColumn);
                        if (cursor.editKind !== get_EditKind_IndentLess()) {
                            EDITOR_startEdit(cursor, get_EditKind_IndentLess(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                        }
                        EDITOR_indentLess(cursor);
                    }
                    else {
                        if (cursor.editKind !== get_EditKind_Tab()) {
                            EDITOR_startEdit(cursor, get_EditKind_Tab(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                        }
                        EDITOR_tabKey(cursor);
                    }
                }
                EDITOR_drawCursor(cursor);
            }
            break;
        case get_EditKind_Enter():
            for (var i = 0; i < EDITOR_cursorList.length; i++) {
                let cursor = EDITOR_cursorList[i];
                if (cursor.editKind !== get_EditKind_Enter()) {
                    EDITOR_startEdit(cursor, get_EditKind_Enter(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                }
                EDITOR_EnterKey(cursor, event.ctrlKey, event.shiftKey);
                cursor.STORED_indexColumn = cursor.indexColumn;
                EDITOR_drawCursor(cursor);
                set_EDITOR_offsetLine(get_EDITOR_offsetLine() + 1);
            }
            break;
        case get_EditKind_Paste():
            for (var i = 0; i < EDITOR_cursorList.length; i++) {
                let cursor = EDITOR_cursorList[i];
                if (cursor.editKind !== get_EditKind_Enter()) {
                    EDITOR_startEdit(cursor, get_EditKind_Paste(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                }
                EDITOR_paste(cursor, clipboardContent);
                cursor.STORED_indexColumn = cursor.indexColumn;
                EDITOR_drawCursor(cursor);
            }
            break;
        case get_EditKind_Duplicate():
            for (var i = 0; i < EDITOR_cursorList.length; i++) {
                let cursor = EDITOR_cursorList[i];
                if (cursor.editKind !== get_EditKind_Duplicate()) {
                    EDITOR_startEdit(cursor, get_EditKind_Duplicate(), EDITOR_getPositionIndex_raw(cursor), /*editLength*/ 0);
                }
                EDITOR_duplicateSelection(cursor);
                cursor.STORED_indexColumn = cursor.indexColumn;
                EDITOR_drawCursor(cursor);
            }
            break;
        default:
            throw new Error(`The EditKind:${editKind} was not recognized.`);
            break;
    }
}

function EDITOR_registerHandlers() {
    EDITOR_baseElement.addEventListener('keydown', async event => {
        // Explicitly inlining 'clearMulticursorState()' because it currently is and I just don't want to make a decision about this right now.
        // So what I can do is mark the code paragraph for later decision making.
        set_EDITOR_indexCursor(0);
        set_EDITOR_offsetLine(0);
        set_EDITOR_offsetColumn_withRespectToThisIndexLine(0);
        set_EDITOR_offsetColumn(0);
        set_EDITOR_totalShift(0);
        EDITOR_offsetWithinSpan_withRespectToThisSpan = null;
        set_EDITOR_offsetWithinSpan(0);

        switch (event.key) {
            case 'ArrowLeft':
            {
                event.preventDefault();
                
                for (var i = 0; i < EDITOR_cursorList.length; i++) {
                    let cursor = EDITOR_cursorList[i];
                    set_EDITOR_indexCursor(i);
                    EDITOR_movementBasedCacheInvalidation(cursor);
                    if (get_EDITOR_offsetColumn_withRespectToThisIndexLine() !== cursor.indexLine) {
                        set_EDITOR_offsetColumn_withRespectToThisIndexLine(cursor.indexLine);
                        set_EDITOR_offsetColumn(0);
                    }

                    if (cursor.hasSelection() && !event.shiftKey) {
                        let small;
                        if (cursor.selectionAnchor < cursor.selectionEnd) {
                            small = cursor.selectionAnchor;
                        }
                        else {
                            small = cursor.selectionEnd;
                        }
                        let lineAndColumnIndices = EDITOR_getLineAndColumnIndices(small);
                        cursor.indexLine = lineAndColumnIndices.indexLine;
                        cursor.indexColumn = lineAndColumnIndices.indexColumn;
                        cursor.selectionAnchor = cursor.selectionEnd;
                        cursor.selectionIndexAnchorLine = cursor.selectionIndexEndLine;
                        cursor.selectionIndexAnchorColumn = cursor.selectionIndexEndColumn;
                    }
                    else {
                        EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                        if (event.ctrlKey & cursor.indexColumn > 0) {
                            let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
                            let indexPosition = line.start + cursor.indexColumn;
                            let originalCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, indexPosition);
                            cursor.indexColumn--;
                            indexPosition--;
    
                            while (cursor.indexColumn > 0) {
                                if (EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, indexPosition) === originalCharacterKind) {
                                    cursor.indexColumn--;
                                    indexPosition--;
                                }
                                else {
                                    break;
                                }
                            }
                        }
                        else {
                            if (cursor.indexColumn > 0) {
                                cursor.indexColumn--;
                            }
                            else if (cursor.indexLine > 0) {
                                cursor.indexLine--;
                                cursor.indexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
                            }
                        }
                        EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                    }
                    cursor.STORED_indexColumn = cursor.indexColumn;
                    EDITOR_drawCursor(cursor);
                    set_EDITOR_offsetColumn(get_EDITOR_offsetColumn() + cursor.editLength);
                    set_EDITOR_totalShift(get_EDITOR_totalShift() + cursor.editLength);
                }
                break;
            }
            case 'ArrowDown':
            {
                event.preventDefault();
                if (event.ctrlKey) {
                    EDITOR_baseElement.scrollBy(0, get_EDITOR_lineHeight());
                }
                else if (event.altKey) {
                    if (event.shiftKey) {
                        EDITOR_createCursorLineBelow(event);
                    }
                }
                else {
                    let lastCursor = EDITOR_cursorList[EDITOR_cursorList.length - 1];
                    if (lastCursor.indexLine === EDITOR_lineEndPositionList.count - 1) {
                        if (EDITOR_cursorList.length - 1 > 0 && EDITOR_cursorList[EDITOR_cursorList.length - 2].indexLine === lastCursor.indexLine - 1) {
                            alert("ArrowDown: this would cause two cursors to exist on the same line, for the initial simpler implementation two cursors being on the same line is not permitted.");
                            return;
                        }
                    }
                    for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
                        EDITOR_arrowDown(EDITOR_cursorList[i], /*shiftKey*/ event.shiftKey);
                    }
                }
                break;
            }
            case 'ArrowUp':
            {
                event.preventDefault();
                if (event.ctrlKey) {
                    EDITOR_baseElement.scrollBy(0, -1 * get_EDITOR_lineHeight());
                }
                else {
                    let firstCursor = EDITOR_cursorList[0];
                    if (firstCursor.indexLine === 0) {
                        if (EDITOR_cursorList.length - 1 > 0 && EDITOR_cursorList[1].indexLine === firstCursor.indexLine + 1) {
                            alert("ArrowUp: this would cause two cursors to exist on the same line, for the initial simpler implementation two cursors being on the same line is not permitted.");
                            return;
                        }
                    }
                    for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
                        let cursor = EDITOR_cursorList[i];
                        EDITOR_movementBasedCacheInvalidation(cursor);
                        EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                        if (cursor.indexLine > 0) {
                            cursor.indexLine--;
                            let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
                            if (cursor.STORED_indexColumn > lastValidIndexColumn) {
                                cursor.indexColumn = lastValidIndexColumn;
                            }
                            else {
                                cursor.indexColumn = cursor.STORED_indexColumn;
                            }
                        }
                        EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                        EDITOR_drawCursor(cursor);
                    }
                }
                break;
            }
            case 'ArrowRight':
            {
                event.preventDefault();

                for (var i = 0; i < EDITOR_cursorList.length; i++) {
                    let cursor = EDITOR_cursorList[i];
                    set_EDITOR_indexCursor(i);
                    EDITOR_movementBasedCacheInvalidation(cursor);
                    if (get_EDITOR_offsetColumn_withRespectToThisIndexLine() !== cursor.indexLine) {
                        set_EDITOR_offsetColumn_withRespectToThisIndexLine(cursor.indexLine);
                        set_EDITOR_offsetColumn(0);
                    }

                    if (cursor.hasSelection() && !event.shiftKey) {
                        let large;
                        if (cursor.selectionAnchor < cursor.selectionEnd) {
                            large = cursor.selectionEnd;
                        }
                        else {
                            large = cursor.selectionAnchor;
                        }
                        let lineAndColumnIndices = EDITOR_getLineAndColumnIndices(large);
                        cursor.indexLine = lineAndColumnIndices.indexLine;
                        cursor.indexColumn = lineAndColumnIndices.indexColumn;
                        cursor.selectionAnchor = cursor.selectionEnd;
                        cursor.selectionIndexAnchorLine = cursor.selectionIndexEndLine;
                        cursor.selectionIndexAnchorColumn = cursor.selectionIndexEndColumn;
                    }
                    else {
                        EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                        let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
                        if (event.ctrlKey & cursor.indexColumn < lastValidIndexColumn) {
                            let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);
                            let indexPosition = line.start + cursor.indexColumn;
                            let originalCharacterKind = EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, indexPosition, line.end);
                            cursor.indexColumn++;
                            indexPosition++;
        
                            while (cursor.indexColumn < lastValidIndexColumn) {
                                if (EDITOR_getCharacterCurrent_KIND(cursor.indexColumn, indexPosition, line.end) === originalCharacterKind) {
                                    cursor.indexColumn++;
                                    indexPosition++;
                                }
                                else {
                                    break;
                                }
                            }
                        }
                        else {
                            if (cursor.indexColumn < lastValidIndexColumn) {
                                cursor.indexColumn++;
                            }
                            else if (cursor.indexLine < EDITOR_lineEndPositionList.count - 1) {
                                cursor.indexColumn = 0;
                                cursor.indexLine++;
                            }
                        }
                        EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                    }
                    cursor.STORED_indexColumn = cursor.indexColumn;
                    EDITOR_drawCursor(cursor);
                    set_EDITOR_offsetColumn(get_EDITOR_offsetColumn() + cursor.editLength);
                    set_EDITOR_totalShift(get_EDITOR_totalShift() + cursor.editLength);
                }
                break;
            }
            case 'Home':
            {
                event.preventDefault();
                if (event.ctrlKey && EDITOR_cursorList.length > 1) {
                    alert("Home: this would cause two cursors to exist on the same line, for the initial simpler implementation two cursors being on the same line is not permitted.");
                    return;
                }
                for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
                    let cursor = EDITOR_cursorList[i];
                    EDITOR_movementBasedCacheInvalidation(cursor);
                    EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                    if (event.ctrlKey) {
                        cursor.indexLine = 0;
                        cursor.indexColumn = 0;
                    }
                    else {
                        let endExclusiveIndentationIndexColumn = EDITOR_findEndExclusiveIndentationIndexColumn(cursor);
                        if (cursor.indexColumn == endExclusiveIndentationIndexColumn) {
                            cursor.indexColumn = 0;
                        }
                        else {
                            cursor.indexColumn = endExclusiveIndentationIndexColumn;
                        }
                    }
                    EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                    cursor.STORED_indexColumn = cursor.indexColumn;
                    EDITOR_drawCursor(cursor);
                }
                break;
            }
            case 'End':
            {
                event.preventDefault();
                if (event.ctrlKey && EDITOR_cursorList.length > 1) {
                    alert("End: this would cause two cursors to exist on the same line, for the initial simpler implementation two cursors being on the same line is not permitted.");
                    return;
                }
                for (var i = EDITOR_cursorList.length - 1; i >= 0; i--) {
                    let cursor = EDITOR_cursorList[i];
                    EDITOR_movementBasedCacheInvalidation(cursor);
                    EDITOR_preKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                    if (event.ctrlKey) {
                        cursor.indexLine = EDITOR_lineEndPositionList.count - 1;
                    }
                    cursor.indexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
                    EDITOR_postKeyboardMovementSelectionLogic(cursor, event.shiftKey);
                    cursor.STORED_indexColumn = cursor.indexColumn;
                    EDITOR_drawCursor(cursor);
                }
                break;
            }
            case 'PageDown':
            {
                if (event.ctrlKey) {
                    // This doesn't seem to make a difference for me but I feel like I should have this line regardless...
                    // ...in case someone's computer for some reason would end up having default behavior even though mine seems to not.
                    event.preventDefault();
                    EDITOR_primaryCursor.indexLine = get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount();
                    if (get_EDITOR_virtualCount() > 1) {
                        // this seems to more commonly have the cursor staying within the viewport rather than overlapping outside.
                        EDITOR_primaryCursor.indexLine--;
                    }
                    if (EDITOR_primaryCursor.indexLine >= EDITOR_lineEndPositionList.count) {
                        // TODO: You can't delete EOF can you? i.e.: cursor final position of file then delete?
                        EDITOR_primaryCursor.indexLine = EDITOR_lineEndPositionList.count - 1;
                    }
                    EDITOR_primaryCursor.indexColumn = 0;
                    // TODO: allow someone to select via this keybind, but for now it causes a bad selection if you { 'Ctrl' + 'a' } then use it so I'm clearing any active selection here for now.
                    EDITOR_primaryCursor.selectionAnchor = EDITOR_primaryCursor.selectionEnd;
                    EDITOR_drawCursor(EDITOR_primaryCursor);
                }
                break;
            }
			case 'PageUp':
            {
                if (event.ctrlKey) {
                    // This doesn't seem to make a difference for me but I feel like I should have this line regardless...
                    // ...in case someone's computer for some reason would end up having default behavior even though mine seems to not.
                    event.preventDefault();
                    EDITOR_primaryCursor.indexLine = get_EDITOR_virtualLineIndex();
                    if (get_EDITOR_virtualCount() > 1) {
                        // this seems to more commonly have the cursor staying within the viewport rather than overlapping outside.
                        EDITOR_primaryCursor.indexLine++;
                    }
                    if (EDITOR_primaryCursor.indexLine >= EDITOR_lineEndPositionList.count) {
                        // TODO: You can't delete EOF can you? i.e.: cursor final position of file then delete?
                        EDITOR_primaryCursor.indexLine = EDITOR_lineEndPositionList.count - 1;
                    }
                    EDITOR_primaryCursor.indexColumn = 0;
                    // TODO: allow someone to select via this keybind, but for now it causes a bad selection if you { 'Ctrl' + 'a' } then use it so I'm clearing any active selection here for now.
                    EDITOR_primaryCursor.selectionAnchor = EDITOR_primaryCursor.selectionEnd;
                    EDITOR_drawCursor(EDITOR_primaryCursor);
                }
                break;
            }
            case 'Delete':
            {
                EDITOR_editEvent(get_EditKind_DeleteLtr(), event);
                break;
            }
            case 'Backspace':
            {
                EDITOR_editEvent(get_EditKind_BackspaceRtl(), event);
                break;
            }
            case 'Escape':
            {
                EDITOR_finalizeAllCursors_andClearNonPrimaryCursors();
                break;
            }
            case ' ':
            {
                event.preventDefault();
                // len is 1 of this case, pattern doesn't match on purpose
                break;
            }
            case 'Tab':
            {
                event.preventDefault();
                EDITOR_editEvent(get_EditKind_Tab(), event);
                break;
            }
            case 'Enter':
            {
                // Enter key relies on cached data that would be cleared, pattern doesn't match on purpose
                EDITOR_editEvent(get_EditKind_Enter(), event);
                break;
            }
            case 'F12':
            {
                //await window.myAPI.editorDocumentSymbolsRequest();
                break;
            }
        }

        // TODO: Checking for a length of 1 is probably wrong but it'll let me start writing some code
        if (event.key.length === 1) {
            if (event.ctrlKey) {
                EDITOR_movementBasedCacheInvalidation(EDITOR_primaryCursor);
                switch (event.key) {
                    case 'c':
                        EDITOR_finalizeAllCursors();
                        await EDITOR_copySelection(EDITOR_primaryCursor);
                        break;
                    case 'x':
                        EDITOR_finalizeAllCursors();
                        await EDITOR_copySelection(EDITOR_primaryCursor);
                        EDITOR_removeSelection(EDITOR_primaryCursor); // TODO: Multicursor bad
                        EDITOR_drawCursor(EDITOR_primaryCursor);
                        break;
                    case 'v':
                        let clipboard = await window.myAPI.readClipboard();
                        EDITOR_editEvent(get_EditKind_Paste(), event, clipboard);
                        break;
                    case 'd':
                        EDITOR_editEvent(get_EditKind_Duplicate(), event);
                        break;
                    case 'a':
                        event.preventDefault();
                        EDITOR_finalizeAllCursors(); // TODO: Multicursor bad
                        EDITOR_primaryCursor.selectionAnchor = 0;
                        EDITOR_primaryCursor.selectionEnd = EDITOR_textByteList.count;
                        let selectionEndLineAndColumnIndices = EDITOR_getLineAndColumnIndices(EDITOR_primaryCursor.selectionEnd);
                        EDITOR_primaryCursor.indexLine = selectionEndLineAndColumnIndices.indexLine;
                        EDITOR_primaryCursor.indexColumn = selectionEndLineAndColumnIndices.indexColumn;
                        EDITOR_drawCursor(EDITOR_primaryCursor, /*NOTscrollCursorIntoView*/ true);
                        break;
                    case 'f':
                        EDITOR_findOverlay_showSetter(!get_EDITOR_findOverlay_show());
                        break;
                    case 'z':
                        //alert('undo');
                        break;
                    case 'y':
                        //alert('redo');
                        break;
                }
            }
            else if (event.altKey) {
            	switch (event.key) {
                    case '>':
                        if (event.shiftKey) {
                            let local_findOverlay_isBeingShownDueToMultiCursorMatching = get_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching();
                            EDITOR_movementBasedCacheInvalidation(EDITOR_primaryCursor);
                            set_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching(local_findOverlay_isBeingShownDueToMultiCursorMatching);
                            EDITOR_createCursorAtNextMatchSelection(event);
                        }
                        break;
                }
            }
            else {
                EDITOR_editEvent(get_EditKind_InsertLtr(), event);
            }

            return;
        }
    });

    EDITOR_baseElement.addEventListener('mousedown', event => {
        EDITOR_movementBasedCacheInvalidation(EDITOR_primaryCursor);
        
        if (EDITOR_cursorList.length > 1) {
            EDITOR_finalizeAllCursors_andClearNonPrimaryCursors();
        }
        
        // TODO: You might want to do this inside 'EDITOR_finalizeAllCursors_andClearNonPrimaryCursors();' at the end... I'm not sure.
        set_EDITOR_indexCursor(0);
        set_EDITOR_offsetColumn(0);
        set_EDITOR_offsetLine(0);

        if (get_EDITOR_recentBoundingClientRect_isNull_intFalsey()) {
            let boundingClientRect = EDITOR_baseElement.getBoundingClientRect();
            set_EDITOR_recentBoundingClientRect_left(boundingClientRect.left);
            set_EDITOR_recentBoundingClientRect_top(boundingClientRect.top);
            set_EDITOR_recentBoundingClientRect_isNull_intFalsey(0);
        }

        if (event.button === 0) {
            set_EDITOR_isSourceOfLeftMouseButton(true);
            EDITOR_onMouseMove_timer = null;
        }

        let rY = event.clientY - get_EDITOR_recentBoundingClientRect_top() + EDITOR_baseElement.scrollTop;
        let rX = event.clientX - get_EDITOR_recentBoundingClientRect_left() - get_EDITOR_gutterWidthTotal() + EDITOR_baseElement.scrollLeft;
        
        let indexLine = Math.floor(rY / get_EDITOR_lineHeight());
        let indexColumn = Math.round(rX / EDITOR_characterWidth);

        if (indexLine < 0) {
            indexLine = 0;
        }

        if (indexColumn < 0) {
            indexColumn = 0;
        }

        if (indexLine >= EDITOR_lineEndPositionList.count) {
            indexLine = EDITOR_lineEndPositionList.count - 1;
        }

        let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(indexLine);
        if (indexColumn > lastValidIndexColumn) {
            indexColumn = lastValidIndexColumn;
        }

        if (rX < -1 * EDITOR_gutterPaddingRight) {
            set_EDITOR_detailRank(3);
            EDITOR_onMouseDownDetailRankThree(event, indexLine, indexColumn);
            return;
        }

        if (event.detail % 3 === 0) {
            set_EDITOR_detailRank(3);
            EDITOR_onMouseDownDetailRankThree(event, indexLine, indexColumn);
        }
        else if (event.detail % 2 === 0) {
            set_EDITOR_detailRank(2);
            EDITOR_onMouseDownDetailRankTwo(event, indexLine, indexColumn);
        }
        else {
            set_EDITOR_detailRank(1);
            EDITOR_onMouseDownDetailRankOne(event, indexLine, indexColumn);
        }
    });

    EDITOR_baseElement.addEventListener('mousemove', EDITOR_onMouseMove_WRAPIT.bind(this));

    EDITOR_baseElement.addEventListener('scroll', EDITOR_onScroll_WRAPIT.bind(this));

    EDITOR_baseElement.addEventListener('wheel', event => {
        if (event.shiftKey) {
            EDITOR_baseElement.scrollBy(event.deltaY, 0);
            get_EDITOR_horizontal_scrollbar().scrollLeft = EDITOR_baseElement.scrollLeft;
        }
    });

    EDITOR_baseElement.addEventListener('contextmenu', async event => {
        let optionList = [
            new MenuOption(CommandKind.Cut, 'Cut', null),
            new MenuOption(CommandKind.Copy, 'Copy', null),
            new MenuOption(CommandKind.Paste, 'Paste', null),
            new MenuOption(CommandKind.Find, 'Find', null),
        ];

        let menuLeft = get_EDITOR_recentBoundingClientRect_left() + get_EDITOR_gutterWidthTotal() + EDITOR_primaryCursor.cursorLeftValue - EDITOR_baseElement.scrollLeft;
        let menuTop = get_EDITOR_recentBoundingClientRect_top() + EDITOR_primaryCursor.cursorTopValue + get_EDITOR_lineHeight() - EDITOR_baseElement.scrollTop;

        if (event.button === 2) {
            menuSet('EDITOR', null, optionList, menuLeft, menuTop);
        } else {
            menuSet('EDITOR', null, optionList, menuLeft, menuTop);
        }
    });

    window.addEventListener('resize', EDITOR_onResize_WRAPIT.bind(this));

    get_EDITOR_horizontal_scrollbar().addEventListener('scroll', () => {
        EDITOR_baseElement.scrollLeft = get_EDITOR_horizontal_scrollbar().scrollLeft;
    });
}

function EDITOR_findOverlay_doSearch() {
	let input = document.getElementById('EDITOR_findOverlay_input_elementId');
    if (!input || !input.value) return;
    
    let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
	if (!spanCurrent) return;
	
	let spanTotal = document.getElementById('EDITOR_findOverlay_total');
	if (!spanTotal) return;
    
    set_EDITOR_findOverlay_wasSearched(true);

    let searchEncoded = EDITOR_encoder.encode(input.value);

    EDITOR_finalizeAllCursors();

    EDITOR_findOverlay_searchResultPositionList.clear();

    let offset = 0;
    let posStartOfMatch = 0;

    /** Given the current EDITOR_primaryCursor position, which match comes next. */
    let nextMatchNumber = -1;
    let nextMatchPos;

    if (EDITOR_primaryCursor.hasSelection()) {
        let small = EDITOR_primaryCursor.selectionAnchor;
        let large = EDITOR_primaryCursor.selectionEnd;
        if (EDITOR_primaryCursor.selectionAnchor > EDITOR_primaryCursor.selectionEnd) {
            small = EDITOR_primaryCursor.selectionEnd;
            large = EDITOR_primaryCursor.selectionAnchor;
        }
        nextMatchPos = small;
    }
    else {
        nextMatchPos = EDITOR_getPositionIndex(EDITOR_primaryCursor);
    }
    
    if (get_EDITOR_findOverlay_options_matchWord() && ((searchEncoded[0] >= 97 && searchEncoded[0] <= 122) || (searchEncoded[0] >= 65 && searchEncoded[0] <= 90) || (searchEncoded[0] >= 48 && searchEncoded[0] <= 57) || (searchEncoded[0] === 95))) {
		for (let i = 0; i < EDITOR_textByteList.count; i++) {
			if ((EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122) || (EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90) || (EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57) || (EDITOR_textByteList.bytes[i] === 95)) {
				if (EDITOR_textByteList.bytes[i] === searchEncoded[0]) {
    				while (i < EDITOR_textByteList.count) { // context switch to checking match
    					if (EDITOR_textByteList.bytes[i] === searchEncoded[offset]) {
				            if (offset === 0) {
				                posStartOfMatch = i;
				            }
				            offset++;
				            if (offset === searchEncoded.length) { // found "possible match"
				            	if (i + 1 >= EDITOR_textByteList.count ||
				            		!((EDITOR_textByteList.bytes[i + 1] >= 97 && EDITOR_textByteList.bytes[i + 1] <= 122) || (EDITOR_textByteList.bytes[i + 1] >= 65 && EDITOR_textByteList.bytes[i + 1] <= 90) || (EDITOR_textByteList.bytes[i + 1] >= 48 && EDITOR_textByteList.bytes[i + 1] <= 57) || (EDITOR_textByteList.bytes[i + 1] === 95))) { // ends on a word, therefore take match
					            		EDITOR_findOverlay_searchResultPositionList.insert(EDITOR_findOverlay_searchResultPositionList.count, posStartOfMatch);
                                        if (nextMatchNumber === -1 && posStartOfMatch >= nextMatchPos) {
                                            nextMatchNumber = EDITOR_findOverlay_searchResultPositionList.count;
                                            nextMatchPos = posStartOfMatch;
                                        }
				                		offset = 0;
				                		break;
				            	}
				            	else { // does NOT end on a word, therefore ignore match
				            		offset = 0;
				            		while (i < EDITOR_textByteList.count) { // move pos to next NON(letterOrDigit) or EOF
				            			if (!((EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122) || (EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90) || (EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57) || (EDITOR_textByteList.bytes[i] === 95))) {
				            				i--; // backtrack by one due to outer for loop's incrementation step
				            				break;
				            			}
			            				i++;
				            		}
				                	break;
				            	}
				            }
				            i++;
				        }
				        else {
				            offset = 0;
				            while (i < EDITOR_textByteList.count) { // move pos to next NON(letterOrDigit) or EOF
		            			if (!((EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122) || (EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90) || (EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57) || (EDITOR_textByteList.bytes[i] === 95))) {
		            				i--; // backtrack by one due to outer for loop's incrementation step
		            				break;
		            			}
	            				i++;
		            		}
				            break;
				        }
					}
				}
				else {
					while (i < EDITOR_textByteList.count) { // move pos to next NON(letterOrDigit) or EOF
            			if (!((EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122) || (EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90) || (EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57) || (EDITOR_textByteList.bytes[i] === 95))) {
            				i--; // backtrack by one due to outer for loop's incrementation step
            				break;
            			}
        				i++;
            		}
				}
			}
			else {
				while (i < EDITOR_textByteList.count) { // move pos to next letterOrDigit or EOF
        			if ((EDITOR_textByteList.bytes[i] >= 97 && EDITOR_textByteList.bytes[i] <= 122) || (EDITOR_textByteList.bytes[i] >= 65 && EDITOR_textByteList.bytes[i] <= 90) || (EDITOR_textByteList.bytes[i] >= 48 && EDITOR_textByteList.bytes[i] <= 57) || (EDITOR_textByteList.bytes[i] === 95)) {
        				i--; // backtrack by one due to outer for loop's incrementation step
        				break;
        			}
    				i++;
        		}
			}
	    }
    }
    else {
    	for (let i = 0; i < EDITOR_textByteList.count; i++) {
	        if (EDITOR_textByteList.bytes[i] === searchEncoded[offset]) {
	            if (offset === 0) {
	                posStartOfMatch = i;
	            }
	            offset++;
	            if (offset === searchEncoded.length) {
	                EDITOR_findOverlay_searchResultPositionList.insert(EDITOR_findOverlay_searchResultPositionList.count, posStartOfMatch);
                    if (nextMatchNumber === -1 && posStartOfMatch >= nextMatchPos) {
                        nextMatchNumber = EDITOR_findOverlay_searchResultPositionList.count;
                        nextMatchPos = posStartOfMatch;
                    }
	                offset = 0;
	            }
	        }
	        else {
	            // I'm not sure how I like this. It feels wasteful to set this to 0.
	            // But if I check to see if it is 0, that feels even more wasteful.
	            offset = 0;
	        }
	    }
    }

    if (nextMatchNumber === -1) {
        nextMatchNumber = 1;
    }
    spanCurrent.innerText = nextMatchNumber;
    spanTotal.innerText = EDITOR_findOverlay_searchResultPositionList.count;
}

function EDITOR_findOverlay_input_onkeydown(event) {
    switch (event.key) {
        case 'Enter':
            EDITOR_findOverlay_doSearch();
            break;
        case 'Escape':
        	set_EDITOR_findOverlay_wasSearched(false);
            EDITOR_findOverlay_showSetter(false);
            EDITOR_baseElement.focus();
            break;
    }
}

function EDITOR_findOverlay_input_onblur() {
	if (!get_EDITOR_findOverlay_wasSearched()) {
		EDITOR_findOverlay_doSearch();
	}
}

function EDITOR_findOverlay_input_onchange() {
	set_EDITOR_findOverlay_wasSearched(false);
}

function EDITOR_findOverlay_checkboxMatchWord_onchange() {
	// for an onchange event, event.target might always be precise?
	let checkboxMatchWord = document.getElementById('EDITOR_findOverlay_checkboxMatchWord');
    if (checkboxMatchWord) {
    	set_EDITOR_findOverlay_options_matchWord(checkboxMatchWord.checked);
    	EDITOR_findOverlay_doSearch();
    }
}

function EDITOR_findOverlay_showSetter(showValue) {
    EDITOR_finalizeAllCursors();

    if (!get_EDITOR_findOverlay_show() && showValue) {
        EDITOR_findOverlay.style.visibility = '';
        EDITOR_findOverlay_searchResultPositionList = new UInt32List(256);
        
        let input = document.createElement('input');
        input.id = 'EDITOR_findOverlay_input_elementId';
        // 'change' needs to be the first event added so the 'Enter' keydown happens with proper timing
        input.addEventListener('change', EDITOR_findOverlay_input_onchange);
        input.addEventListener('keydown', EDITOR_findOverlay_input_onkeydown);
        input.addEventListener('blur', EDITOR_findOverlay_input_onblur);
        EDITOR_findOverlay.appendChild(input);
        if (!get_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching()) {
            input.focus();
        }
        
        let divCurrentOfTotal = document.createElement('div');
        let spanBlank = document.createElement('span');
        spanBlank.innerText = '1';
        spanBlank.id = 'EDITOR_findOverlay_current';
        divCurrentOfTotal.appendChild(spanBlank);
        let spanBlankOf = document.createElement('span');
        spanBlankOf.innerText = ' of ';
        divCurrentOfTotal.appendChild(spanBlankOf);
        let spanBlankOfBlank = document.createElement('span');
        spanBlankOfBlank.innerText = '10';
        spanBlankOfBlank.id = 'EDITOR_findOverlay_total';
        divCurrentOfTotal.appendChild(spanBlankOfBlank);
        EDITOR_findOverlay.appendChild(divCurrentOfTotal);
        
        let divPrevNext = document.createElement('div');
        let btnPrev = document.createElement('button');
        btnPrev.innerText = 'prev';
        btnPrev.id = 'EDITOR_findOverlay_prev';
        btnPrev.style.marginRight = '5px';
        let btnNext = document.createElement('button');
        btnNext.innerText = 'next';
        btnNext.id = 'EDITOR_findOverlay_next';
        btnPrev.addEventListener('click', EDITOR_btnPrev_onclick);
        btnNext.addEventListener('click', EDITOR_btnNext_onclick); 
        divPrevNext.appendChild(btnPrev);
        divPrevNext.appendChild(btnNext);
        EDITOR_findOverlay.appendChild(divPrevNext);
        
        let divOptions = document.createElement('div');
        let checkboxMatchWord = document.createElement('input');
	    checkboxMatchWord.type = 'checkbox';
	    checkboxMatchWord.id = 'EDITOR_findOverlay_checkboxMatchWord';
	    checkboxMatchWord.checked = Boolean(get_EDITOR_findOverlay_options_matchWord());
	    checkboxMatchWord.addEventListener('change', EDITOR_findOverlay_checkboxMatchWord_onchange);
	    divOptions.appendChild(checkboxMatchWord);
	    let label_for_checkboxMatchWord = document.createElement('label');
	    label_for_checkboxMatchWord.htmlFor = 'EDITOR_findOverlay_checkboxMatchWord';
	    label_for_checkboxMatchWord.textContent = 'matchWord';
	    divOptions.appendChild(label_for_checkboxMatchWord);
	    EDITOR_findOverlay.appendChild(divOptions);
        
        if (EDITOR_primaryCursor.hasSelection()) {
        	EDITOR_finalizeAllCursors();
            let selectionAnchor = EDITOR_primaryCursor.selectionAnchor;
            let selectionEnd = EDITOR_primaryCursor.selectionEnd;
            let small;
            let large;
            if (selectionAnchor < selectionEnd) {
                small = selectionAnchor;
                large = selectionEnd;
            }
            else {
                small = selectionEnd;
                large = selectionAnchor;
            }
            let offset = small;
            let length = large - small;
            if (length <= 256) {
                input.value = EDITOR_decode_textonly(offset, length);
                EDITOR_findOverlay_doSearch();
            }
        }
    }
    else if (get_EDITOR_findOverlay_show() && !showValue) {
        EDITOR_findOverlay.style.visibility = 'hidden';
        EDITOR_findOverlay_searchResultPositionList = null;
        let input = document.getElementById('EDITOR_findOverlay_input_elementId');
        if (input && input.parentElement === EDITOR_findOverlay) {
        	input.removeEventListener('change', EDITOR_findOverlay_input_onchange);
            input.removeEventListener('keydown', EDITOR_findOverlay_input_onkeydown);
            input.removeEventListener('blur', EDITOR_findOverlay_input_onblur);
            EDITOR_findOverlay.removeChild(input);
        }
        let btnPrev = document.getElementById('EDITOR_findOverlay_prev');
        if (btnPrev) {
        	btnPrev.removeEventListener('click', EDITOR_btnPrev_onclick);
        }
        let btnNext = document.getElementById('EDITOR_findOverlay_next');
        if (btnNext) {
        	btnNext.removeEventListener('click', EDITOR_btnNext_onclick);
        }
        let checkboxMatchWord = document.getElementById('EDITOR_findOverlay_checkboxMatchWord');
        if (checkboxMatchWord) {
        	checkboxMatchWord.removeEventListener('change', EDITOR_findOverlay_checkboxMatchWord_onchange);
        }
        EDITOR_findOverlay.innerHTML = '';
        set_EDITOR_findOverlay_isBeingShownDueToMultiCursorMatching(false);
    }

    set_EDITOR_findOverlay_show(showValue);
}

function EDITOR_btnPrev_onclick(/*event*/) {
	let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
	if (!spanCurrent) return;
	
	let spanTotal = document.getElementById('EDITOR_findOverlay_total');
	if (!spanTotal) return;
	
	let current = parseInt(spanCurrent.innerText, 10);
	let total = parseInt(spanTotal.innerText, 10);
	
	if (current && total) {
		current--;
		if (current < 1 || current >= total) {
			if (total > 1) {
				current = total;
			}
			else {
				current = 1;
			}
		}
		spanCurrent.innerText = current;
	}
	else {
		spanCurrent.innerText = 'parseInt not successful?';
	}

    let index = current - 1;
    if (index >= 0 && index < total && index < EDITOR_findOverlay_searchResultPositionList.count) {
        let pos = EDITOR_findOverlay_searchResultPositionList.data[index];
        if (pos <= EDITOR_textByteList.count) {
            EDITOR_moveCursor_position(pos);
        }
    }
}

function EDITOR_btnNext_onclick() {
	let spanCurrent = document.getElementById('EDITOR_findOverlay_current');
	if (!spanCurrent) return;
	
	let spanTotal = document.getElementById('EDITOR_findOverlay_total');
	if (!spanTotal) return;
	
	let current = parseInt(spanCurrent.innerText, 10);
	let total = parseInt(spanTotal.innerText, 10);
	
	if (current && total) {
		current++;
		if (current > total || current < 1) {
			current = 1;
		}
		spanCurrent.innerText = current;
	}
	else {
		spanCurrent.innerText = 'parseInt not successful?';
	}

    let index = current - 1;
    if (index >= 0 && index < total && index < EDITOR_findOverlay_searchResultPositionList.count) {
        let pos = EDITOR_findOverlay_searchResultPositionList.data[index];
        if (pos <= EDITOR_textByteList.count) {
            EDITOR_moveCursor_position(pos);
        }
    }
}

/**
 * Invoking 'EDITOR_finalizeAllCursors()' is a good idea prior to invoking this. Long term perhaps this won't be so important.
 * @param {*} cursor 
 */
async function EDITOR_copySelection(cursor) {
	if (!cursor.hasSelection()) {
		// TODO: This code has a bug and doesn't work with multicursor... EDITOR_onMouseDownDetailRankThree needs to accept a cursor rather than acting on EDITOR_primaryCursor
    	EDITOR_onMouseDownDetailRankThree({shiftKey:false}, cursor.indexLine, cursor.indexColumn);
	}
	let selectionAnchor = cursor.selectionAnchor;
    let selectionEnd = cursor.selectionEnd;
    let small;
    let large;
    if (selectionAnchor < selectionEnd) {
        small = selectionAnchor;
        large = selectionEnd;
    }
    else {
        small = selectionEnd;
        large = selectionAnchor;
    }
    return window.myAPI.editorSetClipboard(EDITOR_textByteList.bytes, small, large - small, EDITOR_lineEndString);
}

/**
 * Invoking 'EDITOR_finalizeAllCursors()' is a good idea prior to invoking this. Long term perhaps this won't be so important.
 * @param {EDITOR_Cursor} cursor 
 */
async function EDITOR_duplicateSelection(cursor) {
    // Aaa
    //     - Modify the bytes and Modify the line end positions
    //         - immediately
    //         - as an edit
    // Bbb
    //     - Modify the tracked syntax
    //     - Draw the pending edit in the UI

	if (!cursor.hasSelection()) {
		// TODO: This code has a bug and doesn't work with multicursor... EDITOR_onMouseDownDetailRankThree needs to accept a cursor rather than acting on EDITOR_primaryCursor...
        // ...these days the todo is somewhat incorrect, it takes cursor now, but you'd need to check whether this causes the selection of two cursors to overlap.
    	EDITOR_onMouseDownDetailRankThree({shiftKey:false}, cursor.indexLine, cursor.indexColumn);
	}

	let selectionAnchor = cursor.selectionAnchor;
    let selectionEnd = cursor.selectionEnd;
    let small;
    let large;
    if (selectionAnchor < selectionEnd) {
        small = selectionAnchor;
        large = selectionEnd;
    }
    else {
        small = selectionEnd;
        large = selectionAnchor;
    }

    let length = large - small;

    cursor.editPosition = large;
    let large_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(large);
    cursor.editIndexLine = large_lineAndColumnIndices.indexLine;
    cursor.editIndexColumn = large_lineAndColumnIndices.indexColumn;
    cursor.editLength = length;

    cursor.indexLine = large_lineAndColumnIndices.indexLine;
    cursor.indexColumn = large_lineAndColumnIndices.indexColumn;

    cursor.EDITOR_duplicate_small = small;
    cursor.EDITOR_duplicate_length = length;

    EDITOR_duplicateSelection_drawUi(cursor, small, large, length);

    cursor.selectionAnchor = large;
    cursor.selectionEnd = large + length;
}

async function EDITOR_duplicateSelection_drawUi(cursor, small, large, length) {
    let positionIndex = large;

    let w = walkLineUntilColumnIndex(cursor);
    if (w.indexColumn_Goal === -1 || !w.div || w.div.children.length === 0) {
        // TODO: silent error bad
        alert('// EDITOR_paste TODO: silent error bad');
        return;
    }

    let linesInsertedCount = 0;
    let insertionLength = 0;

    /** is a 0 based index, inclusive */
    let wordStart = 0;
    let wordLength = 0;

    // No need to consider '\r\n' and etc... only '\n'
    let linefeedLength = 0;
    let relativeIndexLine = (cursor.indexLine + get_EDITOR_offsetLine()) - get_EDITOR_virtualLineIndex();
    let matched_indexLine_first = EDITOR_getIndexLineToHtml_Correctly(get_EDITOR_virtualLineIndex());
    let matched_indexLine_last = EDITOR_getIndexLineToHtml_Correctly(get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1);
    let last_valid_indexColumn_currentLine = EDITOR_getLastValidIndexColumn(cursor.indexLine);

    // TODO: An optimization to check whether you even need to redraw any lines perhaps is possible but it would add too much complexity at the moment and so it isn't being considered...
    // ...i.e.: if you're inserting so many lines that you know you'll scroll or that only a small amount of lines need to be redrawn due to predicting a scroll event.

    let shouldPreserveCssClassWhenSplittingAmongLine = false;
    let hasSeenLinefeed = false;

    let original_indexColumn_SpanTextContentRelative = w.indexColumn_SpanTextContentRelative;
    let original_span_textContent_length = w.span.textContent.length;
    let original_tracked_syntax_start = positionIndex - cursor.indexColumn + w.indexColumn_Sum;

    for (var offset = 0; offset < length; offset++) {
        switch (EDITOR_textByteList.bytes[small + offset]) {
            case '\n':
                //
                if (wordLength > 0) writeWord();
                //
                insertionLength++;
                linesInsertedCount++;
                //
                linefeedLength++;
                break;
            default:
                //
                if (linefeedLength > 0) writeLinefeed();
                // TODO: Extremely important next line but it doesn't fully pattern with every case so it is somewhat out of nowhere
                if (relativeIndexLine > matched_indexLine_last) return;
                //
                insertionLength++;
                //
                if (wordLength === 0) {
                    wordStart = small + offset;
                }
                wordLength++;
                break;
        }
    }

    if (wordLength > 0) writeWord();
    else if (linefeedLength > 0) writeLinefeed();

    EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(positionIndex, insertionLength);

    if (linesInsertedCount > 0) {
        update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count + linesInsertedCount);
        // I uncommented this, it isn't doing what I want it to. I'm just gonna be done for now.
        //EDITOR_drawGutter_Width();
    }

    function writeWord() {
        w.span.innerText = 
            w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) +
            EDITOR_decoder.decode(EDITOR_textByteList.bytes.subarray(wordStart, wordStart + wordLength)) +
            w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);

        cursor.indexColumn += wordLength;
        last_valid_indexColumn_currentLine += wordLength;
        w.indexColumn_SpanTextContentRelative += wordLength;
        wordStart = 0;
        wordLength = 0;
    }
    
    /**
     * TODO: If this ends up working don't duplicate this code, this is the 'EDITOR_EnterKey' function; copy, paste, and probably modified.
     */
    function writeLinefeed() {
        if (!hasSeenLinefeed) {
            handleNotHasSeenLinefeed();
        }

        // TODO: this is a very lazy solution to the problem, likely a more optimal way is available. Also name the variable?
        // I don't think everything fully works but I'm trying to decide if I should go eat something.
        for (let handleLineCounter = 0; handleLineCounter < linefeedLength; handleLineCounter++) {
            if (relativeIndexLine > matched_indexLine_last) {
                // A scroll should take place and handle the rest
                // Note: any lines indices that don't change between the current scrollTop and what is shown with the new scrollTop...
                // ...won't redraw so you still need to run this code for some of the lines.
                // you could probably predict which lines in particular overlap or some such but it isn't being done here currently.
                break;
            }

            let lineDiv; // TODO: re-use the one you are removing?
            let removingVisuallyDiv;

            if (cursor.indexColumn === 0 && last_valid_indexColumn_currentLine !== 0) { // start of line
                if (relativeIndexLine === matched_indexLine_last) {
                    if (relativeIndexLine === 0) {
                        lineDiv = null; // last line at 0 means the visual feedback should be continued vision of the current line because you pushed it down then scrolled.
                        removingVisuallyDiv = null; // No div above you to remove
                    }
                    else {
                        lineDiv = EDITOR_getNewAndEmptyLineElement();
                        removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_first];
                    }
                }
                else {
                    lineDiv = EDITOR_getNewAndEmptyLineElement();
                    removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_last];
                }

                if (lineDiv) {
                    get_EDITOR_textElement().insertBefore(lineDiv, get_EDITOR_textElement().children[relativeIndexLine]);
                    get_EDITOR_textElement().removeChild(removingVisuallyDiv);

                    w.div = lineDiv;
                    w.indexSpan = 0;
                    w.span = lineDiv.children[w.indexSpan];
                    w.indexColumn_Goal = 0;
                    w.indexColumn_Sum = 0;
                    w.indexColumn_SpanTextContentRelative = 0;
                    cursor.indexLine++;
                    cursor.indexColumn = 0;
                    relativeIndexLine++;
                }
                continue;
            }
            else {
                // ensure this conditional branch continues if handled, otherwise it will execute the fallback case erroneously
                if (last_valid_indexColumn_currentLine === cursor.indexColumn) { // end of line
                    if (relativeIndexLine === matched_indexLine_last) {
                        if (relativeIndexLine === 0) {
                            lineDiv = null;
                            removingVisuallyDiv = null; // No div above you to remove
                        }
                        else {
                            lineDiv = EDITOR_getNewAndEmptyLineElement();
                            removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_first];
                        }
                    }
                    else {
                        lineDiv = EDITOR_getNewAndEmptyLineElement();
                        removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_last];
                    }

                    if (lineDiv) {
                        // TODO: this is wrong you don't need to remove a div, just use that div again instead of making a new one to replace it.
                        // TODO: wrap around suspect?
                        get_EDITOR_textElement().insertBefore(lineDiv, get_EDITOR_textElement().children[relativeIndexLine + 1]);
                        get_EDITOR_textElement().removeChild(removingVisuallyDiv);

                        w.div = lineDiv;
                        w.indexSpan = 0;
                        w.span = lineDiv.children[w.indexSpan];
                        w.indexColumn_Goal = 0;
                        w.indexColumn_Sum = 0;
                        w.indexColumn_SpanTextContentRelative = 0;
                        cursor.indexLine++;
                        cursor.indexColumn = 0;
                        last_valid_indexColumn_currentLine = 0;
                        relativeIndexLine++;
                    }
                    continue;
                }
                else { // among a line
                    // This case can only happen once at the start of the edit
                    if (relativeIndexLine === matched_indexLine_last) {
                        if (relativeIndexLine === 0) {
                            lineDiv = null;
                            removingVisuallyDiv = null; // No div above you to remove
                        }
                        else {
                            lineDiv = EDITOR_getNewAndEmptyLineElement();
                            removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_first];
                        }
                    }
                    else {
                        lineDiv = EDITOR_getNewAndEmptyLineElement();
                        removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_last];
                    }

                    if (lineDiv) {
                        if (w.indexColumn_Goal > 0) {
                            if (w.indexColumn_Goal !== w.indexColumn_Sum + w.span.textContent.length) {
                                let firstText = w.span.textContent.substring(0, w.indexColumn_SpanTextContentRelative);
                                let lastText = w.span.textContent.substring(w.indexColumn_SpanTextContentRelative);
                                last_valid_indexColumn_currentLine = lastText.length;
                                w.span.innerText = firstText;
                                if (shouldPreserveCssClassWhenSplittingAmongLine) {
                                    lineDiv.children[0].className = w.span.className;
                                    lineDiv.children[0].innerText += lastText;
                                }
                                else {
                                    // TODO: don't create a span here, the div already has one available that isn't being used...
                                    // ...although that's only because you are creating a new div, if you fix that which is on its own a separate issue
                                    // then maybe this... I think it would still have at least 1 empty span though?
                                    //
                                    let span = document.createElement('span');
                                    span.innerText = lastText;
                                    lineDiv.appendChild(span);
                                }
                            }
                            
                            let rememberIndex = w.indexSpan + 1;
                            let rememberLength = w.div.children.length;
                            for (let i = rememberIndex; i < rememberLength; i++) {
                                lineDiv.appendChild(w.div.children[rememberIndex]);
                            }
                        }
                        // TODO: wrap around suspect?
                        get_EDITOR_textElement().insertBefore(lineDiv, get_EDITOR_textElement().children[relativeIndexLine + 1]);
                        get_EDITOR_textElement().removeChild(removingVisuallyDiv);

                        w.div = lineDiv;
                        w.indexSpan = 0;
                        w.span = lineDiv.children[w.indexSpan];
                        w.indexColumn_Goal = 0;
                        w.indexColumn_Sum = 0;
                        w.indexColumn_SpanTextContentRelative = 0;
                        cursor.indexLine++;
                        cursor.indexColumn = 0;
                        // last_valid_indexColumn_currentLine is being set when splitting the text.
                        relativeIndexLine++;
                    }
                    continue;
                }
            }
        }

        linefeedLength = 0;
    }

    /** Maybe some cases are not necessary here because in order to have linefeed inserted it would've had to already existed thus the syntax would already be '..M' */
    function handleNotHasSeenLinefeed() {
        // The only way to invoke this is if you encountered a linefeed for the first time,
        // therefore 'w.span' is the original span and no variable for the original needs to be made.
        // (unless in the future you don't end up using the w.span in some way or etc...)
        //
        hasSeenLinefeed = true;
        switch (w.span.className) {
            case 'eCm':
                if (original_indexColumn_SpanTextContentRelative >= 2 && (original_indexColumn_SpanTextContentRelative <= original_span_textContent_length - 2)) {
                    w.span.className = 'eCM';
                    let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
                    EDITOR_trackedSyntaxList.insert(
                        indexOfGreaterThanOrEqual,
                        TrackedSyntaxKind.Comment,
                        indexPosition - cursor.indexColumn + w.indexColumn_Sum,
                        original_span_textContent_length);
                    shouldPreserveCssClassWhenSplittingAmongLine = true;
                }
                break;
            case 'eCM':
                shouldPreserveCssClassWhenSplittingAmongLine = true;
                break;
            case 'eSm':
                if (original_indexColumn_SpanTextContentRelative >= 1 && (original_indexColumn_SpanTextContentRelative <= original_span_textContent_length - 1)) {
                    w.span.className = 'eSM';
                    let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
                    EDITOR_trackedSyntaxList.insert(
                        indexOfGreaterThanOrEqual,
                        TrackedSyntaxKind.String,
                        indexPosition - cursor.indexColumn + w.indexColumn_Sum,
                        original_span_textContent_length);
                    shouldPreserveCssClassWhenSplittingAmongLine = true;
                }
                break;
            case 'eSM':
                shouldPreserveCssClassWhenSplittingAmongLine = true;
                break;
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_indentMore(cursor) {

    // You need to batch these edits so that if they hold down the tab key, you don't modify the underlying bytes of the text until the edit is finalized.
    // This function (and the 'less' version) are somewhat spahetti-code-y.
    // So make a "TOC", where you list out the main ideas, each main idea being a single line comment that starts with '#'
    // Do not overthink each individual main idea, you can easily change them as needed as you go, just start trying to make sense of things.

    // I think "TOC" has 18 lines of text I tried counting it
    // TOC:
    // ====
    // # Small and large selection positions
    // # Determine the starting indexLine (the start is the large position, this confused me for a moment)
    // # Determine the total count of text that will be inserted, prior to actually beginning the edit.
    // # Update the 'START POSITIONS specifically' of the tracked syntax list by the total count of text that will be inserted.
    // # Descending lineIndex loop:
    //     # Insert the text on the respective line.
    //     # Increment the entry in 'EDITOR_lineEndPositionList' for the respective line
    //     # There's a second modification to the start positions of the tracked syntax list
    //     # Then, you immediately know the trackedSyntax that encompasses the insertion (if it exists), so you increment its length by the text inserted on that respective line.
    //     # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
    //         # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
    //         # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
    // # Any line that is not part of the selected set of lines, and is at a greater indexLine, needs to have their line end position entry updated.
    // # Update the cursor's selection to reflect the inserted text
    // # Update the cursor's indexColumn to reflect the inserted text
    // # Update the cursor's selection to reflect the inserted text
    // # Draw the cursor
    // # Redraw the entire viewport (I didn't even think about this... this should change)

    // Some of the ideas that I listed are vague.
    // Likely I have that wording because even I can't remember what was going on.
    //
    // For example "you immediately know the trackedSyntax that encompasses the insertion (if it exists)"
    // I can't remember why this works but I remember that it does.
    // So I need to figure out why it works.

    // # Small and large selection positions
    let SMALL_pos;
    let LARGE_pos;
    if (cursor.selectionAnchor < cursor.selectionEnd) {
        SMALL_pos = cursor.selectionAnchor;
        LARGE_pos = cursor.selectionEnd;
    }
    else {
        SMALL_pos = cursor.selectionEnd;
        LARGE_pos = cursor.selectionAnchor;
    }
    let SMALL_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(SMALL_pos);
    let LARGE_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(LARGE_pos);

    // # Determine the starting indexLine (the start is the large position, this confused me for a moment)
    let startingIndex = LARGE_lineAndColumnIndices.indexLine;
    let startingLinePos = EDITOR_getLineBoundaryPositions(startingIndex);
    if (startingLinePos.start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) {
            startingLinePos = EDITOR_getLineBoundaryPositions(startingIndex);
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices.indexLine) {
        return;
    }

    // # Determine the total count of text that will be inserted, prior to actually beginning the edit.
    let ORIGINAL_incrementBy = (startingIndex + 1 - SMALL_lineAndColumnIndices.indexLine) * 4;
    set_EDITOR_indent_ORIGINAL_indentBy(ORIGINAL_incrementBy);
    set_EDITOR_indent_SMALL_lineAndColumnIndices_indexLine(SMALL_lineAndColumnIndices.indexLine);
    set_EDITOR_indent_startingIndex(startingIndex);
    let incrementBy = ORIGINAL_incrementBy;

    // # Update the 'START POSITIONS specifically' of the tracked syntax list by the total count of text that will be inserted.
    let trackedSyntaxReposition_i = EDITOR_trackedSyntaxReposition_find(startingLinePos.end + 1);
    if (trackedSyntaxReposition_i === NaN || trackedSyntaxReposition_i === -1) {
        trackedSyntaxReposition_i = EDITOR_trackedSyntaxList.count_abstract;
    }
    for (var i = trackedSyntaxReposition_i; i < EDITOR_trackedSyntaxList.count_abstract; i++) {
        EDITOR_trackedSyntaxList.setStart(
            i,
            EDITOR_trackedSyntaxList.getStart(i) + ORIGINAL_incrementBy);
    }
    trackedSyntaxReposition_i--;

    // TODO: Consider having this string available rather than making it everytime this function is invoked.
    let EDITOR_on_tab_string = '';
    for (let i = 0; i < EDITOR_on_tab_bytes.length; i++) {
        EDITOR_on_tab_string += String.fromCharCode(EDITOR_on_tab_bytes[i]);
    }

    // # Descending lineIndex loop:
    //     # Insert the text on the respective line.
    //     # Increment the entry in 'EDITOR_lineEndPositionList' for the respective line
    //     # There's a second (relative to this entire function) modification to the start positions of the tracked syntax list
    //     # Then, you immediately know the trackedSyntax that encompasses the insertion (if it exists), so you increment its length by the text inserted on that respective line.
    //     # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
    //         # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
    //         # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
    for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices.indexLine; lineI--) {
        let linePos = EDITOR_getLineBoundaryPositions(lineI);

        for (; trackedSyntaxReposition_i >= 0; trackedSyntaxReposition_i--) {
            let start = EDITOR_trackedSyntaxList.getStart(trackedSyntaxReposition_i);
            if (linePos.start <= start) {
                // # There's a second (relative to this entire function) modification to the start positions of the tracked syntax list
                EDITOR_trackedSyntaxList.setStart(trackedSyntaxReposition_i, start + incrementBy);
            }
            else {
                break;
            }
        }
        EDITOR_trackedSyntaxList.getElementAt(trackedSyntaxReposition_i);
        if (linePos.start > get_EDITOR_pooledTrackedSyntax_start() && linePos.start < get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length()) {
            // # Then, you immediately know the trackedSyntax that encompasses the insertion (if it exists), so you increment its length by the text inserted on that respective line.
            EDITOR_trackedSyntaxList.setLength(trackedSyntaxReposition_i, get_EDITOR_pooledTrackedSyntax_length() + 4);
        }

        // # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
        //     # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
        //     # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
        incrementBy -= 4;

        // Draw the line to reflect the edit, if it is being currently shown on screen.
        let indexLine_VirtualRelative = EDITOR_getIndexLineToHtml_Correctly(lineI);
        if (indexLine_VirtualRelative >= 0) {
                let div = get_EDITOR_textElement().children[indexLine_VirtualRelative];
                let span;
                if (div.children[0].className === '') {
                    span = div.children[0];
                }
                else {
                    span = document.createElement('span');
                    div.insertBefore(span, div.children[0]);
                }
                if (span.innerText.length > 0 &&
                    (span.innerText[0] === ' ' || span.innerText[0] === '\t' || span.innerText[0] === '\0') &&
                    (span.innerText[span.innerText.length - 1] === ' ' || span.innerText[span.innerText.length - 1] === '\t' || span.innerText[span.innerText.length - 1] === '\0')) {
                        span.innerText += EDITOR_on_tab_string;
                }
                else {
                    span.innerText = EDITOR_on_tab_string + span.innerText;
                }
        }
    }

    // # Update the cursor's selection to reflect the inserted text
    if (cursor.selectionAnchor < cursor.selectionEnd) {
        cursor.selectionEnd += ORIGINAL_incrementBy;
    }
    else {
        cursor.selectionAnchor += ORIGINAL_incrementBy;
    }

    // # Update the cursor's indexColumn to reflect the inserted text
    cursor.indexColumn += 4;

    // # Update the cursor's selection to reflect the inserted text
    let smallLinePos = EDITOR_getLineBoundaryPositions(SMALL_lineAndColumnIndices.indexLine);
    if (SMALL_pos > smallLinePos.start) {
        if (cursor.selectionAnchor < cursor.selectionEnd) {
            cursor.selectionAnchor += 4;
        }
        else {
            cursor.selectionEnd += 4;
        }
    }

    // # Draw the cursor
    EDITOR_createStyleForSelection_indentMore(cursor);
    EDITOR_drawCursor(cursor);
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_indentLess(cursor) {

    /////////////////////// P_1
    let textSelectionDiv;
    if (cursor.selectionDivExists) {
        for (var i = 0; i < get_EDITOR_presentation().children.length; i++) {
            if (get_EDITOR_presentation().children[i].id === cursor.htmlId) {
                textSelectionDiv = get_EDITOR_presentation().children[i];
                break;
            }
        }
    }
    else {
        // TODO: Silent error confusing bad idea
    }
    let lesstraWidth_1 = 1 * EDITOR_characterWidth;
    let lesstraWidth_2 = 2 * EDITOR_characterWidth;
    let lesstraWidth_3 = 3 * EDITOR_characterWidth;
    let lesstraWidth_4 = 4 * EDITOR_characterWidth;
    /////////////////////// P_1

    // selection positions
    let SMALL_pos;
    let LARGE_pos;
    if (cursor.selectionAnchor < cursor.selectionEnd) {
        SMALL_pos = cursor.selectionAnchor;
        LARGE_pos = cursor.selectionEnd;
    }
    else {
        SMALL_pos = cursor.selectionEnd;
        LARGE_pos = cursor.selectionAnchor;
    }
    let SMALL_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(SMALL_pos);
    let LARGE_lineAndColumnIndices = EDITOR_getLineAndColumnIndices(LARGE_pos);

    // starting index
    let startingIndex = LARGE_lineAndColumnIndices.indexLine;
    let startingLinePos = EDITOR_getLineBoundaryPositions(startingIndex);
    if (startingLinePos.start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) {
            startingLinePos = EDITOR_getLineBoundaryPositions(startingIndex);
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices.indexLine) {
        return;
    }

    // loop over the lines to sum the "amount" of whitespace being removed
    let DETERMINE_decrementBy = 0;
    for (var lineI = SMALL_lineAndColumnIndices.indexLine; lineI <= startingIndex; lineI++) {
        let linePos = EDITOR_getLineBoundaryPositions(lineI);
        let line = linePos;
        let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(lineI);
        let upperLimitIndexColumn;
        if (lastValidIndexColumn > 4) {
            upperLimitIndexColumn = 4;
        }
        else {
            upperLimitIndexColumn = lastValidIndexColumn;
        }
        let seenSpace = false;
        outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
            let c = getCharacter(line.start + i);
            switch (c) {
                case ' ':
                    seenSpace = true;
                    DETERMINE_decrementBy++;
                    break;
                case '\t':
                    if (!seenSpace) {
                        DETERMINE_decrementBy += 4;
                    }
                    break outer;
                default:
                    break outer;
            }
        }
    }

    // Remember the total whitespace removed
    let ORIGINAL_decrementBy = DETERMINE_decrementBy;
    set_EDITOR_indent_ORIGINAL_indentBy(ORIGINAL_decrementBy);
    set_EDITOR_indent_SMALL_lineAndColumnIndices_indexLine(SMALL_lineAndColumnIndices.indexLine);
    set_EDITOR_indent_startingIndex(startingIndex);
    let decrementBy = ORIGINAL_decrementBy;

    // TODO: use better formatting
    // TODO: This handles the line that the small-selection-position resides on?
    {
        let linePos = EDITOR_getLineBoundaryPositions(SMALL_lineAndColumnIndices.indexLine);
        let line = linePos;
        let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(SMALL_lineAndColumnIndices.indexLine);
        let upperLimitIndexColumn;
        if (lastValidIndexColumn > 4) {
            upperLimitIndexColumn = 4;
        }
        else {
            upperLimitIndexColumn = lastValidIndexColumn;
        }
        let seenSpace = false;
        let count = 0;
        outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
            let c = getCharacter(line.start + i);
            switch (c) {
                case ' ':
                    seenSpace = true;
                    count++;
                    break;
                case '\t':
                    if (!seenSpace) {
                        count+= 4;
                    }
                    break outer;
                default:
                    break outer;
            }
        }

        let smallLinePos = EDITOR_getLineBoundaryPositions(SMALL_lineAndColumnIndices.indexLine);
        if (SMALL_pos > smallLinePos.start) {
            if (cursor.selectionAnchor < cursor.selectionEnd) {
                cursor.selectionAnchor -= count;
            }
            else {
                cursor.selectionEnd -= count;
            }
        }

        if (cursor.indexLine === SMALL_lineAndColumnIndices.indexLine) {
            cursor.indexColumn -= count;
        }
    }

    // TODO: This at a glance seems to not account for when the cursor is small-position-ended and large-position-anchored...
    // ...this is moving the cursor actually, maybe it is fine? but maybe it is logic that could've been done during a loop but instead you made a new one to separately do this?
    // Also, this entire function is terribly written. You seemingly hacked something together; the code doesn't feel self explanatory. Furthermore there are both a lack of comments (given the confusing nature of how this is written), and dead comments.
    if (cursor.indexLine !== SMALL_lineAndColumnIndices.indexLine) {
        let linePos = EDITOR_getLineBoundaryPositions(cursor.indexLine);
        let line = linePos;
        let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
        let upperLimitIndexColumn;
        if (lastValidIndexColumn > 4) {
            upperLimitIndexColumn = 4;
        }
        else {
            upperLimitIndexColumn = lastValidIndexColumn;
        }
        let seenSpace = false;
        let count = 0;
        outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
            let c = getCharacter(line.start + i);
            switch (c) {
                case ' ':
                    seenSpace = true;
                    count++;
                    break;
                case '\t':
                    if (!seenSpace) {
                        count+= 4;
                    }
                    break outer;
                default:
                    break outer;
            }
        }
        let c = EDITOR_getLineBoundaryPositions(cursor.indexLine);
        // TODO: git blame the below todo and remind them to delete the dead code
        // TODO: Delete this dead code / use better formatting
        /*if (SMALL_pos > smallLinePos.start) {
            if (cursor.selectionAnchor < cursor.selectionEnd) {
                cursor.selectionAnchor -= count;
            }
            else {
                cursor.selectionEnd -= count;
            }
        }*/
        if (cursor.indexLine === LARGE_lineAndColumnIndices.indexLine) {
            cursor.indexColumn -= count;
        }
    }

    let trackedSyntaxReposition_i = EDITOR_trackedSyntaxReposition_find(startingLinePos.end + 1);
    if (trackedSyntaxReposition_i === NaN || trackedSyntaxReposition_i === -1) {
        trackedSyntaxReposition_i = EDITOR_trackedSyntaxList.count_abstract;
    }
    for (var i = trackedSyntaxReposition_i; i < EDITOR_trackedSyntaxList.count_abstract; i++) {
        EDITOR_trackedSyntaxList.setStart(
            i,
            EDITOR_trackedSyntaxList.getStart(i) - ORIGINAL_decrementBy);
    }
    trackedSyntaxReposition_i--;

    let selectionLineDivIndex = 0;
    if (textSelectionDiv) {
        selectionLineDivIndex = textSelectionDiv.children.length - 1;
    }

    for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices.indexLine; lineI--) {
        let innerRemoveCount = 0;
        let linePos = EDITOR_getLineBoundaryPositions(lineI);
        let line = linePos;
        let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(lineI);
        let upperLimitIndexColumn;
        if (lastValidIndexColumn > 4) {
            upperLimitIndexColumn = 4;
        }
        else {
            upperLimitIndexColumn = lastValidIndexColumn;
        }
        let seenSpace = false;
        outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
            let c = getCharacter(line.start + i);
            switch (c) {
                case ' ':
                    seenSpace = true;
                    innerRemoveCount++;
                    break;
                case '\t':
                    if (!seenSpace) {
                        innerRemoveCount += 4;
                    }
                    break outer;
                default:
                    break outer;
            }
        }

        for (; trackedSyntaxReposition_i >= 0; trackedSyntaxReposition_i--) {
            let start = EDITOR_trackedSyntaxList.getStart(trackedSyntaxReposition_i);
            if (linePos.start <= start) {
                EDITOR_trackedSyntaxList.setStart(trackedSyntaxReposition_i, start - decrementBy);
            }
            else {
                break;
            }
        }
        EDITOR_trackedSyntaxList.getElementAt(trackedSyntaxReposition_i);
        if (linePos.start > get_EDITOR_pooledTrackedSyntax_start() && linePos.start < get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length()) {
            EDITOR_trackedSyntaxList.setLength(trackedSyntaxReposition_i, get_EDITOR_pooledTrackedSyntax_length() - innerRemoveCount);
        }

        decrementBy -= innerRemoveCount;
        /////////////////////// P_2
        // TODO: This is not entirely correct. Presumably most specifically I am referring to the first line that is selected.
        if (textSelectionDiv && innerRemoveCount >= 1 && innerRemoveCount <= 4) {
            let lineSelectionDiv = textSelectionDiv.children[selectionLineDivIndex--];
            let widthNumberValue = parseFloat(lineSelectionDiv.style.width, 10);
            let lesstraWidth;
            switch (innerRemoveCount) {
                case 1:
                    lesstraWidth = lesstraWidth_1;
                    break;
                case 2:
                    lesstraWidth = lesstraWidth_2;
                    break;
                case 3:
                    lesstraWidth = lesstraWidth_3;
                    break;
                case 4:
                    lesstraWidth = lesstraWidth_4;
                    break;
            }
            widthNumberValue -= lesstraWidth;
            lineSelectionDiv.style.width = widthNumberValue + 'px';
        }
        /////////////////////// P_2

        // Draw the line to reflect the edit, if it is being currently shown on screen.
        let indexLine_VirtualRelative = EDITOR_getIndexLineToHtml_Correctly(lineI);
        if (indexLine_VirtualRelative >= 0) {
                let div = get_EDITOR_textElement().children[indexLine_VirtualRelative];
                let span = div.children[0];
                span.innerText = span.innerText.slice(innerRemoveCount);
        }
    }

    if (cursor.selectionAnchor < cursor.selectionEnd) {
        cursor.selectionEnd -= ORIGINAL_decrementBy;
    }
    else {
        cursor.selectionAnchor -= ORIGINAL_decrementBy;
    }

    /////////////////////// P_3
    cursor.DRAWN_selectionAnchor = cursor.selectionAnchor;
    cursor.DRAWN_selectionEnd = cursor.selectionEnd;
    /////////////////////// P_3

    EDITOR_drawCursor(cursor);
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} content 
 */
function EDITOR_paste(cursor, content) {
    let positionIndex = EDITOR_getPositionIndex(cursor);

    cursor.editPosition = positionIndex;
    cursor.editIndexLine = cursor.indexLine;
    cursor.editIndexColumn = cursor.indexColumn;

    cursor.EDITOR_paste_clipboardContent = content;

    let w = walkLineUntilColumnIndex(cursor);
    if (w.indexColumn_Goal === -1 || !w.div || w.div.children.length === 0) {
        // TODO: silent error bad
        alert('// EDITOR_paste TODO: silent error bad');
        return;
    }

    // TODO: Consider having this string available rather than making it everytime this function is invoked.
    let EDITOR_on_tab_string = '';
    for (let i = 0; i < EDITOR_on_tab_bytes.length; i++) {
        EDITOR_on_tab_string += String.fromCharCode(EDITOR_on_tab_bytes[i]);
    }

    // for generating tabs of some count
    let stringBuilderArray = [];

    let linesInsertedCount = 0;
    let insertionLength = 0;

    /** is a 0 based index, inclusive */
    let wordStart = 0;
    let wordLength = 0;

    // Consider '\t\0\0\0'
    let tabLength = 0;
    let previouslyGeneratedTabString_value = null;
    let previouslyGeneratedTabString_tabLengthThatWasUsed = 0;

    // Consider '\r\n' and etc...
    let linefeedLength = 0;
    let relativeIndexLine = (cursor.indexLine + get_EDITOR_offsetLine()) - get_EDITOR_virtualLineIndex();
    let matched_indexLine_first = EDITOR_getIndexLineToHtml_Correctly(get_EDITOR_virtualLineIndex());
    let matched_indexLine_last = EDITOR_getIndexLineToHtml_Correctly(get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1);
    let last_valid_indexColumn_currentLine = EDITOR_getLastValidIndexColumn(cursor.indexLine);

    // TODO: An optimization to check whether you even need to redraw any lines perhaps is possible but it would add too much complexity at the moment and so it isn't being considered...
    // ...i.e.: if you're inserting so many lines that you know you'll scroll or that only a small amount of lines need to be redrawn due to predicting a scroll event.

    let shouldPreserveCssClassWhenSplittingAmongLine = false;
    let hasSeenLinefeed = false;

    let original_indexColumn_SpanTextContentRelative = w.indexColumn_SpanTextContentRelative;
    let original_span_textContent_length = w.span.textContent.length;
    let original_tracked_syntax_start = positionIndex - cursor.indexColumn + w.indexColumn_Sum;

    for (var sourceI = 0; sourceI < content.length; sourceI++) {
        switch (content[sourceI]) {
            case '\n':
                //
                if (wordLength > 0) writeWord();
                else if (tabLength > 0) writeTab();
                //
                insertionLength++;
                linesInsertedCount++;
                //
                linefeedLength++;
                break;
            case '\r':
                //
                if (wordLength > 0) writeWord();
                else if (tabLength > 0) writeTab();
                //
                if (sourceI < content.length - 1 && content[sourceI + 1] === '\n') {
                    sourceI++;
                }
                insertionLength++;
                linesInsertedCount++;
                //
                linefeedLength++;
                break;
            case '\t':
                //
                if (wordLength > 0) writeWord();
                else if (linefeedLength > 0) writeLinefeed();
                // TODO: Extremely important next line but it doesn't fully pattern with every case so it is somewhat out of nowhere
                if (relativeIndexLine > matched_indexLine_last) return;
                //
                insertionLength += 4;
                //
                tabLength++;
                break;
            default:
                //
                if (tabLength > 0) writeTab();
                else if (linefeedLength > 0) writeLinefeed();
                // TODO: Extremely important next line but it doesn't fully pattern with every case so it is somewhat out of nowhere
                if (relativeIndexLine > matched_indexLine_last) return;
                //
                insertionLength++;
                //
                if (wordLength === 0) {
                    wordStart = sourceI;
                }
                wordLength++;
                break;
        }
    }

    if (wordLength > 0) writeWord();
    else if (tabLength > 0) writeTab();
    else if (linefeedLength > 0) writeLinefeed();

    EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(positionIndex, insertionLength);

    if (linesInsertedCount > 0) {
        update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count + linesInsertedCount);
        // I uncommented this, it isn't doing what I want it to.
        // I'm just gonna be done for now.
        //EDITOR_drawGutter_Width();
    }
    
    function writeWord() {
        w.span.innerText = 
            w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) +
            content.substring(wordStart, wordStart + wordLength) +
            w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);

        cursor.indexColumn += wordLength;
        last_valid_indexColumn_currentLine += wordLength;
        w.indexColumn_SpanTextContentRelative += wordLength;
        wordStart = 0;
        wordLength = 0;
    }

    function writeTab() {
        if (previouslyGeneratedTabString_tabLengthThatWasUsed !== tabLength) {
            for (let i = 0; i < tabLength; i++) {
                stringBuilderArray.push(EDITOR_on_tab_string);
            }
            previouslyGeneratedTabString_value = stringBuilderArray.join('');
            previouslyGeneratedTabString_tabLengthThatWasUsed = tabLength;
            stringBuilderArray.length = 0;
        }

        w.span.innerText =
            w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) +
            previouslyGeneratedTabString_value +
            w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);

        let thisInsertionLength = 4 * tabLength;
        cursor.indexColumn += thisInsertionLength;
        last_valid_indexColumn_currentLine += thisInsertionLength;
        w.indexColumn_SpanTextContentRelative += thisInsertionLength;
        tabLength = 0;
    }
    
    /**
     * TODO: If this ends up working don't duplicate this code, this is the 'EDITOR_EnterKey' function; copy, paste, and probably modified.
     */
    function writeLinefeed() {
        if (!hasSeenLinefeed) {
            handleNotHasSeenLinefeed();
        }

        // TODO: this is a very lazy solution to the problem, likely a more optimal way is available. Also name the variable?
        // I don't think everything fully works but I'm trying to decide if I should go eat something.
        for (let handleLineCounter = 0; handleLineCounter < linefeedLength; handleLineCounter++) {
            if (relativeIndexLine > matched_indexLine_last) {
                // A scroll should take place and handle the rest
                // Note: any lines indices that don't change between the current scrollTop and what is shown with the new scrollTop...
                // ...won't redraw so you still need to run this code for some of the lines.
                // you could probably predict which lines in particular overlap or some such but it isn't being done here currently.
                break;
            }

            let lineDiv; // TODO: re-use the one you are removing?
            let removingVisuallyDiv;

            if (cursor.indexColumn === 0 && last_valid_indexColumn_currentLine !== 0) { // start of line
                if (relativeIndexLine === matched_indexLine_last) {
                    if (relativeIndexLine === 0) {
                        lineDiv = null; // last line at 0 means the visual feedback should be continued vision of the current line because you pushed it down then scrolled.
                        removingVisuallyDiv = null; // No div above you to remove
                    }
                    else {
                        lineDiv = EDITOR_getNewAndEmptyLineElement();
                        removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_first];
                    }
                }
                else {
                    lineDiv = EDITOR_getNewAndEmptyLineElement();
                    removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_last];
                }

                if (lineDiv) {
                    get_EDITOR_textElement().insertBefore(lineDiv, get_EDITOR_textElement().children[relativeIndexLine]);
                    get_EDITOR_textElement().removeChild(removingVisuallyDiv);

                    w.div = lineDiv;
                    w.indexSpan = 0;
                    w.span = lineDiv.children[w.indexSpan];
                    w.indexColumn_Goal = 0;
                    w.indexColumn_Sum = 0;
                    w.indexColumn_SpanTextContentRelative = 0;
                    cursor.indexLine++;
                    cursor.indexColumn = 0;
                    relativeIndexLine++;
                }
                continue;
            }
            else {
                // ensure this conditional branch continues if handled, otherwise it will execute the fallback case erroneously
                if (last_valid_indexColumn_currentLine === cursor.indexColumn) { // end of line
                    if (relativeIndexLine === matched_indexLine_last) {
                        if (relativeIndexLine === 0) {
                            lineDiv = null;
                            removingVisuallyDiv = null; // No div above you to remove
                        }
                        else {
                            lineDiv = EDITOR_getNewAndEmptyLineElement();
                            removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_first];
                        }
                    }
                    else {
                        lineDiv = EDITOR_getNewAndEmptyLineElement();
                        removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_last];
                    }

                    if (lineDiv) {
                        // TODO: this is wrong you don't need to remove a div, just use that div again instead of making a new one to replace it.
                        // TODO: wrap around suspect?
                        get_EDITOR_textElement().insertBefore(lineDiv, get_EDITOR_textElement().children[relativeIndexLine + 1]);
                        get_EDITOR_textElement().removeChild(removingVisuallyDiv);

                        w.div = lineDiv;
                        w.indexSpan = 0;
                        w.span = lineDiv.children[w.indexSpan];
                        w.indexColumn_Goal = 0;
                        w.indexColumn_Sum = 0;
                        w.indexColumn_SpanTextContentRelative = 0;
                        cursor.indexLine++;
                        cursor.indexColumn = 0;
                        last_valid_indexColumn_currentLine = 0;
                        relativeIndexLine++;
                    }
                    continue;
                }
                else { // among a line
                    // This case can only happen once at the start of the edit
                    if (relativeIndexLine === matched_indexLine_last) {
                        if (relativeIndexLine === 0) {
                            lineDiv = null;
                            removingVisuallyDiv = null; // No div above you to remove
                        }
                        else {
                            lineDiv = EDITOR_getNewAndEmptyLineElement();
                            removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_first];
                        }
                    }
                    else {
                        lineDiv = EDITOR_getNewAndEmptyLineElement();
                        removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_last];
                    }

                    if (lineDiv) {
                        if (w.indexColumn_Goal > 0) {
                            if (w.indexColumn_Goal !== w.indexColumn_Sum + w.span.textContent.length) {
                                let firstText = w.span.textContent.substring(0, w.indexColumn_SpanTextContentRelative);
                                let lastText = w.span.textContent.substring(w.indexColumn_SpanTextContentRelative);
                                last_valid_indexColumn_currentLine = lastText.length;
                                w.span.innerText = firstText;
                                if (shouldPreserveCssClassWhenSplittingAmongLine) {
                                    lineDiv.children[0].className = w.span.className;
                                    lineDiv.children[0].innerText += lastText;
                                }
                                else {
                                    // TODO: don't create a span here, the div already has one available that isn't being used...
                                    // ...although that's only because you are creating a new div, if you fix that which is on its own a separate issue
                                    // then maybe this... I think it would still have at least 1 empty span though?
                                    //
                                    let span = document.createElement('span');
                                    span.innerText = lastText;
                                    lineDiv.appendChild(span);
                                }
                            }
                            
                            let rememberIndex = w.indexSpan + 1;
                            let rememberLength = w.div.children.length;
                            for (let i = rememberIndex; i < rememberLength; i++) {
                                lineDiv.appendChild(w.div.children[rememberIndex]);
                            }
                        }
                        // TODO: wrap around suspect?
                        get_EDITOR_textElement().insertBefore(lineDiv, get_EDITOR_textElement().children[relativeIndexLine + 1]);
                        get_EDITOR_textElement().removeChild(removingVisuallyDiv);

                        w.div = lineDiv;
                        w.indexSpan = 0;
                        w.span = lineDiv.children[w.indexSpan];
                        w.indexColumn_Goal = 0;
                        w.indexColumn_Sum = 0;
                        w.indexColumn_SpanTextContentRelative = 0;
                        cursor.indexLine++;
                        cursor.indexColumn = 0;
                        // last_valid_indexColumn_currentLine is being set when splitting the text.
                        relativeIndexLine++;
                    }
                    continue;
                }
            }
        }

        linefeedLength = 0;
    }

    function handleNotHasSeenLinefeed() {
        // The only way to invoke this is if you encountered a linefeed for the first time,
        // therefore 'w.span' is the original span and no variable for the original needs to be made.
        // (unless in the future you don't end up using the w.span in some way or etc...)
        //
        hasSeenLinefeed = true;
        switch (w.span.className) {
            case 'eCm':
                if (original_indexColumn_SpanTextContentRelative >= 2 && (original_indexColumn_SpanTextContentRelative <= original_span_textContent_length - 2)) {
                    w.span.className = 'eCM';
                    let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
                    EDITOR_trackedSyntaxList.insert(
                        indexOfGreaterThanOrEqual,
                        TrackedSyntaxKind.Comment,
                        indexPosition - cursor.indexColumn + w.indexColumn_Sum,
                        original_span_textContent_length);
                    shouldPreserveCssClassWhenSplittingAmongLine = true;
                }
                break;
            case 'eCM':
                shouldPreserveCssClassWhenSplittingAmongLine = true;
                break;
            case 'eSm':
                if (original_indexColumn_SpanTextContentRelative >= 1 && (original_indexColumn_SpanTextContentRelative <= original_span_textContent_length - 1)) {
                    w.span.className = 'eSM';
                    let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
                    EDITOR_trackedSyntaxList.insert(
                        indexOfGreaterThanOrEqual,
                        TrackedSyntaxKind.String,
                        indexPosition - cursor.indexColumn + w.indexColumn_Sum,
                        original_span_textContent_length);
                    shouldPreserveCssClassWhenSplittingAmongLine = true;
                }
                break;
            case 'eSM':
                shouldPreserveCssClassWhenSplittingAmongLine = true;
                break;
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_tabKey(cursor) {
    let indexPosition = EDITOR_getPositionIndex(cursor);
    cursor.editPosition = indexPosition;
    cursor.editIndexLine = cursor.indexLine;
    cursor.editIndexColumn = cursor.indexColumn;
    
    EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, 4);

    let w = walkLineUntilColumnIndex(cursor);

    cursor.indexColumn += 4; // this has to come after the 'let w = ...'

    if (w.indexColumn_Goal === -1 || !w.div || w.div.children.length === 0) {
        // TODO: silent error bad
        return;
    }

    // TODO: Consider having this string available rather than making it everytime this function is invoked.
    let EDITOR_on_tab_string = '';
    for (let i = 0; i < EDITOR_on_tab_bytes.length; i++) {
        EDITOR_on_tab_string += String.fromCharCode(EDITOR_on_tab_bytes[i]);
    }

    w.span.innerText = 
        w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) +
        EDITOR_on_tab_string +
        w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @returns the COLUMN index that exclusively ends the indentation.
 */
function EDITOR_findEndExclusiveIndentationIndexColumn(cursor) {
    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
    let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);

    for (var i = 0; i < lastValidIndexColumn; i++) {
        let c = getCharacter(line.start + i);
        switch (c) {
            case ' ':
            case '\t':
            case '\0': // tabs are stored as: '\t\0\0\0'
                break;
            default:
                return i;
        }
    }

    return 0;
}

/**
 * If a line has an indentation of 4 space characters, but the user's cursor is positioned after the second space character,
 * then only the first 2 space characters will be used as indentation.
 * 
 * This is intentional, it seems like the more expected behavior in my mind.
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_cacheIndentation(cursor) {
    cursor.cached_indentation_byteList = new ByteList(32);
    let indentationBuilder = [];
    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
    let line = EDITOR_getLineBoundaryPositions(cursor.indexLine);

    let upperLimitIndexColumn;

    if (lastValidIndexColumn > cursor.indexColumn) {
        upperLimitIndexColumn = cursor.indexColumn;
    }
    else {
        upperLimitIndexColumn = lastValidIndexColumn;
    }

    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
        let c = getCharacter(line.start + i);
        switch (c) {
            case ' ':
                cursor.cached_indentation_byteList.insert(cursor.cached_indentation_byteList.count, ASCII_SPACE);
                indentationBuilder.push(c);
                break;
            case '\t':
                cursor.cached_indentation_byteList.insert(cursor.cached_indentation_byteList.count, ASCII_TAB);
                indentationBuilder.push(c);
                break;
            case '\0': // tabs are stored as: '\t\0\0\0'
                cursor.cached_indentation_byteList.insert(cursor.cached_indentation_byteList.count, 0);
                indentationBuilder.push(c);
                break;
            default:
                break outer;
        }
    }

    cursor.cached_indentation_string = indentationBuilder.join('');
}

function EDITOR_lineWasInsertedValidateGutter() {
    if (get_EDITOR_gutter().children.length > 0 && get_EDITOR_gutter().children.length === get_EDITOR_virtualCount()) {
        if (get_EDITOR_gutter().children[get_EDITOR_gutter().children.length - 1].innerText === '~') {
            let successFoundTildeAtIndex = get_EDITOR_gutter().children.length - 1;
            for (let i = get_EDITOR_gutter().children.length - 2; i >= 0; i--) {
                if (get_EDITOR_gutter().children[i].innerText === '~') {
                    successFoundTildeAtIndex = i;
                }
                else {
                    successFoundTildeAtIndex = i + 1;
                    break;
                }
            }
            if (successFoundTildeAtIndex > 0) {
                let number = parseInt(get_EDITOR_gutter().children[successFoundTildeAtIndex - 1].innerText);
                get_EDITOR_gutter().children[successFoundTildeAtIndex].innerText = number + 1;
            }
        }
    }

    EDITOR_drawGutter_Width();
}

/**
 * TODO: This uses a linear search and likely can be optimized.
 * 
 * @param {*} indexPosition 
 * @param {*} insertionCount 
 */
function EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount) {
    for (var i = 0; i < EDITOR_trackedSyntaxList.count_abstract; i++) {
        EDITOR_trackedSyntaxList.getElementAt(i);
        if (indexPosition <= get_EDITOR_pooledTrackedSyntax_start()) {
            EDITOR_trackedSyntaxList.setStart(i, get_EDITOR_pooledTrackedSyntax_start() + insertionCount);
        }
        else if (indexPosition > get_EDITOR_pooledTrackedSyntax_start() && indexPosition < get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length()) {
            EDITOR_trackedSyntaxList.setLength(i, get_EDITOR_pooledTrackedSyntax_length() + insertionCount);
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {boolean} ctrlKey 
 * @param {boolean} shiftKey 
 * @returns 
 */
function EDITOR_EnterKey(cursor, ctrlKey, shiftKey) {
    if (!cursor.cached_indentation_byteList)
        EDITOR_cacheIndentation(cursor);

    if (ctrlKey) cursor.indexColumn = 0;
    else if (shiftKey) cursor.indexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
    
    update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count + 1);

    let indexPosition = EDITOR_getPositionIndex_raw(cursor);
    cursor.editPosition = indexPosition;
    cursor.editIndexLine = cursor.indexLine;
    cursor.editIndexColumn = cursor.indexColumn;
    let insertionCount = 1;
    let shouldRenderEntireViewport = false;
    
    let relativeIndexLine = EDITOR_getIndexLineToHtml_Correctly(cursor.indexLine);
    if (relativeIndexLine < 0)
        shouldRenderEntireViewport = true;

    // There are some cases that I don't feel like thinking about at the moment, this if statement singles them out.
    if (get_EDITOR_virtualCount() <= 1 || get_EDITOR_textElement().children.length !== get_EDITOR_virtualCount())
        shouldRenderEntireViewport = true;

    let matched_indexLine_first = EDITOR_getIndexLineToHtml_Correctly(get_EDITOR_virtualLineIndex());
    let matched_indexLine_last = EDITOR_getIndexLineToHtml_Correctly(get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1);

    // TODO: reminder for when virtualization padding is improved, this function might need to be looked at.
    // TODO: Track the enter keystroke the same as any other insertion edit and have it pending until it needs to be finalized.

    // 4 cases:
    // - "start of line":
    // - "end of line":
    // - "among a line":
    // - "fallback case": this last case is a fallback case and redraws the entire viewport in the case that the UI is in an "unpredictable state" and cannot be optimally redrawn in a smaller more specific redraw.

    // TODO: I'm not gonna put this on the fallback case, 'EDITOR_lineWasInsertedValidateGutter()'...
    // ...just cause it is different and I have a weird vibe but I'm too tired to investigate right now.
    // and it is gonna mess me up at some point cause the invocation does the longest line number drawing
    
    if (!shouldRenderEntireViewport && cursor.indexColumn === 0) { // start of line
        cursor.enterKeyEventKind = get_EnterKeyEventKind_StartOfLine();
        let lineDiv; // TODO: re-use the one you are removing?
        let removingVisuallyDiv;

        if (relativeIndexLine === matched_indexLine_last) {
            if (relativeIndexLine === 0) {
                lineDiv = null; // last line at 0 means the visual feedback should be continued vision of the current line because you pushed it down then scrolled.
                removingVisuallyDiv = null; // No div above you to remove
            }
            else {
                lineDiv = EDITOR_getNewAndEmptyLineElement();
                removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_first];
            }
        }
        else {
            lineDiv = EDITOR_getNewAndEmptyLineElement();
            removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_last];
        }

        if (lineDiv) {
            get_EDITOR_textElement().insertBefore(lineDiv, get_EDITOR_textElement().children[relativeIndexLine]);
            get_EDITOR_textElement().removeChild(removingVisuallyDiv);
        }

        if (cursor.cached_indentation_byteList) {
            insertionCount += cursor.cached_indentation_byteList.count;
        }

        EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount);

        if (ctrlKey) {
            cursor.indexColumn = insertionCount - 1;
        }
        else {
            cursor.indexLine++;
            cursor.indexColumn = insertionCount - 1;
        }

        EDITOR_lineWasInsertedValidateGutter();

        cursor.editLength = insertionCount;
        return;
    }
    else {
         if (!shouldRenderEntireViewport) {

            // ensure this conditional branch returns if handled, otherwise it will execute the fallback case erroneously
            
            let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
            if (lastValidIndexColumn === cursor.indexColumn) { // end of line
                cursor.enterKeyEventKind = get_EnterKeyEventKind_EndOfLine();
                let lineDiv;
                let removingVisuallyDiv;

                if (relativeIndexLine === matched_indexLine_last) {
                    if (relativeIndexLine === 0) {
                        lineDiv = null;
                        removingVisuallyDiv = null; // No div above you to remove
                    }
                    else {
                        lineDiv = EDITOR_getNewAndEmptyLineElement();
                        removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_first];
                    }
                }
                else {
                    lineDiv = EDITOR_getNewAndEmptyLineElement();
                    removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_last];
                }

                if (lineDiv) {
                    lineDiv.children[0].innerText = cursor.cached_indentation_string;
                    // TODO: wrap around suspect?
                    get_EDITOR_textElement().insertBefore(lineDiv, get_EDITOR_textElement().children[relativeIndexLine + 1]);
                    get_EDITOR_textElement().removeChild(removingVisuallyDiv);
                }
                
                if (cursor.cached_indentation_byteList) {
                    insertionCount += cursor.cached_indentation_byteList.count;
                }

                EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount);

                cursor.indexLine++;
                cursor.indexColumn = insertionCount - 1;

                EDITOR_lineWasInsertedValidateGutter();

                cursor.editLength = insertionCount;
                return;
            }
            else { // among a line
                cursor.enterKeyEventKind = get_EnterKeyEventKind_AmongALine();
                let lineDiv;
                let removingVisuallyDiv;

                if (relativeIndexLine === matched_indexLine_last) {
                    if (relativeIndexLine === 0) {
                        lineDiv = null;
                        removingVisuallyDiv = null; // No div above you to remove
                    }
                    else {
                        lineDiv = EDITOR_getNewAndEmptyLineElement();
                        removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_first];
                    }
                }
                else {
                    lineDiv = EDITOR_getNewAndEmptyLineElement();
                    removingVisuallyDiv = get_EDITOR_textElement().children[matched_indexLine_last];
                }

                if (lineDiv) {
                    lineDiv.children[0].innerText = cursor.cached_indentation_string;
                    let w = walkLineUntilColumnIndex(cursor);

                    let shouldPreserveCssClassWhenSplittingAmongLine = false;
                    
                    if (!ctrlKey && !shiftKey) { // Is this '!ctrlKey && !shiftKey' check redundant? I feel like this conditional branch would never be reached regardless.
                        switch (w.span.className) {
                            case 'eCm':
                                if (w.indexColumn_SpanTextContentRelative >= 2 && (w.indexColumn_SpanTextContentRelative <= w.span.textContent.length - 2)) {
                                    w.span.className = 'eCM';
                                    let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
                                    EDITOR_trackedSyntaxList.insert(
                                        indexOfGreaterThanOrEqual,
                                        TrackedSyntaxKind.Comment,
                                        indexPosition - cursor.indexColumn + w.indexColumn_Sum,
                                        w.span.textContent.length);
                                    shouldPreserveCssClassWhenSplittingAmongLine = true;
                                }
                                break;
                            case 'eCM':
                                shouldPreserveCssClassWhenSplittingAmongLine = true;
                                break;
                            case 'eSm':
                                if (w.indexColumn_SpanTextContentRelative >= 1 && (w.indexColumn_SpanTextContentRelative <= w.span.textContent.length - 1)) {
                                    w.span.className = 'eSM';
                                    let indexOfGreaterThanOrEqual = EDITOR_trackedSyntaxReposition_find(indexPosition);
                                    EDITOR_trackedSyntaxList.insert(
                                        indexOfGreaterThanOrEqual,
                                        TrackedSyntaxKind.String,
                                        indexPosition - cursor.indexColumn + w.indexColumn_Sum,
                                        w.span.textContent.length);
                                    shouldPreserveCssClassWhenSplittingAmongLine = true;
                                }
                                break;
                            case 'eSM':
                                shouldPreserveCssClassWhenSplittingAmongLine = true;
                                break;
                        }
                    }
                    
                    if (w.indexColumn_Goal > 0) {
                        if (w.indexColumn_Goal !== w.indexColumn_Sum + w.span.textContent.length) {
                            let firstText = w.span.textContent.substring(0, w.indexColumn_SpanTextContentRelative);
                            let lastText = w.span.textContent.substring(w.indexColumn_SpanTextContentRelative);
                            w.span.innerText = firstText;
                            if (shouldPreserveCssClassWhenSplittingAmongLine) {
                                lineDiv.children[0].className = w.span.className;
                                lineDiv.children[0].innerText += lastText;
                            }
                            else {
                                let span = document.createElement('span');
                                span.innerText = lastText;
                                lineDiv.appendChild(span);
                            }
                        }
                        
                        let rememberIndex = w.indexSpan + 1;
                        let rememberLength = w.div.children.length;
                        for (let i = rememberIndex; i < rememberLength; i++) {
                            lineDiv.appendChild(w.div.children[rememberIndex]);
                        }
                    }
                    // TODO: wrap around suspect?
                    get_EDITOR_textElement().insertBefore(lineDiv, get_EDITOR_textElement().children[relativeIndexLine + 1]);
                    get_EDITOR_textElement().removeChild(removingVisuallyDiv);
                }
                
                if (cursor.cached_indentation_byteList) {
                    insertionCount += cursor.cached_indentation_byteList.count;
                }

                EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount);

                cursor.indexLine++;
                cursor.indexColumn = insertionCount - 1;

                EDITOR_lineWasInsertedValidateGutter();

                cursor.editLength = insertionCount;
                return;
            }
         }

        // TODO: You cannot do the fallback case anywhere because it relies on the edit being finalized.

        // fallback case
        cursor.enterKeyEventKind = get_EnterKeyEventKind_FallbackCase();

        // fallback to inefficient viewport redraw if previous cases can't optimally render
        if (cursor.cached_indentation_byteList) {
            insertionCount += cursor.cached_indentation_byteList.count;
        }

        // TODO: I don't know how to test this one. This trackedSyntax repositioning in this case, a before and after of it working never was observed...
        // ...this is the same solution used elsewhere and it seems like it would work if I could replicate this case. I think I need a very small window height???
        //
        EDITOR_trackedSyntaxList_inefficientUpdateStartAndLength(indexPosition, insertionCount);

        cursor.indexLine++;
        cursor.indexColumn = insertionCount - 1;

        cursor.editLength = insertionCount;

        alert('get_EnterKeyEventKind_FallbackCase()');
    }
}

function EDITOR_onResize_WRAPIT() {
    const timeoutFunc = () => {
        if (/*trailing && lastArgs*/ EDITOR_onResize_bool) {
            EDITOR_onResize();
            EDITOR_onResize_bool = false;
            EDITOR_onResize_timer = setTimeout(timeoutFunc, 200);
        } else {
            EDITOR_onResize_timer = null;
        }
    };

	EDITOR_onResize_bool = true;
	
    if (!EDITOR_onResize_timer) {
        EDITOR_onResize_timer = setTimeout(timeoutFunc, 200);
    }
}

function EDITOR_onResize() {
    set_EDITOR_recentBoundingClientRect_isNull_intFalsey(1);
    let remember_virtualCount = get_EDITOR_virtualCount();
    update_virtualCount();
    if (get_EDITOR_virtualCount() !== remember_virtualCount) {
        update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count + 1);
        EDITOR_onScroll();
        // # Redraw cursor selection virtualization
        // Code Duplication: # Redraw cursor selection virtualization... TODO: This is using 'EDITOR_primaryCursor' rather than 'EDITOR_cursorList[i]' so it is surely incorrect?
        for (let i = 0; i < EDITOR_cursorList.length; i++) {
            EDITOR_createStyleForSelection(EDITOR_primaryCursor);
        }
    }
    EDITOR_drawHorizontalScrollbar();
}

/**
 * You need to change this logic to know the longest line.
 * Then when the longest line changes or some such likely related to finalization of an edit (not pending edits).
 * then at that point you redraw this.
 */
function EDITOR_drawHorizontalScrollbar() {
    if (get_EDITOR_horizontal_scrollbar().style.left !== get_EDITOR_body().style.marginLeft) {
        get_EDITOR_horizontal_scrollbar().style.left = get_EDITOR_body().style.marginLeft;
    }

    if (EDITOR_horizontal_scrollbar_widthValue !== (EDITOR_baseElement.clientWidth - get_EDITOR_gutterWidthTotal())) {
        EDITOR_horizontal_scrollbar_widthValue = EDITOR_baseElement.clientWidth - get_EDITOR_gutterWidthTotal();
        get_EDITOR_horizontal_scrollbar().style.width = EDITOR_horizontal_scrollbar_widthValue + 'px';
    }

    if (get_EDITOR_longestLine_length() !== get_EDITOR_longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar()) {
        set_EDITOR_longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar(get_EDITOR_longestLine_length());
        set_EDITOR_contentWidth(Math.ceil(get_EDITOR_longestLine_length() * EDITOR_characterWidth));
        get_EDITOR_horizontal_scrollbar_virtualization_boundary().style.width = get_EDITOR_contentWidth() + 'px';
        get_EDITOR_virtualization_horizontal().style.width = get_EDITOR_contentWidth() + get_EDITOR_gutterWidthTotal() + 'px';
    }
    
    // TODO: this is directly tied to a scroll event on EDITOR_baseElement so handle it from there perhaps?
    // TODO: this code is duplicated inside EDITOR_onScroll when it returns early due to nothing vertically having changed, reduce duplication?
    if (get_EDITOR_horizontal_scrollbar().scrollLeft !== EDITOR_baseElement.scrollLeft) {
        get_EDITOR_horizontal_scrollbar().scrollLeft = EDITOR_baseElement.scrollLeft;
    }
}

function EDITOR_onScroll_WRAPIT() {
	set_EDITOR_onScroll_bool(true);
	
    if (!EDITOR_timer) {
        if (true /*options.leading*/) {
            EDITOR_onScroll();
        }
        EDITOR_timer = setTimeout(EDITOR_onScroll_timeoutFunc, 100);
    }
}

function EDITOR_onScroll_timeoutFunc() {
    if (/*trailing && lastArgs*/ get_EDITOR_onScroll_bool()) {
        set_EDITOR_onScroll_bool(false);
        EDITOR_onScroll();
        EDITOR_timer = setTimeout(EDITOR_onScroll_timeoutFunc, 100);
    } else {
        EDITOR_timer = null;
        // Code Duplication: # Redraw cursor selection virtualization... TODO: This is using 'EDITOR_primaryCursor' rather than 'EDITOR_cursorList[i]' so it is surely incorrect?
        for (let i = 0; i < EDITOR_cursorList.length; i++) {
            EDITOR_createStyleForSelection(EDITOR_primaryCursor);
        }
    }
}

/**
 * TODO: Too many verbose comments that are just ramblings
 */
function EDITOR_onScroll() {
	EDITOR_finalizeAllCursors();
    update_VirtualLineIndex();

    if (get_EDITOR_ONSCROLLscrollTop() === EDITOR_baseElement.scrollTop &&
        get_EDITOR_ONSCROLLvirtualLineIndex() === get_EDITOR_virtualLineIndex() &&
        get_EDITOR_ONSCROLLvirtualCount() === get_EDITOR_virtualCount()) {
            // TODO: this is directly tied to a scroll event on EDITOR_baseElement so handle it from there perhaps?
            // TODO: this code is duplicated inside EDITOR_drawHorizontalScrollbar, reduce duplication?
            if (get_EDITOR_horizontal_scrollbar().scrollLeft !== EDITOR_baseElement.scrollLeft) {
                get_EDITOR_horizontal_scrollbar().scrollLeft = EDITOR_baseElement.scrollLeft;
            }
            return;
    }

    set_EDITOR_ONSCROLLscrollTop(EDITOR_baseElement.scrollTop);

    // If I delay setting 'set_EDITOR_ONSCROLLvirtualLineIndex()' then I can just use that.
    // I can't bear to do that right now though. I'm just gonna make this variable.
    let prevVli = get_EDITOR_ONSCROLLvirtualLineIndex();
    let currVli = get_EDITOR_virtualLineIndex();

    set_EDITOR_ONSCROLLvirtualLineIndex(get_EDITOR_virtualLineIndex());

    if (get_EDITOR_ONSCROLLvirtualCount() !== get_EDITOR_virtualCount() ||
        get_EDITOR_gutter().children.length !== get_EDITOR_virtualCount() ||
        get_EDITOR_textElement().children.length !== get_EDITOR_virtualCount()) {
            // Force case 3
            prevVli = 0;
            currVli = get_EDITOR_virtualCount();

            EDITOR_createViewport();
    }

    if (get_EDITOR_ONSCROLLvirtualCount() === get_EDITOR_virtualCount() &&
        get_EDITOR_gutter().children.length === get_EDITOR_virtualCount() &&
        get_EDITOR_textElement().children.length === get_EDITOR_virtualCount()) {

        // The same count of lines is on the UI so you can probably
        // redraw them one by one and save "some" of the existing HTML.

        let diff = currVli - prevVli;

        let onePositiveDiff_twoNegativeDiff_orThreeFullScreen;

        let trackedSyntax_I;
        let lowerBound;
        let upperBound;
        let loopCounter = 0;
        //let baseIndex;
        let vertical;
        let origin;
        let lastIndex; // TODO: lastIndex can probably be origin?

        if (diff > 0 && diff < get_EDITOR_virtualCount()) {
            onePositiveDiff_twoNegativeDiff_orThreeFullScreen = 1;
            // firstIndexLineThatWasNotAlreadyRendered
            trackedSyntax_I = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(prevVli + get_EDITOR_ONSCROLLvirtualCount());
            lowerBound = prevVli + get_EDITOR_ONSCROLLvirtualCount();
            upperBound = lowerBound + diff;

            vertical = (prevVli + get_EDITOR_virtualCount()) * get_EDITOR_lineHeight();
            origin = EDITOR_domLineNodesZerothIndex;

            EDITOR_domLineNodesZerothIndex = origin + diff;
            if (EDITOR_domLineNodesZerothIndex >= get_EDITOR_textElement().children.length) {
                EDITOR_domLineNodesZerothIndex -= get_EDITOR_textElement().children.length;
            }
        }
        else if (diff < 0 && (diff *= -1) < get_EDITOR_virtualCount()) {
            onePositiveDiff_twoNegativeDiff_orThreeFullScreen = 2;
            trackedSyntax_I = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(currVli);
            lowerBound = currVli;
            upperBound = lowerBound + diff;

            vertical = currVli * get_EDITOR_lineHeight();
            
            if (EDITOR_domLineNodesZerothIndex === 0) {
                lastIndex = get_EDITOR_textElement().children.length - 1;
            }
            else {
                lastIndex = EDITOR_domLineNodesZerothIndex - 1;
            }
            EDITOR_domLineNodesZerothIndex = lastIndex - (diff - 1);

            if (EDITOR_domLineNodesZerothIndex < 0) {
                EDITOR_domLineNodesZerothIndex += get_EDITOR_textElement().children.length;
            }

            origin = EDITOR_domLineNodesZerothIndex;
        }
        else {
            onePositiveDiff_twoNegativeDiff_orThreeFullScreen = 3;
            trackedSyntax_I = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(get_EDITOR_virtualLineIndex());
            lowerBound = get_EDITOR_virtualLineIndex();
            upperBound = lowerBound + get_EDITOR_virtualCount();

            vertical = get_EDITOR_virtualLineIndex() * get_EDITOR_lineHeight();
            origin = EDITOR_domLineNodesZerothIndex;
        }

        if (trackedSyntax_I === NaN || trackedSyntax_I === -1) {
            trackedSyntax_I = EDITOR_trackedSyntaxList.count_abstract;
        }

        for (var indexLine = lowerBound; indexLine < upperBound; indexLine++) {
            let transform = `translateY(${vertical}px)`;

            let div;
            let gutter;

            vertical += get_EDITOR_lineHeight();

            let aaa = origin + loopCounter;
            if (aaa >= get_EDITOR_textElement().children.length) {
                aaa -= get_EDITOR_textElement().children.length;
            }

            gutter = get_EDITOR_gutter().children[aaa];
            div = get_EDITOR_textElement().children[aaa];
            loopCounter++;

            gutter.innerText = indexLine >= EDITOR_lineEndPositionList.count
                ? '~'
                : indexLine + 1;

            gutter.style.transform = transform;
            div.style.transform = transform;

            let lineStart;
            let lineEnd;
            if (indexLine < EDITOR_lineEndPositionList.count) {
                if (indexLine === 0) {
                    lineStart = 0;
                    lineEnd = EDITOR_lineEndPositionList.data[indexLine] - 0;
                }
                else {
                    lineStart = (EDITOR_lineEndPositionList.data[indexLine - 1] + 1);
                    lineEnd = EDITOR_lineEndPositionList.data[indexLine];
                }
            }
            else {
                lineStart = 0;
                lineEnd = 0;
            }

            trackedSyntax_I = EDITOR_createSpansForLineOfText(div, lineStart, lineEnd, trackedSyntax_I);
        }

        EDITOR_drawHorizontalScrollbar();
    }
}

function EDITOR_createViewport() {
    set_EDITOR_ONSCROLLvirtualCount(get_EDITOR_virtualCount());

    get_EDITOR_gutter().innerHTML = '';
    get_EDITOR_textElement().innerHTML = '';
    let trackedSyntax_StartingIndex = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(0 + get_EDITOR_virtualLineIndex());
    if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) {
        trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract;
    }

    let trackedSyntax_I = trackedSyntax_StartingIndex;

    EDITOR_domLineNodesZerothIndex = 0;

    let top = get_EDITOR_virtualLineIndex();

    for (var i = 0; i < get_EDITOR_virtualCount(); i++) {
        let transform = `translateY(${top}px)`;

        let indexLine = i + get_EDITOR_virtualLineIndex();

        // EDITOR_drawGutter_Content()
        let gutterLineElement = document.createElement('div');
        if (indexLine >= EDITOR_lineEndPositionList.count) {
            gutterLineElement.innerText = '~';
        }
        else {
            gutterLineElement.innerText = indexLine + 1;
        }
        gutterLineElement.className = 'eG';
        get_EDITOR_gutter().appendChild(gutterLineElement);
        gutterLineElement.style.transform = transform;

        // EDITOR_drawText()
        let line = EDITOR_getLineBoundaryPositions(indexLine);
        let div = document.createElement('div');
        div.className = 'eT';
        get_EDITOR_textElement().appendChild(div);
        div.style.transform = transform;

        top += get_EDITOR_lineHeight();
    }
    EDITOR_drawHorizontalScrollbar();
}

/**
 * If you were to make a function for this logic, it presumably would look like this.
 * I'm not sure if I like the idea of having a function for this though, given it is inside a loop, I'd want to investigate whether it has any performance impacts.
 * TODO: make a decision
 * 
 * @param line is the result from 'EDITOR_getLineBoundaryPositions(...)'
 * 
 * @returns trackedSyntax_I the index that was left off on
 */
function EDITOR_createSpansForLineOfText(div, lineStart, lineEnd, trackedSyntax_I) {
	let childIndex = 0;

    if (lineStart === lineEnd) {
    	if (childIndex < div.children.length) {
            let span = div.children[childIndex++];
			span.innerText = '';
            span.className = '';
		}
		else {
			div.appendChild(document.createElement('span'));
            childIndex++;
		}
    }
    else {
        let substart = lineStart;
        for (; trackedSyntax_I < EDITOR_trackedSyntaxList.count_abstract;) {
            EDITOR_trackedSyntaxList.getElementAt(trackedSyntax_I);
    
            if (substart >= lineEnd) {
                break;
            }
    
            if (get_EDITOR_pooledTrackedSyntax_start() >= lineEnd) {
                break;
            }
    
            if (get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() < lineStart) {
                trackedSyntax_I++;
                continue;
            }
    
            if (get_EDITOR_pooledTrackedSyntax_start() > substart) {
                let subend = get_EDITOR_pooledTrackedSyntax_start() > lineEnd ? lineEnd : get_EDITOR_pooledTrackedSyntax_start(); // probably a nonsense line of code given the previous if statements
                childIndex = EDITOR_language_line_lex(div, substart, subend, childIndex);
                substart += (subend - substart);
            }
    
            {
                let span;
                if (childIndex < div.children.length) {
					span = div.children[childIndex++];
                    //span.className = ''; className is guaranteed to be set in this specific case
				}
				else {
					span = document.createElement('span');
                    div.appendChild(span);
                    childIndex++;
				}
                let trackedSyntaxEnd = get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length();
                let subend = trackedSyntaxEnd > lineEnd ? lineEnd : trackedSyntaxEnd;
                span.innerText = EDITOR_decoder.decode(EDITOR_textByteList.bytes.subarray(substart, subend));
                substart += (subend - substart);
                switch (EDITOR_pooledTrackedSyntax_trackedSyntaxKind) {
                    case TrackedSyntaxKind.Comment:
                        span.className = 'eCM';
                        break;
                    case TrackedSyntaxKind.String:
                        span.className = 'eSM';
                        break;
                    default:
                        span.className = '';
                        break;
                }
            }
    
            if (get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() <= lineEnd) {
                trackedSyntax_I++;
                continue;
            }
    
            break;
        }
    
        if (substart < lineEnd) {
            childIndex = EDITOR_language_line_lex(div, substart, lineEnd, childIndex);
        }
    }

    let aaa = div.children.length - childIndex;
    for (let i = 0; i < aaa; i++) {
        div.removeChild(div.children[childIndex]);
    }

    return trackedSyntax_I;
}

function EDITOR_REMOVE_line_drawGutter(linesRemovedCount) {

    //EDITOR_finalizeAllCursors();

    // It's actually something about current undershoot vs overshoot incoming to undershoot or sometrhing
    // !!!!!!!!
    // it's let largestDrawnIndexLine = get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1;
    // not what is below this line
    // todo remove this confusing and misleading commented dead code that has the or maybe I idk
    // largestDrawnIndexLine + linesRemovedCount ? EDITOR_lineEndPositionList.count

    let matched_indexLine_last = EDITOR_getIndexLineToHtml_Correctly(get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1);

    if (get_EDITOR_gutter().children.length > 0 && get_EDITOR_gutter().children.length === get_EDITOR_virtualCount() && get_EDITOR_gutter().children.length === get_EDITOR_textElement().children.length) {
        if (get_EDITOR_gutter().children[matched_indexLine_last].innerText === '~') {
            let successFoundTildeAtIndex = matched_indexLine_last;
            // TODO: wrap around suspect?
            for (let i = matched_indexLine_last - 1; i >= 0; i--) {
                if (get_EDITOR_gutter().children[i].innerText === '~') {
                    successFoundTildeAtIndex = i;
                }
                else {
                    successFoundTildeAtIndex = i + 1;
                    break;
                }
            }
            for (var i = 0; i < linesRemovedCount; i++) {
                if (successFoundTildeAtIndex > i) {
                    get_EDITOR_gutter().children[successFoundTildeAtIndex - (i + 1)].innerText = '~';
                }
            }
        }
        else { // I don't have '~' in view

            // TODO: you need to check the non-selection-based-removes for bringing existing text into view via removal of a line
            
            let largestDrawnIndexLine = get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount();

            if (largestDrawnIndexLine + linesRemovedCount >= EDITOR_lineEndPositionList.count) {
                // but I'll bring one or more into view by doing the removal
                //let bbb = largestDrawnIndexLine + linesRemovedCount - (EDITOR_lineEndPositionList.count - 1);
                //let aaa = 2;
                //let successFoundTildeAtIndex = get_EDITOR_gutter().children.length - 1;
                //for (let i = get_EDITOR_gutter().children.length - 2; i >= 0; i--) {
                //    if (get_EDITOR_gutter().children[i].innerText === '~') {
                //        successFoundTildeAtIndex = i;
                //    }
                //    else {
                //        successFoundTildeAtIndex = i + 1;
                //        break;
                //    }
                //}
                //for (var i = 0; i < bbb; i++) {
                //    if (successFoundTildeAtIndex > i) {
                //        get_EDITOR_gutter().children[successFoundTildeAtIndex - (i + 1)].innerText = '~';
                //    }
                //}
            }
            else {
                // but the removal will NOT bring any into view.
            }
        }
    }

    // - [ ] If you are scrolled (vertical was the specific observation, horizontal was not tested) when you open a file, it bugs out and duplicates the text visually?

    EDITOR_drawGutter_Width();
}

/**
 * TODO: This function uses 'EDITOR_getLineAndColumnIndices' but it needs to be raw.
 * 
 * @param {EDITOR_Cursor} cursor 
 * @returns 
 */
function EDITOR_removeSelection(cursor) {
    // When you do the multicursor you would need to actually keep sorted the pending line end positions

    if (cursor.editKind != get_EditKind_None()) {
        // TODO: multicursor confusion scenario is likely to happy due to this code, but the code isn't related enough for me to change it yet.
        EDITOR_finalizeEdit(cursor);
    }

    let smallPosition;
    let largePosition;
    if (cursor.selectionAnchor < cursor.selectionEnd) {
        smallPosition = cursor.selectionAnchor;
        largePosition = cursor.selectionEnd;
    }
    else {
        smallPosition = cursor.selectionEnd;
        largePosition = cursor.selectionAnchor;
    }

    cursor.selectionAnchor = 0;
    cursor.selectionEnd = 0;

    let editLength = largePosition - smallPosition;
    // editLength is 0 in this ...startEdit invocation intentionally, you cannot set the editLength until the end (TODO: remember what the exact reason was and put it here... I think it was because 'EDITOR_readLineEndPositionList' function is used rather than reading directly)
    EDITOR_startEdit(cursor, get_EditKind_RemoveTextNoBatching(), smallPosition, /*editLength*/ 0);

    let smallLineAndColumnIndices = EDITOR_getLineAndColumnIndices(smallPosition);
    cursor.indexLine = smallLineAndColumnIndices.indexLine;
    cursor.indexColumn = smallLineAndColumnIndices.indexColumn;
    cursor.editIndexLine = smallLineAndColumnIndices.indexLine;
    cursor.editIndexColumn = smallLineAndColumnIndices.indexColumn;

    let largeLineAndColumnIndices = EDITOR_getLineAndColumnIndices(largePosition);
    cursor.END_editIndexLine = largeLineAndColumnIndices.indexLine;
    cursor.END_editIndexColumn = largeLineAndColumnIndices.indexColumn;

    let indexTrackedSyntax = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(cursor.indexLine);
    if (indexTrackedSyntax === NaN || indexTrackedSyntax === -1) {
        indexTrackedSyntax = EDITOR_trackedSyntaxList.count_abstract;
    }
    let possibleTrackedSyntaxToSpanSingleLine = false;
    if (indexTrackedSyntax < EDITOR_trackedSyntaxList.count_abstract) {
        EDITOR_trackedSyntaxList.getElementAt(indexTrackedSyntax);
        if (get_EDITOR_pooledTrackedSyntax_start() < EDITOR_lineEndPositionList.data[cursor.indexLine]) {
            possibleTrackedSyntaxToSpanSingleLine = true;
        }
        // TODO: This has no reason to be a for loop
        for (let i = cursor.indexLine - 1; i >= 0; i--) {
            let lineEndPosition = EDITOR_lineEndPositionList.data[i];
            if (get_EDITOR_pooledTrackedSyntax_start() < lineEndPosition &&
                get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() > lineEndPosition) {
                    possibleTrackedSyntaxToSpanSingleLine = false;
                    break;
            }
            else {
                break;
            }
        }
    }

    let linesRemovedCount = 0;
    // -1 since you can't remove EOF
    for (var iVarDependent = cursor.indexLine; iVarDependent < EDITOR_lineEndPositionList.count - 1; iVarDependent++) {
        // TODO: all of these reads need to be raw for this work with multicursor just remember that for tomorrow don't worry about this right now just focus on the one task but remember this for tomorrow.
        let lineEnding = EDITOR_readLineEndPositionList(iVarDependent);
        if (lineEnding >= cursor.editPosition && lineEnding < cursor.editPosition + editLength) {
            linesRemovedCount++;
            cursor.editLineFeedCount++;
            EDITOR_lineEndPositionList_PENDING.insert(EDITOR_lineEndPositionList_PENDING.count, lineEnding);

            if (possibleTrackedSyntaxToSpanSingleLine) {
                let NOTlineEndBelongsToSyntax;
                if (iVarDependent >= EDITOR_lineEndPositionList.count)
                    NOTlineEndBelongsToSyntax = true;
                else if (get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() <= EDITOR_lineEndPositionList.data[iVarDependent])
                    NOTlineEndBelongsToSyntax = true;
                
                if (NOTlineEndBelongsToSyntax) {
                    EDITOR_trackedSyntaxList.removeAt(indexTrackedSyntax, 1);

                    // do not increment because removed
                    possibleTrackedSyntaxToSpanSingleLine = false;
                    if (indexTrackedSyntax < EDITOR_trackedSyntaxList.count_abstract) {
                        EDITOR_trackedSyntaxList.getElementAt(indexTrackedSyntax);
                        if (get_EDITOR_pooledTrackedSyntax_start() < lineEnding &&
                            get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() > lineEnding) {
                                possibleTrackedSyntaxToSpanSingleLine = true;
                        }
                    }
                }
            }
        }
        else {
            break;
        }
    }

    if (linesRemovedCount > 0 && possibleTrackedSyntaxToSpanSingleLine) {
        // The next line end will NOT be removed, so you need to check whether it was encompassed by the possible syntax.
        //
        // Inside the for loop you need to do this when you exhaust the encompassed line ends for a given syntax and move to the next one too.
        //
        let NOTlineEndBelongsToSyntax;
        if (iVarDependent >= EDITOR_lineEndPositionList.count)
            NOTlineEndBelongsToSyntax = true;
        else if (get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() <= EDITOR_lineEndPositionList.data[iVarDependent])
            NOTlineEndBelongsToSyntax = true;
        
        if (NOTlineEndBelongsToSyntax)
            EDITOR_trackedSyntaxList.removeAt(indexTrackedSyntax, 1);
    }

    let finalLineEndPosition = EDITOR_readLineEndPositionList(cursor.indexLine + linesRemovedCount);
    let largestDrawnIndexLine = get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1;
    let visibleLinesRemovedCount = 0;

    // 5 stages
    // ========
    // - Remove selection on large position line
    // - Remove selection on small position line
    // - Visually merge the small position line and large position line (if applicable)
    // - Remove middle line(s)
    // - 'Draw lines that came into view' / 'clear text for any lines > text length and use a '~' in the gutter'

    // Remove selection on small position line
    let smallLineDiv = null;
    {
        cursor.indexLine = smallLineAndColumnIndices.indexLine;
        cursor.indexColumn = smallLineAndColumnIndices.indexColumn;

        let w = walkLineUntilColumnIndex(cursor);
        
        let lineBoundaryPositions = EDITOR_getLineBoundaryPositions(cursor.indexLine);
        let remaining;
        if (largePosition > lineBoundaryPositions.end) {
            remaining = lineBoundaryPositions.end - smallPosition;
        }
        else {
            remaining = largePosition - smallPosition;
        }

        if (w.span && w.indexColumn_SpanTextContentRelative >= 0) {
            smallLineDiv = w.div;
            while (remaining > 0) {
                let available = w.span.innerText.length - w.indexColumn_SpanTextContentRelative;
                let count = remaining > available ? available : remaining;
                remaining -= count;    
                
                if (count > 0) {
                    w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative + count);
                }

                if (w.div.children.length > 1 && w.span.innerText.length === 0) {
                    w.div.removeChild(w.span);
                }
                else {
                    w.indexSpan++;
                }
    
                if (remaining > 0) {
                    if (w.indexSpan >= w.div.children.length) break;
                    w.span = w.div.children[w.indexSpan];
                    w.indexColumn_SpanTextContentRelative = 0;
                }
            }
        }
    }

    // Remove selection on large position line
    let largeLineDiv = null;
    if (linesRemovedCount > 0) {
        cursor.indexLine = cursor.indexLine + linesRemovedCount;
        cursor.indexColumn = 0;

        let lineBoundaryPositions = EDITOR_getLineBoundaryPositions(cursor.indexLine);
        let remaining = largePosition - lineBoundaryPositions.start;

        let w = walkLineUntilColumnIndex(cursor);

        if (w.span && w.indexColumn_SpanTextContentRelative >= 0) {
            largeLineDiv = w.div;
            while (remaining > 0) {
                let available = w.span.innerText.length - w.indexColumn_SpanTextContentRelative;
                let count = remaining > available ? available : remaining;
                remaining -= count;

                if (count > 0)
                    w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative + count);

                if (w.div.children.length > 1 && w.span.innerText.length === 0)
                    w.div.removeChild(w.span);
                else
                    w.indexSpan++;
    
                if (remaining > 0) {
                    if (w.indexSpan >= w.div.children.length) break;
                    w.span = w.div.children[w.indexSpan];
                    w.indexColumn_SpanTextContentRelative = 0;
                }
            }
        }
    }

    // The line of text that comes into view depends on the cumulative lines removed by multicursors that came before or on that line

    // TODO: There's a presumption that you have the HTML, this isn't always the case so I'll have to revisit this

    // Merge the first and last lines (if applicable)
    //
    // Four cases of existence (!... implies it does NOT exist, i.e.: it is not rendered on the UI)
    // =======================
    // - [ ] keeping, removing
    // - [ ] keeping, !removing
    // - [ ] !keeping, removing
    // - [ ] !keeping, !removing
    //
    // - [ ] Ensure all 4 cases of existence handle 'EDITOR_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor);'
    //
    if (linesRemovedCount > 0) {
        cursor.indexLine = smallLineAndColumnIndices.indexLine;
        cursor.indexColumn = smallLineAndColumnIndices.indexColumn;

        if (smallLineDiv) {
            if (largeLineDiv) { // - [x] keeping, removing
                let rememberLargeLineDivLength = largeLineDiv.children.length;
                for (var i = 0; i < rememberLargeLineDivLength; i++) {
                    if (largeLineDiv.children[0].innerText.length > 0) {
                        smallLineDiv.appendChild(largeLineDiv.children[0]);
                    }
                    else {
                        largeLineDiv.removeChild(largeLineDiv.children[0]);
                    }
                }
                visibleLinesRemovedCount++;
                largeLineDiv.innerHTML = '';
                get_EDITOR_textElement().appendChild(largeLineDiv);
            }
            else { // - [ ] keeping, !removing

            }
        }
        else {
            if (largeLineDiv) { // - [ ] !keeping, removing
                
            }
            else { // - [ ] !keeping, !removing
                
            }
        }
        
        /*if (smallIndexLine < get_EDITOR_textElement().children.length && smallIndexLine >= 0) {
            
            let smallLineDiv = get_EDITOR_textElement().children[smallIndexLine];


            // Goal: If you have the line that the selection's small position is on (the keeping div)
            // then you need to get the text for the line that the selection's large position is on (the removing div).
            //
            // The goal splits into two cases:
            //
            // - If the line that the selection's large position is on exists in the viewport,
            // then you can move the HTML from the div that represents that line,
            // to the div that represents the line that the selection's small position is on.
            //
            // - If the line that the selection's large position is on does NOT exist in the viewport,
            // then you need to generate the HTML for the line's text and add it
            // to the div that represents the line that the selection's small position is on.
            // 
            // Funnily enough I might be able to just invoke 'EDITOR_drawLine(...)'.
            //
            // The function has a very frustrating quirk where the invoker has to
            // provide the div that the HTML gets appended to.
            // 
            // In addition to that, if you want to redraw the line,
            // the invoker has to set 'innerHTML' to '' prior to invoking the function.
            //
            // But this might mean I can invoke 'EDITOR_drawLine(...)'
            // without setting 'innerHTML' to '', and this would append the text of that line...
            //
            // Although I'm presuming that I'd generate the HTML
            // prior to modifying the line end position indices.
            //
            // In the current state of the code, this merging of the small and large lines
            // is done AFTER already having modified the line end position indices.


            let removingDiv = get_EDITOR_textElement().children[largeIndexLine];
            let rememberRemovingDivLength = removingDiv.children.length;

            for (var i = 0; i < rememberRemovingDivLength; i++) {
                if (removingDiv.children[0].innerText.length > 0) {
                    smallLineDiv.appendChild(removingDiv.children[0]);
                }
                else {
                    removingDiv.removeChild(removingDiv.children[0]);
                }
            }

            visibleLinesRemovedCount++;
            removingDiv.innerHTML = '';
            get_EDITOR_textElement().appendChild(removingDiv);
        }*/
    }

    // Remove middle line(s)
    if (linesRemovedCount > 0) {
        cursor.indexLine = smallLineAndColumnIndices.indexLine;
        // WARNING: This loop does NOT run for the small line, the small line is handled as a separate case (the case where the small and large lines are merged visually if applicable).

        for (var i = linesRemovedCount - 1; i > 0; i--) {
            let indexLine = cursor.indexLine + i;
            let relativeLineIndex = EDITOR_getIndexLineToHtml_Correctly(indexLine);
            if (relativeLineIndex < 0) {
                continue;
            }

            visibleLinesRemovedCount++;
            let textLineElement = get_EDITOR_textElement().children[relativeLineIndex];
            textLineElement.innerHTML = '';
            get_EDITOR_textElement().appendChild(textLineElement);
        }
    }

    cursor.editLength = editLength;

    // 'Draw lines that came into view' / 'clear text for any lines > text length and use a '~' in the gutter'
    if (linesRemovedCount > 0) {

        // off by 1 character
        //
        // Finalizing all cursors fixes the issue... but why was it off by 1 character?
        // 
        // TODO: this needs to be understood but delaying the finalization of an edit is more along the lines of an optimization...
        // ...versus selecting and removing text which needs to work properly both in terms of editing the text and visually displaying the correct result.
        // 
        EDITOR_finalizeAllCursors();

        // 3 cases (TODO: Ensure these for backspace and delete)
        // =======
        // - [ ] inViewTildeCase
        // - [ ] comesIntoViewDueToRemovalTildeCase
        // - [ ] notInViewTildeCase
        //
        // Each case might be the same solution I don't know I just need time to think I'm completely exhausted but ima figure it out by just typing everything out and overtime it will happen
        // 

        let matched_indexLine_last = EDITOR_getIndexLineToHtml_Correctly(get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1);

        if (get_EDITOR_textElement().children.length === get_EDITOR_gutter().children.length) {
            for (let i = 0; i < visibleLinesRemovedCount; i++) {
                // TODO: wrap around suspect?
                let gutterLineElement = get_EDITOR_gutter().children[matched_indexLine_last - i];
                gutterLineElement.innerHTML = ''; // I don't believe this will have already been cleared.
                // TODO: wrap around suspect?
                let textLineElement = get_EDITOR_textElement().children[matched_indexLine_last - i];
                textLineElement.innerHTML = ''; // Might already be cleared, furthermore might ALWAYS be cleared.
                EDITOR_drawLine(largestDrawnIndexLine - i, gutterLineElement, textLineElement);
            }
        }

        EDITOR_drawGutter_Width();

        // TODO: 'update_verticalVirtualizationBoundary(EDITOR_lineEndPositionList.count);'?
        // TODO: EDITOR_REMOVE_line_drawGutter(linesRemovedCount);
    }
    
    cursor.STORED_indexColumn = cursor.indexColumn;
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} event 
 * @returns 
 */
function EDITOR_deleteDo(cursor, event) {
    if (cursor.hasSelection()) {
        EDITOR_removeSelection(cursor);
        return;
    }

    // raw?
    let lineEnd = EDITOR_getLineEnd_pos(cursor.indexLine);
    let lastValidIndexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);

    let w = walkLineUntilColumnIndex(cursor);
    if (w.indexColumn_Goal == lastValidIndexColumn) {

        if (cursor.indexLine < EDITOR_lineEndPositionList.count - 1) {
            cursor.editLength++;

            if (w.span.className === 'eCM') {
                EDITOR_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor);
            }

            // NOT start of file, remove the line ending and join the lines

            // Visually, immediately merge the lines if both are visible.
            let matched_PREVIOUS_indexLine = EDITOR_getIndexLineToHtml_Correctly(cursor.indexLine + 1);
            if (matched_PREVIOUS_indexLine >= 0) {
                let keepingDiv = w.div;
                let removingDiv = get_EDITOR_textElement().children[matched_PREVIOUS_indexLine];

                let rememberRemovingDivLength = removingDiv.children.length;
                for (var i = 0; i < rememberRemovingDivLength; i++) {
                    if (removingDiv.children[0].innerText.length > 0) {
                        keepingDiv.appendChild(removingDiv.children[0]);
                    }
                    else {
                        removingDiv.removeChild(removingDiv.children[0]);
                    }
                }

                // TODO: This is NOT an optimal solution to removing the empty span after joining the lines
                if (keepingDiv.children.length > 1 && keepingDiv.children[0].innerText.length === 0) {
                    keepingDiv.removeChild(keepingDiv.children[0]);
                }
    
                removingDiv.appendChild(document.createElement('span'));
                get_EDITOR_textElement().appendChild(removingDiv);

                // EDITOR_drawLine: copy, paste, modify; TODO: deduplicate this paragraph that redraws the final line in the viewport?
                let largestDrawnIndexLine = get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1;
                let trackedSyntax_StartingIndex = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(largestDrawnIndexLine);
                if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) {
                    trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract;
                }
                let line = EDITOR_getLineBoundaryPositions(largestDrawnIndexLine);
                EDITOR_createSpansForLineOfText(removingDiv, line.start, line.end, trackedSyntax_StartingIndex);
            }

            cursor.editLineFeedCount++;
            EDITOR_lineEndPositionList_PENDING.insert(EDITOR_lineEndPositionList_PENDING.count, lineEnd);
            EDITOR_REMOVE_line_drawGutter(1);
            
            // TODO: temp and bad idea.
            EDITOR_finalizeAllCursors();
        }
        else {
            // Start of file
            // nothing?
        }
    }
    else {
        let remaining = 1;

        if (event.ctrlKey) {
            // cursor.editPosition is intended to be equal due to the batch requirements / a new edit would also be equal.
            let tempColumnIndex = cursor.indexColumn;
            let tempPosition = cursor.editPosition;

            let originalCharacterKind = EDITOR_getCharacterCurrent_KIND(tempColumnIndex, tempPosition, lineEnd);
            
            tempColumnIndex++;
            tempPosition++;
            
            while (cursor.indexColumn < lastValidIndexColumn) {
                if (EDITOR_getCharacterCurrent_KIND(tempColumnIndex, tempPosition, lineEnd) !== originalCharacterKind) {
                    break;
                }
                tempColumnIndex++;
                tempPosition++;
                remaining++;
            }
        }

        if (!w.span|| !w.span.innerText || w.indexColumn_SpanTextContentRelative < 0) {
            cursor.editLength += remaining;
        }
        else {
            // TODO: The shared "remove" method would likely look something like this 'while (remaining ...)' logic...
            // ...and also have to include the line ending removal logic
            while (remaining > 0) {
                let available = w.span.innerText.length - w.indexColumn_SpanTextContentRelative;
                let count = remaining > available ? available : remaining;
                remaining -= count;
    
                // When the cursor is at the end of a span, there is no text to delete, because the text starts in the next span.
                if (count > 0) {
                    // this is probably wrong
                    w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative + count);
                    cursor.editLength += count;
                }

                if (w.div.children.length > 1 && w.span.innerText.length === 0) {
                    w.div.removeChild(w.span);
                }
                else {
                    w.indexSpan++;
                }
    
                if (remaining > 0) {
                    if (w.indexSpan >= w.div.children.length) return;
                    
                    w.span = w.div.children[w.indexSpan];
                    w.indexColumn_SpanTextContentRelative = 0;
                }
            }
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {*} event 
 * @returns 
 */
function EDITOR_backspaceDo(cursor, event) {
    if (cursor.hasSelection()) {
        EDITOR_removeSelection(cursor);
        return;
    }

    let w = walkLineUntilColumnIndex(cursor);
    
    if (w.indexColumn_Goal == 0) {
        if (cursor.indexLine > 0) {
            let rememberLineIndex = cursor.indexLine;

            // TODO: multicursor bugs are more likely to occur with this logic:
            // TODO: this logic is extremely suspect given editIndexLine and editIndexColumn...
            // ...as well if you move the cursor during a pending edit then finalize does it edit the correct positions?
            //
            // wrap to previous line
            cursor.indexLine--;
            cursor.indexColumn = EDITOR_getLastValidIndexColumn(cursor.indexLine);
            cursor.editPosition--;
            cursor.editLength++;

            if (w.span.className === 'eCM') {
                EDITOR_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor);
            }

            // Visually, immediately merge the lines if both are visible.
            let matched_PREVIOUS_indexLine = EDITOR_getIndexLineToHtml_Correctly(rememberLineIndex - 1);
            if (matched_PREVIOUS_indexLine >= 0) {
                let keepingDiv = get_EDITOR_textElement().children[matched_PREVIOUS_indexLine];
                let removingDiv = w.div;

                let rememberRemovingDivLength = removingDiv.children.length;
                for (var i = 0; i < rememberRemovingDivLength; i++) {
                    if (removingDiv.children[0].innerText.length > 0) {
                        keepingDiv.appendChild(removingDiv.children[0]);
                    }
                    else {
                        removingDiv.removeChild(removingDiv.children[0]);
                    }
                }

                // TODO: This is NOT an optimal solution to removing the empty span after joining the lines
                if (keepingDiv.children.length > 1 && keepingDiv.children[0].innerText.length === 0) {
                    keepingDiv.removeChild(keepingDiv.children[0]);
                }

                removingDiv.appendChild(document.createElement('span'));
                get_EDITOR_textElement().appendChild(removingDiv);

                // EDITOR_drawLine: copy, paste, modify; TODO: deduplicate this paragraph that redraws the final line in the viewport?
                let largestDrawnIndexLine = get_EDITOR_virtualLineIndex() + get_EDITOR_virtualCount() - 1;
                let trackedSyntax_StartingIndex = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(largestDrawnIndexLine);
                if (trackedSyntax_StartingIndex === NaN || trackedSyntax_StartingIndex === -1) {
                    trackedSyntax_StartingIndex = EDITOR_trackedSyntaxList.count_abstract;
                }
                let line = EDITOR_getLineBoundaryPositions(largestDrawnIndexLine);
                EDITOR_createSpansForLineOfText(removingDiv, line.start, line.end, trackedSyntax_StartingIndex);
            }

            cursor.editLineFeedCount++;
            EDITOR_lineEndPositionList_PENDING.insert(EDITOR_lineEndPositionList_PENDING.count, cursor.editPosition);
            EDITOR_REMOVE_line_drawGutter(1);

            // TODO: temp and bad idea.
            EDITOR_finalizeAllCursors();
        }
        else {
            // Start of file
            // nothing?
        }
    }
    else {
        let remaining = 1;

        if (event.ctrlKey) {
            // cursor.editPosition is intended to be equal due to the batch requirements / a new edit would also be equal.
            let originalCharacterKind = EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, cursor.editPosition);
            cursor.indexColumn--;
            cursor.editPosition--;
            //cursor.editIndexLine--;
            cursor.editIndexColumn--;

            while (cursor.indexColumn > 0) {
                if (EDITOR_getCharacterPrevious_KIND(cursor.indexColumn, cursor.editPosition) !== originalCharacterKind) {
                    break;
                }
                cursor.indexColumn--;
                cursor.editPosition--;
                //cursor.editIndexLine--;
                cursor.editIndexColumn--;
                remaining++;
            }
        }
        else {
            cursor.indexColumn -= 1;
            cursor.editPosition -= 1;
            //cursor.editIndexLine -= 1;
            cursor.editIndexColumn -= 1;
        }

        if (!w.span || !w.span.innerText || w.indexColumn_SpanTextContentRelative < 0) {
            cursor.editLength += remaining;
        }
        else {
            // TODO: The shared "remove" method would likely look something like this 'while (remaining ...)' logic...
            // ...and also have to include the line ending removal logic
            while (remaining > 0) {
                let count = remaining > w.indexColumn_SpanTextContentRelative ? w.indexColumn_SpanTextContentRelative : remaining;
                remaining -= count;
    
                // this is probably wrong
                w.span.innerText = w.span.innerText.slice(0, w.indexColumn_SpanTextContentRelative - count) + w.span.innerText.slice(w.indexColumn_SpanTextContentRelative);
    
                cursor.editLength += count;

                if (w.div.children.length > 1 && w.span.innerText.length === 0) {
                    w.div.removeChild(w.span);
                }
                
                w.indexSpan--;
    
                if (remaining > 0) {
                    if (w.indexSpan < 0) return;
    
                    w.span = w.div.children[w.indexSpan];
                    w.indexColumn_SpanTextContentRelative = w.span.innerText.length;
                }
            }
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 * @param {string} character 
 */
function EDITOR_insertDo(cursor, character) {
    /*
    TODO: (optimization idea) if you are inserting at the 0th or length position it might be worthwhile
    to have a conditional branch make the innerText with 1 less slice invocation.

    TODO: (optimization idea) I'm going to get this less optimized version to work, but you might want to
    make a copy of the span so you only have to "insert" text to the end of the span.
    And then this removes 1 of the slice invocations, rather than inserting "possibly" among the existing innerText.
    */
    
    if (cursor.gapBufferWriteToSpanElement !== EDITOR_offsetWithinSpan_withRespectToThisSpan) {
        set_EDITOR_offsetWithinSpan(0);
        EDITOR_offsetWithinSpan_withRespectToThisSpan = cursor.gapBufferWriteToSpanElement;
    }

    if (cursor.gapBufferWriteToSpanElement) {
        cursor.gapBufferWriteToSpanElement.innerText = 
            cursor.gapBufferWriteToSpanElement.innerText.slice(0, (cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex + get_EDITOR_offsetWithinSpan()) + cursor.gapBufferCount) +
            character +
            cursor.gapBufferWriteToSpanElement.innerText.slice((cursor.gapBufferWriteToSpanElement_SpanTextContentRelativeIndex + get_EDITOR_offsetWithinSpan()) + cursor.gapBufferCount);
    }

    cursor.gapBuffer[cursor.gapBufferCount] = character.charCodeAt(0);
    cursor.gapBufferCount++;

    cursor.editLength++;
    cursor.indexColumn++;

    set_EDITOR_offsetWithinSpan(get_EDITOR_offsetWithinSpan() + cursor.gapBufferCount);
}

function EDITOR_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor) {
    // binary search for 'if (get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() > positionIndex)'
    let indexTrackedSyntax = EDITOR_drawViewPort_FindTrackedSyntax_StartingIndex(cursor.indexLine);
    if (indexTrackedSyntax === NaN || indexTrackedSyntax === -1) {
        indexTrackedSyntax = EDITOR_trackedSyntaxList.count_abstract;
    }
    if (indexTrackedSyntax < EDITOR_trackedSyntaxList.count_abstract) {
        EDITOR_trackedSyntaxList.getElementAt(indexTrackedSyntax);
        if (get_EDITOR_pooledTrackedSyntax_start() < cursor.editPosition) {
            let moreThanOneLineEndPositionIsEncompassed = false;

            // TODO: This has no reason to be a for loop
            for (let i = cursor.indexLine - 1; i >= 0; i--) {
                let lineEndPosition = EDITOR_lineEndPositionList.data[i];
                if (get_EDITOR_pooledTrackedSyntax_start() < lineEndPosition &&
                    get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() > lineEndPosition) {
                        moreThanOneLineEndPositionIsEncompassed = true;
                        break;
                }
                else {
                    break;
                }
            }
            
            if (!moreThanOneLineEndPositionIsEncompassed) {
                // TODO: This has no reason to be a for loop
                for (let i = cursor.indexLine + 1; i < EDITOR_lineEndPositionList.count; i++) {
                    let lineEndPosition = EDITOR_lineEndPositionList.data[i];
                    if (get_EDITOR_pooledTrackedSyntax_start() < lineEndPosition &&
                        get_EDITOR_pooledTrackedSyntax_start() + get_EDITOR_pooledTrackedSyntax_length() > lineEndPosition) {
                            moreThanOneLineEndPositionIsEncompassed = true;
                            break;
                    }
                    else {
                        break;
                    }
                }

                if (!moreThanOneLineEndPositionIsEncompassed) {
                    EDITOR_trackedSyntaxList.removeAt(indexTrackedSyntax, 1);
                }
            }
        }
    }
}

/**
 * @param {EDITOR_Cursor} cursor 
 */
function EDITOR_scrollCursorIntoView(cursor) {
    let scrollX = 0;
    let scrollY = 0;

    if (cursor.cursorTopValue < EDITOR_baseElement.scrollTop) {
        scrollY = cursor.cursorTopValue - EDITOR_baseElement.scrollTop;
    }
    else if (cursor.cursorTopValue >= EDITOR_baseElement.scrollTop + EDITOR_baseElement.offsetHeight) {
        // I want to use clientHeight but I don't have any logic for no scrollbar thus single page fitting text might bug out and trigger
        // scrollBy over and over.

        // make the bottom touch then add lineHeight is probably the algorithm to get a perfect fill maybe do lineHeight * 2 skip an event when spamming arrowDown?
        let currentBottom = EDITOR_baseElement.scrollTop + EDITOR_baseElement.offsetHeight;
        let changeToMakeBottomTouch = cursor.cursorTopValue - currentBottom;
        scrollY = changeToMakeBottomTouch + (2 * get_EDITOR_lineHeight());
    }

    if (cursor.cursorLeftValue < EDITOR_baseElement.scrollLeft) {
        scrollX = cursor.cursorLeftValue - EDITOR_baseElement.scrollLeft;
    }
    else if (cursor.cursorLeftValue >= EDITOR_baseElement.scrollLeft + EDITOR_baseElement.offsetWidth) {
        // I want to use clientWidth but I don't have any logic for no scrollbar thus single page fitting text might bug out and trigger
        // scrollBy over and over.

        // make the right touch then add characterWidth is probably the algorithm to get a perfect fill maybe do characterWidth * 2 skip an event when spamming arrowRight?
        let currentRight = EDITOR_baseElement.scrollLeft + EDITOR_baseElement.offsetWidth;
        let changeToMakeRightTouch = cursor.cursorLeftValue - currentRight;
        scrollX = changeToMakeRightTouch + (4 * EDITOR_characterWidth);
    }

    EDITOR_baseElement.scrollBy(scrollX, scrollY);
}

function EDITOR_getCharacterKind(character) {
    switch (character) {
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'm':
        case 'n':
        case 'o':
        case 'p':
        case 'q':
        case 'r':
        case 's':
        case 't':
        case 'u':
        case 'v':
        case 'w':
        case 'x':
        case 'y':
        case 'z':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'H':
        case 'I':
        case 'J':
        case 'K':
        case 'L':
        case 'M':
        case 'N':
        case 'O':
        case 'P':
        case 'Q':
        case 'R':
        case 'S':
        case 'T':
        case 'U':
        case 'V':
        case 'W':
        case 'X':
        case 'Y':
        case 'Z':
        case '_':
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            return get_CharacterKind_LetterOrDigit();
        case ' ':
        case '\t':
        case '\r':
        case '\n':
            return get_CharacterKind_Whitespace();
        default:
            return get_CharacterKind_Punctuation();
    }
}

async function EDITOR_MenuOnClick(indexClicked, elementClicked) {
    const commandKind = parseInt(elementClicked.dataset.commandKind, 10);
    if (!commandKind) {
        return;
    }

    switch (commandKind) {
        case CommandKind.Cut:
            EDITOR_finalizeAllCursors();
            await EDITOR_copySelection(EDITOR_primaryCursor);
            EDITOR_removeSelection(EDITOR_primaryCursor);
            EDITOR_drawCursor(EDITOR_primaryCursor);
            return;
        case CommandKind.Copy:
            EDITOR_finalizeAllCursors();
            return EDITOR_copySelection(EDITOR_primaryCursor);
        case CommandKind.Paste:
            EDITOR_finalizeAllCursors();
            let clipboard = await window.myAPI.readClipboard();
            EDITOR_paste(EDITOR_primaryCursor, clipboard);
            EDITOR_drawCursor(EDITOR_primaryCursor);
            return;
        case CommandKind.Find:
            EDITOR_findOverlay_showSetter(!get_EDITOR_findOverlay_show());
            return;
    }
}

/**
 * This clears the cursor's selection.
 */
function EDITOR_moveCursor_position(intValue) {
    let lineAndColumnIndices = EDITOR_getLineAndColumnIndices(intValue);
    EDITOR_moveCursor_lineIndex_columnIndex(lineAndColumnIndices.indexLine, lineAndColumnIndices.indexColumn);
}

/**
 * This clears the cursor's selection.
 */
function EDITOR_moveCursor_lineIndex_columnIndex(indexLine, indexColumn) {
    let lastValidColumnIndex = EDITOR_getLastValidIndexColumn(indexLine);

    if (indexColumn > lastValidColumnIndex) {
        EDITOR_primaryCursor.indexColumn = lastValidColumnIndex;
    }
    else {
        EDITOR_primaryCursor.indexColumn = indexColumn;
    }

    EDITOR_primaryCursor.indexLine = indexLine;
    
    // TODO: selectionAnchor = selectionEnd; EDITOR_drawCursor(cursor); # being the way to clear a selection should be documented / wrapped by a method for ease of use / readability?
    EDITOR_primaryCursor.selectionAnchor = EDITOR_primaryCursor.selectionEnd;
    EDITOR_drawCursor(EDITOR_primaryCursor);
}

/**
 * Tabs are stored as '\t\0\0\0', all line feeds converted to '\n'.
 * 
 * textonly is in reference to conversion of the raw storage of the text editor such that a tab of '\t\0\0\0' is returned as just '\t', and all line feeds as EDITOR_lineEndString
 * 
 * @returns {string}
 */
function EDITOR_decode_textonly(start, length) {

    if (!EDITOR_lineEndString)
        EDITOR_lineEndString = '\n';

	// TODO: repeated duplications of the same extremely large selection might benefit from temporary caching of this functions result.
	let EDITOR_decode_pooled_stringBuilder_array = new Array(length);

    let end = start + length;
	
	let bytes = EDITOR_textByteList.bytes;
	
	if (length <= 0) {
		return '';
	}
    
	for (let i = start; i < end; i++) {
		switch (bytes[i]) {
			case 0: // NUL
				break;
			case 9: // TAB
				EDITOR_decode_pooled_stringBuilder_array.push('\t');
				break;
			case 10: // LF
				EDITOR_decode_pooled_stringBuilder_array.push(EDITOR_lineEndString);
				break;
			case 32: // Space
				EDITOR_decode_pooled_stringBuilder_array.push(' ');
				break;
			case 33: // !
				EDITOR_decode_pooled_stringBuilder_array.push('!');
				break;
			case 34: // "
				EDITOR_decode_pooled_stringBuilder_array.push('"');
				break;
			case 35: // #
				EDITOR_decode_pooled_stringBuilder_array.push('#');
				break;
			case 36: // $ (I think???)
				EDITOR_decode_pooled_stringBuilder_array.push('$');
				break;
			case 37: // %
				EDITOR_decode_pooled_stringBuilder_array.push('%');
				break;
			case 38: // & (I think???)
				EDITOR_decode_pooled_stringBuilder_array.push('&');
				break;
			case 39: // ' (I think???)
				EDITOR_decode_pooled_stringBuilder_array.push('\'');
				break;
			case 40: // (
				EDITOR_decode_pooled_stringBuilder_array.push('(');
				break;
			case 41: // )
				EDITOR_decode_pooled_stringBuilder_array.push(')');
				break;
			case 42: // *
				EDITOR_decode_pooled_stringBuilder_array.push('*');
				break;
			case 43: // +
				EDITOR_decode_pooled_stringBuilder_array.push('+');
				break;
			case 44: // , (I think???)
				EDITOR_decode_pooled_stringBuilder_array.push(',');
				break;
			case 45: // -
				EDITOR_decode_pooled_stringBuilder_array.push('-');
				break;
			case 46: // .
				EDITOR_decode_pooled_stringBuilder_array.push('.');
				break;
			case 47: // /
				EDITOR_decode_pooled_stringBuilder_array.push('/');
				break;
			case 48: // 0
				EDITOR_decode_pooled_stringBuilder_array.push('0');
				break;
			case 49: // 1
				EDITOR_decode_pooled_stringBuilder_array.push('1');
				break;
			case 50: // 2
				EDITOR_decode_pooled_stringBuilder_array.push('2');
				break;
			case 51: // 3
				EDITOR_decode_pooled_stringBuilder_array.push('3');
				break;
			case 52: // 4
				EDITOR_decode_pooled_stringBuilder_array.push('4');
				break;
			case 53: // 5
				EDITOR_decode_pooled_stringBuilder_array.push('5');
				break;
			case 54: // 6
				EDITOR_decode_pooled_stringBuilder_array.push('6');
				break;
			case 55: // 7
				EDITOR_decode_pooled_stringBuilder_array.push('7');
				break;
			case 56: // 8
				EDITOR_decode_pooled_stringBuilder_array.push('8');
				break;
			case 57: // 9
				EDITOR_decode_pooled_stringBuilder_array.push('9');
				break;
			case 58: // :
				EDITOR_decode_pooled_stringBuilder_array.push(':');
				break;
			case 59: // ;
				EDITOR_decode_pooled_stringBuilder_array.push(';');
				break;
			case 60: // <
				EDITOR_decode_pooled_stringBuilder_array.push('<');
				break;
			case 61: // =
				EDITOR_decode_pooled_stringBuilder_array.push('=');
				break;
			case 62: // >
				EDITOR_decode_pooled_stringBuilder_array.push('>');
				break;
			case 63: // ?
				EDITOR_decode_pooled_stringBuilder_array.push('?');
				break;
			case 64: // @
				EDITOR_decode_pooled_stringBuilder_array.push('@');
				break;
			case 65: // A
				EDITOR_decode_pooled_stringBuilder_array.push('A');
				break;
			case 66: // B
				EDITOR_decode_pooled_stringBuilder_array.push('B');
				break;
			case 67: // C
				EDITOR_decode_pooled_stringBuilder_array.push('C');
				break;
			case 68: // D
				EDITOR_decode_pooled_stringBuilder_array.push('D');
				break;
			case 69: // E
				EDITOR_decode_pooled_stringBuilder_array.push('E');
				break;
			case 70: // F
				EDITOR_decode_pooled_stringBuilder_array.push('F');
				break;
			case 71: // G
				EDITOR_decode_pooled_stringBuilder_array.push('G');
				break;
			case 72: // H
				EDITOR_decode_pooled_stringBuilder_array.push('H');
				break;
			case 73: // I
				EDITOR_decode_pooled_stringBuilder_array.push('I');
				break;
			case 74: // J
				EDITOR_decode_pooled_stringBuilder_array.push('J');
				break;
			case 75: // K
				EDITOR_decode_pooled_stringBuilder_array.push('K');
				break;
			case 76: // L
				EDITOR_decode_pooled_stringBuilder_array.push('L');
				break;
			case 77: // M
				EDITOR_decode_pooled_stringBuilder_array.push('M');
				break;
			case 78: // N
				EDITOR_decode_pooled_stringBuilder_array.push('N');
				break;
			case 79: // O
				EDITOR_decode_pooled_stringBuilder_array.push('O');
				break;
			case 80: // P
				EDITOR_decode_pooled_stringBuilder_array.push('P');
				break;
			case 81: // Q
				EDITOR_decode_pooled_stringBuilder_array.push('Q');
				break;
			case 82: // R
				EDITOR_decode_pooled_stringBuilder_array.push('R');
				break;
			case 83: // S
				EDITOR_decode_pooled_stringBuilder_array.push('S');
				break;
			case 84: // T
				EDITOR_decode_pooled_stringBuilder_array.push('T');
				break;
			case 85: // U
				EDITOR_decode_pooled_stringBuilder_array.push('U');
				break;
			case 86: // V
				EDITOR_decode_pooled_stringBuilder_array.push('V');
				break;
			case 87: // W
				EDITOR_decode_pooled_stringBuilder_array.push('W');
				break;
			case 88: // X
				EDITOR_decode_pooled_stringBuilder_array.push('X');
				break;
			case 89: // Y
				EDITOR_decode_pooled_stringBuilder_array.push('Y');
				break;
			case 90: // Z
				EDITOR_decode_pooled_stringBuilder_array.push('Z');
				break;
			case 91: // [
				EDITOR_decode_pooled_stringBuilder_array.push('[');
				break;
			case 92: // \
				EDITOR_decode_pooled_stringBuilder_array.push('\\');
				break;
			case 93: // ]
				EDITOR_decode_pooled_stringBuilder_array.push(']');
				break;
			case 94: // ^
				EDITOR_decode_pooled_stringBuilder_array.push('^');
				break;
			case 95: // _
				EDITOR_decode_pooled_stringBuilder_array.push('_');
				break;
			case 96: // `
				EDITOR_decode_pooled_stringBuilder_array.push('`');
				break;
			case 97: // a
				EDITOR_decode_pooled_stringBuilder_array.push('a');
				break;
			case 98: // b
				EDITOR_decode_pooled_stringBuilder_array.push('b');
				break;
			case 99: // c
				EDITOR_decode_pooled_stringBuilder_array.push('c');
				break;
			case 100: // d
				EDITOR_decode_pooled_stringBuilder_array.push('d');
				break;
			case 101: // e
				EDITOR_decode_pooled_stringBuilder_array.push('e');
				break;
			case 102: // f
				EDITOR_decode_pooled_stringBuilder_array.push('f');
				break;
			case 103: // g
				EDITOR_decode_pooled_stringBuilder_array.push('g');
				break;
			case 104: // h
				EDITOR_decode_pooled_stringBuilder_array.push('h');
				break;
			case 105: // i
				EDITOR_decode_pooled_stringBuilder_array.push('i');
				break;
			case 106: // j
				EDITOR_decode_pooled_stringBuilder_array.push('j');
				break;
			case 107: // k
				EDITOR_decode_pooled_stringBuilder_array.push('k');
				break;
			case 108: // l
				EDITOR_decode_pooled_stringBuilder_array.push('l');
				break;
			case 109: // m
				EDITOR_decode_pooled_stringBuilder_array.push('m');
				break;
			case 110: // n
				EDITOR_decode_pooled_stringBuilder_array.push('n');
				break;
			case 111: // o
				EDITOR_decode_pooled_stringBuilder_array.push('o');
				break;
			case 112: // p
				EDITOR_decode_pooled_stringBuilder_array.push('p');
				break;
			case 113: // q
				EDITOR_decode_pooled_stringBuilder_array.push('q');
				break;
			case 114: // r
				EDITOR_decode_pooled_stringBuilder_array.push('r');
				break;
			case 115: // s
				EDITOR_decode_pooled_stringBuilder_array.push('s');
				break;
			case 116: // t
				EDITOR_decode_pooled_stringBuilder_array.push('t');
				break;
			case 117: // u
				EDITOR_decode_pooled_stringBuilder_array.push('u');
				break;
			case 118: // v
				EDITOR_decode_pooled_stringBuilder_array.push('v');
				break;
			case 119: // w
				EDITOR_decode_pooled_stringBuilder_array.push('w');
				break;
			case 120: // x
				EDITOR_decode_pooled_stringBuilder_array.push('x');
				break;
			case 121: // y
				EDITOR_decode_pooled_stringBuilder_array.push('y');
				break;
			case 122: // z
				EDITOR_decode_pooled_stringBuilder_array.push('z');
				break;
			case 123: // {
				EDITOR_decode_pooled_stringBuilder_array.push('{');
				break;
			case 124: // |
				EDITOR_decode_pooled_stringBuilder_array.push('|');
				break;
			case 125: // }
				EDITOR_decode_pooled_stringBuilder_array.push('}');
				break;
			case 126: // ~
				EDITOR_decode_pooled_stringBuilder_array.push('~');
				break;
			default:
				EDITOR_decode_pooled_stringBuilder_array.push(
					EDITOR_decoder.decode(bytes.subarray(i, i + 1)));
				break;
		}
	}
	
	return EDITOR_decode_pooled_stringBuilder_array.join('');
}

function EDITOR_toExtensionKind(extensionWithPeriod) {
    switch (extensionWithPeriod) {
        case '.js':
        case '.cjs':
            return get_ExtensionKind_JavaScript();
        default:
            return get_ExtensionKind_None();
    }
}

function EDITOR_language_line_lex_SET(extensionKind) {
    switch (extensionKind) {
        case get_ExtensionKind_JavaScript():
            EDITOR_language_line_lex = JS_line_lex;
            break;
        default:
            EDITOR_language_line_lex = PLAINTEXT_line_lex;
            break;
    }
}

/**
 * TODO: this can be way faster all I did was take JS_line_lex and then strip away all the details...
 * ...I'm more concerned with tightening the difference between best and worst case...
 * ...by reducing worst case.
 * This makes line lexing JS faster so it is preferable even if I don't write this plaintext implementation perfectly.
 * "maybe" it's faster I didn't measure anything but I swear I know what I'm doing
 * not only did I not measure it but I went back and forth between vscode I actually have no idea if this faster I can't remember anything I'm super tired.
 * I'm tired and I still have to write more of the multicursor logic so I'm just vibing out the optimizations for a bit I'll get measurements later when the app works more.
 */
function PLAINTEXT_line_lex(div, substart, lineEnd, childIndex) {
    let length = 0;
    let pos = substart;

    let bytes = EDITOR_textByteList.bytes;

    while (pos < lineEnd) {
        length++;
        pos++;
    }

    if (length > 0) {
        let span;
        if (childIndex < div.children.length) {
            span = div.children[childIndex++];
            span.className = '';
        }
        else {
            span = document.createElement('span');
            div.appendChild(span);
            childIndex++;
        }
        span.innerText = EDITOR_decoder.decode(EDITOR_textByteList.bytes.subarray(substart, substart + length));
    }

    return childIndex;
}

/*
- [ ] Duplicate:
    - [ ] as an edit
    - [ ] optimized redrawing of the text
- [ ] Paste:
    - [ ] as an edit
    - [ ] optimized redrawing of the text
- [ ] Check the enter key drawing logic
    - [ ] as an edit
    - [ ] optimized redrawing of the text
- [ ] HTML span element pooling

Context Menu Options
====================
|
# File
- [x] Copy               => file:///C:\Users\hunte\Repos\New folder\TextEditor_Aaa\src\InternalLibraries\editorGlobal.js
- [x] Copy Absolute Path => C:\Users\hunte\Repos\New folder\TextEditor_Aaa\src\InternalLibraries\editorGlobal.js
- [x] Delete             => "src\Database\PineapplePizza\aaa.txt" was successfully deleted
- [x] Rename             => "aaa.txt" was successfully renamed to "lemonLimeZebra.txt"
- [ ] Consider making a new file, then whether the immediate id attached is correct if you try to then immediately rename it and etc... I believe this has worked in the past, but I want to check
- [/] Cut
|
# Directory
- [/] Copy               => file:///C:\Users\hunte\Repos\New folder\TextEditor_Aaa\src\InternalLibraries
- [/] Copy Absolute Path => C:\Users\hunte\Repos\New folder\TextEditor_Aaa\src\InternalLibraries
- [/] New File           => "appleSauce.txt" was successfully made as a text file
- [/] New Directory      => "PineapplePizza" was successfully made as a directory
- [/] Delete             => "PineapplePizza" was successfully deleted but an oddity occurred that I think is related to me having reproduced a bug prior to deleting the directory.
- [/] Rename             => "PineapplePizza" was successfully renamed to "PineapplePizza_v2"
- [ ] Consider making a new directory, then whether the immediate id attached is correct if you try to then immediately rename it and etc... I believe this has worked in the past, but I want to check
- [x] Paste              => The pasted source path is: => { File, Directory }
- [ ] Cut
    - [ ] The pasted source path is:
        - [/] File
            - [ ] BUG: this didn't draw the remove of the file child node from the containing directory even though it was removed from the filesystem
        - [/] Directory
            - [ ] BUG: { directory_cut -> directory_paste } this successfully drew the remove of the directory child node from the containing directory, BUT it inserted the paste between InternalLibraries/ and its children (InternalLibraries/ was expanded at the time). So you need to find the index relative to the depth, and then furthermore check if the index you landed on, whether the (previous?) node is expanded and has children.
|
# Bug list:
- [ ] Make a directory
    - [ ] Expand the directory (I think?)
    - [ ] Then make a new file in it, you'll add the file to the wrong place
    - [ ] or maybe it wasn't expanded so it found the closest expanded node and that's the bug...?
    - [ ] When is newly made directory:
        - [ ] When is expanded:
        - [ ] When is not expanded:
    - [ ] When is existing directory:
        - [ ] When is expanded:
        - [ ] When is not expanded:
            - [ ] The newly made file is erroneously added as a child node to the directory even though the directory isn't expanded.
            - [ ] Is this to say that if the new file would be child index 1 that the when collapsed would put it as the child of the next or something?
- [x] Copy a file, then try to paste it into a directory and you get the following error: "TypeError: Cannot read properties of null (reading 'id')".
- [ ] BUG: { file_cut -> directory_paste } this didn't draw the remove of the file child node from the containing directory even though it was removed from the filesystem
- [ ] BUG: { directory_cut -> directory_paste } this successfully drew the remove of the directory child node from the containing directory, BUT it inserted the paste between InternalLibraries/ and its children (InternalLibraries/ was expanded at the time). So you need to find the index relative to the depth, and then furthermore check if the index you landed on, whether the (previous?) node is expanded and has children.
- [x] BUG: trying to collapse an empty directory is acting weird, I don't see an error.
- [x] BUG: ArrowRight when directory is expanded but has 0 children.
- [ ] Related to the tree view, the following exception consistently is thrown when scrolling: "ReferenceError: event_scroll_async_timeoutFunc is not defined".
*/



/*
    ASCII:
    ------
    " => 34,
    ' => 39,
    / => 47,
    \ => 92,
    * => 42,
    \n => 10,
*/
const js_DOUBLEQUOTE = 34;
const js_SINGLEQUOTE = 39;
const js_BACKTICK = 96;
const js_FORWARDSLASH = 47;
const js_BACKSLASH = 92;
const js_ASTERISK = 42;
const js_LINEFEED = 10;
const js_OPENPARENTHESIS = 40;
const js_CLOSEPARENTHESIS = 41;
const js_PERIOD = 46;
const js_EQUALS = 61;
const js_OPENBRACKET = 60;
const js_CLOSEBRACKET = 62;
const js_BANG = 33;
const js_PLUS = 43;
const js_MINUS = 45;
const js_STAR = 42;
const js_PERCENT = 37;
const js_AMPERSAND = 38;
const js_PIPE = 124;
const js_QUESTIONMARK = 63;
const js_CARET = 94;

/**
 * @param {Uint8Array} bytes 
 * @returns trackedSyntaxList
 */
function JS_full_lex(bytes, count) {
    let trackedSyntaxList = new TrackedSyntaxList(32);
    let pos = 0;

    while (pos < count) {
        switch (bytes[pos]) {
            case js_DOUBLEQUOTE:
                pos = lex_string(bytes, count, pos, trackedSyntaxList, js_DOUBLEQUOTE);
                continue;
            case js_SINGLEQUOTE:
                pos = lex_string(bytes, count, pos, trackedSyntaxList, js_SINGLEQUOTE);
                continue;
            case js_BACKTICK:
                pos = lex_string(bytes, count, pos, trackedSyntaxList, js_BACKTICK);
                continue;
            case js_FORWARDSLASH:
                if (bytes[pos + 1] === js_FORWARDSLASH) {
                    pos = lex_comment_singleLine(bytes, count, pos, trackedSyntaxList);
                    continue;
                }
                else if (bytes[pos + 1] === js_ASTERISK) {
                    pos = lex_comment_multiLine(bytes, count, pos, trackedSyntaxList);
                    continue;
                }

                break;
            case js_ASTERISK:
                break;
            case js_LINEFEED:
                break;
        }

        pos++;
    }

    return trackedSyntaxList;
}

/**
 * @returns pos
 */
function lex_comment_singleLine(bytes, count, pos, trackedSyntaxList) {
    // The current character is the first forward slash of the 'two consecutive ones' that represent the start of a single line comment.
    let start = pos;
    let length = 0;
    // "changing" this to guarantee at least 1 read means you can continue after the invocation returns (for the while loop)
    // All in all, this already was guaranteed to read at least 1 since the while loop's condition in this method
    // This change is moreso a matter of anxiety and me not wanting to deal with this at the moment so I need to see the explicit read here so I can sleep at night for the time being until my stress levels are lower.
    length++;
    pos++;
    while (pos < count) {
        if (bytes[pos] === js_LINEFEED) {
            break;
        }
        length++;
        pos++;
    }

    return pos;
}

/**
 * This code is somewhat duplicated within 'function JS_line_lex(...)' when handling any "multi-line-comments" that span only a single line.
 * @returns pos
 */
function lex_comment_multiLine(bytes, count, pos, trackedSyntaxList) {
    // The current character is the first forward slash of the 'forwardslash and asterisk' that represent the start of a single line comment.
    let start = pos;
    let length = 0;
    // Move past the 'forwardslash and asterisk'
    length += 2;
    pos += 2;

    let seenLineFeed = false;

    // I'm starting this at 2 because 0 would bug (-1 + 1 === 0)
    // but then I just don't want to deal with this so I need to go 1,
    // then like I'm tired and I don't want to deal with this so I'll just go to 2 and surely nothing bad can happen
    // but in reality I probably only need to start at 1 (or start of other ticket variables + 2 or something idk I don't wanna deal with this right now).
    let ticketSource = 2;
    let ticketAsterisk = -1;
    let ticketForwardSlash = -1;
    while (pos < count) {
        switch (bytes[pos]) {
            case js_ASTERISK:
                ticketAsterisk = ticketSource++;
                break;
            case js_FORWARDSLASH:
                ticketForwardSlash = ticketSource++;
                break;
            case js_LINEFEED:
                seenLineFeed = true;
                ticketSource++;
                break;
            default:
                ticketSource++;
                break;
        }
        length++;
        pos++;
        if (ticketAsterisk + 1 === ticketForwardSlash) {
            break;
        }
    }

    if (seenLineFeed) {
        trackedSyntaxList.insert(trackedSyntaxList.count_abstract, TrackedSyntaxKind.Comment, start, length);
    }

    return pos;
}

/**
 * This code is somewhat duplicated within 'function JS_line_lex(...)' when handling any ASCII code that could start a string.
 * @returns pos
 */
function lex_string(bytes, count, pos, trackedSyntaxList, terminator) {
    // The current character is the byte that represent the start of a string.
    let start = pos;
    let length = 0;
    // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
    length++;
    pos++;

    let seenLineFeed = false;

    while (pos < count) {

        if (bytes[pos] === js_LINEFEED) { // the editor only stores line feed ASCII codes and "swaps them out" when saving/copying text.
            seenLineFeed = true;
            if (terminator !== js_BACKTICK) break;
        }

        if (bytes[pos] === terminator) {
            length++;
            pos++;
            break;
        }
        else if (bytes[pos] === js_BACKSLASH) {
            length++;
            pos++;
            if (pos < count) {
                length++;
                pos++; // skip the escaped character provided that the file didn't end after the original backslash
            }
            continue;
        }
        length++;
        pos++;
    }

    if (seenLineFeed && terminator === js_BACKTICK) {
        trackedSyntaxList.insert(trackedSyntaxList.count_abstract, TrackedSyntaxKind.String, start, length);
    }

    return pos;
}

function JS_line_lex(div, substart, lineEnd, childIndex) {
    let length = 0;
    let pos = substart;

    let bytes = EDITOR_textByteList.bytes;

    while (pos < lineEnd) {
        switch (bytes[pos]) {
            case 97:  // a
            case 98:  // b
            case 99:  // c
            case 100: // d
            case 101: // e
            case 102: // f
            case 103: // g
            case 104: // h
            case 105: // i
            case 106: // j
            case 107: // k
            case 108: // l
            case 109: // m
            case 110: // n
            case 111: // o
            case 112: // p
            case 113: // q
            case 114: // r
            case 115: // s
            case 116: // t
            case 117: // u
            case 118: // v
            case 119: // w
            case 120: // x
            case 121: // y
            case 122: // z
            case 65:  // A
            case 66:  // B
            case 67:  // C
            case 68:  // D
            case 69:  // E
            case 70:  // F
            case 71:  // G
            case 72:  // H
            case 73:  // I
            case 74:  // J
            case 75:  // K
            case 76:  // L
            case 77:  // M
            case 78:  // N
            case 79:  // O
            case 80:  // P
            case 81:  // Q
            case 82:  // R
            case 83:  // S
            case 84:  // T
            case 85:  // U
            case 86:  // V
            case 87:  // W
            case 88:  // X
            case 89:  // Y
            case 90:  // Z
            case 95:  // _
                let wordstart = pos;

                // you don't know if a word is a keyword until you've read the keyword.
                // so until that point you're tracking it along with all the other text/whitespace on the line
                // and planning to make everything just a single span.

                let charIntSum = 0;

                outer: while (pos < lineEnd) {
                    switch (bytes[pos]) {
                        case 97:  // a
                        case 98:  // b
                        case 99:  // c
                        case 100: // d
                        case 101: // e
                        case 102: // f
                        case 103: // g
                        case 104: // h
                        case 105: // i
                        case 106: // j
                        case 107: // k
                        case 108: // l
                        case 109: // m
                        case 110: // n
                        case 111: // o
                        case 112: // p
                        case 113: // q
                        case 114: // r
                        case 115: // s
                        case 116: // t
                        case 117: // u
                        case 118: // v
                        case 119: // w
                        case 120: // x
                        case 121: // y
                        case 122: // z
                        case 65:  // A
                        case 66:  // B
                        case 67:  // C
                        case 68:  // D
                        case 69:  // E
                        case 70:  // F
                        case 71:  // G
                        case 72:  // H
                        case 73:  // I
                        case 74:  // J
                        case 75:  // K
                        case 76:  // L
                        case 77:  // M
                        case 78:  // N
                        case 79:  // O
                        case 80:  // P
                        case 81:  // Q
                        case 82:  // R
                        case 83:  // S
                        case 84:  // T
                        case 85:  // U
                        case 86:  // V
                        case 87:  // W
                        case 88:  // X
                        case 89:  // Y
                        case 90:  // Z
                        case 95:  // _
                        case 48:  // 0
                        case 49:  // 1
                        case 50:  // 2
                        case 51:  // 3
                        case 52:  // 4
                        case 53:  // 5
                        case 54:  // 6
                        case 55:  // 7
                        case 56:  // 8
                        case 57:  // 9
                            charIntSum += bytes[pos];
                            length++;
                            pos++;
                            break;
                        default:
                            break outer;
                    }
                }
                // heuristic for possible keyword is comparing char int sum:
                //
                // const
                // c 99
                // o 111
                // n 110
                // s 115
                // t 116
                //
                // 551
                // 
                let className;
                let innerText;
                let wordlength = pos - wordstart;
                switch (charIntSum) {
                    case 551: // const
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 99  /* 'c' */ &&
                            bytes[wordstart + 1] === 111 /* 'o' */ &&
                            bytes[wordstart + 2] === 110 /* 'n' */ &&
                            bytes[wordstart + 3] === 115 /* 's' */ &&
                            bytes[wordstart + 4] === 116 /* 't' */) {
                                className = 'eK';
                                innerText = 'const';
                                break;
                        }
                        className = '';
                        break;
                    case 325: // let
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 108 /* 'l' */ &&
                            bytes[wordstart + 1] === 101 /* 'e' */ &&
                            bytes[wordstart + 2] === 116 /* 't' */) {
                                className = 'eK';
                                innerText = 'let';
                                break;
                        }
                        className = '';
                        break;
                    case 870: // function
                        if (wordlength === 8 &&
                            bytes[wordstart + 0] === 102 /* 'f' */ &&
                            bytes[wordstart + 1] === 117 /* 'u' */ &&
                            bytes[wordstart + 2] === 110 /* 'n' */ &&
                            bytes[wordstart + 3] === 99  /* 'c' */ &&
                            bytes[wordstart + 4] === 116 /* 't' */ &&
                            bytes[wordstart + 5] === 105 /* 'i' */ &&
                            bytes[wordstart + 6] === 111 /* 'o' */ &&
                            bytes[wordstart + 7] === 110 /* 'n' */) {
                                className = 'eK';
                                innerText = 'function';
                                break;
                        }
                        className = '';
                        break;
                    case 207: // if
                        if (wordlength === 2 &&
                            bytes[wordstart + 0] === 105 /* 'i' */ &&
                            bytes[wordstart + 1] === 102 /* 'f' */) {
                                className = 'eKC';
                                innerText = 'if';
                                break;
                        }
                        className = '';
                        break;
                    case 351: // try
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 116 /* 't' */ &&
                            bytes[wordstart + 1] === 114 /* 'r' */ &&
                            bytes[wordstart + 2] === 121 /* 'y' */) {
                                className = 'eK';
                                innerText = 'try';
                                break;
                        }
                        className = '';
                        break;
                    case 327: // for
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 102 /* 'f' */ &&
                            bytes[wordstart + 1] === 111 /* 'o' */ &&
                            bytes[wordstart + 2] === 114 /* 'r' */) {
                                className = 'eKC';
                                innerText = 'for';
                                break;
                        }
                        className = '';
                        break;
                    case 329: // var
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 118 /* 'v' */ &&
                            bytes[wordstart + 1] === 97  /* 'a' */ &&
                            bytes[wordstart + 2] === 114 /* 'r' */) {
                                className = 'eK';
                                innerText = 'var';
                                break;
                        }
                        className = '';
                        break;
                    case 515: // catch
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 99  /* 'c' */ &&
                            bytes[wordstart + 1] === 97  /* 'a' */ &&
                            bytes[wordstart + 2] === 116 /* 't' */ &&
                            bytes[wordstart + 3] === 99  /* 'c' */ &&
                            bytes[wordstart + 4] === 104 /* 'h' */) {
                                className = 'eK';
                                innerText = 'catch';
                                break;
                        }
                        className = '';
                        break;
                    case 672: // return
                        if (wordlength === 6 &&
                            bytes[wordstart + 0] === 114 /* 'r' */ &&
                            bytes[wordstart + 1] === 101 /* 'e' */ &&
                            bytes[wordstart + 2] === 116 /* 't' */ &&
                            bytes[wordstart + 3] === 117 /* 'u' */ &&
                            bytes[wordstart + 4] === 114 /* 'r' */ &&
                            bytes[wordstart + 5] === 110 /* 'n' */) {
                                className = 'eKC';
                                innerText = 'return';
                                break;
                        }
                        className = '';
                        break;
                    case 658: // switch
                        if (wordlength === 6 &&
                            bytes[wordstart + 0] === 115 /* 's' */ &&
                            bytes[wordstart + 1] === 119 /* 'w' */ &&
                            bytes[wordstart + 2] === 105 /* 'i' */ &&
                            bytes[wordstart + 3] === 116 /* 't' */ &&
                            bytes[wordstart + 4] === 99  /* 'c' */ &&
                            bytes[wordstart + 5] === 104 /* 'h' */) {
                                className = 'eKC';
                                innerText = 'switch';
                                break;
                        }
                        className = '';
                        break;
                    case 412: // case
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 99  /* 'c' */ &&
                            bytes[wordstart + 1] === 97  /* 'a' */ &&
                            bytes[wordstart + 2] === 115 /* 's' */ &&
                            bytes[wordstart + 3] === 101 /* 'e' */) {
                                className = 'eKC';
                                innerText = 'case';
                                break;
                        }
                        className = '';
                        break;
                    case 542: // async
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 97  /* 'a' */ &&
                            bytes[wordstart + 1] === 115 /* 's' */ &&
                            bytes[wordstart + 2] === 121 /* 'y' */ &&
                            bytes[wordstart + 3] === 110 /* 'n' */ &&
                            bytes[wordstart + 4] === 99  /* 'c' */) {
                                className = 'eK';
                                innerText = 'async';
                                break;
                        }
                        className = '';
                        break;
                    case 425: // else
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 101 /* 'e' */ &&
                            bytes[wordstart + 1] === 108 /* 'l' */ &&
                            bytes[wordstart + 2] === 115 /* 's' */ &&
                            bytes[wordstart + 3] === 101 /* 'e' */) {
                                className = 'eKC';
                                innerText = 'else';
                                break;
                        }
                        className = '';
                        break;
                    case 741: // default
                        if (wordlength === 7 &&
                            bytes[wordstart + 0] === 100 /* 'd' */ &&
                            bytes[wordstart + 1] === 101 /* 'e' */ &&
                            bytes[wordstart + 2] === 102 /* 'f' */ &&
                            bytes[wordstart + 3] === 97  /* 'a' */ &&
                            bytes[wordstart + 4] === 117 /* 'u' */ &&
                            bytes[wordstart + 5] === 108 /* 'l' */ &&
                            bytes[wordstart + 6] === 116 /* 't' */) {
                                className = 'eK';
                                innerText = 'default';
                                break;
                        }
                        className = '';
                        break;
                    case 564: // throw
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 116 /* 't' */ &&
                            bytes[wordstart + 1] === 104 /* 'h' */ &&
                            bytes[wordstart + 2] === 114 /* 'r' */ &&
                            bytes[wordstart + 3] === 111 /* 'o' */ &&
                            bytes[wordstart + 4] === 119 /* 'w' */) {
                                className = 'eK';
                                innerText = 'throw';
                                break;
                        }
                        className = '';
                        break;
                    case 330: // new
                        if (wordlength === 3 &&
                            bytes[wordstart + 0] === 110 /* 'n' */ &&
                            bytes[wordstart + 1] === 101 /* 'e' */ &&
                            bytes[wordstart + 2] === 119 /* 'w' */) {
                                className = 'eK';
                                innerText = 'new';
                                break;
                        }
                        className = '';
                        break;
                    case 534: // class
                        if (wordlength === 5) {
                            if (bytes[wordstart + 0] === 97  /* 'a' */ &&
                                bytes[wordstart + 1] === 119 /* 'w' */ &&
                                bytes[wordstart + 2] === 97  /* 'a' */ &&
                                bytes[wordstart + 3] === 105 /* 'i' */ &&
                                bytes[wordstart + 4] === 116 /* 't' */) {
                                
                                    className = 'eK';
                                	innerText = 'await';
                                    break;
                            }
                            else if (bytes[wordstart + 0] === 99  /* 'c' */ &&
                                     bytes[wordstart + 1] === 108 /* 'l' */ &&
                                     bytes[wordstart + 2] === 97  /* 'a' */ &&
                                     bytes[wordstart + 3] === 115 /* 's' */ &&
                                     bytes[wordstart + 4] === 115 /* 's' */) {

                                    className = 'eK';
                                	innerText = 'class';
                                    break;
                            }
                        }
                        className = '';
                        break;
                    case 1222: // constructor
                        if (wordlength === 11 &&
                            bytes[wordstart + 0] === 99   /* 'c' */ &&
                            bytes[wordstart + 1] === 111  /* 'o' */ &&
                            bytes[wordstart + 2] === 110  /* 'n' */ &&
                            bytes[wordstart + 3] === 115  /* 's' */ &&
                            bytes[wordstart + 4] === 116  /* 't' */ &&
                            bytes[wordstart + 5] === 114  /* 'r' */ &&
                            bytes[wordstart + 6] === 117  /* 'u' */ &&
                            bytes[wordstart + 7] === 99   /* 'c' */ &&
                            bytes[wordstart + 8] === 116  /* 't' */ &&
                            bytes[wordstart + 9] === 111  /* 'o' */ &&
                            bytes[wordstart + 10] === 114 /* 'r' */) {
                                className = 'eK';
                                innerText = 'constructor';
                                break;
                        }
                        className = '';
                        break;
                    case 667: // import
                        if (wordlength === 6 &&
                            bytes[wordstart + 0] === 105 /* 'i' */ &&
                            bytes[wordstart + 1] === 109 /* 'm' */ &&
                            bytes[wordstart + 2] === 112 /* 'p' */ &&
                            bytes[wordstart + 3] === 111 /* 'o' */ &&
                            bytes[wordstart + 4] === 114 /* 'r' */ &&
                            bytes[wordstart + 5] === 116 /* 't' */) {
                                className = 'eKC';
                                innerText = 'import';
                                break;
                        }
                        className = '';
                        break;
                    case 436: // from
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 102 /* 'f' */ &&
                            bytes[wordstart + 1] === 114 /* 'r' */ &&
                            bytes[wordstart + 2] === 111 /* 'o' */ &&
                            bytes[wordstart + 3] === 109 /* 'm' */) {
                                className = 'eKC';
                                innerText = 'from';
                                break;
                        }
                        className = '';
                        break;
                    case 674: // export
                        if (wordlength === 6 &&
                            bytes[wordstart + 0] === 101 /* 'e' */ &&
                            bytes[wordstart + 1] === 120 /* 'x' */ &&
                            bytes[wordstart + 2] === 112 /* 'p' */ &&
                            bytes[wordstart + 3] === 111 /* 'o' */ &&
                            bytes[wordstart + 4] === 114 /* 'r' */ &&
                            bytes[wordstart + 5] === 116 /* 't' */) {
                                className = 'eK';
                                innerText = 'export';
                                break;
                        }
                        className = '';
                        break;
                    case 440: // this
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 116 /* 't' */ &&
                            bytes[wordstart + 1] === 104 /* 'h' */ &&
                            bytes[wordstart + 2] === 105 /* 'i' */ &&
                            bytes[wordstart + 3] === 115 /* 's' */) {
                                className = 'eK';
                                innerText = 'this';
                                break;
                        }
                        className = '';
                        break;
                    case 537: // while
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 119 /* 'w' */ &&
                            bytes[wordstart + 1] === 104 /* 'h' */ &&
                            bytes[wordstart + 2] === 105 /* 'i' */ &&
                            bytes[wordstart + 3] === 108 /* 'l' */ &&
                            bytes[wordstart + 4] === 101 /* 'e' */) {
                                className = 'eKC';
                                innerText = 'while';
                                break;
                        }
                        className = '';
                        break;
                    case 517: // break
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 98  /* 'b' */ &&
                            bytes[wordstart + 1] === 114 /* 'r' */ &&
                            bytes[wordstart + 2] === 101 /* 'e' */ &&
                            bytes[wordstart + 3] === 97  /* 'a' */ &&
                            bytes[wordstart + 4] === 107 /* 'k' */) {
                                className = 'eKC';
                                innerText = 'break';
                                break;
                        }
                        className = '';
                        break;
                    case 869: // continue
                        if (wordlength === 8 &&
                            bytes[wordstart + 0] === 99  /* 'c' */ &&
                            bytes[wordstart + 1] === 111 /* 'o' */ &&
                            bytes[wordstart + 2] === 110 /* 'n' */ &&
                            bytes[wordstart + 3] === 116 /* 't' */ &&
                            bytes[wordstart + 4] === 105 /* 'i' */ &&
                            bytes[wordstart + 5] === 110 /* 'n' */ &&
                            bytes[wordstart + 6] === 117 /* 'u' */ &&
                            bytes[wordstart + 7] === 101 /* 'e' */) {
                                className = 'eKC';
                                innerText = 'continue';
                                break;
                        }
                        className = '';
                        break;
                    case 448: // true
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 116 /* 't' */ &&
                            bytes[wordstart + 1] === 114 /* 'r' */ &&
                            bytes[wordstart + 2] === 117 /* 'u' */ &&
                            bytes[wordstart + 3] === 101 /* 'e' */) {
                                className = 'eK';
                                innerText = 'true';
                                break;
                        }
                        className = '';
                        break;
                    case 523: // false
                        if (wordlength === 5 &&
                            bytes[wordstart + 0] === 102 /* 'f' */ &&
                            bytes[wordstart + 1] === 97  /* 'a' */ &&
                            bytes[wordstart + 2] === 108 /* 'l' */ &&
                            bytes[wordstart + 3] === 115 /* 's' */ &&
                            bytes[wordstart + 4] === 101 /* 'e' */) {
                                className = 'eK';
                                innerText = 'false';
                                break;
                        }
                        className = '';
                        break;
                    case 443: // null
                        if (wordlength === 4 &&
                            bytes[wordstart + 0] === 110 /* 'n' */ &&
                            bytes[wordstart + 1] === 117 /* 'u' */ &&
                            bytes[wordstart + 2] === 108 /* 'l' */ &&
                            bytes[wordstart + 3] === 108 /* 'l' */) {
                                className = 'eK';
                                innerText = 'null';
                                break;
                        }
                        className = '';
                        break;
                    default:
                        className = '';
                        break;
                }
                if (className) {
                    // is done when there IS a valid match, in order to write out any pending text that came prior to the keyword.
                    if (length > wordlength) {
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            span.className = '';
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + (length - wordlength)));
                        substart += (length - wordlength);
                        length = 0;
                    }
                    {
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        //span.className = ''; className is guaranteed to be set in this specific case
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = innerText;
                    span.className = className;
                    substart += wordlength;
                    length = 0;
                    }
                }
                continue;
            case js_FORWARDSLASH:
                if (bytes[pos + 1] === js_FORWARDSLASH) {

                    if (length > 0) {
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            span.className = '';
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                        substart += length;
                        length = 0;
                    }

                    // lex_comment_singleLine(...)

                    // The current character is the first forward slash of the 'two consecutive ones' that represent the start of a single line comment.
                    // "changing" this to guarantee at least 1 read means you can continue after the invocation returns (for the while loop)
                    // All in all, this already was guaranteed to read at least 1 since the while loop's condition in this method
                    // This change is moreso a matter of anxiety and me not wanting to deal with this at the moment so I need to see the explicit read here so I can sleep at night for the time being until my stress levels are lower.
                    length++;
                    pos++;
                    while (pos < lineEnd) {
                        if (bytes[pos] === js_LINEFEED) {
                            break;
                        }
                        length++;
                        pos++;
                    }

                    if (length > 0) {
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            //span.className = ''; className is guaranteed to be set in this specific case
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                        span.className = 'eC';
                        substart += length;
                        length = 0;
                    }

                    continue;
                }
                else if (bytes[pos + 1] === js_ASTERISK) {
                    if (length > 0) { // write any text that came prior, and on the same line.
                        let span;
                        if (childIndex < div.children.length) {
                            span = div.children[childIndex++];
                            span.className = '';
                        }
                        else {
                            span = document.createElement('span');
                            div.appendChild(span);
                            childIndex++;
                        }
                        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                        substart += length;
                        length = 0;
                    }

                    // Move past the 'forwardslash and asterisk'
                    length += 2;
                    pos += 2;

                    // I'm starting this at 2 because 0 would bug (-1 + 1 === 0)
                    // but then I just don't want to deal with this so I need to go 1,
                    // then like I'm tired and I don't want to deal with this so I'll just go to 2 and surely nothing bad can happen
                    // but in reality I probably only need to start at 1 (or start of other ticket variables + 2 or something idk I don't wanna deal with this right now).
                    let ticketSource = 2;
                    let ticketAsterisk = -1;
                    let ticketForwardSlash = -1;
                    while (pos < lineEnd) {
                        switch (bytes[pos]) {
                            case js_ASTERISK:
                                ticketAsterisk = ticketSource++;
                                break;
                            case js_FORWARDSLASH:
                                ticketForwardSlash = ticketSource++;
                                break;
                            case js_LINEFEED:
                                ticketSource++;
                                break;
                            default:
                                ticketSource++;
                                break;
                        }
                        length++;
                        pos++;
                        if (ticketAsterisk + 1 === ticketForwardSlash) {
                            break;
                        }
                    }

                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        //span.className = ''; className is guaranteed to be set in this specific case
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    //
                    // The spans are being parentDiv.innerHTML = '' into oblivion maybe take them and push them somewhere cache
                    // for when remaking new line or you keep them and replace innerText and cssclass and only remove spans AFTER redrawing that line?
                    // 
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    span.className = 'eCm';
                    substart += length;
                    length = 0;

                    continue;
                }

                break;
            case js_DOUBLEQUOTE:
                {
                if (length > 0) {
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        span.className = '';
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    substart += length;
                    length = 0;
                }
                // This code is somewhat a duplication of 'function lex_string(...)'
                //
                // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
                length++;
                pos++;
                outer: while (pos < lineEnd) {
                    switch (bytes[pos]) {
                        case js_DOUBLEQUOTE:
                            length++;
                            pos++;
                            break outer;
                        case js_BACKSLASH:
                            length++;
                            pos++;
                            if (pos < lineEnd) {
                                length++;
                                pos++; // skip the escaped character provided that the file didn't end after the original backslash
                            }
                            continue /*outer*/;
                        default:
                            length++;
                            pos++;
                            break;
                    }
                }
                let span;
                if (childIndex < div.children.length) {
                    span = div.children[childIndex++];
                    //span.className = ''; className is guaranteed to be set in this specific case
                }
                else {
                    span = document.createElement('span');
                    div.appendChild(span);
                    childIndex++;
                }
                span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                span.className = 'eS';
                substart += length;
                length = 0;
                continue;
                }
            case js_SINGLEQUOTE:
                {
                if (length > 0) {
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        span.className = '';
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    substart += length;
                    length = 0;
                }
                // This code is somewhat a duplication of 'function lex_string(...)'
                //
                // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
                length++;
                pos++;
                outer: while (pos < lineEnd) {
                    switch (bytes[pos]) {
                        case js_SINGLEQUOTE:
                            length++;
                            pos++;
                            break outer;
                        case js_BACKSLASH:
                            length++;
                            pos++;
                            if (pos < lineEnd) {
                                length++;
                                pos++; // skip the escaped character provided that the file didn't end after the original backslash
                            }
                            continue /*outer*/;
                        default:
                            length++;
                            pos++;
                            break;
                    }
                }
                let span;
                if (childIndex < div.children.length) {
                    span = div.children[childIndex++];
                    //span.className = ''; className is guaranteed to be set in this specific case
                }
                else {
                    span = document.createElement('span');
                    div.appendChild(span);
                    childIndex++;
                }
                span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                span.className = 'eS';
                substart += length;
                length = 0;
                continue;
                }
            case js_BACKTICK:
                {
                if (length > 0) {
                    let span;
                    if (childIndex < div.children.length) {
                        span = div.children[childIndex++];
                        span.className = '';
                    }
                    else {
                        span = document.createElement('span');
                        div.appendChild(span);
                        childIndex++;
                    }
                    span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                    substart += length;
                    length = 0;
                }
                // This code is somewhat a duplication of 'function lex_string(...)'
                //
                // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
                length++;
                pos++;
                outer: while (pos < lineEnd) {
                    switch (bytes[pos]) {
                        case js_BACKTICK:
                            length++;
                            pos++;
                            break outer;
                        case js_BACKSLASH:
                            length++;
                            pos++;
                            if (pos < lineEnd) {
                                length++;
                                pos++; // skip the escaped character provided that the file didn't end after the original backslash
                            }
                            continue /*outer*/;
                        default:
                            length++;
                            pos++;
                            break;
                    }
                }
                let span;
                if (childIndex < div.children.length) {
                    span = div.children[childIndex++];
                    //span.className = ''; className is guaranteed to be set in this specific case
                }
                else {
                    span = document.createElement('span');
                    div.appendChild(span);
                    childIndex++;
                }
                span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
                span.className = 'eSm';
                substart += length;
                length = 0;
                continue;
                }
            case js_EQUALS:
                {
                // I think I actually want to handle the '==', '===', and '===...=' cases just so I can skip over the text quickly.
                // Otherwise every time I see '=' I have to check the left and right side and it is quite redundant?
                //
                // I also have to consider anything of the form '+=' then typing '=' after it for '+=='. I don't think this is valid but I need to consider it I'll probably skip over any '=' that appear after the first '+=' text and is contiguous?
                // No that doesn't work because you're adding this step to every syntax that ends in '=' that it has to understand the '=' case.
                // What you want is a left check, but that the left check only happens once per contiguous block of '=' incase the left '=' isn't part of your syntax.
                //
                
                // NOTE: A presumption is being made here that "any multiline syntax that spans multiple lines, won't end in ="...
                // ...this presumption permits checking only the text that is in bounds of substart and lineEnd.
                
                	// TODO: This contiguous skipping logic isn't working for every switch case?
                	//
                	// TODO: If this contiguous skipping logic works for the '=' it will handle both '!=' and '!==' solely by checking for '!='
                	//
                	let shouldSkipContiguous;
            		if (pos > substart) {
            			if (bytes[pos - 1] === js_EQUALS) {
            				shouldSkipContiguous = true;
            			}
            			else if (bytes[pos - 1] === js_BANG) {
            				shouldSkipContiguous = true;
            			}
            			else if (bytes[pos - 1] === js_OPENBRACKET) {
            				shouldSkipContiguous = true;
            			}
            			else if (bytes[pos - 1] === js_CLOSEBRACKET) {
            				shouldSkipContiguous = true;
            			}
            		}
            		else {
            			shouldSkipContiguous = false;
            		}
                	if (!shouldSkipContiguous) {
                		if (pos < lineEnd && bytes[pos + 1] === js_EQUALS) {
                			shouldSkipContiguous = true;
                		}
                	}
                	
                	if (shouldSkipContiguous) {
                		// skip current
                		length++;
    					pos++;
    					// skip contiguous
                		while (pos < lineEnd && bytes[pos] === js_EQUALS) {
                			length++;
        					pos++;
                		}
                		continue;
                	}
                	else {
	                    if (length > 0) { // write any text that came prior, and on the same line.
	                        let span;
	                        if (childIndex < div.children.length) {
	                            span = div.children[childIndex++];
	                            span.className = '';
	                        }
	                        else {
	                            span = document.createElement('span');
	                            div.appendChild(span);
	                            childIndex++;
	                        }
                            span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
	                        substart += length;
	                        length = 0;
	                    }
	                    // I don't know if I would count '=>' as an "assignment operator"... maybe I would but I'm too focused on whether I'd count it as such that I can't figure out the way to make it work. So I need to just make it work first.
	                    length++;
                        pos++;
                        let innerText;
                        if (pos < lineEnd && bytes[pos] === js_CLOSEBRACKET) {
                        	innerText = '=>';
                        	length++;
                        	pos++;
                        }
                        else {
                        	innerText = '=';
                        }
                        let span;
	                    if (childIndex < div.children.length) {
	                        span = div.children[childIndex++];
	                        //span.className = ''; className is guaranteed to be set in this specific case
	                    }
	                    else {
	                        span = document.createElement('span');
	                        div.appendChild(span);
	                        childIndex++;
	                    }
	                    span.innerText = innerText;
	                    span.className = 'eOA';
	                    substart += length;
	                    length = 0;
	                    continue;
                	}
                    
                    // TODO: you don't understand how code caching or like instruction caching etc works with respect to whether inlining interupts things
                    break;
                }
            case js_PLUS:
                {
                	// ++
                	// +=
                	
                	// If "some syntax that I don't actually think exists" such as '=+' were to exist I'd need to care for '=+' then a '+' making '=++'
                	// this should cause a skipping of contiguous '+' in my initial opinion so that's what I'll probably do.
                	// 
                	// I have a better example now... '++' then you type '+' causing '+++', the first two '++' are syntax highlighted and the third isn't.
                	// Some might say you should not syntax highlight any of the plus in that case because you're reading the operator as '++'
                	// rather than the combination of '++' and '+'. I think I'm somewhat indifferent but I lean towards syntax highlighting
                	// the two plus characters and not doing so for the final '+' (at least my initial opinion is that).
                	//
                	// ++++
                	// It doesn't actually work... I tried it and '+++' works but then '++++' is two '++' rather than one '++' and then just the "text of '++'".
                	//
                	
                	// NOTE: A presumption is being made here that "any multiline syntax that spans multiple lines, won't end in +"...
            		// ...this presumption permits checking only the text that is in bounds of substart and lineEnd.
                	
                	// TODO: This contiguous skipping logic isn't working for every switch case?
                    let shouldSkipContiguous = pos > substart && bytes[pos - 1] === js_PLUS;
                    let innerText;
                    if (!shouldSkipContiguous) {
                    	if (pos < lineEnd) {
                    		if (bytes[pos + 1] === js_PLUS) {
	                    		innerText = '++';
	                    	}
	                    	else if (bytes[pos + 1] === js_EQUALS) {
	                    		innerText = '+=';
	                    	}
	                    	else {
	                    		shouldSkipContiguous = true;
	                    	}
                    	}
                    	else {
                    		shouldSkipContiguous = true;
                    	}
                    }
                	
                	if (shouldSkipContiguous) {
                		// skip current
                		length++;
    					pos++;
    					// skip contiguous
                		while (pos < lineEnd && bytes[pos] === js_PLUS) {
                			length++;
        					pos++;
                		}
                		continue;
                	}
                	else {
	                    if (length > 0) { // write any text that came prior, and on the same line.
	                        let span;
	                        if (childIndex < div.children.length) {
	                            span = div.children[childIndex++];
	                            span.className = '';
	                        }
	                        else {
	                            span = document.createElement('span');
	                            div.appendChild(span);
	                            childIndex++;
	                        }
                            span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
	                        substart += length;
	                        length = 0;
	                    }
	                    length += 2;
                        pos += 2;
                        let span;
	                    if (childIndex < div.children.length) {
	                        span = div.children[childIndex++];
	                        //span.className = ''; className is guaranteed to be set in this specific case
	                    }
	                    else {
	                        span = document.createElement('span');
	                        div.appendChild(span);
	                        childIndex++;
	                    }
	                    span.innerText = innerText;
	                    span.className = 'eOA';
	                    substart += length;
	                    length = 0;
	                    continue;
                	}
                }
            case js_MINUS:
                {
                	// --
                	// -=
                	
                	// NOTE: A presumption is being made here that "any multiline syntax that spans multiple lines, won't end in -"...
            		// ...this presumption permits checking only the text that is in bounds of substart and lineEnd.
            		
            		// When you switch on '+' then check for '-' or '+'... should you do something relating to NOT invoking the decode function and instead
            		// you just "know" the text that goes there based on your conditional branching?
                	 
                	// TODO: This contiguous skipping logic isn't working for every switch case?
                    let shouldSkipContiguous = pos > substart && bytes[pos - 1] === js_MINUS;
                	let innerText;
                    if (!shouldSkipContiguous) {
                    	if (pos < lineEnd) {
                    		if (bytes[pos + 1] === js_MINUS) {
	                    		innerText = '--';
	                    	}
	                    	else if (bytes[pos + 1] === js_EQUALS) {
	                    		innerText = '-=';
	                    	}
	                    	else {
	                    		shouldSkipContiguous = true;
	                    	}
                    	}
                    	else {
                    		shouldSkipContiguous = true;
                    	}
                    }
                	
                	if (shouldSkipContiguous) {
                		// skip current
                		length++;
    					pos++;
    					// skip contiguous
                		while (pos < lineEnd && bytes[pos] === js_MINUS) {
                			length++;
        					pos++;
                		}
                		continue;
                	}
                	else {
	                    if (length > 0) { // write any text that came prior, and on the same line.
	                        let span;
	                        if (childIndex < div.children.length) {
	                            span = div.children[childIndex++];
	                            span.className = '';
	                        }
	                        else {
	                            span = document.createElement('span');
	                            div.appendChild(span);
	                            childIndex++;
	                        }
                            span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
	                        substart += length;
	                        length = 0;
	                    }
	                    length += 2;
                        pos += 2;
                        let span;
	                    if (childIndex < div.children.length) {
	                        span = div.children[childIndex++];
	                        //span.className = ''; className is guaranteed to be set in this specific case
	                    }
	                    else {
	                        span = document.createElement('span');
	                        div.appendChild(span);
	                        childIndex++;
	                    }
	                    span.innerText = innerText;
	                    span.className = 'eOA';
	                    substart += length;
	                    length = 0;
	                    continue;
                	}
                }
        }
        length++;
        pos++;
    }

    if (length > 0) {
        let span;
        if (childIndex < div.children.length) {
            span = div.children[childIndex++];
            span.className = '';
        }
        else {
            span = document.createElement('span');
            div.appendChild(span);
            childIndex++;
        }
        span.innerText = EDITOR_decoder.decode(bytes.subarray(substart, substart + length));
    }

    return childIndex;
}


class EXPLORER_TreeViewDirector {

    constructor() {
        /** @type {string} */
        this.chosenDirectory = null;

        /**
         * @type {TreeViewNodeList}
         * */
        this.nodeList = new TreeViewNodeList(32);
        this.component = new TreeViewComponent();
    }

    setChosenDirectory(chosenDirectory, chosenDirectoryAbsolutePathId) {
        this.chosenDirectory = chosenDirectory;
        this.chosenDirectoryAbsolutePathId = chosenDirectoryAbsolutePathId;

        this.nodeList.clear();

        if (!this.chosenDirectory) {
            return;
        }

        let nodeKind = TreeViewNodeKind.isExpandable_NOTisExpanded;
        this.nodeList.insert(this.nodeList.count_abstract, nodeKind, this.chosenDirectoryAbsolutePathId, 0);
        this.component.itemHeightTotal = this.tvd_getTotalCount() * this.component.itemHeightNumber;
        this.component.virtualizationElement.style.height = this.component.itemHeightTotal + 'px';
        // Invoke this?: 'await this.component.draw_render_fullReset_async();'
    }
    
    setChosenWorkspace(chooseWorkspaceResult) {
        this.chosenWorkspace = chooseWorkspaceResult.workspaceFileAbsolutePath;

        this.nodeList.clear();

        if (!this.chosenWorkspace) {
            return;
        }

        for (let i = 0; i < chooseWorkspaceResult.directories.length; i++) {
            let directory = chooseWorkspaceResult.directories[i];
            let nodeKind = TreeViewNodeKind.isExpandable_NOTisExpanded;
            this.nodeList.insert(this.nodeList.count_abstract, nodeKind, directory.id, 0);
        }

        this.component.itemHeightTotal = this.tvd_getTotalCount() * this.component.itemHeightNumber;
        this.component.virtualizationElement.style.height = this.component.itemHeightTotal + 'px';
        // Invoke this?: 'await this.component.draw_render_fullReset_async();'
    }

    /** WARNING: Code here is very duplicated among this and 'tvd_drawItem_BATCH_async'... editor mouse move is throwing an exception so I need to look at that first. */
    async tvd_drawItem_async(divItem, indexItem, isNull) {

        if (isNull) {
            // TODO: Will the user agent remove a text node that has an "empty" nodeValue?
            divItem.lastChild.nodeValue = 'a';
            divItem.lastChild.title = '';
            divItem.style.display = 'none';
            return;
        }

        divItem.style.display = '';

        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;

        // TODO: ipc to main in bulk with all ids that are to be rendered in the current render...
        // ...don't include the ones that are already rendered either only the new ones that came into view.
        
        let isDirectory = nodeKind === TreeViewNodeKind.isExpandable_isExpanded ||
                          nodeKind === TreeViewNodeKind.isExpandable_NOTisExpanded;

        let entry = await window.myAPI.getFilesystemEntryById(key);
        let textNode = divItem.lastChild;
        textNode.nodeValue = entry.basename;
        textNode.title = entry.absolutePath;

        if (isDirectory && !entry.isDirectory) {
            // A file was deleted then a directory was created with same absolute file path or vice versa.
            this.nodeList.setNodeKind(indexItem, TreeViewNodeKind.NOTisExpandable_NOTisExpanded);
        }

        switch (nodeKind) {
            case TreeViewNodeKind.isExpandable_isExpanded:
                divItem.children[0].innerText = '-';
                break;
            case TreeViewNodeKind.isExpandable_NOTisExpanded:
                divItem.children[0].innerText = '+';
                break;
            case TreeViewNodeKind.NOTisExpandable_isExpanded:
                // TODO: the 'explorer.js' file currently uses the text '}' for 'case TreeViewNodeKind.NOTisExpandable_isExpanded:'...
                // ...this case isn't currently being hit...
                // ...but if it ever were to be hit, perhaps the width of the span would act weirdly if '}' turns out to be the largest width.
                divItem.children[0].innerText = '}';
                break;
            case TreeViewNodeKind.NOTisExpandable_NOTisExpanded:
                divItem.children[0].innerText = '';
                break;
        }

        divItem.style.marginLeft = EXPLORER_offsetPerDepth * depth + 'px';
    }

    /** WARNING: Code here is very duplicated among this and 'tvd_drawItem_async'... editor mouse move is throwing an exception so I need to look at that first. */
    async tvd_drawItem_BATCH_async(start, length, onePositiveDiff_twoNegativeDiff_orThreeFullScreen) {
        let upperBound = start + length;
        let totalCount = this.nodeList.count_abstract;
        let loopCounter = 0;

        let arrayKeys = new Array(length);
        for (var indexItem = start; indexItem < upperBound; indexItem++) {
            arrayKeys[loopCounter++] = this.nodeList.getKey(indexItem);
        }
        let arrayEntries = await window.myAPI.getFilesystemEntryById_ARRAY(arrayKeys);
        loopCounter = 0;

        for (var indexItem = start; indexItem < upperBound; indexItem++) {

            let divItem;

            switch (onePositiveDiff_twoNegativeDiff_orThreeFullScreen) {
                case 1:
                    divItem = this.component.itemListElement.children[0];
                    break;
                case 2:
                    divItem = this.component.itemListElement.children[this.component.itemListElement.children.length - 1];
                    break;
                case 3:
                    divItem = this.component.itemListElement.children[loopCounter];
                    break;
            }

            if (indexItem >= totalCount) {
                // TODO: Will the user agent remove a text node that has an "empty" nodeValue?
                divItem.lastChild.nodeValue = 'a';
                divItem.lastChild.title = '';
                divItem.style.display = 'none';
            }
            else {
                divItem.style.display = '';

                this.nodeList.getElementAt(indexItem);
                let key = TreeView_pooledNode_key;
                let depth = TreeView_pooledNode_depth;
                let nodeKind = TreeView_pooledNode_nodeKind;

                // TODO: ipc to main in bulk with all ids that are to be rendered in the current render...
                // ...don't include the ones that are already rendered either only the new ones that came into view.
                
                let isDirectory = nodeKind === TreeViewNodeKind.isExpandable_isExpanded ||
                                  nodeKind === TreeViewNodeKind.isExpandable_NOTisExpanded;

                let entry = arrayEntries[loopCounter];
                let textNode = divItem.lastChild;
                textNode.nodeValue = entry.basename;
                textNode.title = entry.absolutePath;

                if (isDirectory && !entry.isDirectory) {
                    // A file was deleted then a directory was created with same absolute file path or vice versa.
                    this.nodeList.setNodeKind(indexItem, TreeViewNodeKind.NOTisExpandable_NOTisExpanded);
                }

                switch (nodeKind) {
                    case TreeViewNodeKind.isExpandable_isExpanded:
                        divItem.children[0].innerText = '-';
                        break;
                    case TreeViewNodeKind.isExpandable_NOTisExpanded:
                        divItem.children[0].innerText = '+';
                        break;
                    case TreeViewNodeKind.NOTisExpandable_isExpanded:
                        // TODO: the 'explorer.js' file currently uses the text '}' for 'case TreeViewNodeKind.NOTisExpandable_isExpanded:'...
                        // ...this case isn't currently being hit...
                        // ...but if it ever were to be hit, perhaps the width of the span would act weirdly if '}' turns out to be the largest width.
                        divItem.children[0].innerText = '}';
                        break;
                    case TreeViewNodeKind.NOTisExpandable_NOTisExpanded:
                        divItem.children[0].innerText = '';
                        break;
                }

                divItem.style.marginLeft = EXPLORER_offsetPerDepth * depth + 'px';
            }

            switch (onePositiveDiff_twoNegativeDiff_orThreeFullScreen) {
                case 1:
                    this.component.itemListElement.appendChild(divItem);
                    break;
                case 2:
                    this.component.itemListElement.insertBefore(divItem, this.component.itemListElement.children[loopCounter]);
                    break;
                case 3:
                    break;
            }

            loopCounter++;
        }
    }
    
    /**
     * Not every key invokes this. 
     */
    async tvd_onkeydown_async(divItem, indexItem, key) {
        switch (key) {
            case ' ':
            case 'Enter':
                this.nodeList.getElementAt(indexItem);
                let key = TreeView_pooledNode_key;
                let depth = TreeView_pooledNode_depth;
                let nodeKind = TreeView_pooledNode_nodeKind;
                if (nodeKind === TreeViewNodeKind.NOTisExpandable_NOTisExpanded) {
                    // TODO: open the file by id in one ipc call
                    const entry = await window.myAPI.getFilesystemEntryById(key);
                    if (!entry) return;
        
                    if (!entry.isDirectory) {
                        let shouldFocus;
                        if (key === ' ') {
                            shouldFocus = false;
                        }
                        else if (key === 'Enter') {
                            shouldFocus = true;
                        }
                        await EXPLORER_openInEditor(entry.absolutePath, shouldFocus);
                    }
                }
                break;
        }
    }
    
    async tvd_ondblclick_async(divItem, indexItem) {
        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;

        if (nodeKind === TreeViewNodeKind.NOTisExpandable_NOTisExpanded) {
            // TODO: open the file by id in one ipc call
            const entry = await window.myAPI.getFilesystemEntryById(key);
            if (!entry) return;

            if (!entry.isDirectory) {
                await EXPLORER_openInEditor(entry.absolutePath, /*shouldFocus*/ true);
            }
        }
    }
    
    async tvd_oncontextmenu_async(divItem, indexItem, event, relativeIndex) {
        let optionList = [
            new MenuOption(CommandKind.Copy, 'Copy', null),
            new MenuOption(CommandKind.CopyAbsolutePath, 'Copy Absolute Path', null),
        ];

        this.component.ensure_boundingClientRect();
        let nodeListBoundingClientRect = this.component.boundingClientRect;

        // TODO: !!!! You might need to be careful with async and the TreeView_pooledNode; I'm not certain whether you do or don't have to be careful, and I don't feel like looking into it at the moment.
        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;

        let target = {
            id: key,
            depth: depth,
            nodeKind: nodeKind,
            indexItem: indexItem,
            divRelativeIndex: relativeIndex,
        };

        if (event.button === 2) {
            this.addSpecificMenuOptionsForTarget(optionList, divItem, target);
            menuSet('EXPLORER', target, optionList, menuOptionX=event.clientX, menuOptionY=event.clientY);
        } else {
            this.addSpecificMenuOptionsForTarget(optionList, divItem, target);
            menuSet('EXPLORER', target, optionList, menuOptionX=nodeListBoundingClientRect.left, menuOptionY=(nodeListBoundingClientRect.top + ((this.component.cursorIndex + 1) * this.component.itemHeightNumber)));
        }
    }

    /**
     * TODO: To detect whether the "expand/collapse icon" was clicked, the logic 'if(event.target === nodeElement.children[0])' is used...
     * ...this logic is flawed if one ever were to put an element within the span that became the target...
     * ...thus, you should consider checking the x position of the event against the x position of the nodeElement.children[0].
     * @param {*} event 
     */
    async tvd_expandCollapseIconWasClicked_async(divItem, indexItem) {
        // TODO: !!!! You might need to be careful with async and the TreeView_pooledNode; I'm not certain whether you do or don't have to be careful, and I don't feel like looking into it at the moment.
        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;

        if (nodeKind === TreeViewNodeKind.isExpandable_NOTisExpanded) {

            divItem.children[0].innerText = '-';
            this.nodeList.setNodeKind(indexItem, TreeViewNodeKind.isExpandable_isExpanded);

            const filesystemEntries = await window.myAPI.getFilesystemEntries_argumentIsId(key);
    
            for (let i = 0; i < filesystemEntries.length; i++) {
                let entry = filesystemEntries[i];
                let nodeKind;
                if (entry.isDirectory) {
                    nodeKind = TreeViewNodeKind.isExpandable_NOTisExpanded;
                }
                else {
                    nodeKind = TreeViewNodeKind.NOTisExpandable_NOTisExpanded;
                }
                // TODO: Insert range, or at the least 'pre-emptively' resize the list so that it fits each insertion without resizing per insertion.
                this.nodeList.insert(indexItem + 1 + i, nodeKind, entry.id, depth + 1);
                this.component.itemHeightTotal = this.tvd_getTotalCount() * this.component.itemHeightNumber;
                this.component.virtualizationElement.style.height = this.component.itemHeightTotal + 'px';
            }

            await this.component.draw_render_fullReset_async();
        }
        else if (nodeKind === TreeViewNodeKind.isExpandable_isExpanded) {

            divItem.children[0].innerText = '+';
            this.nodeList.setNodeKind(indexItem, TreeViewNodeKind.isExpandable_NOTisExpanded);

            let countChildren = 0;
            for (let i = indexItem + 1; i < this.nodeList.count_abstract; i++) {
                // If currentDepth < ithElementDepth; // then current is a parent of ithElement.
                if (depth < this.nodeList.getDepth(i)) {
                    countChildren++;
                }
                else {
                    break;
                }
            }
            if (countChildren > 0) { // TODO: is this check necessary?
                this.nodeList.removeAt(indexItem + 1, countChildren);
                this.component.itemHeightTotal = this.tvd_getTotalCount() * this.component.itemHeightNumber;
                this.component.virtualizationElement.style.height = this.component.itemHeightTotal + 'px';
                await this.component.draw_render_fullReset_async();
            }
        }
    }
    
    async tvd_arrowRight_async(divItem, indexItem) {
    	// TODO: !!!! You might need to be careful with async and the TreeView_pooledNode; I'm not certain whether you do or don't have to be careful, and I don't feel like looking into it at the moment.
        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;
        
        if (nodeKind === TreeViewNodeKind.isExpandable_isExpanded) {
            if (indexItem + 1 < this.nodeList.count_abstract) {
                if (this.nodeList.getDepth(indexItem + 1) > depth) {
                    this.component.state_cursor_setIndex(this.component.state_cursor_validateIndex(
        		        this.component.cursorIndex + 1));
                }
            }
    	}
    	else if (nodeKind === TreeViewNodeKind.isExpandable_NOTisExpanded) {
    		return this.tvd_expandCollapseIconWasClicked_async(divItem, indexItem);
    	}
	}
    
    async tvd_arrowLeft_async(divItem, indexItem) {
    	// TODO: !!!! You might need to be careful with async and the TreeView_pooledNode; I'm not certain whether you do or don't have to be careful, and I don't feel like looking into it at the moment.
        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;
        
        if (nodeKind === TreeViewNodeKind.isExpandable_isExpanded) {
        	return this.tvd_expandCollapseIconWasClicked_async(divItem, indexItem);
        }
        else {
        	let distanceToParent = 0;
            for (let i = indexItem - 1; i >= 0; i--) {
                // If ithElementDepth < currentDepth; // then ithElement is the parent of current.
                if (this.nodeList.getDepth(i) < depth) {
                    distanceToParent++;
                    break;
                }
                else {
                    distanceToParent++;
                }
            }
            if (distanceToParent > 0) {
            	this.component.state_cursor_setIndex(this.component.state_cursor_validateIndex(
        			indexItem - distanceToParent));
            }
        }
    }

    tvd_getTotalCount() {
        return this.nodeList.count_abstract;
    }

    /**
     * This method should only pertain itself with the contents of the flat list, any UI changes will be made based on the returned 'changeCount'
     * which is interpreted as one for the item itself, plus the count of any children that were recursively removed.
     * 
     * TODO: Include the word "directory"?
     * 
     * @param {*} indexItem 
     * @returns 
     */
    async removeFromNodeList_async(indexItem) {
        this.nodeList.getElementAt(indexItem);
        let key = TreeView_pooledNode_key;
        let depth = TreeView_pooledNode_depth;
        let nodeKind = TreeView_pooledNode_nodeKind;

        if (nodeKind === TreeViewNodeKind.NOTisExpandable_isExpanded) {
            alert("TODO: if (nodeKind === TreeViewNodeKind.NOTisExpandable_isExpanded)");
            return;
        }

        if (nodeKind === TreeViewNodeKind.isExpandable_isExpanded) {

            let countChildren = 0;
            for (let i = indexItem + 1; i < this.nodeList.count_abstract; i++) {
                // If currentDepth < ithElementDepth; then current is a parent of ithElement.
                if (depth < this.nodeList.getDepth(i)) {
                    countChildren++;
                }
                else {
                    break;
                }
            }
            this.nodeList.removeAt(indexItem, 1 + countChildren);
            this.component.itemHeightTotal = this.tvd_getTotalCount() * this.component.itemHeightNumber;
            this.component.virtualizationElement.style.height = this.component.itemHeightTotal + 'px';
            return 1 + countChildren;
        }
    }

    async setNodeListEntryId_async(indexItem, pathId) {
        this.nodeList.setKey(indexItem, pathId);
    }

    addSpecificMenuOptionsForTarget(optionList, divItem, target) {
        if (!divItem) return;

        // check the "text icon": { '-', '+', '' }
        if (target.nodeKind === TreeViewNodeKind.isExpandable_isExpanded ||
            target.nodeKind === TreeViewNodeKind.isExpandable_NOTisExpanded) {
            
            // Directory
            optionList.push(new MenuOption(CommandKind.NewFile_File, 'NewFile', null));
            optionList.push(new MenuOption(CommandKind.NewFile_Directory, 'NewDirectory', null));
            optionList.push(new MenuOption(CommandKind.DeleteFile_Directory, 'Delete', null));
            optionList.push(new MenuOption(CommandKind.RenameFile_Directory, 'Rename', null));
            optionList.push(new MenuOption(CommandKind.Paste, 'Paste', null));
            optionList.push(new MenuOption(CommandKind.Cut, 'Cut', null));
        }
        else {
            // File
            optionList.push(new MenuOption(CommandKind.DeleteFile_File, 'Delete', null));
            optionList.push(new MenuOption(CommandKind.RenameFile_File, 'Rename', null));
            optionList.push(new MenuOption(CommandKind.Cut, 'Cut', null));
        }
    }
}

const EXPLORER_isExpandedText = '-';
const EXPLORER_NOTisExpandedText = '+';
const EXPLORER_cannotBeExpandedText = '';

/** Pixels */
const EXPLORER_offsetPerDepth = 8;

let EXPLORER_show = true;

/** 8 */
let EXPLORER_firstSpanWidthValue = 8;
/** 8px */
let EXPLORER_firstSpanWidth = 8;

let menuOptionX = 0;
let menuOptionY = 0;

let EXPLORER_menuOptionCut_object = null;

let EXPLORER_director = new EXPLORER_TreeViewDirector();

function EXPLORER_init() {

    const EXPLORER_pickFolderOrWorkspaceButton = document.getElementById('EXPLORER_folderOrWorkspaceButtons');
    if (!EXPLORER_pickFolderOrWorkspaceButton) return;

    EXPLORER_pickFolderOrWorkspaceButton.addEventListener('click', async () => {
        const EXPLORER_pickFolderOrWorkspaceButton = document.getElementById('EXPLORER_folderOrWorkspaceButtons');
        let optionList = [
            new MenuOption(CommandKind.Copy, 'Folder', null),
            new MenuOption(CommandKind.Cut, 'Workspace', null),
        ];
        let boundingClientRect = EXPLORER_pickFolderOrWorkspaceButton.getBoundingClientRect();
        menuSet(/*context*/ 'EXPLORER_pickFolderOrWorkspaceButton', /*target*/ null, optionList, /*left*/ boundingClientRect.left, /*top*/ boundingClientRect.top + boundingClientRect.height, /*NOTshouldFocus*/ false, /*index*/ 0, /*onHideAction*/ null);
    });
    
    let toggleShowExplorerButton = document.getElementById('HEADER_toggleShowExplorer');
    toggleShowExplorerButton.checked = EXPLORER_show;
    toggleShowExplorerButton.addEventListener('click', () => {
    	// TODO: Will shadowing 'toggleShowExplorerButton' with a declaration of the same name in here cause any oddities in relation to app long garbage collection overhead....
    	// ...presumably the answer is 99.999% no but I can't bear to deal with this right now, thus the variable name 'avoidClosureCausingAppLongLivingVariable_toggleShowExplorerButton'.
    	let avoidClosureCausingAppLongLivingVariable_toggleShowExplorerButton = document.getElementById('HEADER_toggleShowExplorer');
    	if (avoidClosureCausingAppLongLivingVariable_toggleShowExplorerButton) {
    		EXPLORER_setShow(avoidClosureCausingAppLongLivingVariable_toggleShowExplorerButton.checked);
    	}
    });
}

/**
Hiding an element's visibility rather than removing the HTML has a cost associated with it.
If a UI piece isn't integral to the app, I wouldn't even transitionally use this as a solution
because it could "slip through the cracks" and never get optimized.

That being said, the explorer in this app IS integral, so I'll go down this route to start off.

...more details involved but I'm thinking and deciding.
*/
function EXPLORER_setShow(shouldShow) {
    const EXPLORER_Element = document.getElementById('EXPLORER');
    if (!EXPLORER_Element) return;

	if (shouldShow && !EXPLORER_show) {
		let editorHackElement = document.getElementById('EDITOR_hack');
		EXPLORER_Element.style.width = '200px';
		EXPLORER_Element.style.visibility = '';
		editorHackElement.style.width = 'calc(100% - 200px)';
		EXPLORER_show = shouldShow;
		let toggleShowExplorerButton = document.getElementById('HEADER_toggleShowExplorer');
		toggleShowExplorerButton.checked = EXPLORER_show;
		EDITOR_onResize();
	}
	else if (!shouldShow && EXPLORER_show) {
		// !show is redundant, but exists for readability.
		let editorHackElement = document.getElementById('EDITOR_hack');
		EXPLORER_Element.style.width = '0px';
		EXPLORER_Element.style.visibility = 'hidden';
		editorHackElement.style.width = '100%';
		EXPLORER_show = shouldShow;
		let toggleShowExplorerButton = document.getElementById('HEADER_toggleShowExplorer');
		toggleShowExplorerButton.checked = EXPLORER_show;
		EDITOR_onResize();
	}
}

async function EXPLORER_openInEditor(absolutePath, shouldFocus) {
    const itHasBom = await window.myAPI.editorReadAllText(absolutePath);

    if (!itHasBom.text && itHasBom.text != '') {
        return;
    }

    EDITOR_setText(
        itHasBom.text,
        itHasBom.fileStartsWithBom,
        /*textSourceIdentifier*/ absolutePath,
        /*FORMATTED_textSourceIdentifier*/ itHasBom.formattedAbsolutePath,
        /*extensionKind*/ EDITOR_toExtensionKind(itHasBom.extension));
    if (shouldFocus) {
        let editor = document.getElementById('EDITOR');
        if (editor) {
            editor.focus();
        }
    }
}

/**
 TODO: REMOVE_HACK: Don't use copy and cut because it makes no sense
 */
async function EXPLORER_pickFolderOrWorkspaceButton_MenuOnClick(indexClicked, elementClicked) {
    const commandKind = parseInt(elementClicked.dataset.commandKind, 10);
    if (!commandKind) {
        return;
    }

    switch (commandKind) {
        case CommandKind.Copy:
            {
                const EXPLORER_Element = document.getElementById('EXPLORER');
                if (!EXPLORER_Element) return;
                const EXPLORER_PickFolder = document.getElementById('EXPLORER_folderOrWorkspaceButtons');
                if (!EXPLORER_PickFolder) return;
    
                // { basename: basename, openedDirectory: openedDirectory }
                let chooseDirectoryResult = await window.myAPI.chooseDirectory();
                if (chooseDirectoryResult.canceled) return;
    
                EXPLORER_setShow(true);
                let chosenDirectory = chooseDirectoryResult.openedDirectory;
                EXPLORER_PickFolder.innerText = chooseDirectoryResult.basename;
                EXPLORER_PickFolder.title = chosenDirectory;
    
                EXPLORER_director.setChosenDirectory(chosenDirectory, chooseDirectoryResult.id);
                EXPLORER_director.component.setItems(EXPLORER_director, APP_lineHeight, APP_lineHeight + 'px');
                await EXPLORER_director.component.draw_create_async(EXPLORER_Element, null);
            }
            break;
        case CommandKind.Cut:
            {
                const EXPLORER_Element = document.getElementById('EXPLORER');
                if (!EXPLORER_Element) return;
                
                let chooseWorkspaceResult = await window.myAPI.chooseWorkspace();
                if (chooseWorkspaceResult.canceled) return;
    
                EXPLORER_setShow(true);
    
                let pickWorkspaceButton = document.getElementById('EXPLORER_folderOrWorkspaceButtons');
                pickWorkspaceButton.innerText = chooseWorkspaceResult.workspaceFileNameWithoutExtension;
                pickWorkspaceButton.title = chooseWorkspaceResult.workspaceFileAbsolutePath;
    
                EXPLORER_director.setChosenWorkspace(chooseWorkspaceResult);
                EXPLORER_director.component.setItems(EXPLORER_director, APP_lineHeight, APP_lineHeight + 'px');
                await EXPLORER_director.component.draw_create_async(EXPLORER_Element, null);
            }
            break;
    }
}

async function EXPLORER_MenuOnClick(indexClicked, elementClicked) {
    const commandKind = parseInt(elementClicked.dataset.commandKind, 10);
    if (!commandKind) {
        return;
    }

    if (commandKind !== CommandKind.Cut & commandKind !== CommandKind.Paste) {
        EXPLORER_menuOptionCut_object = null;
    }

    switch (commandKind) {
        case CommandKind.Copy:
            if (MENU_target.id) {
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                await window.myAPI.setClipboard('file:///' + entry.absolutePath);
            }
            break;
        case CommandKind.Cut:
            // they don't fully work but I'm not feeling overly interested in anything at the moment I wanna just lay down and do nothing so I'm pleased that I did something at all
            if (MENU_target.id) {
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                let text = 'file:///' + entry.absolutePath;
                EXPLORER_menuOptionCut_object = {
                    id: text,
                    indexItem: MENU_target.indexItem,
                    divRelativeIndex: MENU_target.divRelativeIndex
                };

                await window.myAPI.setClipboard(text);
            }
            break;
        case CommandKind.CopyAbsolutePath:
            if (MENU_target.id) {
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                await window.myAPI.setClipboard(entry.absolutePath);
            }
            break;
        case CommandKind.Paste:
            {
                let local_EXPLORER_menuOptionCut_object = EXPLORER_menuOptionCut_object;
                EXPLORER_menuOptionCut_object = null;
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                let pasteResult = await window.myAPI.copyClipboardAbsolutePathToDirectory(entry.absolutePath, local_EXPLORER_menuOptionCut_object?.id);
                if (pasteResult.success) {
                        /*
                        // TODO: I saw the result was success but the indexOf was -1 when adding a file with the same name twice that seems erroneous.

                        // TODO: I added 3 files total while testing various words that would alphabetically be placed at the start, end, or somewhere in the middle...
                        // ...I think the middle case for some reason ended up in the parent? I'm not quite sure what happened.
                        */

                        // TODO: I belive this final paste logic that comes after this comment and within this scope is extremely similar to the new file logic...

                        let nodeKind;
                        if (pasteResult.isDirectory) {
                            nodeKind = TreeViewNodeKind.isExpandable_NOTisExpanded;
                        }
                        else {
                            nodeKind = TreeViewNodeKind.NOTisExpandable_NOTisExpanded;
                        }

                        let newIndexItem = MENU_target.indexItem + 1 + pasteResult.indexOf;
                        EXPLORER_director.nodeList.insert(newIndexItem, nodeKind, pasteResult.pathId, MENU_target.depth + 1);

                        if (EXPLORER_director.component.virtualCount > 0) {
                            let largestIndexItemBeingShown = EXPLORER_director.component.virtualIndex + (EXPLORER_director.component.virtualCount - 1);
                            if (newIndexItem >= EXPLORER_director.component.virtualIndex && newIndexItem <= largestIndexItemBeingShown) {
                                let finalDiv = EXPLORER_director.component.itemListElement.children[EXPLORER_director.component.itemListElement.children.length - 1];

                                EXPLORER_director.component.itemHeightTotal = EXPLORER_director.tvd_getTotalCount() * EXPLORER_director.component.itemHeightNumber;
                                EXPLORER_director.component.virtualizationElement.style.height = EXPLORER_director.component.itemHeightTotal + 'px';

                                await EXPLORER_director.tvd_drawItem_async(finalDiv, newIndexItem, /*isNull*/ false);
                                if (newIndexItem !== largestIndexItemBeingShown) {
                                    EXPLORER_director.component.itemListElement.insertBefore(finalDiv, EXPLORER_director.component.itemListElement.children[MENU_target.divRelativeIndex + 1 + pasteResult.indexOf]);
                                }
                            }

                            if (pasteResult.sourceFileWasDeleted) {
                                let id = local_EXPLORER_menuOptionCut_object.id;
                                let indexItem = local_EXPLORER_menuOptionCut_object.indexItem;
                                let divRelativeIndex = local_EXPLORER_menuOptionCut_object.divRelativeIndex;

                                // TODO: it isn't just about whether the cut-directory is in the virtualization result...
                                // ...if you paste below you could have some children of the cut-directory in view, but not the cut-directory itself.
    
                                // TODO: Just check indexItem (is easier to tell whether the insertion happened "above" the cut items position in the treeview)?
                                if (MENU_target.divRelativeIndex + 1 + pasteResult.indexOf >= local_EXPLORER_menuOptionCut_object.divRelativeIndex) {
                                    divRelativeIndex += 1;
                                    indexItem += 1;
                                }
    
                                if (divRelativeIndex <= largestIndexItemBeingShown) {

                                    let countOfMoreEntriesToShow = EXPLORER_director.tvd_getTotalCount() - (EXPLORER_director.component.virtualIndex + EXPLORER_director.component.virtualCount);

                                    let countChanges;
                                    
                                    if (pasteResult.isDirectory) {
                                        countChanges = await EXPLORER_director.removeFromNodeList_async(indexItem);
                                    }
                                    else {
                                        EXPLORER_director.nodeList.removeAt(indexItem, 1);
                                        countChanges = 1;
                                    }

                                    EXPLORER_director.component.itemHeightTotal = EXPLORER_director.tvd_getTotalCount() * EXPLORER_director.component.itemHeightNumber;
                                    EXPLORER_director.component.virtualizationElement.style.height = EXPLORER_director.component.itemHeightTotal + 'px';

                                    let remainingChangesToRender = countChanges < EXPLORER_director.component.virtualCount ? countChanges : EXPLORER_director.component.virtualCount - divRelativeIndex;

                                    if (countOfMoreEntriesToShow > remainingChangesToRender) {
                                        countOfMoreEntriesToShow = remainingChangesToRender;
                                    }

                                    for (let i = 0; i < remainingChangesToRender; i++) {
                                        let divItem = EXPLORER_director.component.itemListElement.children[divRelativeIndex];
                
                                        // TODO: if you remove including the eventual final div in the itemListElement then this moving of the div isn't accomplishing anything and could be skipped.
                                        EXPLORER_director.component.itemListElement.insertBefore(divItem, undefined);

                                        if (countOfMoreEntriesToShow <= 0) {
                                            await EXPLORER_director.tvd_drawItem_async(divItem, EXPLORER_director.component.virtualIndex + EXPLORER_director.component.virtualCount - 1, /*isNull*/ true);
                                        }
                                        else {
                                            await EXPLORER_director.tvd_drawItem_async(divItem, EXPLORER_director.component.virtualIndex + EXPLORER_director.component.virtualCount - (remainingChangesToRender - i), /*isNull*/ false);
                                            countOfMoreEntriesToShow--;
                                        }
                                    }
                                }
                            }
                        }

                    }
                break;
            }
        case CommandKind.NewFile_Directory:
            {
                if (!MENU_target.id) return;
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                WIDGET_show(WidgetKind.InputText, menuOptionX, menuOptionY, 'filename', async result => {
                    if (result.isCancelled) return;
                    let newFileResult = await window.myAPI.newFile(entry.absolutePath, result.value, /*isDirectory*/ true);
                    if (newFileResult.success) {
                        /*
                        // TODO: I saw the result was success but the indexOf was -1 when adding a file with the same name twice that seems erroneous.

                        // TODO: I added 3 files total while testing various words that would alphabetically be placed at the start, end, or somewhere in the middle...
                        // ...I think the middle case for some reason ended up in the parent? I'm not quite sure what happened.
                        */

                        // TODO: I belive this final new directory logic that comes after this comment and within this scope is 1 to 1 an exact duplication of the new file logic...
                        
                        let nodeKind = TreeViewNodeKind.isExpandable_NOTisExpanded;
                        let newIndexItem = MENU_target.indexItem + 1 + newFileResult.indexOf;
                        EXPLORER_director.nodeList.insert(newIndexItem, nodeKind, newFileResult.pathId, MENU_target.depth + 1);

                        if (EXPLORER_director.component.virtualCount > 0) {
                            let largestIndexItemBeingShown = EXPLORER_director.component.virtualIndex + (EXPLORER_director.component.virtualCount - 1);
                            if (newIndexItem >= EXPLORER_director.component.virtualIndex && newIndexItem <= largestIndexItemBeingShown) {
                                let finalDiv = EXPLORER_director.component.itemListElement.children[EXPLORER_director.component.itemListElement.children.length - 1];

                                EXPLORER_director.component.itemHeightTotal = EXPLORER_director.tvd_getTotalCount() * EXPLORER_director.component.itemHeightNumber;
                                EXPLORER_director.component.virtualizationElement.style.height = EXPLORER_director.component.itemHeightTotal + 'px';

                                await EXPLORER_director.tvd_drawItem_async(finalDiv, newIndexItem, /*isNull*/ false);
                                if (newIndexItem !== largestIndexItemBeingShown) {
                                    EXPLORER_director.component.itemListElement.insertBefore(finalDiv, EXPLORER_director.component.itemListElement.children[MENU_target.divRelativeIndex + 1 + newFileResult.indexOf]);
                                }
                            }
                        }
                    }
                });
                break;
            }
        case CommandKind.NewFile_File:
            {
                if (!MENU_target.id) return;
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                WIDGET_show(WidgetKind.InputText, menuOptionX, menuOptionY, 'filename', async result => {
                    if (result.isCancelled) return;
                    let newFileResult = await window.myAPI.newFile(entry.absolutePath, result.value, /*isDirectory*/ false);
                    if (newFileResult.success) {
                        /*
                        // TODO: I saw the result was success but the indexOf was -1 when adding a file with the same name twice that seems erroneous.

                        // TODO: I added 3 files total while testing various words that would alphabetically be placed at the start, end, or somewhere in the middle...
                        // ...I think the middle case for some reason ended up in the parent? I'm not quite sure what happened.
                        */

                        let nodeKind = TreeViewNodeKind.NOTisExpandable_NOTisExpanded;
                        let newIndexItem = MENU_target.indexItem + 1 + newFileResult.indexOf;
                        EXPLORER_director.nodeList.insert(newIndexItem, nodeKind, newFileResult.pathId, MENU_target.depth + 1);

                        if (EXPLORER_director.component.virtualCount > 0) {
                            let largestIndexItemBeingShown = EXPLORER_director.component.virtualIndex + (EXPLORER_director.component.virtualCount - 1);
                            if (newIndexItem >= EXPLORER_director.component.virtualIndex && newIndexItem <= largestIndexItemBeingShown) {
                                let finalDiv = EXPLORER_director.component.itemListElement.children[EXPLORER_director.component.itemListElement.children.length - 1];

                                EXPLORER_director.component.itemHeightTotal = EXPLORER_director.tvd_getTotalCount() * EXPLORER_director.component.itemHeightNumber;
                                EXPLORER_director.component.virtualizationElement.style.height = EXPLORER_director.component.itemHeightTotal + 'px';

                                await EXPLORER_director.tvd_drawItem_async(finalDiv, newIndexItem, /*isNull*/ false);
                                if (newIndexItem !== largestIndexItemBeingShown) {
                                    EXPLORER_director.component.itemListElement.insertBefore(finalDiv, EXPLORER_director.component.itemListElement.children[MENU_target.divRelativeIndex + 1 + newFileResult.indexOf]);
                                }
                            }
                        }
                    }
                });
                break;
            }
        case CommandKind.DeleteFile_Directory:
            {
                if (!MENU_target.id) return;
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                let filename = entry.basename;
                WIDGET_show(WidgetKind.YesCancel, menuOptionX, menuOptionY, 'delete ' + filename, async result => {
                    if (result.isCancelled) return;
                    let deleteFileResult = await window.myAPI.deleteFile(entry.absolutePath, /*isDirectory*/ true);
                    if (deleteFileResult) {
                        let countOfMoreEntriesToShow = EXPLORER_director.tvd_getTotalCount() - (EXPLORER_director.component.virtualIndex + EXPLORER_director.component.virtualCount);

                        let countChanges = await EXPLORER_director.removeFromNodeList_async(MENU_target.indexItem);

                        EXPLORER_director.component.itemHeightTotal = EXPLORER_director.tvd_getTotalCount() * EXPLORER_director.component.itemHeightNumber;
                        EXPLORER_director.component.virtualizationElement.style.height = EXPLORER_director.component.itemHeightTotal + 'px';

                        let remainingChangesToRender = countChanges < EXPLORER_director.component.virtualCount ? countChanges : EXPLORER_director.component.virtualCount - MENU_target.divRelativeIndex;

                        if (countOfMoreEntriesToShow > remainingChangesToRender) {
                            countOfMoreEntriesToShow = remainingChangesToRender;
                        }

                        for (let i = 0; i < remainingChangesToRender; i++) {
                            let divItem = EXPLORER_director.component.itemListElement.children[MENU_target.divRelativeIndex];
    
                            // TODO: if you remove including the eventual final div in the itemListElement then this moving of the div isn't accomplishing anything and could be skipped.
                            EXPLORER_director.component.itemListElement.insertBefore(divItem, undefined);

                            if (countOfMoreEntriesToShow <= 0) {
                                await EXPLORER_director.tvd_drawItem_async(divItem, EXPLORER_director.component.virtualIndex + EXPLORER_director.component.virtualCount - 1, /*isNull*/ true);
                            }
                            else {
                                await EXPLORER_director.tvd_drawItem_async(divItem, EXPLORER_director.component.virtualIndex + EXPLORER_director.component.virtualCount - (remainingChangesToRender - i), /*isNull*/ false);
                                countOfMoreEntriesToShow--;
                            }
                        }
                    }
                });
                break;
            }
        case CommandKind.DeleteFile_File:
            {
                if (!MENU_target.id) return;
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                let filename = entry.basename;
                WIDGET_show(WidgetKind.YesCancel, menuOptionX, menuOptionY, 'delete ' + filename, async result => {
                    if (result.isCancelled) return;
                    let deleteFileResult = await window.myAPI.deleteFile(entry.absolutePath, /*isDirectory*/ false);
                    if (deleteFileResult) {
                        let noMoreEntriesToShow = EXPLORER_director.component.virtualIndex + EXPLORER_director.component.virtualCount >= EXPLORER_director.tvd_getTotalCount();

                        EXPLORER_director.nodeList.removeAt(MENU_target.indexItem, 1);

                        if (EXPLORER_director.component.virtualCount > 0) {
                            let divItem = EXPLORER_director.component.itemListElement.children[MENU_target.divRelativeIndex];

                            EXPLORER_director.component.itemHeightTotal = EXPLORER_director.tvd_getTotalCount() * EXPLORER_director.component.itemHeightNumber;
                            EXPLORER_director.component.virtualizationElement.style.height = EXPLORER_director.component.itemHeightTotal + 'px';

                            EXPLORER_director.component.itemListElement.insertBefore(divItem, undefined);
                            if (noMoreEntriesToShow) {
                                await EXPLORER_director.tvd_drawItem_async(divItem, EXPLORER_director.component.virtualIndex + EXPLORER_director.component.virtualCount - 1, /*isNull*/ true);
                            }
                            else {
                                await EXPLORER_director.tvd_drawItem_async(divItem, EXPLORER_director.component.virtualIndex + EXPLORER_director.component.virtualCount - 1, /*isNull*/ false);
                            }
                        }
                    }
                });
                break;
            }
        case CommandKind.RenameFile_Directory:
            {
                if (!MENU_target.id) return;
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                let filename = entry.basename;
                WIDGET_show(WidgetKind.InputText, menuOptionX, menuOptionY, 'rename', async result => {
                    if (result.isCancelled) return;
                    let renameFileResult = await window.myAPI.renameFile(entry.absolutePath, result.value, /*isDirectory*/ true);
                    if (renameFileResult.success) {
                        await EXPLORER_director.setNodeListEntryId_async(MENU_target.indexItem, renameFileResult.pathId);
                        let divItem = EXPLORER_director.component.itemListElement.children[MENU_target.divRelativeIndex];
                        divItem.lastChild.nodeValue = result.value;
                    }
                });
                let input = document.getElementById('WIDGET_inputText');
                if (input) {
                    input.value = filename;
                }
                break;
            }
        case CommandKind.RenameFile_File:
            {
                /*
                Maybe the only difference between the _Directory and _File cases for each ..._...
                is the bool for isDirectory.

                But I'm exhausted and I cannot reduce the code duplication here because my head doesn't function.
                */

                if (!MENU_target.id) return;
                // TODO: optimize this?
                const entry = await window.myAPI.getFilesystemEntryById(MENU_target.id);
                if (!entry) return;
                let filename = entry.basename;
                WIDGET_show(WidgetKind.InputText, menuOptionX, menuOptionY, 'rename', async result => {
                    if (result.isCancelled) return;
                    let renameFileResult = await window.myAPI.renameFile(entry.absolutePath, result.value, /*isDirectory*/ false);
                    if (renameFileResult.success) {
                        await EXPLORER_director.setNodeListEntryId_async(MENU_target.indexItem, renameFileResult.pathId);
                        let divItem = EXPLORER_director.component.itemListElement.children[MENU_target.divRelativeIndex];
                        divItem.lastChild.nodeValue = result.value;
                    }
                });
                let input = document.getElementById('WIDGET_inputText');
                if (input) {
                    input.value = filename;
                }
                break;
            }
    }
}


/** TODO: The decimals are being truncated by default / ought to be avoided regardless for performance? Use Math.Ceiling? */
let APP_lineHeight = 20;

init();

function APP_measureLineHeightAndCharacterWidth() {
    const body = document.getElementById('ROOT');

    const measureElement = document.createElement('div');
    measureElement.style.width = "fit-content";
    measureElement.innerText = "0";
    body.appendChild(measureElement);

    // TODO: This is currently a whole number but regardless, it presumably could end up having a decimal part.
    APP_lineHeight = Math.ceil(measureElement.offsetHeight);

    /*
    This permits me to in 'explorer.js' set the first span of every "tree-view-node"
    to be the same width, regardless of whether its content is '-', '+', or '' (an empty string).

    In theory this width calculation and 'APP_lineHeight' can be done at the same time.
    But I don't want to deal with that at the moment.
    */

    measureElement.innerText = "-";
    const minusWidth = measureElement.offsetWidth;
    measureElement.innerText = "+";
    const plusWidth = measureElement.offsetWidth;

    // TODO: the 'explorer.js' file currently uses the text '}' for 'case TreeViewNodeKind.NOTisExpandable_isExpanded:'...
    // ...this case isn't currently being hit...
    // ...but if it ever were to be hit, perhaps the width of the span would act weirdly if '}' turns out to be the largest width.

    const largerWidth = Math.ceil(minusWidth > plusWidth ? minusWidth : plusWidth);

    EXPLORER_firstSpanWidthValue = largerWidth;
    EXPLORER_firstSpanWidth = EXPLORER_firstSpanWidthValue + 'px';

    const root = document.documentElement;
    const computedStyles = window.getComputedStyle(root);
    const appLineHeight = APP_lineHeight + 'px';
    const propertyName = '--APP-line-height';
    if (computedStyles.getPropertyValue(propertyName) !== appLineHeight) {
        // avoid layout with if statement
        root.style.setProperty(propertyName, appLineHeight);
    }

    body.removeChild(measureElement);
}

function init() {

    document
        .getElementById('HEADER_buttonSettings')
        .addEventListener('click', async () => {
            return DIALOG_show_async(DialogKind.Settings);
        });

    window.myAPI.onMessage(async (data) => {
        EDITOR_documentSymbolResult = data;
        if (!EDITOR_listComponent) {
            EDITOR_listComponent = new ListComponent();
        }
        EDITOR_listComponent.setItems(APP_lineHeight, APP_lineHeight + 'px',
            /*drawItemAction*/ (div, index) => {
                if (index === -1) {
                    div.innerText = '';
                    div.title = '';
                    div.style.display = 'none';
                }
                else {
                    let item = EDITOR_documentSymbolResult[index];
                    div.innerText = item.name;
                    div.title = JSON.stringify(item.range.start);
                    div.style.display = '';
                }
            },
            /*onkeydownAction*/ (div, index) => {
                if (index === -1) {
                    // TODO: if (index === -1)
                }
                else {
                    // TODO: Ensure that json parsing the title like this is a safe way of doing things
                    const startPosition = JSON.parse(div.title);
                    EDITOR_moveCursor_lineIndex_columnIndex(startPosition.line, startPosition.character);
                }
            },
            /*getItemsCountFunc*/ () => {
                if (EDITOR_documentSymbolResult) {
                    return EDITOR_documentSymbolResult.length;
                }
                else {
                    return 0;
                }
            });
        return DIALOG_show_async(DialogKind.DocumentSymbol, () => {
            if (EDITOR_listComponent) {
                EDITOR_listComponent.boundingClientRect = null;
                EDITOR_listComponent.event_scroll();
            }
        });
    });

    APP_measureLineHeightAndCharacterWidth();

    const EDITOR_gotoF_button = document.getElementById('EDITOR_gotoF');
    EDITOR_gotoF_button.addEventListener('click', window.myAPI.editorDocumentSymbolsRequest);

    const body = document.getElementById('ROOT');
    body.addEventListener('keydown', async event => {
        
        switch (event.key) {
            case 's':
            case 'S':

                if (!event.ctrlKey) {
                    return;
                }

                const unvalidatedAbsolutePath = EDITOR_textSourceIdentifier;
                const rawData = EDITOR_getFinalizedEditsAndRawSaveFileData();
                if (rawData.uint8arrayTextBytes) {
                    event.preventDefault();
                    event.stopPropagation();
                    return window.myAPI.editorSaveFile(unvalidatedAbsolutePath, rawData.uint8arrayTextBytes, rawData.countOfBytesInUse, rawData.lineEndString, rawData.fileStartsWithBom);
                }

                return;
            case 'F':

                if (!event.ctrlKey) {
                    return;
                }

                return DIALOG_show_async(DialogKind.FindAll);
            case 'Escape':
            	// TODO: Provide a way to disable the next (body, and useCapture) 'Escape' keypress...
            	// ...so a widget can restore focus to the relevant UI rather than
            	// the 'EDITOR' when the user presses 'Escape' to "cancel".
				const editor = document.getElementById('EDITOR');
		        if (editor) {
		            editor.focus();
		        }
                return;
        	case 'e':
        		if (event.altKey) {
        			EXPLORER_setShow(true);
        			const EXPLORER_Element = document.getElementById('EXPLORER');
        			if (EXPLORER_Element.children.length === 1) {
        				EXPLORER_Element.children[0].focus();
        			}
        		}
                return;
            case 'E':
        		if (event.altKey && event.shiftKey) {
        			const editor = document.getElementById('EDITOR');
			        if (editor) {
			            editor.focus();
			            EXPLORER_setShow(false);
			        }
        		}
                return;
            case 'd':
        		if (event.altKey) {
        			const dialogCloseButton = document.getElementById('DIALOG_closeButton');
        			if (dialogCloseButton) {
        				dialogCloseButton.focus();
        			}
        		}
                return;
            case 'h':
        		if (event.altKey) {
        			const settingsButton = document.getElementById('HEADER_buttonSettings');
        			if (settingsButton) {
        				settingsButton.focus();
        			}
        		}
                return;
        }
    }, /*useCapture*/ true);

    MENU_init();
    EXPLORER_init();
    EDITOR_init();
}

/*
Google AI Overview "javascript do numbers as a class field carry garbage collection overhead":
############```paraphraseStart
...

The only exception: If you box a number by using the Number object constructor (e.g., this.field = new Number(42)),
it will be stored as an object on the heap and generate garbage collection. Always use the literal form (e.g., this.field = 42).

...
############```paraphraseEnd

I wanted to see what the AI would say.

It doesn't mention the cost of the marking phase wherein the GC has to confirm that the field indeed is a primitive value.

It doesn't mention the cost of heap defragmentation, wherein the number's primitive value is stored alongside the memory for the class instance.
And during defragmentation you'd then have to copy that primitive value when moving things around.

Those things I'm used to not being mentioned though it isn't a big deal I wasn't really looking for that
I figured they wouldn't be mentioned.

I just wanted to see if it said anything interesting.

The new Number(...) is an interesting point to keep in mind.


Google AI Overview "javascript does Boolean(1) box or primitive":
############```paraphraseStart
Boolean(1) returns a primitive boolean value (true).

When Boolean() is called without the new keyword, JavaScript treats it as a standard type-conversion function rather than a constructor object.

...
############```paraphraseEnd


Google AI Overview
"javascript how do I handle anxiety that const variables in a function will be hoisted to global scope and therefore exist and carry overhead in their existence for the entire duration of an application":
############```paraphraseStart
In JavaScript, const and let variables are not hoisted to the global scope.
They are block-scoped to the function and remain in memory only while the function executes.
Once the function finishes, the JavaScript engine's garbage collector safely removes them, meaning they carry zero long-term overhead.
############```paraphraseEnd

I've read this multiple times but I just can't get over the anxiety.
Not even just today but in the past.


Google AI Overview "javascript are enum definitions an object allocation":
############```paraphraseStart
JavaScript does not have native enum support. When you define an "enum" in JavaScript, you are typically creating a plain JavaScript object. Yes, this definition allocates a new object in memory at runtime.

...

TypeScript Enums (Transpiled to JS)

If you are writing TypeScript and using the native enum keyword, the way it compiles affects memory:
- Standard enum: Compiles into a bidirectional JavaScript object (allowing both forward and reverse lookups by key and value). This allocates a runtime object.
- const enum: Compiles away completely. The TypeScript compiler inlines the raw values directly into your code, resulting in zero object allocations at runtime.

...
############```paraphraseEnd


Google AI Overview "html javascript: are script tags dom elements that exist long term":
############```paraphraseStart
Yes, <script> tags are DOM elements that exist long term in the document, but their behavior depends on how they are loaded and if they are removed.
############```paraphraseEnd
*/
